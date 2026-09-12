import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const context = { window: {} };
vm.createContext(context);
for (const filename of ["plan-data.js", "content-data.js"]) {
  vm.runInContext(await readFile(join(root, filename), "utf8"), context, { filename });
}

const { exercises, weeks, cycles } = context.window.REHAB_DATA;
const { stages, exerciseDetails, scenarios, safetyQuestions, sources } = context.window.APP_CONTENT;

assert.equal(weeks.length, 16, "应保留完整 16 周参考课程");
assert.equal(cycles.length, 8, "应保留 8 个双周周期");
assert.deepEqual([...stages.map((stage) => stage.order)], [1, 2, 3, 4, 5], "能力阶段必须完整有序");
assert.equal(Object.keys(exercises).length, 32, "动作库数量意外变化");
assert.deepEqual(Object.keys(exerciseDetails).sort(), Object.keys(exercises).sort(), "每个动作都必须有完整教学");

const requiredDetailFields = ["setup", "steps", "breathing", "start", "selfCheck", "stop", "visual"];
for (const [id, detail] of Object.entries(exerciseDetails)) {
  for (const field of requiredDetailFields) assert.ok(detail[field]?.length, `${id} 缺少 ${field}`);
  assert.ok(exercises[id].mistakes, `${id} 缺少常见错误`);
  assert.ok(exercises[id].regression, `${id} 缺少简化版本`);
}

for (const stage of stages) {
  assert.ok(stage.plan.length >= 4, `${stage.id} 计划过短`);
  for (const entry of stage.plan) {
    assert.ok(exercises[entry.id], `${stage.id} 引用了不存在的动作 ${entry.id}`);
    for (const mode of ["standard", "reduced", "minimum"]) assert.ok(entry.doses[mode], `${stage.id}/${entry.id} 缺少 ${mode} 剂量`);
  }
}

for (const week of weeks) {
  assert.ok(week.objective && week.focus && week.gate, `第 ${week.week} 周内容不完整`);
  for (const session of week.sessions) for (const item of session.items) assert.ok(exercises[item.id], `第 ${week.week} 周引用不存在动作 ${item.id}`);
}

assert.equal(scenarios.length, 6, "生活情景应为 6 个");
for (const scenario of scenarios) {
  assert.equal(scenario.options.length, 3, `${scenario.id} 应有 3 个选择`);
  assert.ok(Number.isInteger(scenario.answer) && scenario.answer >= 0 && scenario.answer < 3, `${scenario.id} 正确答案无效`);
  assert.ok(scenario.feedback && scenario.retry, `${scenario.id} 缺少正确或重试解释`);
}
assert.ok(["urgent", "sameDay", "soon"].every((level) => safetyQuestions.some((item) => item.level === level)), "安全提示分级不完整");
assert.ok(sources.length >= 8, "内容来源数量不足");

const index = await readFile(join(root, "index.html"), "utf8");
const expectedScripts = ["plan-data.js", "content-data.js", "media-store.js", "public-media.js", "app.js"];
let previous = -1;
for (const script of expectedScripts) {
  const indexAt = index.indexOf(`./${script}`);
  assert.ok(indexAt > previous, `${script} 缺失或加载顺序错误`);
  previous = indexAt;
}

const standalone = await readFile(join(root, "复脊_腰痛康复教育App_单文件版.html"), "utf8");
assert.ok(standalone.includes('name="standalone-build" content="fuji-v3"'), "单文件标记缺失");
assert.ok(!expectedScripts.some((script) => standalone.includes(`src="./${script}"`)), "单文件仍依赖外部脚本");
assert.ok(!standalone.includes('href="./styles.css"'), "单文件仍依赖外部样式");

const appSource = await readFile(join(root, "app.js"), "utf8");
assert.match(appSource, /fetch\(appPath\("\/api\/courseware"\)/, "用户端应从当前部署路径的发布接口读取课件");
assert.match(appSource, /deploymentBasePath[\s\S]*contentPath/, "用户端应适配独立子路径和上传媒体地址");
assert.match(appSource, /跟练视频[\s\S]*跟练动作拆解（图片）[\s\S]*注意要领（文字）/, "课件预览应保留三个固定模块");
assert.match(appSource, /publishedPlanFor/, "今日跟练只能显示已发布课件");
assert.match(appSource, /event\.key === "Escape"\) closeTopModal\(\)/, "Escape 应只关闭最上层教学弹窗");
assert.match(appSource, /event\.key !== "Tab"/, "模态焦点限制必须处理 Tab 与 Shift+Tab");
assert.match(appSource, /!modal\.contains\(active\)[\s\S]*active === last[\s\S]*first\.focus\(\)/, "焦点在模态外或末项时应回到首项");
assert.match(appSource, /event\.shiftKey && active === first[\s\S]*last\.focus\(\)/, "Shift+Tab 应从首项循环到末项");
assert.match(appSource, /updateState\(\{ media, disabledPublicMedia:[\s\S]*await previewMedia\(exerciseId\)/, "保存媒体后应立即恢复真实预览");
assert.doesNotMatch(appSource, /data-action="preview-local-media"\s+data-exercise=/, "本地预览操作不能被通用动作教学点击分支截获");
assert.match(appSource, /data-action="preview-local-media" data-media-exercise=/, "本地预览应使用专用动作 ID 属性");

const styles = await readFile(join(root, "styles.css"), "utf8");
assert.match(styles, /\.recommendation-code strong\s*\{[\s\S]*font-size:\s*54px/, "推荐阶段数字应使用大字号");
assert.match(styles, /\.recommendation-code span\s*\{[\s\S]*font-size:\s*10px/, "推荐阶段长标签应使用可读小字号");

const admin = await readFile(join(root, "admin.html"), "utf8");
assert.match(admin, /用户大预览/);
assert.match(admin, /admin-theme\.css/, "康复师后台应加载独立视觉主题");
assert.match(admin, /focusPreview/, "康复师后台应提供专注预览入口");
assert.match(admin, /进入专注预览/, "专注预览按钮应有明确文案");
assert.match(admin, /href="\.\/"/, "康复师后台返回用户端时应保留部署子路径");
assert.match(admin, /发布并对用户生效/);
assert.match(admin, /屈曲不耐受/);
assert.match(admin, /伸展不耐受/);
assert.match(admin, /压缩不耐受/);
assert.doesNotMatch(admin, /plan-data\.js/, "康复师后台不应依赖预设动作库");
const adminTheme = await readFile(join(root, "admin-theme.css"), "utf8");
assert.match(adminTheme, /radial-gradient/, "康复师后台应保留参考风格的柔光背景");
assert.match(adminTheme, /\.course-preview[\s\S]*border-radius:30px/, "大预览应使用大圆角卡片");
const server = await readFile(join(root, "server.mjs"), "utf8");
assert.match(server, /GET[^\n]*\/api\/courseware/);
assert.match(server, /\/api\/admin\/upload/);

console.log(`静态检查通过：${stages.length} 阶段、${weeks.length} 周、${Object.keys(exercises).length} 个动作、${scenarios.length} 个生活情景。`);
