import { readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : "";
};
const requestedOutput = valueAfter("--output");
const outputName = requestedOutput || "复脊_腰痛康复教育App_单文件版.html";
const outputPath = requestedOutput ? (isAbsolute(requestedOutput) ? requestedOutput : resolve(process.cwd(), requestedOutput)) : join(root, outputName);

const [index, styles, planData, contentData, mediaStore, publicMediaSource, app] = await Promise.all([
  readFile(join(root, "index.html"), "utf8"),
  readFile(join(root, "styles.css"), "utf8"),
  readFile(join(root, "plan-data.js"), "utf8"),
  readFile(join(root, "content-data.js"), "utf8"),
  readFile(join(root, "media-store.js"), "utf8"),
  readFile(join(root, "public-media.js"), "utf8"),
  readFile(join(root, "app.js"), "utf8")
]);

let publicMedia = publicMediaSource;
const mediaMapPath = valueAfter("--media-map");
if (mediaMapPath) {
  const resolvedMapPath = isAbsolute(mediaMapPath) ? mediaMapPath : resolve(process.cwd(), mediaMapPath);
  const payload = JSON.parse(await readFile(resolvedMapPath, "utf8"));
  if (!payload || !["fuji-public-media", "fuji-media-map"].includes(payload.schema) || !payload.media || typeof payload.media !== "object") {
    throw new Error("--media-map 需要复脊媒体映射 JSON");
  }
  const safeMedia = {};
  for (const [id, item] of Object.entries(payload.media)) {
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id) || item?.type !== "url") continue;
    const url = String(item.url || "").trim();
    if (/^(https?:\/\/|\.\.?\/|\/)[^\s]+$/i.test(url)) safeMedia[id] = { type: "url", url };
  }
  publicMedia = `window.FUJI_PUBLIC_MEDIA = ${JSON.stringify(safeMedia, null, 2)};`;
}

const inlineScript = (source) => source.replaceAll("</script>", "<\\/script>");
const standalone = index
  .replace(/\s*<link rel="manifest"[^>]*>/, "")
  .replace(/\s*<link rel="icon"[^>]*>/, "")
  .replace('  <link rel="stylesheet" href="./styles.css" />', `  <style>\n${styles}\n  </style>`)
  .replace('  <script src="./plan-data.js"></script>', `  <script>\n${inlineScript(planData)}\n  </script>`)
  .replace('  <script src="./content-data.js"></script>', `  <script>\n${inlineScript(contentData)}\n  </script>`)
  .replace('  <script src="./media-store.js"></script>', `  <script>\n${inlineScript(mediaStore)}\n  </script>`)
  .replace('  <script src="./public-media.js"></script>', `  <script>\n${inlineScript(publicMedia)}\n  </script>`)
  .replace('  <script src="./app.js"></script>', `  <script>\n${inlineScript(app)}\n  </script>`)
  .replace("</head>", "  <meta name=\"standalone-build\" content=\"fuji-v3\" />\n</head>");

if (process.argv.includes("--check")) {
  let existing = "";
  try { existing = await readFile(outputPath, "utf8"); } catch {}
  if (existing !== standalone) {
    console.error(`${outputName} 不是最新构建，请运行 node build-standalone.mjs`);
    process.exit(1);
  }
  console.log(`${outputName} 与源码一致`);
} else {
  await writeFile(outputPath, standalone, "utf8");
  console.log(`已生成 ${outputPath}`);
}
