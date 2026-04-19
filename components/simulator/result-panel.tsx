"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Mic, Sparkles, ArrowRight, ChevronDown } from "lucide-react"
import { type SimulatorConfig, getZoneOptions } from "./types"
import { cn } from "@/lib/utils"

interface ResultPanelProps {
  config: SimulatorConfig
  command: string
  onCommandChange: (v: string) => void
  activeZoneId: string | null
  onZoneChange: (zoneId: string) => void
  speaking: boolean
  onTriggerSpeak: () => void
}

const EXAMPLE_COMMANDS = [
  "打开音乐",
  "播放陈奕迅的歌",
  "打开音乐播放列表",
  "打开歌词",
  "快进",
  "音量调大一点",
]

export function ResultPanel({
  config,
  command,
  onCommandChange,
  activeZoneId,
  onZoneChange,
  speaking,
  onTriggerSpeak,
}: ResultPanelProps) {
  const zones = getZoneOptions(config.seatCount, config.audioZone)
  const [stepsOpen, setStepsOpen] = useState(true)

  // 模拟决策路径（仅占位 UI）
  const steps = [
    { label: "语义理解", detail: command ? `解析："${command}"` : "等待指令输入", done: !!command },
    {
      label: "多屏仲裁",
      detail: activeZoneId ? "根据说话音区筛选候选屏" : "待定",
      done: !!activeZoneId && !!command,
    },
    {
      label: "功能逻辑",
      detail: speaking ? "应用媒体场景规则" : "未触发",
      done: speaking,
    },
    {
      label: "最终响应",
      detail: speaking ? "响应屏幕已锁定" : "—",
      done: speaking,
    },
  ]

  return (
    <Card className="flex flex-col gap-4 h-full p-5 bg-card border-border/60 shadow-sm rounded-2xl">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300">
          <Sparkles className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold">模拟交互</h3>
      </div>

      {/* 语音输入 + 说话所在音区（同一排） */}
      <div className="flex flex-col gap-3 md:flex-row md:gap-4">
        {/* 左侧：语音输入 */}
        <div className="flex flex-col gap-2 md:flex-1 md:min-w-0">
          <Label htmlFor="voice-input" className="text-xs text-muted-foreground">
            试说一句语音
          </Label>
          <div className="flex gap-2">
            <Input
              id="voice-input"
              placeholder="如：播放陈奕迅的歌"
              value={command}
              onChange={(e) => onCommandChange(e.target.value)}
              className="rounded-xl"
            />
            <Button
              size="icon"
              onClick={onTriggerSpeak}
              className={cn(
                "rounded-xl shrink-0 bg-sky-500 hover:bg-sky-600 text-white",
                speaking && "animate-pulse ring-4 ring-sky-200 dark:ring-sky-900",
              )}
              aria-label="触发语音"
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>

          {/* 波形动画 */}
          <div className="flex h-10 items-end justify-center gap-1 rounded-xl bg-sky-50/80 dark:bg-sky-950/30 px-3 py-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "w-1 rounded-full bg-sky-400 dark:bg-sky-500",
                  speaking ? "animate-[wave_1s_ease-in-out_infinite]" : "h-1",
                )}
                style={
                  speaking
                    ? {
                      animationDelay: `${(i % 12) * 60}ms`,
                      height: `${20 + Math.sin(i) * 10 + (i % 5) * 4}%`,
                    }
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {/* 右侧：说话所在音区（按音区布局而非座位数） */}
        <div className="flex flex-col gap-2 md:w-[200px] md:shrink-0">
          <Label className="text-xs text-muted-foreground">说话所在音区</Label>
          <Select value={activeZoneId ?? undefined} onValueChange={(v) => onZoneChange(v)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="选择说话音区" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            共 {zones.length} 个音区 · {config.seatCount} 座车型
          </p>
        </div>
      </div>

      {/* 示例指令 */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">示例说法</Label>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => onCommandChange(cmd)}
              className={cn(
                "rounded-full border border-border/60 px-3 py-1 text-xs transition-colors",
                "hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700",
                "dark:hover:border-sky-700 dark:hover:bg-sky-950/40 dark:hover:text-sky-200",
                command === cmd && "border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-200",
              )}
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* 决策路径（可收起 / 展开） */}
      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={() => setStepsOpen((v) => !v)}
          aria-expanded={stepsOpen}
          aria-controls="decision-steps"
          className="flex items-center justify-between gap-2 rounded-lg -mx-1 px-1 py-1 text-left transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center gap-2">
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                stepsOpen ? "rotate-0" : "-rotate-90",
              )}
            />
            <Label className="text-xs text-muted-foreground cursor-pointer">决策路径</Label>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] rounded-full",
              speaking ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300" : "text-muted-foreground",
            )}
          >
            {speaking ? "运行中" : "待机"}
          </Badge>
        </button>

        <ol
          id="decision-steps"
          className={cn(
            "flex flex-col gap-2 overflow-hidden transition-all duration-200",
            stepsOpen ? "opacity-100" : "hidden opacity-0",
          )}
        >
          {steps.map((step, i) => (
            <li
              key={i}
              className={cn(
                "relative flex items-start gap-3 rounded-xl border border-border/60 p-3 transition-colors",
                step.done
                  ? "border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/30"
                  : "bg-muted/30",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  step.done
                    ? "bg-sky-500 text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  {step.label}
                  {i < steps.length - 1 && step.done && (
                    <ArrowRight className="h-3 w-3 text-sky-400" />
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 break-words">
                  {step.detail}
                </div>
                {/* 进度条 */}
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-sky-100 dark:bg-sky-950/60">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      step.done ? "bg-sky-500 w-full" : "bg-sky-300 w-0",
                    )}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </Card>
  )
}
