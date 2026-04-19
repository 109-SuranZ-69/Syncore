/**
 * ========================================================================
 * 单屏单信源基础仲裁引擎
 * ========================================================================
 * 
 * 本文件实现《3.0平台-语音音乐语义清单-V3.6.xlsx》和流程图中定义的
 * "基础场景（语义无冲突 + 单屏 + 单信源）"的全部仲裁逻辑。
 * 
 * 【核心概念说明】
 * - 单屏：当前车型只有一个屏幕（中控屏）
 * - 单信源：当前只有一个媒体应用（如网易云音乐）
 * - 语义无冲突：用户指令明确，无需多屏仲裁
 * 
 * 【状态定义】
 * - fg (foreground)：应用在前台显示
 * - playing：正在播放音乐/视频
 * - paused：已暂停
 * - background：应用在后台运行
 * 
 * 【提示语ID说明】
 * 按照语义清单，每个场景对应一个提示语ID，用于TTS播报
 * ========================================================================
 */

import type { SimulatorConfig, AppId } from "@/components/simulator/types"

// ========================================================================
// 第一部分：类型定义
// ========================================================================

/**
 * 端状态枚举
 * 
 * 【文档对应】
 * - fg_playing: 前台播放中（音乐应用在屏幕上显示，且正在播放）
 * - fg_paused: 前台暂停（音乐应用在屏幕上显示，但已暂停）
 * - bg_playing: 后台播放中（音乐应用在后台，但声音仍在播放）
 * - bg_paused: 后台暂停（音乐应用在后台，声音已停止）
 * - closed: 应用完全关闭
 */
export type EndpointStatus = 
  | "fg_playing"      // 前台 + 播放中
  | "fg_paused"       // 前台 + 已暂停
  | "bg_playing"      // 后台 + 播放中
  | "bg_paused"       // 后台 + 已暂停
  | "closed"          // 应用未启动/已关闭

/**
 * 网络状态
 * 
 * 【文档对应】
 * 网络状态影响在线音乐的可用性
 */
export type NetworkStatus = "online" | "offline"

/**
 * 用户登录状态
 * 
 * 【文档对应】
 * 登录状态影响收藏、个人歌单等功能
 */
export type LoginStatus = "logged_in" | "logged_out"

/**
 * 播放列表状态
 * 
 * 【文档对应】
 * 播放列表的打开/关闭状态影响部分指令的响应
 */
export type PlaylistStatus = "opened" | "closed"

/**
 * 收藏状态
 * 
 * 【文档对应】
 * 当前歌曲是否已被收藏
 */
export type FavoriteStatus = "favorited" | "not_favorited"

/**
 * 媒体源类型
 * 
 * 【文档对应】
 * - online: 在线音乐（如网易云、QQ音乐）
 * - local: 本地音乐（U盘/SD卡）
 * - bluetooth: 蓝牙音乐
 * - usb: USB音乐
 */
export type MediaSourceType = "online" | "local" | "bluetooth" | "usb"

/**
 * 单屏单信源端状态
 * 
 * 【文档对应】
 * 完整描述当前媒体应用的所有状态，用于仲裁判断
 */
export interface SingleSourceEndpointState {
  // 基础状态
  status: EndpointStatus              // 端状态（前台/后台 + 播放/暂停）
  network: NetworkStatus              // 网络状态
  login: LoginStatus                  // 登录状态
  
  // 播放相关状态
  currentApp: AppId | null            // 当前活跃的应用ID
  sourceType: MediaSourceType         // 媒体源类型（在线/本地/蓝牙/USB）
  hasCache: boolean                   // 是否有缓存（离线播放）
  hasLocalMusic: boolean              // 是否有本地音乐
  
  // UI状态
  playlistStatus: PlaylistStatus      // 播放列表是否打开
  favoriteStatus: FavoriteStatus      // 当前歌曲是否已收藏
  
  // 播放信息
  currentSongName: string | null      // 当前歌曲名称
  currentArtist: string | null        // 当前艺术家
  currentPlaylist: string | null      // 当前播放列表名称
  playPosition: number                // 播放进度（秒）
  totalDuration: number               // 总时长（秒）
}

/**
 * 语义意图类型
 * 
 * 【文档对应】
 * 根据《3.0平台-语音音乐语义清单-V3.6.xlsx》定义的所有音乐类语义
 */
export type MusicSemanticIntent = 
  // 打开/关闭类
  | "open_music"              // 打开音乐
  | "close_music"             // 关闭音乐
  | "return_to_player"        // 返回播放界面
  
  // 播放控制类
  | "play_music"              // 播放音乐（泛指）
  | "play_song"               // 播放指定歌曲
  | "play_artist"             // 播放指定歌手的歌
  | "play_album"              // 播放指定专辑
  | "play_playlist"           // 播放指定歌单
  | "pause_music"             // 暂停播放
  | "resume_music"            // 继续播放
  | "stop_music"              // 停止播放
  
  // 切换类
  | "next_song"               // 下一首
  | "prev_song"               // 上一首
  | "fast_forward"            // 快进
  | "rewind"                  // 快退
  
  // 播放列表类
  | "open_playlist"           // 打开播放列表
  | "close_playlist"          // 关闭播放列表
  
  // 收藏类
  | "add_favorite"            // 收藏当前歌曲
  | "remove_favorite"         // 取消收藏
  
  // 模式类
  | "loop_single"             // 单曲循环
  | "loop_all"                // 列表循环
  | "shuffle"                 // 随机播放
  
  // 查询类
  | "query_song"              // 查询当前歌曲
  | "query_artist"            // 查询当前歌手

/**
 * 仲裁决策步骤
 * 
 * 【用于UI展示】
 * 每个步骤代表仲裁过程中的一个判断节点
 */
export interface ArbitrationStep {
  stepNumber: number            // 步骤编号
  title: string                 // 步骤标题
  description: string           // 步骤描述
  condition: string             // 判断条件
  result: string                // 判断结果
  documentRef: string           // 对应文档章节/条目
  passed: boolean               // 是否通过/满足条件
}

/**
 * 仲裁最终结果
 * 
 * 【文档对应】
 * 包含执行动作、TTS提示语、完整决策路径
 */
export interface SingleSourceArbitrationResult {
  // 是否为单屏单信源场景
  isSingleScreenSingleSource: boolean
  
  // 执行动作
  action: string                      // 具体执行动作（如"播放音乐"）
  actionCode: string                  // 动作代码（给开发用）
  
  // TTS提示语
  ttsPromptId: string                 // 提示语ID（如 "TTS_MUSIC_001"）
  ttsContent: string                  // 实际播报内容
  
  // 响应屏幕
  targetScreen: string                // 目标屏幕
  
  // 决策路径（用于UI展示）
  steps: ArbitrationStep[]
  
  // 状态变更（执行后的新状态）
  newStatus: EndpointStatus
  
  // 错误信息（如果有）
  error: string | null
}

// ========================================================================
// 第二部分：语义解析器
// ========================================================================

/**
 * 解析用户指令，识别语义意图
 * 
 * 【文档对应】
 * 根据《3.0平台-语音音乐语义清单-V3.6.xlsx》中的说法模板进行匹配
 * 
 * @param command 用户语音指令
 * @returns 识别出的语义意图
 */
