"use client"

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "@/contexts/auth-context"
import { ChatProvider } from "@/contexts/chat-context"
import { ClassifyPage } from "./classify-page"
import { InsightPageOne } from "./insight-page-one"
import { LoginPage } from "./login-page"
import { ProtectedLayout } from "./protected-layout"

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedLayout />}>
              <Route path="/classify" element={<ClassifyPage />} />
              <Route path="/insight-1" element={<InsightPageOne />} />
            </Route>

            <Route path="/" element={<Navigate to="/classify" replace />} />
          </Routes>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
