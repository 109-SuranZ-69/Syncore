// components/simulator/result-panel.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { arbitrate, type ArbitrationResult, type MediaState } from "./arbitration-engine";
import { type SimulatorConfig } from "./types";

interface ResultPanelProps {
  config: SimulatorConfig;
  command: string;
  onCommandChange: (cmd: string) => void;
  activeZoneId: string | null;
  onZoneChange: (id: string) => void;
  speaking: boolean;
  onTriggerSpeak: () => void;
}

export function ResultPanel({
  config,
  command,
  onCommandChange,
  activeZoneId,
  onZoneChange,
  speaking,
  onTriggerSpeak,
}: ResultPanelProps) {
  const [result, setResult] = useState<ArbitrationResult | null>(null);
  const [currentStates] = useState<MediaState[]>([]); // 可后续扩展真实状态

  const handleSpeak = () => {
    if (!activeZoneId || !command) return;
    const arbitration = arbitrate(config, activeZoneId, command, currentStates);
    setResult(arbitration);
    onTriggerSpeak();
  };

  return (
    <Card className="p-6 flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-4">🎤 语音交互模拟器</h2>

      {/* 命令输入 */}
      <div className="space-y-4">
        <Input
          placeholder="输入语音指令，例如：播放周杰伦的歌"
          value={command}
          onChange={(e) => onCommandChange(e.target.value)}
        />

        <div className="flex gap-2">
          <Button onClick={handleSpeak} disabled={speaking || !activeZoneId} className="flex-1">
            {speaking ? "正在说话..." : "🚀 触发说话"}
          </Button>
        </div>
      </div>

      {/* 仲裁结果可视化 */}
      {result && (
        <div className="mt-8 space-y-6">
          <Badge variant="default" className="text-base px-4 py-2">
            ✅ 仲裁完成
          </Badge>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">执行屏幕</div>
              <div className="font-medium text-lg">{result.targetScreen}</div>
            </div>
            <div>
              <div className="text-muted-foreground">执行应用</div>
              <div className="font-medium text-lg">{result.targetApp}</div>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-xl">
            <div className="font-medium mb-2">🎯 仲裁路径</div>
            <ol className="text-xs space-y-1">
              {result.path.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">→</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="p-4 bg-primary/10 rounded-2xl text-primary font-medium">
            {result.tts}
          </div>
        </div>
      )}
    </Card>
  );
}