# 复脊动作视频接入说明

## 当前浏览器版的行为

作者工具支持两种媒体来源：

1. **本地视频文件**：文件二进制保存在当前浏览器的 IndexedDB `fuji_media_v1` 中，映射信息保存在 `localStorage`。可以预览、替换和移除，但不会上传到云端，也不会写进单文件 HTML。
2. **网址或相对路径**：支持直链 MP4/WebM、YouTube、Vimeo 以及例如 `./videos/breathing.mp4` 的站点相对路径。映射会随状态持久化，可以单独导出和两步确认导入。

若要交付带视频的站点版，建议把视频放入 `BackPainWeb/videos/`，使用相对路径映射。外部网址在离线状态下不可用；双击单文件版时，相对路径以该 HTML 所在目录为基准。

## 作者配置一次，新用户直接使用

1. 在应用“更多 → 作者视频”中为动作填写 HTTPS 地址或站点相对路径并保存；本地上传若要分发，需先把文件复制到 `BackPainWeb/videos/` 并改用相对路径。
2. 点击“导出发布映射”。该 JSON 只含动作 ID 与视频地址，不含症状、训练或其他用户状态。
3. 生成带公共默认映射的单文件：

```bash
node BackPainWeb/build-standalone.mjs --media-map 复脊视频发布映射_YYYY-MM-DD.json
```

把生成的 `复脊_腰痛康复教育App_单文件版.html` 与相对路径视频目录一起交付。新浏览器首次打开会直接读取嵌入的公共映射，无需导入 JSON。站点发布也可以把相同映射写进 `public-media.js` 后部署源码目录。

媒体映射 JSON 的公开格式：

```json
{
  "schema": "fuji-media-map",
  "version": 1,
  "media": {
    "breathing": {
      "type": "url",
      "url": "./videos/breathing.mp4",
      "updatedAt": "2026-09-05T00:00:00.000Z"
    }
  }
}
```

导出内容不包含本地文件二进制数据，避免在不知情的情况下复制大文件或健康记录。

## 后续后端 / API 接入边界

前端唯一媒体适配层是 `media-store.js`。接入云端时可保持动作 ID 不变，将当前 IndexedDB 方法替换或补充为以下接口：

- `GET /api/v1/exercise-media`：返回动作媒体映射。
- `PUT /api/v1/exercise-media/:exerciseId`：保存 URL、说明、字幕和版本信息。
- `DELETE /api/v1/exercise-media/:exerciseId`：移除映射。
- `POST /api/v1/exercise-media/uploads`：获取带权限和过期时间的签名上传地址。

建议返回字段：

```json
{
  "exerciseId": "breathing",
  "kind": "hosted",
  "url": "https://cdn.example.com/video.mp4",
  "posterUrl": "https://cdn.example.com/poster.webp",
  "captionsUrl": "https://cdn.example.com/captions.zh-CN.vtt",
  "durationSeconds": 92,
  "version": 3,
  "updatedAt": "2026-09-05T00:00:00.000Z"
}
```

生产环境还需要身份验证、作者权限、内容审核、文件类型与容量校验、病毒扫描、CDN/CORS 配置、字幕和无障碍审查。不要把本地 `localStorage` 或 IndexedDB 当作多用户云同步方案。
