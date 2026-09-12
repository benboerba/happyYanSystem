(() => {
  const DB_NAME = "fuji_media_v1";
  const STORE_NAME = "exerciseVideos";

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error("当前浏览器不支持本地视频存储"));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("无法打开本地视频存储"));
    });
  }

  async function withStore(mode, operation) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("视频存储操作失败"));
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => reject(transaction.error || new Error("视频存储事务失败"));
    });
  }

  function put(exerciseId, file) {
    return withStore("readwrite", (store) => store.put(file, exerciseId));
  }

  function get(exerciseId) {
    return withStore("readonly", (store) => store.get(exerciseId));
  }

  function remove(exerciseId) {
    return withStore("readwrite", (store) => store.delete(exerciseId));
  }

  async function clear() {
    return withStore("readwrite", (store) => store.clear());
  }

  function normalizeVideoUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "";
    if (/^(https?:\/\/)/i.test(url)) return url;
    if (/^(\.\.?\/|\/)[^\s]+$/i.test(url)) return url;
    return "";
  }

  function youtubeEmbed(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
      if (parsed.hostname.includes("youtube.com")) {
        const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
      }
    } catch {}
    return "";
  }

  function vimeoEmbed(url) {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.includes("vimeo.com")) return "";
      const id = parsed.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
      return id ? `https://player.vimeo.com/video/${id}` : "";
    } catch {
      return "";
    }
  }

  function renderVideo(url, title, className = "") {
    const embed = youtubeEmbed(url) || vimeoEmbed(url);
    if (embed) {
      return `<div class="video-frame ${className}"><iframe src="${escapeAttribute(embed)}" title="${escapeAttribute(title)}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
    }
    return `<div class="video-frame ${className}"><video src="${escapeAttribute(url)}" controls playsinline preload="metadata">当前浏览器无法播放这个视频。</video></div>`;
  }

  function escapeAttribute(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  window.MediaStore = { put, get, remove, clear, normalizeVideoUrl, renderVideo };
})();