export function parseSemanticIntent(command: string): MusicSemanticIntent | null {
  // 去除空格，转小写（中文不需要）
  const cmd = command.trim()
  
  // ===== 打开音乐 =====
  // 【文档说法】打开音乐、我要听音乐、进入音乐、打开网易云音乐、启动音乐
  if (/^(打开|启动|进入|我要听|我想听)(音乐|歌|网易云音乐|QQ音乐|酷狗音乐)$/.test(cmd)) {
    return "open_music"
  }
  
  // ===== 关闭音乐 =====
  // 【文档说法】关闭音乐、退出音乐、关掉音乐、不听了
  if (/^(关闭|退出|关掉|关上)(音乐|歌)$/.test(cmd) || cmd === "不听了") {
    return "close_music"
  }
  
  // ===== 返回播放界面 =====
  // 【文档说法】返回播放界面、回到音乐、返回音乐界面
  if (/^(返回|回到)(播放界面|音乐|音乐界面|播放页面)$/.test(cmd)) {
    return "return_to_player"
  }
  
  // ===== 播放音乐（泛指） =====
  // 【文档说法】播放音乐、放首歌、来首歌、随便放首歌
  if (/^(播放|放|来)(首|一首)?(音乐|歌)$/.test(cmd) || cmd === "随便放首歌") {
    return "play_music"
  }
  
  // ===== 播放指定歌曲 =====
  // 【文档说法】播放xxx、放xxx、我要听xxx
  if (/^(播放|放|我要听|我想听).+$/.test(cmd) && !cmd.includes("的歌") && !cmd.includes("音乐")) {
    return "play_song"
  }
  
  // ===== 播放指定歌手 =====
  // 【文档说法】播放xxx的歌、放xxx的歌、来首xxx的歌
  if (/^(播放|放|来首?).+的歌$/.test(cmd)) {
    return "play_artist"
  }
  
  // ===== 暂停 =====
  // 【文档说法】暂停、暂停播放、暂停音乐、停一下
  if (/^(暂停|停一下|暂停播放|暂停音乐)$/.test(cmd)) {
    return "pause_music"
  }
  
  // ===== 继续播放 =====
  // 【文档说法】继续、继续播放、继续放
  if (/^(继续|继续播放|继续放)$/.test(cmd)) {
    return "resume_music"
  }
  
  // ===== 下一首 =====
  // 【文档说法】下一首、切歌、换一首、下一曲
  if (/^(下一首|切歌|换一首|下一曲|切换下一首)$/.test(cmd)) {
    return "next_song"
  }
  
  // ===== 上一首 =====
  // 【文档说法】上一首、上一曲、前一首
  if (/^(上一首|上一曲|前一首)$/.test(cmd)) {
    return "prev_song"
  }
  
  // ===== 快进 =====
  // 【文档说法】快进、快进30秒、往后拖一下
  if (/^(快进|往后拖|向前)/.test(cmd)) {
    return "fast_forward"
  }
  
  // ===== 快退 =====
  // 【文档说法】快退、快退30秒、往前拖一下
  if (/^(快退|往前拖|向后|倒带)/.test(cmd)) {
    return "rewind"
  }
  
  // ===== 打开播放列表 =====
  // 【文档说法】打开播放列表、显示播放列表、看看播放列表
  if (/^(打开|显示|看看|展开)(播放列表|歌单|列表)$/.test(cmd)) {
    return "open_playlist"
  }
  
  // ===== 关闭播放列表 =====
  // 【文档说法】关闭播放列表、隐藏播放列表、收起播放列表
  if (/^(关闭|隐藏|收起|关掉)(播放列表|歌单|列表)$/.test(cmd)) {
    return "close_playlist"
  }
  
  // ===== 收藏 =====
  // 【文档说法】收藏、收藏这首歌、加入我喜欢
  if (/^(收藏|喜欢|收藏这首歌|加入我喜欢|加入收藏)$/.test(cmd)) {
    return "add_favorite"
  }
  
  // ===== 取消收藏 =====
  // 【文档说法】取消收藏、不喜欢、移出我喜欢
  if (/^(取消收藏|不喜欢|移出我喜欢|移出收藏)$/.test(cmd)) {
    return "remove_favorite"
  }
  
  // ===== 单曲循环 =====
  // 【文档说法】单曲循环、循环这首歌、重复播放这首
  if (/^(单曲循环|循环这首歌|重复播放这首|单曲重复)$/.test(cmd)) {
    return "loop_single"
  }
  
  // ===== 列表循环 =====
  // 【文档说法】列表循环、循环播放、全部循环
  if (/^(列表循环|循环播放|全部循环|顺序播放)$/.test(cmd)) {
    return "loop_all"
  }
  
  // ===== 随机播放 =====
  // 【文档说法】随机播放、打乱顺序、随机模式
  if (/^(随机播放|打乱顺序|随机模式|乱序播放)$/.test(cmd)) {
    return "shuffle"
  }
  
  // ===== 查询当前歌曲 =====
  // 【文档说法】这是什么歌、这首歌叫什么、现在放的是什么歌
  if (/^(这是什么歌|这首歌叫什么|现在放的是什么歌|这首歌是什么)$/.test(cmd)) {
    return "query_song"
  }
  
  // ===== 查询歌手 =====
  // 【文档说法】谁唱的、这是谁的歌、歌手是谁
  if (/^(谁唱的|这是谁的歌|歌手是谁|这首歌谁唱的)$/.test(cmd)) {
    return "query_artist"
  }
  
  // 未识别的意图
  return null
}

// ========================================================================
// 第三部分：核心仲裁逻辑
// ========================================================================

/**
 * 检查是否为单屏单信源场景
 * 
 * 【文档对应】
 * 第2节 - 基础场景判断条件：
 * 1. 车型只有一个屏幕（中控屏）
 * 2. 只有一个媒体信源应用
 * 
 * @param config 模拟器配置
 * @returns 是否为单屏单信源
 */
export function checkSingleScreenSingleSource(config: SimulatorConfig): {
  isSingleScreen: boolean
  isSingleSource: boolean
  screenCount: number
  sourceCount: number
  reason: string
} {
  // 计算屏幕数量
  let screenCount = 1 // 中控屏/一体屏始终存在
  if (config.screens.copilot) screenCount++
  if (config.screens.rear) screenCount++
  if (config.screens.thirdRow) screenCount++
  
  // 计算信源数量（只算中控屏的信源，因为单屏场景只有中控屏）
  const sourceCount = config.mediaSources.main.length
  
  const isSingleScreen = screenCount === 1
  const isSingleSource = sourceCount === 1
  
  let reason = ""
  if (!isSingleScreen) {
    reason = `当前车型有 ${screenCount} 个屏幕，不满足单屏条件`
  } else if (!isSingleSource) {
    reason = sourceCount === 0 
      ? "当前没有配置任何信源应用"
      : `当前有 ${sourceCount} 个信源应用，不满足单信源条件`
  } else {
    reason = "满足单屏单信源条件"
  }
  
  return {
    isSingleScreen,
    isSingleSource,
    screenCount,
    sourceCount,
    reason
  }
}

/**
 * 主仲裁函数 - 单屏单信源音乐业务
 * 
 * 【文档对应】
 * 完全按照《3.0平台-语音音乐语义清单-V3.6.xlsx》中的判断流程实现
 * 每个分支都对应文档中的一条规则
 * 
 * @param config 模拟器配置
 * @param command 用户语音指令
 * @param state 当前端状态
 * @returns 仲裁结果
 */
