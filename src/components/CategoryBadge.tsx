import { TagIcon, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { categoryIcons, categoryLabels, categoryStyles } from "@/lib/categories"
import { formatLabel } from "@/lib/shell-docs"
import { cn } from "@/lib/utils"

export function CategoryIcon({
  category,
  className,
  "data-icon": dataIcon,
  "data-tip-category-icon": dataTipCategoryIcon,
}: {
  category: string
  className?: string
  "data-icon"?: "inline-start" | "inline-end"
  "data-tip-category-icon"?: string
}) {
  const Icon: LucideIcon = (categoryIcons[category] as LucideIcon | undefined) ?? TagIcon

  return (
    <Icon
      className={className}
      data-icon={dataIcon}
      data-tip-category-icon={dataTipCategoryIcon}
      aria-hidden="true"
    />
  )
}

export function CategoryBadge({
  category,
  label,
  className,
}: {
  category: string
  label?: string
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      data-category={category}
      className={cn(categoryStyles[category], className)}
    >
      <CategoryIcon category={category} data-icon="inline-start" />
      {label ?? categoryLabels[category] ?? formatLabel(category)}
    </Badge>
  )
}
