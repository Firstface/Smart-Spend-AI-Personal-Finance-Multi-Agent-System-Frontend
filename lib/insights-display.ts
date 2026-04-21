import type {
  InsightsResult,
  SpendingRecommendation,
  SubscriptionItem,
  SpendingTrend,
} from "@/lib/api"

function containsChinese(value: string | undefined | null) {
  return Boolean(value && /[\u4e00-\u9fff]/.test(value))
}

function formatCurrencyInText(value: string) {
  return value.replace(/(\d+(?:\.\d+)?)元/g, (_, amount) => `¥${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`)
}

export function translateInsightsReply(reply: string) {
  if (!containsChinese(reply)) return reply

  if (reply.includes("分析") || reply.includes("支出") || reply.includes("洞察")) {
    return "I reviewed your recent spending and generated the latest financial insights below."
  }

  return formatCurrencyInText(reply)
}

export function translateSeasonalPattern(pattern: string | undefined) {
  if (!pattern) return "N/A"

  const map: Record<string, string> = {
    "无明显模式": "No clear pattern",
    "每月": "Monthly",
    "每周": "Weekly",
    "每年": "Yearly",
  }

  return map[pattern] ?? pattern
}

export function translateChargeFrequency(frequency: string | undefined) {
  if (!frequency) return "Unknown frequency"

  const map: Record<string, string> = {
    "每月": "Monthly",
    "每周": "Weekly",
    "每年": "Yearly",
    "每日": "Daily",
  }

  return map[frequency] ?? frequency
}

function translateRecommendationType(type: string) {
  const map: Record<string, string> = {
    "总支出控制": "Overall spending control",
    "类别控制": "Category control",
    "订阅管理": "Subscription management",
    "异常支出": "Unusual spending",
  }

  return map[type] ?? type
}

function translateRecommendationTitle(title: string) {
  if (title === "减少总支出") return "Reduce total spending"
  if (title === "优化订阅服务") return "Optimize subscriptions"
  if (title === "关注异常支出") return "Review unusual spending"

  const categoryMatch = title.match(/^减少(.+)支出$/)
  if (categoryMatch) {
    return `Reduce ${categoryMatch[1]} spending`
  }

  return title
}

function translateRecommendationDescription(description: string) {
  if (!containsChinese(description)) return description

  let result = description

  result = result.replace(
    /您的月均支出为(\d+(?:\.\d+)?)元，建议适当控制总支出。/,
    (_, amount) => `Your average monthly spending is ¥${Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}. Consider reducing your overall spending.`
  )

  result = result.replace(
    /(.+)占您总支出的(\d+(?:\.\d+)?)%，建议适当控制该类别的支出。/,
    (_, category, percentage) => `${category} accounts for ${percentage}% of your total spending. Consider reducing spending in this category.`
  )

  result = result.replace(
    /检测到(\d+)笔异常支出，建议关注这些交易。/,
    (_, count) => `${count} unusual transactions were detected. Review these expenses carefully.`
  )

  result = result.replace(
    /您订阅了多个服务，建议检查是否有不必要的订阅。/,
    "You have multiple subscriptions. Consider reviewing whether all of them are still necessary."
  )

  return formatCurrencyInText(result)
}

function translateRecommendation(item: SpendingRecommendation): SpendingRecommendation {
  return {
    ...item,
    type: translateRecommendationType(item.type),
    title: translateRecommendationTitle(item.title),
    description: translateRecommendationDescription(item.description),
  }
}

function translateSubscriptionItem(item: SubscriptionItem): SubscriptionItem {
  return {
    ...item,
    charge_frequency: translateChargeFrequency(item.charge_frequency),
  }
}

function translateTrend(item: SpendingTrend): SpendingTrend {
  return {
    ...item,
    seasonal_pattern: translateSeasonalPattern(item.seasonal_pattern),
  }
}

export function translateInsightsResult(insights: InsightsResult): InsightsResult {
  return {
    ...insights,
    spending_trends: insights.spending_trends.map(translateTrend),
    subscriptions: {
      ...insights.subscriptions,
      subscriptions: insights.subscriptions.subscriptions.map(translateSubscriptionItem),
    },
    recommendations: insights.recommendations.map(translateRecommendation),
  }
}
