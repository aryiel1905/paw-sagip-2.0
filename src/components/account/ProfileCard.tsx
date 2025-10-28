"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";
import { LogOut } from "lucide-react";

type Props = {
  name: string | null | undefined;
  email: string | null | undefined;
  memberSince?: string | null | undefined;
  onEdit?: () => void;
};

function formatDate(d?: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function ProfileCard({
  name,
  email,
  memberSince,
  onEdit,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const initial = (name || email || "?").trim().slice(0, 1).toUpperCase();

  const handleLogout = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      try {
        showToast("success", "Logged out");
      } catch {}
      router.push("/");
    } catch {
      try {
        showToast("error", "Failed to log out. Please try again.");
      } catch {}
    } finally {
      setBusy(false);
    }
  }, [busy, router]);

  return (
    <section className="surface rounded-2xl shadow-soft p-5">
      <div className="flex items-start gap-4">
        <div className="aspect-ratio-1/1 w-12 h-12 rounded-full bg-[var(--primary-mintgreen)] text-white flex items-center justify-center text-2xl font-semibold">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold ink-heading text-lg truncate">
            {name || "—"}
          </div>
          <div className="text-sm ink-muted truncate">{email || "—"}</div>
        </div>
      </div>
      <div className=" flex mt-4 text-right gap-4">
        <button
          className="w-full pill px-3 py-2 text-sm flex items-center justify-center gap-2"
          style={{
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--primary-red)",
            color: "var(--white)",
          }}
          onClick={handleLogout}
          type="button"
          disabled={busy}
        >
          <LogOut className="h-4 w-4" />
          {busy ? "Logging out…" : "Log out"}
        </button>
      </div>
    </section>
  );
}
