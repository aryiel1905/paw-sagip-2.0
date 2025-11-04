"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [verifying, setVerifying] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        // Try PKCE exchange (works for modern email links with code param)
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } catch {}

        // After exchange, make sure we have a session (recovery session is required to update)
        const { data } = await supabase.auth.getSession();
        if (mounted && data.session?.user) {
          setReady(true);
          setError(null);
        } else {
          setReady(false);
          setError(
            "Your reset link is invalid or expired. Please request a new one."
          );
        }
      } catch (e) {
        if (mounted) {
          setError(
            "We couldn’t verify the reset link. Please request a new one."
          );
        }
      } finally {
        if (mounted) setVerifying(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready || saving) return;
    if (password.length < 8) {
      showToast("error", "Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      showToast("error", "Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        showToast("error", error.message || "Failed to update password");
        return;
      }
      showToast("success", "Password updated. Please login again.");
      try { await supabase.auth.signOut(); } catch {}
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("app:signin", { detail: { mode: "login" } })
          );
        }
      } catch {}
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to update password";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="px-4 py-10">
      <div className="max-w-sm mx-auto surface rounded-2xl shadow-soft p-6">
        <div className="flex flex-col items-center gap-2 text-center mb-6">
          <h1 className="text-2xl font-bold ink-heading">Reset password</h1>
          {!verifying && error && (
            <p className="ink-muted text-sm">
              {error} {" "}
              <a href="/forgot-password" className="underline underline-offset-4">
                Request new link
              </a>
            </p>
          )}
          {!verifying && ready && (
            <p className="ink-muted text-sm">
              Enter your new password below.
            </p>
          )}
          {verifying && (
            <p className="ink-muted text-sm">Verifying your reset link…</p>
          )}
        </div>

        {ready && !verifying && !error && (
          <form onSubmit={onSubmit} className="grid gap-5">
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium ink-heading">
                New password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Enter a strong password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color)] pr-10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-orange)]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#475467]"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="confirm" className="text-sm font-medium ink-heading">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color)] pr-10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-orange)]"
                />
                <button
                  type="button"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#475467]"
                >
                  {showConfirm ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-accent w-full py-2 font-medium"
            >
              {saving ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

        {!ready && !verifying && (
          <div className="text-center text-sm mt-6">
            <a href="/login" className="underline underline-offset-4">
              Back to login
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
