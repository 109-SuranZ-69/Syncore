// 共享类型定义：智能座舱语音交互模拟器

export type SeatCount = 5 | 6 | 7
export type AudioZone = 2 | 4 | 6
// 中控屏 | 一体屏（必选其一，互斥：center 与 unified 不可并存）
export type MainScreen = "center" | "unified"

export interface ScreenConfig {
  main: MainScreen
  copilot: boolean // 副驾屏
  rear: boolean // 后排屏（二排吸顶屏）
  thirdRow: boolean // 三排吸顶屏
}

// 车型预设：选择车型代号即套用固定屏幕组合
export interface CarModelPreset {
  id: string
  label: string
  screens: ScreenConfig
}

export const CAR_MODEL_PRESETS: CarModelPreset[] = [
  {
    id: "A02_A09",
    label: "A02 / A09",
    screens: { main: "center", copilot: false, rear: false, thirdRow: false },
  },
  {
    id: "AH8",
    label: "AH8",
    screens: { main: "center", copilot: false, rear: true, thirdRow: false },
  },
  {
    id: "T60Y3",
    label: "T60Y3",
    screens: { main: "center", copilot: true, rear: false, thirdRow: false },
  },
  {
    id: "YX2_UNIFIED",
    label: "YX2 一体屏",
    screens: { main: "unified", copilot: false, rear: true, thirdRow: false },
  },
  {
    id: "YX2_DUAL",
    label: "YX2 双联屏",
    screens: { main: "center", copilot: true, rear: true, thirdRow: false },
  },
]

// 根据当前屏幕配置匹配预设车型，未匹配返回 null（即自定义）
export function matchCarPreset(screens: ScreenConfig): CarModelPreset | null {
  return (
    CAR_MODEL_PRESETS.find(
      (p) =>
        p.screens.main === screens.main &&
        p.screens.copilot === screens.copilot &&
        p.screens.rear === screens.rear &&
        p.screens.thirdRow === screens.thirdRow,
    ) ?? null
  )
}

export interface HeadphoneConfig {
  copilot: boolean // 副驾耳机模式
  row2: boolean // 二排耳机模式（对应二排吸顶屏）
  row3: boolean // 三排耳机模式（对应三排吸顶屏）
}

// 座位标识
export type SeatId =
  | "driver" // 主驾
  | "copilot" // 副驾
  | "row2-left"
  | "row2-mid"
  | "row2-right"
  | "row3-left"
  | "row3-mid"
  | "row3-right"

export interface SimulatorConfig {
  seatCount: SeatCount
  audioZone: AudioZone
  screens: ScreenConfig
  headphones: HeadphoneConfig
  mediaSources: MediaSourceConfig
}

// ===== 信源（应用）相关 =====

export type AppId =
  | "netease"
  | "qq_music"
  | "ximalaya"
  | "yunting"
  | "iqiyi"
  | "bilibili"
  | "migu"
  | "mangguo_tv"
  | "quanmin_k"
  | "leishi"
  | "changba"

export type AppIconKey = "music" | "headphones" | "radio" | "play" | "tv" | "mic"

export interface AppMeta {
  id: AppId
  name: string
  short: string
  color: string
  iconKey: AppIconKey
}

