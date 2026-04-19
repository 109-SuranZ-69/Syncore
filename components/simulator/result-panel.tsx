"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Mic, Sparkles, ArrowRight, ChevronDown, CheckCircle2, XCircle, AlertCircle, Volume2, Play, Pause, Music } from "lucide-react"
import { type SimulatorConfig, getZoneOptions } from "./types"
import { cn } from "@/lib/utils"
import {
  type SingleSourceArbitrationResult,
  type SingleSourceEndpointState,
  type ArbitrationStep,
  type EndpointStatus,
  arbitrateSingleScreenSingleSource,
  createDefaultEndpointState,
  createPlayingEndpointState
} from "@/lib/singleScreenSingleSourceArbitrator"

interface ResultPanelProps {
  config: SimulatorConfig
  command: string
  onCommandChange: (v: string) => void
  activeZoneId: string | null
  onZoneChange: (zoneId: string) => void
  speaking: boolean
  onTriggerSpeak: () => void
}

/**
 * 示例语音指令
 * 【文档对应】根据《3.0平台-语音音乐语义清单-V3.6.xlsx》中的说法模板
 */
const EXAMPLE_COMMANDS = [
  // 打开/关闭类
  "打开音乐",
  "关闭音乐",
  "返回播放界面",
  // 播放控制类
  "播放音乐",
  "播放陈奕迅的歌",
  "暂停",
  "继续播放",
  "下一首",
  "上一首",
  // 播放列表类
  "打开播放列表",
  "关闭播放列表",
  // 收藏类
  "收藏",
  "取消收藏",
  // 模式类
  "单曲循环",
  "随机播放",
  // 查询类
  "这是什么歌",
]

/**
 * 端状态预设选项
 * 【用于模拟不同的初始状态场景】
 */
