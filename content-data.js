(() => {
  const dose = (standard, reduced, minimum) => ({ standard, reduced, minimum });
  const planItem = (id, doses, why) => ({ id, doses, why });

  const stages = [
    {
      id: "protect",
      order: 1,
      name: "保护窗口",
      label: "症状敏感期",
      courseWeeks: "参考第 1–2 周",
      minutes: { standard: "12–18 分钟", reduced: "8–12 分钟", minimum: "5–8 分钟" },
      purpose: "减少反复致痛暴露，同时保留安全、可耐受的活动。",
      reason: "当日常动作或次日反应还容易被激惹时，先找出触发组合，比急着练强更重要。",
      plan: [
        planItem("breathing", dose("2 轮 × 5 次呼吸", "1 轮 × 5 次呼吸", "3 次舒适呼吸"), "帮助放下不必要的保护性紧张，同时观察呼吸是否顺畅。"),
        planItem("catCamel", dose("耐受时 7–8 个温和循环", "耐受时 4–5 个小幅循环", "不确定时跳过"), "用低负荷小范围活动观察耐受；它不是必须动作。"),
        planItem("brace", dose("3 组 × 5 秒", "2 组 × 3–5 秒", "1 组 × 3 秒"), "练习任务所需的轻度支撑，而不是全天僵硬。"),
        planItem("logRoll", dose("每侧 3 次", "每侧 2 次", "选择更舒服一侧 1 次"), "把起床从反复屈曲改成可控的整体移动。"),
        planItem("walk", dose("{walk} 分钟，可拆分", "{walkReduced} 分钟，可拆分", "2–3 分钟或更短"), "在症状明显上升前结束，用小剂量保留活动。")
      ],
      gates: ["连续 3 个不同日期的记录显示训练后与次日接近基线", "能说出至少 1–2 个常见触发组合和替代做法", "基本起床、坐站与短步行没有新增腿部症状"],
      microTasks: ["今天选一个最常见触发：久坐、起床或搬物，只改变一个变量。", "把一次长步行拆成两个短区间，比较当晚和次日反应。", "起床时练习侧翻与手臂支撑，不追求速度。"]
    },
    {
      id: "foundation",
      order: 2,
      name: "基础能力",
      label: "动作与躯干控制",
      courseWeeks: "参考第 3–6 周",
      minutes: { standard: "18–24 分钟", reduced: "12–18 分钟", minimum: "7–10 分钟" },
      purpose: "建立可呼吸的躯干控制，并把动作更多交给髋和四肢。",
      reason: "症状开始稳定，但坐站、弯腰或基础练习还需要更清楚的动作工具。",
      plan: [
        planItem("catCamel", dose("耐受时 7–8 个温和循环", "耐受时 4–5 个循环", "可跳过"), "温和活动，不把末端范围当目标。"),
        planItem("curlUp", dose("3/2/1，每次 6–8 秒", "2/1/1，每次 5–6 秒", "只做腹部支撑 3 × 3 秒"), "建立前侧耐力，避免把它做成仰卧起坐。"),
        planItem("wallSide", dose("每侧 3/2/1，每次 6–8 秒", "每侧 2/1/1，每次 5 秒", "每侧 2 × 3 秒"), "用短杠杆练侧向控制。"),
        planItem("birdDogEasy", dose("每侧 3/2/1，每次 6–8 秒", "每侧 2/1/1，每次 5 秒", "单肢或滑腿，每侧 2 次"), "在四肢移动时保持骨盆与腰部稳定。"),
        planItem("stickHinge", dose("2 组 × 6 次", "1–2 组 × 4 次", "臀部触墙 3 次"), "建立髋驱动与三点对齐。"),
        planItem("walk", dose("{walk} 分钟，可拆分", "{walkReduced} 分钟，可拆分", "2–4 分钟"), "把稳定能力带回轻松步行。")
      ],
      gates: ["侧翻起床、扶持坐站与木棍髋铰链可控", "基础动作中能呼吸，没有明显塌腰、旋转或屏气", "计划剂量与日常生活叠加后次日稳定"],
      microTasks: ["从穿鞋、洗漱、开门中选一个任务，只用一个动作口令。", "工作中安排一次 2 分钟换姿势，不需要追求完美坐姿。", "拿起轻物前先让物体靠近身体，再决定是否需要屈髋屈膝。"]
    },
    {
      id: "life",
      order: 3,
      name: "回归生活",
      label: "耐力与日常任务",
      courseWeeks: "参考第 7–10 周",
      minutes: { standard: "24–32 分钟", reduced: "16–22 分钟", minimum: "10–14 分钟" },
      purpose: "把基础控制迁移到步行、坐站、台阶、携行和真实家务。",
      reason: "基础动作已可控，下一步是让日常容量增长，而不是追求更难的动作外形。",
      plan: [
        planItem("curlUp", dose("5/3/1，每次 8 秒", "3/2/1，每次 6 秒", "2/1/1，每次 5 秒"), "维持不疲劳的躯干耐力。"),
        planItem("sideBridge", dose("每侧 3/2/1，每次 8 秒", "墙面或屈膝 3/2/1", "墙面每侧 2 × 5 秒"), "侧向稳定优先保持可控版本。"),
        planItem("birdDog", dose("每侧 4/2/1，每次 8 秒", "单肢或对侧 3/2/1", "单肢每侧 2 次"), "四肢移动中保持躯干控制。"),
        planItem("boxSquat", dose("高箱 3 组 × 6 次", "高箱 2 组 × 5 次", "扶持坐站 1 组 × 5 次"), "把髋膝协同带回坐站和下蹲任务。"),
        planItem("carryHug", dose("3 组 × 20–30 秒", "2 组 × 15–20 秒", "空手姿势走 2 × 15 秒"), "练习物体贴身与行走时的自然呼吸。"),
        planItem("intervalWalk", dose("快走 3 分钟＋慢走 2 分钟，3 轮", "快走 2 分钟＋慢走 2 分钟，2 轮", "轻松走 3–5 分钟"), "用工作—恢复区间逐步扩展步行容量。")
      ],
      gates: ["真实任务重复时动作质量没有明显下降", "步行、坐站、台阶或轻携行达到个人生活目标", "过去 7 天无明显反跳，完成日常后仍有容量余量"],
      microTasks: ["今天模拟一次真实任务：购物袋、洗衣篮或上下台阶，选择轻量版本。", "把最久的一段久坐拆开一次，记录改变姿势后的感受。", "选择一次轻松步行，以能自然对话的速度结束。"]
    },
    {
      id: "capacity",
      order: 4,
      name: "重建容量",
      label: "可控负荷与专项入口",
      courseWeeks: "参考第 11–13 周",
      minutes: { standard: "30–40 分钟", reduced: "20–28 分钟", minimum: "12–18 分钟" },
      purpose: "在动作与耐力合格后，恢复可控的推、拉、下蹲、提拉与携行。",
      reason: "生活功能稳定且次日反应可预测，才适合用外部负荷重建容量。",
      warning: "仍处于明显疼痛、近期反跳或腿部症状变化时，不进入负重训练。",
      plan: [
        planItem("gobletSquat", dose("3 组 × 6 次，RPE 5–6", "2 组 × 5 次，减轻负荷", "徒手高箱 1 组 × 5 次"), "用贴近身体的轻负荷练下肢发力。"),
        planItem("loadedHinge", dose("高位 3 组 × 6 次，RPE 5–6", "高位 2 组 × 5 次，减轻负荷", "徒手髋铰链 1 组 × 5 次"), "练习负荷路径，不做最大重量测试。"),
        planItem("row", dose("3 组 × 8 次", "2 组 × 6 次，减阻力", "站姿拉肩胛 1 组 × 5 次"), "让躯干在拉力中保持可呼吸的控制。"),
        planItem("farmerCarry", dose("3 组 × 20–30 米", "2 组 × 15–20 米，减重", "双手前抱轻物 2 × 15 秒"), "恢复搬运能力，同时观察疲劳后的姿势。"),
        planItem("birdDog", dose("每侧 3/2/1 维护", "每侧 2/1/1", "单肢每侧 2 次"), "保留基础动作作为质量基线。")
      ],
      gates: ["深蹲、髋铰链、推拉与携行的重复路径一致", "单侧或外部负荷下无明显侧倾、骨盆旋转或屏气", "训练与生活叠加后 24 小时稳定，主观用力仍有余量"],
      microTasks: ["今天搬一个轻物：先靠近身体，再建立刚度，放下后恢复呼吸。", "列出目标任务最重要的一个变量：重量、速度、距离或方向。", "在一次训练中只调整一个变量，其他全部维持。"]
    },
    {
      id: "performance",
      order: 5,
      name: "运动准备",
      label: "速度、复杂度与回归",
      courseWeeks: "参考第 14–16 周",
      minutes: { standard: "30–45 分钟", reduced: "22–32 分钟", minimum: "15–20 分钟" },
      purpose: "在基础容量之上，分级加入速度、方向、冲击、疲劳与专项任务。",
      reason: "回归运动取决于目标需求和延迟反应，不取决于完成了多少周。",
      warning: "高风险、对抗、重竞技或真实术后人群需要医生、康复师或专项教练许可。",
      plan: [
        planItem("gobletSquat", dose("维护 2–3 组 × 5 次", "维护 2 组 × 4 次", "徒手 1 组 × 5 次"), "保留基础力量，不在专项增加时同时加重量。"),
        planItem("loadedHinge", dose("维护 2–3 组 × 5 次", "维护 2 组 × 4 次", "徒手髋铰链 1 组 × 5 次"), "维持髋驱动与负荷路径。"),
        planItem("sportSkill", dose("低速专项 6 × 20 秒", "低速专项 4 × 15 秒", "影子练习 3 × 10 秒"), "一次只加入速度、方向或复杂度中的一个。"),
        planItem("suitcaseCarry", dose("每侧 3 组 × 20 米", "每侧 2 组 × 15 米，减重", "双侧轻携行 2 × 15 米"), "在不对称负荷下保持呼吸与步态。"),
        planItem("cardio", dose("轻中强度 20–30 分钟", "轻强度 12–20 分钟", "轻松活动 8–10 分钟"), "支持目标运动需要的基础有氧容量。")
      ],
      gates: ["接近目标速度与合理疲劳下动作仍稳定", "两次专项训练之间可恢复，次日无明显恶化", "已恢复目标所需的基础有氧、力量与信心", "高风险参与已获得相应专业许可"],
      microTasks: ["把目标运动拆成速度、负荷、方向、冲击、疲劳五项，只选一项练习。", "结束时保留余量，记录停止得及时，而不是完成得多。", "安排一次亚最大专项练习，并给次日反应留出观察窗口。"]
    }
  ];

  const exerciseDetails = {
    breathing: { setup: "仰卧屈膝、侧卧或舒适坐姿，肩颈放松。", steps: ["把双手放在下肋两侧。", "鼻吸气，让下肋向两侧扩张。", "缓慢呼气，腹部只保留轻度张力。"], breathing: "全程自然呼吸，不追求吸得很满。", selfCheck: "肩膀没有耸起，腰背没有被用力压平。", visual: "breath" },
    catCamel: { setup: "四点支撑，手在肩下、膝在髋下；也可站姿扶桌。", steps: ["先找到舒服的中间位置。", "缓慢向一个方向移动，只到轻微活动感。", "再缓慢返回并向另一方向移动，不在末端停留。"], breathing: "移动时正常呼吸，不屏气。", selfCheck: "每次幅度相近，没有复制熟悉痛。", visual: "crawl" },
    brace: { setup: "仰卧屈膝或站立，脊柱处于自然舒适位置。", steps: ["想象有人要轻碰腹部。", "腹壁周围均匀收紧约两三成。", "保持几秒后完全放松。"], breathing: "支撑中仍能说短句或完成一次呼气。", selfCheck: "没有吸肚子、抬胸或夹臀。", visual: "breath" },
    logRoll: { setup: "仰卧在床上，屈膝，床边留出空间。", steps: ["肩与骨盆一起转向侧卧。", "小腿移到床外。", "手臂推床，同时让双腿重量帮助坐起。"], breathing: "起身时缓慢呼气，不憋气猛冲。", selfCheck: "肩与骨盆没有反向扭转。", visual: "roll" },
    stickHinge: { setup: "站立，木棍沿后脑、胸背和骶骨形成三点接触。", steps: ["双脚稳定，膝微屈。", "臀部向后移动，躯干整体前倾。", "到三点仍接触的位置后，用髋部回到站立。"], breathing: "下去时吸气准备，起身时自然呼气。", selfCheck: "三点持续接触，动作来自髋部。", visual: "hinge" },
    wallHinge: { setup: "背对墙站约半步，双脚与髋同宽。", steps: ["膝盖轻微放松。", "臀部向后寻找墙面。", "轻触墙后用髋部回到站立。"], breathing: "保持自然呼吸，不在触墙时屏气。", selfCheck: "不是蹲下，也没有用腰部向后顶。", visual: "hinge" },
    hinge: { setup: "站稳，双手可放在髋沟，脊柱保持自然。", steps: ["臀部先向后。", "躯干作为整体前倾，重量留在全脚掌。", "髋部向前回到站立。"], breathing: "动作前轻吸气，起身阶段缓慢呼气。", selfCheck: "腰部没有局部折叠，脚跟没有离地。", visual: "hinge" },
    loadedHinge: { setup: "把轻负荷放在高台上，站近物体，双脚稳定。", steps: ["先髋铰链接近负荷。", "让负荷贴近身体，建立适量支撑。", "用髋腿站起，再按原路径放回。"], breathing: "轻负荷下避免长时间闭气；完成后及时恢复呼吸。", selfCheck: "物体路径贴身，起身时肩髋同步。", visual: "hinge" },
    sitStand: { setup: "选择较高、稳定的椅子，双脚踩稳，可用扶手。", steps: ["身体整体向前，让重心到脚上。", "用髋膝站起。", "臀部向后，控制坐回。"], breathing: "站起时呼气，坐回时吸气。", selfCheck: "膝盖与脚尖大致同向，腰部没有猛弯。", visual: "squat" },
    boxSquat: { setup: "身后放稳定高箱或椅子，双脚选择舒服宽度。", steps: ["髋膝同时开始，臀部向后下方移动。", "轻触箱面，不完全松掉身体。", "脚掌推地回到站立。"], breathing: "下蹲前吸气准备，站起时呼气。", selfCheck: "在腰部折叠或骨盆翻卷前结束深度。", visual: "squat" },
    gobletSquat: { setup: "双手把轻负荷贴近胸口，身后保留高箱。", steps: ["先建立轻度支撑。", "髋膝协同下蹲到合格深度。", "脚掌推地站起，负荷始终贴身。"], breathing: "每次重复之间恢复呼吸，不用一次憋完整组。", selfCheck: "负荷没有把身体拉向前，最后一次与第一次相似。", visual: "squat" },
    curlUp: { setup: "仰卧，一膝屈曲、一腿伸直，双手支撑自然腰弧。", steps: ["轻度支撑腹部。", "头、颈和上胸作为整体微微离地。", "保持计划时间后平稳放下。"], breathing: "保持时继续浅而自然的呼吸。", selfCheck: "腰弧没有压平，下巴没有猛收。", visual: "curl" },
    wallSide: { setup: "侧对墙站立，前臂撑墙，双脚离墙适当距离。", steps: ["肋骨与骨盆对齐。", "前臂轻推墙面，让身体保持一条线。", "保持后放松，再换侧。"], breathing: "保持时至少完成一次顺畅呼气。", selfCheck: "没有耸肩、塌腰或身体旋转。", visual: "side" },
    sideBridge: { setup: "侧卧，以前臂和屈膝支撑；肩不耐受时使用墙面版本。", steps: ["让肩、肋骨与骨盆对齐。", "抬起骨盆形成一条线。", "保持计划时间后平稳放下。"], breathing: "不要靠闭气撑住。", selfCheck: "骨盆没有向前后翻，肩部无疼痛。", visual: "side" },
    birdDogEasy: { setup: "四点支撑，手在肩下、膝在髋下，地面防滑。", steps: ["先建立轻度腹部支撑。", "只抬一只手，或让一条腿沿地面向后滑。", "骨盆不动地返回，再换侧。"], breathing: "移动时呼气，返回时吸气。", selfCheck: "腰部没有下塌，身体没有明显摇晃。", visual: "crawl" },
    birdDog: { setup: "四点支撑，找到骨盆水平、腰背自然的位置。", steps: ["轻度支撑后，脚跟向后推。", "伸出对侧手臂，手脚不必高过身体。", "保持后回到四点支撑，再换侧。"], breathing: "保持时自然呼吸，不追求长时间。", selfCheck: "骨盆像托着一杯水，腰部没有过伸。", visual: "crawl" },
    carryHug: { setup: "选择轻且好拿的物体，双手把它贴近胸腹。", steps: ["站稳后建立与重量匹配的轻度支撑。", "自然迈步，保持物体贴身。", "在姿势变化前结束并安全放下。"], breathing: "走动中持续呼吸，能说短句。", selfCheck: "没有后仰、耸肩或越走越僵。", visual: "carry" },
    farmerCarry: { setup: "两手各拿同等轻负荷，周围留出直线路径。", steps: ["负荷靠近身体两侧。", "自然走动，保持肩膀放松。", "转身用脚步完成，不在腰部猛扭。"], breathing: "全程呼吸，不把携行做成憋气测试。", selfCheck: "身体没有左右摇摆，步幅自然。", visual: "carry" },
    suitcaseCarry: { setup: "单手拿轻负荷，另一手自然摆动，选择平整路线。", steps: ["先站直并找到左右平衡。", "不向任何一侧倾斜地行走。", "到计划距离后换手。"], breathing: "保持连续呼吸。", selfCheck: "肩与骨盆大致水平，步态没有变短或僵硬。", visual: "carry" },
    stepUp: { setup: "选择低而稳定的台阶，旁边有可扶物。", steps: ["整只脚放在台阶上。", "用台阶上的腿把身体带上。", "控制下台，不从腰部向后仰。"], breathing: "上台时呼气，下台时吸气。", selfCheck: "膝盖与脚尖同向，骨盆没有明显歪斜。", visual: "step" },
    splitSquat: { setup: "前后分腿站，扶住稳定物，步距以舒服为准。", steps: ["先找到平衡。", "保持躯干可控，垂直小幅下降。", "用双腿回到起始位置。"], breathing: "下降时吸气，起身时呼气。", selfCheck: "没有前后摇晃或为了深度折叠腰部。", visual: "squat" },
    row: { setup: "使用轻弹力带或器械，双脚稳定，可增加胸部支撑。", steps: ["先让肋骨与骨盆对齐。", "手臂向后拉，肩膀远离耳朵。", "控制回到起点。"], breathing: "拉时呼气，回程吸气。", selfCheck: "躯干没有跟着拉力前后摆动。", visual: "pull" },
    push: { setup: "双手扶墙、台面或器械，选择不会塌腰的高度。", steps: ["身体从头到骨盆保持整体。", "屈肘让身体靠近支撑面。", "推回起始位置。"], breathing: "靠近时吸气，推开时呼气。", selfCheck: "腰部没有下塌，头没有先向前伸。", visual: "push" },
    walk: { setup: "选择平整、可随时返回的路线，记录个人症状阈值。", steps: ["用自然、能对话的速度开始。", "在症状明显上升前结束。", "记录训练后、当晚和次日反应。"], breathing: "保持自然呼吸与放松摆臂。", selfCheck: "没有为了完成时间而改变步态或忍痛。", visual: "walk" },
    intervalWalk: { setup: "选择安全路线或跑步机，先确定快走与慢走时长。", steps: ["完成一段可控快走。", "切换到轻松慢走恢复。", "只在每轮动作与症状稳定时继续。"], breathing: "快走仍应能说简短句子。", selfCheck: "最后一轮步态与第一轮接近。", visual: "walk" },
    singleLeg: { setup: "站在墙或稳固家具旁，赤脚或穿防滑鞋。", steps: ["轻扶支撑物。", "把重量移到一脚，另一脚轻离地。", "在骨盆歪斜或摇晃前放下。"], breathing: "保持呼吸，不用憋气换平衡。", selfCheck: "脚掌三点受力，骨盆大致水平。", visual: "balance" },
    stopTwist: { setup: "双手扶墙形成轻度 plank，双脚可自由转动。", steps: ["先让身体作为一个整体。", "用脚步或脚掌转向。", "肩与骨盆一起改变方向。"], breathing: "转向过程中保持呼吸。", selfCheck: "脚没有钉在原地，腰部没有先扭。", visual: "turn" },
    taskPractice: { setup: "选择一个低风险真实任务和一个动作口令。", steps: ["先说出可能触发的变量。", "只改变距离、姿势、范围或速度中的一个。", "完成后比较症状与动作质量。"], breathing: "负荷阶段轻度支撑，任务结束后恢复自然呼吸。", selfCheck: "没有同时改变多个变量，也没有反复试痛。", visual: "task" },
    cardio: { setup: "选择步行、单车或其他已耐受的低冲击活动。", steps: ["从能对话的轻强度开始。", "在计划时间内观察动作和症状。", "留有余量地结束，记录次日反应。"], breathing: "保持节律呼吸，不做力竭。", selfCheck: "结束后 30 分钟症状接近基线。", visual: "walk" },
    sportSkill: { setup: "把目标运动拆成一个低速、无对抗的技术片段。", steps: ["先按慢速练习路径。", "只加入速度、方向、冲击或复杂度中的一个。", "质量下降前停止。"], breathing: "任务间恢复呼吸，不用全身僵硬锁住动作。", selfCheck: "力量来自髋和脚，腰部没有反复泄漏。", visual: "sport" },
    runWalk: { setup: "在已能稳定快走后，选择平整路线和保守跑走比例。", steps: ["先充分步行热身。", "按计划交替轻松跑与快走。", "跑姿变重、症状扩散或呼吸失控时结束。"], breathing: "维持可控节奏，不追求配速。", selfCheck: "脚步安静自然，下一段开始前已恢复。", visual: "run" },
    rotationSkill: { setup: "使用无负荷或极轻器械，先练计划性脚步与影子动作。", steps: ["脚和髋先改变方向。", "躯干传递力量而不是从腰部甩动。", "低速完成后完全恢复，再做下一次。"], breathing: "动作时短促呼气，间歇恢复自然呼吸。", selfCheck: "肩与骨盆的相对动作可控，没有腰部反复扭转。", visual: "turn" }
  };

  const sharedStop = "出现尖锐痛、电击感、麻木增加、新发无力，或症状向小腿／足部扩散时停止。";
  Object.entries(exerciseDetails).forEach(([id, detail]) => {
    detail.start = detail.start || "先做计划中的最低一档；动作质量不变、训练后与次日稳定，再考虑增加。";
    detail.stop = detail.stop || sharedStop;
  });

  const scenarios = [
    { id: "busy-day", title: "今天事情很多，原定练习做不完，你准备怎样安排？", context: "计划可以适应今天的精力，不需要全有或全无。", options: ["睡前赶完所有练习", "选一个今天能完成的小任务，如看教学卡", "等有整块时间再开始"], answer: 1, feedback: "把任务缩小也算认真参与，今天的安排可以适合今天的精力。", retry: "赶进度容易忽略当下容量；等完整时间也可能让开始变得更难。试试选择一个够小的参与方式。", badge: "会调整" },
    { id: "next-morning", title: "昨天练习后，今早比练习前更痛，日常活动也更费劲了。", context: "一次加重是剂量信息，不等于以后永久不能活动。", options: ["先减量或暂停相关动作并记录；持续加重时咨询专业人员", "按原量硬撑", "以后不再活动"], answer: 0, feedback: "及时调整能让计划更适合你；若出现新的麻木、无力等情况，还应查看就医提示。", retry: "硬撑或完全回避都无法帮你辨认合适剂量。先撤销最近变化、记录反应，再根据走向决定下一步。", badge: "会调整" },
    { id: "desk", title: "坐着处理事情一段时间后，开始觉得不舒服。", context: "这里不设唯一正确姿势，更关注持续暴露和身体反馈。", options: ["始终挺直", "以后一直站着", "调整坐姿，方便时起身或走动"], answer: 2, feedback: "留意身体感受并适时变换姿势，帮助找到更舒服的工作节奏。", retry: "把某一个姿势维持到底，仍然是单一暴露。试试给身体更多姿势和短时活动的选择。", badge: "会调整" },
    { id: "heavy-box", title: "一箱东西超过现在能轻松应付的重量。", context: "调整任务不代表失败，而是在匹配当前容量。", options: ["拆成小份或请人帮助", "咬牙一次搬完", "认定以后不能搬"], answer: 0, feedback: "调整重量、次数或借助帮助，让任务更符合现在的能力。", retry: "一次硬撑与永久回避都是极端选项。可以先改变重量、距离或获得帮助。", badge: "会调整" },
    { id: "restart", title: "漏练几天后，今天想重新开始。", context: "漏掉的练习没有欠账，也无需偿还。", options: ["加倍补完", "看看今天状态，从可应付的小任务接上", "等下周"], answer: 1, feedback: "随时可以重新开始；漏掉的练习无需偿还。", retry: "加倍补课可能让剂量突然升高；等待固定日期会推迟重启。试试从今天能应付的小任务接上。", badge: "再次出发" },
    { id: "unclear-move", title: "动作教学看不懂，你会怎样处理？", context: "暂停并弄明白，也是一次合适的训练决策。", options: ["多做到疲劳再判断", "找网上最难版本照做", "查分步教学或轻量版；仍不确定就暂停并询问专业人员"], answer: 2, feedback: "先弄明白再尝试是有效学习，暂停也可以是今天的合适选择。", retry: "疲劳和更难版本不会让动作自动变清楚。先使用分步教学、轻量版或专业帮助。", badge: "会调整" }
  ];

  const knowledge = [
    { id: "virtual-surgery", category: "理解计划", title: "虚拟手术到底是什么", summary: "一段认真管理致痛暴露的保护窗口，不是真实手术，也不是卧床。", body: ["它把反复触发症状的姿势、动作、负荷和次数暂时降到可耐受范围，为恢复创造条件。", "目标不是让人害怕弯腰或运动，而是先停止不断“试痛”，再用分级活动重建信心和容量。"], source: "本地 McGill 课程转译与 16 周计划", sourceUrl: "" },
    { id: "pain", category: "理解计划", title: "疼痛不等于组织损伤程度", summary: "痛是真实的，但强度不能直接告诉我们损伤多少。", body: ["疼痛会受到组织敏感度、睡眠、压力、期待和活动暴露等多种因素影响。", "这不表示应该忽略痛，而是用症状走向、功能和延迟反应一起决定活动剂量。"], source: "Cambridge University Hospitals 患者教育", sourceUrl: "https://www.cuh.nhs.uk/patient-information/back-pain/" },
    { id: "movement", category: "日常活动", title: "保持活动，不等于硬撑", summary: "选择可耐受的小剂量活动，避免长时间卧床与长期完全回避。", body: ["NICE 建议与专业人员讨论适合自己的运动类型；WHO 将教育和运动列为慢性原发性腰痛管理可考虑的一部分。", "应用里的剂量阈值是产品化起点，不是经过验证的个人处方。"], source: "WHO 2023 与 NICE NG59", sourceUrl: "https://www.nice.org.uk/guidance/ng59/ifp/chapter/Exercise-and-physical-activity" },
    { id: "sitting", category: "日常活动", title: "没有唯一完美坐姿", summary: "比追求一个姿势更重要的是减少单一姿势的持续时间。", body: ["工作中安排短暂走动、站起或换一个舒服姿势。", "当某种坐姿明确复制症状时，短期调整它；随着耐受提高，再逐步扩大选择。"], source: "McGill 课程机制教育与 NHS 活动建议", sourceUrl: "https://www.cuh.nhs.uk/patient-information/back-pain/" },
    { id: "lifting", category: "日常活动", title: "搬物先改变距离", summary: "物体越远，通常越需要更大的力矩；先靠近，再组织动作。", body: ["用髋和膝调整高度，让负荷贴近身体，选择与任务匹配的支撑。", "长期目标不是永远用一种姿势，而是逐步重建多种任务下的能力。"], source: "本地 McGill 课程转译与 NHS 负荷建议", sourceUrl: "https://www.hey.nhs.uk/patient-leaflet/back-pain/" },
    { id: "sleep", category: "恢复习惯", title: "睡眠没有标准姿势或神奇床垫", summary: "选择最舒服、能获得支持的位置，优先建立规律作息。", body: ["可用枕头支持暂时悬空或不舒服的部位，但不需要强迫中立位。", "睡眠差可能提高疼痛敏感与疲劳感；当天训练可据此降量。"], source: "Hull University Teaching Hospitals NHS Trust", sourceUrl: "https://www.hey.nhs.uk/patient-leaflet/back-pain/" },
    { id: "food", category: "恢复习惯", title: "均衡饮食支持一般健康，不是腰痛疗法", summary: "规律进食、足够蛋白质、蔬果与水分可以支持整体恢复。", body: ["没有某种食物或补剂能替代评估、活动管理与循序训练。", "若有肾病、代谢病、孕期或特殊饮食需求，应按医生或营养师建议执行。"], source: "Cambridge University Hospitals 一般健康建议", sourceUrl: "https://www.cuh.nhs.uk/patient-information/back-pain/" },
    { id: "flare", category: "恢复习惯", title: "反跳是调整剂量的信息", summary: "先撤销最近变化，保留可耐受活动，再观察 24–48 小时。", body: ["反跳不清零你的进度，也不需要用更大训练量“追回来”。", "持续恶化、进行性神经症状或红旗出现时，停止自主训练并就医。"], source: "本地 16 周计划安全规则", sourceUrl: "" }
  ];

  const safetyQuestions = [
    { id: "bladder", level: "urgent", label: "新出现排尿困难、不能正常排空，或大小便失控" },
    { id: "saddle", level: "urgent", label: "会阴、生殖器或肛周出现新的麻木或感觉改变" },
    { id: "bothLegs", level: "urgent", label: "双腿同时疼痛、麻木或无力，尤其在快速加重" },
    { id: "weakness", level: "urgent", label: "新发或正在加重的腿／足麻木、无力或足下垂" },
    { id: "trainingWarning", level: "urgent", label: "训练前或训练中报告了新的急症、神经症状或向远端扩散" },
    { id: "sexual", level: "urgent", label: "新出现性功能或生殖器感觉改变，并伴腰背或腿部症状" },
    { id: "chest", level: "urgent", label: "腰背痛同时伴有胸痛" },
    { id: "majorTrauma", level: "urgent", label: "严重事故、车祸或高处跌落后出现腰背痛" },
    { id: "fever", level: "sameDay", label: "发热、寒战或明显全身不适，同时出现腰背痛" },
    { id: "rapid", level: "sameDay", label: "疼痛突然非常严重或正在迅速恶化" },
    { id: "cancer", level: "soon", label: "癌症病史、不明原因体重下降或持续夜间痛" },
    { id: "infection", level: "soon", label: "近期严重感染、免疫抑制，或症状持续影响生活且数周未改善" }
  ];

  const sources = [
    { label: "Stuart McGill 访谈中的 Virtual Surgery 说明", url: "https://www.abmp.com/podcasts/ep-362-mechanisms-back-pain-dr-stuart-mcgill" },
    { label: "BackFitPro 个体评估说明", url: "https://www.backfitpro.com/" },
    { label: "WHO 慢性原发性腰痛非手术管理指南", url: "https://www.who.int/publications-detail-redirect/9789240081789" },
    { label: "NICE NG59 个体化自我管理与活动建议", url: "https://www.nice.org.uk/guidance/NG59/chapter/recommendations" },
    { label: "NHS Back pain", url: "https://www.nhs.uk/conditions/back-pain/" },
    { label: "NHS inform Exercises for back pain", url: "https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/neck-and-back-problems-and-conditions/exercises-for-back-pain/" },
    { label: "Cambridge University Hospitals Back pain", url: "https://www.cuh.nhs.uk/patient-information/back-pain/" },
    { label: "本地 McGill Method 45 节课程整理", url: "" },
    { label: "麦吉尔虚拟手术 16 周完整训练计划", url: "" }
  ];

  window.APP_CONTENT = { stages, exerciseDetails, scenarios, knowledge, safetyQuestions, sources };
})();
