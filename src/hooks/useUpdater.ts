import { useState, useCallback } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";

export function useUpdater(showToast: (msg: string, type?: "error" | "info") => void) {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);

  const checkForUpdates = useCallback(
    async (silent = false) => {
      if (checking || updating) return;
      setChecking(true);
      try {
        let update: Update | null = null;
        try {
          update = await check();
        } catch {
          if (!silent) showToast("No updates available right now", "info");
          return;
        }
        if (update) {
          showToast(`Update ${update.version} available, downloading...`, "info");
          setUpdating(true);
          await update.downloadAndInstall((event) => {
            if (event.event === "Finished") {
              showToast("Update installed. Restart the app to apply.", "info");
            }
          });
        } else if (!silent) {
          showToast("You're on the latest version", "info");
        }
      } catch (e) {
        if (!silent) showToast(`Update failed: ${e}`);
      } finally {
        setChecking(false);
        setUpdating(false);
      }
    },
    [checking, updating, showToast],
  );

  return { checking, updating, checkForUpdates };
}
