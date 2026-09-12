const APP_VERSION = 3;
const STATE_KEY = "fuji_rehab_state_v3";
const LEGACY_KEY = "fuji_rehab_state_v2";
const { weeks, cycles, exercises } = window.REHAB_DATA;
const { stages, exerciseDetails, scenarios, knowledge, safetyQuestions, sources } = window.APP_CONTENT;
const PUBLIC_MEDIA = window.FUJI_PUBLIC_MEDIA && typeof window.FUJI_PUBLIC_MEDIA === "object" ? window.FUJI_PUBLIC_MEDIA : {};
const TRAINING_RESET_KEY = "fuji_training_content_reset_20260911";

const initialState = {
  version: APP_VERSION,
  started: false,
  onboardingStep: 0,
  consent: false,
  safetyStatus: "unchecked",
  safetyFlags: [],
  surgeryStatus: "none",
  assessment: {
    pain: 4,
    walkMinutes: 12,
    sittingMinutes: 30,
    function: "limited",
    legSymptoms: "none",
    nextDay: "stable",
    flare: "recent",
    movement: "uncertain",
    confidence: 5,
    goal: "daily"
  },
  recommendation: null,
  currentStageId: "protect",
  stableStageId: "protect",
  doseMode: "standard",
  trainingPaused: false,
  pauseReason: "",
  activeView: "today",
  pathTab: "stages",
  moreTab: "learn",
  selectedStageId: "protect",
  selectedCourseWeek: 1,
  libraryFilter: "all",
  librarySearch: "",
  mediaEditorExercise: "breathing",
  checkins: [],
  sessions: [],
  microTasks: {},
  scenarioResults: {},
  badges: {},
  knowledgeRead: [],
  media: { ...PUBLIC_MEDIA },
  disabledPublicMedia: [],
  stableStreak: 0,
  lastDecision: null,
  importedLegacy: false
};

let recoveryNotice = "";
let publishedCourseware = [];
let publishedCoursewareById = {};
const categoryLabels = { flexion: "屈曲不耐受", extension: "伸展不耐受", compression: "压缩不耐受" };

function clearTrainingDataOnce() {
  if (localStorage.getItem(TRAINING_RESET_KEY)) return;
  try {
    const raw = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
    if (raw && typeof raw === "object") {
      raw.sessions = [];
      raw.checkins = [];
      raw.media = {};
      raw.disabledPublicMedia = [];
      raw.stableStreak = 0;
      raw.lastDecision = null;
      localStorage.setItem(STATE_KEY, JSON.stringify(raw));
    }
  } catch {}
  localStorage.removeItem(LEGACY_KEY);
  localStorage.setItem(TRAINING_RESET_KEY, new Date().toISOString());
  MediaStore.clear().catch(() => {});
}

clearTrainingDataOnce();
let state = loadState();
let sessionDraft = null;
let pendingMediaFile = null;
let pendingImport = null;
let timerId = null;
let deferredInstallPrompt = null;
let previewObjectUrls = [];

const app = document.querySelector("#app");
const toastNode = document.querySelector("#toast");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stageExists(id) {
  return stages.some((stage) => stage.id === id);
}

function hasSafetyBlock(candidate = state) {
  return candidate?.safetyStatus === "blocked"
    || candidate?.surgeryStatus === "current"
    || safeArray(candidate?.safetyFlags).length > 0;
}

function stageFromWeek(week) {
  if (week <= 2) return "protect";
  if (week <= 6) return "foundation";
  if (week <= 10) return "life";
  if (week <= 13) return "capacity";
  return "performance";
}

function migrateLegacy(legacy) {
  const currentStageId = stageFromWeek(clamp(legacy.currentWeek, 1, 16, 1));
  const stableStageId = stageFromWeek(clamp(legacy.stableWeek, 1, 16, 1));
  return {
    ...clone(initialState),
    started: Boolean(legacy.started),
    consent: Boolean(legacy.consent),
    safetyStatus: legacy.started ? "clear" : "unchecked",
    assessment: {
      ...clone(initialState.assessment),
      pain: clamp(legacy.baselinePain, 0, 10, 4),
      walkMinutes: clamp(legacy.walkThreshold, 1, 120, 12),
      goal: ["daily", "run", "strength", "rotation"].includes(legacy.goal) ? legacy.goal : "daily"
    },
    currentStageId,
    stableStageId,
    selectedStageId: currentStageId,
    selectedCourseWeek: clamp(legacy.currentWeek, 1, 16, 1),
    checkins: safeArray(legacy.checkins).map((entry) => ({ ...entry, reviewedSessionDate: entry.reviewedSessionDate || entry.date || "", migratedFromV2: true })),
    sessions: safeArray(legacy.sessions).map((entry) => ({ ...entry, stageId: entry.stageId || stageFromWeek(entry.week || 1) })),
    stableStreak: clamp(legacy.stableStreak, 0, 99, 0),
    lastDecision: legacy.lastDecision || null,
    importedLegacy: true
  };
}

function sanitizeState(candidate) {
  const base = clone(initialState);
  const raw = safeObject(candidate);
  const assessment = { ...base.assessment, ...safeObject(raw.assessment) };
  assessment.pain = clamp(assessment.pain, 0, 10, 4);
  assessment.walkMinutes = clamp(assessment.walkMinutes, 1, 120, 12);
  assessment.sittingMinutes = clamp(assessment.sittingMinutes, 5, 240, 30);
  assessment.confidence = clamp(assessment.confidence, 0, 10, 5);
  assessment.goal = ["daily", "run", "strength", "rotation"].includes(assessment.goal) ? assessment.goal : "daily";

  const currentStageId = stageExists(raw.currentStageId) ? raw.currentStageId : base.currentStageId;
  const stableStageId = stageExists(raw.stableStageId) ? raw.stableStageId : currentStageId;
  const disabledPublicMedia = safeArray(raw.disabledPublicMedia).filter((id) => exercises[id]);
  const publicMedia = Object.fromEntries(Object.entries(PUBLIC_MEDIA).filter(([id]) => !disabledPublicMedia.includes(id)));
  const safetyFlags = safeArray(raw.safetyFlags).filter((id) => safetyQuestions.some((item) => item.id === id));
  const surgeryStatus = ["none", "past", "current"].includes(raw.surgeryStatus) ? raw.surgeryStatus : "none";
  const requestedSafetyStatus = ["unchecked", "clear", "blocked"].includes(raw.safetyStatus) ? raw.safetyStatus : "unchecked";
  const safetyBlocked = requestedSafetyStatus === "blocked" || surgeryStatus === "current" || safetyFlags.length > 0;
  const pauseReason = typeof raw.pauseReason === "string" ? raw.pauseReason.slice(0, 500) : "";
  return {
    ...base,
    version: APP_VERSION,
    started: safetyBlocked || requestedSafetyStatus !== "clear" ? false : Boolean(raw.started),
    onboardingStep: safetyBlocked ? 1 : clamp(raw.onboardingStep, 0, 3, 0),
    consent: Boolean(raw.consent),
    safetyStatus: safetyBlocked ? "blocked" : requestedSafetyStatus,
    safetyFlags,
    surgeryStatus,
    assessment,
    recommendation: raw.recommendation && stageExists(raw.recommendation.stageId) ? raw.recommendation : null,
    currentStageId,
    stableStageId,
    doseMode: ["standard", "reduced", "minimum"].includes(raw.doseMode) ? raw.doseMode : "standard",
    trainingPaused: safetyBlocked ? true : Boolean(raw.trainingPaused),
    pauseReason: safetyBlocked ? (pauseReason || "存在尚未通过完整安全再筛的警讯，通用自主训练保持暂停。") : pauseReason,
    activeView: ["today", "path", "library", "review", "more"].includes(raw.activeView) ? raw.activeView : "today",
    pathTab: ["stages", "course"].includes(raw.pathTab) ? raw.pathTab : "stages",
    moreTab: ["learn", "safety", "media", "data"].includes(raw.moreTab) ? raw.moreTab : "learn",
    selectedStageId: stageExists(raw.selectedStageId) ? raw.selectedStageId : currentStageId,
    selectedCourseWeek: clamp(raw.selectedCourseWeek, 1, 16, 1),
    libraryFilter: typeof raw.libraryFilter === "string" ? raw.libraryFilter : "all",
    librarySearch: typeof raw.librarySearch === "string" ? raw.librarySearch.slice(0, 60) : "",
    mediaEditorExercise: exercises[raw.mediaEditorExercise] ? raw.mediaEditorExercise : "breathing",
    checkins: safeArray(raw.checkins).filter((item) => item && typeof item === "object").slice(0, 180),
    sessions: safeArray(raw.sessions).filter((item) => item && typeof item === "object").slice(0, 365),
    microTasks: safeObject(raw.microTasks),
    scenarioResults: safeObject(raw.scenarioResults),
    badges: safeObject(raw.badges),
    knowledgeRead: safeArray(raw.knowledgeRead).filter((id) => knowledge.some((item) => item.id === id)),
    media: sanitizeMediaMap({ ...publicMedia, ...safeObject(raw.media) }),
    disabledPublicMedia,
    stableStreak: clamp(raw.stableStreak, 0, 99, 0),
    lastDecision: raw.lastDecision && typeof raw.lastDecision === "object" ? raw.lastDecision : null,
    importedLegacy: Boolean(raw.importedLegacy)
  };
}

function sanitizeMediaMap(value) {
  const result = {};
  Object.entries(safeObject(value)).forEach(([exerciseId, item]) => {
    if (!exercises[exerciseId] || !item || typeof item !== "object") return;
    if (item.type === "url") {
      const url = MediaStore.normalizeVideoUrl(item.url);
      if (url) result[exerciseId] = { type: "url", url, updatedAt: String(item.updatedAt || "") };
    }
    if (item.type === "local" && typeof item.name === "string") {
      result[exerciseId] = {
        type: "local",
        name: item.name.slice(0, 180),
        size: clamp(item.size, 0, 500000000, 0),
        mime: String(item.mime || "video/mp4").slice(0, 80),
        updatedAt: String(item.updatedAt || "")
      };
    }
  });
  return result;
}

function loadState() {
  const currentRaw = localStorage.getItem(STATE_KEY);
  if (currentRaw) {
    try {
      return sanitizeState(JSON.parse(currentRaw));
    } catch {
      const backupKey = `${STATE_KEY}_corrupt_${Date.now()}`;
      try { localStorage.setItem(backupKey, currentRaw.slice(0, 200000)); } catch {}
      localStorage.removeItem(STATE_KEY);
      recoveryNotice = "检测到损坏的本地记录，已保留原始备份并恢复为空白状态。";
      return clone(initialState);
    }
  }
  const legacyRaw = localStorage.getItem(LEGACY_KEY);
  if (legacyRaw) {
    try {
      const migrated = sanitizeState(migrateLegacy(JSON.parse(legacyRaw)));
      recoveryNotice = "已保留并迁移旧版训练与复盘记录。";
      return migrated;
    } catch {
      recoveryNotice = "旧版记录无法读取，应用已安全恢复为空白状态。";
    }
  }
  return clone(initialState);
}

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    toast("本地存储空间不足，请先导出记录或移除大文件。", "error");
  }
}

function clearManagedState() {
  const managedKeys = new Set([STATE_KEY, LEGACY_KEY]);
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(`${STATE_KEY}_corrupt_`)) managedKeys.add(key);
  }
  managedKeys.forEach((key) => localStorage.removeItem(key));
}

function updateState(patch, shouldRender = true) {
  state = sanitizeState({ ...state, ...patch });
  saveState();
  if (shouldRender) render();
}

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function localDateFromKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPastLocalDate(key, reference = todayKey()) {
  const date = localDateFromKey(key);
  const referenceDate = localDateFromKey(reference);
  return Boolean(date && referenceDate && date.getTime() < referenceDate.getTime());
}

function pendingReviewSession(reference = todayKey()) {
  const reviewedDates = new Set(state.checkins.map((item) => {
    if (Object.prototype.hasOwnProperty.call(item, "reviewedSessionDate")) return item.reviewedSessionDate;
    return item.sessionDate || item.date;
  }).filter(Boolean));
  return state.sessions
    .filter((item) => isPastLocalDate(item.date, reference) && !reviewedDates.has(item.date))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
}

