import email, os, re, signal, sys, time
from email.header import decode_header, make_header
from pathlib import Path
from dotenv import load_dotenv, find_dotenv
from imapclient import IMAPClient, SEEN
from datetime import datetime
import requests

# --- config ---
IMAP_HOST = "imap.gmail.com"
WATCH_FOLDER = "INBOX"  # use "[Gmail]/All Mail" if filters skip the Inbox
POLL_SECS = 10          # poll interval
KEEPALIVE_SECS = 60     # send NOOP to keep connection alive
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"}
MARK_SEEN = False       # set True to mark processed mail as read

# --- paths ---
BASE_DIR = Path(__file__).resolve().parent
ATTACH_DIR = BASE_DIR / "attachments"
ATTACH_DIR.mkdir(parents=True, exist_ok=True)
STATE_FILE = BASE_DIR / "uid.state"   # stores the last processed UID


IMMICH_BASE_URL = os.getenv("IMMICH_BASE_URL", "http://localhost:2283/api").rstrip("/")
IMMICH_API_KEY  = os.getenv("IMMICH_API_KEY", "xwK3N6aId42DJVbSCRQoER7iZeQSDdN8TVxAc9Ufh1Y")

# --- env ---
env_path = find_dotenv()
if env_path:
    load_dotenv(env_path, override=True)
EMAIL_USER = os.getenv("GMAIL_USER", "").strip()
APP_PASSWORD = re.sub(r"\s+", "", os.getenv("GMAIL_APP_PASSWORD", ""))  # remove spaces
if not EMAIL_USER or not APP_PASSWORD:
    print("Missing GMAIL_USER or GMAIL_APP_PASSWORD in .env")
    sys.exit(1)

# --- helpers ---
def sanitize(s: str, maxlen=120) -> str:
    s = re.sub(r"\s+", " ", s or "").strip()
    s = re.sub(r'[<>:"/\\|?*\x00-\x1F]', "_", s)
    return (s[:maxlen] or "file").strip("_ ")

def unique_path(dirpath: Path, filename: str) -> Path:
    p = dirpath / filename
    if not p.exists():
        return p
    stem, dot, ext = filename.partition(".")
    i = 1
    while True:
        cand = dirpath / f"{stem}_{i}{('.' + ext) if ext else ''}"
        if not cand.exists():
            return cand
        i += 1

def load_last_uid(default_uid: int) -> int:
    try:
        return int(STATE_FILE.read_text().strip())
    except Exception:
        return default_uid

def save_last_uid(uid: int):
    STATE_FILE.write_text(str(uid))

def save_image_parts(msg_bytes: bytes) -> int:
    """Save image attachments (and large inline images) from a raw RFC822 message."""
    msg = email.message_from_bytes(msg_bytes)
    subject = str(make_header(decode_header(msg.get("Subject", ""))))
    saved = 0

    for part in msg.walk():
        maintype = part.get_content_maintype()
        dispo = (part.get("Content-Disposition") or "").lower()
        filename = str(make_header(decode_header(part.get_filename() or "")))
        ext = os.path.splitext(filename)[1].lower()
        payload = part.get_payload(decode=True) or b""
        size_kb = len(payload) / 1024.0

        is_image_mime = maintype == "image"
        looks_like_image = ext in ALLOWED_EXT
        is_attachment = "attachment" in dispo
        is_large_inline = ("inline" in dispo) and size_kb >= 30 and not re.search(
            r"(logo|icon|signature|spacer|tracking|pixel)", filename, re.I
        )

        if not ((is_image_mime or looks_like_image) and (is_attachment or is_large_inline)):
            continue

        safe_name = sanitize(filename or "image.bin")
        out_path = unique_path(ATTACH_DIR, f"{sanitize(subject)}_{safe_name}")
        with open(out_path, "wb") as f:
            f.write(payload)
        print(f"Saved: {out_path} ({size_kb:.0f} KB)")
        saved += 1
        upload_to_immich(out_path)

    return saved

def poll_forever():
    while True:
        try:
            with IMAPClient(IMAP_HOST, ssl=True) as c:
                c.login(EMAIL_USER, APP_PASSWORD)
                c.select_folder(WATCH_FOLDER)

                # initialize checkpoint
                all_uids = c.search(["ALL"])
                highest_now = max(all_uids) if all_uids else 0
                last_uid = load_last_uid(highest_now)
                print(f"Watching {WATCH_FOLDER}. Starting after UID {last_uid} (highest now {highest_now}).")

                last_keepalive = time.time()

                while True:
                    # find any messages strictly greater than our checkpoint
                    new_uids = c.search(["UID", f"{last_uid + 1}:*"])
                    new_uids = [u for u in new_uids if u > last_uid]
                    if new_uids:
                        print(f"New UIDs: {new_uids}")
                        fetched = c.fetch(new_uids, ["RFC822"])
                        saved_total = 0
                        for uid, data in fetched.items():
                            saved_total += save_image_parts(data[b"RFC822"])
                        if saved_total:
                            print(f"Saved {saved_total} image(s) from new mail).")
                        if MARK_SEEN and new_uids:
                            c.add_flags(new_uids, [SEEN])
                        last_uid = max(last_uid, max(new_uids))
                        save_last_uid(last_uid)

                    # keep connection alive
                    if time.time() - last_keepalive > KEEPALIVE_SECS:
                        c.noop()
                        last_keepalive = time.time()

                    time.sleep(POLL_SECS)

        except KeyboardInterrupt:
            print("\nExiting.")
            sys.exit(0)
        except Exception as e:
            print("Error, reconnecting in 5s…", repr(e))
            time.sleep(5)

def upload_to_immich(file_path: Path):
    if not IMMICH_API_KEY:
        print("IMMICH_API_KEY missing; skipping upload")
        return False

    st = os.stat(file_path)
    headers = {
        "Accept": "application/json",
        "x-api-key": IMMICH_API_KEY,   # Immich API key auth
    }
    data = {
        # device identifiers can be anything stable
        "deviceAssetId": f"{file_path.name}-{int(st.st_mtime)}",
        "deviceId": "python",
        "fileCreatedAt": datetime.fromtimestamp(st.st_mtime).isoformat(),
        "fileModifiedAt": datetime.fromtimestamp(st.st_mtime).isoformat(),
        "isFavorite": "false",
        "filename": file_path.name,
        # metadata is optional in practice for uploads
    }
    files = {
        "assetData": open(file_path, "rb"),
    }

    try:
        resp = requests.post(f"{IMMICH_BASE_URL}/assets", headers=headers, data=data, files=files, timeout=60)
        if resp.status_code in (200, 201):
            print(f"Immich upload OK: {file_path} -> {resp.json().get('id')}")
            return True
        else:
            print(f"Immich upload failed ({resp.status_code}): {resp.text}")
            return False
    finally:
        files["assetData"].close()

# --- entrypoint ---
if __name__ == "__main__":
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
    poll_forever()