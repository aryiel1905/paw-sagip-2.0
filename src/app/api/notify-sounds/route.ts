import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const soundsDir = path.join(process.cwd(), "public", "sounds");
    const entries = await fs.readdir(soundsDir, { withFileTypes: true });
    const sounds = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith("."))
      .sort((a, b) => a.localeCompare(b))
      .map((file) => ({
        file,
        url: `/sounds/${file}`,
      }));
    return NextResponse.json(sounds, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
