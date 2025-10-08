export type ToastType = "success" | "error" | "info";

let hideTimer: number | null = null;

function ensureStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById("app-toast-style")) return;
  const style = document.createElement("style");
  style.id = "app-toast-style";
  style.textContent = `
    @keyframes ps-fade-in { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: translateY(0);} }
    @keyframes ps-fade-out { from { opacity: 1;} to { opacity: 0;} }
  `;
  document.head.appendChild(style);
}

function ensureToastEl(): HTMLDivElement | null {
  if (typeof document === "undefined") return null;
  ensureStyle();
  let el = document.getElementById("app-toast") as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = "app-toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.style.position = "fixed";
    el.style.right = "1rem";
    el.style.bottom = "1rem";
    el.style.minWidth = "260px";
    el.style.maxWidth = "340px";
    el.style.padding = ".75rem 1rem";
    el.style.borderRadius = "1rem";
    el.style.color = "#fff";
    el.style.display = "none";
    el.style.zIndex = "10000";
    el.style.boxShadow = "0 10px 25px -10px rgba(0,0,0,.2)";
    document.body.appendChild(el);
  }
  return el;
}

export function showToast(type: ToastType, message: string) {
  const el = ensureToastEl();
  if (!el) return;

  // background colors from CSS vars with sensible fallbacks
  let bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--success")
    .trim();
  if (type === "success") {
    bg =
      bg ||
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary-mintgreen")
        .trim() ||
      "#2a9d8f";
  } else if (type === "error") {
    bg =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--error")
        .trim() ||
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary-orange")
        .trim() ||
      "#f57c00";
  } else {
    bg =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--info")
        .trim() || "#2563eb";
  }

  el.textContent = message;
  el.style.background = bg || "#333";
  el.style.display = "block";
  el.style.animation = "ps-fade-in .2s ease-out both";

  if (hideTimer) {
    window.clearTimeout(hideTimer);
  }
  hideTimer = window.setTimeout(() => {
    if (!el) return;
    el.style.animation = "ps-fade-out .15s ease-in both";
    window.setTimeout(() => {
      el.style.display = "none";
      el.style.animation = "";
    }, 160);
  }, 2000);
}
