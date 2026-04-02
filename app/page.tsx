"use client"

import dynamic from "next/dynamic"

// Dynamically import AppRouter to avoid SSR issues with react-router-dom
const AppRouter = dynamic(
  () => import("@/components/app-router").then((mod) => mod.AppRouter),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="animate-pulse text-blue-600 text-lg">加载中...</div>
      </div>
    )
  }
)

export default function Page() {
  return <AppRouter />
}
