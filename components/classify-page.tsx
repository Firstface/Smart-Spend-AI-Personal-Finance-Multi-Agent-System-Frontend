"use client"

import { useState, useRef, useMemo, useEffect, useCallback } from "react"
import { useChat } from "@/contexts/chat-context"
import { toast } from "sonner"
import { apiUpload, apiGetTransactions, apiReview, type TransactionItem } from "@/lib/api"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

// Category definitions with colors
const CATEGORIES = [
  { id: "dining", emoji: "🍜", label: "餐饮美食", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "transport", emoji: "🚗", label: "交通出行", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "housing", emoji: "🏠", label: "居住", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "shopping", emoji: "🛒", label: "购物", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { id: "entertainment", emoji: "🎭", label: "娱乐休闲", color: "bg-teal-100 text-teal-700 border-teal-200" },
  { id: "subscription", emoji: "📱", label: "订阅服务", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { id: "medical", emoji: "🏥", label: "医疗健康", color: "bg-red-100 text-red-700 border-red-200" },
  { id: "daily", emoji: "📦", label: "日用百货", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "education", emoji: "📚", label: "教育", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { id: "other", emoji: "❓", label: "其他", color: "bg-gray-100 text-gray-700 border-gray-200" },
] as const

type CategoryId = typeof CATEGORIES[number]["id"]

// Classification source labels
const SOURCE_LABELS: Record<string, string> = {
  merchant_map: "商家映射",
  keyword_rule: "关键词规则",
  subscription: "订阅检测",
  similarity: "相似度匹配",
  llm: "LLM回退",
  llm_reflection: "LLM自反思",
}

// Backend category name → frontend id
const CATEGORY_NAME_TO_ID: Record<string, CategoryId> = {
  "餐饮美食": "dining",
  "交通出行": "transport",
  "居住":     "housing",
  "购物":     "shopping",
  "娱乐休闲": "entertainment",
  "订阅服务": "subscription",
  "医疗健康": "medical",
  "日用百货": "daily",
  "教育":     "education",
  "其他":     "other",
}

// Frontend id → backend category name
const CATEGORY_ID_TO_NAME: Record<CategoryId, string> = {
  dining:        "餐饮美食",
  transport:     "交通出行",
  housing:       "居住",
  shopping:      "购物",
  entertainment: "娱乐休闲",
  subscription:  "订阅服务",
  medical:       "医疗健康",
  daily:         "日用百货",
  education:     "教育",
  other:         "其他",
}

// Convert backend TransactionItem to frontend Transaction
function toFrontendTx(item: TransactionItem): Transaction {
  const catId: CategoryId = CATEGORY_NAME_TO_ID[item.category] ?? "other"
  // Backend stores positive amounts with direction; frontend uses negative for expenses
  const displayAmount =
    item.direction === "expense" ? -item.amount :
    item.direction === "income"  ?  item.amount : 0
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
    } catch {
      // If backend is not available, silently fail (start with empty table)
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
          `文件解析成功，共 ${result.stats.total} 笔，待审查 ${result.stats.needs_review} 笔`,
          { duration: 3000 }
        )
      } catch (err: unknown) {
        setUploadStatus("idle")
        toast.error(`上传失败：${err instanceof Error ? err.message : "未知错误"}`)
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
      toast.success("分类已确认", { duration: 3000 })
    } catch (err: unknown) {
      toast.error(`确认失败：${err instanceof Error ? err.message : "未知错误"}`)
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
      toast.info(`分类已更新为: ${category?.emoji} ${category?.label}`, { duration: 3000 })
    } catch (err: unknown) {
      toast.error(`纠正失败：${err instanceof Error ? err.message : "未知错误"}`)
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
        <h1 className="text-xl font-bold text-slate-800">分类结果</h1>
        <p className="text-[13px] text-slate-500 mt-1">上传账单文件并查看自动分类结果</p>
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
            拖拽微信(.xlsx)或支付宝(.csv)账单文件到此处，或点击上传
          </span>
        </div>

        {/* Upload Status */}
        <div className="flex items-center gap-2 min-w-[180px] justify-center sm:justify-start">
          {uploadStatus === "idle" && (
            <span className="text-[13px] text-slate-400">未上传文件</span>
          )}
          {uploadStatus === "uploading" && (
            <div className="flex items-center gap-3 text-[#2563EB]">
              <UploadProgress />
              <span className="text-[13px]">上传中...</span>
            </div>
          )}
          {uploadStatus === "classifying" && (
            <div className="flex items-center gap-2 text-[#2563EB]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[13px]">正在解析...</span>
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
                  {file.type === "wechat" ? "微信" : "支付宝"} {file.count}笔
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
            <div className="text-[13px] text-slate-500">总交易笔数</div>
          </div>
          <div className="p-4 bg-[#16A34A]/5 rounded-xl border border-[#16A34A]/20">
            <div className="text-2xl font-bold text-[#16A34A]">{stats.autoClassified}</div>
            <div className="text-[13px] text-[#16A34A]/80">自动分类 ({stats.autoClassifiedPercent}%)</div>
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
            <div className="text-[13px] text-[#F59E0B]/80">待审查 (点击筛选)</div>
          </button>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-2xl font-bold text-slate-600">{stats.llmFallback}</div>
            <div className="text-[13px] text-slate-500">LLM回退 ({stats.llmFallbackPercent}%)</div>
          </div>
        </div>

        {/* 2B: Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
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
                {tab === "all" ? "全部" : tab === "review" ? "待审查" : "已审查"}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索商家..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-56 text-[13px]"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-[13px] shrink-0">
                  分类筛选
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
                    清除筛选
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
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 transition-colors text-[13px]"
                    onClick={() => toggleSort("date")}
                  >
                    <div className="flex items-center gap-1">
                      日期
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-[13px]">商家</TableHead>
                  <TableHead className="text-[13px]">描述</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 transition-colors text-[13px]"
                    onClick={() => toggleSort("amount")}
                  >
                    <div className="flex items-center gap-1">
                      金额
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-[13px]">分类</TableHead>
                  <TableHead className="text-[13px]">置信度</TableHead>
                  <TableHead className="text-[13px]">依据</TableHead>
                  <TableHead className="text-[13px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((tx) => {
                  const category = getCategory(tx.categoryId)
                  const rowBg = tx.needsReview && tx.status === "normal"
                    ? "bg-[#FFF7ED]"
                    : tx.status === "confirmed" || tx.status === "corrected"
                    ? "bg-[#F0FFF4]"
                    : "bg-white"

                  return (
                    <TableRow 
                      key={tx.id} 
                      className={cn(rowBg, "hover:opacity-80 transition-row-bg")}
                    >
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
                        {tx.needsReview && tx.status === "normal" ? (
                          <div className="flex items-center gap-1">
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
                          </div>
                        ) : tx.status === "confirmed" || tx.status === "corrected" ? (
                          <span className="text-xs text-[#16A34A]">已确认</span>
                        ) : null}
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
              第 {Math.min((currentPage - 1) * pageSize + 1, filteredTransactions.length)}-{Math.min(currentPage * pageSize, filteredTransactions.length)} 条，共 {filteredTransactions.length} 条
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
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="text-[13px]"
              >
                下一页
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
