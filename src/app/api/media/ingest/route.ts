import { NextResponse } from "next/server";
import path from "path";
import os from "os";
import { promises as fs } from "fs";
import { spawn } from "child_process";
import { createRequire } from "module";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PET_MEDIA_BUCKET = "pet-media";
const MAX_VIDEO_SECONDS = 20;
const VIDEO_EXT_RE = /\.(mp4|mov|webm)$/i;
const requireFromHere = createRequire(import.meta.url);

function resolveFfmpegBinary() {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) return fromEnv;
  try {
    // Keep this optional so build/runtime can still work when ffmpeg-static is unavailable.
    const packageName = "ffmpeg-static";
    const resolved = requireFromHere(packageName) as string | null;
    if (typeof resolved === "string" && resolved) return resolved;
  } catch {}
  return "ffmpeg";
}

function isVideoFile(name: string, type?: string | null) {
  if (type && type.startsWith("video/")) return true;
  return VIDEO_EXT_RE.test(name);
}

async function runFfmpeg(opts: {
  inputPath: string;
  outputPath: string;
  start: number;
  duration: number;
}) {
  const bin = resolveFfmpegBinary();
  const args = [
    "-y",
    "-ss",
    opts.start.toFixed(3),
    "-t",
    opts.duration.toFixed(3),
    "-i",
    opts.inputPath,
    "-vf",
    "scale='min(1280,iw)':-2",
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-b:v",
    "3000k",
    "-maxrate",
    "3500k",
    "-bufsize",
    "6000k",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    opts.outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    proc.stderr.on("data", (chunk) => {
      err += String(chunk);
    });
    proc.on("error", (spawnErr) => {
      const code = (spawnErr as NodeJS.ErrnoException)?.code;
      if (code === "ENOENT") {
        reject(
          new Error(
            `FFmpeg executable was not found (${bin}). Install ffmpeg-static or set FFMPEG_PATH to a valid ffmpeg binary.`
          )
        );
        return;
      }
      reject(spawnErr);
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err || "ffmpeg failed"));
    });
  });
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();

  let tempDir: string | null = null;
  let sourceStoragePath: string | null = null;
  let cleanupSource = false;
  try {
    const form = await request.formData();
    const file = form.get("file");
    const target = form.get("target");
    const sourcePath = form.get("sourcePath");
    sourceStoragePath = typeof sourcePath === "string" ? sourcePath : null;
    cleanupSource = String(form.get("cleanupSource") ?? "false") === "true";
    const trimStart = Number(form.get("trimStart") ?? 0);
    const trimEnd = Number(form.get("trimEnd") ?? 0);

    if (typeof target !== "string") {
      return NextResponse.json({ error: "Missing target" }, { status: 400 });
    }
    const safeTarget =
      target === "reports" || target === "reports/landmarks" ? target : null;
    if (!safeTarget) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    if (
      (!file || typeof file !== "object" || !("arrayBuffer" in file)) &&
      !sourceStoragePath
    ) {
      return NextResponse.json(
        { error: "Missing file or source path" },
        { status: 400 }
      );
    }

    let fileName = "upload";
    let mimeType = "";
    let data: Buffer;
    if (file && typeof file === "object" && "arrayBuffer" in file) {
      fileName = (file as File).name || "upload";
      mimeType = (file as File).type || "";
      data = Buffer.from(await (file as File).arrayBuffer());
    } else {
      fileName = path.basename(sourceStoragePath as string);
      const { data: downloaded, error: downloadError } = await supabase.storage
        .from(PET_MEDIA_BUCKET)
        .download(sourceStoragePath as string);
      if (downloadError || !downloaded) {
        return NextResponse.json(
          { error: downloadError?.message || "Could not download source file" },
          { status: 500 }
        );
      }
      mimeType = downloaded.type || "";
      data = Buffer.from(await downloaded.arrayBuffer());
    }
    const isVideo = isVideoFile(fileName, mimeType);
    const isAllowedVideo =
      VIDEO_EXT_RE.test(fileName) ||
      mimeType === "video/mp4" ||
      mimeType === "video/quicktime" ||
      mimeType === "video/webm";

    if (isVideo && !isAllowedVideo) {
      return NextResponse.json(
        { error: "Only MP4, MOV, or WEBM videos are allowed." },
        { status: 400 }
      );
    }
    if (!isVideo) {
      const ext = path.extname(fileName).toLowerCase() || "";
      const uniqueName = `${crypto.randomUUID()}${ext || ""}`;
      const filePath = `${safeTarget}/${uniqueName}`;
      const { error } = await supabase.storage
        .from(PET_MEDIA_BUCKET)
        .upload(filePath, data, {
          cacheControl: "3600",
          upsert: false,
          contentType: mimeType || "application/octet-stream",
        });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ path: filePath });
    }

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ps-video-"));
    const inputPath = path.join(
      tempDir,
      `input${path.extname(fileName) || ".bin"}`
    );
    const outputPath = path.join(tempDir, "output.mp4");
    await fs.writeFile(inputPath, data);

    const start = Number.isFinite(trimStart) && trimStart > 0 ? trimStart : 0;
    const rawDuration =
      Number.isFinite(trimEnd) && trimEnd > start ? trimEnd - start : 0;
    const duration =
      rawDuration > 0
        ? Math.min(rawDuration, MAX_VIDEO_SECONDS)
        : MAX_VIDEO_SECONDS;

    await runFfmpeg({ inputPath, outputPath, start, duration });
    const out = await fs.readFile(outputPath);

    const filePath = `${safeTarget}/${crypto.randomUUID()}.mp4`;
    const { error } = await supabase.storage
      .from(PET_MEDIA_BUCKET)
      .upload(filePath, out, {
        cacheControl: "3600",
        upsert: false,
        contentType: "video/mp4",
      });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ path: filePath });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
    }
    if (cleanupSource && sourceStoragePath) {
      try {
        await supabase.storage
          .from(PET_MEDIA_BUCKET)
          .remove([sourceStoragePath]);
      } catch {}
    }
  }
}
