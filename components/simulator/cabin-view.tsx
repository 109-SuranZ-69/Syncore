"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { type SimulatorConfig, type SeatId, type ZoneOption, getZoneOptions } from "./types"

interface CabinViewProps {
  config: SimulatorConfig
  activeZoneId: string | null
  speaking: boolean
}

// 座位位置（俯视图坐标）
const SEAT_POSITIONS: Record<SeatId, { x: number; y: number }> = {
  driver: { x: 135, y: 260 },
  copilot: { x: 305, y: 260 },
  "row2-left": { x: 115, y: 420 },
  "row2-mid": { x: 220, y: 420 },
  "row2-right": { x: 325, y: 420 },
  "row3-left": { x: 115, y: 580 },
  "row3-mid": { x: 220, y: 580 },
  "row3-right": { x: 325, y: 580 },
}

const SEAT_LABELS: Record<SeatId, string> = {
  driver: "主驾",
  copilot: "副驾",
  "row2-left": "二排左",
  "row2-mid": "二排中",
  "row2-right": "二排右",
  "row3-left": "三排左",
  "row3-mid": "三排中",
  "row3-right": "三排右",
}

export function CabinView({ config, activeZoneId, speaking }: CabinViewProps) {
  // 当前车型实际座位
  const activeSeats: SeatId[] = useMemo(() => {
    if (config.seatCount === 5) {
      return ["driver", "copilot", "row2-left", "row2-mid", "row2-right"]
    }
    if (config.seatCount === 6) {
      return ["driver", "copilot", "row2-left", "row2-right", "row3-left", "row3-right"]
    }
    return ["driver", "copilot", "row2-left", "row2-right", "row3-left", "row3-mid", "row3-right"]
  }, [config.seatCount])

  // 音区选项（根据座位数 + 音区数量）
  const zones: ZoneOption[] = useMemo(
    () => getZoneOptions(config.seatCount, config.audioZone),
    [config.seatCount, config.audioZone],
  )

  const activeZone = useMemo(
    () => zones.find((z) => z.id === activeZoneId) ?? null,
    [zones, activeZoneId],
  )

  // 车身尺寸（5 座短一截）
  const is5 = config.seatCount === 5
  const viewBoxH = is5 ? 600 : 760
  const trunkY = is5 ? 555 : 720

  // 车身路径（5 座短、6/7 座长）
  const bodyPath = is5
    ? "M 70 100 Q 70 40 220 30 Q 370 40 370 100 L 370 520 Q 370 580 220 585 Q 70 580 70 520 Z"
    : "M 70 100 Q 70 40 220 30 Q 370 40 370 100 L 370 680 Q 370 740 220 745 Q 70 740 70 680 Z"

  return (
    <Card className="relative flex flex-col h-full p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100/80 dark:from-slate-900/80 dark:via-slate-950 dark:to-slate-900/60 border-border/60 shadow-sm rounded-2xl overflow-hidden">
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
            车舱俯视图
          </Badge>
          <span className="text-sm text-muted-foreground">
            {config.seatCount} 座 · {config.audioZone} 音区 ·{" "}
            {config.screens.main === "center" ? "中控屏" : "一体屏"}
          </span>
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center min-h-0 w-full" style={{ perspective: "1400px" }}>
        <svg
          viewBox={`0 0 440 ${viewBoxH}`}
          className="w-full h-auto max-h-[72vh] drop-shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
          style={{ transform: "rotateX(12deg)", transformStyle: "preserve-3d" }}
          aria-label="车舱俯视图示"
        >
          <defs>
            {/* 车身渐变 - 更立体 */}
            <linearGradient id="cabinBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="50%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="cabinBgDark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            {/* 引擎盖渐变 */}
            <linearGradient id="hoodGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="40%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            {/* 屏幕发光 */}
            <linearGradient id="screenGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dbeafe" />
              <stop offset="100%" stopColor="#bfdbfe" />
            </linearGradient>
            <linearGradient id="screenActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
            {/* 座椅渐变 */}
            <linearGradient id="seatGradDriver" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d1fae5" />
              <stop offset="100%" stopColor="#a7f3d0" />
            </linearGradient>
            <linearGradient id="seatGradCopilot" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ede9fe" />
              <stop offset="100%" stopColor="#ddd6fe" />
            </linearGradient>
            <linearGradient id="seatGradRear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>
            {/* 阴影滤镜 */}
            <filter id="seatShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.15" />
            </filter>
            <filter id="screenGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* 车身外边缘阴影 */}
            <filter id="bodyShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* 车身外形（俯视，按座位数变化） */}
          <path
            d={bodyPath}
            fill="url(#cabinBg)"
            stroke="#94a3b8"
            strokeWidth="3"
            filter="url(#bodyShadow)"
            className="dark:fill-[url(#cabinBgDark)] dark:stroke-slate-700"
          />

          {/* 车身内边缘线 - 增加层次感 */}
          <path
            d={is5
              ? "M 85 110 Q 85 60 220 50 Q 355 60 355 110 L 355 510 Q 355 560 220 565 Q 85 560 85 510 Z"
              : "M 85 110 Q 85 60 220 50 Q 355 60 355 110 L 355 670 Q 355 720 220 725 Q 85 720 85 670 Z"
            }
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1"
            opacity="0.6"
            className="dark:stroke-slate-700"
          />

          {/* 引擎盖 - 更立体 */}
          <path
            d="M 95 50 Q 220 25 345 50 L 335 100 Q 220 82 105 100 Z"
            fill="url(#hoodGrad)"
            stroke="#94a3b8"
            strokeWidth="1"
            className="dark:fill-slate-800 dark:stroke-slate-600"
          />
          {/* 引擎盖中线 */}
          <line x1="220" y1="35" x2="220" y2="90" stroke="#94a3b8" strokeWidth="1" opacity="0.5" />

          {/* 挡风玻璃 - 更真实 */}
          <path
            d="M 100 115 L 118 175 L 322 175 L 340 115 Z"
            fill="#bfdbfe"
            opacity="0.7"
            stroke="#60a5fa"
            strokeWidth="1.5"
            className="dark:fill-sky-950/60 dark:stroke-sky-700"
          />
          {/* 挡风玻璃反光 */}
          <path
            d="M 108 120 L 118 155 L 220 155 L 230 120 Z"
            fill="#fff"
            opacity="0.25"
          />

          {/* 后挡风玻璃 */}
          <path
            d={is5
              ? "M 110 520 Q 220 545 330 520 L 320 495 Q 220 510 120 495 Z"
              : "M 110 680 Q 220 705 330 680 L 320 655 Q 220 670 120 655 Z"
            }
            fill="#bfdbfe"
            opacity="0.5"
            stroke="#60a5fa"
            strokeWidth="1"
            className="dark:fill-sky-950/40 dark:stroke-sky-800"
          />

          {/* 活动音区高亮边框 */}
          {activeZone && speaking && (
            <ActiveZoneHighlight
              zone={activeZone}
              audioZone={config.audioZone}
              seatCount={config.seatCount}
            />
          )}

          {/* 仪表盘屏幕 */}
          {config.screens.main === "unified" ? (
            <g filter="url(#screenGlowFilter)">
              <rect
                x="95"
                y="115"
                width="250"
                height="65"
                rx="8"
                fill="url(#screenGlow)"
                stroke="#22c55e"
                strokeWidth="2"
              />
              {/* 屏幕内容分区 */}
              <line x1="220" y1="120" x2="220" y2="175" stroke="#93c5fd" strokeWidth="1" opacity="0.5" />
              <text
                x="157"
                y="152"
                textAnchor="middle"
                className="fill-emerald-700 text-[9px] font-medium dark:fill-emerald-300"
              >
                主驾区
              </text>
              <text
                x="283"
                y="152"
                textAnchor="middle"
                className="fill-violet-600 text-[9px] font-medium dark:fill-violet-300"
              >
                副驾区
              </text>
              <text
                x="220"
                y="168"
                textAnchor="middle"
                className="fill-slate-500 text-[8px] dark:fill-slate-400"
              >
                一体屏 32:9
              </text>
            </g>
          ) : (
            <g>
              {/* 中控屏 */}
              <g filter="url(#screenGlowFilter)">
                <rect
                  x="150"
                  y="118"
                  width="105"
                  height="58"
                  rx="6"
                  fill="url(#screenGlow)"
                  stroke="#22c55e"
                  strokeWidth="2"
                />
                <text
                  x="202"
                  y="152"
                  textAnchor="middle"
                  className="fill-emerald-700 text-[10px] font-medium dark:fill-emerald-300"
                >
                  中控屏
                </text>
              </g>
              {/* 副驾屏 */}
              {config.screens.copilot && (
                <g filter="url(#screenGlowFilter)">
                  <rect
                    x="265"
                    y="123"
                    width="78"
                    height="42"
                    rx="5"
                    fill="url(#screenGlow)"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                  />
                  <text
                    x="304"
                    y="148"
                    textAnchor="middle"
                    className="fill-violet-600 text-[9px] font-medium dark:fill-violet-300"
                  >
                    副驾屏
                  </text>
                </g>
              )}
            </g>
          )}

          {/* 二排吸顶屏 */}
          {config.screens.rear && (
            <g filter="url(#screenGlowFilter)">
              <rect
                x="155"
                y={is5 ? 348 : 348}
                width="130"
                height="26"
                rx="5"
                fill="url(#screenGlow)"
                stroke="#f97316"
                strokeWidth="2"
              />
              <text
                x="220"
                y={is5 ? 366 : 366}
                textAnchor="middle"
                className="fill-orange-600 text-[9px] font-medium dark:fill-orange-300"
              >
                二排吸顶屏
              </text>
            </g>
          )}

          {/* 三排吸顶屏 */}
          {config.screens.thirdRow && !is5 && (
            <g filter="url(#screenGlowFilter)">
              <rect
                x="160"
                y="508"
                width="120"
                height="24"
                rx="5"
                fill="url(#screenGlow)"
                stroke="#f97316"
                strokeWidth="2"
              />
              <text
                x="220"
                y="524"
                textAnchor="middle"
                className="fill-orange-600 text-[9px] font-medium dark:fill-orange-300"
              >
                三排吸顶屏
              </text>
            </g>
          )}

          {/* 方向盘 - 更立体 */}
          <g>
            <ellipse cx="135" cy="207" rx="22" ry="20" fill="none" stroke="#475569" strokeWidth="4" />
            <ellipse cx="135" cy="207" rx="22" ry="20" fill="none" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="135" cy="207" r="8" fill="#64748b" />
            <line x1="113" y1="207" x2="127" y2="207" stroke="#475569" strokeWidth="3" />
            <line x1="143" y1="207" x2="157" y2="207" stroke="#475569" strokeWidth="3" />
            <line x1="135" y1="207" x2="135" y2="227" stroke="#475569" strokeWidth="3" />
          </g>

          {/* 座位 */}
          {activeSeats.map((seat) => {
            const pos = SEAT_POSITIONS[seat]
            const isAnchor = activeZone?.anchor === seat
            const inZone = activeZone?.seats.includes(seat) ?? false
            const isDriver = seat === "driver"
            const isCopilot = seat === "copilot"
            const isRear = seat.startsWith("row3")
            const isRow2 = seat.startsWith("row2")

            const seatGrad = isDriver
              ? "url(#seatGradDriver)"
              : isCopilot
                ? "url(#seatGradCopilot)"
                : "url(#seatGradRear)"

            const strokeColor = isDriver
              ? "#10b981"
              : isCopilot
                ? "#8b5cf6"
                : "#0ea5e9"

            return (
              <g key={seat} filter="url(#seatShadow)">
                {/* 说话光圈（仅在锚点座位） */}
                {isAnchor && speaking && (
                  <>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="35"
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="2"
                      opacity="0.7"
                      className="origin-center animate-[ripple_1.8s_ease-out_infinite]"
                    />
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="35"
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="2"
                      opacity="0.4"
                      className="origin-center animate-[ripple_1.8s_ease-out_infinite] [animation-delay:0.6s]"
                    />
                  </>
                )}

                {/* 座椅主体 */}
                <rect
                  x={pos.x - 28}
                  y={pos.y - 24}
                  width="56"
                  height="48"
                  rx="12"
                  fill={seatGrad}
                  stroke={strokeColor}
                  strokeWidth={isAnchor ? 3 : inZone ? 2.5 : 2}
                  className={cn(isAnchor && "drop-shadow-[0_0_12px_rgba(14,165,233,0.5)]")}
                />
                {/* 座椅靠背 */}
                <rect
                  x={pos.x - 20}
                  y={pos.y - 36}
                  width="40"
                  height="14"
                  rx="6"
                  fill={seatGrad}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />
                {/* 座椅内部纹理 */}
                <line
                  x1={pos.x - 12}
                  y1={pos.y - 10}
                  x2={pos.x - 12}
                  y2={pos.y + 10}
                  stroke={strokeColor}
                  strokeWidth="1"
                  opacity="0.3"
                />
                <line
                  x1={pos.x + 12}
                  y1={pos.y - 10}
                  x2={pos.x + 12}
                  y2={pos.y + 10}
                  stroke={strokeColor}
                  strokeWidth="1"
                  opacity="0.3"
                />

                {/* 锚点指示 */}
                {isAnchor && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="7"
                    fill="#0ea5e9"
                    className={speaking ? "animate-pulse" : ""}
                  />
                )}

                {/* 座位标签 */}
                <text
                  x={pos.x}
                  y={pos.y + 5}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] font-medium pointer-events-none select-none",
                    isAnchor ? "fill-white" : "fill-slate-600 dark:fill-slate-300",
                  )}
                >
                  {isAnchor ? "" : SEAT_LABELS[seat]}
                </text>

                {/* 耳机指示 */}
                {((seat === "copilot" && config.headphones.copilot) ||
                  (isRear && config.headphones.rear) ||
                  (isRow2 && !isDriver && !isCopilot && config.headphones.rear)) && (
                  <g transform={`translate(${pos.x + 24}, ${pos.y - 30})`}>
                    <circle r="9" fill="#f97316" stroke="#fff" strokeWidth="1.5" />
                    <path
                      d="M -3.5 0 Q -3.5 -3.5 0 -3.5 Q 3.5 -3.5 3.5 0 M -3.5 0 L -3.5 3 M 3.5 0 L 3.5 3"
                      stroke="white"
                      strokeWidth="1.5"
                      fill="none"
                    />
                  </g>
                )}
              </g>
            )
          })}

          {/* 后备箱装饰 */}
          <rect
            x="165"
            y={trunkY}
            width="110"
            height="12"
            rx="4"
            className="fill-slate-300 dark:fill-slate-700"
          />
          <rect
            x="200"
            y={trunkY + 3}
            width="40"
            height="6"
            rx="2"
            className="fill-slate-400 dark:fill-slate-600"
          />
        </svg>

        <style>{`
          @keyframes ripple {
            0% { transform: scale(0.6); opacity: 0.8; }
            100% { transform: scale(2.2); opacity: 0; }
          }
        `}</style>
      </div>
    </Card>
  )
}

