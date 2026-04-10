/**
 * 后端 API 客户端。
 * 统一处理 baseURL、Authorization Header 和错误响应。
 */

export const API_BASE = "http://localhost:8000"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("auth_token")
}

function getUserId(): string | null {
  if (typeof window === "undefined") return null
  const savedUser = localStorage.getItem("user")
  if (!savedUser) return null
  try {
    const user = JSON.parse(savedUser) as { id?: string }
    return typeof user.id === "string" && user.id.trim() ? user.id : null
  } catch {
    return null
  }
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (typeof body.detail === "string") {
        detail = body.detail
      } else if (Array.isArray(body.detail)) {
        // Pydantic 422 validation errors
        detail = body.detail.map((e: { msg?: string; loc?: string[] }) =>
          `${e.loc?.slice(1).join(".") ?? "field"}: ${e.msg ?? "invalid"}`
        ).join("\n")
      }
    } catch {}
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function apiRegister(username: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  })
  return handleResponse<{ token: string; user: { id: string; username: string; email: string } }>(res)
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse<{ token: string; user: { id: string; username: string; email: string } }>(res)
}

// ── Upload ────────────────────────────────────────────────────────────────────
export async function apiUpload(file: File) {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  })
  return handleResponse<UploadResult>(res)
}

// ── Transactions ──────────────────────────────────────────────────────────────
export interface TransactionItem {
  id: string
  transaction_time: string
  counterparty: string
  goods_description: string | null
  direction: "expense" | "income" | "neutral"
  amount: number
  category: string
  confidence: number
  evidence: string
  decision_source: string
  needs_review: boolean
}

export interface UploadResult {
  categorized: TransactionItem[]
  review_queue: TransactionItem[]
  stats: {
    total: number
    expense: number
    income: number
    neutral: number
    auto_classified: number
    needs_review: number
    llm_fallback: number
    by_source: Record<string, number>
  }
}

export async function apiGetTransactions(params?: {
  page?: number
  size?: number
  filter?: string
  search?: string
  category?: string
}) {
  const q = new URLSearchParams()
  if (params?.page)     q.set("page",     String(params.page))
  if (params?.size)     q.set("size",     String(params.size))
  if (params?.filter)   q.set("filter",   params.filter)
  if (params?.search)   q.set("search",   params.search)
  if (params?.category) q.set("category", params.category)

  const res = await fetch(`${API_BASE}/api/transactions?${q}`, {
    headers: { ...authHeaders() },
  })
  return handleResponse<{
    items: TransactionItem[]
    total: number
    page: number
    size: number
    stats: UploadResult["stats"]
  }>(res)
}

// ── Review ────────────────────────────────────────────────────────────────────
export async function apiReview(
  transactionId: string,
  action: "confirm" | "correct",
  correctedCategory?: string,
) {
  const body: Record<string, string> = { action }
  if (correctedCategory) body.corrected_category = correctedCategory
  const res = await fetch(`${API_BASE}/api/review/${transactionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  })
  return handleResponse<{ status: string; transaction_id: string }>(res)
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function apiDeleteTransaction(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try { const b = await res.json(); if (b.detail) detail = b.detail } catch {}
    throw new Error(detail)
  }
}

export async function apiBulkDeleteTransactions(ids: string[]): Promise<{ deleted: number }> {
  const res = await fetch(`${API_BASE}/api/transactions/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ids }),
  })
  return handleResponse<{ deleted: number }>(res)
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export async function apiChat(message: string) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ message }),
  })
  return handleResponse<{
    reply: string
    type: "quick_entry" | "education" | "general" | "error"
    transaction?: TransactionItem
  }>(res)
}


// ── Education ─────────────────────────────────────────────────────────────────
export interface EducationCitation {
  doc_id: string
  title: string
  chunk_index: number
  distance: number
}

export interface EducationRetrievalMeta {
  initial_k: number
  max_k: number
  used_k: number
  threshold: number
  confidence: number
  top_distance: number | null
}

export interface EducationAskResponse {
  status: "answer" | "refuse"
  answer: string
  citations: EducationCitation[]
  refusal_type?: string
  retrieval: EducationRetrievalMeta
}

export async function apiEducationAsk(question: string) {
  const userId = getUserId()
  if (!userId) {
    throw new Error("User ID not found. Please login and try again.")
  }

  const res = await fetch(`${API_BASE}/education/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ question, user_id: userId }),
  })

  return handleResponse<EducationAskResponse>(res)
}