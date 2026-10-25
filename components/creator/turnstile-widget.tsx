"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile widget.
 *
 * The explicit-render API is used instead of the implicit `cf-turnstile`
 * class so we can reset the challenge after a failed checkout without a full
 * page reload. No third-party React dependency is needed.
 */

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      theme?: "auto" | "light" | "dark";
      size?: "normal" | "compact" | "flexible";
      "response-field"?: boolean;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileWidgetProps = {
  siteKey: string;
  onToken: (token: string | null) => void;
  className?: string;
};

export function TurnstileWidget({
  siteKey,
  onToken,
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!scriptReady) return;
    const container = containerRef.current;
    const turnstile = window.turnstile;
    if (!container || !turnstile) return;

    widgetIdRef.current = turnstile.render(container, {
      sitekey: siteKey,
      action: "checkout",
      theme: "auto",
      size: "flexible",
      "response-field": false,
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(null),
      "error-callback": () => onTokenRef.current(null),
    });

    return () => {
      if (widgetIdRef.current) {
        turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [scriptReady, siteKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div
        ref={containerRef}
        className={className}
        aria-label="Human verification"
      />
    </>
  );
}
