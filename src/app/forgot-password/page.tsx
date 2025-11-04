"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const redirectTo = `${window.location.origin}/auth/reset`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      // Always show generic success to avoid account enumeration
      if (error) {
        // Log for debugging only; keep user message generic
        try { console.warn("resetPasswordForEmail error", error); } catch {}
      }
      setSent(true);
      showToast("info", "If an account exists, check your email");
    } catch (err: unknown) {
      // Keep generic UX, but surface console for devs
      try { console.error(err); } catch {}
      setSent(true);
      showToast("info", "If an account exists, check your email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-4 py-10">
      <div className="max-w-sm mx-auto surface rounded-2xl shadow-soft p-6">
        <div className="flex flex-col items-center gap-2 text-center mb-6">
          <h1 className="text-2xl font-bold ink-heading">Forgot password</h1>
          <p className="ink-muted text-sm">
            Enter the email you used to create your account.
          </p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-5">
          <div className="grid gap-2">
            <label htmlFor="email" className="text-sm font-medium ink-heading">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-mintgreen)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-accent w-full py-2 font-medium"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        {sent && (
          <p className="text-xs ink-muted text-center mt-4">
            If an account exists for that email, you&apos;ll receive a link to
            reset your password. Be sure to check spam.
          </p>
        )}

        <div className="text-center text-sm mt-6">
          <span className="ink-muted">Remembered your password? </span>
          <a href="/login" className="underline underline-offset-4">
            Back to login
          </a>
        </div>
      </div>
    </main>
  );
}

