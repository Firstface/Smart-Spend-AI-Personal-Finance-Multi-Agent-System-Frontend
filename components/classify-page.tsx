"use client"

import { useState, useRef, useMemo, useEffect, useCallback } from "react"
import { useChat } from "@/contexts/chat-context"
import { toast } from "sonner"
import { apiUpload, apiGetTransactions, apiReview, apiDeleteTransaction, apiBulkDeleteTransactions, type TransactionItem } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Upload,
  Loader2,
  CheckCircle2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Check,
  Pencil,
  ChevronDown,
  Info,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Category definitions with colors
const CATEGORIES = [
  { id: "dining",        emoji: "🍜", label: "Food & Dining",    color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "transport",     emoji: "🚗", label: "Transportation",   color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "housing",       emoji: "🏠", label: "Housing",          color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "shopping",      emoji: "🛒", label: "Shopping",         color: "bg-pink-100 text-pink-700 border-pink-200" },
  { id: "entertainment", emoji: "🎭", label: "Entertainment",    color: "bg-teal-100 text-teal-700 border-teal-200" },
  { id: "subscription",  emoji: "📱", label: "Subscriptions",    color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { id: "medical",       emoji: "🏥", label: "Healthcare",       color: "bg-red-100 text-red-700 border-red-200" },
  { id: "daily",         emoji: "📦", label: "Daily Essentials", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "education",     emoji: "📚", label: "Education",        color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { id: "other",         emoji: "❓", label: "Other",            color: "bg-gray-100 text-gray-700 border-gray-200" },
] as const

type CategoryId = typeof CATEGORIES[number]["id"]

// Classification source labels
const SOURCE_LABELS: Record<string, string> = {
  merchant_map: "Merchant Map",
  keyword_rule: "Keyword Rule",
  subscription: "Subscription Detection",
  similarity: "Similarity Match",
  llm: "LLM Used",
  llm_reflection: "LLM Self-Reflection",
}

// Backend category name → frontend id
const CATEGORY_NAME_TO_ID: Record<string, CategoryId> = {
  "Food & Dining": "dining",
  "Transportation": "transport",
  "Housing": "housing",
  "Shopping": "shopping",
  "Entertainment": "entertainment",
  "Subscriptions": "subscription",
  "Healthcare": "medical",
  "Daily Essentials": "daily",
  "Education": "education",
  "Other": "other",
}

// Frontend id → backend category name
const CATEGORY_ID_TO_NAME: Record<CategoryId, string> = {
  dining: "Food & Dining",
  transport: "Transportation",
  housing: "Housing",
  shopping: "Shopping",
  entertainment: "Entertainment",
  subscription: "Subscriptions",
  medical: "Healthcare",
  daily: "Daily Essentials",
  education: "Education",
  other: "Other",
}

// Convert backend TransactionItem to frontend Transaction
function toFrontendTx(item: TransactionItem): Transaction {
  const catId: CategoryId = CATEGORY_NAME_TO_ID[item.category] ?? "other"
  // Backend stores positive amounts with direction; frontend uses negative for expenses
  const displayAmount =
    item.direction === "expense" ? -item.amount : item.amount
  // llm_reflected → llm_reflection for SOURCE_LABELS compatibility
  const src = item.decision_source === "llm_reflected" ? "llm_reflection" : item.decision_source
  return {
    id: item.id,
    date: item.transaction_time,
    merchant: item.counterparty,
    description: item.goods_description ?? "",
    amount: displayAmount,
    categoryId: catId,
    confidence: item.confidence,
    source: src as keyof typeof SOURCE_LABELS,
    needsReview: item.needs_review,
    status: "normal",
  }
}

// Transaction type
interface Transaction {
  id: string
  date: string
  merchant: string
  description: string
  amount: number
  categoryId: CategoryId
  confidence: number
  source: keyof typeof SOURCE_LABELS
  needsReview: boolean
  status: "normal" | "confirmed" | "corrected"
}


type UploadStatus = "idle" | "uploading" | "classifying" | "done"
type FilterTab = "all" | "review" | "reviewed"
type SortField = "date" | "amount" | null
type SortDirection = "asc" | "desc"

interface UploadedFile {
  name: string
  type: "wechat" | "alipay"
  count: number
}

// Progress bar for upload
function UploadProgress() {
  return (
    <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <div className="h-full w-1/4 bg-[#2563EB] rounded-full animate-progress-indeterminate" />
    </div>
  )
}

export function ClassifyPage() {
  // Upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Transaction state
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoadingTx, setIsLoadingTx] = useState(false)

  // Load transactions from API on mount
  const loadTransactions = useCallback(async () => {
    setIsLoadingTx(true)
    try {
      const data = await apiGetTransactions({ size: 100 })
      setTransactions(data.items.map(toFrontendTx))
    } catch (err: unknown) {
      toast.error(`Load transactions failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsLoadingTx(false)
    }
  }, [])

  useEffect(() => { loadTransactions() }, [loadTransactions])

  // Register chat callback to prepend new quick-entry transactions instantly
  const { registerTransactionCallback } = useChat()
  useEffect(() => {
    registerTransactionCallback((tx) => {
      setTransactions((prev) => [toFrontendTx(tx), ...prev])
    })
  }, [registerTransactionCallback])
  const [filterTab, setFilterTab] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Handle file upload — calls real backend API
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      const isWechat = file.name.endsWith(".xlsx")
      const isAlipay = file.name.endsWith(".csv")
      if (!isWechat && !isAlipay) continue

      setUploadStatus("uploading")
      try {
        setUploadStatus("classifying")
        const result = await apiUpload(file)

        setUploadedFiles(prev => [...prev, {
          name: file.name,
          type: isWechat ? "wechat" : "alipay",
          count: result.stats.total,
        }])
        setUploadStatus("done")

        // Merge new transactions into table (prepend, dedup by id)
        const newTxs = result.categorized.map(toFrontendTx)
        setTransactions(prev => {
          const existingIds = new Set(prev.map(t => t.id))
          return [...newTxs.filter(t => !existingIds.has(t.id)), ...prev]
        })

        toast.success(
          `File parsed successfully: ${result.stats.total} transactions, ${result.stats.needs_review} need review`,
          { duration: 3000 }
        )
      } catch (err: unknown) {
        setUploadStatus("idle")
        toast.error(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFileUpload(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    if (uploadedFiles.length === 1) {
      setUploadStatus("idle")
    }
  }

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = transactions.length
    const autoClassified = transactions.filter(t => t.confidence >= 0.7 && !t.needsReview).length
    const needsReview = transactions.filter(t => t.needsReview && t.status === "normal").length
    const llmFallback = transactions.filter(t => t.source === "llm" || t.source === "llm_reflection").length
    return {
      total,
      autoClassified,
      autoClassifiedPercent: ((autoClassified / total) * 100).toFixed(1),
      needsReview,
      llmFallback,
      llmFallbackPercent: ((llmFallback / total) * 100).toFixed(1),
    }
  }, [transactions])

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions]

    // Filter by tab
    if (filterTab === "review") {
      result = result.filter(t => t.needsReview && t.status === "normal")
    } else if (filterTab === "reviewed") {
      result = result.filter(t => t.status === "confirmed" || t.status === "corrected")
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(t => 
        t.merchant.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      )
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      result = result.filter(t => selectedCategories.includes(t.categoryId))
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        let comparison = 0
        if (sortField === "date") {
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        } else if (sortField === "amount") {
          comparison = a.amount - b.amount
        }
        return sortDirection === "asc" ? comparison : -comparison
      })
    }

    return result
  }, [transactions, filterTab, searchQuery, selectedCategories, sortField, sortDirection])

  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTransactions.slice(start, start + pageSize)
  }, [filteredTransactions, currentPage])

  const totalPages = Math.ceil(filteredTransactions.length / pageSize)

  // Handle confirm — calls backend HITL review API
  const handleConfirm = async (id: string) => {
    try {
      await apiReview(id, "confirm")
      setTransactions(prev => prev.map(t =>
        t.id === id ? { ...t, status: "confirmed" as const, needsReview: false } : t
      ))
      toast.success("Classification confirmed", { duration: 3000 })
    } catch (err: unknown) {
      toast.error(`Confirm failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  // Handle category change — calls backend HITL review API
  const handleCategoryChange = async (id: string, newCategoryId: CategoryId) => {
    const category = CATEGORIES.find(c => c.id === newCategoryId)
    const backendCatName = CATEGORY_ID_TO_NAME[newCategoryId]
    try {
      await apiReview(id, "correct", backendCatName)
      setTransactions(prev => prev.map(t =>
        t.id === id ? { ...t, categoryId: newCategoryId, status: "corrected" as const, needsReview: false } : t
      ))
      setEditingId(null)
      toast.info(`Category updated to: ${category?.emoji} ${category?.label}`, { duration: 3000 })
    } catch (err: unknown) {
      toast.error(`Correction failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  // Handle single delete
  const handleDelete = async (id: string) => {
    try {
      await apiDeleteTransaction(id)
      setTransactions(prev => prev.filter(t => t.id !== id))
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
      toast.success("Transaction deleted", { duration: 2000 })
    } catch (err: unknown) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      await apiBulkDeleteTransactions(ids)
      setTransactions(prev => prev.filter(t => !selectedIds.has(t.id)))
      setSelectedIds(new Set())
      toast.success(`Deleted ${ids.length} transaction${ids.length > 1 ? "s" : ""}`, { duration: 2000 })
    } catch (err: unknown) {
      toast.error(`Bulk delete failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  // Get category by id
  const getCategory = (id: CategoryId) => CATEGORIES.find(c => c.id === id)!

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${month}-${day} ${hours}:${minutes}`
  }

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return "bg-[#16A34A]"
    if (confidence >= 0.7) return "bg-[#F59E0B]"
    return "bg-[#DC2626]"
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Classification Results</h1>
        <p className="text-[13px] text-slate-500 mt-1">Upload a bill file to view automatic classification results</p>
      </div>

      {/* Section 1: Upload Area */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        {/* Drop Zone */}
        <div
          className={cn(
            "flex-1 flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all",
            uploadStatus === "uploading" || uploadStatus === "classifying"
              ? "border-[#2563EB]/50 bg-blue-50"
              : "border-slate-300 hover:border-[#2563EB]/50 hover:bg-slate-50"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".xlsx,.csv"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <Upload className="w-5 h-5 text-slate-400 shrink-0" />
          <span className="text-[13px] text-slate-600">
            Drag & drop WeChat Pay (.xlsx) or Alipay (.csv) files here, or click to upload
          </span>
        </div>

        {/* Upload Status */}
        <div className="flex items-center gap-2 min-w-[180px] justify-center sm:justify-start">
          {uploadStatus === "idle" && (
            <span className="text-[13px] text-slate-400">No file uploaded</span>
          )}
          {uploadStatus === "uploading" && (
            <div className="flex items-center gap-3 text-[#2563EB]">
              <UploadProgress />
              <span className="text-[13px]">Uploading...</span>
            </div>
          )}
          {uploadStatus === "classifying" && (
            <div className="flex items-center gap-2 text-[#2563EB]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[13px]">Parsing...</span>
            </div>
          )}
          {uploadStatus === "done" && uploadedFiles.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {uploadedFiles.map((file, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20 gap-1 pr-1 text-[13px]"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {file.type === "wechat" ? "WeChat" : "Alipay"} {file.count} txns
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    className="ml-1 hover:bg-[#16A34A]/20 rounded p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Classification Results */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {/* 2A: Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
            <div className="text-[13px] text-slate-500">Total Transactions</div>
          </div>
          <div className="p-4 bg-[#16A34A]/5 rounded-xl border border-[#16A34A]/20">
            <div className="text-2xl font-bold text-[#16A34A]">{stats.autoClassified}</div>
            <div className="text-[13px] text-[#16A34A]/80">Auto-classified ({stats.autoClassifiedPercent}%)</div>
          </div>
          <button
            onClick={() => setFilterTab(filterTab === "review" ? "all" : "review")}
            className={cn(
              "p-4 rounded-xl border text-left transition-all",
              filterTab === "review"
                ? "bg-[#F59E0B]/15 border-[#F59E0B] ring-2 ring-[#F59E0B]/30"
                : "bg-[#F59E0B]/5 border-[#F59E0B]/20 hover:border-[#F59E0B]/40"
            )}
          >
            <div className="text-2xl font-bold text-[#F59E0B]">{stats.needsReview}</div>
            <div className="text-[13px] text-[#F59E0B]/80">Needs Review (click to filter)</div>
          </button>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-2xl font-bold text-slate-600">{stats.llmFallback}</div>
            <div className="text-[13px] text-slate-500">LLM Used ({stats.llmFallbackPercent}%)</div>
          </div>
        </div>

        {/* 2B: Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="gap-1.5 text-[13px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedIds.size})
              </Button>
            )}
            {(["all", "review", "reviewed"] as FilterTab[]).map((tab) => (
              <Button
                key={tab}
                variant={filterTab === tab ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTab(tab)}
                className={cn(
                  "text-[13px] transition-all",
                  filterTab === tab && "bg-[#2563EB] hover:bg-blue-600"
                )}
              >
                {tab === "all" ? "All" : tab === "review" ? "Needs Review" : "Reviewed"}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search merchant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-56 text-[13px]"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-[13px] shrink-0">
                  Filter by Category
                  {selectedCategories.length > 0 && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-xs bg-[#2563EB]/10 text-[#2563EB]">
                      {selectedCategories.length}
                    </Badge>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                <div className="space-y-1">
                  {CATEGORIES.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedCategories.includes(cat.id)}
                        onCheckedChange={(checked) => {
                          setSelectedCategories(prev =>
                            checked
                              ? [...prev, cat.id]
                              : prev.filter(id => id !== cat.id)
                          )
                        }}
                      />
                      <span className="text-[13px]">
                        {cat.emoji} {cat.label}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedCategories.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-slate-500 text-[13px]"
                    onClick={() => setSelectedCategories([])}
                  >
                    Clear Filter
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 2C: Transaction Table */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50 z-10">
                <TableRow>
                  <TableHead className="w-8 pl-3">
                    <Checkbox
                      checked={paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedIds.has(t.id))}
                      onCheckedChange={(checked) => {
                        setSelectedIds(prev => {
                          const next = new Set(prev)
                          paginatedTransactions.forEach(t => checked ? next.add(t.id) : next.delete(t.id))
                          return next
                        })
                      }}
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 transition-colors text-[13px]"
                    onClick={() => toggleSort("date")}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-[13px]">Merchant</TableHead>
                  <TableHead className="text-[13px]">Description</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 transition-colors text-[13px]"
                    onClick={() => toggleSort("amount")}
                  >
                    <div className="flex items-center gap-1">
                      Amount
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-[13px]">Category</TableHead>
                  <TableHead className="text-[13px]">Confidence</TableHead>
                  <TableHead className="text-[13px]">Evidence</TableHead>
                  <TableHead className="text-[13px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTx ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-slate-500">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : paginatedTransactions.map((tx) => {
                  const category = getCategory(tx.categoryId)
                  const rowBg = tx.needsReview && tx.status === "normal"
                    ? "bg-[#FFF7ED]"
                    : tx.status === "confirmed" || tx.status === "corrected"
                    ? "bg-[#F0FFF4]"
                    : "bg-white"

                  return (
                    <TableRow
                      key={tx.id}
                      className={cn(rowBg, "hover:opacity-80 transition-row-bg", selectedIds.has(tx.id) && "ring-1 ring-inset ring-[#2563EB]/30")}
                    >
                      <TableCell className="pl-3">
                        <Checkbox
                          checked={selectedIds.has(tx.id)}
                          onCheckedChange={(checked) => {
                            setSelectedIds(prev => {
                              const next = new Set(prev)
                              if (checked) {
                                next.add(tx.id)
                              } else {
                                next.delete(tx.id)
                              }
                              return next
                            })
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-slate-600 text-[13px]">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate font-medium text-[13px]">
                        {tx.merchant}
                      </TableCell>
                      <TableCell className="max-w-[150px] text-[13px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block cursor-help">
                              {tx.description}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{tx.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className={cn(
                        "font-medium text-[13px]",
                        tx.amount < 0 ? "text-[#DC2626]" : "text-[#16A34A]"
                      )}>
                        {tx.amount < 0 ? "-" : "+"}¥{Math.abs(tx.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {editingId === tx.id ? (
                          <Select
                            value={tx.categoryId}
                            onValueChange={(value) => handleCategoryChange(tx.id, value as CategoryId)}
                          >
                            <SelectTrigger className="w-32 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.emoji} {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn("font-normal text-[13px]", category.color)}
                          >
                            {category.emoji} {category.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", getConfidenceColor(tx.confidence))}
                              style={{ width: `${tx.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">
                            {(tx.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                              <Info className="w-4 h-4 text-slate-400" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{SOURCE_LABELS[tx.source]}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {tx.needsReview && tx.status === "normal" ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleConfirm(tx.id)}
                                className="h-7 w-7 p-0 text-[#16A34A] hover:text-[#16A34A] hover:bg-[#16A34A]/10"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingId(tx.id)}
                                className="h-7 w-7 p-0 text-[#2563EB] hover:text-[#2563EB] hover:bg-[#2563EB]/10"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </>
                          ) : tx.status === "confirmed" || tx.status === "corrected" ? (
                            <span className="text-xs text-[#16A34A] mr-1">Confirmed</span>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tx.id)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-[#DC2626] hover:bg-[#DC2626]/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <span className="text-[13px] text-slate-600">
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredTransactions.length)}-{Math.min(currentPage * pageSize, filteredTransactions.length)} of {filteredTransactions.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="text-[13px]"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="text-[13px]"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
