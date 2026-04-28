import type { InsightsResult } from "@/lib/api"

export interface LatestInsightsSnapshot {
  userId: string | null
  reply: string
  insights: InsightsResult
  updatedAt: string
}

const STORAGE_KEY = "smart_spend_latest_insights_v1"
const EVENT_NAME = "smart-spend:latest-insights-updated"

function getCurrentUserId() {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem("user")
  if (!raw) return null

  try {
    const user = JSON.parse(raw) as { id?: string }
    return typeof user.id === "string" && user.id.trim() ? user.id : null
  } catch {
    return null
  }
}

export function saveLatestInsights(snapshot: LatestInsightsSnapshot) {
  if (typeof window === "undefined") return
  const payload = {
    ...snapshot,
    userId: snapshot.userId ?? getCurrentUserId(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }))
}

export function readLatestInsights(): LatestInsightsSnapshot | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const snapshot = JSON.parse(raw) as LatestInsightsSnapshot
    const currentUserId = getCurrentUserId()
    if (snapshot.userId !== currentUserId) {
      return null
    }
    return snapshot
  } catch {
    return null
  }
}

export function clearLatestInsights() {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}

export function latestInsightsEventName() {
  return EVENT_NAME
}
