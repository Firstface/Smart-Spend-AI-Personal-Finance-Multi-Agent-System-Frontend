"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export function InsightsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-800">月度概览</h1>
        <p className="text-[13px] text-slate-500 mt-1">分析你的每月财务状况</p>
      </div>

      <Card className="border-slate-200 rounded-2xl shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="w-8 h-8 rounded-lg bg-[#16A34A]/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[#16A34A]" />
            </div>
            月度分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-slate-400 bg-[#F5F7FA] rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-[13px]">月度概览内容将在这里显示</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
