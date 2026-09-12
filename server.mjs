import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const root = resolve(import.meta.dirname);
const dataDir = resolve(process.env.DATA_DIR || join(root, "server-data"));
const uploadsDir = resolve(process.env.UPLOADS_DIR || join(root, "uploads"));
const dataFile = join(dataDir, "courseware.json");
const port = Number(process.env.PORT || 5173);
const adminToken = String(process.env.ADMIN_TOKEN || "").trim();
const maxUploadBytes = 300 * 1024 * 1024;

await mkdir(dataDir, { recursive: true });
await mkdir(uploadsDir, { recursive: true });
try { await stat(dataFile); } catch { await writeJSON({ version: 1, items: [] }); }

const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4",
  ".webm": "video/webm", ".mov": "video/quicktime"
};

async function readJSON() {
  return JSON.parse(await readFile(dataFile, "utf8"));
}

async function writeJSON(value) {
  const temporary = `${dataFile}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, dataFile);
}

function sendJSON(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}

function safeText(value, limit = 4000) {
  return String(value || "").trim().slice(0, limit);
}

async function readBody(req, limit = 2 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("请求内容过大"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function extensionFor(contentType, filename = "") {
  const fromName = extname(filename).toLowerCase().replace(/[^.a-z0-9]/g, "");
  if (fromName && fromName.length <= 8) return fromName;
  return ({ "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" })[contentType] || "";
}

function validateCourseware(input, id, previous = {}) {
  const categories = ["flexion", "extension", "compression"];
  const imageUrls = Array.isArray(input.imageUrls) ? input.imageUrls.map((item) => safeText(item, 500)).filter((item) => item.startsWith("/uploads/")).slice(0, 12) : [];
  const videoUrl = safeText(input.videoUrl, 500);
  if (!id || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw Object.assign(new Error("课件标识无效"), { status: 400 });
  if (!categories.includes(input.category)) throw Object.assign(new Error("请选择有效的疼痛触发分类"), { status: 400 });
  const actionName = safeText(input.actionName, 80);
  if (!actionName) throw Object.assign(new Error("请填写跟练动作名称"), { status: 400 });
  if (videoUrl && !videoUrl.startsWith("/uploads/")) throw Object.assign(new Error("视频地址无效"), { status: 400 });
  return {
    ...previous,
    id,
    actionName,
    category: input.category,
    videoUrl,
    imageUrls,
    tips: safeText(input.tips, 8000),
    status: input.status === "published" ? "published" : "draft",
    updatedAt: new Date().toISOString()
  };
}

async function handleAPI(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/courseware") {
    const data = await readJSON();
    return sendJSON(res, 200, { items: data.items.filter((item) => item.status === "published") });
  }
  if (url.pathname.startsWith("/api/admin/") && (!adminToken || req.headers["x-admin-token"] !== adminToken)) {
    return sendJSON(res, 401, { error: "访问码不正确" });
  }
  if (req.method === "GET" && url.pathname === "/api/admin/courseware") return sendJSON(res, 200, await readJSON());

  if (req.method === "POST" && url.pathname === "/api/admin/upload") {
    const kind = url.searchParams.get("kind");
    const type = safeText(req.headers["content-type"], 100).split(";")[0];
    const allowed = kind === "video" ? type.startsWith("video/") : kind === "image" ? type.startsWith("image/") : false;
    if (!allowed) return sendJSON(res, 415, { error: kind === "video" ? "请选择视频文件" : "请选择图片文件" });
    const body = await readBody(req, maxUploadBytes);
    if (!body.length) return sendJSON(res, 400, { error: "文件为空" });
    const extension = extensionFor(type, decodeURIComponent(safeText(req.headers["x-file-name"], 200)));
    const filename = `${kind}-${Date.now()}-${randomUUID()}${extension}`;
    await writeFile(join(uploadsDir, filename), body, { flag: "wx" });
    return sendJSON(res, 201, { url: `/uploads/${filename}`, name: safeText(req.headers["x-file-name"], 200), size: body.length, type });
  }

  const itemMatch = /^\/api\/admin\/courseware\/([a-zA-Z0-9_-]{1,80})$/.exec(url.pathname);
  if (itemMatch && req.method === "PUT") {
    const input = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    const data = await readJSON();
    const index = data.items.findIndex((item) => item.id === itemMatch[1]);
    const item = validateCourseware(input, itemMatch[1], index >= 0 ? data.items[index] : {});
    if (index >= 0) data.items[index] = item; else data.items.push(item);
    await writeJSON(data);
    return sendJSON(res, 200, { item });
  }
  if (itemMatch && req.method === "DELETE") {
    const data = await readJSON();
    data.items = data.items.filter((item) => item.id !== itemMatch[1]);
    await writeJSON(data);
    return sendJSON(res, 200, { ok: true });
  }
  return sendJSON(res, 404, { error: "接口不存在" });
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : url.pathname === "/admin" ? "/admin.html" : url.pathname;
  const isUpload = requested.startsWith("/uploads/");
  const base = isUpload ? uploadsDir : root;
  const relativePath = isUpload ? requested.slice("/uploads/".length) : requested;
  const filepath = normalize(join(base, decodeURIComponent(relativePath)));
  if (!filepath.startsWith(`${base}/`)) return sendJSON(res, 403, { error: "禁止访问" });
  let info;
  try { info = await stat(filepath); } catch { return sendJSON(res, 404, { error: "页面不存在" }); }
  if (!info.isFile()) return sendJSON(res, 404, { error: "页面不存在" });
  const headers = { "content-type": mimeTypes[extname(filepath).toLowerCase()] || "application/octet-stream", "content-length": info.size, "cache-control": isUpload ? "public, max-age=31536000, immutable" : "no-cache", "accept-ranges": "bytes" };
  let start = 0;
  let end = info.size - 1;
  const range = req.method === "GET" && req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match && (match[1] || match[2])) {
      start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
    } else start = NaN;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) {
      res.writeHead(416, { "content-range": `bytes */${info.size}` });
      return res.end();
    }
    headers["content-range"] = `bytes ${start}-${end}/${info.size}`;
    headers["content-length"] = end - start + 1;
  }
  res.writeHead(range ? 206 : 200, headers);
  if (req.method === "HEAD") return res.end();
  const stream = createReadStream(filepath, range ? { start, end } : undefined);
  stream.on("error", () => res.destroy());
  res.on("close", () => stream.destroy());
  stream.pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    if (url.pathname.startsWith("/api/")) await handleAPI(req, res, url);
    else await serveStatic(req, res, url);
  } catch (error) {
    sendJSON(res, error.status || 500, { error: error instanceof SyntaxError ? "数据格式无效" : error.message || "服务异常" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`复脊已启动：http://127.0.0.1:${port}/`);
  console.log(`康复师后台：http://127.0.0.1:${port}/admin`);
});
