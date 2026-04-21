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
  if (title === "优化日常开支，减少不必要的支出") return "Optimize daily expenses"
  if (title === "增加收入来源以提升财务状况") return "Increase income sources"
  if (title === "建立紧急备用金，应对突发情况") return "Build an emergency fund"

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

  result = result.replace(
    /根据您的月度财务摘要和最近的交易记录，您在住房、交通、教育、食品与餐饮以及医疗方面的支出较大。您可以考虑以下建议：1\. 降低订阅服务费用：如Netflix、Spotify等；2\. 调整日常开销，如减少外卖、咖啡消费等。3\. 减少不必要的医疗服务和药品费用。/,
    "Based on your monthly financial summary and recent transactions, your spending is relatively high in housing, transportation, education, food and dining, and healthcare. Consider lowering subscription costs such as Netflix and Spotify, trimming everyday spending like takeout and coffee, and reducing non-essential medical and pharmacy expenses."
  )

  result = result.replace(
    /考虑到您的支出模式，您可能需要考虑如何增加收入。建议如下：1\. 申请兼职工作或自由职业；2\. 提高现有工作的薪资水平；3\. 开展副业或者投资。/,
    "Based on your spending pattern, consider expanding your income sources. You could look for part-time or freelance work, negotiate a higher salary in your current role, or build a side business or investment plan."
  )

  result = result.replace(
    /鉴于您的食品与餐饮、交通和医疗支出较大，建议您考虑增加紧急备用金以应对突发事件。这将有助于确保在其他必要支出发生时能够迅速应对。/,
    "Because your spending on food and dining, transportation, and healthcare is relatively high, consider building a larger emergency fund to handle unexpected events and required future expenses more comfortably."
  )

  result = formatCurrencyInText(result)

  if (containsChinese(result)) {
    return "Review this recommendation and adjust your spending plan based on the latest insight."
  }

  return result
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
