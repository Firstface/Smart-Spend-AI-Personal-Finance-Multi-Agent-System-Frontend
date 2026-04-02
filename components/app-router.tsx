"use client"

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/contexts/auth-context"
import { ChatProvider } from "@/contexts/chat-context"
import { ProtectedLayout } from "./protected-layout"
import { LoginPage } from "./login-page"
import { ClassifyPage } from "./classify-page"
import { InsightsPage } from "./insights-page"
import { BudgetPage } from "./budget-page"

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes with shared layout */}
            <Route element={<ProtectedLayout />}>
              <Route path="/classify" element={<ClassifyPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/budget" element={<BudgetPage />} />
            </Route>

            {/* Redirect root to classify */}
            <Route path="/" element={<Navigate to="/classify" replace />} />
            
            {/* Catch all - redirect to classify */}
            <Route path="*" element={<Navigate to="/classify" replace />} />
          </Routes>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