export function arbitrateSingleScreenSingleSource(
  config: SimulatorConfig,
  command: string,
  state: SingleSourceEndpointState
): SingleSourceArbitrationResult {
  const steps: ArbitrationStep[] = []
  let stepNumber = 1
  
  // ===== 步骤1：检查单屏单信源条件 =====
  // 【文档对应】第2节前置条件检查
  const singleCheck = checkSingleScreenSingleSource(config)
  steps.push({
    stepNumber: stepNumber++,
    title: "单屏单信源检查",
    description: "验证当前是否满足基础场景条件",
    condition: "屏幕数量=1 且 信源数量=1",
    result: singleCheck.reason,
    documentRef: "第2节 - 基础场景（语义无冲突+单屏+单信源）",
    passed: singleCheck.isSingleScreen && singleCheck.isSingleSource
  })
  
  // 如果不满足单屏单信源条件，直接返回
  if (!singleCheck.isSingleScreen || !singleCheck.isSingleSource) {
    return {
      isSingleScreenSingleSource: false,
      action: "无法执行",
      actionCode: "NOT_SINGLE_SCREEN_SINGLE_SOURCE",
      ttsPromptId: "TTS_ERROR_001",
      ttsContent: singleCheck.reason,
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: singleCheck.reason
    }
  }
  
  // ===== 步骤2：语义解析 =====
  // 【文档对应】语义清单第一列 - 说法模板
  const intent = parseSemanticIntent(command)
  steps.push({
    stepNumber: stepNumber++,
    title: "语义意图识别",
    description: `解析用户指令："${command}"`,
    condition: "匹配语义清单中的说法模板",
    result: intent ? `识别为：${getIntentLabel(intent)}` : "未能识别有效意图",
    documentRef: "语义清单 - 说法模板列",
    passed: intent !== null
  })
  
  if (!intent) {
    return {
      isSingleScreenSingleSource: true,
      action: "无法识别指令",
      actionCode: "UNKNOWN_INTENT",
      ttsPromptId: "TTS_ERROR_002",
      ttsContent: "抱歉，我没有理解您的意思",
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: "未能识别有效的语音指令"
    }
  }
  
  // ===== 步骤3-N：根据不同意图执行对应的仲裁逻辑 =====
  // 【文档对应】按照语义清单每个意图的流程图进行判断
  
  switch (intent) {
    // ----- 打开音乐 -----
    case "open_music":
      return handleOpenMusic(config, state, steps, stepNumber)
    
    // ----- 关闭音乐 -----
    case "close_music":
      return handleCloseMusic(config, state, steps, stepNumber)
    
    // ----- 返回播放界面 -----
    case "return_to_player":
      return handleReturnToPlayer(config, state, steps, stepNumber)
    
    // ----- 播放音乐（泛指） -----
    case "play_music":
      return handlePlayMusic(config, state, steps, stepNumber)
    
    // ----- 播放指定歌曲/歌手 -----
    case "play_song":
    case "play_artist":
      return handlePlaySpecific(config, state, steps, stepNumber, command, intent)
    
    // ----- 暂停 -----
    case "pause_music":
      return handlePauseMusic(config, state, steps, stepNumber)
    
    // ----- 继续播放 -----
    case "resume_music":
      return handleResumeMusic(config, state, steps, stepNumber)
    
    // ----- 下一首/上一首 -----
    case "next_song":
    case "prev_song":
      return handleSwitchSong(config, state, steps, stepNumber, intent)
    
    // ----- 快进/快退 -----
    case "fast_forward":
    case "rewind":
      return handleSeek(config, state, steps, stepNumber, intent)
    
    // ----- 打开/关闭播放列表 -----
    case "open_playlist":
    case "close_playlist":
      return handlePlaylist(config, state, steps, stepNumber, intent)
    
    // ----- 收藏/取消收藏 -----
    case "add_favorite":
    case "remove_favorite":
      return handleFavorite(config, state, steps, stepNumber, intent)
    
    // ----- 播放模式 -----
    case "loop_single":
    case "loop_all":
    case "shuffle":
      return handlePlayMode(config, state, steps, stepNumber, intent)
    
    // ----- 查询 -----
    case "query_song":
    case "query_artist":
      return handleQuery(config, state, steps, stepNumber, intent)
    
    default:
      return {
        isSingleScreenSingleSource: true,
        action: "暂不支持",
        actionCode: "NOT_SUPPORTED",
        ttsPromptId: "TTS_ERROR_003",
        ttsContent: "该功能暂不支持",
        targetScreen: "中控屏",
        steps,
        newStatus: state.status,
        error: "暂不支持的语义类型"
      }
  }
}

// ========================================================================
// 第四部分：各意图处理函数
// ========================================================================

/**
 * 处理"打开音乐"指令
 * 
 * 【文档对应】
 * 流程图：打开音乐 → 判断当前状态 → 执行动作
 * 
 * 判断条件：
 * 1. 若音乐应用已在前台(fg) → 提示"音乐已打开"
 * 2. 若音乐应用在后台(bg)且正在播放 → 切换到前台，继续播放
 * 3. 若音乐应用已关闭(closed) → 打开应用，显示首页
 */
function handleOpenMusic(
  config: SimulatorConfig,
  state: SingleSourceEndpointState,
  steps: ArbitrationStep[],
  stepNumber: number
): SingleSourceArbitrationResult {
  const appName = state.currentApp ? getAppName(state.currentApp) : "音乐"
  
  // 判断条件1：是否已在前台
  const isForeground = state.status === "fg_playing" || state.status === "fg_paused"
  steps.push({
    stepNumber: stepNumber++,
    title: "判断应用位置",
    description: "检查音乐应用是否已在前台显示",
    condition: "status 为 fg_playing 或 fg_paused",
    result: isForeground 
      ? `是，${appName}已在前台` 
      : `否，当前状态为：${getStatusLabel(state.status)}`,
    documentRef: "打开音乐流程图 - 分支1",
    passed: true
  })
  
  // 分支1：已在前台 → 提示已打开
  // 【文档对应】提示语ID: TTS_MUSIC_OPEN_001
  if (isForeground) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "音乐已在前台，无需重复打开",
      condition: "—",
      result: "播报提示：音乐已打开",
      documentRef: "提示语ID: TTS_MUSIC_OPEN_001",
      passed: true
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示音乐已打开",
      actionCode: "ALREADY_OPEN",
      ttsPromptId: "TTS_MUSIC_OPEN_001",
      ttsContent: `${appName}已经打开了`,
      targetScreen: "中控屏",
      steps,
      newStatus: state.status, // 状态不变
      error: null
    }
  }
  
  // 判断条件2：是否在后台播放
  const isBackgroundPlaying = state.status === "bg_playing"
  steps.push({
    stepNumber: stepNumber++,
    title: "判断后台播放状态",
    description: "检查音乐应用是否在后台且正在播放",
    condition: "status 为 bg_playing",
    result: isBackgroundPlaying 
      ? "是，正在后台播放" 
      : `否，当前状态为：${getStatusLabel(state.status)}`,
    documentRef: "打开音乐流程图 - 分支2",
    passed: true
  })
  
  // 分支2：后台播放 → 切换到前台
  // 【文档对应】提示语ID: TTS_MUSIC_OPEN_002
  if (isBackgroundPlaying) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "将音乐应用从后台切换到前台",
      condition: "—",
      result: "切换到前台，继续播放当前歌曲",
      documentRef: "提示语ID: TTS_MUSIC_OPEN_002",
      passed: true
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "切换到前台继续播放",
      actionCode: "BRING_TO_FOREGROUND",
      ttsPromptId: "TTS_MUSIC_OPEN_002",
      ttsContent: state.currentSongName 
        ? `好的，正在播放「${state.currentSongName}」` 
        : "好的，正在为你打开音乐",
      targetScreen: "中控屏",
      steps,
      newStatus: "fg_playing", // 状态变为前台播放
      error: null
    }
  }
  
  // 分支3：应用已关闭或后台暂停 → 打开应用
  // 【文档对应】
  // - 若有网络 → 打开在线音乐首页
  // - 若无网络但有缓存 → 打开缓存歌曲
  // - 若无网络且无缓存 → 提示网络异常
  
  // 检查网络状态
  steps.push({
    stepNumber: stepNumber++,
    title: "检查网络状态",
    description: "判断是否可以播放在线音乐",
    condition: "network 为 online",
    result: state.network === "online" 
      ? "网络正常" 
      : "网络离线",
    documentRef: "打开音乐流程图 - 网络检查",
    passed: state.network === "online" || state.hasCache
  })
  
  // 无网络且无缓存
  // 【文档对应】提示语ID: TTS_MUSIC_OPEN_003
  if (state.network === "offline" && !state.hasCache && !state.hasLocalMusic) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "网络不可用且无本地资源",
      condition: "—",
      result: "提示网络异常，无法播放",
      documentRef: "提示语ID: TTS_MUSIC_OPEN_003",
      passed: false
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示网络异常",
      actionCode: "NETWORK_ERROR",
      ttsPromptId: "TTS_MUSIC_OPEN_003",
      ttsContent: "当前网络不可用，无法打开在线音乐",
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: "网络不可用"
    }
  }
  
  // 正常打开
  // 【文档对应】提示语ID: TTS_MUSIC_OPEN_004
  steps.push({
    stepNumber: stepNumber++,
    title: "执行动作",
    description: "打开音乐应用",
    condition: "—",
    result: "打开音乐应用首页",
    documentRef: "提示语ID: TTS_MUSIC_OPEN_004",
    passed: true
  })
  
  return {
    isSingleScreenSingleSource: true,
    action: "打开音乐应用",
    actionCode: "OPEN_APP",
    ttsPromptId: "TTS_MUSIC_OPEN_004",
    ttsContent: "好的，正在为你打开音乐",
    targetScreen: "中控屏",
    steps,
    newStatus: "fg_paused", // 打开后默认前台暂停状态
    error: null
  }
}