// 每个应用的品牌色 + 简写 + 代表性图标（非真实 LOGO，仅作视觉化表达）
export const APPS_META: Record<AppId, AppMeta> = {
  netease: { id: "netease", name: "网易云音乐", short: "网", color: "#C20C0C", iconKey: "music" },
  qq_music: { id: "qq_music", name: "QQ音乐", short: "QQ", color: "#31C27C", iconKey: "music" },
  ximalaya: { id: "ximalaya", name: "喜马拉雅", short: "Xm", color: "#F86442", iconKey: "headphones" },
  yunting: { id: "yunting", name: "云听", short: "云", color: "#1E88E5", iconKey: "radio" },
  iqiyi: { id: "iqiyi", name: "爱奇艺", short: "iQ", color: "#00BE06", iconKey: "play" },
  bilibili: { id: "bilibili", name: "bilibili", short: "B", color: "#FB7299", iconKey: "tv" },
  migu: { id: "migu", name: "咪咕", short: "咪", color: "#ED1C24", iconKey: "tv" },
  mangguo_tv: { id: "mangguo_tv", name: "芒果TV", short: "芒", color: "#FF8000", iconKey: "tv" },
  quanmin_k: { id: "quanmin_k", name: "全民K歌", short: "K", color: "#EC2027", iconKey: "mic" },
  leishi: { id: "leishi", name: "雷石", short: "雷", color: "#1D4ED8", iconKey: "mic" },
  changba: { id: "changba", name: "唱吧", short: "唱", color: "#EC4899", iconKey: "mic" },
}

export type BusinessCategoryId =
  | "online_music"
  | "audiobook"
  | "radio"
  | "news"
  | "online_video"
  | "ktv"

export interface BusinessCategory {
  id: BusinessCategoryId
  label: string
  apps: AppId[]
}

// 业务分类 → 应用列表映射
export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { id: "online_music", label: "在线音乐", apps: ["netease", "qq_music"] },
  { id: "audiobook", label: "有声读物", apps: ["ximalaya"] },
  { id: "radio", label: "网络电台", apps: ["yunting"] },
  { id: "news", label: "新闻", apps: ["yunting"] },
  { id: "online_video", label: "在线视频", apps: ["iqiyi", "bilibili", "migu", "mangguo_tv"] },
  { id: "ktv", label: "K歌", apps: ["quanmin_k", "leishi", "changba"] },
]

// 各屏幕独立的信源选择列表
export interface MediaSourceConfig {
  main: AppId[] // 中控屏 / 一体屏
  copilot: AppId[] // 副驾屏
  rear: AppId[] // 后排屏（二排吸顶屏）
}

// 车型与音区合理性映射
export const VALID_AUDIO_ZONES: Record<SeatCount, AudioZone[]> = {
  5: [2, 4],
  6: [4, 6],
  7: [4, 6],
}

// 每种车型可用的座位列表
export const SEATS_BY_COUNT: Record<SeatCount, { id: SeatId; label: string }[]> = {
  5: [
    { id: "driver", label: "主驾" },
    { id: "copilot", label: "副驾" },
    { id: "row2-left", label: "二排左" },
    { id: "row2-mid", label: "二排中" },
    { id: "row2-right", label: "二排右" },
  ],
  6: [
    { id: "driver", label: "主驾" },
    { id: "copilot", label: "副驾" },
    { id: "row2-left", label: "二排左" },
    { id: "row2-right", label: "二排右" },
    { id: "row3-left", label: "三排左" },
    { id: "row3-right", label: "三排右" },
  ],
  7: [
    { id: "driver", label: "主驾" },
    { id: "copilot", label: "副驾" },
    { id: "row2-left", label: "二排左" },
    { id: "row2-right", label: "二排右" },
    { id: "row3-left", label: "三排左" },
    { id: "row3-mid", label: "三排中" },
    { id: "row3-right", label: "三排右" },
  ],
}

// 音区选项：根据车型 + 音区数量，返回语音可触发的音区列表
export interface ZoneOption {
  id: string
  label: string
  seats: SeatId[] // 该音区覆盖的座位
  anchor: SeatId // 视觉锚点（用于定位说话光圈）
}

