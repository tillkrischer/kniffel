import { extname, join } from "node:path";

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json",
  ".bin": "application/octet-stream",
};

const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = pathname.replace(/^\/+/, "");
    if (safePath.includes("..")) return new Response("Not found", { status: 404 });

    const file = Bun.file(join(import.meta.dir, "dist", safePath));
    if (!(await file.exists())) return new Response("Not found", { status: 404 });
    return new Response(file, {
      headers: { "Content-Type": types[extname(safePath)] || "application/octet-stream" },
    });
  },
});

console.log(`Kniffel Move running at ${server.url}`);
