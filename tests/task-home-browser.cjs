const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage({serviceWorkers:'block',viewport:{width:1400,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/courseware',r=>r.fulfill({json:{items:[{id:'fixture',actionName:'跟练示范',category:'extension',tips:'按课件说明进行',videoUrl:'',imageUrls:[],status:'published'}]}}));
await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5328/');await page.waitForFunction(()=>publishedCourseware.length===1);
await page.evaluate(()=>updateState({started:true,consent:true,safetyStatus:'clear',safetyFlags:[],currentStageId:'foundation',selectedStageId:'foundation'}));
assert.equal(await page.locator('.side-nav button').count(),4);
await page.locator('.start-session').click();await page.locator('#prePain').fill('3');await page.locator('[data-action="confirm-precheck"]').click();
await page.locator('[data-player-check]').check();await page.locator('.player-item [data-courseware]').click();await page.locator('[data-action="close-teaching"]').click();assert.ok(await page.locator('[data-player-check]').isChecked());
await page.locator('[data-action="pause-session"]').click();assert.ok(await page.locator('[data-action="resume-session"]').isVisible());
await page.reload();await page.waitForFunction(()=>publishedCourseware.length===1);await page.locator('[data-action="resume-session"]').click();assert.ok(await page.locator('[data-player-check]').isChecked());
await page.locator('[data-action="finish-session"]').click();await page.locator('#postPain').fill('2');await page.locator('[data-action="save-session"]').click();await page.getByRole('heading',{name:'今日训练已记录'}).waitFor();assert.equal(await page.evaluate(()=>state.sessions[0].completedCount),1);
await page.locator('.side-nav [data-view="review"]').click();await page.locator('.view-tabs [data-review-tab="reaction"]').click();await page.locator('#checkinNote').fill('往返保留输入');await page.locator('.side-nav [data-view="today"]').click();await page.locator('.side-nav [data-view="review"]').click();assert.equal(await page.locator('#checkinNote').inputValue(),'往返保留输入');
await page.locator('[data-review-tab="stages"]').click();assert.ok(await page.locator('.stage-rail').isVisible());
await page.locator('.side-nav [data-view="more"]').click();for(const tab of ['guide','learn','course','practice','safety','data']){await page.locator(`.more-tabs [data-more-tab="${tab}"]`).click();assert.ok((await page.locator('.view-container').innerText()).length>30);}
await page.evaluate(()=>{sessionDraft=null;updateState({activeView:'today',sessions:[],checkins:[]});});
await page.screenshot({path:'verification/task-home-desktop.png',fullPage:true});
for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('.start-session').isVisible());await page.screenshot({path:`verification/task-home-${width}.png`,fullPage:true});}
await page.evaluate(()=>{publishedCourseware=[];publishedCoursewareById={};render();});await page.getByRole('button',{name:'查看使用说明 →',exact:true}).waitFor();
await page.evaluate(()=>{state.trainingPaused=true;render();});await page.getByRole('heading',{name:'当前训练已暂停'}).waitFor();assert.equal(await page.locator('.start-session').count(),0);
assert.deepEqual(errors,[]);console.log('通过：四个主菜单、完整训练保存、课件不误勾选、离开与刷新后续练、表单往返保留、所有二级菜单、320/390 手机布局、空课件和暂停。');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
