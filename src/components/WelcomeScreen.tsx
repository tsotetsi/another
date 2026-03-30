import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  DevicePhoneMobileIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  SunIcon,
  MoonIcon,
  SignalIcon,
  ComputerDesktopIcon,
  WifiIcon,
} from "@heroicons/react/24/outline";
import { Dialog } from "@base-ui-components/react/dialog";
import type { Device, ThemePreference } from "../types";
import { getDeviceDisplayName, getDeviceNickname, setDeviceNickname } from "../types";
import appIcon from "../assets/icon.png";

interface WelcomeScreenProps {
  devices: Device[];
  connectingSerial: string | null;
  themePref: ThemePreference;
  onCycleTheme: () => void;
  onOpenSettings: () => void;
  onRefreshDevices: () => void;
  onConnectDevice: (device: Device) => void;
  showToast: (msg: string, type?: "error" | "info") => void;
}

function truncateSerial(s: string) {
  return s.length > 16 ? s.slice(0, 6) + "..." + s.slice(-4) : s;
}

function isWifiDevice(serial: string) {
  return serial.includes(":");
}

export function WelcomeScreen({
  devices,
  connectingSerial,
  themePref,
  onCycleTheme,
  onOpenSettings,
  onRefreshDevices,
  onConnectDevice,
  showToast,
}: WelcomeScreenProps) {
  const [showWifiDialog, setShowWifiDialog] = useState(false);
  const [wifiAddress, setWifiAddress] = useState("");
  const [wifiConnecting, setWifiConnecting] = useState(false);
  const [togglingSerial, setTogglingSerial] = useState<string | null>(null);
  const [editingSerial, setEditingSerial] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; device: Device } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, device: Device) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, device });
  };

  const handleWifiConnect = async () => {
    if (!wifiAddress.trim()) return;
    setWifiConnecting(true);
    try {
      const addr = wifiAddress.includes(":") ? wifiAddress : `${wifiAddress}:5555`;
      await invoke("wifi_connect", { address: addr });
      showToast("Device connected via WiFi", "info");
      setWifiAddress("");
      setShowWifiDialog(false);
      onRefreshDevices();
    } catch (e) {
      showToast(`Connection failed: ${e}`);
    } finally {
      setWifiConnecting(false);
    }
  };

  const handleToggleWifi = async (e: React.MouseEvent, device: Device) => {
    e.stopPropagation();
    setTogglingSerial(device.serial);
    try {
      if (isWifiDevice(device.serial)) {
        await invoke("wifi_disconnect", { address: device.serial });
        showToast(`${getDeviceDisplayName(device)} WiFi disconnected`, "info");
      } else if (device.wifi_available) {
        const ip = await invoke<string | null>("get_device_ip", { serial: device.serial });
        if (ip) {
          await invoke("wifi_disconnect", { address: `${ip}:5555` });
          showToast(`${getDeviceDisplayName(device)} WiFi disconnected`, "info");
        }
      } else {
        const addr = await invoke<string>("wifi_enable", { serial: device.serial });
        showToast(`${getDeviceDisplayName(device)} now available at ${addr}`, "info");
      }
      onRefreshDevices();
    } catch (e) {
      showToast(`${e}`);
    } finally {
      setTogglingSerial(null);
    }
  };

  return (
    <div className="welcome">
      <div className="window-drag" data-tauri-drag-region>
        <div className="toolbar-actions">
          <button className="toolbar-btn" onClick={onCycleTheme} title={themePref === "light" ? "Light" : themePref === "dark" ? "Dark" : "System"}>
            {themePref === "light" ? <SunIcon /> : themePref === "dark" ? <MoonIcon /> : <ComputerDesktopIcon />}
          </button>
          <button className="toolbar-btn" onClick={() => setShowWifiDialog(true)} title="Connect via WiFi">
            <WifiIcon />
          </button>
          <button className="toolbar-btn" onClick={onOpenSettings} title="Settings">
            <Cog6ToothIcon />
          </button>
        </div>
      </div>
      <div className="welcome-header">
        <img src={appIcon} alt="Another" className="welcome-logo" />
        <h1 className="welcome-title">Another</h1>
      </div>
      <p className="welcome-subtitle">Android screen mirroring and control</p>

      <div className="device-list">
        <div className="device-list-header">
          <span className="device-list-title">
            {devices.length > 0 ? `${devices.length} device${devices.length > 1 ? "s" : ""} found` : "Searching..."}
          </span>
          <button className="device-list-refresh" onClick={onRefreshDevices}>
            <ArrowPathIcon /> Refresh
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="device-empty">
            <SignalIcon />
            <p>No devices detected.<br />Connect your Android via USB and enable USB debugging.</p>
          </div>
        ) : (
          devices.map((d) => (
            <div
              key={d.serial}
              className="device-card"
              onClick={() => !connectingSerial && onConnectDevice(d)}
              onContextMenu={(e) => handleContextMenu(e, d)}
            >
              <div className="device-card-icon">
                <DevicePhoneMobileIcon />
              </div>
              <div className="device-card-info">
                {editingSerial === d.serial ? (
                  <input
                    className="device-nickname-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => { setDeviceNickname(d.serial, editValue); setEditingSerial(null); }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") { setDeviceNickname(d.serial, editValue); setEditingSerial(null); }
                      if (e.key === "Escape") setEditingSerial(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <div
                    className="device-card-name"
                    onDoubleClick={(e) => { e.stopPropagation(); setEditingSerial(d.serial); setEditValue(getDeviceDisplayName(d)); }}
                    title="Double-click to rename"
                  >
                    {getDeviceDisplayName(d)}
                  </div>
                )}
                <div className="device-card-serial">
                  {truncateSerial(d.serial)}
                </div>
              </div>
              <div className="device-card-actions">
                <button
                  className={`device-wifi-toggle ${isWifiDevice(d.serial) || d.wifi_available ? "active" : ""}`}
                  title={isWifiDevice(d.serial) ? "Disable WiFi" : "Enable WiFi"}
                  onClick={(e) => handleToggleWifi(e, d)}
                  disabled={togglingSerial === d.serial}
                >
                  {togglingSerial === d.serial ? <div className="spinner-sm" /> : <WifiIcon />}
                </button>
                {connectingSerial === d.serial ? <div className="spinner-sm" /> : <ChevronRightIcon className="device-card-chevron" />}
              </div>
            </div>
          ))
        )}
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button className="context-menu-item" onClick={() => {
            onConnectDevice(contextMenu.device);
            setContextMenu(null);
          }}>
            Connect
          </button>
          <button className="context-menu-item" onClick={() => {
            setEditingSerial(contextMenu.device.serial);
            setEditValue(getDeviceDisplayName(contextMenu.device));
            setContextMenu(null);
          }}>
            Rename
          </button>
          {getDeviceNickname(contextMenu.device.serial) && (
            <button className="context-menu-item" onClick={() => {
              setDeviceNickname(contextMenu.device.serial, "");
              setContextMenu(null);
            }}>
              Reset Name
            </button>
          )}
          <button className="context-menu-item" onClick={() => {
            handleToggleWifi({ stopPropagation: () => {} } as React.MouseEvent, contextMenu.device);
            setContextMenu(null);
          }}>
            {isWifiDevice(contextMenu.device.serial) ? "Disable WiFi" : "Enable WiFi"}
          </button>
          <div className="context-menu-separator" />
          <button className="context-menu-item" onClick={() => {
            navigator.clipboard.writeText(contextMenu.device.serial);
            showToast("Serial copied", "info");
            setContextMenu(null);
          }}>
            Copy Serial
          </button>
        </div>
      )}

      <Dialog.Root open={showWifiDialog} onOpenChange={setShowWifiDialog}>
        <Dialog.Portal>
          <Dialog.Backdrop className="dialog-backdrop" />
          <Dialog.Popup className="wifi-dialog">
            <Dialog.Title className="wifi-dialog-title">Connect by IP</Dialog.Title>
            <div className="wifi-dialog-section">
              <p className="wifi-dialog-desc">
                On your Android device, go to <strong>Settings &gt; About phone &gt; Status</strong> to find your IP address. Both devices must be on the same network.
              </p>
              <div className="wifi-dialog-form">
                <input
                  className="wifi-input"
                  type="text"
                  placeholder="192.168.1.100"
                  value={wifiAddress}
                  onChange={(e) => setWifiAddress(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleWifiConnect()}
                  autoFocus
                />
                <button
                  className="wifi-connect-btn"
                  onClick={handleWifiConnect}
                  disabled={wifiConnecting || !wifiAddress.trim()}
                >
                  {wifiConnecting ? <div className="spinner-sm" /> : "Connect"}
                </button>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