/**
 * 处理"关闭音乐"指令
 * 
 * 【文档对应】
 * 流程图：关闭音乐 → 判断当前状态 → 执行动作
 * 
 * 判断条件：
 * 1. 若音乐应用未运行(closed) → 提示"音乐已关闭"
 * 2. 若音乐应用正在运行 → 关闭应用，停止播放
 */
function handleCloseMusic(
  config: SimulatorConfig,
  state: SingleSourceEndpointState,
  steps: ArbitrationStep[],
  stepNumber: number
): SingleSourceArbitrationResult {
  // 判断是否已关闭
  const isClosed = state.status === "closed"
  steps.push({
    stepNumber: stepNumber++,
    title: "判断应用状态",
    description: "检查音乐应用是否已关闭",
    condition: "status 为 closed",
    result: isClosed ? "是，音乐应用未运行" : `否，当前状态为：${getStatusLabel(state.status)}`,
    documentRef: "关闭音乐流程图 - 分支1",
    passed: true
  })
  
  // 分支1：已关闭
  // 【文档对应】提示语ID: TTS_MUSIC_CLOSE_001
  if (isClosed) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "音乐应用未运行，无需关闭",
      condition: "—",
      result: "播报提示：音乐已关闭",
      documentRef: "提示语ID: TTS_MUSIC_CLOSE_001",
      passed: true
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示音乐已关闭",
      actionCode: "ALREADY_CLOSED",
      ttsPromptId: "TTS_MUSIC_CLOSE_001",
      ttsContent: "音乐已经关闭了",
      targetScreen: "中控屏",
      steps,
      newStatus: "closed",
      error: null
    }
  }
  
  // 分支2：执行关闭
  // 【文档对应】提示语ID: TTS_MUSIC_CLOSE_002
  steps.push({
    stepNumber: stepNumber++,
    title: "执行动作",
    description: "关闭音乐应用，停止播放",
    condition: "—",
    result: "关闭应用，返回桌面/上级页面",
    documentRef: "提示语ID: TTS_MUSIC_CLOSE_002",
    passed: true
  })
  
  return {
    isSingleScreenSingleSource: true,
    action: "关闭音乐应用",
    actionCode: "CLOSE_APP",
    ttsPromptId: "TTS_MUSIC_CLOSE_002",
    ttsContent: "好的，已为你关闭音乐",
    targetScreen: "中控屏",
    steps,
    newStatus: "closed",
    error: null
  }
}

/**
 * 处理"返回播放界面"指令
 * 
 * 【文档对应】
 * 流程图：返回播放界面 → 判断当前状态 → 执行动作
 * 
 * 判断条件：
 * 1. 若音乐应用未运行 → 提示"请先打开音乐"
 * 2. 若已在播放界面 → 提示"已在播放界面"
 * 3. 若在其他页面 → 返回播放界面
 */
function handleReturnToPlayer(
  config: SimulatorConfig,
  state: SingleSourceEndpointState,
  steps: ArbitrationStep[],
  stepNumber: number
): SingleSourceArbitrationResult {
  // 判断应用是否运行
  const isRunning = state.status !== "closed"
  steps.push({
    stepNumber: stepNumber++,
    title: "判断应用状态",
    description: "检查音乐应用是否正在运行",
    condition: "status 不为 closed",
    result: isRunning ? "是，应用正在运行" : "否，应用未启动",
    documentRef: "返回播放界面流程图 - 分支1",
    passed: isRunning
  })
  
  // 分支1：应用未运行
  // 【文档对应】提示语ID: TTS_MUSIC_RETURN_001
  if (!isRunning) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "应用未运行，无法返回播放界面",
      condition: "—",
      result: "提示：请先打开音乐",
      documentRef: "提示语ID: TTS_MUSIC_RETURN_001",
      passed: false
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示请先打开音乐",
      actionCode: "APP_NOT_RUNNING",
      ttsPromptId: "TTS_MUSIC_RETURN_001",
      ttsContent: "请先打开音乐应用",
      targetScreen: "中控屏",
      steps,
      newStatus: "closed",
      error: "应用未运行"
    }
  }
  
  // 分支2：返回播放界面
  // 【文档对应】提示语ID: TTS_MUSIC_RETURN_002
  steps.push({
    stepNumber: stepNumber++,
    title: "执行动作",
    description: "返回到音乐播放界面",
    condition: "—",
    result: "导航到播放主界面",
    documentRef: "提示语ID: TTS_MUSIC_RETURN_002",
    passed: true
  })
  
  return {
    isSingleScreenSingleSource: true,
    action: "返回播放界面",
    actionCode: "RETURN_TO_PLAYER",
    ttsPromptId: "TTS_MUSIC_RETURN_002",
    ttsContent: "好的，已返回播放界面",
    targetScreen: "中控屏",
    steps,
    newStatus: state.status, // 保持播放状态不变
    error: null
  }
}

/**
 * 处理"播放音乐"（泛指）指令
 * 
 * 【文档对应】
 * 流程图：播放音乐 → 检查状态 → 执行播放
 * 
 * 判断条件：
 * 1. 若正在播放 → 提示"正在播放中"
 * 2. 若已暂停 → 继续播放
 * 3. 若应用未运行 → 打开应用并播放推荐歌曲
 */
