import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  remove: (widgetId: string) => void;
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      language: string;
      theme: "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<void> | null = null;
const TURNSTILE_SCRIPT_TIMEOUT_MS = 5000;

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(
      'script[data-htools-turnstile="true"]'
    );
    const handleLoad = () => {
      cleanup();
      if (window.turnstile) resolve();
      else reject(new Error("Turnstile API is unavailable."));
    };
    const handleError = () => {
      cleanup();
      script?.remove();
      reject(new Error("Turnstile script failed to load."));
    };
    const timeout = window.setTimeout(handleError, TURNSTILE_SCRIPT_TIMEOUT_MS);
    const cleanup = () => {
      window.clearTimeout(timeout);
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };

    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.htoolsTurnstile = "true";
    }

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    if (!script.isConnected) document.head.appendChild(script);
  }).catch((error) => {
    turnstileScriptPromise = null;
    throw error;
  });

  return turnstileScriptPromise;
}

export default function TurnstileWidget({
  language,
  onError,
  onExpire,
  onLoadError,
  onTokenChange,
  resetKey,
  siteKey
}: {
  language: string;
  onError: () => void;
  onExpire: () => void;
  onLoadError: () => void;
  onTokenChange: (token: string) => void;
  resetKey: number;
  siteKey: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let widgetId = "";
    setIsLoading(true);
    onTokenChange("");

    void loadTurnstileScript()
      .catch(() => loadTurnstileScript())
      .then(() => {
        if (!active || !containerRef.current || !window.turnstile) return;
        containerRef.current.replaceChildren();
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          language,
          theme: "auto",
          callback: (token) => {
            if (active) onTokenChange(token);
          },
          "expired-callback": () => {
            if (!active) return;
            onTokenChange("");
            onExpire();
          },
          "error-callback": () => {
            if (!active) return;
            onTokenChange("");
            onError();
          }
        });
        setIsLoading(false);
      })
      .catch(() => {
        if (active) {
          setIsLoading(false);
          onTokenChange("");
          onLoadError();
        }
      });

    return () => {
      active = false;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [language, onError, onExpire, onLoadError, onTokenChange, resetKey, siteKey]);

  return (
    <div className="auth-turnstile-field">
      <div className="auth-turnstile-shell" aria-busy={isLoading}>
        <div className="auth-turnstile" ref={containerRef} />
      </div>
    </div>
  );
}