const STATE_PRESETS: { id: string; label: string; description: string; state: SingleSourceEndpointState }[] = [
  {
    id: "closed",
    label: "应用已关闭",
    description: "音乐应用未启动",
    state: createDefaultEndpointState()
  },
  {
    id: "fg_playing",
    label: "前台播放中",
    description: "正在前台播放《晴天》",
    state: createPlayingEndpointState()
  },
  {
    id: "fg_paused",
    label: "前台已暂停",
    description: "前台显示但已暂停",
    state: {
      ...createPlayingEndpointState(),
      status: "fg_paused" as EndpointStatus
    }
  },
  {
    id: "bg_playing",
    label: "后台播放中",
    description: "后台播放音乐",
    state: {
      ...createPlayingEndpointState(),
      status: "bg_playing" as EndpointStatus
    }
  },
  {
    id: "offline",
    label: "离线状态",
    description: "网络不可用",
    state: {
      ...createDefaultEndpointState(),
      network: "offline" as const,
      hasCache: false
    }
  }
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
  
  // ===== 单屏单信源仲裁相关状态 =====
  // 【仲裁引擎集成】
  const [arbitrationResult, setArbitrationResult] = useState<SingleSourceArbitrationResult | null>(null)
  const [endpointStatePreset, setEndpointStatePreset] = useState<string>("closed")
  const [currentEndpointState, setCurrentEndpointState] = useState<SingleSourceEndpointState>(createDefaultEndpointState())
  const [arbitrationOpen, setArbitrationOpen] = useState(true)
  
  // 使用 ref 来存储当前端状态，避免 useCallback 的循环依赖
  const endpointStateRef = useRef(currentEndpointState)
  endpointStateRef.current = currentEndpointState
  
  // 使用 ref 来防止重复执行
  const lastSpeakingRef = useRef(false)
  
  // 当预设状态改变时，更新当前端状态
  useEffect(() => {
    const preset = STATE_PRESETS.find(p => p.id === endpointStatePreset)
    if (preset) {
      setCurrentEndpointState(preset.state)
      // 同时清除之前的仲裁结果
      setArbitrationResult(null)
    }
  }, [endpointStatePreset])
  
  // 执行仲裁（当用户点击说话按钮时调用）
  // 使用 ref 来获取最新的 endpointState，避免闭包问题和无限循环
  const executeArbitration = useCallback(() => {
    if (!command || !activeZoneId) return
    
    // 使用 ref 获取最新的端状态
    const stateSnapshot = endpointStateRef.current
    
    // 调用单屏单信源仲裁引擎
    const result = arbitrateSingleScreenSingleSource(config, command, stateSnapshot)
    setArbitrationResult(result)
    
    // 注意：不再自动更新端状态，避免循环
    // 用户可以手动切换预设来模拟不同状态
  }, [command, activeZoneId, config])
  
  // 当 speaking 状态从 false 变为 true 时执行仲裁
  useEffect(() => {
    // 只在 speaking 从 false 变为 true 时触发
    if (speaking && !lastSpeakingRef.current && command) {
      executeArbitration()
    }
    lastSpeakingRef.current = speaking
  }, [speaking, command, executeArbitration])

  // 模拟决策路径（保留原有的简化版本用于基础展示）
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

      {/* ===== 单屏单信源仲裁决策路径（新增区域） ===== */}
      {/* 【文档对应】第2节 - 基础场景仲裁可视化 */}
      <div className="flex flex-col gap-3 pt-2 border-t border-border/40">
        {/* 标题栏 + 端状态选择 */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setArbitrationOpen((v) => !v)}
            aria-expanded={arbitrationOpen}
            aria-controls="arbitration-detail"
            className="flex items-center gap-2 rounded-lg py-1 text-left transition-colors hover:bg-muted/40"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                arbitrationOpen ? "rotate-0" : "-rotate-90",
              )}
            />
            <div className="flex items-center gap-1.5">
              <Music className="h-3.5 w-3.5 text-emerald-500" />
              <Label className="text-xs text-muted-foreground cursor-pointer font-medium">
                单屏单信源仲裁决策
              </Label>
            </div>
          </button>
          
          {/* 当前端状态预设选择 */}
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-muted-foreground whitespace-nowrap">模拟端状态:</Label>
            <Select value={endpointStatePreset} onValueChange={setEndpointStatePreset}>
              <SelectTrigger className="h-7 w-[120px] rounded-lg text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATE_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id} className="text-xs">
                    <div className="flex flex-col">
                      <span>{preset.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* 当前端状态显示卡片 */}
        <div 
          id="arbitration-detail"
          className={cn(
            "flex flex-col gap-3 overflow-hidden transition-all duration-200",
            arbitrationOpen ? "opacity-100" : "hidden opacity-0"
          )}
        >
          {/* 端状态摘要 */}
          <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-muted/30 border border-border/40">
            <Badge variant="outline" className="text-[10px] gap-1">
              {currentEndpointState.status === "fg_playing" ? (
                <><Play className="h-2.5 w-2.5 text-emerald-500" /> 前台播放</>
              ) : currentEndpointState.status === "fg_paused" ? (
                <><Pause className="h-2.5 w-2.5 text-amber-500" /> 前台暂停</>
              ) : currentEndpointState.status === "bg_playing" ? (
                <><Volume2 className="h-2.5 w-2.5 text-sky-500" /> 后台播放</>
              ) : currentEndpointState.status === "bg_paused" ? (
                <><Pause className="h-2.5 w-2.5 text-muted-foreground" /> 后台暂停</>
              ) : (
                <><XCircle className="h-2.5 w-2.5 text-muted-foreground" /> 已关闭</>
              )}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {currentEndpointState.network === "online" ? "在线" : "离线"}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {currentEndpointState.login === "logged_in" ? "已登录" : "未登录"}
            </Badge>
            {currentEndpointState.currentSongName && (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30">
                正在播放: {currentEndpointState.currentSongName}
              </Badge>
            )}
          </div>
          
          {/* 仲裁结果展示（使用 Accordion） */}
          {arbitrationResult && (
            <Accordion type="single" collapsible defaultValue="result" className="w-full">
              {/* 仲裁结果摘要 */}
              <AccordionItem value="result" className="border-none">
                <AccordionTrigger className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-950/30 dark:to-sky-950/30 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    {arbitrationResult.error ? (
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    )}
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-medium">{arbitrationResult.action}</span>
                      <span className="text-[10px] text-muted-foreground">{arbitrationResult.ttsContent}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-0">
                  {/* TTS 和提示语ID */}
                  <div className="mb-3 p-2 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900">
                    <div className="flex items-center gap-2 mb-1">
                      <Volume2 className="h-3 w-3 text-sky-500" />
                      <span className="text-[10px] font-medium text-sky-700 dark:text-sky-300">TTS播报</span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                        {arbitrationResult.ttsPromptId}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground pl-5">
                      {arbitrationResult.ttsContent}
                    </p>
                  </div>
                  
                  {/* 详细决策步骤 */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-[10px] text-muted-foreground">决策步骤详情</Label>
                    {arbitrationResult.steps.map((step, index) => (
                      <Card 
                        key={index} 
                        className={cn(
                          "p-3 border transition-colors",
                          step.passed 
                            ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20" 
                            : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {/* 步骤编号 */}
                          <div className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                            step.passed 
                              ? "bg-emerald-500 text-white" 
                              : "bg-amber-500 text-white"
                          )}>
                            {step.stepNumber}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* 步骤标题 */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold">{step.title}</span>
                              {step.passed ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-amber-500" />
                              )}
                            </div>
                            
                            {/* 步骤描述 */}
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {step.description}
                            </p>
                            
                            {/* 判断条件和结果 */}
                            <div className="mt-2 grid grid-cols-1 gap-1 text-[10px]">
                              <div className="flex gap-1">
                                <span className="text-muted-foreground shrink-0">判断条件:</span>
                                <span className="font-mono text-sky-600 dark:text-sky-400">{step.condition}</span>
                              </div>
                              <div className="flex gap-1">
                                <span className="text-muted-foreground shrink-0">判断结果:</span>
                                <span className={cn(
                                  "font-medium",
                                  step.passed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                                )}>
                                  {step.result}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <span className="text-muted-foreground shrink-0">文档参考:</span>
                                <span className="text-purple-600 dark:text-purple-400 italic">{step.documentRef}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {/* 最终执行信息 */}
                  <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-sky-100/50 to-emerald-100/50 dark:from-sky-950/30 dark:to-emerald-950/30 border border-sky-200 dark:border-sky-800">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">目标屏幕: </span>
                        <span className="font-medium">{arbitrationResult.targetScreen}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">动作代码: </span>
                        <code className="px-1 py-0.5 rounded bg-muted text-[10px]">{arbitrationResult.actionCode}</code>
                      </div>
                      <div>
                        <span className="text-muted-foreground">新状态: </span>
                        <span className="font-medium">{arbitrationResult.newStatus}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">单屏单信源: </span>
                        <span className={cn(
                          "font-medium",
                          arbitrationResult.isSingleScreenSingleSource ? "text-emerald-600" : "text-amber-600"
                        )}>
                          {arbitrationResult.isSingleScreenSingleSource ? "是" : "否"}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          
          {/* 未执行时的提示 */}
          {!arbitrationResult && (
            <div className="flex items-center justify-center p-6 rounded-xl bg-muted/20 border border-dashed border-border/60">
              <p className="text-xs text-muted-foreground text-center">
                输入语音指令并点击说话按钮，查看仲裁决策路径
              </p>
            </div>
          )}
        </div>
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
