"use client"

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react"
import { useChat, type ChatMessage } from "@/contexts/chat-context"
import { apiChat } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Send, Bot, Trash2, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-2.5 text-[13px] text-slate-600">
        <span className="flex items-center gap-1">
          AI助手正在思考
          <span className="inline-flex">
            <span className="animate-[bounce_1.4s_ease-in-out_infinite]">.</span>
            <span className="animate-[bounce_1.4s_ease-in-out_0.2s_infinite]">.</span>
            <span className="animate-[bounce_1.4s_ease-in-out_0.4s_infinite]">.</span>
          </span>
        </span>
      </div>
    </div>
  )
}

function formatMessageContent(content: string) {
  const lines = content.split('\n')
  
  return lines.map((line, lineIndex) => {
    const isBullet = line.trim().startsWith('•')
    const lineContent = isBullet ? line.trim().slice(1).trim() : line
    
    const processInline = (text: string) => {
      const parts: (string | JSX.Element)[] = []
      let remaining = text
      let keyIndex = 0
      
      while (remaining) {
        const bookMatch = remaining.match(/\[📖([^\]]+)\]/)
        const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
        
        const bookIndex = bookMatch ? remaining.indexOf(bookMatch[0]) : -1
        const boldIndex = boldMatch ? remaining.indexOf(boldMatch[0]) : -1
        
        let nextMatchIndex = -1
        let matchType: 'book' | 'bold' | null = null
        
        if (bookIndex >= 0 && (boldIndex < 0 || bookIndex < boldIndex)) {
          nextMatchIndex = bookIndex
          matchType = 'book'
        } else if (boldIndex >= 0) {
          nextMatchIndex = boldIndex
          matchType = 'bold'
        }
        
        if (nextMatchIndex === -1) {
          if (remaining) parts.push(remaining)
          break
        }
        
        if (nextMatchIndex > 0) {
          parts.push(remaining.slice(0, nextMatchIndex))
        }
        
        if (matchType === 'book' && bookMatch) {
          const linkText = bookMatch[1].trim()
          parts.push(
            <span
              key={`book-${keyIndex++}`}
              className="inline-flex items-center gap-1 text-xs bg-[#2563EB]/10 text-[#2563EB] px-2 py-0.5 rounded-full mt-1 font-medium"
            >
              <BookOpen className="w-3 h-3" />
              <span>{linkText}</span>
            </span>
          )
          remaining = remaining.slice(nextMatchIndex + bookMatch[0].length)
        } else if (matchType === 'bold' && boldMatch) {
          parts.push(
            <strong key={`bold-${keyIndex++}`} className="font-semibold text-slate-800">
              {boldMatch[1]}
            </strong>
          )
          remaining = remaining.slice(nextMatchIndex + boldMatch[0].length)
        }
      }
      
      return parts
    }
    
    const formattedContent = processInline(lineContent)
    
    if (isBullet) {
      return (
        <div key={lineIndex} className="flex items-start gap-2 ml-1">
          <span className="text-[#2563EB] mt-0.5">•</span>
          <span>{formattedContent}</span>
        </div>
      )
    }
    
    if (!line.trim()) {
      return <div key={lineIndex} className="h-2" />
    }
    
    return (
      <div key={lineIndex}>
        {formattedContent}
      </div>
    )
  })
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isBot = message.role === "bot"

  return (
    <div
      className={cn(
        "flex w-full animate-fade-in",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed",
          isBot
            ? "bg-slate-100 text-slate-700 rounded-bl-md"
            : "bg-[#2563EB] text-white rounded-br-md shadow-md shadow-blue-200"
        )}
      >
        {isBot ? formatMessageContent(message.content) : message.content}
      </div>
    </div>
  )
}

export function ChatPanel() {
  const {
    messages,
    addMessage,
    clearMessages,
    isExpanded,
    toggleExpanded,
    hasUnreadBotMessage,
    markAsRead,
    notifyNewTransaction,
  } = useChat()
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isExpanded, isTyping])

  useEffect(() => {
    if (isExpanded) {
      markAsRead()
    }
  }, [isExpanded, markAsRead])

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isTyping) return

    const userMsg = inputValue.trim()
    addMessage("user", userMsg)
    setInputValue("")

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    setIsTyping(true)
    try {
      const data = await apiChat(userMsg)
      addMessage("bot", data.reply)
      if (data.type === "quick_entry" && data.transaction) {
        notifyNewTransaction(data.transaction)
      }
    } catch (err: unknown) {
      addMessage("bot", `❌ 请求失败：${err instanceof Error ? err.message : "网络错误"}`)
    } finally {
      setIsTyping(false)
    }
  }, [inputValue, isTyping, addMessage])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px'
  }

  const handleClearChat = () => {
    clearMessages()
  }

  return (
    <div className="sticky top-14 md:top-16 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Expanded Messages Area with slide animation */}
      <div 
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Chat Header with Clear Button */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-xs text-slate-500">对话历史</span>
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#DC2626] transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              清除对话
            </button>
          </div>
          
          <div className="max-h-[250px] overflow-y-auto py-4 space-y-3 scrollbar-thin">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 py-3">
          {/* AI Label */}
          <div className="flex items-center gap-2 text-slate-600 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB] to-blue-500 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="text-[13px] font-medium hidden sm:inline">AI 助手</span>
          </div>

          {/* Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="输入问题或指令..."
              rows={1}
              className="w-full resize-none pr-4 py-2 px-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2563EB]/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 rounded-xl text-[13px] leading-relaxed transition-all"
              style={{ minHeight: '38px', maxHeight: '100px' }}
            />
          </div>

          {/* Send Button */}
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl px-4 shadow-md shadow-blue-200 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            <Send className="w-4 h-4" />
          </Button>

          {/* Toggle Button with notification dot */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleExpanded}
            className="relative border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl gap-1.5 shrink-0 transition-all"
          >
            {/* Red notification dot */}
            {!isExpanded && hasUnreadBotMessage && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#DC2626] rounded-full animate-pulse" />
            )}
            
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span className="hidden sm:inline text-[13px]">收起</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span className="hidden sm:inline text-[13px]">展开</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
