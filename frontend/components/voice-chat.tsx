"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { textToSpeech, speechToText } from "@/lib/chat-service"

interface VoiceChatProps {
  onTranscription?: (text: string) => void
  textToRead?: string
  token?: string | null
  compact?: boolean
}

export function VoiceChat({ onTranscription, textToRead, token, compact }: VoiceChatProps) {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        setProcessing(true)
        try {
          const text = await speechToText(blob, token)
          onTranscription?.(text)
        } catch (err) {
          console.error("STT failed:", err)
        } finally {
          setProcessing(false)
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch (err) {
      console.error("Microphone access denied:", err)
    }
  }, [token, onTranscription])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }, [recording])

  const handleReadAloud = useCallback(async () => {
    if (!textToRead) return
    setSpeaking(true)
    try {
      const blob = await textToSpeech(textToRead, "nova", undefined, token)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setSpeaking(false)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => {
        setSpeaking(false)
        URL.revokeObjectURL(url)
      }
      await audio.play()
    } catch {
      setSpeaking(false)
    }
  }, [textToRead, token])

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setSpeaking(false)
  }, [])

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {onTranscription && (
          <button
            onClick={recording ? stopRecording : () => void startRecording()}
            disabled={processing}
            className={`p-2 rounded-lg transition-colors ${
              recording
                ? "bg-red-500 text-white animate-pulse"
                : processing
                  ? "bg-muted text-muted-foreground"
                  : "bg-secondary/50 text-foreground hover:bg-secondary"
            }`}
            title={recording ? "Stop recording" : processing ? "Processing..." : "Voice input"}
          >
            {processing ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>
        )}
        {textToRead && (
          <button
            onClick={speaking ? stopSpeaking : () => void handleReadAloud()}
            className={`p-2 rounded-lg transition-colors ${
              speaking
                ? "bg-primary text-primary-foreground animate-pulse"
                : "bg-secondary/50 text-foreground hover:bg-secondary"
            }`}
            title={speaking ? "Stop" : "Read aloud"}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {speaking ? (
                <rect x="6" y="4" width="4" height="16" rx="1" />
              ) : (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {onTranscription && (
        <Button
          variant={recording ? "destructive" : "outline"}
          size="sm"
          onClick={recording ? stopRecording : () => void startRecording()}
          disabled={processing}
          className={recording ? "animate-pulse" : ""}
        >
          {processing ? "Transcribing..." : recording ? "⏹ Stop" : "🎤 Voice Input"}
        </Button>
      )}
      {textToRead && (
        <Button
          variant={speaking ? "default" : "outline"}
          size="sm"
          onClick={speaking ? stopSpeaking : () => void handleReadAloud()}
          className={speaking ? "animate-pulse" : ""}
        >
          {speaking ? "⏸ Stop" : "🔊 Read Aloud"}
        </Button>
      )}
    </div>
  )
}
