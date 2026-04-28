"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  apiGenerateInsights,
  apiGetTransactions,
  type InsightsResult,
  type MonthlySummary,
  type SpendingRecommendation,
  type SpendingTrend,
  type SubscriptionSummary,
  type TransactionItem,
  type UnusualSpending,
} from "@/lib/api"
import { translateInsightsReply, translateInsightsResult } from "@/lib/insights-display"
import {
  latestInsightsEventName,
  readLatestInsights,
  saveLatestInsights,
  type LatestInsightsSnapshot,
} from "@/lib/latest-insights"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertTriangle,
  CreditCard,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react"

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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function getMonthKey(dateValue: string) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function toExpenseTransactions(transactions: TransactionItem[]) {
  return transactions.filter((item) => item.direction === "expense" && item.amount > 0)
}

function buildMovingAverage(points: Array<[string, number]>) {
  return points.map(([month], index) => {
    const slice = points.slice(Math.max(0, index - 1), index + 1)
    const average = slice.reduce((sum, [, amount]) => sum + amount, 0) / slice.length
    return [month, roundMoney(average)] as [string, number]
  })
}

function buildTrendFallback(expenses: TransactionItem[]): SpendingTrend[] {
  const byCategory = new Map<string, Map<string, number>>()

  for (const item of expenses) {
    const monthKey = getMonthKey(item.transaction_time)
    if (!monthKey) continue
    const monthMap = byCategory.get(item.category) ?? new Map<string, number>()
    monthMap.set(monthKey, roundMoney((monthMap.get(monthKey) ?? 0) + item.amount))
    byCategory.set(item.category, monthMap)
  }

  return Array.from(byCategory.entries())
    .map(([category, monthMap]) => {
      const dataPoints = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b))
      const total = dataPoints.reduce((sum, [, amount]) => sum + amount, 0)
      const previous = dataPoints.at(-2)?.[1]
      const latest = dataPoints.at(-1)?.[1] ?? 0
      const growthRate = previous && previous > 0 ? (latest - previous) / previous : 0

      return {
        category,
        total,
        trend: {
          category,
          data_points: dataPoints,
          growth_rate: growthRate,
          seasonal_pattern: dataPoints.length >= 2 ? "Monthly" : "No clear pattern",
          moving_average: buildMovingAverage(dataPoints),
        },
      }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((item) => item.trend)
}

function buildUnusualFallback(expenses: TransactionItem[]): UnusualSpending[] {
  if (expenses.length === 0) return []

  const average = expenses.reduce((sum, item) => sum + item.amount, 0) / expenses.length
  const threshold = Math.max(average * 1.8, average + 100)

  return expenses
    .filter((item) => item.amount >= threshold)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((item) => ({
      transaction_id: item.id,
      date: item.transaction_time,
      amount: item.amount,
      category: item.category,
      counterparty: item.counterparty,
      deviation: average > 0 ? item.amount / average - 1 : 0,
    }))
}

function buildSubscriptionFallback(expenses: TransactionItem[]): SubscriptionSummary {
  const subscriptionItems = expenses.filter((item) => item.category === "Subscription Services")
  const byMerchant = new Map<string, TransactionItem[]>()

  for (const item of subscriptionItems) {
    const merchant = item.counterparty || "Unnamed subscription"
    const group = byMerchant.get(merchant) ?? []
    group.push(item)
    byMerchant.set(merchant, group)
  }

  const subscriptions = Array.from(byMerchant.entries()).map(([merchant, items]) => {
    const sorted = [...items].sort((a, b) => (
      new Date(b.transaction_time).getTime() - new Date(a.transaction_time).getTime()
    ))
    const avgAmount = items.reduce((sum, item) => sum + item.amount, 0) / items.length
    const isAnnual = items.some((item) => /annual|year/i.test(item.goods_description ?? ""))

    return {
      merchant,
      monthly_amount: roundMoney(isAnnual ? avgAmount / 12 : avgAmount),
      last_charge_date: sorted[0]?.transaction_time,
      charge_frequency: isAnnual ? "Yearly" : "Monthly",
    }
  })

  return {
    total_monthly_subscription: roundMoney(
      subscriptions.reduce((sum, item) => sum + (item.monthly_amount ?? 0), 0)
    ),
    subscriptions,
  }
}

