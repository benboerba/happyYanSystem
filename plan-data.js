(() => {
  const item = (id, dose, note = "") => ({ id, dose, note });

  const exercises = {
    breathing: {
      name: "舒适位呼吸",
      kind: "恢复",
      cue: "让下肋向两侧打开，缓慢呼气；腰背保持舒适，不用力压平。",
      mistakes: "屏气、刻意把腰压向地面、追求很深的吸气。",
      regression: "改为侧卧或坐姿，缩短到每轮 3 次呼吸。"
    },
    catCamel: {
      name: "猫牛式资格练习",
      kind: "活动",
      cue: "缓慢移动，只轻触个人末端范围，不在末端停留。",
      mistakes: "快速弹震、追求最大幅度、出现熟悉痛或腿部症状仍继续。",
      regression: "缩小幅度、改站姿扶台；若仍诱发症状则暂停。"
    },
    brace: {
      name: "轻度腹部支撑",
      kind: "控制",
      cue: "像准备接住轻微碰撞一样收紧腹部，同时保持顺畅呼吸。",
      mistakes: "吸肚子、全天大力绷紧、用憋气代替支撑。",
      regression: "减小用力到 20%–30%，每次只保持 3 秒。"
    },
    logRoll: {
      name: "侧翻起床",
      kind: "日常动作",
      cue: "肩与骨盆作为整体侧翻，双腿下床的同时用手臂撑起。",
      mistakes: "直接仰卧起坐、肩和骨盆分开扭转。",
      regression: "放慢速度，并在床边预留更多空间。"
    },
    stickHinge: {
      name: "木棍三点髋铰链",
      kind: "动作工具",
      cue: "后脑、胸椎、骶骨保持三点接触，臀部向后。",
      mistakes: "腰先弯、木棍离开身体、膝盖向前代替髋部后移。",
      regression: "减小幅度，改做臀部触墙。"
    },
    wallHinge: {
      name: "臀部触墙髋铰链",
      kind: "动作工具",
      cue: "站在墙前半步，臀部向后找墙，躯干保持长。",
      mistakes: "蹲下去、腰部局部折叠、为了碰墙而后仰。",
      regression: "离墙更近，动作幅度更小。"
    },
    hinge: {
      name: "徒手髋铰链",
      kind: "动作模式",
      cue: "臀部向后，脚掌稳定，起身时髋部向前完成动作。",
      mistakes: "负荷远离身体、起身先抬胸或先抬臀、腰部局部折叠。",
      regression: "回到木棍三点接触或臀部触墙。"
    },
    loadedHinge: {
      name: "高位负重髋铰链",
      kind: "力量",
      cue: "从较高位置开始，负荷贴近身体，髋腿发力完成。",
      mistakes: "重量先行、物体离身、末端过度挺腰。",
      regression: "减重、提高起始高度或回到徒手版本。"
    },
    sitStand: {
      name: "扶持坐站",
      kind: "日常动作",
      cue: "脚踩稳，身体整体前倾后用髋腿站起。",
      mistakes: "膝盖内扣、腰先弯、猛冲起身。",
      regression: "提高椅面或增加手扶。"
    },
    boxSquat: {
      name: "箱式深蹲",
      kind: "动作模式",
      cue: "髋膝协同，足底稳定，在骨盆翻卷前结束深度。",
      mistakes: "追求统一深度、腰部末端折叠、膝盖明显内扣。",
      regression: "提高箱子、缩小幅度或增加手扶。"
    },
    gobletSquat: {
      name: "杯式箱式深蹲",
      kind: "力量",
      cue: "重量贴近胸口，先建立合适支撑，再用髋腿完成。",
      mistakes: "为了深度丢失腰背控制、用憋气完成轻重量。",
      regression: "减重、提高箱子或改回徒手坐站。"
    },
    curlUp: {
      name: "改良卷腹",
      kind: "Big Three",
      cue: "一膝弯曲、双手支撑自然腰弧，头颈上胸作为整体轻抬。",
      mistakes: "做成仰卧起坐、腰部反复屈曲、下巴猛收、屏气。",
      regression: "只做腹部支撑不抬头胸，或把金字塔降到 3/2/1。"
    },
    wallSide: {
      name: "墙面侧桥",
      kind: "Big Three 退阶",
      cue: "前臂撑墙，头—胸—骨盆排成一线，轻推墙面并呼吸。",
      mistakes: "身体旋转、肩部耸起、憋气。",
      regression: "身体更接近直立，减少保持时间。"
    },
    sideBridge: {
      name: "侧桥",
      kind: "Big Three",
      cue: "肋骨与骨盆对齐，头—胸—骨盆呈一线，保持呼吸。",
      mistakes: "塌腰、身体旋转、肩痛、用憋气维持。",
      regression: "提高支撑面、屈膝或缩短杠杆。"
    },
    birdDogEasy: {
      name: "鸟狗单肢退阶",
      kind: "Big Three 退阶",
      cue: "先抬一只手或让一条腿沿地面滑，骨盆保持水平。",
      mistakes: "手脚抬过高、腰椎过伸、身体摇晃。",
      regression: "改为站姿扶台，或只做重心转移。"
    },
    birdDog: {
      name: "鸟狗",
      kind: "Big Three",
      cue: "脚跟向后推，骨盆像端着一杯水；手脚不用高过身体。",
      mistakes: "腰部下塌、骨盆翻转、抬得过高、屏气。",
      regression: "回到单肢、腿沿地面滑或站姿扶台。"
    },
    carryHug: {
      name: "双手前抱携行",
      kind: "携行",
      cue: "物体贴近身体，步态自然，躯干不过度后仰。",
      mistakes: "物体离身、耸肩、屏气、走到症状明显上升。",
      regression: "减轻物体、缩短距离或改为空手行走。"
    },
    farmerCarry: {
      name: "双侧农夫走",
      kind: "携行",
      cue: "两侧负荷贴身，身体直立但放松，保持自然呼吸。",
      mistakes: "耸肩、摇摆、负荷离身、追求握力力竭。",
      regression: "减重、缩短距离或回到前抱轻物。"
    },
    suitcaseCarry: {
      name: "单侧行李箱携行",
      kind: "单侧控制",
      cue: "不要向负重侧或对侧倾斜，步幅自然，保持呼吸。",
      mistakes: "躯干侧倾、骨盆旋转、为了距离牺牲姿势。",
      regression: "减重、缩短距离或回到双侧农夫走。"
    },
    stepUp: {
      name: "低台阶踏步",
      kind: "下肢",
      cue: "整只脚踩稳，髋膝同向，用站立腿把身体带上去。",
      mistakes: "蹬地腿借力过多、骨盆歪斜、腰部后仰。",
      regression: "降低台阶或增加手扶。"
    },
    splitSquat: {
      name: "扶持分腿蹲",
      kind: "下肢",
      cue: "分腿站稳后垂直下降，躯干与骨盆保持可控。",
      mistakes: "前后摇晃、骨盆旋转、为了深度折叠腰部。",
      regression: "缩小幅度、增加手扶或只练分腿站。"
    },
    row: {
      name: "划船",
      kind: "推拉",
      cue: "先建立轻度支撑，手臂拉动时躯干不随拉力摆动。",
      mistakes: "腰部前后摆、耸肩、拉到力竭。",
      regression: "减小阻力、双脚站宽或使用胸部支撑。"
    },
    push: {
      name: "高位俯卧撑／器械推",
      kind: "推拉",
      cue: "身体作为整体移动，肋骨与骨盆保持对齐。",
      mistakes: "塌腰、头先伸、用憋气换稳定。",
      regression: "提高支撑面或减小阻力。"
    },
    walk: {
      name: "阈值内步行",
      kind: "容量",
      cue: "在症状明显上升前结束；可拆成多个短区间。",
      mistakes: "一次走到痛、同时增加速度和时长、出现远端扩散仍继续。",
      regression: "缩短单段时长，增加恢复间隔。"
    },
    intervalWalk: {
      name: "步行区间",
      kind: "耐力",
      cue: "快走与慢走交替，两种速度都必须低于个人症状阈值。",
      mistakes: "追求配速、疲劳后步态变形、一次增加多个变量。",
      regression: "缩短快走区间或增加慢走恢复。"
    },
    singleLeg: {
      name: "单腿站",
      kind: "平衡",
      cue: "轻扶稳定物，骨盆保持水平，脚掌三点受力。",
      mistakes: "憋气、骨盆明显歪斜、为了时间不断晃动。",
      regression: "增加手扶或改为前后错步站。"
    },
    stopTwist: {
      name: "Stop-twist 转身",
      kind: "动作工具",
      cue: "用脚步和脚掌转动，让身体作为整体改变方向。",
      mistakes: "脚不动、腰椎先扭；追求速度而丢失控制。",
      regression: "墙面支撑下慢速练习。"
    },
    taskPractice: {
      name: "真实任务练习",
      kind: "迁移",
      cue: "只选一个真实任务和一个清晰提示，验证是否更舒服、更可控。",
      mistakes: "一次练很多任务、不断试痛、同时改变多个变量。",
      regression: "减轻物体、缩小范围或拆成单一步骤。"
    },
    cardio: {
      name: "低冲击有氧",
      kind: "容量",
      cue: "保持能对话的强度，结束后症状应回到基线附近。",
      mistakes: "用高强度抵消久坐、忽视次日反应。",
      regression: "缩短到 10 分钟或拆成两段。"
    },
    sportSkill: {
      name: "目标任务低速技术",
      kind: "专项",
      cue: "先保证动作路径，再逐步加入速度、方向或复杂度中的一个。",
      mistakes: "同时加速度和总量、直接进入对抗、疲劳后继续。",
      regression: "回到影子练习或计划性脚步。"
    },
    runWalk: {
      name: "跑走间歇",
      kind: "跑步回归",
      cue: "跑姿自然、安静、可控，不追求配速；腿部症状扩散立即停止。",
      mistakes: "同时增加配速与距离、勉强完成既定轮数。",
      regression: "回到快走区间或减少跑步时长。"
    },
    rotationSkill: {
      name: "低速旋转专项",
      kind: "球类回归",
      cue: "力量来自髋与脚，经躯干传递；脚步先转，腰部不反复扭转。",
      mistakes: "从腰部主动甩动、直接全速、没有充分恢复。",
      regression: "影子练习、降低主观速度或改为计划性脚步。"
    }
  };

  const weeks = [
    {
      week: 1, cycle: 1, title: "建立基线，找到触发机制", stage: "评估与矫正",
      objective: "停止反复刺激疼痛的暴露，建立安全活动基线。",
      focus: "先观察姿势、动作、负荷、范围与重复次数，不追求练强。",
      daily: "记录坐、站、走、弯腰、起床、开车与搬物后的症状；每 30–45 分钟换一次姿势。",
      gate: ["没有新发或加重的腿部症状", "侧翻起床、坐站与轻髋铰链不明显加痛", "找到至少 1–2 个主要触发因素"],
      sessions: [
        { name: "训练 A", minutes: "10–15 分钟", items: [item("breathing", "2 组 × 5 次"), item("catCamel", "7–8 个温和循环，仅耐受时"), item("brace", "3 组 × 5 秒"), item("stickHinge", "2 组 × 5 次"), item("logRoll", "每侧 3 次"), item("walk", "3–5 分钟或阈值的 50%–70%")] },
        { name: "训练 B", minutes: "10–15 分钟", items: [item("breathing", "2 组 × 5 次"), item("catCamel", "仅耐受时 7–8 次"), item("sitStand", "2 组 × 5 次"), item("wallHinge", "2 组 × 5 次"), item("walk", "与训练 A 相同，不加时长")] },
        { name: "短步行与动作卫生", minutes: "5–12 分钟", items: [item("walk", "短区间"), item("logRoll", "按需练习"), item("taskPractice", "选择 1 个轻任务")] }
      ]
    },
    {
      week: 2, cycle: 1, title: "虚拟手术保护窗口", stage: "评估与矫正",
      objective: "连续减少致痛暴露，同时维持适度活动，让症状趋势稳定。",
      focus: "虚拟手术不是卧床，而是暂时移除反复致痛的姿势、动作与负荷。",
      daily: "步行 2–4 个短区间；搬物先靠近、轻度支撑，再用髋腿发力。",
      gate: ["连续 3 次每日检查无次日恶化", "Big Three 退阶中能正常呼吸", "腰部无明显折叠、旋转或下塌"],
      sessions: [
        { name: "训练 A", minutes: "12–18 分钟", items: [item("catCamel", "耐受时 7–8 次"), item("curlUp", "3 次 × 5 秒，退阶"), item("wallSide", "每侧 3 次 × 5 秒"), item("birdDogEasy", "每侧 3 次 × 5 秒"), item("stickHinge", "2 组 × 6 次"), item("walk", "5–8 分钟或阈值的 50%–70%")] },
        { name: "训练 B", minutes: "12–18 分钟", items: [item("breathing", "2 组 × 5 次"), item("sitStand", "2 组 × 6 次"), item("wallHinge", "2 组 × 6 次"), item("wallSide", "每侧 3 次 × 5 秒"), item("walk", "与训练 A 相同")] },
        { name: "保护窗口", minutes: "分散完成", items: [item("walk", "2–4 个短区间"), item("taskPractice", "练习物体贴身与髋驱动")] }
      ]
    },
    {
      week: 3, cycle: 2, title: "重建无痛日常动作", stage: "动作工具",
      objective: "把保护技巧带回起床、坐站、弯腰、开门与轻物拾取。",
      focus: "一次只使用一个动作提示，并验证它是否真的减少症状。",
      daily: "每天选择一个真实任务：起床、穿鞋、坐站、开门、拾物或洗漱。",
      gate: ["真实任务可由髋与腿完成", "腰部无明显动作泄漏", "训练后 24 小时没有反跳"],
      sessions: [
        { name: "训练 A", minutes: "15–20 分钟", items: [item("catCamel", "耐受时 7–8 次"), item("curlUp", "3/2/1，每次 6–8 秒"), item("wallSide", "每侧 3/2/1，每次 6–8 秒"), item("birdDogEasy", "每侧 3/2/1，每次 6–8 秒"), item("stickHinge", "2 组 × 6 次")] },
        { name: "训练 B", minutes: "15–20 分钟", items: [item("sitStand", "2 组 × 6 次"), item("boxSquat", "高箱 2 组 × 5 次"), item("taskPractice", "轻物贴身拾取 2 组 × 5 次"), item("carryHug", "3 组 × 15–20 秒"), item("walk", "8–12 分钟，可分段")] },
        { name: "生活迁移", minutes: "5–10 分钟", items: [item("logRoll", "按需"), item("stopTwist", "墙面慢速练习"), item("taskPractice", "一个任务、一个提示")] }
      ]
    },
    {
      week: 4, cycle: 2, title: "Big Three 基础建立", stage: "动作工具",
      objective: "形成基础躯干控制与短时耐力，不追求长时间支撑。",
      focus: "10 秒保持、5/3/1 递减金字塔；动作不变形比完成数字更重要。",
      daily: "已通过资格门后，每日纳入可耐受版本的 Big Three；主训练日不重复加练。",
      gate: ["连续 3 次训练动作质量稳定", "保持中可以正常呼吸", "疼痛趋势与次日反应稳定"],
      sessions: [
        { name: "训练 A", minutes: "18–22 分钟", items: [item("catCamel", "耐受时 7–8 次"), item("curlUp", "5/3/1，每次约 10 秒"), item("sideBridge", "每侧 5/3/1，每次约 10 秒"), item("birdDog", "每侧 5/3/1，每次约 10 秒"), item("hinge", "2 组 × 8 次")] },
        { name: "训练 B", minutes: "18–22 分钟", items: [item("boxSquat", "2 组 × 6 次"), item("stepUp", "每侧 2 组 × 5 次"), item("carryHug", "3 组 × 20 秒"), item("walk", "10–15 分钟，可分段")] },
        { name: "每日基础", minutes: "10–15 分钟", items: [item("curlUp", "合格版本 5/3/1"), item("sideBridge", "每侧 5/3/1"), item("birdDog", "每侧 5/3/1")] }
      ]
    },
    {
      week: 5, cycle: 3, title: "稳定性容量增加", stage: "战略稳定",
      objective: "保持短时收缩，在新鲜状态增加优质重复次数。",
      focus: "采用耐力哲学，不练到力竭。",
      daily: "若一次剂量引起疲劳，可拆分到上午与下午。",
      gate: ["轻度疲劳下动作仍一致", "主观用力不超过 6/10", "睡眠、晨起与腿部症状不变差"],
      sessions: [
        { name: "躯干训练", minutes: "20–25 分钟", items: [item("catCamel", "耐受时 7–8 次"), item("curlUp", "5/3/1，每次 8–10 秒"), item("sideBridge", "每侧 5/3/1"), item("birdDog", "每侧 5/3/1"), item("carryHug", "3 组 × 20 米或 20–30 秒")] },
        { name: "动作训练", minutes: "20–25 分钟", items: [item("hinge", "3 组 × 6 次"), item("boxSquat", "3 组 × 6 次"), item("stepUp", "每侧 2 组 × 6 次"), item("walk", "15–20 分钟，可分段")] },
        { name: "步行／恢复", minutes: "15–20 分钟", items: [item("walk", "阈值内完成"), item("breathing", "结束后 1 组 × 5 次")] }
      ]
    },
    {
      week: 6, cycle: 3, title: "髋—躯干整合", stage: "战略稳定",
      objective: "让髋产生动作、躯干传递力量，并在动作结束后放松。",
      focus: "刚度像调光开关：有任务时建立，任务后释放。",
      daily: "步行每周 4–6 天；单段时长或总段数只增加一个。",
      gate: ["髋铰链三点对齐，负荷贴身", "分腿站时骨盆可控", "训练后 24 小时无明显恶化"],
      sessions: [
        { name: "躯干训练", minutes: "20–25 分钟", items: [item("curlUp", "5/3/1，每次 8–10 秒"), item("sideBridge", "合格后升级；升级降至 3/2/1"), item("birdDog", "合格后升级；升级降至 3/2/1"), item("farmerCarry", "3 组 × 20 米")] },
        { name: "动作训练", minutes: "20–25 分钟", items: [item("hinge", "2 组 × 8 次"), item("loadedHinge", "高位轻负荷 2 组 × 6 次"), item("boxSquat", "3 组 × 6 次"), item("splitSquat", "每侧 2 组 × 5 次")] },
        { name: "步行容量", minutes: "按个人阈值", items: [item("walk", "仅增时长或段数之一"), item("stopTwist", "慢速 2 组 × 4 次")] }
      ]
    },
    {
      week: 7, cycle: 4, title: "从稳定进入耐力", stage: "耐力",
      objective: "在疲劳出现之前保持动作，不把训练做成意志力测试。",
      focus: "耐力是进入高强度训练的前提。",
      daily: "结束每组时，下一次重复仍应与第一次一样。",
      gate: ["重复动作不崩形、不憋气", "不靠忍痛完成", "步行总量增加后次日稳定"],
      sessions: [
        { name: "躯干训练", minutes: "20–28 分钟", items: [item("curlUp", "6/4/2；过量则 5/3/1"), item("sideBridge", "每侧 5/3/1"), item("birdDog", "每侧 5/3/1"), item("farmerCarry", "4 组 × 20 米")] },
        { name: "动作训练", minutes: "22–28 分钟", items: [item("hinge", "3 组 × 8 次"), item("boxSquat", "3 组 × 8 次"), item("splitSquat", "每侧 2 组 × 6 次"), item("row", "2 组 × 8 次")] },
        { name: "步行区间", minutes: "18–30 分钟", items: [item("intervalWalk", "快走 3–5 分钟＋慢走 1–2 分钟，3–5 轮")] }
      ]
    },
    {
      week: 8, cycle: 4, title: "单侧负荷与移动稳定", stage: "耐力",
      objective: "把躯干控制带入单侧负荷、步行与分腿动作。",
      focus: "负荷不对称时，躯干仍应保持可呼吸的控制。",
      daily: "单侧负荷以不侧倾、不旋转为剂量上限。",
      gate: ["单侧携行无明显侧倾", "分腿动作中骨盆与腰部稳定", "症状不向远端扩散"],
      sessions: [
        { name: "训练 A", minutes: "25–30 分钟", items: [item("curlUp", "Big Three 5/3/1 维护"), item("sideBridge", "每侧 5/3/1"), item("birdDog", "每侧 5/3/1"), item("suitcaseCarry", "每侧 3 组 × 15–20 米"), item("boxSquat", "3 组 × 8 次"), item("row", "3 组 × 8 次")] },
        { name: "训练 B", minutes: "25–30 分钟", items: [item("splitSquat", "每侧 3 组 × 6 次"), item("stepUp", "每侧 2 组 × 6 次"), item("loadedHinge", "3 组 × 6 次"), item("push", "2 组 × 8 次")] },
        { name: "训练 C", minutes: "20–25 分钟", items: [item("curlUp", "Big Three 3/2/1 轻量维护"), item("sideBridge", "每侧 3/2/1"), item("birdDog", "每侧 3/2/1"), item("farmerCarry", "3 组 × 25–30 米"), item("intervalWalk", "15–25 分钟总时间")] }
      ]
    },
    {
      week: 9, cycle: 5, title: "任务特异耐力", stage: "任务迁移",
      objective: "根据最终目标选择一条支线，不再让所有人做相同训练。",
      focus: "从目标任务反推需要的容量、方向与动作技能。",
      daily: "基础训练维持，专项支线只选择跑步、力量或球类中的一条。",
      gate: ["专项基础动作可重复且质量稳定", "没有新增腿部症状", "训练后与次日均恢复"],
      sessions: [
        { name: "基础训练", minutes: "25–30 分钟", items: [item("curlUp", "5 次 × 8 秒"), item("sideBridge", "每侧 3 次 × 8 秒"), item("birdDog", "每侧 4 次 × 8 秒"), item("boxSquat", "8 次"), item("farmerCarry", "20–30 米；完成 2–3 轮")] },
        { name: "跑步支线", goal: "run", minutes: "20–30 分钟", items: [item("intervalWalk", "快走区间 20–30 分钟"), item("singleLeg", "每侧 3 组 × 20–30 秒"), item("stepUp", "每侧 3 组 × 6 次")] },
        { name: "力量／搬重支线", goal: "strength", minutes: "25–30 分钟", items: [item("loadedHinge", "3 组 × 6 次"), item("boxSquat", "3 组 × 6 次"), item("farmerCarry", "4 组 × 20 米")] },
        { name: "球类／旋转支线", goal: "rotation", minutes: "20–28 分钟", items: [item("sideBridge", "优先保留合格版本"), item("suitcaseCarry", "轻量、每侧 3 组"), item("rotationSkill", "髋肩分离每侧 2 组 × 5 次"), item("sportSkill", "侧向步法每侧 3 组 × 4 次")] }
      ]
    },
    {
      week: 10, cycle: 5, title: "耐力资格周", stage: "任务迁移",
      objective: "确认拥有进入力量训练所需的基础容量；本周不冲量。",
      focus: "复测真实生活任务，并观察叠加后的 24 小时反应。",
      daily: "没有通过者继续第 7–9 周对应短板，不强行进入力量期。",
      gate: ["过去 7 天无明显反跳", "髋铰链、深蹲、携行与 Big Three 质量合格", "日常生活后仍有容量余量", "训练后 24 小时无升级"],
      sessions: [
        { name: "基础复测", minutes: "25–35 分钟", items: [item("curlUp", "当前 Big Three 5/3/1"), item("sideBridge", "每侧 5/3/1"), item("birdDog", "每侧 5/3/1"), item("hinge", "10 次"), item("boxSquat", "10 次"), item("suitcaseCarry", "每侧 3 组 × 20 米"), item("walk", "个人稳定时长")] },
        { name: "生活任务模拟", minutes: "20–30 分钟", items: [item("taskPractice", "从起床、穿鞋、坐站、拾取、推拉、携行、台阶中选 3–4 项")] },
        { name: "轻量维护", minutes: "12–18 分钟", items: [item("curlUp", "Big Three 3/2/1"), item("sideBridge", "每侧 3/2/1"), item("birdDog", "每侧 3/2/1"), item("walk", "轻松短区间")] }
      ]
    },
    {
      week: 11, cycle: 6, title: "基础力量重建", stage: "力量资格",
      objective: "通过硬门槛后，在稳定与耐力基础上加入可控外部负荷。",
      focus: "强度不是重点，负荷路径与建立刚度的时机才是重点。",
      warning: "仍有明显疼痛、近期反跳、腿部症状变化或耐力不稳定时，不开始负重力量。",
      daily: "力量日之间保留恢复；不要同时增加重量与总量。",
      gate: ["每次重复路径一致", "负荷贴身且无局部腰椎铰链", "次日反应良好"],
      sessions: [
        { name: "力量 A", minutes: "30–38 分钟", items: [item("gobletSquat", "3 组 × 6 次，RPE 5/10"), item("row", "3 组 × 8 次"), item("farmerCarry", "3 组 × 20–30 米"), item("curlUp", "3/2/1 维护"), item("sideBridge", "每侧 3/2/1")] },
        { name: "维护日", minutes: "22–30 分钟", items: [item("birdDog", "每侧 5/3/1"), item("hinge", "2 组 × 8 次"), item("cardio", "20–30 分钟")] },
        { name: "力量 B", minutes: "30–38 分钟", items: [item("loadedHinge", "3 组 × 6 次，RPE 5/10"), item("splitSquat", "每侧 3 组 × 6 次"), item("push", "3 组 × 6–8 次"), item("suitcaseCarry", "每侧 3 组 × 20 米")] }
      ]
    },
    {
      week: 12, cycle: 6, title: "单侧力量与抗旋转", stage: "力量资格",
      objective: "提升真实生活与运动所需的不对称负荷能力。",
      focus: "侧桥与行李箱携行优先；Pallof 不是通用必做进阶。",
      daily: "若第 11 周全部通过，只给一个主要动作小幅加负荷。",
      gate: ["左右差异可控", "单侧负荷无明显侧倾或骨盆旋转", "主观用力不超过 7/10"],
      sessions: [
        { name: "力量 A", minutes: "30–38 分钟", items: [item("gobletSquat", "3 组 × 6–8 次"), item("row", "单臂支撑，每侧 3 组 × 8 次"), item("suitcaseCarry", "每侧 4 组 × 20 米"), item("sideBridge", "每侧 3/2/1")] },
        { name: "维护日", minutes: "25–32 分钟", items: [item("curlUp", "3/2/1"), item("birdDog", "每侧 5/3/1"), item("sideBridge", "耐受版本；不默认改 Pallof"), item("cardio", "20–30 分钟")] },
        { name: "力量 B", minutes: "30–38 分钟", items: [item("loadedHinge", "3 组 × 6–8 次"), item("splitSquat", "每侧 3 组 × 6 次"), item("push", "3 组 × 8 次"), item("farmerCarry", "3 组 × 30 米")] }
      ]
    },
    {
      week: 13, cycle: 7, title: "力量资格与专项入口", stage: "表现准备",
      objective: "把基础力量、躯干耐力与目标运动需求接起来。",
      focus: "不做最大力量测试；先说清目标任务的负荷、速度、方向、冲击与疲劳。",
      daily: "对回归动作仍明显恐惧时，继续低速暴露。",
      gate: ["无近期反跳或进行性腿部症状", "目标动作在可控负荷下无腰椎泄漏", "训练与生活叠加后次日稳定", "能说明目标运动需求"],
      sessions: [
        { name: "力量 A", minutes: "35–42 分钟", items: [item("gobletSquat", "3 组 × 5–6 次，RPE 6/10"), item("loadedHinge", "3 组 × 5–6 次"), item("push", "3 组 × 6–8 次"), item("row", "3 组 × 6–8 次"), item("farmerCarry", "3 组 × 30 米")] },
        { name: "技术与容量", minutes: "25–35 分钟", items: [item("curlUp", "Big Three 3/2/1 维护"), item("sideBridge", "每侧 3/2/1"), item("birdDog", "每侧 3/2/1"), item("sportSkill", "10–20 分钟"), item("cardio", "15–25 分钟")] },
        { name: "力量 B", minutes: "30–40 分钟", items: [item("splitSquat", "每侧 3 组 × 6 次"), item("row", "单侧每侧 3 组 × 8 次"), item("sideBridge", "抗旋转选择，每侧 3 组"), item("suitcaseCarry", "每侧 3 组 × 20–30 米")] }
      ]
    },
    {
      week: 14, cycle: 7, title: "速度或冲击入门", stage: "表现准备",
      objective: "在负荷与总量不增加的前提下，单独加入速度、冲击或专项节奏。",
      focus: "动作质量稳定后才给速度绿灯。",
      daily: "两次专项暴露之间留足恢复，不同时加速度和距离。",
      gate: ["加入速度或冲击后动作质量不变", "症状不扩散", "当晚睡眠与次日状态稳定"],
      sessions: [
        { name: "力量维护", minutes: "30–38 分钟", items: [item("gobletSquat", "2–3 组 × 5–6 次"), item("loadedHinge", "2–3 组 × 5–6 次"), item("push", "2–3 组 × 6–8 次"), item("farmerCarry", "3 组 × 20–30 米"), item("sideBridge", "Big Three 3/2/1 维护")] },
        { name: "跑步支线", goal: "run", minutes: "20–28 分钟", items: [item("runWalk", "快走 2 分钟＋轻松跑 1 分钟，共 6 轮")] },
        { name: "力量回归支线", goal: "strength", minutes: "25–35 分钟", items: [item("gobletSquat", "目标动作 1–2 项，轻松负荷 3 组 × 5 次，RPE 5–6") , item("loadedHinge", "只在已选目标动作时完成")] },
        { name: "球类／旋转支线", goal: "rotation", minutes: "22–30 分钟", items: [item("sportSkill", "计划性脚步每方向 3 组 × 4 次"), item("rotationSkill", "影子练习每侧 3 组 × 5 次；20 秒 × 6 组")] }
      ]
    },
    {
      week: 15, cycle: 8, title: "疲劳与复杂度", stage: "速度／功率",
      objective: "逐步加入疲劳、方向变化与任务组合，同时保持亚最大强度。",
      focus: "专项增加时，力量维护不再同时加重量。",
      daily: "若第 14 周只是勉强通过，原方案不升级。",
      gate: ["可控疲劳下动作仍稳定", "不靠憋气和全身僵硬锁住动作", "训练后 24 小时无反跳"],
      sessions: [
        { name: "力量维护", minutes: "30–38 分钟", items: [item("gobletSquat", "维持第 14 周负荷与总量"), item("loadedHinge", "维持"), item("row", "维持"), item("farmerCarry", "维持")] },
        { name: "跑步支线", goal: "run", minutes: "22–32 分钟", items: [item("runWalk", "快走 1 分钟＋轻松跑 2 分钟，6–8 轮")] },
        { name: "力量回归支线", goal: "strength", minutes: "28–36 分钟", items: [item("gobletSquat", "一个目标动作 RPE 6/10，3 组 × 4–6 次"), item("loadedHinge", "其余动作维持")] },
        { name: "球类／旋转支线", goal: "rotation", minutes: "25–35 分钟", items: [item("rotationSkill", "60%–70% 主观速度，20–30 秒 × 6–8 组"), item("sportSkill", "只增加一个方向或决策变量")] }
      ]
    },
    {
      week: 16, cycle: 8, title: "回归运动门与长期计划", stage: "速度／功率",
      objective: "完成分级模拟，决定限制参与、逐步完整训练或继续构建能力。",
      focus: "第 16 周不是自动获得无限制参赛资格。",
      daily: "先恢复训练频率，再恢复单次总量，最后才恢复高强度。",
      gate: ["疼痛低且 7 天趋势稳定", "无新发或加重的放射、麻木、无力", "接近真实速度与合理疲劳下质量稳定", "两次专项训练之间正常恢复", "高风险人群已获专业许可"],
      sessions: [
        { name: "力量维护", minutes: "30–40 分钟", items: [item("gobletSquat", "2–3 组 × 4–6 次"), item("loadedHinge", "2–3 组 × 4–6 次"), item("push", "2–3 组 × 6–8 次"), item("row", "2–3 组 × 6–8 次"), item("suitcaseCarry", "3 组"), item("sideBridge", "Big Three 选 1–2 项维护")] },
        { name: "跑步支线", goal: "run", minutes: "24–35 分钟", items: [item("runWalk", "快走 1 分钟＋轻松跑 3 分钟，共 6 轮；或合格后连续 15–20 分钟")] },
        { name: "力量回归支线", goal: "strength", minutes: "30–40 分钟", items: [item("gobletSquat", "目标动作 RPE 6–7/10，3 组 × 3–5 次，保留 2–3 次余力"), item("loadedHinge", "仅按目标选择")] },
        { name: "球类／旋转支线", goal: "rotation", minutes: "28–40 分钟", items: [item("rotationSkill", "70%–80% 主观速度，先技术后限制对抗"), item("sportSkill", "完整训练前至少两次亚最大训练且次日稳定")] }
      ]
    }
  ];

  const cycles = [
    { id: 1, weeks: "1–2", title: "保护窗口", short: "识别触发，建立正向斜率" },
    { id: 2, weeks: "3–4", title: "动作工具", short: "把疼痛触发从日常动作中设计掉" },
    { id: 3, weeks: "5–6", title: "战略稳定", short: "稳定、呼吸与髋驱动整合" },
    { id: 4, weeks: "7–8", title: "耐力", short: "在疲劳前保持动作质量" },
    { id: 5, weeks: "9–10", title: "任务迁移", short: "从目标任务反推容量" },
    { id: 6, weeks: "11–12", title: "力量资格", short: "通过硬门槛后再增加负荷" },
    { id: 7, weeks: "13–14", title: "表现准备", short: "低速专项与速度入口" },
    { id: 8, weeks: "15–16", title: "回归运动", short: "疲劳、复杂度与分级回归" }
  ];

  const redFlags = [
    { id: "bladder", label: "新出现大小便控制改变或排尿启动困难", urgent: true },
    { id: "saddle", label: "会阴、肛周或大腿内侧马鞍区麻木", urgent: true },
    { id: "weakness", label: "新发或进行性腿／足无力、足下垂或双腿症状", urgent: true },
    { id: "trauma", label: "严重外伤后腰痛，或骨质疏松风险下的新痛", urgent: false },
    { id: "systemic", label: "伴发热、寒战、明显全身不适，或肿瘤／感染风险", urgent: false },
    { id: "night", label: "症状快速恶化，或进行性夜间痛且改变体位不能缓解", urgent: false }
  ];

  window.REHAB_DATA = { exercises, weeks, cycles, redFlags };
})();
