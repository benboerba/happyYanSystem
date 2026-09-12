import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

const args = process.argv.slice(2);
const htmlPath = resolve(args.find((arg) => !arg.startsWith("--")) || "BackPainWeb/复脊_腰痛康复教育App_单文件版.html");
const expectedMediaIndex = args.indexOf("--expect-media");
const expectedMedia = expectedMediaIndex >= 0 ? args[expectedMediaIndex + 1] : "";
const html = await readFile(htmlPath, "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
assert.ok(scripts.length >= 5, "单文件没有完整内联脚本");

const appElement = { innerHTML: "" };
const toastElement = { textContent: "", className: "", classList: { add() {}, remove() {} } };
const storage = new Map();
const context = {
  console,
  Blob,
  URL,
  crypto,
  FormData,
  location: { protocol: "file:" },
  navigator: {},
  localStorage: {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  },
  document: {
    activeElement: null,
    querySelector(selector) {
      if (selector === "#app") return appElement;
      if (selector === "#toast") return toastElement;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    body: { insertAdjacentHTML() {} },
    createElement() { return { click() {} }; }
  },
  indexedDB: null,
  setTimeout,
  clearTimeout,
  scrollTo() {},
  addEventListener() {},
  confirm() { return true; }
};
context.window = context;
vm.createContext(context);
for (const [index, source] of scripts.entries()) vm.runInContext(source, context, { filename: `${htmlPath}#script-${index + 1}` });

assert.match(appElement.innerHTML, /这里没有真实手术/);
assert.match(appElement.innerHTML, /开始安全筛查/);
assert.equal(vm.runInContext("APP_VERSION", context), 3);
if (expectedMedia) {
  assert.ok(vm.runInContext(`Boolean(state.media[${JSON.stringify(expectedMedia)}])`, context), `新用户没有读取公共媒体 ${expectedMedia}`);
  assert.equal(vm.runInContext(`state.media[${JSON.stringify(expectedMedia)}].type`, context), "url");
}

console.log(`单文件启动检查通过：${htmlPath}${expectedMedia ? `，公共媒体 ${expectedMedia} 已作为新用户默认值` : ""}`);
