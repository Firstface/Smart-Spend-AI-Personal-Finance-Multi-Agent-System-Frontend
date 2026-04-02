"use client"

import { useEffect, useState } from "react"
import { Link, Navigate, Outlet, useLocation } from "react-router-dom"
import { LogOut, Menu, Wallet, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChatPanel } from "./chat-panel"

const navItems = [{ path: "/classify", label: "分类结果" }]

function PageSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="h-8 w-48 rounded-lg bg-slate-200 animate-skeleton" />
      <div className="h-4 w-32 rounded bg-slate-200 animate-skeleton" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-slate-200 animate-skeleton"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      <div className="mt-4 h-96 rounded-2xl bg-slate-200 animate-skeleton" />
    </div>
  )
}

export function ProtectedLayout() {
  const { isAuthenticated, isLoading, logout, user } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const [showContent, setShowContent] = useState(true)

  useEffect(() => {
    setIsPageLoading(true)
    setShowContent(false)
    const timer = setTimeout(() => {
      setIsPageLoading(false)
      setShowContent(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [location.pathname])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB] animate-pulse">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div className="text-sm font-medium text-[#2563EB]">加载中...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between lg:h-16">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-blue-600 shadow-md shadow-blue-200">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="hidden text-lg font-semibold text-slate-800 sm:inline">Smart Spend AI</span>
            </div>

            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "relative rounded-lg px-4 py-2 text-[13px] font-medium transition-all",
                      isActive
                        ? "text-[#2563EB]"
                        : "text-slate-500 hover:bg-blue-50/50 hover:text-slate-800",
                    )}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#2563EB] transition-all" />
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border-2 border-blue-100">
                  <AvatarFallback className="bg-gradient-to-br from-[#2563EB] to-blue-500 text-xs font-medium text-white">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-[13px] font-medium text-slate-700 lg:inline">{user?.username}</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="gap-1.5 text-slate-400 hover:bg-red-50 hover:text-[#DC2626]"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden text-[13px] sm:inline">退出</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-500 md:hidden"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "overflow-hidden border-t border-slate-100 bg-white transition-all duration-300 md:hidden",
            mobileMenuOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <nav className="space-y-1 px-4 py-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "block rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                    isActive ? "bg-blue-50 text-[#2563EB]" : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <div className="pt-14 md:pt-16">
        <ChatPanel />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {isPageLoading ? (
            <PageSkeleton />
          ) : (
            <div
              className={cn(
                "transition-all duration-200",
                showContent ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
              )}
            >
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
