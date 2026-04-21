"use client"

import { useState, useRef, useEffect, useCallback, type ReactNode, type ChangeEvent, type KeyboardEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useChat, type ChatMessage } from "@/contexts/chat-context"
import { apiChat } from "@/lib/api"
import { translateInsightsReply, translateInsightsResult } from "@/lib/insights-display"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Send, Bot, Plus, X, MessageSquare, BookOpen, Sparkles, TrendingUp, TriangleAlert, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-2.5 text-[13px] text-slate-600">
        <span className="flex items-center gap-1">
          AI Assistant is thinking
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
      const parts: ReactNode[] = []
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

  if (isBot && message.type === "insights" && message.insightsPayload) {
    return <InsightsBubble message={message} />
  }

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

function formatMoney(value: number | undefined) {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0
  return `¥${safe.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function normalizePercent(value: number | undefined) {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0
  const raw = Math.abs(safe) <= 1 ? safe * 100 : safe
  return `${raw.toFixed(1)}%`
}

function InsightMetric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  )
}

function InsightSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-slate-800">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </div>
        <div className="text-[12px] font-semibold">{title}</div>
      </div>
      <div className="space-y-1.5 text-[13px] leading-relaxed text-slate-600">{children}</div>
    </div>
  )
}

function InsightsBubble({ message }: { message: ChatMessage }) {
  const navigate = useNavigate()
  const payload = message.insightsPayload
  if (!payload) return null

  const translatedReply = translateInsightsReply(payload.reply)
  const translatedInsights = translateInsightsResult(payload.insights)
  const topCategory = translatedInsights.monthly_summary.top_categories[0]
  const topAnomaly = translatedInsights.unusual_spending[0]
  const topTrend = translatedInsights.spending_trends[0]
  const topRecommendation = translatedInsights.recommendations[0]

  const openInsightsPage = () => {
    navigate("/insights", {
      state: {
        reply: translatedReply,
        insights: translatedInsights,
      },
    })
  }

  return (
    <div className="flex w-full justify-start animate-fade-in">
      <div
        className="max-w-[92%] cursor-pointer rounded-3xl rounded-bl-md border border-blue-100 bg-gradient-to-br from-white via-blue-50/60 to-slate-50 px-4 py-4 font-sans text-[13px] leading-relaxed shadow-md shadow-blue-100/40 transition-transform hover:-translate-y-0.5"
        onClick={openInsightsPage}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openInsightsPage()
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-blue-500 shadow-sm">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="font-semibold">Follow Agent</div>
              <div className="text-[11px] text-slate-500">Financial Insights</div>
            </div>
          </div>
          <div className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[11px] font-medium text-[#2563EB]">
            Insights
          </div>
        </div>

        {translatedReply.trim() ? (
          <div className="mb-4 rounded-2xl border border-white/80 bg-white/90 px-3 py-3 text-slate-700 shadow-sm">
            {formatMessageContent(translatedReply)}
          </div>
        ) : null}

        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <InsightMetric
            label="Total Expense"
            value={formatMoney(translatedInsights.monthly_summary.total_expense)}
            hint="Current analysis window"
          />
          <InsightMetric
            label="Monthly Average"
            value={formatMoney(translatedInsights.monthly_summary.average_monthly_spending)}
            hint="Average spending per month"
          />
          <InsightMetric
            label="Subscriptions"
            value={formatMoney(translatedInsights.subscriptions.total_monthly_subscription)}
            hint="Detected recurring cost"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InsightSection icon={<Wallet className="h-3.5 w-3.5" />} title="Spending Summary">
            {topCategory ? (
              <>
                <div>
                  Top category: <span className="font-semibold text-slate-900">{topCategory.category}</span>
                </div>
                <div>
                  Amount: <span className="font-semibold text-slate-900">{formatMoney(topCategory.amount)}</span>
                </div>
                <div>
                  Share: <span className="font-semibold text-slate-900">{normalizePercent(topCategory.percentage)}</span>
                </div>
              </>
            ) : (
              <div>No category summary returned.</div>
            )}
          </InsightSection>

          <InsightSection icon={<TrendingUp className="h-3.5 w-3.5" />} title="Trend Signal">
            {topTrend ? (
              <>
                <div>
                  Category: <span className="font-semibold text-slate-900">{topTrend.category}</span>
                </div>
                <div>
                  Growth: <span className="font-semibold text-slate-900">{normalizePercent(topTrend.growth_rate)}</span>
                </div>
                <div>
                  Pattern: <span className="font-semibold text-slate-900">{topTrend.seasonal_pattern || "N/A"}</span>
                </div>
              </>
            ) : (
              <div>No trend data.</div>
            )}
          </InsightSection>

          <InsightSection icon={<TriangleAlert className="h-3.5 w-3.5" />} title="Alert">
            {topAnomaly ? (
              <>
                <div>
                  Merchant: <span className="font-semibold text-slate-900">{topAnomaly.counterparty || "Unknown"}</span>
                </div>
                <div>
                  Amount: <span className="font-semibold text-slate-900">{formatMoney(topAnomaly.amount)}</span>
                </div>
                <div>
                  Deviation: <span className="font-semibold text-slate-900">{normalizePercent(topAnomaly.deviation)}</span>
                </div>
              </>
            ) : (
              <div>No unusual spending detected.</div>
            )}
          </InsightSection>

          <InsightSection icon={<Sparkles className="h-3.5 w-3.5" />} title="Recommendation">
            {topRecommendation ? (
              <>
                <div className="font-semibold text-slate-900">{topRecommendation.title}</div>
                <div>{topRecommendation.description}</div>
                <div>
                  Priority: <span className="font-semibold text-slate-900">{topRecommendation.priority}</span>
                </div>
              </>
            ) : (
              <div>No recommendation returned.</div>
            )}
          </InsightSection>
        </div>

        <div className="mt-4 flex items-center justify-end text-[#2563EB]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-full px-3 text-xs text-[#2563EB] hover:bg-blue-100 hover:text-blue-700"
            onClick={(event) => {
              event.stopPropagation()
              openInsightsPage()
            }}
          >
            View full page
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ChatPanel() {
  const {
    messages,
    addMessage,
    startNewConversation,
    isExpanded,
    toggleExpanded,
    setExpanded,
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
      if (data.type === "insights" && data.insights) {
        addMessage("bot", data.reply, {
          type: "insights",
          insightsPayload: {
            reply: data.reply,
            insights: data.insights,
          },
        })
      } else {
        addMessage("bot", data.reply)
      }

      if (data.type === "quick_entry" && data.transaction) {
        notifyNewTransaction(data.transaction)
      }
    } catch (err: unknown) {
      addMessage("bot", `❌ Request failed: ${err instanceof Error ? err.message : "Network error"}`)
    } finally {
      setIsTyping(false)
    }
  }, [inputValue, isTyping, addMessage, notifyNewTransaction])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px'
  }

  const handleNewConversation = () => {
    startNewConversation()
    setInputValue("")
    setIsTyping(false)
  }

  return (
    <>
      {isExpanded && (
        <button
          type="button"
          aria-label="Close chat panel"
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]"
        />
      )}

      <div className="fixed bottom-4 right-4 z-50">
        <div
          className={cn(
            "mb-3 w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40 transition-all duration-200",
            isExpanded
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-4 scale-95 opacity-0"
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2 text-slate-700">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563EB] to-blue-500 shadow-sm">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <span className="text-[13px] font-semibold">AI Assistant</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleNewConversation}
                className="h-8 gap-1.5 px-2 text-[12px] text-slate-500 hover:bg-slate-100 hover:text-[#2563EB]"
              >
                <Plus className="h-3.5 w-3.5" />
                New Conversation
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(false)}
                className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="h-[min(56vh,440px)] overflow-y-auto space-y-3 px-4 py-3 scrollbar-thin">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-100 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Enter the question or accounting instruction..."
                rows={1}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] leading-relaxed transition-all focus:border-[#2563EB]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                style={{ minHeight: "38px", maxHeight: "100px" }}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="h-[38px] rounded-xl bg-[#2563EB] px-3 text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-600 disabled:opacity-50 disabled:shadow-none"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={toggleExpanded}
          className="relative h-12 rounded-full bg-[#2563EB] px-4 text-white shadow-xl shadow-blue-300 transition-all hover:bg-blue-600"
        >
          {!isExpanded && hasUnreadBotMessage && (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-[#DC2626] ring-2 ring-white" />
          )}
          <MessageSquare className="mr-2 h-4 w-4" />
          <span className="text-[13px] font-medium">AI Chat</span>
        </Button>
      </div>
    </>
  )
}
