"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";
import { Eye, EyeOff } from "lucide-react";

type Mode = "login" | "signup";

export function AuthModal({
  open,
  onClose,
  initialMode = "login",
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    // basic scroll lock
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setEmail("");
    setPassword("");
    setConfirm("");
    setFullName("");
    setPhone("");
  }, [open, initialMode]);

  const loginClasses = useMemo(
    () =>
      [
        "transition-all duration-300",
        mode === "login"
          ? "opacity-100 translate-x-0 relative"
          : "opacity-0 -translate-x-6 pointer-events-none absolute inset-0",
      ].join(" "),
    [mode]
  );
  const signupClasses = useMemo(
    () =>
      [
        "transition-all duration-300",
        mode === "signup"
          ? "opacity-100 translate-x-0 relative"
          : "opacity-0 translate-x-6 pointer-events-none absolute inset-0",
      ].join(" "),
    [mode]
  );
  const loginImageClasses = useMemo(
    () =>
      [
        "transition-opacity duration-300",
        mode === "login" ? "opacity-100" : "opacity-0 pointer-events-none",
      ].join(" "),
    [mode]
  );
  const signupImageClasses = useMemo(
    () =>
      [
        "transition-opacity duration-300",
        mode === "signup" ? "opacity-100" : "opacity-0 pointer-events-none",
      ].join(" "),
    [mode]
  );

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        showToast("error", error.message || "Login failed");
        return;
      }
      showToast("success", "Logged in successfully");
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) showToast("error", err.message);
      else showToast("error", "Unable to login");
    } finally {
      setLoading(false);
    }
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      showToast("error", "Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || null,
          },
        },
      });
      if (error) {
        showToast("error", error.message || "Sign up failed");
        return;
      }
      if (data?.user && data.session) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            display_name: fullName,
            phone: phone || null,
            role: "member",
          },
          { onConflict: "id" }
        );
        if (profileError) {
          showToast(
            "error",
            profileError.message || "Failed to save profile information"
          );
          return;
        }
        showToast("success", "Account created");
        onClose();
        return;
      }
      if (data?.user && !data.session) {
        showToast("info", "Check your email to confirm");
        setMode("login");
        return;
      }
      showToast("success", "Account created");
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) showToast("error", err.message);
      else showToast("error", "Unable to sign up");
    } finally {
      setLoading(false);
    }
  }

  async function loginWithGoogle() {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) showToast("error", error.message || "Google sign-in failed");
    } catch (err: unknown) {
      if (err instanceof Error) showToast("error", err.message);
      else showToast("error", "Google sign-in not configured");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-[71] w-[800px] max-w-[92vw] overflow-hidden rounded-[20px] border border-[var(--border-color)] bg-white shadow-soft">
        <div className="grid grid-cols-1 md:[grid-template-columns:1fr_auto]">
          <div className="relative p-6 md:p-8 min-h-[455px]">
            {/* Login panel */}
            <form className={loginClasses} onSubmit={onLogin}>
              <div className="flex flex-col items-center gap-2 text-center mb-4">
                <h1 className="text-2xl md:text-3xl font-bold ink-heading">
                  Welcome
                </h1>
                <p className="text-balance text-[20px]">
                  Login to your{" "}
                  <span className="text-[var(--primary-mintgreen)] font-semibold">
                    Paw-Sagip
                  </span>{" "}
                  account
                </p>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label
                    htmlFor="login-email"
                    className="text-sm font-medium ink-heading"
                  >
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-[12px] border px-3 py-2 text-sm border-[#d8eedd] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-mintgreen)/0.4] focus:border-[var(--primary-mintgreen)] placeholder:text-[#9AA6AC]"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="text-sm font-medium ink-heading"
                    >
                      Password
                    </label>
                    <a
                      href="/forgot-password"
                      className="text-sm ink-muted underline-offset-2 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 w-full rounded-[12px] pr-10 border px-3 py-2 text-sm border-[#d8eedd] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-mintgreen)/0.4] focus:border-[var(--primary-mintgreen)]"
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#475467]"
                    >
                      {showPassword ? (
                        <EyeOff className="size-5" />
                      ) : (
                        <Eye className="size-5" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 rounded-[10px] w-full mt-2 font-medium bg-[var(--primary-orange)] text-white border-2 border-transparent hover:bg-white hover:text-[var(--primary-orange)] hover:border-[var(--primary-orange)] transition-colors"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
                <p className="text-center text-sm mt-2">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="underline underline-offset-4 text-[var(--primary-mintgreen)]"
                    onClick={() => setMode("signup")}
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </form>

            {/* Signup panel */}
            <form className={signupClasses} onSubmit={onSignup}>
              <div className="flex flex-col items-center gap-2 text-center mb-4">
                <h1 className="text-2xl md:text-3xl font-bold ink-heading">
                  Create an account
                </h1>
                <p className="text-balance text-[20px]">
                  Sign up for your{" "}
                  <span className="text-[var(--primary-mintgreen)] font-semibold">
                    Paw-Sagip
                  </span>{" "}
                  account
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label
                    htmlFor="signup-fullname"
                    className="text-sm font-medium ink-heading"
                  >
                    Full Name
                  </label>
                  <input
                    id="signup-fullname"
                    type="text"
                    placeholder="Enter your full name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 w-full rounded-[12px] border px-3 py-2 text-sm border-[#d8eedd] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-mintgreen)/0.4] focus:border-[var(--primary-mintgreen)] placeholder:text-[#9AA6AC]"
                  />
                </div>
                {/*<div className="grid gap-2">
                  <label
                    htmlFor="signup-phone"
                    className="text-sm font-medium ink-heading"
                  >
                    Phone (optional)
                  </label>
                  <input
                    id="signup-phone"
                    type="tel"
                    placeholder="e.g., 09171234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 w-full rounded-[12px] border px-3 py-2 text-sm border-[#d8eedd] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-mintgreen)/0.4] focus:border-[var(--primary-mintgreen)] placeholder:text-[#9AA6AC]"
                  />
                </div>*/}
                <div className="grid gap-2">
                  <label
                    htmlFor="signup-email"
                    className="text-sm font-medium ink-heading"
                  >
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-[12px] border px-3 py-2 text-sm border-[#d8eedd] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-mintgreen)/0.4] focus:border-[var(--primary-mintgreen)] placeholder:text-[#9AA6AC]"
                  />
                </div>
                <div className="grid gap-2">
                  <label
                    htmlFor="signup-password"
                    className="text-sm font-medium ink-heading"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 w-full rounded-[12px] pr-10 border px-3 py-2 text-sm border-[#d8eedd] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-mintgreen)/0.4] focus:border-[var(--primary-mintgreen)]"
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#475467]"
                    >
                      {showPassword ? (
                        <EyeOff className="size-5" />
                      ) : (
                        <Eye className="size-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <label
                    htmlFor="signup-confirm"
                    className="text-sm font-medium ink-heading"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirm"
                      type={showConfirm ? "text" : "password"}
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="h-12 w-full rounded-[12px] pr-10 border px-3 py-2 text-sm border-[#d8eedd] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-mintgreen)/0.4] focus:border-[var(--primary-mintgreen)]"
                    />
                    <button
                      type="button"
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#475467]"
                    >
                      {showConfirm ? (
                        <EyeOff className="size-5" />
                      ) : (
                        <Eye className="size-5" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 rounded-[10px] md:col-span-2 w-full mt-2 font-medium bg-[var(--primary-mintgreen)] text-white hover:bg-[color:var(--primary-mintgreen)/0.6] transition-colors"
                >
                  {loading ? "Signing up..." : "Sign up"}
                </button>
                <p className="text-center text-sm md:col-span-2 mt-2">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="underline underline-offset-4 text-[var(--primary-mintgreen)]"
                    onClick={() => setMode("login")}
                  >
                    Login
                  </button>
                </p>
              </div>
            </form>
          </div>

          <div className="relative hidden bg-muted md:block h-full aspect-[3/4] justify-self-end">
            {/* login image */}
            <img
              src="/LoginImage2.svg"
              alt="Login illustration"
              className={[
                "absolute inset-0 h-full w-full object-cover object-center ",
                loginImageClasses,
              ].join(" ")}
            />
            {/* placeholder for signup (reuse same asset) */}
            <img
              src="/SigninImage.svg"
              alt="Signup illustration"
              className={[
                "absolute inset-0 h-full w-full object-cover object-center ",
                signupImageClasses,
              ].join(" ")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
