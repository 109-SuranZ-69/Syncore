"use client"

import { useEffect, useMemo, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Moon, Sun, Car } from "lucide-react"
import { ConfigPanel } from "@/components/simulator/config-panel"
import { CabinView } from "@/components/simulator/cabin-view"
import { ResultPanel } from "@/components/simulator/result-panel"
import { type SimulatorConfig, getZoneOptions } from "@/components/simulator/types"

const DEFAULT_CONFIG: SimulatorConfig = {
  seatCount: 5,
  audioZone: 4,
  screens: {
    main: "center",
    copilot: true,
    rear: false,
    thirdRow: false,
  },
  headphones: {
    copilot: false,
    row2: false,
    row3: false,
  },
  mediaSources: {
    main: ["netease", "iqiyi"],
    copilot: ["bilibili"],
    rear: [],
  },
}

export default function Page() {
  const [config, setConfig] = useState<SimulatorConfig>(DEFAULT_CONFIG)
  const [command, setCommand] = useState("")
  const [activeZoneId, setActiveZoneId] = useState<string | null>("driver")
  const [speaking, setSpeaking] = useState(false)
  const [dark, setDark] = useState(false)

  // 切换深色模式
  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add("dark")
    else root.classList.remove("dark")
  }, [dark])

  // 当前车型 + 音区下的可选音区
  const zoneOptions = useMemo(
    () => getZoneOptions(config.seatCount, config.audioZone),
    [config.seatCount, config.audioZone],
  )

  // 当座位数 / 音区变化导致 activeZoneId 失效时，重置为第一个音区
  useEffect(() => {
    const exists = zoneOptions.some((z) => z.id === activeZoneId)
    if (!exists && zoneOptions.length > 0) {
      setActiveZoneId(zoneOptions[0].id)
    }
  }, [zoneOptions, activeZoneId])

  const handleTriggerSpeak = () => {
    if (!command || !activeZoneId) return
    setSpeaking(true)
    setTimeout(() => setSpeaking(false), 3000)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50/60 via-background to-background dark:from-sky-950/10 dark:via-background dark:to-background">
      {/* 顶部标题栏 */}
      <header className="relative overflow-hidden border-b border-border/60 bg-gradient-to-r from-sky-100 via-sky-50 to-white dark:from-sky-950/40 dark:via-background dark:to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.15),_transparent_60%)] pointer-events-none" />
        <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-lg shadow-sky-500/30">
              <Car className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-balance">
                智能座舱媒体语音交互规范可视化模拟器
              </h1>
              <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">
                多音区 · 多屏幕 · 多角色 仲裁路径可视化
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 backdrop-blur px-3 py-1.5 shadow-sm">
            <Sun className={`h-4 w-4 transition-colors ${dark ? "text-muted-foreground" : "text-amber-500"}`} />
            <Switch
              id="dark-mode"
              checked={dark}
              onCheckedChange={setDark}
              aria-label="切换深色模式"
            />
            <Moon className={`h-4 w-4 transition-colors ${dark ? "text-sky-400" : "text-muted-foreground"}`} />
            <Label htmlFor="dark-mode" className="sr-only">
              切换到深色模式
            </Label>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        {/* 配置面板：自适应网格，最多每排 4 张卡片 */}
        <ConfigPanel config={config} onChange={setConfig} />

        {/* 下方区域：车舱视图 50% / 模拟交互 50%，高度一致 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-stretch">
          <CabinView config={config} activeZoneId={activeZoneId} speaking={speaking} />
          <ResultPanel
            config={config}
            command={command}
            onCommandChange={setCommand}
            activeZoneId={activeZoneId}
            onZoneChange={setActiveZoneId}
            speaking={speaking}
            onTriggerSpeak={handleTriggerSpeak}
          />
        </div>
      </div>
    </main>
  )
}