function hasTodaySession(reference = todayKey()) {
  return state.sessions.some((item) => item.date === reference);
}

function dateLabel() {
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(new Date());
}

function escapeHTML(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function toast(message, tone = "info") {
  toastNode.textContent = message;
  toastNode.dataset.tone = tone;
  toastNode.classList.add("show");
  window.setTimeout(() => toastNode.classList.remove("show"), 2800);
}

function currentStage() {
  return stages.find((stage) => stage.id === state.currentStageId) || stages[0];
}

function selectedStage() {
  return stages.find((stage) => stage.id === state.selectedStageId) || currentStage();
}

function stageIndex(id) {
  return stages.findIndex((stage) => stage.id === id);
}

function goalName(goal = state.assessment.goal) {
  return { daily: "恢复日常", run: "回归跑步", strength: "力量与搬重", rotation: "球类与旋转" }[goal] || "恢复日常";
}

function doseMeta(mode = state.doseMode) {
  return {
    standard: { label: "计划剂量", tone: "green", note: "按当前阶段的保守起始量完成，仍需观察次日反应。" },
    reduced: { label: "减量日", tone: "yellow", note: "今天使用较少组次或更短时间；这是计划的一部分。" },
    minimum: { label: "最低有效日", tone: "orange", note: "撤销最近增加的挑战，只保留最容易观察反应的剂量。" }
  }[mode];
}

function moreConservative(current, requested) {
  const order = { standard: 0, reduced: 1, minimum: 2 };
  return order[requested] > order[current] ? requested : current;
}

function resolveDose(text) {
  const walk = Math.max(2, Math.round(state.assessment.walkMinutes * 0.6));
  const walkReduced = Math.max(2, Math.round(state.assessment.walkMinutes * 0.4));
  return String(text).replaceAll("{walk}", walk).replaceAll("{walkReduced}", walkReduced);
}

function planFor(stage = currentStage(), mode = state.doseMode) {
  return stage.plan.map((entry) => ({ ...entry, dose: resolveDose(entry.doses[mode]) }));
}

function publishedPlanFor() {
  return publishedCourseware.map((item) => ({ id: item.id, dose: "跟随视频完成", why: `${categoryLabels[item.category] || "康复师分类"}课件` }));
}

async function loadPublishedCourseware() {
  try {
    const response = await fetch("/api/courseware", { cache: "no-store" });
    if (!response.ok) throw new Error("课件服务不可用");
    const payload = await response.json();
    publishedCourseware = Array.isArray(payload.items) ? payload.items.filter((item) => item?.id && item?.actionName && categoryLabels[item.category]) : [];
    publishedCoursewareById = Object.fromEntries(publishedCourseware.map((item) => [item.id, item]));
    render();
  } catch {
    publishedCourseware = [];
    publishedCoursewareById = {};
    render();
  }
}

function decisionMeta(code) {
  return {
    green: { label: "稳定反馈", tone: "green", action: "继续观察" },
    yellow: { label: "维持并减量", tone: "yellow", action: "使用减量计划" },
    orange: { label: "撤销最近变化", tone: "orange", action: "使用最低剂量" },
    red: { label: "停止自主训练", tone: "red", action: "查看就医路径" }
  }[code] || { label: "等待复盘", tone: "neutral", action: "记录次日反应" };
}

function uniqueReturnDays() {
  const days = new Set([
    ...state.checkins.map((item) => item.date),
    ...state.sessions.map((item) => item.date),
    ...Object.keys(state.microTasks)
  ].filter(Boolean));
  return days.size;
}

function earnedBadges() {
  const badges = { ...state.badges };
  if (state.sessions.length || state.checkins.length) badges["如实记录"] = true;
  const activeDays = [...new Set([
    ...state.sessions.map((item) => item.date),
    ...state.checkins.map((item) => item.date),
    ...Object.keys(state.microTasks)
  ].filter(Boolean))].sort();
  if (activeDays.some((date, index) => index > 0 && (new Date(date) - new Date(activeDays[index - 1])) / 86400000 > 1)) badges["再次出发"] = true;
  return badges;
}

function recentStageSessions() {
  const cutoff = Date.now() - 14 * 86400000;
  return state.sessions.filter((item) => item.stageId === state.currentStageId && new Date(item.completedAt || item.date).getTime() >= cutoff);
}

function dailyIndex(length, salt = 0) {
  const number = Number(todayKey().replaceAll("-", ""));
  return (number + salt) % length;
}

function recommendStage(assessment, surgeryStatus) {
  const reasons = [];
  if (surgeryStatus === "current") {
    return { stageId: "protect", mode: "education", reasons: ["你正在真实术后恢复或仍有手术团队活动限制，通用自主训练不适用。"] };
  }
  if (assessment.legSymptoms === "weak" || (assessment.pain >= 8 && assessment.function === "basic-hard")) {
    return { stageId: "protect", mode: "education", reasons: ["当前症状或基本功能受限程度需要先由医疗专业人员判断。"] };
  }
  if (assessment.legSymptoms === "below" || assessment.pain >= 6 || assessment.flare === "active" || assessment.nextDay === "worse" || assessment.walkMinutes <= 5) {
    reasons.push("当前症状或延迟反应仍较敏感，先减少反复致痛暴露。", "保留短时、可耐受活动，并观察训练后、当晚与次日反应。");
    return { stageId: "protect", mode: "training", reasons };
  }
  if (assessment.function === "limited" || assessment.movement === "uncertain" || assessment.walkMinutes < 15 || assessment.confidence < 4) {
    reasons.push("基本生活可以进行，但动作控制、步行耐受或信心仍需建立。", "从短杠杆与髋驱动工具开始，允许随时退阶。");
    return { stageId: "foundation", mode: "training", reasons };
  }
  if (assessment.function === "daily" || assessment.walkMinutes < 25 || assessment.flare === "recent") {
    reasons.push("基础动作已较稳定，当前重点是把耐力带回坐站、步行、台阶和家务。", "先扩展生活容量，再考虑外部负荷或专项速度。");
    return { stageId: "life", mode: "training", reasons };
  }
  const performanceReady = assessment.function === "full"
    && assessment.movement === "confident"
    && assessment.walkMinutes >= 30
    && assessment.pain <= 2
    && assessment.flare === "none14"
    && assessment.goal !== "daily";
  if (performanceReady) {
    reasons.push("日常功能、步行耐受和基础动作自评已较稳定。", "可以从低速、亚最大专项开始，但这不是医疗或比赛许可。");
    return { stageId: "performance", mode: "training", reasons };
  }
  reasons.push("日常功能已较稳定，但目标任务仍需要可控负荷和容量。", "先练推、拉、下蹲、提拉与携行，再决定专项入口。");
  return { stageId: "capacity", mode: "training", reasons };
}

function render() {
  stopTimer();
  previewObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  previewObjectUrls = [];
  if (!state.started) renderOnboarding();
  else renderShell();
  if (recoveryNotice) {
    const notice = recoveryNotice;
    recoveryNotice = "";
    window.setTimeout(() => toast(notice), 80);
  }
}

function renderOnboarding() {
  const step = state.onboardingStep;
  app.innerHTML = `
    <main class="onboarding-shell">
      <header class="onboarding-header">
        <a class="wordmark" href="#" data-action="onboarding-home" aria-label="复脊首页"><span class="wordmark-mark">脊</span><span><strong>复脊</strong><small>腰背恢复教育</small></span></a>
        <span class="step-count">0${step + 1} / 04</span>
      </header>
      <div class="onboarding-progress"><span style="width:${((step + 1) / 4) * 100}%"></span></div>
      ${step === 0 ? renderWelcome() : step === 1 ? renderSafetyScreen() : step === 2 ? renderAssessment() : renderRecommendation()}
    </main>`;
  bindRangeLabels();
}

function renderWelcome() {
  return `
    <section class="welcome-grid">
      <div class="welcome-copy reveal">
        <p class="eyebrow">从你现在能承受的位置开始</p>
        <h1>认真恢复，<br><em>不必假装坚强。</em></h1>
        <p class="lead">这里没有真实手术。“虚拟手术”表示：给恢复留出时间，认真安排活动、训练与生活，从目前能承受的水平逐步回归。</p>
        <div class="principle-strip"><span>不卧床</span><span>不试痛</span><span>不按积分升级</span><span>允许退回</span></div>
        <div class="consent-sheet">
          <label class="check-row"><input type="checkbox" id="consentUse" /><span><strong>我理解这不是诊断、真实术后医嘱或疗效保证</strong><small>这是 McGill 启发的教育性改编；阶段描述活动起点，不代表组织损伤或医学分期。</small></span></label>
          <label class="check-row"><input type="checkbox" id="consentData" /><span><strong>我同意在本机保存训练与症状记录</strong><small>无需账号，记录只保存在当前浏览器，可随时导出或清除。</small></span></label>
        </div>
        <button class="primary-button wide" data-action="accept-consent">开始安全筛查 <span>→</span></button>
      </div>
      <aside class="welcome-art reveal delay">
        <div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div>
        <div class="recovery-window"><span>保护窗口</span><i></i><strong>活动</strong><i></i><strong>能力</strong><i></i><strong>回归</strong></div>
        <p class="art-note"><span>今天的原则</span>给身体一个诚实的剂量</p>
        <div class="art-caption"><strong>5</strong><span>个能力阶段<br>从当前状态开始</span></div>
      </aside>
    </section>`;
}

function safetyLevelCopy(level) {
  return {
    urgent: ["立即处理", "中国大陆可拨打 120 或前往急诊"],
    sameDay: ["当日求助", "联系医生或当日医疗服务"],
    soon: ["尽快预约", "安排医生或康复专业人员评估"]
  }[level];
}

function renderSafetyScreen() {
  if (state.safetyStatus === "blocked") return renderSafetyBlocked();
  return `
    <section class="form-page safety-intake reveal">
      <div class="form-intro">
        <p class="eyebrow">先看安全，再谈训练</p>
        <h1>这些情况，<br>不要在应用里测试。</h1>
        <p>下方急诊提醒始终可见，不需要完成整份问卷。未勾选只表示“目前没有报告”，不代表风险已被排除。</p>
        <div class="urgent-mini"><strong>立即处理</strong><p>新排尿困难或失控、会阴麻木、双腿症状快速加重、伴胸痛或严重事故后腰痛。</p></div>
      </div>
      <div class="form-sheet">
        <fieldset class="plain-fieldset"><legend>今天是否存在以下任一情况？</legend>
          ${safetyQuestions.map((item) => {
            const copy = safetyLevelCopy(item.level);
            return `<label class="safety-option"><input type="checkbox" name="safetyFlag" value="${item.id}" /><span>${item.label}</span><small class="${item.level}">${copy[0]}</small></label>`;
          }).join("")}
        </fieldset>
        <fieldset class="radio-fieldset surgery-field"><legend>你是否正在真实腰椎术后恢复？</legend><div>
          ${radioOption("surgeryStatus", "none", "没有", true)}
          ${radioOption("surgeryStatus", "past", "很久前做过，当前无手术团队限制")}
          ${radioOption("surgeryStatus", "current", "正在恢复或仍有限制")}
        </div></fieldset>
        <label class="check-row compact"><input type="checkbox" id="adultConfirm" /><span>我已满 18 岁，并理解这是自主教育工具</span></label>
        <div class="button-row"><button class="text-button" data-action="back-onboarding">← 返回</button><button class="primary-button" data-action="submit-safety">提交安全筛查 <span>→</span></button></div>
      </div>
    </section>`;
}

function renderSafetyBlocked() {
  const flagged = safetyQuestions.filter((item) => state.safetyFlags.includes(item.id));
  const highest = flagged.some((item) => item.level === "urgent") ? "urgent" : flagged.some((item) => item.level === "sameDay") ? "sameDay" : "soon";
  const copy = safetyLevelCopy(highest);
  return `
    <section class="blocked-screen reveal">
      <div class="blocked-code">${highest === "urgent" ? "120" : "暂停"}</div>
      <div><p class="eyebrow">通用自主训练已锁定</p><h1>${copy[0]}：${copy[1]}</h1>
        <p>应用不能判断病因。你报告的情况需要先由医疗专业人员评估；不要用动作或训练来“验证”它。</p>
        <ul>${flagged.map((item) => `<li>${item.label}</li>`).join("")}${state.surgeryStatus === "current" ? "<li>正在真实术后恢复或仍有手术团队活动限制</li>" : ""}</ul>
        <div class="blocked-actions"><a class="primary-button" href="tel:120">中国大陆急救 120 <span>→</span></a><button class="secondary-button" data-action="restart-safety">我刚才选错了，重新完整筛查</button></div>
        <p class="fine-print">以上提醒不是诊断，也不是所有危险情况的穷尽清单。</p>
      </div>
    </section>`;
}

function renderAssessment() {
  const a = state.assessment;
  return `
    <section class="assessment-page reveal">
      <div class="assessment-head"><div><p class="eyebrow">活动起点建议</p><h1>现在能做什么，<br>比痛了多久更重要。</h1></div><p>回答生活功能、活动耐受和延迟反应。结果不会判断椎间盘、神经受压或“脊柱不稳”。</p></div>
      <form class="assessment-form" id="assessmentForm">
        <section class="assessment-block"><span class="question-number">01</span><div><h2>今天的症状与活动耐受</h2>
          <label class="range-field"><span><strong>腰背疼痛或不适</strong><output data-output="assessPain">${a.pain}</output></span><input type="range" id="assessPain" min="0" max="10" value="${a.pain}" /><small><span>0 无</span><span>10 难以承受</span></small></label>
          <label class="range-field"><span><strong>症状明显上升前，可连续步行</strong><output data-output="assessWalk">${a.walkMinutes} 分钟</output></span><input type="range" id="assessWalk" min="1" max="60" value="${a.walkMinutes}" /><small><span>1 分钟</span><span>60 分钟</span></small></label>
          <label class="range-field"><span><strong>需要换姿势前，可连续坐</strong><output data-output="assessSit">${a.sittingMinutes} 分钟</output></span><input type="range" id="assessSit" min="5" max="120" step="5" value="${a.sittingMinutes}" /><small><span>5 分钟</span><span>120 分钟</span></small></label>
        </div></section>
        <section class="assessment-block"><span class="question-number">02</span><div><h2>当前生活功能</h2>
          ${radioCards("function", [["basic-hard", "基本生活很困难", "起床、穿衣或短距离走动都明显受限"], ["limited", "可以完成但常需调整", "坐站、弯腰、家务需要缩短或借助"], ["daily", "日常基本可控", "工作与家务可以完成，但容量不足"], ["full", "日常稳定，准备回归运动", "目标是负荷、速度或专项表现"]], a.function)}
        </div></section>
        <section class="assessment-block"><span class="question-number">03</span><div><h2>症状走向与延迟反应</h2>
          ${compactRadio("腿部症状", "legSymptoms", [["none", "没有"], ["thigh", "到臀部或大腿"], ["below", "稳定地到小腿或足"], ["weak", "新发／加重麻木或无力"]], a.legSymptoms)}
          ${compactRadio("活动后的次日反应", "nextDay", [["better", "更轻松"], ["stable", "接近基线"], ["mixed", "有轻度波动"], ["worse", "明显更痛或更难活动"]], a.nextDay)}
          ${compactRadio("最近一次明显反跳", "flare", [["active", "正在发生"], ["recent", "近 14 天发生过"], ["none14", "至少 14 天没有"]], a.flare)}
        </div></section>
        <section class="assessment-block"><span class="question-number">04</span><div><h2>动作信心与目标</h2>
          ${compactRadio("侧翻起床、坐站与髋铰链", "movement", [["uncertain", "不确定或容易失控"], ["manageable", "可以完成但需提醒"], ["confident", "重复完成也较稳定"]], a.movement)}
          <label class="range-field"><span><strong>对活动的信心</strong><output data-output="assessConfidence">${a.confidence}</output></span><input type="range" id="assessConfidence" min="0" max="10" value="${a.confidence}" /><small><span>0 很担心</span><span>10 很有把握</span></small></label>
          ${compactRadio("最想恢复", "goal", [["daily", "日常生活"], ["run", "跑步"], ["strength", "力量／搬重"], ["rotation", "球类／旋转"]], a.goal)}
        </div></section>
        <div class="assessment-submit"><button type="button" class="text-button" data-action="back-onboarding">← 返回</button><button type="submit" class="primary-button">查看保守起点建议 <span>→</span></button></div>
      </form>
    </section>`;
}

function radioOption(name, value, label, checked = false) {
  return `<label><input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""} /><span>${label}</span></label>`;
}

function compactRadio(legend, name, options, selected) {
  return `<fieldset class="radio-fieldset"><legend>${legend}</legend><div>${options.map(([value, label]) => radioOption(name, value, label, selected === value)).join("")}</div></fieldset>`;
}

function radioCards(name, options, selected) {
  return `<div class="assessment-options">${options.map(([value, title, desc]) => `<label><input type="radio" name="${name}" value="${value}" ${selected === value ? "checked" : ""} /><span><strong>${title}</strong><small>${desc}</small></span></label>`).join("")}</div>`;
}

function renderRecommendation() {
  const recommendation = state.recommendation || recommendStage(state.assessment, state.surgeryStatus);
  const stage = stages.find((item) => item.id === recommendation.stageId);
  const index = stageIndex(stage.id);
  const conservative = index > 0 ? stages[index - 1] : null;
  return `
    <section class="recommendation-page reveal">
      <div class="recommendation-code"><small>建议活动起点</small><strong>0${stage.order}</strong><span>${stage.label}</span></div>
      <div class="recommendation-copy"><p class="eyebrow">${recommendation.mode === "education" ? "先专业评估" : "保守的产品建议"}</p><h1>${recommendation.mode === "education" ? "先暂停通用训练。" : `从“${stage.name}”开始。`}</h1>
        <p class="recommendation-purpose">${recommendation.mode === "education" ? recommendation.reasons[0] : stage.purpose}</p>
        <ol>${recommendation.reasons.map((reason) => `<li>${reason}</li>`).join("")}</ol>
        <div class="heuristic-note"><strong>这不是医学分期或经过临床验证的算法</strong><p>它只把你的自评转成一个保守的活动起点。你可以随时退阶、重新评估或改由专业人员制定计划。</p></div>
        ${recommendation.mode === "education" ? `<button class="primary-button" data-action="start-education-mode">进入教育与记录模式 <span>→</span></button>` : `
          <div class="start-choice">
            <button class="primary-button" data-action="accept-stage" data-stage="${stage.id}">按建议开始 <span>→</span></button>
            ${conservative ? `<button class="secondary-button" data-action="accept-stage" data-stage="${conservative.id}">从更保守的“${conservative.name}”开始</button>` : ""}
          </div>`}
        <button class="text-button" data-action="back-onboarding">← 修改回答</button>
      </div>
    </section>`;
}

function renderShell() {
  const nav = [["today", "今日", "01"], ["path", "路线", "02"], ["library", "动作", "03"], ["review", "复盘", "04"], ["more", "更多", "05"]];
  const stage = currentStage();
  const decision = decisionMeta(state.lastDecision?.code);
  app.innerHTML = `
    <div class="product-shell">
      <aside class="sidebar">
        <a class="wordmark light" href="#" data-view="today"><span class="wordmark-mark">脊</span><span><strong>复脊</strong><small>腰背恢复教育</small></span></a>
        <nav class="side-nav" aria-label="主导航">${nav.map(([id, label, number]) => `<button data-view="${id}" class="${state.activeView === id ? "active" : ""}"><span>${number}</span>${label}</button>`).join("")}</nav>
        <div class="sidebar-status ${decision.tone}"><small>当前活动阶段</small><strong>${stage.name}</strong><span>${doseMeta().label} · ${decision.label}</span></div>
        <p class="sidebar-disclaimer">教育与记录工具 · 非医学分期<br>出现警讯请及时就医</p>
      </aside>
      <main class="main-content">${renderTopbar()}<div class="view-container">${renderActiveView()}</div></main>
      <nav class="mobile-nav" aria-label="移动端主导航">${nav.map(([id, label, number]) => `<button data-view="${id}" class="${state.activeView === id ? "active" : ""}"><span>${number}</span>${label}</button>`).join("")}</nav>
    </div>`;
  bindRangeLabels();
}

function renderTopbar() {
  const titles = { today: "今天", path: "恢复路线", library: "动作教学", review: "反应复盘", more: "知识与设置" };
  return `<header class="topbar"><div><p>${dateLabel()}</p><h1>${titles[state.activeView]}</h1></div><div class="topbar-meta"><span>目标 · ${goalName()}</span><strong>S${currentStage().order}</strong></div></header>`;
}

function renderActiveView() {
  return { today: renderToday, path: renderPath, library: renderLibrary, review: renderReview, more: renderMore }[state.activeView]();
}

function renderToday() {
  const stage = currentStage();
  const meta = doseMeta();
  const plan = publishedPlanFor();
  const microIndex = dailyIndex(stage.microTasks.length, stage.order);
  const microTask = stage.microTasks[microIndex];
  const microDone = state.microTasks[todayKey()] === microTask;
  const scenario = scenarios[dailyIndex(scenarios.length, 17)];
  const scenarioResult = state.scenarioResults[todayKey()];
  const returns = uniqueReturnDays();
  const badges = earnedBadges();
  const pendingReview = pendingReviewSession();
  const waitingForTomorrow = !pendingReview && hasTodaySession();
  return `
    ${state.trainingPaused ? renderPauseBanner() : ""}
    <section class="stage-hero reveal">
      <div class="stage-code"><span>活动起点</span><strong>0${stage.order}</strong><small>不是损伤等级</small></div>
      <div class="stage-headline"><p class="eyebrow">${stage.label} · ${stage.courseWeeks}</p><h2>${stage.name}</h2><p>${stage.purpose}</p></div>
      <div class="dose-ticket ${meta.tone}"><small>今天使用</small><strong>${meta.label}</strong><p>${meta.note}</p></div>
    </section>
    ${pendingReview ? `<button class="nextday-banner due" data-view="review"><span>${pendingReview.date} 的训练待复盘</span><strong>记录睡眠、晨起和日常活动反应 →</strong></button>` : waitingForTomorrow ? `<div class="nextday-banner waiting"><span>今天的训练正在等待延迟反应</span><strong>明天再记录睡眠、晨起和日常活动变化</strong></div>` : ""}
    <section class="dashboard-grid home-grid">
      <article class="training-sheet reveal delay">
        <div class="section-heading"><div><p class="eyebrow">今日主训练</p><h3>${stage.minutes[state.doseMode]}</h3></div><span class="duration">${plan.length} 个项目</span></div>
        <p class="plan-why">${plan.length ? "以下为康复师已发布的跟练课件，请按专业建议选择。" : "康复师尚未发布跟练课件。"}</p>
        ${plan.length ? `<ol class="exercise-list">${plan.map((entry, index) => renderPlanItem(entry, index)).join("")}</ol>` : `<div class="courseware-empty"><span>CONTENT PENDING</span><strong>跟练内容待发布</strong><p>康复师发布视频、动作拆解图和注意要领后，会在这里自动生效。</p></div>`}
        ${state.trainingPaused ? `<button class="primary-button wide" data-view="more" data-more-tab="safety">训练已暂停，查看安全路径 <span>→</span></button>` : plan.length ? `<button class="primary-button wide start-session" data-action="start-session">开始今天的跟练 <span>→</span></button>` : ""}
        <p class="heuristic-inline">组次、分值和连续天数是用于安排练习的产品启发式，未经临床验证，不构成医疗许可。</p>
      </article>
      <aside class="today-aside reveal delay-two">
        <article class="micro-card ${microDone ? "done" : ""}"><p class="eyebrow">今日微任务</p><h3>${microTask}</h3><p>完成或不完成都不会扣分；只记录真实生活中的一次尝试。</p><button class="text-button" data-action="toggle-micro">${microDone ? "已记录，点此撤销" : "记录这次尝试 →"}</button></article>
        <article class="return-card"><p class="eyebrow">温和回访</p><div><strong>${returns}</strong><span>个不同日期<br>回来照顾过自己</span></div><p>${returns === 0 ? "第一次回来就已经是开始。" : returns < 4 ? "中断不会清零，下次回来从合适剂量继续。" : "你在练习诚实反馈，而不是刷完成率。"}</p></article>
        <article class="badge-card"><p class="eyebrow">自我管理徽章 · 不解锁阶段</p><div>${["会调整", "如实记录", "再次出发"].map((name) => `<span class="${badges[name] ? "earned" : ""}"><i>${badges[name] ? "✓" : "○"}</i><strong>${name}</strong></span>`).join("")}</div><p>它们只肯定调整、诚实记录与重新开始，不评价疼痛，也不计算分数。</p></article>
      </aside>
    </section>
    <section class="scenario-card reveal">
      <div class="scenario-story"><p class="eyebrow">情景选择 · 不计分</p><h3>${scenario.title}</h3><p>${scenario.context}</p></div>
      <div class="scenario-options">${scenario.options.map((option, index) => `<button data-scenario="${scenario.id}" data-choice="${index}" ${scenarioResult?.correct ? "disabled" : ""} class="${scenarioResult && Number(scenarioResult.choice) === index ? "chosen" : ""}"><span>${String.fromCharCode(65 + index)}</span>${option}</button>`).join("")}</div>
      ${scenarioResult ? `<div class="scenario-feedback ${scenarioResult.correct ? "correct" : "gentle"}"><strong>${scenarioResult.correct ? `已获得“${scenario.badge}”练习标记` : "这里不扣分，可以重新选择"}</strong><p>${scenarioResult.correct ? scenario.feedback : scenario.retry}</p></div>` : ""}
    </section>`;
}

function renderPauseBanner() {
  return `<section class="pause-banner reveal"><span>STOP</span><div><strong>通用自主训练已暂停</strong><p>${escapeHTML(state.pauseReason || "请先查看安全边界并重新筛查。")}</p></div><button class="secondary-button" data-view="more" data-more-tab="safety">查看就医路径</button></section>`;
}

function renderPlanItem(entry, index) {
  const courseware = publishedCoursewareById[entry.id];
  return `<li><span class="exercise-index">${String(index + 1).padStart(2, "0")}</span><button class="exercise-copy" data-courseware="${entry.id}"><span><strong>${escapeHTML(courseware.actionName)}</strong><small>${categoryLabels[courseware.category]} · 康复师已发布</small></span><em>${entry.dose}</em></button><button class="round-info" data-courseware="${entry.id}" aria-label="查看${escapeHTML(courseware.actionName)}跟练课件">i</button><p class="exercise-why">${entry.why}</p></li>`;
}

function renderPath() {
  return `
    <section class="path-intro reveal"><div><p class="eyebrow">能力驱动，不按日历放行</p><h2>路线可以向前，<br>也可以诚实地退回。</h2></div><p>阶段只描述当前活动起点，不表示组织损伤程度。16 周内容保留为参考课程，实际计划由功能、动作质量和延迟反应推动。</p></section>
    <div class="view-tabs"><button data-path-tab="stages" class="${state.pathTab === "stages" ? "active" : ""}">5 个能力阶段</button><button data-path-tab="course" class="${state.pathTab === "course" ? "active" : ""}">16 周参考课程</button></div>
    ${state.pathTab === "stages" ? renderStagePath() : renderCourseReference()}`;
}

function renderStagePath() {
  const current = currentStage();
  const selected = selectedStage();
  const currentIndex = stageIndex(current.id);
  const selectedIndex = stageIndex(selected.id);
  const canProgress = state.stableStreak >= 3 && recentStageSessions().length >= 2;
  return `
    <div class="stage-rail reveal">${stages.map((stage) => `<button data-stage-select="${stage.id}" class="${stage.id === current.id ? "current" : stageIndex(stage.id) < currentIndex ? "past" : "future"} ${stage.id === selected.id ? "selected" : ""}"><span>0${stage.order}</span><strong>${stage.name}</strong><small>${stage.label}</small></button>`).join("")}</div>
    <section class="stage-detail reveal delay">
      <div class="stage-detail-copy"><p class="eyebrow">${selected.courseWeeks}</p><h3>${selected.name}</h3><p class="large-copy">${selected.purpose}</p><p>${selected.reason}</p>${selected.warning ? `<p class="stage-warning">${selected.warning}</p>` : ""}
        <div class="stage-actions">
          ${selected.id === current.id && currentIndex < stages.length - 1 ? `<button class="primary-button" data-action="open-stage-gate">检查进入下一阶段的条件 <span>→</span></button>` : ""}
          ${selectedIndex < currentIndex ? `<button class="secondary-button" data-action="switch-lower-stage" data-stage="${selected.id}">切换到这个更保守的阶段</button>` : ""}
          ${selectedIndex > currentIndex ? `<span class="preview-only">可预览；先完成当前阶段的真实能力门</span>` : ""}
          <button class="text-button" data-action="reassess">重新评估活动起点</button>
        </div>
      </div>
      <div class="stage-gates"><small>进入下一阶段前观察</small><ol>${selected.gates.map((gate) => `<li>${gate}</li>`).join("")}</ol><div class="gate-metrics"><span>不同日期稳定记录 <strong>${state.stableStreak}/3</strong></span><span>近 14 天本阶段训练 <strong>${recentStageSessions().length}/2</strong></span></div><p>这些门槛是保守的产品安排规则，不是临床验证或运动参赛许可。</p></div>
    </section>`;
}

function renderCourseReference() {
  const week = weeks[state.selectedCourseWeek - 1];
  return `
    <div class="cycle-rail reveal">${cycles.map((cycle) => `<div class="cycle-node"><span>0${cycle.id}</span><strong>${cycle.title}</strong><small>第 ${cycle.weeks} 周</small></div>`).join("")}</div>
    <section class="program-layout"><div class="week-list">${weeks.map((item) => `<button class="week-row ${item.week === week.week ? "selected" : ""}" data-course-week="${item.week}"><span class="week-row-number">${String(item.week).padStart(2, "0")}</span><span><small>${item.stage}</small><strong>${item.title}</strong></span><em>参考</em></button>`).join("")}</div>
      <aside class="week-detail"><div class="week-detail-top"><span>W${String(week.week).padStart(2, "0")}</span><small>${week.stage}</small></div><h3>${week.title}</h3><p class="detail-objective">${week.objective}</p><div class="detail-block"><small>本周关键</small><p>${week.focus}</p></div><div class="course-sessions"><small>参考训练安排</small>${week.sessions.map((session) => `<article><header><div><strong>${session.name}</strong>${session.goal ? `<em>${goalName(session.goal)}</em>` : ""}</div><span>${session.minutes || "按耐受完成"}</span></header><ul>${session.items.map((entry) => `<li><button data-exercise="${entry.id}">${exercises[entry.id].name}</button><span>${entry.dose}</span>${entry.note ? `<small>${entry.note}</small>` : ""}</li>`).join("")}</ul></article>`).join("")}</div><div class="detail-block"><small>参考资格门</small><ul>${week.gate.map((gate) => `<li>${gate}</li>`).join("")}</ul></div><p class="locked-note">这是一份课程参考，不会替代当前能力阶段，也不会因为时间或积分自动解锁训练。</p></aside>
    </section>`;
}

function libraryGroup(id, exercise) {
  if (["力量", "携行", "单侧控制", "下肢", "推拉"].includes(exercise.kind)) return "load";
  if (["专项", "跑步回归", "球类回归"].includes(exercise.kind)) return "sport";
  if (["日常动作", "动作工具", "动作模式", "迁移", "容量", "耐力", "平衡"].includes(exercise.kind)) return "life";
  return "base";
}

function movementVisual(type, label) {
  return `<div class="motion-illustration" data-motion="${type}" aria-hidden="true"><span class="motion-head"></span><span class="motion-body"></span><span class="motion-arm a"></span><span class="motion-arm b"></span><span class="motion-leg a"></span><span class="motion-leg b"></span></div><small class="visual-label">动作示意 · 非真人教学</small>`;
}

function renderLibrary() {
  const filters = [["all", "全部"], ["flexion", "屈曲不耐受"], ["extension", "伸展不耐受"], ["compression", "压缩不耐受"]];
  const query = state.librarySearch.trim().toLowerCase();
  const entries = publishedCourseware.filter((item) => (state.libraryFilter === "all" || item.category === state.libraryFilter) && (!query || `${item.actionName}${categoryLabels[item.category]}${item.tips}`.toLowerCase().includes(query)));
  return `
    <section class="library-head reveal"><div><p class="eyebrow">康复师发布内容</p><h2>跟练课件</h2><p>课件按屈曲、伸展和压缩不耐受三种触发模式整理。这些是康复师选择的教学标签，不是医学诊断。</p></div></section>
    <div class="library-tools reveal"><label><span>搜索</span><input type="search" id="librarySearch" value="${escapeHTML(state.librarySearch)}" placeholder="动作名或注意要领" /></label><div>${filters.map(([id, label]) => `<button data-library-filter="${id}" class="${state.libraryFilter === id ? "active" : ""}">${label}</button>`).join("")}</div></div>
    <section class="exercise-grid reveal delay">${entries.map((item) => `<button class="exercise-card courseware-card" data-courseware="${item.id}"><div class="courseware-card-cover">${item.imageUrls?.[0] ? `<img src="${escapeHTML(item.imageUrls[0])}" alt="${escapeHTML(item.actionName)}">` : `<span>PLAY</span>`}</div><span><small>${categoryLabels[item.category]}</small><strong>${escapeHTML(item.actionName)}</strong><p>${escapeHTML(String(item.tips || "").split("\n").find(Boolean) || "查看完整跟练课件")}</p><em>跟练视频 · 动作拆解 · 注意要领</em></span></button>`).join("") || `<div class="empty-state"><span>＋</span><p>${query ? "没有匹配的已发布课件。" : "康复师尚未发布跟练课件。"}</p></div>`}</section>`;
}

function renderReview() {
  const last = state.checkins[0];
  const decision = decisionMeta(state.lastDecision?.code);
  const recent = state.checkins.slice(0, 7).reverse();
  const average = recent.length ? (recent.reduce((sum, item) => sum + Number(item.pain || 0), 0) / recent.length).toFixed(1) : "—";
  const pendingReview = pendingReviewSession();
  const sameDayWaiting = !pendingReview && hasTodaySession();
  return `
    <section class="review-intro reveal"><div><p class="eyebrow">延迟反应决定下一步</p><h2>今天少做一点，<br>也可以是正确决策。</h2></div><p>复盘不会诊断病因。它只根据你报告的症状走向、动作质量和次日反应，调整应用里的计划剂量。</p></section>
    <section class="review-layout">
      <form class="checkin-form reveal" id="checkinForm">
        <div class="section-heading"><div><p class="eyebrow">${pendingReview ? `${pendingReview.date} 训练的次日复盘` : "今日状态记录"}</p><h3>身体给了什么反馈？</h3></div><span class="duration">约 1 分钟</span></div>
        ${pendingReview ? `<p class="review-context due">这份记录会关联 ${pendingReview.date} 的训练，并可作为一个新的延迟反应日期。</p>` : sameDayWaiting ? `<p class="review-context waiting">今天的训练尚未到次日观察窗口；现在仍可记录状态，但不会累计稳定日期或恢复训练剂量。</p>` : `<p class="review-context">当前没有待完成的既往训练复盘；一般状态记录不会替代训练后的次日耐受。</p>`}
        <label class="range-field dark-output"><span><strong>此刻疼痛或不适</strong><output data-output="checkinPain">${last?.pain ?? state.assessment.pain}</output></span><input type="range" id="checkinPain" min="0" max="10" value="${last?.pain ?? state.assessment.pain}" /><small><span>0 无</span><span>10 难以承受</span></small></label>
        ${compactRadio("与训练前相比", "painResponse", [["better", "更轻"], ["same", "接近基线"], ["minor", "小幅波动"], ["worse2", "增加约 2 分或更多"]], "same")}
        ${compactRadio("腿部症状", "radiation", [["none", "没有"], ["same", "稳定"], ["closer", "更靠近腰背"], ["farther", "向小腿或足扩散"], ["weak", "新发麻木或无力"]], "none")}
        ${compactRadio("动作质量", "quality", [["good", "全程稳定"], ["mixed", "后段一般"], ["poor", "明显失控或屏气"]], "good")}
        ${compactRadio("当晚与次晨", "nextDay", [["good", "睡眠与活动稳定"], ["minor", "轻度影响"], ["bad", "明显更痛或更难活动"]], "good")}
        ${compactRadio("今天总负荷", "capacity", [["low", "偏轻"], ["normal", "正常"], ["high", "久坐、搬运或睡眠差"]], "normal")}
        <label class="range-field dark-output"><span><strong>对当前活动的信心</strong><output data-output="confidence">7</output></span><input type="range" id="confidence" min="0" max="10" value="7" /><small><span>0 很担心</span><span>10 很有把握</span></small></label>
        <label class="note-field"><span>备注（选填）</span><textarea id="checkinNote" maxlength="240" placeholder="例如：昨晚睡眠差，今天主动把携行减到两组"></textarea></label>
        <button class="primary-button wide" type="submit">调整应用内计划 <span>→</span></button>
      </form>
      <aside class="review-summary reveal delay">
        <article class="decision-card ${decision.tone}"><p class="eyebrow">最近一次反馈</p><h3>${decision.label}</h3><p>${state.lastDecision?.summary || "完成训练并在次日记录，应用才会调整剂量。"}</p><div class="dose-change"><span>当前实际剂量</span><strong>${doseMeta().label}</strong></div>${state.lastDecision?.code === "orange" ? `<button class="secondary-button" data-action="retreat-stage">退回上一稳定阶段</button>` : ""}${state.lastDecision?.code === "red" ? `<button class="secondary-button" data-view="more" data-more-tab="safety">查看就医路径</button>` : ""}</article>
        <article class="review-stats"><div><small>不同日期稳定记录</small><strong>${state.stableStreak}<em>/3</em></strong></div><div><small>近 14 天本阶段训练</small><strong>${recentStageSessions().length}<em>次</em></strong></div><div><small>近 7 次平均不适</small><strong>${average}<em>/10</em></strong></div></article>
        <article class="mini-chart"><p class="eyebrow">最近 7 次</p>${recent.length ? `<div>${recent.map((item) => `<span title="${item.date} · ${item.pain}/10"><i style="height:${Math.max(8, Number(item.pain) * 8)}%"></i><small>${item.date.slice(5)}</small></span>`).join("")}</div>` : `<p class="empty-copy">还没有复盘记录。</p>`}</article>
      </aside>
    </section>
    <section class="history-section reveal"><div class="section-heading"><div><p class="eyebrow">不清零的记录</p><h3>最近活动</h3></div></div>${renderHistory()}</section>`;
}

function renderHistory() {
  const items = [
    ...state.sessions.map((item) => ({ type: "训练", date: item.date, title: item.sessionName || stages.find((s) => s.id === item.stageId)?.name, detail: `${item.completedCount || 0}/${item.totalCount || "—"} 项 · 训练前 ${item.painBefore ?? "—"} → 后 ${item.painAfter ?? "—"}` })),
    ...state.checkins.map((item) => ({ type: "复盘", date: item.date, title: decisionMeta(item.decision).label, detail: item.note || item.summary }))
  ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 10);
  if (!items.length) return `<div class="empty-state"><span>＋</span><p>第一条记录会出现在这里；中断不会让它消失。</p></div>`;
  return `<div class="training-log">${items.map((item) => `<div><span>${item.type}</span><p><strong>${escapeHTML(item.title || "记录")}</strong><small>${escapeHTML(item.detail || "")}</small></p><time>${String(item.date).slice(5)}</time></div>`).join("")}</div>`;
}

function renderMore() {
  const activeTab = state.moreTab === "media" ? "learn" : state.moreTab;
  const tabs = [["learn", "知识"], ["safety", "安全"], ["data", "数据"]];
  return `<div class="more-tabs">${tabs.map(([id, label]) => `<button data-more-tab="${id}" class="${activeTab === id ? "active" : ""}">${label}</button>`).join("")}</div>${activeTab === "learn" ? renderKnowledge() : activeTab === "safety" ? renderSafetyHub() : renderDataHub()}`;
}

function renderKnowledge() {
  const categories = [...new Set(knowledge.map((item) => item.category))];
  return `
    <section class="knowledge-intro reveal"><div><p class="eyebrow">训练之外，也是计划</p><h2>活动、睡眠与饮食，<br>不需要神奇答案。</h2></div><p>基础安全和全部动作教学始终可访问。知识卡片不按积分锁定，也不把饮食或补剂当作腰痛治疗。</p></section>
    ${categories.map((category) => `<section class="knowledge-group"><h3>${category}</h3><div>${knowledge.filter((item) => item.category === category).map((item) => `<button class="knowledge-card ${state.knowledgeRead.includes(item.id) ? "read" : ""}" data-knowledge="${item.id}"><small>${state.knowledgeRead.includes(item.id) ? "已读 · 可重看" : "约 2 分钟"}</small><strong>${item.title}</strong><p>${item.summary}</p><span>阅读 →</span></button>`).join("")}</div></section>`).join("")}
    <section class="source-list"><p class="eyebrow">内容依据</p><h3>课程转译与公开指南</h3>${sources.map((source) => source.url ? `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.label}<span>↗</span></a>` : `<div>${source.label}<span>本地资料</span></div>`).join("")}</section>`;
}

