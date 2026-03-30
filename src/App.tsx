import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Settings, Device } from "./types";
import { PRESETS } from "./types";
import { useTheme } from "./hooks/useTheme";
import { useToasts } from "./hooks/useToasts";
import { useDevices } from "./hooks/useDevices";
import { useConnection } from "./hooks/useConnection";
import { useAdaptiveBitrate } from "./hooks/useAdaptiveBitrate";
import { useMacro } from "./hooks/useMacro";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { MirrorScreen } from "./components/MirrorScreen";
import { SettingsDialog } from "./components/SettingsDialog";
import { CommandBar } from "./components/CommandBar";
import { MacrosScreen } from "./components/MacrosScreen";
import { ToastContainer } from "./components/ToastContainer";
import "./App.css";

const isMac = navigator.userAgent.includes("Mac");
const MOD = isMac ? "⌘" : "Ctrl";

interface CommandDef {
  id: string;
  label: string;
  keys: string[];
  key: string;
  shift?: boolean;
  section: string;
  action: () => void;
}

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [showMacros, setShowMacros] = useState(false);
  const [settings, setSettings] = useState<Settings>(PRESETS.balanced);
  const [activePreset, setActivePreset] = useState("balanced");

  const { themePref, setThemePref, cycleTheme } = useTheme();
  const { toasts, showToast } = useToasts();
  const { devices, refreshDevices } = useDevices(showToast);
  const macro = useMacro({ showToast, onRecordingStopped: () => setShowMacros(true) });

  const takeScreenshot = useCallback(async () => {
    try {
      const base64 = await invoke<string>("take_screenshot");
      const link = document.createElement("a");
      link.href = `data:image/png;base64,${base64}`;
      link.download = `screenshot-${Date.now()}.png`;
      link.click();
      showToast("Screenshot saved", "info");
    } catch (e) {
      showToast(`Screenshot failed: ${e}`);
    }
  }, [showToast]);

  const adaptiveRef = useRef<{ frameReceived: () => void; disableAdaptive: () => void }>({
    frameReceived: () => {},
    disableAdaptive: () => {},
  });

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const connectedDeviceRef = useRef<Device | null>(null);
  const scheduleReconnectRef = useRef<((s: Settings) => void) | null>(null);

  const handleCodecFallback = useCallback((codec: string) => {
    const next = { ...settingsRef.current, video_codec: codec };
    setSettings(next);
    if (connectedDeviceRef.current) scheduleReconnectRef.current?.(next);
  }, []);

  const {
    screen,
    connectedDevice,
    connectingSerial,
    deviceSize,
    canvasRef,
    decoderRef,
    isMouseDown,
    muted,
    recording,
    setMuted,
    toggleRecording,
    connectToDevice,
    disconnect,
    scheduleReconnect,
    pressButton,
    handleCanvasMouseEvent,
    handleWheel,
    handleKeyDown,
  } = useConnection({
    settings,
    showToast,
    takeScreenshot,
    setShowSettings: (fn) => setShowSettings(fn),
    setThemePref: (fn) => setThemePref(fn),
    onFrameReceived: () => adaptiveRef.current.frameReceived(),
    onCodecFallback: handleCodecFallback,
    onRecordEvent: macro.recordEvent,
  });

  scheduleReconnectRef.current = scheduleReconnect;
  connectedDeviceRef.current = connectedDevice;

  const adaptive = useAdaptiveBitrate({
    enabled: settings.adaptive,
    decoder: decoderRef,
    currentSettings: settings,
    onTierChange: (newSettings) => {
      setSettings(newSettings);
      setActivePreset("");
      if (connectedDevice) scheduleReconnect(newSettings);
    },
  });

  adaptiveRef.current = adaptive;

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const next = { ...settings, [key]: value };
    if (key !== "audio" && key !== "adaptive") {
      next.adaptive = false;
      adaptive.disableAdaptive();
    }
    setSettings(next);
    if (key !== "audio" && key !== "adaptive") setActivePreset("");
    if (connectedDevice) scheduleReconnect(next);
  };

  const applyPreset = (name: string) => {
    const next = { ...PRESETS[name], audio: settings.audio };
    setSettings(next);
    setActivePreset(name);
    adaptive.disableAdaptive();
    if (connectedDevice) scheduleReconnect(next);
  };

  const commands: CommandDef[] = useMemo(() => [
    { id: "vol-up", label: "Volume Up", keys: [MOD, "+"], key: "=", section: "Audio", action: () => pressButton("volume_up") },
    { id: "vol-down", label: "Volume Down", keys: [MOD, "-"], key: "-", section: "Audio", action: () => pressButton("volume_down") },
    { id: "mute", label: muted ? "Unmute Audio" : "Mute Audio", keys: [MOD, "M"], key: "m", section: "Audio", action: () => setMuted(!muted) },
    { id: "screenshot", label: "Take Screenshot", keys: [MOD, "S"], key: "s", section: "Actions", action: takeScreenshot },
    { id: "record", label: recording ? "Stop Recording" : "Record Screen", keys: [MOD, "⇧", "R"], key: "r", shift: true, section: "Actions", action: toggleRecording },
    { id: "settings", label: "Open Settings", keys: [MOD, ","], key: ",", section: "Actions", action: () => setShowSettings(true) },
    { id: "theme", label: "Toggle Theme", keys: [MOD, "T"], key: "t", section: "Actions", action: cycleTheme },
    { id: "disconnect", label: "Disconnect", keys: [MOD, "D"], key: "d", section: "Actions", action: disconnect },
    { id: "home", label: "Home", keys: [MOD, "H"], key: "h", section: "Device", action: () => pressButton("home") },
    { id: "back", label: "Back", keys: [MOD, "B"], key: "b", section: "Device", action: () => pressButton("back") },
    { id: "recents", label: "Recent Apps", keys: [MOD, "R"], key: "r", section: "Device", action: () => pressButton("recents") },
    { id: "power", label: "Power Button", keys: [MOD, "P"], key: "p", section: "Device", action: () => pressButton("power") },
    { id: "cmdbar", label: "Command Bar", keys: [MOD, "K"], key: "k", section: "Actions", action: () => setShowCommandBar((s) => !s) },
    { id: "macro-toggle", label: macro.macroRecording ? "Stop Macro Recording" : "Record Macro", keys: [MOD, "⇧", "M"], key: "m", shift: true, section: "Macros", action: macro.toggleRecording },
    { id: "macro-play", label: "Play Last Macro", keys: [MOD, "⇧", "P"], key: "p", shift: true, section: "Macros", action: () => { if (macro.macros.length > 0) macro.playMacro(macro.macros[macro.macros.length - 1].name); } },
    { id: "macro-manage", label: "Manage Macros", keys: [MOD, "⇧", "L"], key: "l", shift: true, section: "Macros", action: () => setShowMacros(true) },
    { id: "macro-export", label: "Export All Macros", keys: [MOD, "⇧", "E"], key: "e", shift: true, section: "Macros", action: macro.exportAllMacros },
    { id: "macro-import", label: "Import Macros", keys: [MOD, "⇧", "I"], key: "i", shift: true, section: "Macros", action: macro.importMacros },
  ], [muted, recording, setMuted, toggleRecording, pressButton, takeScreenshot, cycleTheme, disconnect, macro.macroRecording, macro.toggleRecording, macro.macros, macro.playMacro, macro.exportAllMacros, macro.importMacros]);

  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  useEffect(() => {
    const mcpEnabled = localStorage.getItem("mcp_enabled") !== "false";
    if (mcpEnabled) {
      const port = parseInt(localStorage.getItem("mcp_port") || "7070", 10);
      invoke("start_mcp_server", { port }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (showCommandBar && e.key !== "k") return;

      const cmd = commandsRef.current.find(
        (c) => c.key === e.key.toLowerCase() && !c.shift === !e.shiftKey
      );
      if (cmd) {
        e.preventDefault();
        cmd.action();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showCommandBar]);

  return (
    <>
      {showMacros ? (
        <MacrosScreen
          macros={macro.macros}
          macrosDir={macro.macrosDir}
          playingMacro={macro.playingMacro}
          onBack={() => setShowMacros(false)}
          onPlay={(name) => {
            setShowMacros(false);
            setTimeout(() => macro.playMacro(name), 500);
          }}
          onDelete={macro.deleteMacro}
          onRename={macro.renameMacro}
          onReorder={macro.reorderMacros}
          onExport={macro.exportMacro}
          onExportAll={macro.exportAllMacros}
          onImport={macro.importMacros}
          onSetDir={macro.setMacrosDir}
          showToast={showToast}
        />
      ) : screen === "welcome" ? (
        <WelcomeScreen
          devices={devices}
          connectingSerial={connectingSerial}
          themePref={themePref}
          onCycleTheme={cycleTheme}
          onOpenSettings={() => setShowSettings(true)}
          onRefreshDevices={refreshDevices}
          onConnectDevice={(d) => connectToDevice(d, settings)}
          showToast={showToast}
        />
      ) : connectedDevice ? (
        <MirrorScreen
          connectedDevice={connectedDevice}
          deviceSize={deviceSize}
          canvasRef={canvasRef}
          isMouseDown={isMouseDown}
          recording={recording}
          macroRecording={macro.macroRecording}
          adaptiveInfo={settings.adaptive ? { enabled: true, tierName: adaptive.metrics.tierName, fps: adaptive.metrics.fps } : undefined}
          onToggleRecording={toggleRecording}
          onToggleMacroRecording={macro.toggleRecording}
          onPressButton={pressButton}
          onTakeScreenshot={takeScreenshot}
          onToggleSettings={() => setShowSettings((s) => !s)}
          onOpenCommandBar={() => setShowCommandBar(true)}
          onDisconnect={disconnect}
          onCanvasMouseEvent={handleCanvasMouseEvent}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
        />
      ) : null}

      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        activePreset={activePreset}
        onApplyPreset={applyPreset}
        onUpdateSetting={updateSetting}
      />
      <CommandBar
        open={showCommandBar}
        onOpenChange={setShowCommandBar}
        commands={commands}
      />
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default App;
