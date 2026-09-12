const categoryLabels = { flexion: "屈曲不耐受", extension: "伸展不耐受", compression: "压缩不耐受" };
const coursewareSelect = document.querySelector("#coursewareSelect");
const actionNameInput = document.querySelector("#actionNameInput");
const categorySelect = document.querySelector("#categorySelect");
const tipsInput = document.querySelector("#tipsInput");
const videoInput = document.querySelector("#videoInput");
const imageInput = document.querySelector("#imageInput");
const focusPreviewButton = document.querySelector("#focusPreview");
const adminScriptSource = document.currentScript?.src || "";
const deploymentBasePath = adminScriptSource ? new URL(adminScriptSource, location.href).pathname.replace(/\/admin\.js$/, "") : "";
const appPath = (path) => `${deploymentBasePath}${path.startsWith("/") ? path : `/${path}`}`;
const contentPath = (path) => String(path || "").startsWith("/uploads/") ? appPath(path) : path;
const tokenStorageKey = "spineRehabAdminToken";
let adminToken = sessionStorage.getItem(tokenStorageKey) || "";
let records = {};
let currentId = "";
let draft = { actionName: "", category: "flexion", videoUrl: "", imageUrls: [], tips: "", status: "draft" };
let objectUrls = [];
let localVideoUrl = "";
let localImageUrls = [];

function lockAdmin(message = "") {
  document.body.classList.add("access-locked");
  document.querySelector("#accessToken").value = "";
  document.querySelector("#accessError").textContent = message;
  requestAnimationFrame(() => document.querySelector("#accessToken").focus());
}

function unlockAdmin() {
  document.body.classList.remove("access-locked");
  document.querySelector("#accessError").textContent = "";
}

async function adminFetch(path, options = {}) {
  const response = await fetch(appPath(path), {
    ...options,
    headers: { ...(options.headers || {}), "x-admin-token": adminToken }
  });
  if (response.status === 401) {
    sessionStorage.removeItem(tokenStorageKey);
    adminToken = "";
    lockAdmin("访问码不正确，请重新输入。");
  }
  return response;
}

function toast(message, error = false) {
  const node = document.querySelector("#toast");
  node.textContent = message;
  node.className = `toast show ${error ? "error" : ""}`;
  setTimeout(() => node.className = "toast", 2600);
}

function escapeHTML(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function revokeObjects() {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls = [];
}

function newId() {
  return `course-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function rebuildCoursewareSelect(selected = "__new__") {
  const options = Object.values(records)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${escapeHTML(item.actionName)} · ${categoryLabels[item.category]}${item.status === "published" ? " · 已发布" : " · 草稿"}</option>`)
    .join("");
  coursewareSelect.innerHTML = `<option value="__new__" ${selected === "__new__" ? "selected" : ""}>＋ 新建课件</option>${options}`;
}

function renderPreview() {
  const name = actionNameInput.value.trim() || "未命名跟练动作";
  document.querySelector("#previewName").textContent = name;
  document.querySelector("#previewCategory").textContent = `${categoryLabels[categorySelect.value]} · 康复师课件`;
  document.querySelector("#previewStatus").textContent = draft.status === "published" ? "已发布" : "草稿预览";
  const videoUrl = localVideoUrl || draft.videoUrl;
  document.querySelector("#videoPreview").innerHTML = videoUrl ? `<video src="${escapeHTML(contentPath(videoUrl))}" controls playsinline></video>` : "<p>上传视频后在这里播放</p>";
  const images = localImageUrls.length ? localImageUrls : draft.imageUrls;
  document.querySelector("#imagePreview").innerHTML = images.length ? images.map((url, index) => `<figure><img src="${escapeHTML(contentPath(url))}" alt="${escapeHTML(name)}动作拆解 ${index + 1}"/><figcaption>${String(index + 1).padStart(2, "0")}</figcaption></figure>`).join("") : "<p>上传图片后在这里大图展示</p>";
  const lines = tipsInput.value.split("\n").map((line) => line.replace(/^[\s•·\-*\d.]+/, "").trim()).filter(Boolean);
  document.querySelector("#tipsPreview").innerHTML = lines.length ? `<ol>${lines.map((line) => `<li>${escapeHTML(line)}</li>`).join("")}</ol>` : "<p>填写后在这里实时排版</p>";
  document.querySelector("#saveState").textContent = draft.status === "published" ? "已发布" : "未发布";
}

function loadSelected() {
  revokeObjects();
  localVideoUrl = "";
  localImageUrls = [];
  currentId = coursewareSelect.value === "__new__" ? "" : coursewareSelect.value;
  draft = currentId && records[currentId] ? structuredClone(records[currentId]) : { actionName: "", category: "flexion", videoUrl: "", imageUrls: [], tips: "", status: "draft" };
  actionNameInput.value = draft.actionName || "";
  categorySelect.value = draft.category || "flexion";
  tipsInput.value = draft.tips || "";
  videoInput.value = "";
  imageInput.value = "";
  document.querySelector("#videoLabel").textContent = draft.videoUrl ? "已有视频，可点击替换" : "点击选择或拖入视频";
  document.querySelector("#imageLabel").textContent = draft.imageUrls?.length ? `已有 ${draft.imageUrls.length} 张，可点击替换` : "点击选择或拖入图片";
  renderPreview();
}

