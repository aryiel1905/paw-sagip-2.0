"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";

type Props = {
  userEmail: string;
};

export default function SettingsPanel({ userEmail }: Props) {
  async function onLogout() {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      showToast("success", "Logged out");
      try {
        window.location.href = "/";
      } catch {}
    } catch {
      showToast("error", "Failed to log out");
    }
  }

  async function onSoftDelete() {
    const ok = confirm(
      "Delete account (soft delete)? Your data will be disabled and you will be logged out."
    );
    if (!ok) return;
    // Note: Implement a server route to mark profile deleted if needed.
    await onLogout();
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <section className="surface rounded-2xl shadow-soft p-5">
        <h2 className="font-semibold ink-heading mb-3">Profile & Security</h2>
        <div className="text-sm ink-muted">Signed in as</div>
        <div className="ink-heading">{userEmail || "—"}</div>
        <div className="mt-4 flex gap-2">
          <button className="btn px-3 py-2 border" onClick={onLogout}>
            Log out
          </button>
        </div>
      </section>

      <section className="surface rounded-2xl shadow-soft p-5">
        <h2 className="font-semibold ink-heading mb-3">Privacy & Data</h2>
        <p className="text-sm ink-muted mb-3">
          Download a copy of your reports and applications, or delete your account.
        </p>
        <div className="flex gap-2">
          <button className="btn btn-primary px-3 py-2" disabled>
            Export data
          </button>
          <button className="btn px-3 py-2 border" onClick={onSoftDelete}>
            Delete account
          </button>
        </div>
      </section>
    </div>
  );
}