function renderSafetyHub() {
  const groups = [["urgent", "立即处理", "中国大陆可拨打 120 或前往急诊"], ["sameDay", "当日求助", "联系医生或当日医疗服务"], ["soon", "尽快预约", "安排医生或康复专业人员评估"]];
  return `
    <section class="safety-hero reveal"><div><p class="eyebrow">任何时候都优先于计划</p><h2>新的警讯出现，<br>不要等待次日。</h2></div><p>下面不是诊断，也不是所有危险情况的穷尽清单。若你不确定，选择更安全的专业评估路径。</p></section>
    <div class="safety-levels reveal">${groups.map(([level, title, subtitle]) => `<section class="${level}"><header><strong>${title}</strong><small>${subtitle}</small></header><ul>${safetyQuestions.filter((item) => item.level === level).map((item) => `<li>${item.label}</li>`).join("")}</ul></section>`).join("")}</div>
    <section class="flare-sheet reveal"><div><p class="eyebrow">普通反跳的 24–48 小时</p><h3>先撤销变化，<br>不是完全停止生活。</h3></div><ol><li>暂停最近增加的负荷、速度、范围或专项动作。</li><li>保留个人可耐受的短时活动与换姿势。</li><li>使用最低剂量，并观察当晚与次日。</li><li>持续恶化、新神经症状或红旗出现时转为医疗评估。</li></ol></section>
    <button class="secondary-button safety-reset" data-action="redo-safety">重新进行安全筛查</button>`;
}

