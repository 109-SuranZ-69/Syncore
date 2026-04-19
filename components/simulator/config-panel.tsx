"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Monitor, Headphones, ChevronDown } from "lucide-react"
import {
  type SimulatorConfig,
  type SeatCount,
  type AudioZone,
  type ScreenConfig,
  type AppId,
  type MediaSourceConfig,
  VALID_AUDIO_ZONES,
  CAR_MODEL_PRESETS,
  matchCarPreset,
} from "./types"
import { MediaSourceCard } from "./media-source-card"
import { cn } from "@/lib/utils"

interface ConfigPanelProps {
  config: SimulatorConfig
  onChange: (config: SimulatorConfig) => void
}

export function ConfigPanel({ config, onChange }: ConfigPanelProps) {
  // 各卡片展开状态
  const [carOpen, setCarOpen] = useState(true)
  const [screenOpen, setScreenOpen] = useState(true)
  const [headphoneOpen, setHeadphoneOpen] = useState(true)

  // 座位数变化时，如果当前音区不合理，自动切换为该车型的第一个合理音区
  const handleSeatCountChange = (value: string) => {
    const newSeatCount = Number(value) as SeatCount
    const validZones = VALID_AUDIO_ZONES[newSeatCount]
    const nextZone: AudioZone = validZones.includes(config.audioZone) ? config.audioZone : validZones[0]
    onChange({ ...config, seatCount: newSeatCount, audioZone: nextZone })
  }

  const handleAudioZoneChange = (value: string) => {
    onChange({ ...config, audioZone: Number(value) as AudioZone })
  }

  // 当前匹配的车型预设
  const matchedPreset = matchCarPreset(config.screens)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* 车型配置（可收起） */}
      <Card className="w-full flex flex-col p-5 gap-3 bg-card border-border/60 shadow-sm rounded-2xl">
        <button
          type="button"
          onClick={() => setCarOpen((v) => !v)}
          aria-expanded={carOpen}
          className="flex items-center justify-between gap-2 text-left -mx-1 px-1 py-0.5 rounded-lg transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300">
              <Users className="h-4 w-4" />
            </div>
            <span>车型配置</span>
          </div>
          <div className="flex items-center gap-2">
            {!carOpen && (
              <span className="text-xs text-muted-foreground">
                {config.seatCount === 5 ? "五座" : config.seatCount === 6 ? "六座" : "七座"} · {config.audioZone}音区
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                carOpen ? "rotate-0" : "-rotate-90",
              )}
            />
          </div>
        </button>

        <div
          className={cn(
            "flex flex-col gap-4 overflow-hidden transition-all duration-200",
            carOpen ? "opacity-100" : "hidden opacity-0",
          )}
        >
          {/* 座位数 */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">座位数</Label>
            <RadioGroup
              value={String(config.seatCount)}
              onValueChange={handleSeatCountChange}
              className="grid grid-cols-3 gap-2"
            >
              {[5, 6, 7].map((n) => (
                <Label
                  key={n}
                  htmlFor={`seat-${n}`}
                  className={cn(
                    "flex cursor-pointer items-center justify-center rounded-xl border border-border/60 px-2 py-2 text-sm transition-colors",
                    "hover:bg-sky-50 dark:hover:bg-sky-950/40",
                    config.seatCount === n && "border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-200",
                  )}
                >
                  <RadioGroupItem value={String(n)} id={`seat-${n}`} className="sr-only" />
                  {n === 5 ? "五座" : n === 6 ? "六座" : "七座"}
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* 音区数 */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">音区数</Label>
            <RadioGroup
              value={String(config.audioZone)}
              onValueChange={handleAudioZoneChange}
              className="grid grid-cols-3 gap-2"
            >
              {([2, 4, 6] as AudioZone[]).map((n) => {
                const valid = VALID_AUDIO_ZONES[config.seatCount].includes(n)
                return (
                  <Label
                    key={n}
                    htmlFor={`zone-${n}`}
                    className={cn(
                      "flex cursor-pointer items-center justify-center rounded-xl border border-border/60 px-2 py-2 text-sm transition-colors",
                      valid ? "hover:bg-emerald-50 dark:hover:bg-emerald-950/40" : "cursor-not-allowed opacity-40",
                      config.audioZone === n &&
                        valid &&
                        "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200",
                    )}
                  >
                    <RadioGroupItem value={String(n)} id={`zone-${n}`} className="sr-only" disabled={!valid} />
                    {n}音区
                  </Label>
                )
              })}
            </RadioGroup>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {config.seatCount === 5 && "五座车支持双音区 / 四音区"}
              {config.seatCount === 6 && "六座车支持四音区 / 六音区"}
              {config.seatCount === 7 && "七座车支持四音区 / 六音区"}
            </p>
          </div>
        </div>
      </Card>

      {/* 屏幕配置（可收起） */}
      <Card className="w-full flex flex-col p-5 gap-3 bg-card border-border/60 shadow-sm rounded-2xl">
        <button
          type="button"
          onClick={() => setScreenOpen((v) => !v)}
          aria-expanded={screenOpen}
          className="flex items-center justify-between gap-2 text-left -mx-1 px-1 py-0.5 rounded-lg transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
              <Monitor className="h-4 w-4" />
            </div>
            <span>屏幕配置</span>
          </div>
          <div className="flex items-center gap-2">
            {/* 收起时显示当前车型型号 */}
            {!screenOpen && matchedPreset && (
              <span className="text-xs text-muted-foreground">{matchedPreset.label}</span>
            )}
            {!screenOpen && !matchedPreset && (
              <span className="text-xs text-muted-foreground">自定义</span>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                screenOpen ? "rotate-0" : "-rotate-90",
              )}
            />
          </div>
        </button>

        <div
          className={cn(
            "flex flex-col gap-3 overflow-hidden transition-all duration-200",
            screenOpen ? "opacity-100" : "hidden opacity-0",
          )}
        >
          {/* 车型代号预设下拉 */}
          <Select
            value={matchedPreset?.id ?? "__custom__"}
            onValueChange={(v) => {
              if (v === "__custom__") return
              const preset = CAR_MODEL_PRESETS.find((p) => p.id === v)
              if (!preset) return
              onChange({ ...config, screens: { ...preset.screens } })
            }}
          >
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue placeholder="选择车型代号" />
            </SelectTrigger>
            <SelectContent>
              {CAR_MODEL_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
              <SelectItem value="__custom__" disabled>
                自定义
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="flex flex-col gap-2 pt-1">
            {/* 中控屏开关 */}
            <div className="flex items-center justify-between">
              <Label htmlFor="center-screen" className="text-sm text-foreground/80">
                中控屏
              </Label>
              <Switch
                id="center-screen"
                checked={config.screens.main === "center"}
                onCheckedChange={(v) => {
                  const next: ScreenConfig = v
                    ? { ...config.screens, main: "center" }
                    : { ...config.screens, main: "unified", copilot: false }
                  onChange({ ...config, screens: next })
                }}
              />
            </div>

            {/* 一体屏开关 */}
            <div className="flex items-center justify-between">
              <Label htmlFor="unified-screen" className="text-sm text-foreground/80">
                一体屏
                <span className="ml-1 text-[10px] text-muted-foreground">（横贯主副驾）</span>
              </Label>
              <Switch
                id="unified-screen"
                checked={config.screens.main === "unified"}
                onCheckedChange={(v) => {
                  const next: ScreenConfig = v
                    ? { ...config.screens, main: "unified", copilot: false }
                    : { ...config.screens, main: "center" }
                  onChange({ ...config, screens: next })
                }}
              />
            </div>

            {/* 副驾屏开关 */}
            <div className="flex items-center justify-between">
              <Label
                htmlFor="copilot-screen"
                className={cn(
                  "text-sm text-foreground/80",
                  config.screens.main === "unified" && "text-muted-foreground",
                )}
              >
                副驾屏
                {config.screens.main === "unified" && (
                  <span className="ml-1 text-[10px] text-muted-foreground">（与一体屏互斥）</span>
                )}
              </Label>
              <Switch
                id="copilot-screen"
                checked={config.screens.copilot}
                disabled={config.screens.main === "unified"}
                onCheckedChange={(v) => {
                  const nextHeadphones =
                    !v && config.screens.main === "center"
                      ? { ...config.headphones, copilot: false }
                      : config.headphones
                  onChange({
                    ...config,
                    screens: { ...config.screens, copilot: v },
                    headphones: nextHeadphones,
                  })
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="rear-screen" className="text-sm text-foreground/80">
                二排吸顶屏
              </Label>
              <Switch
                id="rear-screen"
                checked={config.screens.rear}
                onCheckedChange={(v) => {
                  const nextHeadphones = !v
                    ? { ...config.headphones, row2: false }
                    : config.headphones
                  onChange({
                    ...config,
                    screens: { ...config.screens, rear: v },
                    headphones: nextHeadphones,
                  })
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="third-row-screen" className="text-sm text-foreground/80">
                三排吸顶屏
              </Label>
              <Switch
                id="third-row-screen"
                checked={config.screens.thirdRow}
                disabled={config.seatCount === 5}
                onCheckedChange={(v) => {
                  const nextHeadphones = !v
                    ? { ...config.headphones, row3: false }
                    : config.headphones
                  onChange({
                    ...config,
                    screens: { ...config.screens, thirdRow: v },
                    headphones: nextHeadphones,
                  })
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 耳机模式（可收起） */}
      <Card className="w-full flex flex-col p-5 gap-3 bg-card border-border/60 shadow-sm rounded-2xl">
        <button
          type="button"
          onClick={() => setHeadphoneOpen((v) => !v)}
          aria-expanded={headphoneOpen}
          className="flex items-center justify-between gap-2 text-left -mx-1 px-1 py-0.5 rounded-lg transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300">
              <Headphones className="h-4 w-4" />
            </div>
            <span>耳机模式</span>
          </div>
          <div className="flex items-center gap-2">
            {!headphoneOpen && (
              <span className="text-xs text-muted-foreground">
                {[
                  config.headphones.copilot && "副驾",
                  config.headphones.row2 && "二排",
                  config.headphones.row3 && "三排",
                ]
                  .filter(Boolean)
                  .join(" / ") || "无"}
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                headphoneOpen ? "rotate-0" : "-rotate-90",
              )}
            />
          </div>
        </button>

        <div
          className={cn(
            "flex flex-col gap-2 pt-1 overflow-hidden transition-all duration-200",
            headphoneOpen ? "opacity-100" : "hidden opacity-0",
          )}
        >
          {/* 副驾耳机：需要副驾屏或一体屏 */}
          {(() => {
            const hasCopilotScreen = config.screens.copilot || config.screens.main === "unified"
            return (
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="headphone-copilot"
                  className={cn(
                    "text-sm text-foreground/80",
                    !hasCopilotScreen && "text-muted-foreground",
                  )}
                >
                  副驾耳机模式
                  {!hasCopilotScreen && (
                    <span className="ml-1 text-[10px] text-muted-foreground">（需副驾屏 / 一体屏）</span>
                  )}
                </Label>
                <Switch
                  id="headphone-copilot"
                  checked={config.headphones.copilot}
                  disabled={!hasCopilotScreen}
                  onCheckedChange={(v) =>
                    onChange({ ...config, headphones: { ...config.headphones, copilot: v } })
                  }
                />
              </div>
            )
          })()}

          {/* 二排耳机：需要二排吸顶屏 */}
          <div className="flex items-center justify-between">
            <Label
              htmlFor="headphone-row2"
              className={cn(
                "text-sm text-foreground/80",
                !config.screens.rear && "text-muted-foreground",
              )}
            >
              二排耳机模式
              {!config.screens.rear && (
                <span className="ml-1 text-[10px] text-muted-foreground">（需二排吸顶屏）</span>
              )}
            </Label>
            <Switch
              id="headphone-row2"
              checked={config.headphones.row2}
              disabled={!config.screens.rear}
              onCheckedChange={(v) =>
                onChange({ ...config, headphones: { ...config.headphones, row2: v } })
              }
            />
          </div>

          {/* 三排耳机：需要三排吸顶屏 */}
          <div className="flex items-center justify-between">
            <Label
              htmlFor="headphone-row3"
              className={cn(
                "text-sm text-foreground/80",
                !config.screens.thirdRow && "text-muted-foreground",
              )}
            >
              三排耳机模式
              {!config.screens.thirdRow && (
                <span className="ml-1 text-[10px] text-muted-foreground">（需三排吸顶屏）</span>
              )}
            </Label>
            <Switch
              id="headphone-row3"
              checked={config.headphones.row3}
              disabled={!config.screens.thirdRow}
              onCheckedChange={(v) =>
                onChange({ ...config, headphones: { ...config.headphones, row3: v } })
              }
            />
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed pt-1">耳机模式下，对应音区独立输出</p>
        </div>
      </Card>

      {/* 信源配置（按屏幕维度） */}
      {(() => {
        const mediaSources: MediaSourceConfig =
          config.mediaSources ?? { main: [], copilot: [], rear: [] }
        const updateMedia = (key: keyof MediaSourceConfig, next: AppId[]) => {
          onChange({
            ...config,
            mediaSources: { ...mediaSources, [key]: next },
          })
        }
        const mainEnabled = true
        const mainTitle = config.screens.main === "unified" ? "一体屏 信源" : "中控屏 信源"
        const copilotEnabled = config.screens.copilot
        const rearEnabled = config.screens.rear
        return (
          <>
            <MediaSourceCard
              title={mainTitle}
              subtitle="主屏可用信源"
              enabled={mainEnabled}
              selected={mediaSources.main}
              onChange={(next) => updateMedia("main", next)}
              defaultOpen
            />
            <MediaSourceCard
              title="副驾屏 信源"
              subtitle={copilotEnabled ? "副驾屏可用信源" : undefined}
              enabled={copilotEnabled}
              disabledHint="需先开启副驾屏"
              selected={mediaSources.copilot}
              onChange={(next) => updateMedia("copilot", next)}
            />
            <MediaSourceCard
              title="后排屏 信源"
              subtitle={rearEnabled ? "二排吸顶屏可用信源" : undefined}
              enabled={rearEnabled}
              disabledHint="需先开启二排吸顶屏"
              selected={mediaSources.rear}
              onChange={(next) => updateMedia("rear", next)}
            />
          </>
        )
      })()}
    </div>
  )
}
