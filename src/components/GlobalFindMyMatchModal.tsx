"use client";

import { useEffect, useState } from "react";
import FindMyMatchModal from "@/components/adoption/FindMyMatchModal";

export function GlobalFindMyMatchModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("app:find-my-match", onOpen as EventListener);
    return () => {
      window.removeEventListener("app:find-my-match", onOpen as EventListener);
    };
  }, []);

  return (
    <FindMyMatchModal
      open={open}
      onClose={() => setOpen(false)}
      accent="#F57C00"
    />
  );
}
