"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthModal } from "@/components/AuthModal";

export function GlobalAuthModal() {
  const [open, setOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<"login" | "signup">("login");

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onSignIn = (e: Event) => {
      // allow optional detail: { mode: 'login' | 'signup' }
      const ce = e as CustomEvent<{ mode?: "login" | "signup" }>;
      if (ce?.detail?.mode) setInitialMode(ce.detail.mode);
      else setInitialMode("login");
      setOpen(true);
    };
    window.addEventListener("app:signin", onSignIn as EventListener);
    return () => window.removeEventListener("app:signin", onSignIn as EventListener);
  }, []);

  return <AuthModal open={open} onClose={close} initialMode={initialMode} />;
}