function renderMediaManager() {
  const exerciseId = state.mediaEditorExercise;
  const exercise = exercises[exerciseId];
  const mapping = state.media[exerciseId];
  return `
    <section class="media-intro reveal"><div><p class="eyebrow">作者工具 · 发布映射不含健康记录</p><h2>为动作配置教学视频</h2><p>本地文件保存在当前浏览器的 IndexedDB；网址或相对路径可导出为公共发布映射，嵌入源码或单文件后，新用户无需手动导入。</p></div><div class="media-scope"><strong>${Object.keys(state.media).length}</strong><span>/ ${Object.keys(exercises).length} 个动作<br>已配置媒体</span></div></section>
    <section class="media-layout reveal delay">
      <div class="media-form">
        <label class="select-field"><span>选择动作</span><select id="mediaExercise">${Object.entries(exercises).map(([id, item]) => `<option value="${id}" ${id === exerciseId ? "selected" : ""}>${item.name} · ${item.kind}</option>`).join("")}</select></label>
        <div class="current-media"><small>当前配置</small><strong>${mapping ? mapping.type === "local" ? `本地文件 · ${escapeHTML(mapping.name)}` : `视频地址 · ${escapeHTML(mapping.url)}` : "尚未配置"}</strong>${mapping?.type === "local" ? `<button class="text-button" data-action="preview-local-media" data-media-exercise="${exerciseId}">加载本地预览</button>` : ""}</div>
        <label class="upload-field"><span>上传本地视频</span><input type="file" id="mediaFile" accept="video/*" /><small>建议 MP4 / WebM，单文件不超过 250 MB。只保存在这个浏览器。</small></label>
        <div class="or-divider"><span>或</span></div>
        <label class="note-field"><span>视频地址或相对路径</span><input type="url" id="mediaUrl" value="${mapping?.type === "url" ? escapeHTML(mapping.url) : ""}" placeholder="https://… 或 ./videos/breathing.mp4" /><small>支持直链视频、YouTube、Vimeo、站点内相对路径。外部地址离线时不可用。</small></label>
        <div class="media-actions"><button class="primary-button" data-action="save-media">保存并预览 <span>→</span></button>${mapping ? `<button class="text-button danger" data-action="remove-media">移除当前配置</button>` : ""}</div>
      </div>
      <aside class="media-preview" id="mediaPreview"><div class="media-placeholder">${movementVisual(exerciseDetails[exerciseId].visual, exercise.name)}<strong>${exercise.name}</strong><p>选择本地文件或输入地址后，可在这里实际预览。</p></div></aside>
    </section>
    <section class="mapping-tools"><div><p class="eyebrow">交付给其他用户</p><h3>导出公共映射，再生成发布版</h3><p>把视频放入 <code>BackPainWeb/videos/</code> 或使用 HTTPS 地址；导出发布映射后运行 <code>node build-standalone.mjs --media-map 映射.json</code>。发布文件只包含动作 ID 与地址，不含训练或症状记录。本地上传不会自动分发。</p></div><div><button class="secondary-button" data-action="export-publish-map">导出发布映射</button><button class="secondary-button" data-action="export-media-map">备份全部媒体配置</button><label class="secondary-button file-button">导入媒体映射<input type="file" id="mediaMapImport" accept="application/json" /></label></div></section>`;
}

