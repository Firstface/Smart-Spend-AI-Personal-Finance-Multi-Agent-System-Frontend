"use client"

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react"
import type { TransactionItem } from "@/lib/api"

export interface ChatMessage {
  id: string
  role: "user" | "bot"
  content: string
  timestamp: Date
}

interface ChatContextType {
  messages: ChatMessage[]
  addMessage: (role: "user" | "bot", content: string) => void
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

  const addMessage = useCallback((role: "user" | "bot", content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
    
    // Set unread notification for new bot messages when collapsed
    if (role === "bot") {
      setHasUnreadBotMessage(true)
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([INITIAL_MESSAGES[0]]) // Keep the welcome message
    setHasUnreadBotMessage(false)
  }, [])

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
