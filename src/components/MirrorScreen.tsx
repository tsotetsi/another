import { useState, useEffect, useRef } from "react";
import type React from "react";
import {
  Cog6ToothIcon,
  CameraIcon,
  ChevronLeftIcon,
  XMarkIcon,
  HomeIcon,
  Square2StackIcon,
  CommandLineIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import type { Device } from "../types";
import { getDeviceDisplayName } from "../types";

interface MirrorScreenProps {
  connectedDevice: Device;
  connecting?: boolean;
  deviceSize: { width: number; height: number };
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isMouseDown: React.MutableRefObject<boolean>;
  recording: boolean;
  macroRecording: boolean;
  adaptiveInfo?: { enabled: boolean; tierName: string; fps: number };
  onToggleRecording: () => void;
  onToggleMacroRecording: () => void;
  onPressButton: (button: string) => void;
  onTakeScreenshot: () => void;
  onToggleSettings: () => void;
  onOpenCommandBar: () => void;
  onDisconnect: () => void;
  onCanvasMouseEvent: (e: React.MouseEvent<HTMLCanvasElement>, action: string) => void;
  onWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function MirrorScreen({
  connectedDevice,
  connecting,
  deviceSize,
  canvasRef,
  isMouseDown,
  recording,
  macroRecording,
  adaptiveInfo,
  onToggleRecording,
  onToggleMacroRecording,
  onPressButton,
  onTakeScreenshot,
  onToggleSettings,
  onOpenCommandBar,
  onDisconnect,
  onCanvasMouseEvent,
  onWheel,
  onKeyDown,
}: MirrorScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const [macroElapsed, setMacroElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const macroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (recording) {
      setElapsed(0);
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [recording]);

  useEffect(() => {
    if (macroRecording) {
      setMacroElapsed(0);
      macroIntervalRef.current = setInterval(() => setMacroElapsed((s) => s + 1), 1000);
    } else {
      if (macroIntervalRef.current) clearInterval(macroIntervalRef.current);
      macroIntervalRef.current = null;
    }
    return () => { if (macroIntervalRef.current) clearInterval(macroIntervalRef.current); };
  }, [macroRecording]);

  return (
    <div className="another">
      <div className="titlebar" data-tauri-drag-region>
        <div className="titlebar-info" data-tauri-drag-region>
          <span className="titlebar-device">{getDeviceDisplayName(connectedDevice)}</span>
          <span className="titlebar-os">Android</span>
        </div>

        <div className="titlebar-group">
          <button className="titlebar-btn" onClick={() => onPressButton("back")} title="Back">
            <ChevronLeftIcon />
          </button>
          <button className="titlebar-btn" onClick={() => onPressButton("home")} title="Home">
            <HomeIcon />
          </button>
          <button className="titlebar-btn" onClick={() => onPressButton("recents")} title="Recents">
            <Square2StackIcon />
          </button>
        </div>

        <div className="titlebar-group">
          <button className="titlebar-btn" onClick={onOpenCommandBar} title="Commands (⌘K)">
            <CommandLineIcon />
          </button>
          <button className="titlebar-btn" onClick={onTakeScreenshot} title="Screenshot">
            <CameraIcon />
          </button>
          <button className="titlebar-btn" onClick={onToggleSettings} title="Settings">
            <Cog6ToothIcon />
          </button>
          <button className="titlebar-btn" onClick={onDisconnect} title="Disconnect">
            <XMarkIcon />
          </button>
        </div>
      </div>

      <div className="viewport" tabIndex={0} onKeyDown={onKeyDown}>
        {connecting ? (
          <div className="viewport-loading">
            <div className="spinner" />
            <p>Connecting...</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={deviceSize.width}
            height={deviceSize.height}
            onMouseDown={(e) => { isMouseDown.current = true; onCanvasMouseEvent(e, "down"); }}
            onMouseMove={(e) => { if (isMouseDown.current) onCanvasMouseEvent(e, "move"); }}
            onMouseUp={(e) => { isMouseDown.current = false; onCanvasMouseEvent(e, "up"); }}
            onMouseLeave={(e) => { if (isMouseDown.current) { isMouseDown.current = false; onCanvasMouseEvent(e, "up"); } }}
            onWheel={onWheel}
            onContextMenu={(e) => e.preventDefault()}
          />
        )}

        {recording && (
          <div className="recording-bar">
            <span className="recording-dot" />
            <span className="recording-time">{formatTime(elapsed)}</span>
            <button className="recording-stop" onClick={onToggleRecording}>
              <StopIcon />
              Stop
            </button>
          </div>
        )}

        {macroRecording && (
          <div className="recording-bar macro-recording-bar">
            <svg width="12" height="12" viewBox="0 0 24 25" fill="none" className="macro-rec-icon">
              <path d="M11.41 2.068c-.57 0-1.08 0-1.55.17-.1.04-.19.08-.29.12-.46.22-.81.58-1.21.98L3.58 8.148c-.47.47-.88.88-1.11 1.43-.22.54-.22 1.13-.22 1.8v3.47c0 1.78 0 3.22.15 4.35.16 1.17.49 2.16 1.27 2.95.78.78 1.76 1.12 2.93 1.28 1.12.15 2.55.15 4.33.15s3.31 0 4.43-.15c-.49-1.1-1.51-2.09-2.61-2.52-1.66-.65-1.66-3.01 0-3.66 1.16-.46 2.22-1.52 2.67-2.67.66-1.66 3.01-1.66 3.66 0 .16.41.39.81.67 1.17V14.858c0-1.53 0-2.77-.11-3.75-.12-1.02-.37-1.89-.96-2.63-.22-.27-.46-.52-.73-.74-.73-.6-1.6-.85-2.61-.97-1.18-.11-2.4-.11-3.92-.11z" fill="currentColor" opacity="0.5"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M9.569 2.358c.09-.05.19-.09.29-.12.21-.07.42-.12.65-.14v1.99c0 1.36 0 2.01-.12 2.88-.12.9-.38 1.66-.98 2.26s-1.36.86-2.26.98c-.87.12-1.52.12-2.88.12H2.289c.03-.26.09-.51.18-.75.22-.54.64-.96 1.11-1.43l4.78-4.81c.4-.4.76-.77 1.21-.98zM17.919 23.118c-.24.61-1.09.61-1.33 0l-.04-.1a5.73 5.73 0 00-3.23-3.23l-.11-.04c-.6-.24-.6-1.1 0-1.33l.11-.04a5.73 5.73 0 003.23-3.23l.04-.1c.24-.61 1.09-.61 1.33 0l.04.1a5.73 5.73 0 003.23 3.23l.11.04c.6.24.6 1.1 0 1.33l-.11.04a5.73 5.73 0 00-3.23 3.23l-.04.1z" fill="currentColor"/>
            </svg>
            <span className="recording-time">{formatTime(macroElapsed)}</span>
            <button className="recording-stop" onClick={onToggleMacroRecording}>
              <StopIcon />
              Stop
            </button>
          </div>
        )}

        {adaptiveInfo?.enabled && (
          <div className="adaptive-indicator">
            {adaptiveInfo.tierName} &middot; {adaptiveInfo.fps} FPS
          </div>
        )}
      </div>
    </div>
  );
}
