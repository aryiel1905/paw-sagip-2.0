"use client";

import { useEffect } from "react";
import { composeBgTile } from "@/lib/composeBgTile";

export function BgTileLoader() {
  useEffect(() => {
    composeBgTile("/HeaderBackground.png", "/Continuation.png");
  }, []);
  return null;
}