function mergeInsightFallbacks(insights: InsightsResult, transactions: TransactionItem[]) {
  const expenses = toExpenseTransactions(transactions)
  if (expenses.length === 0) return insights

  const spendingTrends = insights.spending_trends.length > 0
    ? insights.spending_trends
    : buildTrendFallback(expenses)

  const unusualSpending = insights.unusual_spending.length > 0
    ? insights.unusual_spending
    : buildUnusualFallback(expenses)

  const subscriptions = insights.subscriptions.subscriptions.length > 0 || insights.subscriptions.total_monthly_subscription > 0
    ? insights.subscriptions
    : buildSubscriptionFallback(expenses)

  return {
    ...insights,
    spending_trends: spendingTrends,
    unusual_spending: unusualSpending,
    subscriptions,
  }
}

function MetricCard({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint: string
}) {
  return (
    <Card className="gap-3 rounded-2xl border-slate-200 py-4 shadow-sm">
      <CardHeader className="px-4">
        <CardDescription className="text-[11px] uppercase tracking-wide">{title}</CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 text-xs text-slate-500">{hint}</CardContent>
    </Card>
  )
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="gap-4 rounded-2xl border-slate-200 py-5 shadow-sm">
      <CardHeader className="px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            {icon}
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  )
}

function SummarySection({ summary }: { summary: MonthlySummary }) {
  const topCategory = summary.top_categories[0]

  return (
    <SectionCard
      icon={<Wallet className="h-4 w-4" />}
      title="Spending Summary"
      description="Shows total expense, monthly average, and the leading categories in this insight run."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Total Expense"
          value={formatMoney(summary.total_expense)}
          hint="Cumulative spending in the current analysis window"
        />
        <MetricCard
          title="Monthly Average"
          value={formatMoney(summary.average_monthly_spending)}
          hint="Average spending aggregated by month"
        />
        <MetricCard
          title="Top Category"
          value={topCategory?.category ?? "N/A"}
          hint={
            topCategory
              ? `${formatMoney(topCategory.amount)} · ${normalizePercent(topCategory.percentage)}`
              : "No category breakdown available yet"
          }
        />
      </div>

      <div className="mt-4 space-y-3">
        {summary.top_categories.slice(0, 5).map((item) => (
          <div
            key={`${item.category}-${item.amount}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div>
              <div className="font-medium text-slate-900">{item.category}</div>
              <div className="text-xs text-slate-500">{normalizePercent(item.percentage)}</div>
            </div>
            <div className="text-sm font-semibold text-slate-900">{formatMoney(item.amount)}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function TrendSection({ trends }: { trends: SpendingTrend[] }) {
  return (
    <SectionCard
      icon={<TrendingUp className="h-4 w-4" />}
      title="Trend Signal"
      description="Shows the category trends and growth changes detected in the current dataset."
    >
      <div className="space-y-3">
        {trends.length > 0 ? (
          trends.slice(0, 5).map((trend) => (
            <div key={trend.category} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{trend.category}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Pattern: {trend.seasonal_pattern || "N/A"}
                  </div>
                </div>
                <div className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#2563EB]">
                  {normalizePercent(trend.growth_rate)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No trend data available right now.
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function AlertSection({ unusual }: { unusual: UnusualSpending[] }) {
  return (
    <SectionCard
      icon={<AlertTriangle className="h-4 w-4" />}
      title="Alert"
      description="Shows potentially unusual transactions worth a closer look."
    >
      <div className="space-y-3">
        {unusual.length > 0 ? (
          unusual.slice(0, 5).map((item) => (
            <div key={item.transaction_id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{item.counterparty || "Unknown merchant"}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{formatMoney(item.amount)}</div>
                  <div className="mt-1 text-xs text-amber-700">Deviation {normalizePercent(item.deviation)}</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No unusual spending has been detected.
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function SubscriptionSection({ subscriptions }: { subscriptions: SubscriptionSummary }) {
  return (
    <SectionCard
      icon={<CreditCard className="h-4 w-4" />}
      title="Subscription Summary"
      description="Shows detected recurring charges and subscription-style expenses."
    >
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <MetricCard
          title="Monthly Subscription"
          value={formatMoney(subscriptions.total_monthly_subscription)}
          hint="Detected monthly subscription cost"
        />
        <MetricCard
          title="Subscription Count"
          value={String(subscriptions.subscriptions.length)}
          hint="Number of detected subscriptions"
        />
      </div>

      <div className="space-y-3">
        {subscriptions.subscriptions.length > 0 ? (
          subscriptions.subscriptions.slice(0, 6).map((item, index) => (
            <div
              key={`${item.merchant ?? "subscription"}-${index}`}
              className="rounded-xl border border-slate-200 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{item.merchant || "Unnamed subscription"}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.charge_frequency || "Unknown frequency"}</div>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {typeof item.monthly_amount === "number" ? formatMoney(item.monthly_amount) : "Unknown amount"}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No subscription-style spending has been detected.
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function RecommendationSection({ recommendations }: { recommendations: SpendingRecommendation[] }) {
  return (
    <SectionCard
      icon={<Sparkles className="h-4 w-4" />}
      title="Recommendations"
      description="Shows the action suggestions returned by Follow Agent."
    >
      <div className="space-y-3">
        {recommendations.length > 0 ? (
          recommendations.map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{item.type}</div>
                </div>
                <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {item.priority}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No recommendations available right now.
          </div>
        )}
      </div>
    </SectionCard>
  )
}

interface RouteState {
  insights?: InsightsResult
  reply?: string
}

function hasInsightContent(insights: InsightsResult | null | undefined) {
  if (!insights) return false

  return (
    insights.monthly_summary.total_expense > 0 ||
    insights.monthly_summary.top_categories.length > 0 ||
    insights.spending_trends.length > 0 ||
    insights.unusual_spending.length > 0 ||
    insights.subscriptions.total_monthly_subscription > 0 ||
    insights.subscriptions.subscriptions.length > 0 ||
    insights.recommendations.length > 0
  )
}

export function InsightsPage() {
  const location = useLocation()
  const routeState = (location.state as RouteState | null) ?? null
  const initialSnapshot = routeState?.insights
    ? {
        reply: translateInsightsReply(routeState.reply ?? ""),
        insights: translateInsightsResult(routeState.insights),
        updatedAt: new Date().toISOString(),
      }
    : readLatestInsights()
  const shouldAutoGenerate = !hasInsightContent(initialSnapshot?.insights)
  const [insights, setInsights] = useState<InsightsResult | null>(
    shouldAutoGenerate ? null : (initialSnapshot?.insights ?? null)
  )
  const [reply, setReply] = useState(shouldAutoGenerate ? "" : (initialSnapshot?.reply ?? ""))
  const [updatedAt, setUpdatedAt] = useState(shouldAutoGenerate ? "" : (initialSnapshot?.updatedAt ?? ""))
  const [isGenerating, setIsGenerating] = useState(shouldAutoGenerate)
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const applySnapshot = (snapshot: LatestInsightsSnapshot) => {
    setInsights(snapshot.insights)
    setReply(snapshot.reply)
    setUpdatedAt(snapshot.updatedAt)
  }

  useEffect(() => {
    const handleRealtimeUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<LatestInsightsSnapshot>
      if (customEvent.detail) {
        applySnapshot(customEvent.detail)
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "smart_spend_latest_insights_v1") return
      const snapshot = readLatestInsights()
      if (snapshot) {
        applySnapshot(snapshot)
      }
    }

    window.addEventListener(latestInsightsEventName(), handleRealtimeUpdate as EventListener)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener(latestInsightsEventName(), handleRealtimeUpdate as EventListener)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  useEffect(() => {
    if (!shouldAutoGenerate) return

    let active = true
    setIsGenerating(true)

    apiGenerateInsights({ use_llm: true })
      .then((result) => {
        if (!active) return

        const snapshot: LatestInsightsSnapshot = {
          userId: null,
          reply: "I reviewed your recent spending and generated the latest financial insights below.",
          insights: translateInsightsResult(result),
          updatedAt: new Date().toISOString(),
        }

        saveLatestInsights(snapshot)
        applySnapshot(snapshot)
      })
      .catch(() => {
        if (!active) return
      })
      .finally(() => {
        if (active) {
          setIsGenerating(false)
        }
      })

    return () => {
      active = false
    }
  }, [shouldAutoGenerate])

  useEffect(() => {
    let active = true

    apiGetTransactions({ page: 1, size: 100 })
      .then((result) => {
        if (active) {
          setTransactions(result.items)
        }
      })
      .catch(() => {
        if (active) {
          setTransactions([])
        }
      })

    return () => {
      active = false
    }
  }, [])

  const displayInsights = useMemo(() => {
    if (!insights) return null
    return mergeInsightFallbacks(insights, transactions)
  }, [insights, transactions])

  const quickStats = useMemo(() => {
    if (!displayInsights) return null
    const topCategory = displayInsights.monthly_summary.top_categories[0]
    return {
      totalExpense: formatMoney(displayInsights.monthly_summary.total_expense),
      average: formatMoney(displayInsights.monthly_summary.average_monthly_spending),
      subscriptions: formatMoney(displayInsights.subscriptions.total_monthly_subscription),
      topCategory: topCategory?.category ?? "N/A",
    }
  }, [displayInsights])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Insights Dashboard</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Review the latest structured Follow Agent result generated from AI Chat.
          </p>
          {updatedAt ? (
            <p className="mt-1 text-[11px] text-slate-400">
              Last updated {new Date(updatedAt).toLocaleString("en-US")}
            </p>
          ) : null}
        </div>
        <div className="self-start rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
          Updates only after an AI Chat insight reply
        </div>
      </div>

      {reply ? (
        <Card className="gap-0 rounded-2xl border-blue-100 bg-gradient-to-r from-blue-50 to-white py-0 shadow-sm">
          <CardContent className="px-5 py-4 text-sm leading-6 text-slate-700">{reply}</CardContent>
        </Card>
      ) : null}

      {!insights ? (
        <Card className="rounded-2xl border-slate-200 py-0">
          <CardContent className="flex items-center gap-3 px-5 py-5 text-sm text-slate-500">
            {isGenerating
              ? "Generating the latest insights from your transaction history..."
              : "Open AI Chat and trigger an insights request to populate this page with the latest recommendation set."}
          </CardContent>
        </Card>
      ) : null}

      {quickStats && displayInsights ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Total Expense" value={quickStats.totalExpense} hint="Real-time cumulative spending" />
            <MetricCard title="Monthly Average" value={quickStats.average} hint="Average monthly spending" />
            <MetricCard title="Subscriptions" value={quickStats.subscriptions} hint="Subscriptions and recurring charges" />
            <MetricCard title="Top Category" value={quickStats.topCategory} hint="Leading spending category" />
          </div>

          <SummarySection summary={displayInsights.monthly_summary} />
          <div className="grid gap-4 xl:grid-cols-2">
            <TrendSection trends={displayInsights.spending_trends} />
            <AlertSection unusual={displayInsights.unusual_spending} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <SubscriptionSection subscriptions={displayInsights.subscriptions} />
            <RecommendationSection recommendations={displayInsights.recommendations} />
          </div>
        </>
      ) : null}
    </div>
  )
}