async function upload(file, kind) {
  const response = await adminFetch(`/api/admin/upload?kind=${kind}`, { method: "POST", headers: { "content-type": file.type, "x-file-name": encodeURIComponent(file.name) }, body: file });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "上传失败");
  return result.url;
}

async function persist(status) {
  const button = status === "published" ? document.querySelector("#publish") : document.querySelector("#saveDraft");
  button.disabled = true;
  button.textContent = status === "published" ? "正在上传并发布…" : "正在保存…";
  try {
    if (videoInput.files[0]) draft.videoUrl = await upload(videoInput.files[0], "video");
    if (imageInput.files.length) draft.imageUrls = await Promise.all([...imageInput.files].slice(0, 12).map((file) => upload(file, "image")));
    draft.actionName = actionNameInput.value.trim();
    draft.category = categorySelect.value;
    draft.tips = tipsInput.value.trim();
    draft.status = status;
    if (!draft.actionName) throw new Error("请先填写跟练动作名称。");
    if (status === "published" && (!draft.videoUrl || !draft.imageUrls.length || !draft.tips)) throw new Error("发布前请完成视频、动作拆解图和注意要领。");
    const id = currentId || newId();
    const response = await adminFetch(`/api/admin/courseware/${id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "保存失败");
    records[id] = result.item;
    currentId = id;
    rebuildCoursewareSelect(id);
    loadSelected();
    toast(status === "published" ? "已发布，用户端刷新后立即生效。" : "草稿已保存。");
  } catch (error) { toast(error.message, true); }
  finally {
    button.disabled = false;
    document.querySelector("#publish").textContent = "发布并对用户生效";
    document.querySelector("#saveDraft").textContent = "保存草稿";
  }
}

function bindDrop(zone, input) {
  ["dragenter", "dragover"].forEach((name) => zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.add("dragging"); }));
  ["dragleave", "drop"].forEach((name) => zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.remove("dragging"); }));
  zone.addEventListener("drop", (event) => { input.files = event.dataTransfer.files; input.dispatchEvent(new Event("change")); });
}

coursewareSelect.addEventListener("change", loadSelected);
[actionNameInput, categorySelect, tipsInput].forEach((input) => input.addEventListener("input", renderPreview));
videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];
  if (file) { localVideoUrl = URL.createObjectURL(file); objectUrls.push(localVideoUrl); document.querySelector("#videoLabel").textContent = file.name; renderPreview(); }
});
imageInput.addEventListener("change", () => {
  localImageUrls = [...imageInput.files].slice(0, 12).map((file) => { const url = URL.createObjectURL(file); objectUrls.push(url); return url; });
  if (localImageUrls.length) { document.querySelector("#imageLabel").textContent = `${localImageUrls.length} 张图片已选择`; renderPreview(); }
});
document.querySelector("#saveDraft").addEventListener("click", () => persist("draft"));
document.querySelector("#publish").addEventListener("click", () => persist("published"));
document.querySelector("#remove").addEventListener("click", async () => {
  if (!currentId) return toast("这是尚未保存的新课件。", true);
  if (!confirm(`确认清空“${draft.actionName}”的课件？`)) return;
  await adminFetch(`/api/admin/courseware/${currentId}`, { method: "DELETE" });
  delete records[currentId];
  rebuildCoursewareSelect("__new__");
  loadSelected();
  toast("该跟练课件已清空。");
});
bindDrop(document.querySelector("#videoDrop"), videoInput);
bindDrop(document.querySelector("#imageDrop"), imageInput);

function setPreviewMode(enabled) {
  document.body.classList.toggle("preview-mode", enabled);
  focusPreviewButton.setAttribute("aria-pressed", String(enabled));
  focusPreviewButton.textContent = enabled ? "返回编辑" : "进入专注预览";
}

focusPreviewButton.addEventListener("click", () => setPreviewMode(!document.body.classList.contains("preview-mode")));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("preview-mode")) setPreviewMode(false);
});

async function enterAdmin(token) {
  const button = document.querySelector("#accessSubmit");
  button.disabled = true;
  button.textContent = "正在验证…";
  adminToken = token.trim();
  try {
    const response = await adminFetch("/api/admin/courseware");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "无法进入后台");
    sessionStorage.setItem(tokenStorageKey, adminToken);
    records = Object.fromEntries((data.items || []).map((item) => [item.id, item]));
    rebuildCoursewareSelect("__new__");
    loadSelected();
    unlockAdmin();
  } catch (error) {
    lockAdmin(error.message || "无法进入后台");
  } finally {
    button.disabled = false;
    button.textContent = "进入后台";
  }
}

document.querySelector("#accessForm").addEventListener("submit", (event) => {
  event.preventDefault();
  enterAdmin(document.querySelector("#accessToken").value);
});
document.querySelector("#lockAdmin").addEventListener("click", () => {
  sessionStorage.removeItem(tokenStorageKey);
  adminToken = "";
  lockAdmin();
});

if (adminToken) enterAdmin(adminToken); else lockAdmin();
