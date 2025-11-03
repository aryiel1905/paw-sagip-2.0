export function clearSupabaseAuthArtifacts() {
  try {
    if (typeof window !== "undefined") {
      // Remove any Supabase localStorage keys (default prefix: sb-)
      try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (k.startsWith("sb-") || k.includes("supabase.auth")) keys.push(k);
        }
        keys.forEach((k) => localStorage.removeItem(k));
      } catch {}

      // Remove redirect flag if present
      try {
        sessionStorage.removeItem("auth:postLoginRedirect");
      } catch {}

      // Proactively clear any auth cookies used by APIs
      const expire = "; Max-Age=0; path=/";
      try { document.cookie = "sb-access-token=" + expire; } catch {}
      try { document.cookie = "sb-refresh-token=" + expire; } catch {}
      try { document.cookie = "supabase-auth-token=" + expire; } catch {}
    }
  } catch {}
}

