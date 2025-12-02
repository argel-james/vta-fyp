"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { useAuth } from "@/context/auth-context"
import * as authService from "@/lib/auth-service"
import type { Role } from "@/context/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { status, user, login } = useAuth()
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [infoMessage, setInfoMessage] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [isRegistering, setIsRegistering] = useState(false)
  const [role, setRole] = useState<Role>("student")
  const [division, setDivision] = useState("")

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(user.role === "professor" ? "/professor" : "/student")
    }
  }, [status, user, router])

  useEffect(() => {
    if (isRegistering) {
      setStep("email")
      setOtp("")
      setCountdown(0)
    }
  }, [isRegistering])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    try {
      setLoading(true)
      setError("")
      setInfoMessage("")
      const message = await authService.requestOtp(email)
      setStep("otp")
      setCountdown(60)
      setInfoMessage(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !otp) return
    try {
      setLoading(true)
      setError("")
      setInfoMessage("")
      const session = await authService.verifyOtp(email, otp)
      login(session)
      router.replace(session.role === "professor" ? "/professor" : "/student")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (countdown > 0) return
    try {
      setLoading(true)
      setError("")
      const message = await authService.requestOtp(email)
      setCountdown(60)
      setInfoMessage(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    try {
      setLoading(true)
      setError("")
      const message = await authService.submitRegistration(email, role, division || undefined)
      setInfoMessage(message)
      setEmail("")
      setDivision("")
      setRole("student")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit registration")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8">
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative w-[600px] h-[600px] flex items-center justify-center">
            <div className="absolute w-[650px] h-[650px] rounded-full bg-gradient-to-r from-blue-500/15 via-cyan-500/15 to-blue-500/15 blur-3xl animate-pulse-slow"></div>
            <div className="absolute w-[550px] h-[550px] rounded-full bg-gradient-to-br from-red-600/20 to-pink-600/20 blur-2xl animate-pulse"></div>
            <div className="absolute w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-cyan-500/25 to-blue-600/25 blur-xl animate-pulse-fast"></div>
            <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-br from-amber-500/15 to-red-500/15 blur-2xl animate-pulse-slow"></div>

            {/* Grid lines */}
            <div className="absolute w-[700px] h-[700px] opacity-30">
              <div className="absolute top-1/2 left-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent transform -translate-x-1/2 -translate-y-1/2 rotate-45 blur-sm"></div>
              <div className="absolute top-1/2 left-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-red-400/30 to-transparent transform -translate-x-1/2 -translate-y-1/2 -rotate-45 blur-sm"></div>
              <div className="absolute top-1/2 left-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent transform -translate-x-1/2 -translate-y-1/2 rotate-90 blur-sm"></div>
              <div className="absolute top-1/2 left-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent transform -translate-x-1/2 -translate-y-1/2 blur-sm"></div>
            </div>

            <div className="relative z-10 animate-pulse-subtle">
              <Image
                src="/images/ntulogo.png"
                alt="NTU Logo"
                width={400}
                height={400}
                className="object-contain"
                style={{
                  filter:
                    "drop-shadow(0 0 20px rgba(59, 130, 246, 0.6)) drop-shadow(0 0 30px rgba(239, 68, 68, 0.5)) drop-shadow(0 0 25px rgba(251, 191, 36, 0.4))",
                }}
                priority
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            {/* Title */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent text-center tracking-wider">
                Virtual Teaching Assistant
              </h1>
            </div>

            {/* Register/Login toggle */}
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                {isRegistering ? (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => {
                        setIsRegistering(false)
                        setError("")
                      }}
                      className="text-white underline hover:text-gray-300 font-medium"
                    >
                      Log in here
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an an account?{" "}
                    <button
                      onClick={() => {
                        setIsRegistering(true)
                        setError("")
                      }}
                      className="text-white underline hover:text-gray-300 font-medium"
                    >
                      Register here
                    </button>
                  </>
                )}
              </p>
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            {infoMessage && !error && <p className="text-sm text-emerald-400 text-center">{infoMessage}</p>}

            {isRegistering ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="register-email" className="text-white text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 bg-transparent border-gray-700 text-white placeholder-gray-500 focus:border-gray-500 h-12"
                    placeholder="Enter your institutional email"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="role" className="text-white text-sm font-medium">
                    Role
                  </Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="mt-1 w-full h-12 bg-transparent border border-gray-700 text-white rounded-md px-3 focus:border-gray-500 focus:outline-none"
                  >
                    <option value="student" className="bg-slate-900 text-white">
                      Student
                    </option>
                    <option value="professor" className="bg-slate-900 text-white">
                      Professor
                    </option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="division" className="text-white text-sm font-medium">
                    Division (optional)
                  </Label>
                  <Input
                    id="division"
                    type="text"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="mt-1 bg-transparent border-gray-700 text-white placeholder-gray-500 focus:border-gray-500 h-12"
                    placeholder="e.g., xCloud"
                  />
                </div>

                <Button type="submit" disabled={loading || !email} className="w-full h-12 font-semibold">
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-primary-foreground/70 border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting...
                    </div>
                  ) : (
                    "Submit registration"
                  )}
                </Button>
              </form>
            ) : step === "email" ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-white text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 bg-transparent border-gray-700 text-white placeholder-gray-500 focus:border-gray-500 h-12"
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <Button type="submit" disabled={loading || !email} className="w-full h-12 font-semibold">
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-primary-foreground/70 border-t-transparent rounded-full animate-spin mr-2" />
                      Sending OTP...
                    </div>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <Label htmlFor="otp" className="text-white text-sm font-medium">
                    Verification Code
                  </Label>
                  <div className="mt-1 relative">
                    <Input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.slice(0, 10))}
                      className="bg-transparent border-gray-700 text-white placeholder-gray-500 focus:border-gray-500 h-12 text-center text-lg tracking-widest"
                      placeholder="Enter code"
                      maxLength={10}
                      required
                    />
                    <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-400 mt-2">We sent a verification code to {email}</p>
                </div>

                <Button type="submit" disabled={loading || otp.length < 1} className="w-full h-12 font-semibold">
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-primary-foreground/70 border-t-transparent rounded-full animate-spin mr-2" />
                      Verifying...
                    </div>
                  ) : (
                    "Verify & Log In"
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0}
                    className="text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email")
                      setOtp("")
                    }}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    Change email address
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