function renderDataHub() {
  return `
    <section class="data-hero reveal"><div><p class="eyebrow">刷新后继续，无需账号</p><h2>记录属于当前浏览器。</h2><p>训练、复盘、微任务和媒体映射使用本地存储。导出不包含本地视频二进制文件。</p></div><div class="data-count"><strong>${state.sessions.length + state.checkins.length}</strong><span>条训练与复盘记录</span></div></section>
    <section class="data-grid reveal delay">
      <article><span>01</span><h3>导出完整记录</h3><p>保存为 JSON，可用于备份或在另一浏览器导入。健康记录不会发往服务器。</p><button class="secondary-button" data-action="export-data">导出 JSON</button></article>
      <article><span>02</span><h3>安全导入</h3><p>应用会先校验版本、阶段和数组结构，再显示摘要；确认后才覆盖当前记录。</p><label class="secondary-button file-button">选择备份文件<input type="file" id="stateImport" accept="application/json" /></label></article>
      <article><span>03</span><h3>安装到设备</h3><p>通过本地服务器打开时可安装为 PWA；双击单文件版无需安装，核心功能离线可用。</p><button class="secondary-button" data-action="install-app" ${deferredInstallPrompt ? "" : "disabled"}>${deferredInstallPrompt ? "安装应用" : "当前浏览器未提供安装"}</button></article>
    </section>
    <section class="danger-zone"><div><p class="eyebrow">清除前请先导出</p><h3>删除当前浏览器的全部记录与本地视频</h3></div><button class="text-button danger" data-action="reset-data">清除并重新开始</button></section>`;
}

