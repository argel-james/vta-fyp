const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "")

type Role = "student" | "professor"

type ApiResponse<T> = {
  detail?: string
  message?: string
} & T

async function parseResponse<T = Record<string, unknown>>(response: Response): Promise<T> {
  const text = await response.text()
  let data: ApiResponse<T> | undefined
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (_error) {
      throw new Error("Unexpected response from server")
    }
  }

  if (!response.ok) {
    const message = (data as ApiResponse<T> | undefined)?.detail || data?.message || response.statusText
    throw new Error(message || "Request failed")
  }

  return (data || ({} as T)) as T
}

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

export interface AuthSessionPayload {
  token: string
  sessionId: string
  expiry: string
  extensionCount: number
  role: Role
  email: string
}

interface VerifyOtpResponse {
  token: string
  session_id: string
  expiry: string
  extension_count: number
  role: Role
  email: string
}

interface SessionResponse {
  session_id: string
  expiry: string
  extension_count: number
  extension_session_expiry: string | null
  last_activity: string
  email: string
  role: Role
}

export async function requestOtp(email: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })

  const data = await parseResponse<{ message?: string }>(response)
  return data.message || "Verification code sent"
}

export async function verifyOtp(email: string, otp: string): Promise<AuthSessionPayload> {
  const response = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  })

  const data = await parseResponse<VerifyOtpResponse>(response)
  return {
    token: data.token,
    sessionId: data.session_id,
    expiry: data.expiry,
    extensionCount: data.extension_count,
    role: data.role,
    email: data.email,
  }
}

export async function submitRegistration(email: string, role: Role, division?: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role, division }),
  })

  const data = await parseResponse<{ message?: string }>(response)
  return data.message || "Registration submitted"
}

export async function getSession(token: string) {
  const response = await fetch(`${API_BASE_URL}/auth/session`, {
    method: "GET",
    headers: authHeaders(token),
  })

  const data = await parseResponse<SessionResponse>(response)
  return {
    sessionId: data.session_id,
    expiry: data.expiry,
    extensionCount: data.extension_count,
    extensionSessionExpiry: data.extension_session_expiry,
    lastActivity: data.last_activity,
    email: data.email,
    role: data.role,
  }
}

export async function logout(token: string): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: authHeaders(token),
  })
}
