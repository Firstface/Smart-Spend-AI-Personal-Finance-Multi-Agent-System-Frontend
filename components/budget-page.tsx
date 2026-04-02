"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PiggyBank } from "lucide-react"

export function BudgetPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-800">预算规划</h1>
        <p className="text-[13px] text-slate-500 mt-1">制定和跟踪你的预算目标</p>
      </div>

      <Card className="border-slate-200 rounded-2xl shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
              <PiggyBank className="w-4 h-4 text-[#F59E0B]" />
            </div>
            预算计划
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-slate-400 bg-[#F5F7FA] rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-[13px]">预算规划内容将在这里显示</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