async function openExerciseModal(id) {
  const courseware = publishedCoursewareById[id];
  if (!courseware) return toast("该跟练课件尚未发布。", "error");
  const preserveSession = Boolean(sessionDraft && document.querySelector(".session-player"));
  if (preserveSession) stopTimer(); else closeModal();
  const tips = String(courseware.tips || "").split("\n").map((line) => line.replace(/^[\s•·\-*\d.]+/, "").trim()).filter(Boolean);
  const mediaHTML = courseware.videoUrl ? MediaStore.renderVideo(courseware.videoUrl, `${courseware.actionName}跟练视频`) : `<div class="courseware-missing">康复师未上传视频</div>`;
  insertModal(`
    <section class="modal-sheet courseware-modal" role="dialog" aria-modal="true" aria-labelledby="exerciseTitle"><button class="modal-close" data-action="close-teaching" aria-label="${preserveSession ? "返回跟练" : "关闭"}">×</button>
      <header><p class="eyebrow">${categoryLabels[courseware.category]} · 康复师跟练课件</p><h2 id="exerciseTitle">${escapeHTML(courseware.actionName)}</h2></header>
      <section><div class="courseware-title"><b>01</b><h3>跟练视频</h3></div><div class="teaching-media">${mediaHTML}</div></section>
      <section><div class="courseware-title"><b>02</b><h3>跟练动作拆解（图片）</h3></div><div class="courseware-images">${courseware.imageUrls?.length ? courseware.imageUrls.map((url, index) => `<figure><img src="${escapeHTML(url)}" alt="${escapeHTML(courseware.actionName)}动作拆解 ${index + 1}" loading="lazy"><figcaption>${String(index + 1).padStart(2, "0")}</figcaption></figure>`).join("") : `<div class="courseware-missing">康复师未上传动作拆解图</div>`}</div></section>
      <section><div class="courseware-title"><b>03</b><h3>注意要领（文字）</h3></div><div class="courseware-tips">${tips.length ? `<ol>${tips.map((tip) => `<li>${escapeHTML(tip)}</li>`).join("")}</ol>` : `<p>康复师未填写注意要领。</p>`}</div></section>
      <p class="modal-safety">若动作引起新的腿部放射、麻木、无力或其他警讯，请立即停止并按安全路径处理。</p>
    </section>`, "teaching-layer", { replace: false });
}

function insertModal(content, className = "", options = {}) {
  const { replace = true, objectUrls = [] } = options;
  if (replace) closeModal();
  const previousFocus = document.activeElement;
  const previousTop = [...document.querySelectorAll(".modal-backdrop")].at(-1);
  if (previousTop) {
    previousTop.setAttribute("aria-hidden", "true");
    previousTop.inert = true;
  }
  document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop ${className}">${content}</div>`);
  const modal = [...document.querySelectorAll(".modal-backdrop")].at(-1);
  if (modal) {
    modal.__objectUrls = objectUrls;
    modal.__previousFocus = previousFocus;
  }
  bindRangeLabels();
  focusableElements(modal)[0]?.focus();
}

function focusableElements(container) {
  if (!container) return [];
  const selector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';
  return [...container.querySelectorAll(selector)].filter((node) => !node.hidden && node.getAttribute("aria-hidden") !== "true" && node.getClientRects().length > 0);
}

function trapModalFocus(event) {
  if (event.key !== "Tab") return false;
  const modal = [...document.querySelectorAll(".modal-backdrop")].at(-1);
  if (!modal) return false;
  const focusable = focusableElements(modal);
  if (!focusable.length) {
    event.preventDefault();
    return true;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  const active = document.activeElement;
  if (!modal.contains(active) || (!event.shiftKey && active === last)) {
    event.preventDefault();
    first.focus();
    return true;
  }
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return true;
  }
  return false;
}

function closeTopModal() {
  stopTimer();
  const modals = [...document.querySelectorAll(".modal-backdrop")];
  const modal = modals.at(-1);
  if (!modal) return;
  safeArray(modal.__objectUrls).forEach((url) => URL.revokeObjectURL(url));
  const restoreFocus = modal.__previousFocus;
  modal.remove();
  const next = modals.at(-2);
  if (next) {
    next.removeAttribute("aria-hidden");
    next.inert = false;
  }
  if (restoreFocus?.isConnected) restoreFocus.focus();
}

function closeModal() {
  stopTimer();
  const modals = [...document.querySelectorAll(".modal-backdrop")];
  const restoreFocus = modals[0]?.__previousFocus;
  modals.forEach((node) => {
    safeArray(node.__objectUrls).forEach((url) => URL.revokeObjectURL(url));
    node.remove();
  });
  if (restoreFocus?.isConnected) restoreFocus.focus();
}

function openStageGate() {
  const stage = currentStage();
  const next = stages[stageIndex(stage.id) + 1];
  const dataReady = state.stableStreak >= 3 && recentStageSessions().length >= 2;
  insertModal(`<section class="modal-sheet gate-modal" role="dialog" aria-modal="true"><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button><p class="eyebrow">从 ${stage.name} 到 ${next.name}</p><h2>请按真实能力确认</h2><p>勾选不是医学测试。若有不确定，继续当前阶段或重新评估。</p><div class="gate-checklist">${stage.gates.map((gate, index) => `<label><input type="checkbox" data-gate-check="${index}" /><span>${gate}</span></label>`).join("")}</div><div class="gate-data ${dataReady ? "ready" : "waiting"}"><span>应用内观察</span><strong>${state.stableStreak}/3 个稳定日期 · ${recentStageSessions().length}/2 次本阶段训练</strong></div><button class="primary-button wide" data-action="advance-stage" ${dataReady ? "" : "disabled"}>进入下一阶段的减量版本 <span>→</span></button><p class="heuristic-inline">连续天数与训练次数是产品启发式，不等于医疗、工作或参赛许可。</p></section>`);
}

function openPrecheck() {
  insertModal(`<section class="modal-sheet session-modal" role="dialog" aria-modal="true"><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button><p class="eyebrow">训练前 · 30 秒</p><h2>今天需要哪一档剂量？</h2><label class="range-field dark-output"><span><strong>训练前不适</strong><output data-output="prePain">${state.assessment.pain}</output></span><input type="range" id="prePain" min="0" max="10" value="${state.assessment.pain}" /><small><span>0</span><span>10</span></small></label><label class="alert-check"><input type="checkbox" id="newWarning" /><span><strong>今天有新的麻木、无力、排尿排便改变、会阴感觉改变或症状快速恶化</strong><small>勾选后立即停止，不进入动作列表。</small></span></label>${compactRadio("今天的容量", "preCapacity", [["fresh", "状态正常"], ["loaded", "久坐／家务较多"], ["poor", "睡眠差或明显疲劳"]], "fresh")}<button class="primary-button wide" data-action="confirm-precheck">生成今日实际剂量 <span>→</span></button></section>`);
}

function openSessionPlayer() {
  const stage = currentStage();
  const items = publishedPlanFor();
  sessionDraft.items = items;
  insertModal(`<section class="session-player" role="dialog" aria-modal="true"><header><button class="text-button light-text" data-action="close-modal">结束跟练</button><span>${stage.name} · ${doseMeta(sessionDraft.doseMode).label}</span><strong id="sessionProgress">0/${items.length}</strong></header><div class="player-intro"><p class="eyebrow">动作质量优先 · 可以提前停止</p><h2>跟随康复师发布的课件完成。</h2></div><div class="player-list">${items.map((entry, index) => { const item = publishedCoursewareById[entry.id]; const firstTip = String(item.tips || "").split("\n").find(Boolean) || "请先打开课件查看注意要领。"; return `<label class="player-item"><input type="checkbox" data-player-check="${index}" /><span class="player-number">${String(index + 1).padStart(2, "0")}</span><span><small>${categoryLabels[item.category]}</small><strong>${escapeHTML(item.actionName)}</strong><em>${entry.dose}</em><p>${escapeHTML(firstTip)}</p></span><button type="button" data-courseware="${entry.id}">课件</button></label>`; }).join("")}</div><footer><p>停止得及时，也是一条有价值的训练记录。</p><button class="primary-button" data-action="finish-session">结束并记录反应 →</button></footer></section>`, "session-full");
}

function openPostcheck() {
  const checks = [...document.querySelectorAll("[data-player-check]")];
  sessionDraft.completedCount = checks.filter((item) => item.checked).length;
  sessionDraft.totalCount = checks.length;
  insertModal(`<section class="modal-sheet session-modal" role="dialog" aria-modal="true"><p class="eyebrow">训练后 · 即时反应</p><h2>这次剂量带来了什么？</h2><label class="range-field dark-output"><span><strong>训练后不适</strong><output data-output="postPain">${sessionDraft.painBefore}</output></span><input type="range" id="postPain" min="0" max="10" value="${sessionDraft.painBefore}" /><small><span>0</span><span>10</span></small></label>${compactRadio("动作质量", "postQuality", [["good", "完成部分都稳定"], ["mixed", "后段开始变形"], ["poor", "明显失控或屏气"]], "good")}${compactRadio("腿部或神经症状", "postRadiation", [["none", "没有或稳定"], ["closer", "更靠近腰背"], ["farther", "向小腿／足扩散"], ["weak", "新发麻木或无力"]], "none")}${compactRadio("为什么结束", "finishReason", [["planned", "完成计划"], ["quality", "质量下降，主动停止"], ["symptom", "症状变化，主动停止"], ["choice", "今天选择少做"]], sessionDraft.completedCount === sessionDraft.totalCount ? "planned" : "choice")}<button class="primary-button wide" data-action="save-session">保存这次真实记录 <span>→</span></button></section>`);
}

function startTimer(seconds, button) {
  stopTimer();
  let remaining = seconds;
  button.classList.add("timing");
  button.textContent = `${remaining}s`;
  timerId = window.setInterval(() => {
    remaining -= 1;
    button.textContent = remaining > 0 ? `${remaining}s` : "完成";
    if (remaining <= 0) {
      stopTimer();
      button.classList.remove("timing");
      button.classList.add("timed");
      if (navigator.vibrate) navigator.vibrate(100);
    }
  }, 1000);
}

function stopTimer() {
  if (timerId) window.clearInterval(timerId);
  timerId = null;
}

function bindRangeLabels() {
  document.querySelectorAll('input[type="range"]').forEach((input) => {
    const output = document.querySelector(`[data-output="${input.id}"]`);
    if (!output) return;
    input.addEventListener("input", () => {
      const suffix = ["assessWalk", "assessSit"].includes(input.id) ? " 分钟" : "";
      output.textContent = `${input.value}${suffix}`;
    });
  });
}

function readFormValue(form, name, fallback = "") {
  return new FormData(form).get(name) || fallback;
}

function evaluateCheckin(values, baseStreak = state.stableStreak, qualifiesForStability = true) {
  if (values.radiation === "weak") return { code: "red", summary: "你报告了新发麻木或无力。停止自主训练并及时进行医疗评估。", nextStreak: 0 };
  if (values.radiation === "farther" || values.painResponse === "worse2" || values.nextDay === "bad" || values.quality === "poor") {
    return { code: "orange", summary: "训练后或次日反应明显变差。撤销最近增加的变量，实际计划切换到最低剂量；持续恶化或出现新症状时就医。", nextStreak: 0 };
  }
  const clean = ["better", "same"].includes(values.painResponse) && ["none", "same", "closer"].includes(values.radiation) && values.quality === "good" && values.nextDay === "good" && values.capacity !== "high" && values.confidence >= 6;
  if (!clean) return { code: "yellow", summary: "反馈有波动或今天总负荷偏高。实际计划切换到减量版本，先维持并观察，不增加新变量。", nextStreak: 0 };
  if (!qualifiesForStability) return { code: "green", summary: "已记录当前状态；这不是既往训练的次日反馈，因此不会累计稳定日期或恢复训练剂量。", nextStreak: baseStreak };
  const nextStreak = baseStreak + 1;
  return { code: "green", summary: nextStreak >= 3 ? "已积累 3 个不同日期的稳定反馈。可检查能力门，但这不是医学或运动许可。" : `本次反馈稳定；还需要 ${3 - nextStreak} 个不同日期的稳定记录，再检查能力门。`, nextStreak };
}