function handlePlayMusic(
  config: SimulatorConfig,
  state: SingleSourceEndpointState,
  steps: ArbitrationStep[],
  stepNumber: number
): SingleSourceArbitrationResult {
  // 判断是否正在播放
  const isPlaying = state.status === "fg_playing" || state.status === "bg_playing"
  steps.push({
    stepNumber: stepNumber++,
    title: "判断播放状态",
    description: "检查是否已有音乐在播放",
    condition: "status 包含 playing",
    result: isPlaying 
      ? `是，正在播放：${state.currentSongName || "未知歌曲"}` 
      : "否，当前未在播放",
    documentRef: "播放音乐流程图 - 分支1",
    passed: true
  })
  
  // 分支1：正在播放
  // 【文档对应】提示语ID: TTS_MUSIC_PLAY_001
  if (isPlaying) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "音乐已在播放中",
      condition: "—",
      result: "提示当前播放歌曲",
      documentRef: "提示语ID: TTS_MUSIC_PLAY_001",
      passed: true
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示正在播放",
      actionCode: "ALREADY_PLAYING",
      ttsPromptId: "TTS_MUSIC_PLAY_001",
      ttsContent: state.currentSongName 
        ? `正在为你播放「${state.currentSongName}」` 
        : "音乐正在播放中",
      targetScreen: "中控屏",
      steps,
      newStatus: "fg_playing", // 确保切换到前台
      error: null
    }
  }
  
  // 判断是否已暂停
  const isPaused = state.status === "fg_paused" || state.status === "bg_paused"
  steps.push({
    stepNumber: stepNumber++,
    title: "判断暂停状态",
    description: "检查是否有已暂停的音乐",
    condition: "status 包含 paused",
    result: isPaused 
      ? `是，已暂停：${state.currentSongName || "未知歌曲"}` 
      : "否，无已暂停内容",
    documentRef: "播放音乐流程图 - 分支2",
    passed: true
  })
  
  // 分支2：已暂停 → 继续播放
  // 【文档对应】提示语ID: TTS_MUSIC_PLAY_002
  if (isPaused && state.currentSongName) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "继续播放已暂停的歌曲",
      condition: "—",
      result: `继续播放「${state.currentSongName}」`,
      documentRef: "提示语ID: TTS_MUSIC_PLAY_002",
      passed: true
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "继续播放",
      actionCode: "RESUME_PLAY",
      ttsPromptId: "TTS_MUSIC_PLAY_002",
      ttsContent: `好的，继续播放「${state.currentSongName}」`,
      targetScreen: "中控屏",
      steps,
      newStatus: "fg_playing",
      error: null
    }
  }
  
  // 检查网络状态
  steps.push({
    stepNumber: stepNumber++,
    title: "检查网络状态",
    description: "判断是否可以播放在线音乐",
    condition: "network 为 online 或有本地资源",
    result: state.network === "online" 
      ? "网络正常，可播放在线音乐" 
      : state.hasCache || state.hasLocalMusic 
        ? "离线，可播放本地/缓存音乐" 
        : "离线且无本地资源",
    documentRef: "播放音乐流程图 - 网络检查",
    passed: state.network === "online" || state.hasCache || state.hasLocalMusic
  })
  
  // 无网络且无资源
  // 【文档对应】提示语ID: TTS_MUSIC_PLAY_003
  if (state.network === "offline" && !state.hasCache && !state.hasLocalMusic) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "无法播放音乐",
      condition: "—",
      result: "提示网络异常",
      documentRef: "提示语ID: TTS_MUSIC_PLAY_003",
      passed: false
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示网络异常",
      actionCode: "NETWORK_ERROR",
      ttsPromptId: "TTS_MUSIC_PLAY_003",
      ttsContent: "当前网络不可用，无法播放在线音乐",
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: "网络不可用"
    }
  }
  
  // 分支3：正常播放
  // 【文档对应】提示语ID: TTS_MUSIC_PLAY_004
  steps.push({
    stepNumber: stepNumber++,
    title: "执行动作",
    description: "开始播放音乐",
    condition: "—",
    result: "播放推荐歌曲/上次播放",
    documentRef: "提示语ID: TTS_MUSIC_PLAY_004",
    passed: true
  })
  
  return {
    isSingleScreenSingleSource: true,
    action: "播放音乐",
    actionCode: "PLAY_MUSIC",
    ttsPromptId: "TTS_MUSIC_PLAY_004",
    ttsContent: "好的，正在为你播放音乐",
    targetScreen: "中控屏",
    steps,
    newStatus: "fg_playing",
    error: null
  }
}

/**
 * 处理播放指定内容（歌曲/歌手）
 * 
 * 【文档对应】
 * 流程图：播放xxx → 搜索资源 → 播放
 */
function handlePlaySpecific(
  config: SimulatorConfig,
  state: SingleSourceEndpointState,
  steps: ArbitrationStep[],
  stepNumber: number,
  command: string,
  intent: "play_song" | "play_artist"
): SingleSourceArbitrationResult {
  // 提取搜索关键词
  let keyword = ""
  if (intent === "play_artist") {
    // 提取"播放xxx的歌"中的xxx
    const match = command.match(/^(播放|放|来首?)(.+)的歌$/)
    keyword = match ? match[2] : command
  } else {
    // 提取"播放xxx"中的xxx
    const match = command.match(/^(播放|放|我要听|我想听)(.+)$/)
    keyword = match ? match[2] : command
  }
  
  steps.push({
    stepNumber: stepNumber++,
    title: "解析搜索关键词",
    description: `从指令中提取搜索内容`,
    condition: "—",
    result: `关键词：${keyword}`,
    documentRef: "播放指定内容流程图 - 语义槽提取",
    passed: true
  })
  
  // 检查网络
  steps.push({
    stepNumber: stepNumber++,
    title: "检查网络状态",
    description: "搜索需要网络连接",
    condition: "network 为 online",
    result: state.network === "online" ? "网络正常" : "网络离线",
    documentRef: "播放指定内容流程图 - 网络检查",
    passed: state.network === "online"
  })
  
  if (state.network === "offline") {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "无法搜索在线资源",
      condition: "—",
      result: "提示网络异常",
      documentRef: "提示语ID: TTS_MUSIC_SEARCH_001",
      passed: false
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示网络异常",
      actionCode: "NETWORK_ERROR",
      ttsPromptId: "TTS_MUSIC_SEARCH_001",
      ttsContent: "当前网络不可用，无法搜索音乐",
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: "网络不可用"
    }
  }
  
  // 执行搜索并播放
  steps.push({
    stepNumber: stepNumber++,
    title: "执行动作",
    description: `搜索并播放：${keyword}`,
    condition: "—",
    result: intent === "play_artist" 
      ? `播放${keyword}的热门歌曲` 
      : `播放「${keyword}」`,
    documentRef: "提示语ID: TTS_MUSIC_PLAY_SPECIFIC_001",
    passed: true
  })
  
  return {
    isSingleScreenSingleSource: true,
    action: intent === "play_artist" ? `播放${keyword}的歌` : `播放「${keyword}」`,
    actionCode: "PLAY_SPECIFIC",
    ttsPromptId: "TTS_MUSIC_PLAY_SPECIFIC_001",
    ttsContent: intent === "play_artist" 
      ? `好的，正在为你播放${keyword}的歌` 
      : `好的，正在为你播放「${keyword}」`,
    targetScreen: "中控屏",
    steps,
    newStatus: "fg_playing",
    error: null
  }
}

/**
 * 处理"暂停"指令
 * 
 * 【文档对应】
 * 流程图：暂停 → 判断播放状态 → 执行暂停
 */
function handlePauseMusic(
  config: SimulatorConfig,
  state: SingleSourceEndpointState,
  steps: ArbitrationStep[],
  stepNumber: number
): SingleSourceArbitrationResult {
  // 判断是否正在播放
  const isPlaying = state.status === "fg_playing" || state.status === "bg_playing"
  steps.push({
    stepNumber: stepNumber++,
    title: "判断播放状态",
    description: "检查是否有音乐正在播放",
    condition: "status 包含 playing",
    result: isPlaying ? "是，正在播放" : "否，未在播放",
    documentRef: "暂停流程图 - 分支1",
    passed: isPlaying
  })
  
  // 未在播放
  // 【文档对应】提示语ID: TTS_MUSIC_PAUSE_001
  if (!isPlaying) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "当前没有播放中的音乐",
      condition: "—",
      result: "提示：当前没有正在播放的音乐",
      documentRef: "提示语ID: TTS_MUSIC_PAUSE_001",
      passed: false
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示无内容播放",
      actionCode: "NOTHING_PLAYING",
      ttsPromptId: "TTS_MUSIC_PAUSE_001",
      ttsContent: "当前没有正在播放的音乐",
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: null
    }
  }
  
  // 执行暂停
  // 【文档对应】提示语ID: TTS_MUSIC_PAUSE_002
  steps.push({
    stepNumber: stepNumber++,
    title: "执行动作",
    description: "暂停当前播放",
    condition: "—",
    result: "暂停播放",
    documentRef: "提示语ID: TTS_MUSIC_PAUSE_002",
    passed: true
  })
  
  return {
    isSingleScreenSingleSource: true,
    action: "暂停播放",
    actionCode: "PAUSE",
    ttsPromptId: "TTS_MUSIC_PAUSE_002",
    ttsContent: "好的，已暂停",
    targetScreen: "中控屏",
    steps,
    newStatus: state.status === "fg_playing" ? "fg_paused" : "bg_paused",
    error: null
  }
}

/**
 * 处理"继续播放"指令
 * 
 * 【文档对应】
 * 流程图：继续播放 → 判断暂停状态 → 执行继续
 */
