import type { InsightsResult } from "@/lib/api"

export interface LatestInsightsSnapshot {
  reply: string
  insights: InsightsResult
  updatedAt: string
}

const STORAGE_KEY = "smart_spend_latest_insights_v1"
const EVENT_NAME = "smart-spend:latest-insights-updated"

export function saveLatestInsights(snapshot: LatestInsightsSnapshot) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: snapshot }))
}

export function readLatestInsights(): LatestInsightsSnapshot | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as LatestInsightsSnapshot
  } catch {
    return null
  }
}

export function latestInsightsEventName() {
  return EVENT_NAME
}