export function getZoneOptions(seatCount: SeatCount, audioZone: AudioZone): ZoneOption[] {
  // 2 音区：前 / 后
  if (audioZone === 2) {
    if (seatCount === 5) {
      return [
        { id: "front", label: "前排音区", seats: ["driver", "copilot"], anchor: "driver" },
        {
          id: "rear",
          label: "后排音区",
          seats: ["row2-left", "row2-mid", "row2-right"],
          anchor: "row2-mid",
        },
      ]
    }
    if (seatCount === 6) {
      return [
        { id: "front", label: "前排音区", seats: ["driver", "copilot"], anchor: "driver" },
        {
          id: "rear",
          label: "后排音区",
          seats: ["row2-left", "row2-right", "row3-left", "row3-right"],
          anchor: "row2-left",
        },
      ]
    }
    return [
      { id: "front", label: "前排音区", seats: ["driver", "copilot"], anchor: "driver" },
      {
        id: "rear",
        label: "后排音区",
        seats: ["row2-left", "row2-right", "row3-left", "row3-mid", "row3-right"],
        anchor: "row2-left",
      },
    ]
  }

  // 4 音区
  if (audioZone === 4) {
    if (seatCount === 5) {
      // 二排中归入二排左音区
      return [
        { id: "driver", label: "主驾音区", seats: ["driver"], anchor: "driver" },
        { id: "copilot", label: "副驾音区", seats: ["copilot"], anchor: "copilot" },
        {
          id: "row2-left",
          label: "二排左音区",
          seats: ["row2-left", "row2-mid"],
          anchor: "row2-left",
        },
        { id: "row2-right", label: "二排右音区", seats: ["row2-right"], anchor: "row2-right" },
      ]
    }
    if (seatCount === 6) {
      return [
        { id: "driver", label: "主驾音区", seats: ["driver"], anchor: "driver" },
        { id: "copilot", label: "副驾音区", seats: ["copilot"], anchor: "copilot" },
        {
          id: "rear-left",
          label: "后排左音区",
          seats: ["row2-left", "row3-left"],
          anchor: "row2-left",
        },
        {
          id: "rear-right",
          label: "后排右音区",
          seats: ["row2-right", "row3-right"],
          anchor: "row2-right",
        },
      ]
    }
    // 7 座，4 音区：三排中归入后右音区
    return [
      { id: "driver", label: "主驾音区", seats: ["driver"], anchor: "driver" },
      { id: "copilot", label: "副驾音区", seats: ["copilot"], anchor: "copilot" },
      {
        id: "rear-left",
        label: "后排左音区",
        seats: ["row2-left", "row3-left"],
        anchor: "row2-left",
      },
      {
        id: "rear-right",
        label: "后排右音区",
        seats: ["row2-right", "row3-mid", "row3-right"],
        anchor: "row2-right",
      },
    ]
  }

  // 6 音区
  if (seatCount === 7) {
    // 三排中归入三排右音区
    return [
      { id: "driver", label: "主驾音区", seats: ["driver"], anchor: "driver" },
      { id: "copilot", label: "副驾音区", seats: ["copilot"], anchor: "copilot" },
      { id: "row2-left", label: "二排左音区", seats: ["row2-left"], anchor: "row2-left" },
      { id: "row2-right", label: "二排右音区", seats: ["row2-right"], anchor: "row2-right" },
      { id: "row3-left", label: "三排左音区", seats: ["row3-left"], anchor: "row3-left" },
      {
        id: "row3-right",
        label: "三排右音区",
        seats: ["row3-mid", "row3-right"],
        anchor: "row3-right",
      },
    ]
  }
  // 6 座，6 音区
  return [
    { id: "driver", label: "主驾音区", seats: ["driver"], anchor: "driver" },
    { id: "copilot", label: "副驾音区", seats: ["copilot"], anchor: "copilot" },
    { id: "row2-left", label: "二排左音区", seats: ["row2-left"], anchor: "row2-left" },
    { id: "row2-right", label: "二排右音区", seats: ["row2-right"], anchor: "row2-right" },
    { id: "row3-left", label: "三排左音区", seats: ["row3-left"], anchor: "row3-left" },
    { id: "row3-right", label: "三排右音区", seats: ["row3-right"], anchor: "row3-right" },
  ]
}