function handleResumeMusic(
  config: SimulatorConfig,
  state: SingleSourceEndpointState,
  steps: ArbitrationStep[],
  stepNumber: number
): SingleSourceArbitrationResult {
  // 判断是否已暂停
  const isPaused = state.status === "fg_paused" || state.status === "bg_paused"
  const isPlaying = state.status === "fg_playing" || state.status === "bg_playing"
  
  steps.push({
    stepNumber: stepNumber++,
    title: "判断暂停状态",
    description: "检查是否有已暂停的音乐",
    condition: "status 包含 paused",
    result: isPaused 
      ? `是，已暂停：${state.currentSongName || "未知歌曲"}` 
      : isPlaying 
        ? "正在播放中" 
        : "无已暂停内容",
    documentRef: "继续播放流程图 - 分支1",
    passed: isPaused
  })
  
  // 正在播放
  // 【文档对应】提示语ID: TTS_MUSIC_RESUME_001
  if (isPlaying) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "音乐已在播放中",
      condition: "—",
      result: "提示：已在播放",
      documentRef: "提示语ID: TTS_MUSIC_RESUME_001",
      passed: true
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示已在播放",
      actionCode: "ALREADY_PLAYING",
      ttsPromptId: "TTS_MUSIC_RESUME_001",
      ttsContent: "音乐已经在播放了",
      targetScreen: "中控屏",
      steps,
      newStatus: "fg_playing",
      error: null
    }
  }
  
  // 无内容可继续
  // 【文档对应】提示语ID: TTS_MUSIC_RESUME_002
  if (!isPaused) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "没有可继续的内容",
      condition: "—",
      result: "提示：没有可继续播放的内容",
      documentRef: "提示语ID: TTS_MUSIC_RESUME_002",
      passed: false
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示无可继续内容",
      actionCode: "NOTHING_TO_RESUME",
      ttsPromptId: "TTS_MUSIC_RESUME_002",
      ttsContent: "没有可继续播放的内容",
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: null
    }
  }
  
  // 执行继续
  // 【文档对应】提示语ID: TTS_MUSIC_RESUME_003
  steps.push({
    stepNumber: stepNumber++,
    title: "执行动作",
    description: "继续播放已暂停的歌曲",
    condition: "—",
    result: `继续播放「${state.currentSongName || "上次播放"}」`,
    documentRef: "提示语ID: TTS_MUSIC_RESUME_003",
    passed: true
  })
  
  return {
    isSingleScreenSingleSource: true,
    action: "继续播放",
    actionCode: "RESUME",
    ttsPromptId: "TTS_MUSIC_RESUME_003",
    ttsContent: state.currentSongName 
      ? `好的，继续播放「${state.currentSongName}」` 
      : "好的，继续播放",
    targetScreen: "中控屏",
    steps,
    newStatus: state.status === "fg_paused" ? "fg_playing" : "bg_playing",
    error: null
  }
}

/**
 * 处理"下一首/上一首"指令
 * 
 * 【文档对应】
 * 流程图：切歌 → 判断播放状态 → 切换歌曲
 */
function handleSwitchSong(
  config: SimulatorConfig,
  state: SingleSourceEndpointState,
  steps: ArbitrationStep[],
  stepNumber: number,
  intent: "next_song" | "prev_song"
): SingleSourceArbitrationResult {
  const isNext = intent === "next_song"
  const actionLabel = isNext ? "下一首" : "上一首"
  
  // 判断是否有播放内容
  const hasContent = state.status !== "closed" && state.currentSongName !== null
  steps.push({
    stepNumber: stepNumber++,
    title: "判断播放内容",
    description: "检查是否有播放列表内容",
    condition: "应用已运行且有当前歌曲",
    result: hasContent 
      ? `有播放内容：${state.currentSongName}` 
      : "无播放内容",
    documentRef: `${actionLabel}流程图 - 分支1`,
    passed: hasContent
  })
  
  // 无播放内容
  // 【文档对应】提示语ID: TTS_MUSIC_SWITCH_001
  if (!hasContent) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "当前无播放列表",
      condition: "—",
      result: "提示：请先播放音乐",
      documentRef: "提示语ID: TTS_MUSIC_SWITCH_001",
      passed: false
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示无播放列表",
      actionCode: "NO_PLAYLIST",
      ttsPromptId: "TTS_MUSIC_SWITCH_001",
      ttsContent: "请先播放音乐",
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: null
    }
  }
  
  // 执行切换
  // 【文档对应】提示语ID: TTS_MUSIC_SWITCH_002/003
  steps.push({
    stepNumber: stepNumber++,
    title: "执行动作",
    description: `切换到${actionLabel}`,
    condition: "—",
    result: `切换到${actionLabel}并播放`,
    documentRef: `提示语ID: TTS_MUSIC_SWITCH_00${isNext ? "2" : "3"}`,
    passed: true
  })
  
  return {
    isSingleScreenSingleSource: true,
    action: `切换${actionLabel}`,
    actionCode: isNext ? "NEXT_SONG" : "PREV_SONG",
    ttsPromptId: `TTS_MUSIC_SWITCH_00${isNext ? "2" : "3"}`,
    ttsContent: `好的，${actionLabel}`,
    targetScreen: "中控屏",
    steps,
    newStatus: "fg_playing",
    error: null
  }
}

/**
 * 处理"快进/快退"指令
 * 
 * 【文档对应】
 * 流程图：快进/快退 → 判断播放状态 → 执行操作
 */
function handleSeek(
  config: SimulatorConfig,
  state: SingleSourceEndpointState,
  steps: ArbitrationStep[],
  stepNumber: number,
  intent: "fast_forward" | "rewind"
): SingleSourceArbitrationResult {
  const isForward = intent === "fast_forward"
  const actionLabel = isForward ? "快进" : "快退"
  
  // 判断是否正在播放
  const isPlayingOrPaused = state.status !== "closed"
  steps.push({
    stepNumber: stepNumber++,
    title: "判断播放状态",
    description: "检查是否有播放中的内容",
    condition: "应用已运行",
    result: isPlayingOrPaused ? "有播放内容" : "应用未运行",
    documentRef: `${actionLabel}流程图 - 分支1`,
    passed: isPlayingOrPaused
  })
  
  // 无播放内容
  if (!isPlayingOrPaused) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "无法执行快进/快退",
      condition: "—",
      result: "提示：请先播放音乐",
      documentRef: "提示语ID: TTS_MUSIC_SEEK_001",
      passed: false
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示无播放内容",
      actionCode: "NOTHING_PLAYING",
      ttsPromptId: "TTS_MUSIC_SEEK_001",
      ttsContent: "请先播放音乐",
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: null
    }
  }
  
  // 执行快进/快退
  steps.push({
    stepNumber: stepNumber++,
    title: "执行动作",
    description: `执行${actionLabel}30秒`,
    condition: "—",
    result: `${actionLabel}30秒`,
    documentRef: `提示语ID: TTS_MUSIC_SEEK_00${isForward ? "2" : "3"}`,
    passed: true
  })
  
  return {
    isSingleScreenSingleSource: true,
    action: `${actionLabel}30秒`,
    actionCode: isForward ? "FAST_FORWARD" : "REWIND",
    ttsPromptId: `TTS_MUSIC_SEEK_00${isForward ? "2" : "3"}`,
    ttsContent: `好的，${actionLabel}30秒`,
    targetScreen: "中控屏",
    steps,
    newStatus: state.status,
    error: null
  }
}

/**
 * 处理"打开/关闭播放列表"指令
 * 
 * 【文档对应】
 * 流程图：播放列表操作 → 判断状态 → 执行操作
 */
