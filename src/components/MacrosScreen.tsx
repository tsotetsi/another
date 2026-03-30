import { useState, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  ArrowLeftIcon,
  PlayIcon,
  TrashIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  FolderIcon,
  CheckIcon,
  XMarkIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
import { Dialog } from "@base-ui-components/react/dialog";
import type { MacroInfo } from "../hooks/useMacro";
import macroIcon from "../assets/macro.png";

function MacroItemIcon() {
  return (
    <svg viewBox="0 0 24 25" fill="none" className="macro-item-icon">
      <path d="M11.41 2.068c-.57 0-1.08 0-1.55.17-.1.04-.19.08-.29.12-.46.22-.81.58-1.21.98L3.58 8.148c-.47.47-.88.88-1.11 1.43-.22.54-.22 1.13-.22 1.8v3.47c0 1.78 0 3.22.15 4.35.16 1.17.49 2.16 1.27 2.95.78.78 1.76 1.12 2.93 1.28 1.12.15 2.55.15 4.33.15s3.31 0 4.43-.15c-.49-1.1-1.51-2.09-2.61-2.52-1.66-.65-1.66-3.01 0-3.66 1.16-.46 2.22-1.52 2.67-2.67.66-1.66 3.01-1.66 3.66 0 .16.41.39.81.67 1.17V14.858c0-1.53 0-2.77-.11-3.75-.12-1.02-.37-1.89-.96-2.63-.22-.27-.46-.52-.73-.74-.73-.6-1.6-.85-2.61-.97-1.18-.11-2.4-.11-3.92-.11z" fill="currentColor" opacity="0.4"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M9.569 2.358c.09-.05.19-.09.29-.12.21-.07.42-.12.65-.14v1.99c0 1.36 0 2.01-.12 2.88-.12.9-.38 1.66-.98 2.26s-1.36.86-2.26.98c-.87.12-1.52.12-2.88.12H2.289c.03-.26.09-.51.18-.75.22-.54.64-.96 1.11-1.43l4.78-4.81c.4-.4.76-.77 1.21-.98zM17.919 23.118c-.24.61-1.09.61-1.33 0l-.04-.1a5.73 5.73 0 00-3.23-3.23l-.11-.04c-.6-.24-.6-1.1 0-1.33l.11-.04a5.73 5.73 0 003.23-3.23l.04-.1c.24-.61 1.09-.61 1.33 0l.04.1a5.73 5.73 0 003.23 3.23l.11.04c.6.24.6 1.1 0 1.33l-.11.04a5.73 5.73 0 00-3.23 3.23l-.04.1z" fill="currentColor"/>
    </svg>
  );
}

interface MacrosScreenProps {
  macros: MacroInfo[];
  macrosDir: string;
  playingMacro: string | null;
  onBack: () => void;
  onPlay: (name: string) => void;
  onDelete: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onReorder: (order: string[]) => void;
  onExport: (name: string) => void;
  onExportAll: () => void;
  onImport: () => void;
  onSetDir: (dir: string) => void;
  showToast: (msg: string, type?: "error" | "info") => void;
}

export function MacrosScreen({
  macros,
  macrosDir,
  playingMacro,
  onBack,
  onPlay,
  onDelete,
  onRename,
  onExport,
  onExportAll,
  onImport,
  onSetDir,
  showToast,
}: MacrosScreenProps) {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pendingPlay, setPendingPlay] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = (name: string) => {
    setEditingName(name);
    setEditValue(name);
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const handleConfirmEdit = () => {
    if (!editingName) return;
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== editingName) {
      onRename(editingName, trimmed);
    }
    setEditingName(null);
  };

  const handlePickFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        onSetDir(selected as string);
        showToast("Macros folder changed", "info");
      }
    } catch {}
  };

  const shortDir =
    macrosDir.length > 40
      ? "..." + macrosDir.slice(macrosDir.length - 37)
      : macrosDir;

  return (
    <div className="welcome">
      <div className="window-drag" data-tauri-drag-region>
        <div className="toolbar-actions toolbar-actions-split">
          <button className="toolbar-btn" onClick={onBack}>
            <ArrowLeftIcon />
          </button>
          <div className="toolbar-right">
            <button className="toolbar-btn" onClick={onImport}>
              <ArrowUpTrayIcon />
            </button>
            <button className="toolbar-btn" onClick={handlePickFolder}>
              <FolderIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="welcome-header">
        <img src={macroIcon} alt="Macros" className="welcome-logo" />
        <h1 className="welcome-title">Macros</h1>
      </div>
      <p className="welcome-subtitle">Record and replay device interactions</p>

      <div className="device-list">
        {macros.length > 0 && (
          <div className="device-list-header">
            <span className="device-list-title">
              {macros.length} macro{macros.length > 1 ? "s" : ""}
            </span>
            <div className="macros-header-actions">
              <button className="device-list-refresh" onClick={onExportAll}>
                <ArrowDownTrayIcon /> Export
              </button>
            </div>
          </div>
        )}

        {macros.length === 0 ? (
          <div className="device-empty">
            <PlayCircleIcon />
            <p className="device-empty-title">No macros yet</p>
            <p>
              Record one with Cmd+Shift+M while on the device screen.
            </p>
            <button className="macros-empty-import" onClick={onImport}>
              Import from file
            </button>
          </div>
        ) : (
          macros.map((m) => (
            <div
              key={m.name}
              className={`device-card macro-card ${playingMacro === m.name ? "playing" : ""}`}
            >
              <div className="device-card-icon">
                <MacroItemIcon />
              </div>

              <div className="device-card-info">
                {editingName === m.name ? (
                  <div className="macro-edit-row">
                    <input
                      ref={editInputRef}
                      className="macro-edit-input"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConfirmEdit();
                        if (e.key === "Escape") setEditingName(null);
                      }}
                      autoFocus
                    />
                    <button className="macro-edit-confirm" onClick={handleConfirmEdit}>
                      <CheckIcon />
                    </button>
                    <button className="macro-edit-cancel" onClick={() => setEditingName(null)}>
                      <XMarkIcon />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="device-card-name">{m.name}</div>
                    <div className="device-card-serial">
                      {m.event_count} event{m.event_count !== 1 ? "s" : ""}
                    </div>
                  </>
                )}
              </div>

              {editingName !== m.name && (
                <div className="device-card-actions">
                  <button
                    className="macro-action-btn play"
                    onClick={() => setPendingPlay(m.name)}
                    disabled={!!playingMacro}
                  >
                    {playingMacro === m.name ? <div className="spinner-sm" /> : <PlayIcon />}
                  </button>
                  <button
                    className="macro-action-btn"
                    onClick={() => handleStartEdit(m.name)}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    className="macro-action-btn"
                    onClick={() => onExport(m.name)}
                  >
                    <ArrowDownTrayIcon />
                  </button>
                  {confirmDelete === m.name ? (
                    <button
                      className="macro-action-btn danger"
                      onClick={() => {
                        onDelete(m.name);
                        setConfirmDelete(null);
                      }}
                      onBlur={() => setConfirmDelete(null)}
                    >
                      <CheckIcon />
                    </button>
                  ) : (
                    <button
                      className="macro-action-btn danger"
                      onClick={() => setConfirmDelete(m.name)}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        <div className="macros-dir-bar" onClick={handlePickFolder} style={{ cursor: "pointer" }}>
          <FolderIcon />
          <span>{shortDir}</span>
        </div>
      </div>

      <Dialog.Root open={!!pendingPlay} onOpenChange={(open) => { if (!open) setPendingPlay(null); }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="dialog-backdrop" />
          <Dialog.Popup className="wifi-dialog">
            <Dialog.Title className="wifi-dialog-title">Play Macro</Dialog.Title>
            <div className="wifi-dialog-section">
              <p className="wifi-dialog-desc">
                Ready to play <strong>{pendingPlay}</strong>? You'll be taken back to the device screen first.
              </p>
              <div className="macro-play-actions">
                <button className="macro-play-cancel" onClick={() => setPendingPlay(null)}>
                  Cancel
                </button>
                <button
                  className="wifi-connect-btn"
                  onClick={() => {
                    const name = pendingPlay;
                    setPendingPlay(null);
                    if (name) onPlay(name);
                  }}
                >
                  Play
                </button>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