function doseAfterCheckin(baseDoseMode, decision, qualifiesForStability) {
  if (decision.code === "red" || decision.code === "orange") return "minimum";
  if (decision.code === "yellow") return moreConservative(baseDoseMode, "reduced");
  if (qualifiesForStability && decision.nextStreak >= 3) return baseDoseMode === "minimum" ? "reduced" : "standard";
  return baseDoseMode;
}

function submitCheckin(form) {
  const values = {
    pain: Number(document.querySelector("#checkinPain").value),
    painResponse: readFormValue(form, "painResponse", "same"),
    radiation: readFormValue(form, "radiation", "none"),
    quality: readFormValue(form, "quality", "good"),
    nextDay: readFormValue(form, "nextDay", "good"),
    capacity: readFormValue(form, "capacity", "normal"),
    confidence: Number(document.querySelector("#confidence").value),
    note: document.querySelector("#checkinNote").value.trim().slice(0, 240)
  };
  const date = todayKey();
  const reviewSession = pendingReviewSession(date);
  const reviewKey = reviewSession ? `session:${reviewSession.date}` : `daily:${date}`;
  const existing = state.checkins.find((item) => item.date === date && item.reviewKey === reviewKey);
  const alreadyCountedToday = state.checkins.some((item) => item.date === date && item.countedStable && item.reviewKey !== reviewKey);
  const qualifiesForStability = Boolean(reviewSession) && !alreadyCountedToday;
  const baseStreak = existing?.baseStableStreak ?? state.stableStreak;
  const baseDoseMode = existing?.baseDoseMode || state.doseMode;
  const decision = evaluateCheckin(values, baseStreak, qualifiesForStability);
  const checkin = {
    ...values,
    id: existing?.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`),
    date,
    reviewKey,
    reviewedSessionDate: reviewSession?.date || "",
    countedStable: qualifiesForStability && decision.code === "green",
    baseStableStreak: baseStreak,
    baseDoseMode,
    stageId: state.currentStageId,
    decision: decision.code,
    summary: decision.summary
  };
  const checkins = [checkin, ...state.checkins.filter((item) => item.id !== checkin.id && !(item.date === date && item.reviewKey === reviewKey))].slice(0, 180);
  let doseMode = doseAfterCheckin(baseDoseMode, decision, qualifiesForStability);
  let trainingPaused = state.trainingPaused;
  let pauseReason = state.pauseReason;
  let safetyStatus = state.safetyStatus;
  let safetyFlags = state.safetyFlags;
  if (decision.code === "red") {
    trainingPaused = true;
    pauseReason = decision.summary;
    safetyStatus = "blocked";
    safetyFlags = [...new Set([...safetyFlags, "weakness"])];
  }
  updateState({ checkins, stableStreak: decision.code === "green" ? decision.nextStreak : 0, lastDecision: { ...decision, date: checkin.date }, doseMode, trainingPaused, pauseReason, safetyStatus, safetyFlags });
  window.setTimeout(() => document.querySelector(".decision-card")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
}

function saveSession() {
  const painAfter = Number(document.querySelector("#postPain").value);
  const quality = document.querySelector('input[name="postQuality"]:checked')?.value || "good";
  const radiation = document.querySelector('input[name="postRadiation"]:checked')?.value || "none";
  const finishReason = document.querySelector('input[name="finishReason"]:checked')?.value || "choice";
  const record = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    date: todayKey(),
    stageId: sessionDraft.stageId,
    sessionName: `${currentStage().name} · ${doseMeta(sessionDraft.doseMode).label}`,
    doseMode: sessionDraft.doseMode,
    items: sessionDraft.items.map((item) => ({ id: item.id, dose: item.dose })),
    painBefore: sessionDraft.painBefore,
    painAfter,
    completedCount: sessionDraft.completedCount,
    totalCount: sessionDraft.totalCount,
    finishReason,
    quality,
    radiation,
    startedAt: sessionDraft.startedAt,
    completedAt: new Date().toISOString()
  };
  let doseMode = state.doseMode;
  let trainingPaused = state.trainingPaused;
  let pauseReason = state.pauseReason;
  let lastDecision = state.lastDecision;
  let stableStreak = state.stableStreak;
  let safetyStatus = state.safetyStatus;
  let safetyFlags = state.safetyFlags;
  if (radiation === "weak" || radiation === "farther") {
    trainingPaused = true;
    doseMode = "minimum";
    pauseReason = "训练中出现新的神经症状或症状向远端扩散；不要等待次日，请及时评估。";
    lastDecision = { code: "red", summary: pauseReason, date: todayKey() };
    stableStreak = 0;
    safetyStatus = "blocked";
    safetyFlags = [...new Set([...safetyFlags, radiation === "weak" ? "weakness" : "trainingWarning"])];
  } else if (painAfter - sessionDraft.painBefore >= 2 || quality === "poor" || finishReason === "symptom") {
    doseMode = "minimum";
    lastDecision = { code: "orange", summary: "本次即时反应提示剂量可能偏高。已把实际计划切换到最低剂量，并等待次日信息。", date: todayKey() };
    stableStreak = 0;
  }
  closeModal();
  sessionDraft = null;
  updateState({ sessions: [record, ...state.sessions].slice(0, 365), doseMode, trainingPaused, pauseReason, lastDecision, stableStreak, safetyStatus, safetyFlags });
  toast(finishReason === "planned" ? "训练已保存。请在次日补充延迟反应。" : "主动停止已记录，不会清零任何进度。", "success");
}

function exportJSON(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function exportData() {
  exportJSON({ schema: "fuji-rehab-state", version: APP_VERSION, exportedAt: new Date().toISOString(), note: "不包含 IndexedDB 中的本地视频二进制文件", state }, `复脊完整记录_${todayKey()}.json`);
}

function exportMediaMap() {
  exportJSON({ schema: "fuji-media-map", version: 1, exportedAt: new Date().toISOString(), note: "本地上传仅导出元数据；分发时请改用相对路径或重新上传", media: state.media }, `复脊视频映射_${todayKey()}.json`);
}

function exportPublishMap() {
  const media = Object.fromEntries(Object.entries(state.media).filter(([, item]) => item.type === "url").map(([id, item]) => [id, { type: "url", url: item.url }]));
  exportJSON({ schema: "fuji-public-media", version: 1, exportedAt: new Date().toISOString(), note: "仅包含动作 ID 与公开视频地址；不含用户训练、症状或本地文件", media }, `复脊视频发布映射_${todayKey()}.json`);
}

function validateStateImport(payload) {
  if (!payload || payload.schema !== "fuji-rehab-state" || !payload.state) throw new Error("不是有效的复脊完整记录文件");
  if (hasSafetyBlock(state)) throw new Error("当前存在尚未解除的安全警讯，不能用备份覆盖。请先完成专门的安全再筛。 ");
  const sanitized = sanitizeState(payload.state);
  return { type: "state", data: sanitized, summary: `${sanitized.sessions.length} 条训练、${sanitized.checkins.length} 条复盘，当前阶段：${stages.find((s) => s.id === sanitized.currentStageId).name}` };
}

function validateMediaImport(payload) {
  if (!payload || !["fuji-media-map", "fuji-public-media"].includes(payload.schema) || !payload.media) throw new Error("不是有效的复脊媒体映射文件");
  const media = sanitizeMediaMap(payload.media);
  return { type: "media", data: media, summary: `${Object.keys(media).length} 个有效动作映射；本地文件元数据不会复制视频本身` };
}

function showImportPreview(result) {
  pendingImport = result;
  insertModal(`<section class="modal-sheet import-modal" role="dialog" aria-modal="true"><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button><p class="eyebrow">校验通过 · 尚未写入</p><h2>确认导入？</h2><p>${escapeHTML(result.summary)}</p><div class="import-warning"><strong>${result.type === "state" ? "将覆盖当前训练与复盘状态" : "将合并并覆盖同动作的媒体映射"}</strong><p>你可以先取消并导出现有记录作为备份。</p></div><button class="primary-button wide" data-action="confirm-import">确认写入 <span>→</span></button></section>`);
}

async function readJSONFile(file, kind) {
  if (!file || file.size > 2 * 1024 * 1024) throw new Error("JSON 文件必须小于 2 MB");
  const payload = JSON.parse(await file.text());
  return kind === "state" ? validateStateImport(payload) : validateMediaImport(payload);
}

async function saveMedia() {
  const exerciseId = state.mediaEditorExercise;
  const urlInput = document.querySelector("#mediaUrl")?.value || "";
  const normalizedUrl = MediaStore.normalizeVideoUrl(urlInput);
  const media = { ...state.media };
  if (pendingMediaFile) {
    if (!pendingMediaFile.type.startsWith("video/")) return toast("请选择视频文件。", "error");
    if (pendingMediaFile.size > 250 * 1024 * 1024) return toast("本地视频需小于 250 MB。", "error");
    await MediaStore.put(exerciseId, pendingMediaFile);
    media[exerciseId] = { type: "local", name: pendingMediaFile.name, size: pendingMediaFile.size, mime: pendingMediaFile.type, updatedAt: new Date().toISOString() };
  } else if (normalizedUrl) {
    if (state.media[exerciseId]?.type === "local") await MediaStore.remove(exerciseId).catch(() => {});
    media[exerciseId] = { type: "url", url: normalizedUrl, updatedAt: new Date().toISOString() };
  } else {
    return toast("请选择本地视频或输入有效的 http(s)／相对路径。", "error");
  }
  pendingMediaFile = null;
  updateState({ media, disabledPublicMedia: state.disabledPublicMedia.filter((id) => id !== exerciseId) });
  await previewMedia(exerciseId);
  toast("视频配置已保存到当前浏览器。", "success");
}

async function previewMedia(exerciseId = state.mediaEditorExercise, file = pendingMediaFile) {
  const preview = document.querySelector("#mediaPreview");
  if (!preview) return;
  previewObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  previewObjectUrls = [];
  if (file) {
    const url = URL.createObjectURL(file);
    previewObjectUrls.push(url);
    preview.innerHTML = MediaStore.renderVideo(url, `${exercises[exerciseId].name}待保存视频`);
    return;
  }
  const mapping = state.media[exerciseId];
  if (mapping?.type === "url") preview.innerHTML = MediaStore.renderVideo(mapping.url, `${exercises[exerciseId].name}视频`);
  if (mapping?.type === "local") {
    const blob = await MediaStore.get(exerciseId);
    if (!blob) return toast("当前浏览器没有找到这个本地视频文件。", "error");
    const url = URL.createObjectURL(blob);
    previewObjectUrls.push(url);
    preview.innerHTML = MediaStore.renderVideo(url, `${exercises[exerciseId].name}本地视频`);
  }
}

document.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    event.preventDefault();
    const patch = { activeView: viewButton.dataset.view };
    if (viewButton.dataset.moreTab) patch.moreTab = viewButton.dataset.moreTab;
    updateState(patch);
    return;
  }
  const actionNode = event.target.closest("[data-action]");
  const action = actionNode?.dataset.action;
  if (event.target.closest("[data-courseware]")) {
    await openExerciseModal(event.target.closest("[data-courseware]").dataset.courseware);
    return;
  }
  if (event.target.closest("[data-exercise]") && !event.target.closest("[data-timer]")) {
    const id = event.target.closest("[data-exercise]").dataset.exercise;
    if (exercises[id]) toast("这是参考课程动作；请在“动作”页打开康复师已发布的跟练课件。");
    return;
  }
  if (event.target.closest("[data-timer]")) {
    const button = event.target.closest("[data-timer]");
    startTimer(Number(button.dataset.timer), button);
    return;
  }
  const pathTab = event.target.closest("[data-path-tab]");
  if (pathTab) return updateState({ pathTab: pathTab.dataset.pathTab });
  const moreTab = event.target.closest("[data-more-tab]");
  if (moreTab) return updateState({ moreTab: moreTab.dataset.moreTab });
  const stageSelect = event.target.closest("[data-stage-select]");
  if (stageSelect) return updateState({ selectedStageId: stageSelect.dataset.stageSelect });
  const courseWeek = event.target.closest("[data-course-week]");
  if (courseWeek) return updateState({ selectedCourseWeek: Number(courseWeek.dataset.courseWeek) });
  const libraryFilter = event.target.closest("[data-library-filter]");
  if (libraryFilter) return updateState({ libraryFilter: libraryFilter.dataset.libraryFilter });
  const scenarioChoice = event.target.closest("[data-scenario]");
  if (scenarioChoice) {
    const scenario = scenarios.find((item) => item.id === scenarioChoice.dataset.scenario);
    const choice = Number(scenarioChoice.dataset.choice);
    const correct = choice === scenario.answer;
    return updateState({
      scenarioResults: { ...state.scenarioResults, [todayKey()]: { id: scenario.id, choice, correct } },
      badges: correct ? { ...state.badges, [scenario.badge]: true } : state.badges
    });
  }
  const knowledgeButton = event.target.closest("[data-knowledge]");
  if (knowledgeButton) return openKnowledgeModal(knowledgeButton.dataset.knowledge);
  if (!action) return;

  if (action === "onboarding-home") updateState({ onboardingStep: 0 });
  if (action === "back-onboarding") updateState({ onboardingStep: Math.max(0, state.onboardingStep - 1) });
  if (action === "accept-consent") {
    if (!document.querySelector("#consentUse")?.checked || !document.querySelector("#consentData")?.checked) return toast("请先确认两项说明。", "error");
    updateState({ consent: true, onboardingStep: 1 });
  }
  if (action === "submit-safety") {
    const flags = [...document.querySelectorAll('input[name="safetyFlag"]:checked')].map((node) => node.value);
    const surgeryStatus = document.querySelector('input[name="surgeryStatus"]:checked')?.value || "none";
    if (!document.querySelector("#adultConfirm")?.checked) return toast("请先确认成年与工具边界。", "error");
    if (flags.length || surgeryStatus === "current") return updateState({ safetyFlags: flags, surgeryStatus, safetyStatus: "blocked" });
    updateState({ safetyFlags: [], surgeryStatus, safetyStatus: "clear", onboardingStep: 2 });
  }
  if (action === "restart-safety") {
    if (window.confirm("仅当刚才确实误选时才重新筛查。确认重新开始？")) updateState({ safetyStatus: "unchecked", safetyFlags: [], surgeryStatus: "none" });
  }
  if (action === "accept-stage") {
    if (state.safetyStatus !== "clear" || hasSafetyBlock(state)) return toast("安全筛查尚未通过，不能开始自主训练。请先完成完整安全再筛。", "error");
    const stageId = actionNode.dataset.stage;
    updateState({ started: true, currentStageId: stageId, stableStageId: stageId, selectedStageId: stageId, doseMode: "reduced", trainingPaused: false, pauseReason: "", activeView: "today" });
  }
  if (action === "start-education-mode") updateState({ started: true, currentStageId: "protect", stableStageId: "protect", selectedStageId: "protect", trainingPaused: true, pauseReason: state.recommendation?.reasons?.[0] || "请先完成专业评估。", activeView: "more", moreTab: "learn" });
  if (action === "toggle-micro") {
    const stage = currentStage();
    const task = stage.microTasks[dailyIndex(stage.microTasks.length, stage.order)];
    const microTasks = { ...state.microTasks };
    if (microTasks[todayKey()] === task) delete microTasks[todayKey()]; else microTasks[todayKey()] = task;
    updateState({ microTasks });
  }
  if (action === "open-stage-gate") openStageGate();
  if (action === "advance-stage") {
    const checks = [...document.querySelectorAll("[data-gate-check]")];
    if (!checks.length || !checks.every((item) => item.checked)) return toast("请按真实情况逐项确认；不确定时继续当前阶段。", "error");
    if (state.stableStreak < 3 || recentStageSessions().length < 2) return;
    const next = stages[stageIndex(state.currentStageId) + 1];
    closeModal();
    updateState({ stableStageId: state.currentStageId, currentStageId: next.id, selectedStageId: next.id, doseMode: "reduced", stableStreak: 0, lastDecision: null, activeView: "today" });
    toast(`已进入“${next.name}”的减量版本；下一次只增加一个变量。`, "success");
  }
  if (action === "switch-lower-stage") {
    const target = actionNode.dataset.stage;
    updateState({ currentStageId: target, selectedStageId: target, doseMode: "reduced", stableStreak: 0, activeView: "today" });
    toast("已切换到更保守阶段，不会清除既有记录。", "success");
  }
  if (action === "retreat-stage") {
    const current = stageIndex(state.currentStageId);
    const stable = stageIndex(state.stableStageId);
    const target = stable < current ? state.stableStageId : state.currentStageId;
    const changedStage = target !== state.currentStageId;
    updateState({ currentStageId: target, selectedStageId: target, doseMode: "minimum", stableStreak: 0, activeView: "today", badges: { ...state.badges, "会调整": true } });
    toast(changedStage ? "已回到上一稳定阶段。" : "保持当前阶段，实际计划已切换到最低剂量。", "success");
  }
  if (action === "reassess") {
    if (hasSafetyBlock(state)) return updateState({ started: false, onboardingStep: 1, activeView: "more", moreTab: "safety" });
    updateState({ started: false, onboardingStep: 2, recommendation: null });
  }
  if (action === "redo-safety") updateState({ started: false, onboardingStep: 1, safetyStatus: "unchecked", safetyFlags: [] });
  if (action === "start-session") openPrecheck();
  if (action === "confirm-precheck") {
    if (document.querySelector("#newWarning")?.checked) {
      closeModal();
      return updateState({ safetyStatus: "blocked", safetyFlags: [...new Set([...state.safetyFlags, "trainingWarning"])], trainingPaused: true, pauseReason: "你报告了新的神经或急症警讯；不要等待次日，请及时进行医疗评估。", lastDecision: { code: "red", summary: "新的警讯出现，通用自主训练已暂停。", date: todayKey() }, activeView: "more", moreTab: "safety" });
    }
    const capacity = document.querySelector('input[name="preCapacity"]:checked')?.value || "fresh";
    const requested = capacity === "poor" ? "minimum" : capacity === "loaded" ? "reduced" : state.doseMode;
    sessionDraft = { stageId: state.currentStageId, painBefore: Number(document.querySelector("#prePain").value), doseMode: moreConservative(state.doseMode, requested), capacity, startedAt: new Date().toISOString() };
    openSessionPlayer();
  }
  if (action === "finish-session") openPostcheck();
  if (action === "save-session") saveSession();
  if (action === "close-teaching") closeTopModal();
  if (action === "close-modal") closeModal();
  if (action === "save-media") await saveMedia().catch((error) => toast(error.message, "error"));
  if (action === "preview-local-media") await previewMedia(actionNode.dataset.mediaExercise).catch((error) => toast(error.message, "error"));
  if (action === "remove-media") {
    const id = state.mediaEditorExercise;
    if (window.confirm(`移除“${exercises[id].name}”的视频配置？`)) {
      if (state.media[id]?.type === "local") await MediaStore.remove(id).catch(() => {});
      const media = { ...state.media }; delete media[id]; pendingMediaFile = null;
      const disabledPublicMedia = PUBLIC_MEDIA[id] ? [...new Set([...state.disabledPublicMedia, id])] : state.disabledPublicMedia;
      updateState({ media, disabledPublicMedia });
    }
  }
  if (action === "export-data") exportData();
  if (action === "export-media-map") exportMediaMap();
  if (action === "export-publish-map") exportPublishMap();
  if (action === "confirm-import" && pendingImport) {
    const imported = pendingImport;
    pendingImport = null;
    closeModal();
    if (imported.type === "state") { state = sanitizeState(imported.data); saveState(); render(); }
    else updateState({ media: { ...state.media, ...imported.data } });
    toast("导入完成。", "success");
  }
  if (action === "reset-data") {
    if (window.confirm("确认删除当前浏览器中的训练、复盘、设置和本地视频？此操作无法在应用内恢复。")) {
      await MediaStore.clear().catch(() => {});
      clearManagedState();
      state = clone(initialState);
      render();
    }
  }
  if (action === "install-app" && deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    render();
  }
});

function openKnowledgeModal(id) {
  const item = knowledge.find((entry) => entry.id === id);
  if (!item) return;
  if (!state.knowledgeRead.includes(id)) updateState({ knowledgeRead: [...state.knowledgeRead, id] }, false);
  insertModal(`<section class="modal-sheet knowledge-modal" role="dialog" aria-modal="true"><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button><p class="eyebrow">${item.category}</p><h2>${item.title}</h2><p class="knowledge-summary">${item.summary}</p>${item.body.map((paragraph) => `<p>${paragraph}</p>`).join("")}${item.sourceUrl ? `<a href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer">查看来源 · ${item.source} ↗</a>` : `<small>来源：${item.source}</small>`}</section>`);
}

document.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "assessmentForm") {
    const form = event.target;
    const assessment = {
      pain: Number(document.querySelector("#assessPain").value),
      walkMinutes: Number(document.querySelector("#assessWalk").value),
      sittingMinutes: Number(document.querySelector("#assessSit").value),
      function: readFormValue(form, "function", "limited"),
      legSymptoms: readFormValue(form, "legSymptoms", "none"),
      nextDay: readFormValue(form, "nextDay", "stable"),
      flare: readFormValue(form, "flare", "recent"),
      movement: readFormValue(form, "movement", "uncertain"),
      confidence: Number(document.querySelector("#assessConfidence").value),
      goal: readFormValue(form, "goal", "daily")
    };
    if (assessment.legSymptoms === "weak") {
      return updateState({ assessment, safetyStatus: "blocked", safetyFlags: ["weakness"], onboardingStep: 1 });
    }
    updateState({ assessment, recommendation: recommendStage(assessment, state.surgeryStatus), onboardingStep: 3 });
  }
  if (event.target.id === "checkinForm") submitCheckin(event.target);
});

document.addEventListener("change", async (event) => {
  if (event.target.matches("[data-player-check]")) {
    const checks = [...document.querySelectorAll("[data-player-check]")];
    const done = checks.filter((item) => item.checked).length;
    const progress = document.querySelector("#sessionProgress");
    if (progress) progress.textContent = `${done}/${checks.length}`;
    event.target.closest(".player-item")?.classList.toggle("done", event.target.checked);
  }
  if (event.target.id === "mediaExercise") {
    pendingMediaFile = null;
    updateState({ mediaEditorExercise: event.target.value });
  }
  if (event.target.id === "mediaFile") {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/") || file.size > 250 * 1024 * 1024) {
      event.target.value = "";
      return toast("请选择小于 250 MB 的视频文件。", "error");
    }
    pendingMediaFile = file;
    const urlInput = document.querySelector("#mediaUrl");
    if (urlInput) urlInput.value = "";
    await previewMedia(state.mediaEditorExercise, file);
  }
  if (event.target.id === "stateImport" || event.target.id === "mediaMapImport") {
    try {
      const result = await readJSONFile(event.target.files?.[0], event.target.id === "stateImport" ? "state" : "media");
      showImportPreview(result);
    } catch (error) {
      toast(`无法导入：${error.message}`, "error");
    }
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "librarySearch") {
    state.librarySearch = event.target.value.slice(0, 60);
    saveState();
    window.clearTimeout(window.__libraryTimer);
    window.__libraryTimer = window.setTimeout(() => render(), 180);
  }
  if (event.target.id === "mediaUrl") {
    pendingMediaFile = null;
    const url = MediaStore.normalizeVideoUrl(event.target.value);
    if (url) {
      const preview = document.querySelector("#mediaPreview");
      if (preview) preview.innerHTML = MediaStore.renderVideo(url, `${exercises[state.mediaEditorExercise].name}待保存视频`);
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeTopModal();
  else trapModalFocus(event);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (state.activeView === "more" && state.moreTab === "data") render();
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

render();
if (location.protocol.startsWith("http")) {
  loadPublishedCourseware();
  window.setInterval?.(() => loadPublishedCourseware(), 15000);
}
