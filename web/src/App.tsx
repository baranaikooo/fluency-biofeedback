import { useEffect, useState } from "react";
import markup from "./glide/markup.html?raw";

const runtime = window as typeof window & {
  glideEngineReady?: Promise<void>;
};

function loadEngine() {
  // The engines own this DOM. Keep it outside React's reconciliation, including HMR.
  let host = document.getElementById("glide-runtime");
  if (!host && document.querySelector('script[src="/engine/dsp-core.js"]')) {
    // Upgrade an already-open preview from the previous React-owned shell once.
    window.location.reload();
    return new Promise<void>(() => {});
  }
  if (!host) {
    host = document.createElement("div");
    host.id = "glide-runtime";
    host.innerHTML = markup;
    document.body.appendChild(host);
  }
  if (runtime.glideEngineReady) return runtime.glideEngineReady;
  runtime.glideEngineReady = (async () => {
    Object.assign(window, { supabase: await import("@supabase/supabase-js") });
    for (const file of [
      "questions-and-voices",
      "dsp-core",
      "gamification-engine",
      "daf-assistant",
      "interface",
      "supabase-auth",
      "lifecycle",
    ]) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `/engine/${file}.js`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Nepodarilo sa načítať modul ${file}.`));
        document.body.appendChild(script);
      });
    }
    document.documentElement.dataset.engine = "ready";
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js")
        .then(async () => {
          const registration = await navigator.serviceWorker.ready;
          const assets = performance
            .getEntriesByType("resource")
            .map((entry) => entry.name)
            .filter((name) => {
              const url = new URL(name);
              return url.origin === location.origin && url.pathname.startsWith("/assets/");
            });
          registration.active?.postMessage({ type: "CACHE_BUNDLES", assets });
        })
        .catch(console.warn);
    }
  })();
  return runtime.glideEngineReady;
}

if (import.meta.hot) {
  import.meta.hot.accept("./glide/markup.html?raw", () => window.location.reload());
}
export default function App() {
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Glide – Tvoj hlas, tvoje tempo";
    document.documentElement.lang = "sk";
    void loadEngine().catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      {error && (
        <div className="engine-error" role="alert">
          <strong>Tréning sa nepodarilo spustiť.</strong>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Skúsiť znova</button>
        </div>
      )}
    </>
  );
}
