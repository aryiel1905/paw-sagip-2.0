import { NextResponse } from "next/server";

// Ensure Node runtime and no caching for this route handler
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal stub to satisfy Next.js/TypeScript module resolution.
// Replace with real implementation when alerts API is needed.
export async function GET() {
  return NextResponse.json([]);
}