function handlePlaylist(
  config: SimulatorConfig,
  state: SingleSourceEndpointState,
  steps: ArbitrationStep[],
  stepNumber: number,
  intent: "open_playlist" | "close_playlist"
): SingleSourceArbitrationResult {
  const isOpen = intent === "open_playlist"
  const actionLabel = isOpen ? "打开" : "关闭"
  
  // 判断应用是否运行
  const isRunning = state.status !== "closed"
  steps.push({
    stepNumber: stepNumber++,
    title: "判断应用状态",
    description: "检查音乐应用是否运行",
    condition: "status 不为 closed",
    result: isRunning ? "应用正在运行" : "应用未运行",
    documentRef: `${actionLabel}播放列表流程图 - 分支1`,
    passed: isRunning
  })
  
  // 应用未运行
  if (!isRunning) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "无法操作播放列表",
      condition: "—",
      result: "提示：请先打开音乐",
      documentRef: "提示语ID: TTS_MUSIC_PLAYLIST_001",
      passed: false
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示请先打开音乐",
      actionCode: "APP_NOT_RUNNING",
      ttsPromptId: "TTS_MUSIC_PLAYLIST_001",
      ttsContent: "请先打开音乐应用",
      targetScreen: "中控屏",
      steps,
      newStatus: "closed",
      error: "应用未运行"
    }
  }
  
  // 判断当前播放列表状态
  const isCurrentlyOpen = state.playlistStatus === "opened"
  steps.push({
    stepNumber: stepNumber++,
    title: "判断播放列表状态",
    description: "检查播放列表当前是否打开",
    condition: "playlistStatus 状态",
    result: isCurrentlyOpen ? "播放列表已打开" : "播放列表已关闭",
    documentRef: `${actionLabel}播放列表流程图 - 分支2`,
    passed: true
  })
  
  // 重复操作
  if ((isOpen && isCurrentlyOpen) || (!isOpen && !isCurrentlyOpen)) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "无需重复操作",
      condition: "—",
      result: `播放列表已经${isOpen ? "打开" : "关闭"}了`,
      documentRef: `提示语ID: TTS_MUSIC_PLAYLIST_00${isOpen ? "2" : "3"}`,
      passed: true
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: `播放列表已${isOpen ? "打开" : "关闭"}`,
      actionCode: isOpen ? "PLAYLIST_ALREADY_OPEN" : "PLAYLIST_ALREADY_CLOSED",
      ttsPromptId: `TTS_MUSIC_PLAYLIST_00${isOpen ? "2" : "3"}`,
      ttsContent: `播放列表已经${isOpen ? "打开" : "关闭"}了`,
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: null
    }
  }
  
  // 执行操作
  steps.push({
    stepNumber: stepNumber++,
    title: "执行动作",
    description: `${actionLabel}播放列表`,
    condition: "—",
    result: `${actionLabel}播放列表`,
    documentRef: `提示语ID: TTS_MUSIC_PLAYLIST_00${isOpen ? "4" : "5"}`,
    passed: true
  })
  
  return {
    isSingleScreenSingleSource: true,
    action: `${actionLabel}播放列表`,
    actionCode: isOpen ? "OPEN_PLAYLIST" : "CLOSE_PLAYLIST",
    ttsPromptId: `TTS_MUSIC_PLAYLIST_00${isOpen ? "4" : "5"}`,
    ttsContent: `好的，已${actionLabel}播放列表`,
    targetScreen: "中控屏",
    steps,
    newStatus: state.status,
    error: null
  }
}

/**
 * 处理"收藏/取消收藏"指令
 * 
 * 【文档对应】
 * 流程图：收藏操作 → 判断登录状态 → 判断收藏状态 → 执行操作
 */
function handleFavorite(
  config: SimulatorConfig,
  state: SingleSourceEndpointState,
  steps: ArbitrationStep[],
  stepNumber: number,
  intent: "add_favorite" | "remove_favorite"
): SingleSourceArbitrationResult {
  const isAdd = intent === "add_favorite"
  const actionLabel = isAdd ? "收藏" : "取消收藏"
  
  // 判断是否有播放内容
  const hasContent = state.currentSongName !== null
  steps.push({
    stepNumber: stepNumber++,
    title: "判断播放内容",
    description: "检查是否有当前歌曲",
    condition: "currentSongName 不为空",
    result: hasContent ? `当前歌曲：${state.currentSongName}` : "无当前歌曲",
    documentRef: `${actionLabel}流程图 - 分支1`,
    passed: hasContent
  })
  
  // 无播放内容
  if (!hasContent) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "没有可收藏的歌曲",
      condition: "—",
      result: "提示：请先播放音乐",
      documentRef: "提示语ID: TTS_MUSIC_FAVORITE_001",
      passed: false
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示无可收藏内容",
      actionCode: "NO_SONG_TO_FAVORITE",
      ttsPromptId: "TTS_MUSIC_FAVORITE_001",
      ttsContent: "请先播放一首歌曲",
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: null
    }
  }
  
  // 判断登录状态
  steps.push({
    stepNumber: stepNumber++,
    title: "判断登录状态",
    description: "收藏功能需要登录",
    condition: "login 为 logged_in",
    result: state.login === "logged_in" ? "已登录" : "未登录",
    documentRef: `${actionLabel}流程图 - 登录检查`,
    passed: state.login === "logged_in"
  })
  
  // 未登录
  if (state.login !== "logged_in") {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "需要登录才能收藏",
      condition: "—",
      result: "提示：请先登录",
      documentRef: "提示语ID: TTS_MUSIC_FAVORITE_002",
      passed: false
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示请先登录",
      actionCode: "LOGIN_REQUIRED",
      ttsPromptId: "TTS_MUSIC_FAVORITE_002",
      ttsContent: "请先登录账号才能收藏歌曲",
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: "需要登录"
    }
  }
  
  // 判断当前收藏状态
  const isCurrentlyFavorited = state.favoriteStatus === "favorited"
  steps.push({
    stepNumber: stepNumber++,
    title: "判断收藏状态",
    description: "检查当前歌曲是否已收藏",
    condition: "favoriteStatus 状态",
    result: isCurrentlyFavorited ? "已收藏" : "未收藏",
    documentRef: `${actionLabel}流程图 - 分支2`,
    passed: true
  })
  
  // 重复操作
  if ((isAdd && isCurrentlyFavorited) || (!isAdd && !isCurrentlyFavorited)) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "无需重复操作",
      condition: "—",
      result: isAdd ? "歌曲已在收藏中" : "歌曲未被收藏",
      documentRef: `提示语ID: TTS_MUSIC_FAVORITE_00${isAdd ? "3" : "4"}`,
      passed: true
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: isAdd ? "已在收藏中" : "未被收藏",
      actionCode: isAdd ? "ALREADY_FAVORITED" : "NOT_FAVORITED",
      ttsPromptId: `TTS_MUSIC_FAVORITE_00${isAdd ? "3" : "4"}`,
      ttsContent: isAdd 
        ? `「${state.currentSongName}」已在您的收藏中` 
        : `「${state.currentSongName}」未被收藏`,
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: null
    }
  }
  
  // 执行收藏/取消收藏
  steps.push({
    stepNumber: stepNumber++,
    title: "执行动作",
    description: `${actionLabel}当前歌曲`,
    condition: "—",
    result: `${actionLabel}「${state.currentSongName}」`,
    documentRef: `提示语ID: TTS_MUSIC_FAVORITE_00${isAdd ? "5" : "6"}`,
    passed: true
  })
  
  return {
    isSingleScreenSingleSource: true,
    action: actionLabel,
    actionCode: isAdd ? "ADD_FAVORITE" : "REMOVE_FAVORITE",
    ttsPromptId: `TTS_MUSIC_FAVORITE_00${isAdd ? "5" : "6"}`,
    ttsContent: isAdd 
      ? `好的，已收藏「${state.currentSongName}」` 
      : `好的，已取消收藏「${state.currentSongName}」`,
    targetScreen: "中控屏",
    steps,
    newStatus: state.status,
    error: null
  }
}

/**
 * 处理播放模式切换指令
 * 
 * 【文档对应】
 * 流程图：切换播放模式 → 执行切换
 */
