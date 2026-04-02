"use client"

import { useState, useEffect } from "react"
import { Navigate, Outlet, useLocation, Link } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { ChatPanel } from "./chat-panel"
import { Wallet, LogOut, Menu, X } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { path: "/classify", label: "分类结果" },
  { path: "/insights", label: "月度概览" },
  { path: "/budget", label: "预算规划" },
]

// Skeleton loader component
function PageSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="h-8 w-48 bg-slate-200 rounded-lg animate-skeleton" />
      <div className="h-4 w-32 bg-slate-200 rounded animate-skeleton" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-skeleton" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <div className="h-96 bg-slate-200 rounded-2xl animate-skeleton mt-4" />
    </div>
  )
}

export function ProtectedLayout() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const [showContent, setShowContent] = useState(true)

  // Simulate page transition with skeleton
  useEffect(() => {
    setIsPageLoading(true)
    setShowContent(false)
    const timer = setTimeout(() => {
      setIsPageLoading(false)
      setShowContent(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [location.pathname])

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center animate-pulse">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="text-[#2563EB] text-sm font-medium">加载中...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-16">
            {/* Left: Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-800 hidden sm:inline">
                Smart Spend AI
              </span>
            </div>

            {/* Center: Navigation (Desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "relative px-4 py-2 text-[13px] font-medium transition-all rounded-lg",
                      isActive 
                        ? "text-[#2563EB]" 
                        : "text-slate-500 hover:text-slate-800 hover:bg-blue-50/50"
                    )}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#2563EB] rounded-full transition-all" />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Right: User info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8 border-2 border-blue-100">
                  <AvatarFallback className="bg-gradient-to-br from-[#2563EB] to-blue-500 text-white text-xs font-medium">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline text-[13px] font-medium text-slate-700">
                  {user?.username}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-slate-400 hover:text-[#DC2626] hover:bg-red-50 gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-[13px]">退出</span>
              </Button>
              
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-slate-500"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          "md:hidden border-t border-slate-100 bg-white overflow-hidden transition-all duration-300",
          mobileMenuOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
        )}>
          <nav className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "block px-4 py-2.5 text-sm font-medium rounded-xl transition-all",
                    isActive 
                      ? "text-[#2563EB] bg-blue-50" 
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="pt-14 md:pt-16">
        {/* Chat Panel */}
        <ChatPanel />

        {/* Page Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {isPageLoading ? (
            <PageSkeleton />
          ) : (
            <div className={cn(
              "transition-all duration-200",
              showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}>
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
