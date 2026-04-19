// components/simulator/arbitration-engine.ts
import { SimulatorConfig, SeatId, ZoneOption } from "./types";

/** 真实车端媒体状态（模拟当前前台/后台/播放/暂停等） */
export interface MediaState {
  screen: "main" | "copilot" | "rear" | "thirdRow";
  zoneId: string;
  app: string; // "netease" | "qq" | "bilibili" | "local" | "bluetooth" | "usb"
  status: "playing" | "paused" | "stopped" | "background";
  isFg: boolean; // 是否前台界面
}

/** 仲裁结果 */
export interface ArbitrationResult {
  targetScreen: string;           // 中控/副驾/后排/一体屏主驾区/一体屏副驾区
  targetZoneId: string;
  targetApp: string;
  action: "open" | "play" | "pause" | "close" | "switch" | "returnUI";
  tts: string;                    // 模拟TTS播报
  path: string[];                 // 仲裁路径（给非开发人员看的文字说明）
  priorityRule: string;           // 本次使用的规则（音区优先 / 播放状态优先 / 一体屏左右分屏等）
}

/**
 * 核心仲裁引擎 - 完全按照《媒体业务语音交互通用规范-V1.0》和PRD流程图实现
 */
export function arbitrate(
  config: SimulatorConfig,
  speakingZoneId: string,
  command: string,
  currentStates: MediaState[] = []
): ArbitrationResult {
  const isIntegrated = config.screens.main === "integrated"; // 一体屏
  const speakingSeat = speakingZoneId as SeatId;

  // ==================== 步骤1：映射说话音区 → 屏幕 ====================
  let targetScreen = "main"; // 默认中控/一体屏
  let rule = "默认中控屏";

  // 音区 → 屏幕映射表（严格按规范表格）
  if (speakingZoneId === "driver") targetScreen = "main";
  else if (speakingZoneId === "copilot") targetScreen = config.screens.copilot ? "copilot" : "main";
  else if (speakingZoneId.includes("row2")) targetScreen = config.screens.rear ? "rear" : "main";
  else if (speakingZoneId.includes("row3")) targetScreen = config.screens.thirdRow ? "thirdRow" : "main";

  // ==================== 步骤2：一体屏特殊左右分屏规则 ====================
  if (isIntegrated) {
    rule = "一体屏左右分屏规则";
    if (speakingZoneId === "driver") targetScreen = "main-left";   // 主驾区域
    if (speakingZoneId === "copilot") targetScreen = "main-right"; // 副驾区域
  }

  // ==================== 步骤3：播放状态优先（PRD核心规则）================
  const playingState = currentStates.find(s => s.status === "playing");
  if (playingState && command.includes("播放") || command.includes("继续")) {
    rule = "播放状态优先 > 音区优先";
    targetScreen = playingState.screen; // 正在播放的屏幕优先响应
  }

  // ==================== 步骤4：生成结果 ====================
  const result: ArbitrationResult = {
    targetScreen: targetScreen === "main-left" ? "一体屏主驾区域" :
      targetScreen === "main-right" ? "一体屏副驾区域" :
        targetScreen === "copilot" ? "副驾屏" :
          targetScreen === "rear" ? "后排屏" : "中控屏",
    targetZoneId: speakingZoneId,
    targetApp: config.mediaSources.main[0] || "netease",
    action: command.includes("打开") ? "open" :
      command.includes("播放") ? "play" :
        command.includes("关闭") ? "close" : "switch",
    tts: `好的，已在${targetScreen}为你${command}`,
    path: [
      `1. 说话音区：${speakingZoneId}`,
      `2. 映射屏幕：${targetScreen}（${rule}）`,
      `3. 当前播放状态检查：${playingState ? "有正在播放" : "无"}`,
      `4. 最终执行：${targetScreen} 的 ${config.mediaSources.main[0]}`
    ],
    priorityRule: rule
  };

  return result;
}