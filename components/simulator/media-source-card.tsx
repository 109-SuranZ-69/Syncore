"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Music, Headphones, Radio, Play, Tv, Mic, Cable, ChevronDown } from "lucide-react"
import {
  type AppId,
  type AppIconKey,
  APPS_META,
  BUSINESS_CATEGORIES,
} from "./types"
import { cn } from "@/lib/utils"

interface MediaSourceCardProps {
  title: string
  subtitle?: string
  enabled: boolean
  disabledHint?: string
  selected: AppId[]
  onChange: (next: AppId[]) => void
  defaultOpen?: boolean
}

const ICON_MAP: Record<AppIconKey, React.ComponentType<{ className?: string }>> = {
  music: Music,
  headphones: Headphones,
  radio: Radio,
  play: Play,
  tv: Tv,
  mic: Mic,
}

function AppLogoButton({
  appId,
  selected,
  disabled,
  onToggle,
}: {
  appId: AppId
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const app = APPS_META[appId]
  const Icon = ICON_MAP[app.iconKey]
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${selected ? "取消选择" : "选择"} ${app.name}`}
      title={app.name}
      className={cn(
        "group relative flex flex-col items-center gap-1 rounded-xl p-1 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        !disabled && !selected && "opacity-45 hover:opacity-75",
      )}
    >
      <div
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-xl shadow-sm transition-all",
          selected ? "scale-100" : "scale-95 bg-muted",
        )}
        style={selected ? { backgroundColor: app.color } : undefined}
      >
        <Icon className={cn("h-4 w-4", selected ? "text-white" : "text-muted-foreground")} />
        {/* 右上角品牌简写标签 */}
        <span
          className={cn(
            "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-bold leading-none shadow",
            selected ? "bg-white" : "bg-background text-muted-foreground",
          )}
          style={selected ? { color: app.color } : undefined}
        >
          {app.short}
        </span>
      </div>
      <span
        className={cn(
          "text-[10px] leading-tight text-center",
          selected ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {app.name}
      </span>
    </button>
  )
}

export function MediaSourceCard({
  title,
  subtitle,
  enabled,
  disabledHint,
  selected,
  onChange,
  defaultOpen = false,
}: MediaSourceCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  const toggle = (appId: AppId) => {
    if (!enabled) return
    if (selected.includes(appId)) {
      onChange(selected.filter((id) => id !== appId))
    } else {
      onChange([...selected, appId])
    }
  }

  const totalSelected = selected.length
  const isMulti = totalSelected > 1

  return (
    <Card
      className={cn(
        "w-full flex flex-col p-5 gap-3 bg-card border-border/60 shadow-sm rounded-2xl transition-opacity",
        !enabled && "opacity-60",
      )}
    >
      {/* 可点击的标题栏 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 text-left -mx-1 px-1 py-0.5 rounded-lg transition-colors hover:bg-muted/40"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg",
              enabled
                ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Cable className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span>{title}</span>
            {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {enabled && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px]",
                isMulti
                  ? "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isMulti ? `多信源 · ${totalSelected}` : `${totalSelected} 已选`}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
        </div>
      </button>

      {!enabled && disabledHint && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{disabledHint}</p>
      )}

      {/* 分类 × 应用（可折叠） */}
      <div
        className={cn(
          "flex flex-col gap-2.5 overflow-hidden transition-all duration-200",
          open ? "opacity-100" : "hidden opacity-0",
          !enabled && "pointer-events-none",
        )}
      >
        {BUSINESS_CATEGORIES.map((biz) => (
          <div
            key={biz.id}
            className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-b-0 last:pb-0"
          >
            <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{biz.label}</span>
            <div className="flex flex-wrap items-start justify-end gap-1.5">
              {biz.apps.map((appId) => (
                <AppLogoButton
                  key={`${biz.id}-${appId}`}
                  appId={appId}
                  selected={selected.includes(appId)}
                  disabled={!enabled}
                  onToggle={() => toggle(appId)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
