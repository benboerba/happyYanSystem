import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appElement = { innerHTML: "" };
const toastElement = { textContent: "", className: "", dataset: {}, classList: { add() {}, remove() {} } };
const storage = new Map();
const localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
  key: (index) => [...storage.keys()][index] || null,
  get length() { return storage.size; }
};

const context = {
  console,
  Blob,
  URL,
  crypto,
  localStorage,
  location: { protocol: "file:" },
  navigator: {},
  FormData,
  document: {
    querySelector(selector) {
      if (selector === "#app") return appElement;
      if (selector === "#toast") return toastElement;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    body: { insertAdjacentHTML() {} },
    createElement() { return { click() {}, set href(value) { this._href = value; }, get href() { return this._href; } }; }
  },
  window: {
    indexedDB: null,
    addEventListener() {},
    setTimeout,
    clearTimeout,
    setInterval() {},
    scrollTo() {},
    confirm() { return true; }
  },
  setTimeout,
  clearTimeout
};
context.window.window = context.window;
context.window.document = context.document;
context.window.localStorage = localStorage;
context.window.location = context.location;
context.window.navigator = context.navigator;
context.window.crypto = crypto;
context.window.URL = URL;
context.window.Blob = Blob;
vm.createContext(context);

for (const filename of ["plan-data.js", "content-data.js", "media-store.js", "public-media.js"]) {
  vm.runInContext(await readFile(join(root, filename), "utf8"), context, { filename });
}
context.MediaStore = context.window.MediaStore;
vm.runInContext(await readFile(join(root, "app.js"), "utf8"), context, { filename: "app.js" });

assert.match(appElement.innerHTML, /这里没有真实手术/);
assert.match(appElement.innerHTML, /不卧床/);

const recommendation = (value) => vm.runInContext(`recommendStage(${JSON.stringify(value)}, "none")`, context);
const baseline = { pain: 1, walkMinutes: 45, sittingMinutes: 60, function: "full", legSymptoms: "none", nextDay: "stable", flare: "none14", movement: "confident", confidence: 8, goal: "run" };
assert.equal(recommendation(baseline).stageId, "performance", "高功能用户应可从中后段开始");
assert.equal(recommendation({ ...baseline, pain: 7 }).stageId, "protect", "高敏感反应应使用保护阶段");
assert.equal(recommendation({ ...baseline, function: "limited", movement: "uncertain" }).stageId, "foundation", "受限且动作不确定应从基础能力开始");
assert.equal(vm.runInContext(`recommendStage(${JSON.stringify(baseline)}, "current").mode`, context), "education", "真实术后限制必须排除通用训练");

const orange = vm.runInContext(`evaluateCheckin({ pain: 6, painResponse: "worse2", radiation: "none", quality: "good", nextDay: "bad", capacity: "normal", confidence: 5 }, null)`, context);
assert.equal(orange.code, "orange");
assert.match(orange.summary, /最低剂量/);
const red = vm.runInContext(`evaluateCheckin({ pain: 5, painResponse: "same", radiation: "weak", quality: "good", nextDay: "good", capacity: "normal", confidence: 7 }, null)`, context);
assert.equal(red.code, "red");

const conflictingBlocked = vm.runInContext(`sanitizeState({ ...initialState, started: true, safetyStatus: "blocked", safetyFlags: ["trainingWarning"], trainingPaused: false })`, context);
assert.equal(conflictingBlocked.started, false, "阻断安全状态不得渲染自主训练");
assert.equal(conflictingBlocked.trainingPaused, true, "阻断安全状态必须强制暂停");
const conflictingSurgery = vm.runInContext(`sanitizeState({ ...initialState, started: true, safetyStatus: "clear", surgeryStatus: "current", trainingPaused: false })`, context);
assert.equal(conflictingSurgery.started, false, "当前真实术后限制不得被 started 绕过");
assert.equal(conflictingSurgery.safetyStatus, "blocked");
const uncheckedStarted = vm.runInContext(`sanitizeState({ ...initialState, started: true, safetyStatus: "unchecked" })`, context);
assert.equal(uncheckedStarted.started, false, "未完成安全筛查不得进入训练");

vm.runInContext(`publishedCourseware = [{ id: "course-test", actionName: "康复师自定义动作", category: "flexion", status: "published", videoUrl: "/uploads/test.mp4", imageUrls: ["/uploads/test.png"], tips: "保持呼吸" }]; publishedCoursewareById = Object.fromEntries(publishedCourseware.map((item) => [item.id, item])); state = sanitizeState({ ...initialState, started: true, consent: true, safetyStatus: "clear", currentStageId: "life", selectedStageId: "life", doseMode: "standard" }); render();`, context);
assert.match(appElement.innerHTML, /回归生活/);
assert.match(appElement.innerHTML, /康复师自定义动作/);
assert.match(appElement.innerHTML, /屈曲不耐受/);
vm.runInContext(`state = sanitizeState({ ...state, doseMode: "minimum" }); render();`, context);
assert.match(appElement.innerHTML, /最低有效日/);
assert.doesNotMatch(appElement.innerHTML, /自我管理徽章 · 不解锁阶段/);
assert.match(vm.runInContext("renderDailyPractice()", context), /自我管理徽章 · 不解锁阶段/);

const yesterday = vm.runInContext(`todayKey(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1))`, context);
const today = vm.runInContext(`todayKey()`, context);
vm.runInContext(`state = sanitizeState({ ...initialState, started: true, safetyStatus: "clear", sessions: [{ id: "past", date: ${JSON.stringify(yesterday)}, stageId: "life" }], checkins: [] })`, context);
assert.equal(vm.runInContext(`pendingReviewSession()?.date`, context), yesterday, "次日应出现既往训练待复盘");
assert.match(vm.runInContext("renderToday()", context), /记录训练后反应/);
vm.runInContext(`state = sanitizeState({ ...state, checkins: [{ id: "review", date: ${JSON.stringify(today)}, reviewedSessionDate: ${JSON.stringify(yesterday)}, reviewKey: "session:${yesterday}" }] })`, context);
assert.equal(vm.runInContext(`pendingReviewSession()`, context), null, "关联反馈后提醒应消除");
vm.runInContext(`state = sanitizeState({ ...initialState, started: true, safetyStatus: "clear", sessions: [{ id: "today", date: ${JSON.stringify(today)}, stageId: "life" }], checkins: [] })`, context);
assert.equal(vm.runInContext(`pendingReviewSession()`, context), null, "当天训练不应立即冒充次日待办");
assert.equal(vm.runInContext(`hasTodaySession()`, context), true, "当天训练应显示等待次日状态");
assert.match(vm.runInContext("renderToday()", context), /今日训练已记录/);
vm.runInContext(`state = sanitizeState({ ...initialState, safetyStatus: "clear", sessions: [{ id: "year-boundary", date: "2026-12-31", stageId: "life" }], checkins: [] })`, context);
assert.equal(vm.runInContext(`pendingReviewSession("2027-01-01")?.date`, context), "2026-12-31", "本地日期跨月跨年仍应识别次日待办");

const cleanValues = `{ pain: 2, painResponse: "same", radiation: "none", quality: "good", nextDay: "good", capacity: "normal", confidence: 8 }`;
const firstEligibleGreen = vm.runInContext(`evaluateCheckin(${cleanValues}, 0, true)`, context);
assert.equal(firstEligibleGreen.nextStreak, 1, "恶化清零后应从一个新稳定日期重新积累");
assert.equal(vm.runInContext(`doseAfterCheckin("minimum", ${JSON.stringify(firstEligibleGreen)}, true)`, context), "minimum", "一个新稳定日期不能立即恢复剂量");
const repeatedSameDayGreen = vm.runInContext(`evaluateCheckin(${cleanValues}, 1, false)`, context);
assert.equal(repeatedSameDayGreen.nextStreak, 1, "同日期重复绿色记录必须幂等");
assert.equal(vm.runInContext(`doseAfterCheckin("minimum", ${JSON.stringify(repeatedSameDayGreen)}, false)`, context), "minimum", "同日重复提交不能把最低剂量升档");

const originalQuerySelector = context.document.querySelector;
context.document.querySelector = (selector) => {
  if (selector === "#app") return appElement;
  if (selector === "#toast") return toastElement;
  if (selector === "#postPain") return { value: "6" };
  if (selector === 'input[name="postQuality"]:checked') return { value: "good" };
  if (selector === 'input[name="postRadiation"]:checked') return { value: "none" };
  if (selector === 'input[name="finishReason"]:checked') return { value: "planned" };
  return null;
};
vm.runInContext(`state = sanitizeState({ ...initialState, started: true, safetyStatus: "clear", stableStreak: 3, doseMode: "standard" }); sessionDraft = { stageId: "life", doseMode: "standard", items: [{ id: "walk", dose: "10 分钟" }], painBefore: 2, completedCount: 1, totalCount: 1, startedAt: new Date().toISOString() }; saveSession();`, context);
assert.equal(vm.runInContext(`state.stableStreak`, context), 0, "训练后即时恶化必须使旧稳定证据失效");
assert.equal(vm.runInContext(`state.doseMode`, context), "minimum", "训练后疼痛增加应立即切换最低剂量");
context.document.querySelector = originalQuerySelector;

const migrated = vm.runInContext(`migrateLegacy({ started: true, currentWeek: 10, stableWeek: 9, baselinePain: 3, walkThreshold: 25, sessions: [{ week: 10, date: "2026-08-01" }], checkins: [] })`, context);
assert.equal(migrated.currentStageId, "life");
assert.equal(migrated.sessions[0].stageId, "life");
assert.equal(migrated.importedLegacy, true);

localStorage.clear();
localStorage.setItem("fuji_rehab_state_v2", JSON.stringify({ started: true, currentWeek: 10 }));
localStorage.setItem("fuji_rehab_state_v3", JSON.stringify({ started: true, safetyStatus: "clear" }));
localStorage.setItem("unrelated_app_key", "keep");
vm.runInContext("clearManagedState()", context);
assert.equal(localStorage.getItem("fuji_rehab_state_v2"), null, "清除必须删除旧版状态键");
assert.equal(localStorage.getItem("fuji_rehab_state_v3"), null, "清除必须删除当前状态键");
assert.equal(localStorage.getItem("unrelated_app_key"), "keep", "清除不得影响其他应用数据");
assert.equal(vm.runInContext(`loadState().started`, context), false, "清除后刷新不得从 v2 复活");

localStorage.clear();
localStorage.setItem("fuji_rehab_state_v3", "{broken");
const recovered = vm.runInContext("loadState()", context);
assert.equal(recovered.started, false);
assert.ok([...storage.keys()].some((key) => key.startsWith("fuji_rehab_state_v3_corrupt_")), "损坏状态应保留备份");

vm.runInContext(`state = sanitizeState({ ...initialState, safetyStatus: "blocked", safetyFlags: ["trainingWarning"] })`, context);
assert.throws(() => vm.runInContext(`validateStateImport({ schema: "fuji-rehab-state", state: { ...initialState, started: true, safetyStatus: "clear" } })`, context), /安全警讯/, "备份导入不得覆盖当前安全锁");
vm.runInContext(`state = sanitizeState({ ...initialState, safetyStatus: "clear" })`, context);
const importedBlocked = vm.runInContext(`validateStateImport({ schema: "fuji-rehab-state", state: { ...initialState, started: true, safetyStatus: "blocked", safetyFlags: ["weakness"], trainingPaused: false } }).data`, context);
assert.equal(importedBlocked.started, false);
assert.equal(importedBlocked.trainingPaused, true);

const originalQuerySelectorAll = context.document.querySelectorAll;
const focusFirst = { hidden: false, getAttribute: () => null, getClientRects: () => [{}], focus() { context.document.activeElement = this; } };
const focusMiddle = { hidden: false, getAttribute: () => null, getClientRects: () => [{}], focus() { context.document.activeElement = this; } };
const focusLast = { hidden: false, getAttribute: () => null, getClientRects: () => [{}], focus() { context.document.activeElement = this; } };
const focusModal = { querySelectorAll: () => [focusFirst, focusMiddle, focusLast], contains: (node) => [focusFirst, focusMiddle, focusLast].includes(node) };
context.document.querySelectorAll = (selector) => selector === ".modal-backdrop" ? [focusModal] : [];
context.document.activeElement = focusLast;
context.focusEvent = { key: "Tab", shiftKey: false, prevented: false, preventDefault() { this.prevented = true; } };
assert.equal(vm.runInContext(`trapModalFocus(focusEvent)`, context), true);
assert.equal(context.document.activeElement, focusFirst, "Tab 应从末项循环到首项");
assert.equal(context.focusEvent.prevented, true);
context.document.activeElement = focusFirst;
context.focusEvent = { key: "Tab", shiftKey: true, prevented: false, preventDefault() { this.prevented = true; } };
assert.equal(vm.runInContext(`trapModalFocus(focusEvent)`, context), true);
assert.equal(context.document.activeElement, focusLast, "Shift+Tab 应从首项循环到末项");
context.document.activeElement = { outside: true };
context.focusEvent = { key: "Tab", shiftKey: false, prevented: false, preventDefault() { this.prevented = true; } };
vm.runInContext(`trapModalFocus(focusEvent)`, context);
assert.equal(context.document.activeElement, focusFirst, "焦点意外落到模态外时应回到首项");
context.document.querySelectorAll = originalQuerySelectorAll;
context.document.activeElement = null;

assert.equal(context.window.MediaStore.normalizeVideoUrl("javascript:alert(1)"), "");
assert.equal(context.window.MediaStore.normalizeVideoUrl("./videos/demo.mp4"), "./videos/demo.mp4");
const validMap = vm.runInContext(`validateMediaImport({ schema: "fuji-media-map", media: { breathing: { type: "url", url: "./videos/a.mp4" }, curlUp: { type: "url", url: "javascript:bad" } } })`, context);
assert.deepEqual(Object.keys(validMap.data), ["breathing"]);

const scenario = context.window.APP_CONTENT.scenarios.find((item) => item.id === "restart");
assert.match(scenario.feedback, /无需偿还/);
assert.ok(scenario.retry && scenario.badge === "再次出发");

console.log("逻辑检查通过：安全分流、跨阶段起步、反馈改量、v2 迁移、损坏恢复、媒体校验与无惩罚情景均符合预期。");