// 活动音区高亮：根据 zone.id 与音区布局计算矩形边框
function ActiveZoneHighlight({
  zone,
  audioZone,
  seatCount,
}: {
  zone: ZoneOption
  audioZone: number
  seatCount: number
}) {
  const is5 = seatCount === 5
  const bottomY = is5 ? 560 : 720

  let rect: { x: number; y: number; w: number; h: number } | null = null

  if (audioZone === 2) {
    if (zone.id === "front") rect = { x: 65, y: 185, w: 310, h: 150 }
    if (zone.id === "rear") rect = { x: 65, y: 340, w: 310, h: bottomY - 345 }
  } else if (audioZone === 4) {
    if (zone.id === "driver") rect = { x: 65, y: 185, w: 155, h: 150 }
    if (zone.id === "copilot") rect = { x: 220, y: 185, w: 155, h: 150 }
    if (zone.id === "row2-left" || zone.id === "rear-left")
      rect = { x: 65, y: 340, w: 155, h: bottomY - 345 }
    if (zone.id === "row2-right" || zone.id === "rear-right")
      rect = { x: 220, y: 340, w: 155, h: bottomY - 345 }
  } else if (audioZone === 6) {
    if (zone.id === "driver") rect = { x: 65, y: 185, w: 155, h: 150 }
    if (zone.id === "copilot") rect = { x: 220, y: 185, w: 155, h: 150 }
    if (zone.id === "row2-left") rect = { x: 65, y: 360, w: 155, h: 170 }
    if (zone.id === "row2-right") rect = { x: 220, y: 360, w: 155, h: 170 }
    if (zone.id === "row3-left") rect = { x: 65, y: 535, w: 155, h: 175 }
    if (zone.id === "row3-right") rect = { x: 220, y: 535, w: 155, h: 175 }
  }

  if (!rect) return null

  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.w}
      height={rect.h}
      rx="12"
      ry="12"
      fill="rgba(14,165,233,0.08)"
      stroke="#0ea5e9"
      strokeWidth="2.5"
      strokeDasharray="8 4"
      className="animate-pulse"
    />
  )
}