function handlePlayMode(
  config: SimulatorConfig,
  state: SingleSourceEndpointState,
  steps: ArbitrationStep[],
  stepNumber: number,
  intent: "loop_single" | "loop_all" | "shuffle"
): SingleSourceArbitrationResult {
  const modeLabels: Record<typeof intent, string> = {
    loop_single: "单曲循环",
    loop_all: "列表循环",
    shuffle: "随机播放"
  }
  const modeLabel = modeLabels[intent]
  
  // 判断是否有播放内容
  const isRunning = state.status !== "closed"
  steps.push({
    stepNumber: stepNumber++,
    title: "判断应用状态",
    description: "检查音乐应用是否运行",
    condition: "status 不为 closed",
    result: isRunning ? "应用正在运行" : "应用未运行",
    documentRef: "播放模式流程图 - 分支1",
    passed: isRunning
  })
  
  if (!isRunning) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "无法切换播放模式",
      condition: "—",
      result: "提示：请先打开音乐",
      documentRef: "提示语ID: TTS_MUSIC_MODE_001",
      passed: false
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示请先打开音乐",
      actionCode: "APP_NOT_RUNNING",
      ttsPromptId: "TTS_MUSIC_MODE_001",
      ttsContent: "请先打开音乐应用",
      targetScreen: "中控屏",
      steps,
      newStatus: "closed",
      error: "应用未运行"
    }
  }
  
  // 执行切换
  steps.push({
    stepNumber: stepNumber++,
    title: "执行动作",
    description: `切换到${modeLabel}模式`,
    condition: "—",
    result: `已切换到${modeLabel}`,
    documentRef: "提示语ID: TTS_MUSIC_MODE_002",
    passed: true
  })
  
  return {
    isSingleScreenSingleSource: true,
    action: `切换到${modeLabel}`,
    actionCode: intent.toUpperCase(),
    ttsPromptId: "TTS_MUSIC_MODE_002",
    ttsContent: `好的，已切换到${modeLabel}模式`,
    targetScreen: "中控屏",
    steps,
    newStatus: state.status,
    error: null
  }
}

/**
 * 处理查询指令
 * 
 * 【文档对应】
 * 流程图：查询当前歌曲/歌手 → 返回信息
 */
function handleQuery(
  config: SimulatorConfig,
  state: SingleSourceEndpointState,
  steps: ArbitrationStep[],
  stepNumber: number,
  intent: "query_song" | "query_artist"
): SingleSourceArbitrationResult {
  const isQuerySong = intent === "query_song"
  const queryLabel = isQuerySong ? "歌曲" : "歌手"
  
  // 判断是否有播放内容
  const hasContent = state.currentSongName !== null
  steps.push({
    stepNumber: stepNumber++,
    title: "判断播放内容",
    description: "检查是否有当前播放歌曲",
    condition: "currentSongName 不为空",
    result: hasContent ? `当前歌曲：${state.currentSongName}` : "无当前歌曲",
    documentRef: `查询${queryLabel}流程图 - 分支1`,
    passed: hasContent
  })
  
  // 无播放内容
  if (!hasContent) {
    steps.push({
      stepNumber: stepNumber++,
      title: "执行动作",
      description: "没有正在播放的歌曲",
      condition: "—",
      result: "提示：当前没有播放歌曲",
      documentRef: "提示语ID: TTS_MUSIC_QUERY_001",
      passed: false
    })
    
    return {
      isSingleScreenSingleSource: true,
      action: "提示无播放内容",
      actionCode: "NO_PLAYING_CONTENT",
      ttsPromptId: "TTS_MUSIC_QUERY_001",
      ttsContent: "当前没有正在播放的歌曲",
      targetScreen: "中控屏",
      steps,
      newStatus: state.status,
      error: null
    }
  }
  
  // 返回查询结果
  const queryResult = isQuerySong 
    ? `这首歌是「${state.currentSongName}」` 
    : `这首歌是${state.currentArtist || "未知歌手"}演唱的`
  
  steps.push({
    stepNumber: stepNumber++,
    title: "执行动作",
    description: `返回${queryLabel}信息`,
    condition: "—",
    result: queryResult,
    documentRef: `提示语ID: TTS_MUSIC_QUERY_00${isQuerySong ? "2" : "3"}`,
    passed: true
  })
  
  return {
    isSingleScreenSingleSource: true,
    action: `查询${queryLabel}`,
    actionCode: isQuerySong ? "QUERY_SONG" : "QUERY_ARTIST",
    ttsPromptId: `TTS_MUSIC_QUERY_00${isQuerySong ? "2" : "3"}`,
    ttsContent: queryResult,
    targetScreen: "中控屏",
    steps,
    newStatus: state.status,
    error: null
  }
}

// ========================================================================
// 第五部分：辅助函数
// ========================================================================

/**
 * 获取语义意图的中文标签
 */
function getIntentLabel(intent: MusicSemanticIntent): string {
  const labels: Record<MusicSemanticIntent, string> = {
    open_music: "打开音乐",
    close_music: "关闭音乐",
    return_to_player: "返回播放界面",
    play_music: "播放音乐",
    play_song: "播放指定歌曲",
    play_artist: "播放指定歌手",
    play_album: "播放指定专辑",
    play_playlist: "播放指定歌单",
    pause_music: "暂停",
    resume_music: "继续播放",
    stop_music: "停止播放",
    next_song: "下一首",
    prev_song: "上一首",
    fast_forward: "快进",
    rewind: "快退",
    open_playlist: "打开播放列表",
    close_playlist: "关闭播放列表",
    add_favorite: "收藏",
    remove_favorite: "取消收藏",
    loop_single: "单曲循环",
    loop_all: "列表循环",
    shuffle: "随机播放",
    query_song: "查询歌曲",
    query_artist: "查询歌手"
  }
  return labels[intent]
}

/**
 * 获取端状态的中文标签
 */
function getStatusLabel(status: EndpointStatus): string {
  const labels: Record<EndpointStatus, string> = {
    fg_playing: "前台播放中",
    fg_paused: "前台已暂停",
    bg_playing: "后台播放中",
    bg_paused: "后台已暂停",
    closed: "应用已关闭"
  }
  return labels[status]
}

/**
 * 获取应用名称
 */
function getAppName(appId: AppId): string {
  const names: Record<AppId, string> = {
    netease: "网易云音乐",
    qq_music: "QQ音乐",
    ximalaya: "喜马拉雅",
    yunting: "云听",
    iqiyi: "爱奇艺",
    bilibili: "哔哩哔哩",
    migu: "咪咕视频",
    mangguo_tv: "芒果TV",
    quanmin_k: "全民K歌",
    leishi: "雷石KTV",
    changba: "唱吧"
  }
  return names[appId] || appId
}

// ========================================================================
// 第六部分：默认状态和导出
// ========================================================================

/**
 * 创建默认端状态
 * 
 * 【用于模拟器初始化】
 * 提供一个合理的默认状态用于测试
 */
export function createDefaultEndpointState(): SingleSourceEndpointState {
  return {
    status: "closed",
    network: "online",
    login: "logged_in",
    currentApp: null,
    sourceType: "online",
    hasCache: true,
    hasLocalMusic: false,
    playlistStatus: "closed",
    favoriteStatus: "not_favorited",
    currentSongName: null,
    currentArtist: null,
    currentPlaylist: null,
    playPosition: 0,
    totalDuration: 0
  }
}

/**
 * 创建播放中的端状态
 * 
 * 【用于模拟播放场景】
 */
export function createPlayingEndpointState(): SingleSourceEndpointState {
  return {
    status: "fg_playing",
    network: "online",
    login: "logged_in",
    currentApp: "netease",
    sourceType: "online",
    hasCache: true,
    hasLocalMusic: false,
    playlistStatus: "closed",
    favoriteStatus: "not_favorited",
    currentSongName: "晴天",
    currentArtist: "周杰伦",
    currentPlaylist: "华语经典",
    playPosition: 120,
    totalDuration: 269
  }
}
