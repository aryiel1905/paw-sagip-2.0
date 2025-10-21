"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";

type UserInfo = {
  email: string | null;
  fullName: string | null;
};

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchUser() {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!data.user) {
          // Not authenticated -> prompt login modal
          try {
            window.dispatchEvent(
              new CustomEvent("app:signin", { detail: { mode: "login" } })
            );
          } catch {}
          setUser(null);
        } else {
          setUser({
            email: data.user.email ?? null,
            fullName:
              (data.user.user_metadata?.full_name as string | undefined) ?? null,
          });
        }
      } catch {
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchUser();

    // update on auth changes
    try {
      const supabase = getSupabaseClient();
      const { data } = supabase.auth.onAuthStateChange((_e, session) => {
        setUser(
          session?.user
            ? {
                email: session.user.email ?? null,
                fullName:
                  (session.user.user_metadata?.full_name as string | undefined) ??
                  null,
              }
            : null
        );
        if (!session?.user) {
          try {
            window.dispatchEvent(
              new CustomEvent("app:signin", { detail: { mode: "login" } })
            );
          } catch {}
        }
      });
      return () => {
        try {
          data.subscription.unsubscribe();
        } catch {}
        mounted = false;
      };
    } catch {
      return () => {
        mounted = false;
      };
    }
  }, []);

  if (loading) {
    return (
      <main className="px-4 py-10">
        <div className="max-w-md mx-auto surface rounded-2xl shadow-soft p-6">
          <div className="ink-muted text-sm">Loading your account…</div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="px-4 py-10">
        <div className="max-w-md mx-auto surface rounded-2xl shadow-soft p-6">
          <h1 className="text-xl font-semibold ink-heading mb-2">My Account</h1>
          <p className="ink-muted text-sm mb-4">
            Please sign in to view your account details.
          </p>
          <button
            className="btn btn-accent px-4 py-2"
            onClick={() => {
              try {
                window.dispatchEvent(
                  new CustomEvent("app:signin", { detail: { mode: "login" } })
                );
              } catch {}
            }}
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-10">
      <div className="max-w-md mx-auto surface rounded-2xl shadow-soft p-6">
        <h1 className="text-2xl font-bold ink-heading mb-4">My Account</h1>
        <div className="grid gap-3 text-sm">
          <div>
            <div className="ink-subtle">Full name</div>
            <div className="ink-heading">{user.fullName || "-"}</div>
          </div>
          <div>
            <div className="ink-subtle">Email</div>
            <div className="ink-heading">{user.email || "-"}</div>
          </div>
        </div>
      </div>
    </main>
  );
}

