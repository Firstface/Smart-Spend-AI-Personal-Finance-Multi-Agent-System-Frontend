"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import type { InsightsResult, TransactionItem } from "@/lib/api"

export interface InsightsMessagePayload {
  reply: string
  insights: InsightsResult
}

export interface ChatMessage {
  id: string
  role: "user" | "bot"
  content: string
  timestamp: Date
  type?: "text" | "insights"
  insightsPayload?: InsightsMessagePayload
}

interface ChatContextType {
  messages: ChatMessage[]
  addMessage: (
    role: "user" | "bot",
    content: string,
    options?: {
      type?: ChatMessage["type"]
      insightsPayload?: InsightsMessagePayload
    }
  ) => void
  startNewConversation: () => void
  clearMessages: () => void
  isExpanded: boolean
  toggleExpanded: () => void
  setExpanded: (expanded: boolean) => void
  hasUnreadBotMessage: boolean
  markAsRead: () => void
  registerTransactionCallback: (cb: (tx: TransactionItem) => void) => void
  notifyNewTransaction: (tx: TransactionItem) => void
}

const ChatContext = createContext<ChatContextType | null>(null)
const CHAT_STORAGE_KEY = "smart_spend_chat_messages_v1"

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "bot",
    content: '👋 Hi! I\'m the Smart Spend AI assistant. You can:\n• Ask me personal finance questions\n• Let me analyze your spending habits\n• Let me help you create a budget plan\n\nTry typing "What is the 50-30-20 rule?"',
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: "user-1",
    role: "user",
    content: "What is the 50-30-20 rule?",
    timestamp: new Date(Date.now() - 30000),
  },
  {
    id: "bot-1",
    role: "bot",
    content: "The 50-30-20 rule is a simple budgeting method:\n\n• **50%** for needs (rent, food, transport, etc.)\n• **30%** for wants (entertainment, shopping, etc.)\n• **20%** for savings and debt repayment\n\nBased on your income of ¥13,123, the suggested allocation is about ¥6,562 for needs, ¥3,937 for wants, and ¥2,625 for savings.\n\n[📖 Source: Personal Finance Knowledge Base]",
    timestamp: new Date(),
  },
]

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasUnreadBotMessage, setHasUnreadBotMessage] = useState(true)
  const transactionCallbackRef = useRef<((tx: TransactionItem) => void) | null>(null)

  const registerTransactionCallback = useCallback((cb: (tx: TransactionItem) => void) => {
    transactionCallbackRef.current = cb
  }, [])

  const notifyNewTransaction = useCallback((tx: TransactionItem) => {
    transactionCallbackRef.current?.(tx)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as Array<Omit<ChatMessage, "timestamp"> & { timestamp: string }>
      if (!Array.isArray(parsed) || parsed.length === 0) return

      setMessages(
        parsed.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
      )
    } catch {
      // Ignore malformed local storage payload and keep default messages.
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // Ignore local storage quota/security errors.
    }
  }, [messages])

  const addMessage = useCallback((
    role: "user" | "bot",
    content: string,
    options?: {
      type?: ChatMessage["type"]
      insightsPayload?: InsightsMessagePayload
    }
  ) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      type: options?.type ?? "text",
      insightsPayload: options?.insightsPayload,
    }
    setMessages((prev) => [...prev, newMessage])
    
    // Set unread notification for new bot messages when collapsed
    if (role === "bot") {
      setHasUnreadBotMessage(true)
    }
  }, [])

  const startNewConversation = useCallback(() => {
    setMessages([INITIAL_MESSAGES[0]]) // Keep the welcome message
    setHasUnreadBotMessage(false)
  }, [])

  const clearMessages = useCallback(() => {
    startNewConversation()
  }, [startNewConversation])

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => {
      const newExpanded = !prev
      if (newExpanded) {
        setHasUnreadBotMessage(false)
      }
      return newExpanded
    })
  }, [])

  const markAsRead = useCallback(() => {
    setHasUnreadBotMessage(false)
  }, [])

  return (
    <ChatContext.Provider
      value={{
        messages,
        addMessage,
        startNewConversation,
        clearMessages,
        isExpanded,
        toggleExpanded,
        setExpanded: setIsExpanded,
        hasUnreadBotMessage,
        markAsRead,
        registerTransactionCallback,
        notifyNewTransaction,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}
