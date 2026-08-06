import { cp, mkdir, rm } from "node:fs/promises";

export async function buildWeb(): Promise<void> {
  await rm("dist", { recursive: true, force: true });
  await mkdir("dist", { recursive: true });

  const result = await Bun.build({
    entrypoints: ["web/app.ts", "web/solver-worker.ts"],
    outdir: "dist",
    target: "browser",
    format: "esm",
    minify: process.env.NODE_ENV === "production",
    sourcemap: process.env.NODE_ENV === "production" ? "none" : "linked",
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error("Web build failed");
  }

  await Promise.all([
    cp("web/index.html", "dist/index.html"),
    cp("web/styles.css", "dist/styles.css"),
    cp("expected-scores.bin", "dist/expected-scores.bin"),
  ]);
}

if (import.meta.main) {
  await buildWeb();
  console.log("Built web app in dist/");
}
