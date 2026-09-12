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
let saving = false;
const uploadedFiles = new WeakMap();

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

function setSaveProgress(message, percent = null, error = false) {
  const panel = document.querySelector("#saveProgress");
  panel.hidden = false;
  panel.classList.toggle("error", error);
  document.querySelector("#saveProgressText").textContent = message;
  const bar = document.querySelector("#saveProgressBar");
  bar.hidden = error;
  if (percent === null) bar.removeAttribute("value"); else bar.value = percent;
}

function requestJSON(path, { method = "GET", headers = {}, body, onProgress, timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, appPath(path));
    xhr.timeout = timeout;
    xhr.setRequestHeader("x-admin-token", adminToken);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    let idleTimer;
    const watchActivity = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        reject(new Error("连接超过 60 秒没有响应，请检查网络后重试；若已提交发布，请先查看用户端确认结果。"));
        xhr.abort();
      }, 60000);
    };
    xhr.onloadend = () => clearTimeout(idleTimer);
    xhr.upload.onprogress = (event) => { watchActivity(); onProgress?.(event); };
    xhr.onprogress = watchActivity;
    watchActivity();
    xhr.onerror = () => reject(new Error("网络连接中断，请检查网络后重试。"));
    xhr.ontimeout = () => reject(new Error("请求超时。上传素材会保留，请稍后重试；若已提交发布，请先查看用户端确认结果。"));
    xhr.onabort = () => reject(new Error("上传已中断，可以重试。"));
    xhr.onload = () => {
      if (xhr.status === 401) {
        sessionStorage.removeItem(tokenStorageKey);
        adminToken = "";
        lockAdmin("访问码已失效，请重新输入。");
      }
      let result;
      try { result = JSON.parse(xhr.responseText); } catch {
        reject(new Error(xhr.status === 413 ? "文件超过 300 MB，请压缩后重试。" : `服务器响应异常（${xhr.status}），请稍后重试。`));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) reject(new Error(result.error || `请求失败（${xhr.status}）`));
      else resolve(result);
    };
    xhr.send(body);
  });
}

async function upload(file, kind, label) {
  if (uploadedFiles.has(file)) return uploadedFiles.get(file);
  const size = (file.size / 1024 / 1024).toFixed(1);
  setSaveProgress(`${label}：0% · 0 / ${size} MB`, 0);
  const result = await requestJSON(`/api/admin/upload?kind=${kind}`, {
    method: "POST", headers: { "content-type": file.type, "x-file-name": encodeURIComponent(file.name) }, body: file,
    timeout: 30 * 60 * 1000,
    onProgress: (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round(event.loaded / event.total * 100);
      setSaveProgress(event.loaded >= event.total ? `${label}：已发送，等待服务器确认…` : `${label}：${percent}% · ${(event.loaded / 1024 / 1024).toFixed(1)} / ${size} MB`, percent);
    }
  });
  if (!result.url) throw new Error("服务器未返回文件地址，请重试。");
  uploadedFiles.set(file, result.url);
  return result.url;
}

async function persist(status) {
  if (saving) return;
  const video = videoInput.files[0];
  const images = [...imageInput.files];
  const next = { ...draft, actionName: actionNameInput.value.trim(), category: categorySelect.value, tips: tipsInput.value.trim(), status };
  const controls = [...document.querySelectorAll(".editor-panel input, .editor-panel select, .editor-panel textarea, .editor-panel button, #lockAdmin")];
  const previousDisabled = controls.map((control) => control.disabled);
  try {
    if (!next.actionName) throw new Error("请先填写跟练动作名称。");
    if (images.length > 12) throw new Error("动作拆解最多上传 12 张图片。");
    for (const file of [video, ...images].filter(Boolean)) {
      if (!file.size) throw new Error(`“${file.name}”是空文件，请重新选择。`);
      if (file.size > 300 * 1024 * 1024) throw new Error(`“${file.name}”超过 300 MB，请压缩后重试。`);
    }
    if (video && !video.type.startsWith("video/")) throw new Error("请选择有效的视频文件。");
    if (images.some((file) => !file.type.startsWith("image/"))) throw new Error("动作拆解请选择图片文件。");
    if (status === "published" && (!(video || next.videoUrl) || !(images.length || next.imageUrls.length) || !next.tips)) throw new Error("发布前请完成视频、动作拆解图和注意要领。");
    saving = true;
    controls.forEach((control) => control.disabled = true);
    document.querySelector(status === "published" ? "#publish" : "#saveDraft").textContent = status === "published" ? "正在发布…" : "正在保存…";
    if (video) next.videoUrl = await upload(video, "video", "上传视频");
    if (images.length) {
      next.imageUrls = [];
      for (const [index, file] of images.entries()) next.imageUrls.push(await upload(file, "image", `上传图片 ${index + 1}/${images.length}`));
    }
    setSaveProgress(status === "published" ? "素材已就绪，正在确认发布…" : "正在保存草稿…");
    // Keep the same ID when a response is lost, so retry cannot create a duplicate.
    const id = currentId || (currentId = newId());
    const result = await requestJSON(`/api/admin/courseware/${id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    records[id] = result.item;
    rebuildCoursewareSelect(id);
    loadSelected();
    const message = status === "published" ? "发布成功，用户端已生效。" : "草稿已保存。";
    setSaveProgress(message, 100);
    toast(message);
  } catch (error) {
    setSaveProgress(error.message, null, true);
    toast(error.message, true);
  } finally {
    saving = false;
    controls.forEach((control, index) => control.disabled = previousDisabled[index]);
    document.querySelector("#publish").textContent = "发布并对用户生效";
    document.querySelector("#saveDraft").textContent = "保存草稿";
  }
}

function bindDrop(zone, input) {
  ["dragenter", "dragover"].forEach((name) => zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.add("dragging"); }));
  ["dragleave", "drop"].forEach((name) => zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.remove("dragging"); }));
  zone.addEventListener("drop", (event) => { if (saving) return; input.files = event.dataTransfer.files; input.dispatchEvent(new Event("change")); });
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
