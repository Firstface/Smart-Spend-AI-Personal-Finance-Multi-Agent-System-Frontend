"use client"

import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldLabel } from "@/components/ui/field"
import { Wallet, Mail, Lock, User } from "lucide-react"

export function LoginPage() {
  const { isAuthenticated, isLoading, login, register } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // Register form state
  const [registerUsername, setRegisterUsername] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("")

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-[#F5F7FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#2563EB] flex items-center justify-center animate-pulse">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div className="text-[#2563EB] text-sm font-medium">Loading...</div>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/classify" replace />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await login(loginEmail, loginPassword)
      navigate("/classify")
    } catch (err: unknown) {
      alert(`Login failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (registerPassword !== registerConfirmPassword) {
      alert("Passwords do not match")
      return
    }
    setIsSubmitting(true)
    try {
      await register(registerUsername, registerEmail, registerPassword)
      navigate("/classify")
    } catch (err: unknown) {
      alert(`Registration failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-[#F5F7FA] p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#2563EB]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-slate-100 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563EB] to-blue-600 shadow-xl shadow-blue-200 mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            Smart Spend AI
          </h1>
          <p className="text-slate-500 text-[13px] mt-1">Smart Personal Finance Assistant</p>
        </div>

        {/* Auth Card */}
        <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-0 pt-6">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-xl p-1">
                <TabsTrigger
                  value="login"
                  className="rounded-lg text-[13px] data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-lg text-[13px] data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                >
                  Register
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Login Tab */}
              <TabsContent value="login" className="mt-0 animate-fade-in">
                <form onSubmit={handleLogin} className="space-y-4">
                  <Field>
                    <FieldLabel className="text-slate-700 text-[13px]">Email</FieldLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="pl-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#2563EB]/50 focus:ring-[#2563EB]/20 rounded-xl text-[13px]"
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel className="text-slate-700 text-[13px]">Password</FieldLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="pl-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#2563EB]/50 focus:ring-[#2563EB]/20 rounded-xl text-[13px]"
                      />
                    </div>
                  </Field>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl h-11 shadow-lg shadow-blue-200 font-medium text-[13px] transition-all"
                  >
                    {isSubmitting ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="mt-0 animate-fade-in">
                <form onSubmit={handleRegister} className="space-y-4">
                  <Field>
                    <FieldLabel className="text-slate-700 text-[13px]">Username</FieldLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        placeholder="Your username"
                        required
                        className="pl-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#2563EB]/50 focus:ring-[#2563EB]/20 rounded-xl text-[13px]"
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel className="text-slate-700 text-[13px]">Email</FieldLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="pl-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#2563EB]/50 focus:ring-[#2563EB]/20 rounded-xl text-[13px]"
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel className="text-slate-700 text-[13px]">Password</FieldLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="pl-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#2563EB]/50 focus:ring-[#2563EB]/20 rounded-xl text-[13px]"
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel className="text-slate-700 text-[13px]">Confirm Password</FieldLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="password"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="pl-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#2563EB]/50 focus:ring-[#2563EB]/20 rounded-xl text-[13px]"
                      />
                    </div>
                  </Field>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl h-11 shadow-lg shadow-blue-200 font-medium text-[13px] transition-all"
                  >
                    {isSubmitting ? "Registering..." : "Register"}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs mt-6">
          By signing in you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
