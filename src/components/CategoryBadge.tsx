import {
  ActivityIcon,
  AsteriskIcon,
  CompassIcon,
  EyeIcon,
  GitBranchIcon,
  HistoryIcon,
  ListFilterIcon,
  PackageIcon,
  SearchIcon,
  ShieldCheckIcon,
  SnowflakeIcon,
  TagIcon,
  TerminalIcon,
  WifiIcon,
  WorkflowIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const categoryIcons: Record<string, LucideIcon> = {
  all: TagIcon,
  navigation: CompassIcon,
  git: GitBranchIcon,
  search: SearchIcon,
  utility: WrenchIcon,
  packages: PackageIcon,
  pipe: WorkflowIcon,
  globbing: AsteriskIcon,
  history: HistoryIcon,
  fzf: ListFilterIcon,
  nix: SnowflakeIcon,
  shell: TerminalIcon,
  network: WifiIcon,
  process: ActivityIcon,
  safety: ShieldCheckIcon,
  viewing: EyeIcon,
  files: EyeIcon,
  system: TerminalIcon,
  security: ShieldCheckIcon,
  meta: WorkflowIcon,
}

const categoryStyles: Record<string, string> = {
  navigation: "border-category-navigation/30 bg-category-navigation/10 text-category-navigation",
  git: "border-category-git/30 bg-category-git/10 text-category-git",
  search: "border-category-search/30 bg-category-search/10 text-category-search",
  utility: "border-category-utility/30 bg-category-utility/10 text-category-utility",
  packages: "border-category-packages/30 bg-category-packages/10 text-category-packages",
  pipe: "border-category-pipe/30 bg-category-pipe/10 text-category-pipe",
  globbing: "border-category-globbing/30 bg-category-globbing/10 text-category-globbing",
  history: "border-category-history/30 bg-category-history/10 text-category-history",
  fzf: "border-category-fzf/30 bg-category-fzf/10 text-category-fzf",
  nix: "border-category-nix/30 bg-category-nix/10 text-category-nix",
  shell: "border-category-shell/30 bg-category-shell/10 text-category-shell",
  network: "border-category-network/30 bg-category-network/10 text-category-network",
  process: "border-category-process/30 bg-category-process/10 text-category-process",
  safety: "border-category-safety/30 bg-category-safety/10 text-category-safety",
  viewing: "border-category-viewing/30 bg-category-viewing/10 text-category-viewing",
  files: "border-category-viewing/30 bg-category-viewing/10 text-category-viewing",
  system: "border-category-network/30 bg-category-network/10 text-category-network",
  security: "border-category-safety/30 bg-category-safety/10 text-category-safety",
  meta: "border-category-pipe/30 bg-category-pipe/10 text-category-pipe",
}

const categoryLabels: Record<string, string> = {
  navigation: "Navigation",
  git: "Git",
  search: "Search & Process",
  utility: "Utility",
  packages: "Package Updates",
  pipe: "Pipe Aliases",
  globbing: "Globbing",
  history: "History",
  fzf: "FZF & Zoxide",
  nix: "Nix",
  shell: "Shell Behavior",
  network: "Network",
  process: "Process",
  safety: "Safety",
  viewing: "Viewing",
  files: "Files",
  system: "System",
  security: "Security",
  meta: "Meta",
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function CategoryIcon({
  category,
  className,
  "data-icon": dataIcon,
}: {
  category: string
  className?: string
  "data-icon"?: "inline-start" | "inline-end"
}) {
  const Icon = categoryIcons[category] ?? TagIcon

  return <Icon className={className} data-icon={dataIcon} aria-hidden="true" />
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

export { categoryLabels }
