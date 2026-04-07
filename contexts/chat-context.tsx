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
    content: '👋 你好！我是 Smart Spend AI 助手。你可以：\n• 问我财务知识问题\n• 让我分析你的消费习惯\n• 让我帮你制定预算计划\n\n试试输入"什么是50-30-20法则？"',
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: "user-1",
    role: "user",
    content: "什么是50-30-20法则？",
    timestamp: new Date(Date.now() - 30000),
  },
  {
    id: "bot-1",
    role: "bot",
    content: "50-30-20法则是一种简单的预算分配方法：\n\n• **50%** 用于必需支出（房租、餐饮、交通等）\n• **30%** 用于个人消费（娱乐、购物等）\n• **20%** 用于储蓄和还债\n\n根据你的收入 ¥13,123，建议分配约 ¥6,562 必需、¥3,937 个人、¥2,625 储蓄。\n\n[📖 来源: 个人理财基础知识库]",
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
