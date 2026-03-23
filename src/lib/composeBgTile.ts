/**
 * Loads two images and composites them vertically into a single CSS data URL,
 * which is then applied as a CSS custom property (--bg-pattern-url) on the
 * document root so the body background tiles seamlessly.
 */
export function composeBgTile(headerSrc: string, continuationSrc: string): void {
  function composePairTile(
    header: HTMLImageElement,
    cont: HTMLImageElement
  ): string | null {
    const w = Math.max(header.naturalWidth || 0, cont.naturalWidth || 0);
    if (!w) return null;
    const h1 = Math.round((header.naturalHeight || 0) * (w / (header.naturalWidth || w)));
    const h2 = Math.round((cont.naturalHeight || 0) * (w / (cont.naturalWidth || w)));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h1 + h2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(header, 0, 0, w, h1);
    ctx.drawImage(cont, 0, h1, w, h2);
    return "url(" + canvas.toDataURL("image/png") + ")";
  }

  try {
    const a = new Image();
    const b = new Image();
    let ready = 0;
    function done() {
      ready++;
      if (ready < 2) return;
      const url = composePairTile(a, b);
      if (url) {
        document.documentElement.style.setProperty("--bg-pattern-url", url);
      }
    }
    a.onload = done;
    b.onload = done;
    a.src = headerSrc;
    b.src = continuationSrc;
  } catch {
    // no-op: background is decorative, failure is silent
  }
}
