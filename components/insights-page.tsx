"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  apiGenerateInsights,
  type InsightsResult,
  type MonthlySummary,
  type SpendingRecommendation,
  type SpendingTrend,
  type SubscriptionSummary,
  type UnusualSpending,
} from "@/lib/api"
import { translateInsightsReply, translateInsightsResult } from "@/lib/insights-display"
import { Button } from "@/components/ui/button"
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
  Loader2,
  RefreshCw,
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

export function InsightsPage() {
  const location = useLocation()
  const routeState = (location.state as RouteState | null) ?? null
  const [insights, setInsights] = useState<InsightsResult | null>(
    routeState?.insights ? translateInsightsResult(routeState.insights) : null
  )
  const [reply, setReply] = useState(routeState?.reply ? translateInsightsReply(routeState.reply) : "")
  const [isLoading, setIsLoading] = useState(!routeState?.insights)
  const [error, setError] = useState<string | null>(null)

  const loadInsights = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await apiGenerateInsights({ use_llm: false })
      setInsights(translateInsightsResult(result))
      if (!reply) {
        setReply("This is a real-time Follow / Insights summary generated from your current transaction data.")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load insights")
    } finally {
      setIsLoading(false)
    }
  }, [reply])

  useEffect(() => {
    if (!routeState?.insights) {
      void loadInsights()
    }
  }, [routeState?.insights, loadInsights])

  const quickStats = useMemo(() => {
    if (!insights) return null
    const topCategory = insights.monthly_summary.top_categories[0]
    return {
      totalExpense: formatMoney(insights.monthly_summary.total_expense),
      average: formatMoney(insights.monthly_summary.average_monthly_spending),
      subscriptions: formatMoney(insights.subscriptions.total_monthly_subscription),
      topCategory: topCategory?.category ?? "N/A",
    }
  }, [insights])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Insights Dashboard</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Review structured Follow Agent results and real-time calculated metrics.
          </p>
        </div>
        <Button variant="outline" className="gap-2 self-start" onClick={() => void loadInsights()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {reply ? (
        <Card className="gap-0 rounded-2xl border-blue-100 bg-gradient-to-r from-blue-50 to-white py-0 shadow-sm">
          <CardContent className="px-5 py-4 text-sm leading-6 text-slate-700">{reply}</CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="rounded-2xl border-red-200 bg-red-50 py-0">
          <CardContent className="px-5 py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      {isLoading && !insights ? (
        <Card className="rounded-2xl border-slate-200 py-0">
          <CardContent className="flex items-center gap-3 px-5 py-5 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculating the latest insights...
          </CardContent>
        </Card>
      ) : null}

      {quickStats && insights ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Total Expense" value={quickStats.totalExpense} hint="Real-time cumulative spending" />
            <MetricCard title="Monthly Average" value={quickStats.average} hint="Average monthly spending" />
            <MetricCard title="Subscriptions" value={quickStats.subscriptions} hint="Subscriptions and recurring charges" />
            <MetricCard title="Top Category" value={quickStats.topCategory} hint="Leading spending category" />
          </div>

          <SummarySection summary={insights.monthly_summary} />
          <div className="grid gap-4 xl:grid-cols-2">
            <TrendSection trends={insights.spending_trends} />
            <AlertSection unusual={insights.unusual_spending} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <SubscriptionSection subscriptions={insights.subscriptions} />
            <RecommendationSection recommendations={insights.recommendations} />
          </div>
        </>
      ) : null}
    </div>
  )
}
