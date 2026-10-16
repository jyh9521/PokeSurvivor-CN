/* Rebuild the published evidence from frozen-source runs; never fabricate dead minutes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/balance-0165');
const names=['final-baseline-waves','final-waves','final-baseline-endgame','final-endgame','final-idle','final-zero','final-holdout','final-baseline-zero'];
const inputs=Object.fromEntries(names.map(n=>[n,JSON.parse(fs.readFileSync(path.join(out,n+'.json'),'utf8'))]));
for(const [name,input]of Object.entries(inputs)){assert.ok(input.sourceSha256&&input.driverSha256,name);for(const r of input.rows)assert.equal(r.error,null,name);}
assert.equal(new Set(Object.values(inputs).map(r=>r.driverSha256)).size,1,'same driving code');
assert.equal(inputs['final-waves'].sourceSha256,inputs['final-endgame'].sourceSha256);
assert.equal(inputs['final-waves'].sourceSha256,inputs['final-idle'].sourceSha256);
assert.equal(inputs['final-waves'].sourceSha256,inputs['final-zero'].sourceSha256);assert.equal(inputs['final-waves'].sourceSha256,inputs['final-holdout'].sourceSha256);assert.equal(inputs['final-baseline-waves'].sourceSha256,inputs['final-baseline-zero'].sourceSha256);
assert.equal(inputs['final-baseline-waves'].sourceSha256,inputs['final-baseline-endgame'].sourceSha256);
const before=inputs['final-baseline-waves'].rows,after=inputs['final-waves'].rows;
const csv=['version,profile,seed,seconds,level,hp,maxHp,enemies,kills,kps,damageDelta,xpSupply,xpPicked,xpGained,xpUnpicked'];
for(const [version,rows]of [['0.16.4',before],['0.16.5',after]])for(const r of rows){let prev=null;for(const m of r.milestones){const dt=prev?m.time-prev.time:0;csv.push([version,r.profile,r.seed,m.time,m.level,m.hp,m.maxHp,m.enemies,m.kills,dt?((m.kills-prev.kills)/dt).toFixed(3):0,prev?(m.damageTaken-prev.damageTaken).toFixed(2):m.damageTaken,m.xpAudit.supply,m.xpAudit.picked,m.xpAudit.gained,m.xpUnpicked].join(','));prev=m;}}
fs.writeFileSync(path.join(root,'docs/data/balance-0165-minutes.csv'),csv.join('\n')+'\n');
const compact=Object.fromEntries(Object.entries(inputs).map(([name,input])=>[name,{...input,rows:input.rows.map(({lifetimes,telemetry,...r})=>r)}]));
fs.writeFileSync(path.join(root,'docs/data/balance-0165-runs.json'),JSON.stringify(compact,null,2)+'\n');
const pct=(xs,q)=>xs.slice().sort((a,b)=>a-b)[Math.ceil(xs.length*q)-1];
const times=r=>r.bosses.filter(b=>b.dead!==null&&b.firstHit!==null).map(b=>b.dead-b.firstHit);
const summary=rows=>['ranged','melee','tank'].map(profile=>{const rs=rows.filter(r=>r.profile===profile),ttks=rs.flatMap(times);return{profile,survived:rs.filter(r=>r.alive).length,cases:rs.length,levels:rs.map(r=>r.levels[0]),kills:rs.map(r=>r.kills),bossKills:rs.flatMap(r=>r.bosses).filter(b=>b.dead!==null).length,bosses:rs.flatMap(r=>r.bosses).length,p95:ttks.length?+pct(ttks,.95).toFixed(2):null,max:ttks.length?+Math.max(...ttks).toFixed(2):null};});
const old=summary(before),now=summary(after),fixedOld=inputs['final-baseline-endgame'].rows,fixedNew=inputs['final-endgame'].rows;
const paired=after.map(r=>{const b=before.find(b=>b.profile===r.profile&&b.seed===r.seed);return`| ${r.profile} | ${r.seed} | ${b.alive?'存活':b.seconds+'秒死亡'} → ${r.alive?'存活':r.seconds+'秒死亡'} | ${b.levels[0]} → ${r.levels[0]} | ${b.kills} → ${r.kills} | ${b.maxCount} → ${r.maxCount} |`;});
const bossRows=after.flatMap(r=>r.bosses.map((b,i)=>{const old=before.find(o=>o.profile===r.profile&&o.seed===r.seed)?.bosses[i];const fmt=x=>x?.dead!=null&&x?.firstHit!=null?(x.dead-x.firstHit).toFixed(2):'未击败/未到达';return`| ${r.profile}/${r.seed} | ${i+1} | ${b.dex} | ${b.hp} | ${fmt(old)} → ${fmt(b)} | ${old?.maxGap?.toFixed(2)??'—'} → ${b.maxGap.toFixed(2)} |`;}));
const visual=JSON.parse(fs.readFileSync(path.join(out,'move-identity-browser.json'),'utf8'));
const report=`# 0.16.5：长局、首领战与剩余14组招式身份

## 结果与边界

基线是 main 的 e39efd7b0252bdb404043836b03ed84a10742395（0.16.4），不是更早的无限精通版本。以下采用相同驾驶代码、种子1/17/101、30Hz、真实生成/AI/伤害/拾取/升级卡与满永久强化。没有中途复活、补级、清敌或重置HP；这是更保守的单初始招式压力驾驶，未使用满永久档实际拥有的第二初始招式和额外重抽；没有裂隙羁绊及特殊能力。开放地形程序驾驶不是人类通关率。

初版驾驶遗漏了实际游戏的“敌人移动后重建网格”和诱饵参与寻敌；本轮先修正测试循环，再让同一个循环运行两个版本。历史报告的旧驾驶成绩没有混作本轮基线。固定构筑实验明确从900秒、Lv45、四项六级被动和合格的进化招式开始，只证明同投入的后半局承压能力，不冒充实际赚取构筑。

| 构筑 | 30分钟存活 | 已击败首领 | 首领TTK P95（完成样本） | 等级（种子1/17/101） |
|---|---|---|---|---|
${now.map((n,i)=>`| ${n.profile} | ${old[i].survived}/3 → ${n.survived}/3 | ${old[i].bossKills}/${old[i].bosses} → ${n.bossKills}/${n.bosses} | ${old[i].p95} → ${n.p95}秒 | ${old[i].levels.join('/')} → ${n.levels.join('/')} |`).join('\n')}

远程固定Lv45后半局实验：${fixedOld.filter(r=>r.alive).length}/3 → ${fixedNew.filter(r=>r.alive).length}/3；独立追加、未用于本轮调参的固定成型留出种子7/29/73有${inputs['final-holdout'].rows.filter(r=>r.alive).length}/3存活。所有失败的实际死亡时间、血量、伤害来源及最后40次受击仍收录在原始数据，不补写死亡后的分钟。常规赚取构筑与这个压力实验分开验收。

## 根因与实际修复

1. **远程有限成长端点不足，而不是经验公式重复计算。** 移除无限精通后，窄型非追踪单发招式的进化伤害仍仅×1.8，同时支付散射、有限穿透和穿透衰减。仅8个符合这个行为的招式将进化端点改为×3.6：ember、water-gun、thunder-shock、sludge、poison-sting、rock-throw、shadow-ball、spirit-shackle。以Ascuas为例，5级进化伤害46.98→93.96，未进化18不变；近战、追踪弹、天然多发、光束的进化倍率不变。非追踪穿透后伤害×0.78→×0.88；追踪仍×0.65、最多一次穿透、仅前0.65秒修正方向。
2. **进化前置被四个被动永久锁住。** 原规则下，主招五级但缺少HP等前置时，如果四个被动槽已经占满，就永远抽不到所需被动；这使部分坦克只能用未进化招式对抗晚期首领。现在增加有代价的“进化前置重修”卡：只在当前主招进化被锁且四被动已满时出现，消耗本次升级奖励和1次已有剩余重抽，放弃指定旧被动全部等级，新被动从1/6开始。四槽和六级上限不变；撤销旧被动自身的倍率及前置计数，不撤销永久强化；HP按原受伤比例调整，不靠重修回满。选择后前置即恢复，不能重放卡片刷属性，重抽耗尽也没有无限重修。
3. **自动瞄准与可反应性存在真实问题。** 近身威胁现在优先于远处首领；普通直射使用最多0.3秒有限提前量，不增加追踪。冲锋原先在0.55秒前摇结束才锁定方向，玩家移动会被末帧追踪；现在在前摇开始就锁定并同步地面路径。预警预算不足则延后冲锋，不执行隐形攻击。预览不造成伤害，也不清除无敌时间。空中跳跃的影子曾提前造成额外身体伤害，现在只由落点预警结算；客机使用状态位64保持相同语义。
4. **持续填充的首领支援导致输出窗口消失。** 原先25%普通怪滴流、召唤补员与事件突发能无限填满支援槽，使低输出角色连续上百秒打不到首领。现在野外首领决斗保留已经存在的敌人，但暂停这三种补员，直到首领结束；不删除敌人。前三位首领HP保留；测得末两位HP相对有限输出的增幅过大，故base HP 9000/16000改为7000/8400，单人实际32076/67500改为24948/35438，伤害、速度与属性保留。野外首领在240～800距离、攻击可用时每6秒至多一次可预警追击跳跃：0.95秒固定落点、最多100距离提前量，不末帧追踪；裂隙/审判不使用这项追击。远距姿态在完成一次招式后转入接近，不把施法时间无限排除在姿态计时之外。野外首领完成8次招式后，每次收招/落地给出2秒金色反击窗口，窗口内承受×5伤害且暂停移动；首7招不触发，裂隙与审判不触发。倍率仅由房主在Enemy.hurt中结算一次，客机状态位128只用于演出。这个有限可见窗口解决低输出构筑只能长期刮痧的问题，玩家仍需躲避尚未消失的落点/弹道并抓住窗口，不是计时自动扣血。普通护盾支援不再反复重填首领/传说/审判者生命比例护盾。下一位野外首领排队、不叠加，延迟生成仍取原计划时刻的属性。裂隙与审判不进入这个决斗抑制分支。
5. **旧晚期吞吐为无限成长设计。** 原波次约9.19/40.18只每秒（10/30分钟），现在最高10只每秒；5分钟以后每90秒提供30秒补给窗口，压力时段缩为18秒，窗口中速率20%。每个窗口每名存活玩家最多一枚可见树果，放在普通拾取范围之外；没有直接回满、没有额外XP、重复帧和重连不重复派发。首领结束另有15秒渐进恢复。普通怪留一个首领预留位，含首领总预算64；召唤不再使用旧CAP+15例外。普通怪生命/伤害/速度曲线与玩家XP门槛、等级输出均保留，首领只改明确列出的两个晚期HP端点。
6. **防御投入的机会与容错。** 新被动总权重仍18，但HP/双防各权重2，恢复/冷却1.5，其余1；双防平等，既有被动权重12不变，没有保证抽到某个技能。非近战普通身体接触在实际防御后封顶30%最大HP；近战仍40%普通接触减伤、22%封顶、0.6秒共享间隔，非近战仍0.45秒。冲锋、落点、光束和纯伤害不套这个普通接触上限。

## 数值与兼容约束

| 字段 | 0.16.4 | 0.16.5 |
|---|---|---|
| 普通怪HP/伤害/速度 | 原时间/物种/人数链 | 不改 |
| 720/900秒单人首领HP | 32076 / 67500 | 24948 / 35438；前三位HP与全部首领伤害/速度不改 |
| 等级基础输出 | 1+0.045×(L-1) | 不改 |
| XP门槛、XP倍率、六级被动总收益 | 既有有限成长规则 | 不改 |
| 8种窄型直射进化倍率 | ×1.8 | ×3.6，只有一个有限端点 |
| 非追踪穿透后倍率 | ×0.78 | ×0.88 |
| 近战普通接触减伤/上限/间隔 | 40% / 22% / 0.6秒 | 不改 |
| 非近战普通接触上限/间隔 | 无上限 / 0.45秒 | 30% / 0.45秒 |
| 野外首领时普通补员 | 25%持续流入，召唤/事件可补员 | 现存敌人保留，三类补员暂缓 |
| 总敌人预算 | 普通64，召唤可到81以上 | 63普通+1首领预留位；总64 |
| 进化前置槽位锁死 | 缺少前置时没有修复路径 | 有限重修，消耗升级奖励+剩余重抽，旧等级全部放弃 |
| 野外首领反击窗口 | 无 | 完成8招后，收招/落地2秒金色窗口承伤×5；房主仅结算一次 |
| 网络协议 | 10 | 11；旧10客户端要求刷新 |
| 账户存档schema、货币、解锁、挑战/排名 | 既有格式 | 不迁移、不重置 |

## 验收门限与防御取舍

攻击型远程/近战：每名首领从首次命中至击败不超过180秒（一次首领排程间隔）。四被动偏防御、未保证物攻/补盲投入的坦克压力对照允许至多240秒，且所有案例都必须击败全部五位；近战3/3、远程和坦克各至少2/3存活30分钟，固定成型远程后半局至少2/3存活；不把高防构筑强制改成同等单体DPS。门限、失败对照与实测全部公开，零永久或固定低等级压力实验不以必通为目标。

## 配对长局原始摘要

| 构筑 | 种子 | 存活 | 等级 | 击杀 | 最大实体数 |
|---|---|---|---|---|---|
${paired.join('\n')}

## 首领TTK与真正命中空窗

TTK从首个实际受击计算；末两位HP按上表校准，其余HP不改。“未击败/未到达”是删失样本，不算成功TTK。

| 构筑/种子 | 序号 | 初始dex | HP | TTK秒 | 最大两次受击间隔秒 |
|---|---|---|---|---|---|
${bossRows.join('\n')}

## 14组招式同质

原检测的同kind/同绘图分支规则未放宽，候选组14→0；36个ID现在走各自的轮廓和时序绘制，不是仅改style标签或颜色。完整ID、属性、状态、轨迹、进化及逐组映射见MOVE_IDENTITY_AUDIT.md和data/move-identity.json。近战伤害/冷却/几何不因视觉改造改变。

Chrome同色、同范围、同quality、三个时刻的33对像素差异全部通过（最少${Math.min(...visual.differences.flatMap(p=>p.pixels))}个不同像素）；总${visual.checks}项。64敌人的300帧局部模拟/战斗/VFX测量P95为${visual.p95.toFixed(3)}ms，不是全地形实际手机帧率。人工两秒盲认不冒充自动验收。

## 可重复验证

在仓库根目录运行；先从基线提交导出独立副本，再用同一工具指向该副本。工具记录源码聚合SHA256与驾驶SHA256，运行中源码变化就失败，避免不同种子读到不同调参版本。

\`\`\`sh
git archive -o artifacts/balance-0165/BASELINE.tar e39efd7b0252bdb404043836b03ed84a10742395
# 将BASELINE.tar解到 artifacts/balance-0165/baseline-source
node tools/measure-wave-growth.cjs artifacts/balance-0165/baseline-source artifacts/balance-0165/final-baseline-waves.json --profiles=ranged,melee,tank --seeds=1,17,101 --strong --seconds=1800
node tools/measure-wave-growth.cjs . artifacts/balance-0165/final-waves.json --profiles=ranged,melee,tank --seeds=1,17,101 --strong --seconds=1800
node tools/measure-wave-growth.cjs artifacts/balance-0165/baseline-source artifacts/balance-0165/final-baseline-endgame.json --profiles=ranged --seeds=1,17,101 --strong --fixed-build --policy=spacing --from=900 --seconds=900
node tools/measure-wave-growth.cjs . artifacts/balance-0165/final-endgame.json --profiles=ranged --seeds=1,17,101 --strong --fixed-build --policy=spacing --from=900 --seconds=900
node tools/measure-wave-growth.cjs . artifacts/balance-0165/final-idle.json --profiles=ranged,melee,tank --seeds=1,17,101 --strong --idle --seconds=180
node tools/measure-wave-growth.cjs . artifacts/balance-0165/final-zero.json --profiles=ranged,melee,tank --seeds=17 --seconds=1800
node tools/measure-wave-growth.cjs . artifacts/balance-0165/final-holdout.json --profiles=ranged --seeds=7,29,73 --strong --fixed-build --policy=spacing --from=900 --seconds=900
node tools/measure-wave-growth.cjs artifacts/balance-0165/baseline-source artifacts/balance-0165/final-baseline-zero.json --profiles=ranged,melee,tank --seeds=17 --seconds=1800
node tools/check-long-balance.cjs
node --test tests/*.test.cjs
node tools/measure-prop-hits.cjs . artifacts/balance-0165/props.json
node tests/growth-balance-browser.cjs
node tests/combat-round2-browser.cjs
node tests/progression-controller-browser.cjs
node tests/special-expansion-browser.cjs
node tests/move-identity-browser.cjs
npm run build
node tests/battle-browser.cjs
# PowerShell: $env:PS_RELAY_ONLY='1'; node tests/battle-browser.cjs
node tests/protected-coop-browser.cjs
node tests/nas-production.cjs
node tools/check-repeat-build.cjs
node tools/summarize-balance-0165.cjs
node tools/verify-balance-0165.cjs
\`\`\`

零永久强化种子17的原版/新版实际死亡与等级也保留在原始JSON；不因失败删样。每分钟的等级、XP供给/拾取/获得/遗留、KPS、实体积压和实损HP见data/balance-0165-minutes.csv。原始每局选择、构筑、首领阶段/受击、死亡来源见data/balance-0165-runs.json。没有把未到达时间补成“稳定30分钟”。

## 验收与尚需人工确认

单元基线262项、新版284项；新增22项回归在旧源码上全部失败，新版完整通过。Chrome成长/重修UI16、近战7、受控手柄20、特殊形态13、视觉41；八浏览器混合直连68、纯中继68；不暴露运行时的生产联机11、NAS/Service Worker55项通过。所有93个常规攻击的场景物品命中通过。新回归在旧源码上确实失败，新源码完整套件结果和隔离回滚原文见本地artifacts/balance-0165/VERIFICATION.txt。构建产物、包哈希和重复构建见RELEASE.json。升级/羁绊/精通/裂隙/特殊能力、键鼠/触摸/模拟手柄、账号双存档/挑战/排名/短断重连继续验证。八浏览器混合直连与纯中继分别测试；八浏览器受控状态用dev.html覆盖完整结算；另有不暴露window.G的生产包双浏览器真实界面联机，以及保护后NAS/Service Worker验证。两种证据分开记录，不把受控源代码测试称作保护后构建测试。

本轮修复了列出的可复现失败路径，不宣称所有物种和随机构筑必通。零永久、固定低等级与克制不利的压力实验保留死亡作为风险信号；普通接触容错不代表免疫首领危险区。真实玩家30分钟体感、实体手机/手柄、公网跨区域延迟及人工招式盲认仍属于人工验收，不用静态或开放地形程序驾驶代替。
`;
fs.writeFileSync(path.join(root,'docs/BALANCE_0165_REPORT.md'),report);
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({before:old,after:now,minuteRows:csv.length-1,sourceSha256:inputs['final-waves'].sourceSha256,driverSha256:inputs['final-waves'].driverSha256},null,2)+'\n');
console.log('PASS BALANCE_0165_REPORT: paired runs, boss censoring, raw choices and '+(csv.length-1)+' genuine minute rows');
