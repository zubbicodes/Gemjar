"use client";

import { Download, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          const watch = (worker: ServiceWorker | null) => {
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller)
                setUpdateWorker(worker);
            });
          };
          watch(registration.installing);
          registration.addEventListener("updatefound", () =>
            watch(registration.installing),
          );
        })
        .catch(() => undefined);
    }
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  if (dismissed || (!installPrompt && !updateWorker)) return null;
  const updating = Boolean(updateWorker);
  return (
    <aside
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-[100] flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0d211b] p-4 text-white shadow-2xl sm:left-auto sm:max-w-sm"
    >
      {updating ? <RefreshCw className="size-5" /> : <Download className="size-5" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {updating ? "Gemjar update ready" : "Install Gemjar"}
        </p>
        <p className="mt-0.5 text-xs text-white/65">
          {updating ? "Reload once to use the latest version." : "Keep your basket available across visits."}
        </p>
      </div>
      <button
        className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#0d211b]"
        onClick={() => {
          if (updateWorker) {
            updateWorker.postMessage({ type: "SKIP_WAITING" });
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => window.location.reload(),
              { once: true },
            );
          } else if (installPrompt) {
            void installPrompt.prompt().then(async () => {
              await installPrompt.userChoice;
              setInstallPrompt(null);
            });
          }
        }}
      >
        {updating ? "Update" : "Install"}
      </button>
      <button
        aria-label="Dismiss"
        className="grid size-8 place-items-center rounded-full text-white/65 hover:bg-white/10"
        onClick={() => setDismissed(true)}
      >
        <X className="size-4" />
      </button>
    </aside>
  );
}
