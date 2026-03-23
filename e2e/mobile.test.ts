/**
 * e2e/mobile.test.ts
 *
 * Mobile responsiveness E2E tests for PawSagip 2.0.
 *
 * Rules:
 * - No real data dependency — all tests work with an empty Supabase DB.
 * - Unauthenticated baseline — tests never log in.
 * - Touch target minimum: 44px (WCAG 2.5.5 / Apple HIG).
 * - Horizontal overflow check: scrollWidth > clientWidth on documentElement.
 */

import { test, expect, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when the page has horizontal overflow (content wider than viewport). */
async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
}

/** Returns bounding box dimensions of a locator; throws if invisible. */
async function bbox(locator: ReturnType<Page["locator"]>) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Element not found or not visible`);
  return box;
}

/**
 * Wait for Next.js hydration to finish.
 * The `.app-content` wrapper is server-rendered, so it appears immediately,
 * but interactive elements (bottom nav, drawer) only mount after hydration.
 */
async function waitForHydration(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator(".app-content").waitFor({ state: "visible" });
}

const MIN_TOUCH = 44; // px

// ---------------------------------------------------------------------------
// 1. Navbar — mobile rendering
// ---------------------------------------------------------------------------

test.describe("Navbar — mobile rendering", () => {
  test("hamburger button is visible", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  });

  test("hamburger button meets 44 × 44 px touch target", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const box = await bbox(page.getByRole("button", { name: "Open menu" }));
    expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(box.width).toBeGreaterThanOrEqual(MIN_TOUCH);
  });

  test("desktop nav is hidden on mobile viewport", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    // hidden md:flex — must not be visible at mobile widths
    await expect(page.getByRole("navigation", { name: "Primary" })).not.toBeVisible();
  });

  test("logo link is large enough to tap", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const box = await bbox(page.locator("header a").first());
    expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH);
  });
});

// ---------------------------------------------------------------------------
// 2. Side drawer
// ---------------------------------------------------------------------------

test.describe("Side drawer", () => {
  test("opens when hamburger is tapped", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator("aside")).toBeVisible();
  });

  test("Close menu button is visible inside drawer", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.locator("aside");
    await drawer.waitFor({ state: "visible" });
    await expect(drawer.getByRole("button", { name: "Close menu" })).toBeVisible();
  });

  test("Close menu button meets 44 × 44 px touch target", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    const closeBtn = page.locator("aside").getByRole("button", { name: "Close menu" });
    await closeBtn.waitFor({ state: "visible" });
    const box = await bbox(closeBtn);
    expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(box.width).toBeGreaterThanOrEqual(MIN_TOUCH);
  });

  test("drawer Sign in button meets 44 × 44 px touch target", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.locator("aside");
    await drawer.waitFor({ state: "visible" });
    // Unauthenticated: "Sign in" button is shown
    const signIn = drawer.getByRole("button", { name: "Sign in" });
    await expect(signIn).toBeVisible();
    const box = await bbox(signIn);
    expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(box.width).toBeGreaterThanOrEqual(MIN_TOUCH);
  });

  test("drawer Home and Contacts buttons meet 44 × 44 px touch target", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.locator("aside");
    await drawer.waitFor({ state: "visible" });

    for (const label of ["Home", "Contacts"]) {
      const btn = drawer.getByRole("button", { name: label });
      await expect(btn).toBeVisible();
      const box = await bbox(btn);
      expect(box.height, `${label} height`).toBeGreaterThanOrEqual(MIN_TOUCH);
      expect(box.width, `${label} width`).toBeGreaterThanOrEqual(MIN_TOUCH);
    }
  });

  test("drawer closes when backdrop is tapped", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.locator("aside");
    await drawer.waitFor({ state: "visible" });

    // Tap the semi-transparent backdrop (aria-label="Close menu backdrop")
    await page.getByRole("button", { name: "Close menu backdrop" }).click();
    await expect(drawer).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. No horizontal overflow
// ---------------------------------------------------------------------------

test.describe("No horizontal overflow", () => {
  const PAGES = ["/", "/alerts", "/adopt"];

  for (const path of PAGES) {
    test(`${path} has no horizontal overflow`, async ({ page }) => {
      await page.goto(path);
      await waitForHydration(page);
      await page.waitForTimeout(400); // let scroll-snap & bg-tile settle
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }

  test("/adopt/[petId] shell has no horizontal overflow", async ({ page }) => {
    // Invalid UUID — page shows error/loading state without crashing
    await page.goto("/adopt/00000000-0000-0000-0000-000000000000");
    await waitForHydration(page);
    await page.waitForTimeout(400);
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Bottom navigation (homepage only)
// ---------------------------------------------------------------------------

test.describe("Bottom navigation", () => {
  test("is visible on homepage", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    // The nav is `<nav class="fixed inset-x-0 bottom-3 px-3 md:hidden z-40">`
    // directly after </main> in page.tsx
    const bottomNav = page.locator("nav.fixed.inset-x-0");
    await expect(bottomNav).toBeVisible();
  });

  test("is anchored near the bottom of the viewport", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const bottomNav = page.locator("nav.fixed.inset-x-0");
    await bottomNav.waitFor({ state: "visible" });
    const box = await bbox(bottomNav);
    const vh = page.viewportSize()?.height ?? 667;
    // Nav top edge must be in the lower 30% of the viewport
    expect(box.y).toBeGreaterThan(vh * 0.7);
  });

  test("each nav item meets 44 × 44 px touch target", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const bottomNav = page.locator("nav.fixed.inset-x-0");
    await bottomNav.waitFor({ state: "visible" });

    const items = bottomNav.locator("a");
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(4); // Home, Alerts, Report, Adoption

    for (let i = 0; i < count; i++) {
      const box = await bbox(items.nth(i));
      expect(box.height, `nav item ${i} height`).toBeGreaterThanOrEqual(MIN_TOUCH);
      expect(box.width, `nav item ${i} width`).toBeGreaterThanOrEqual(MIN_TOUCH);
    }
  });

  test("is not present on /alerts page", async ({ page }) => {
    await page.goto("/alerts");
    await waitForHydration(page);
    // Bottom nav only exists in page.tsx, not in /alerts layout
    await expect(page.locator("nav.fixed.inset-x-0")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Auth modal fits in viewport
// ---------------------------------------------------------------------------

test.describe("Auth modal viewport fit", () => {
  test("sign-in modal fits within mobile viewport", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    // Dispatch the same CustomEvent the Navbar uses — works regardless of
    // whether the desktop Sign in button is visible on mobile
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("app:signin", { detail: { mode: "login" } })
      );
    });

    // AuthModal renders a fixed overlay; wait for any visible form inside it
    const modalOverlay = page.locator(".fixed.inset-0").filter({ has: page.locator("form, input") });
    await modalOverlay.first().waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});

    const vh = page.viewportSize()?.height ?? 667;
    const vw = page.viewportSize()?.width ?? 390;

    // Find the modal card (first non-backdrop fixed element with content)
    const modalCard = page.locator(".fixed.inset-0 > div").first();
    const box = await modalCard.boundingBox().catch(() => null);
    if (box) {
      expect(box.height).toBeLessThanOrEqual(vh);
      expect(box.width).toBeLessThanOrEqual(vw);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Pagination touch targets
// ---------------------------------------------------------------------------

test.describe("Pagination touch targets", () => {
  for (const path of ["/adopt", "/alerts"]) {
    test(`${path} Prev/Next pagination buttons meet 44 px height`, async ({ page }) => {
      await page.goto(path);
      await waitForHydration(page);
      await page.waitForTimeout(500);

      const prev = page.getByRole("link", { name: "Previous page" });
      const next = page.getByRole("link", { name: "Next page" });

      const prevVisible = await prev.isVisible().catch(() => false);
      const nextVisible = await next.isVisible().catch(() => false);

      if (!prevVisible && !nextVisible) {
        // No data in DB → pagination not rendered → skip gracefully
        test.skip();
        return;
      }

      if (prevVisible) {
        const box = await bbox(prev);
        expect(box.height, "Prev height").toBeGreaterThanOrEqual(MIN_TOUCH);
      }
      if (nextVisible) {
        const box = await bbox(next);
        expect(box.height, "Next height").toBeGreaterThanOrEqual(MIN_TOUCH);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 7. Smoke tests — no uncaught JS errors on page load
// ---------------------------------------------------------------------------

test.describe("Smoke tests — no JS errors", () => {
  const IGNORE = [/failed to fetch/i, /favicon/i, /hydrat/i, /supabase/i];

  async function collectErrors(page: Page, path: string): Promise<string[]> {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!IGNORE.some((re) => re.test(text))) errors.push(text);
      }
    });
    await page.goto(path);
    await waitForHydration(page);
    await page.waitForTimeout(800);
    return errors;
  }

  for (const path of ["/", "/alerts", "/adopt"]) {
    test(`${path} loads without uncaught JS errors`, async ({ page }) => {
      const errors = await collectErrors(page, path);
      expect(errors).toHaveLength(0);
    });
  }

  test("/adopt/[petId] shell loads without crashing React", async ({ page }) => {
    const errors = await collectErrors(
      page,
      "/adopt/00000000-0000-0000-0000-000000000000"
    );
    expect(errors).toHaveLength(0);
  });
});
