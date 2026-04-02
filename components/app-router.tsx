"use client"

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "@/contexts/auth-context"
import { ChatProvider } from "@/contexts/chat-context"
import { ClassifyPage } from "./classify-page"
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
            </Route>

            <Route path="/" element={<Navigate to="/classify" replace />} />
            <Route path="*" element={<Navigate to="/classify" replace />} />
          </Routes>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
