# 0.16.4 战斗经济与构筑回归报告

## 结论与边界

P0/P1/P2代码、回归工具、发布构建均已实施；数值并非照搬任务书。确定性正确性修复通过，不把程序化样本称为“全部已平衡”。原六维、四主动组/四被动槽、融合、联机、裂隙、挑战/排名、特殊形态与30分钟审判保留。原账号存档schema不变；协议10隔离旧战斗客户端。首次审计先行提交，见BALANCE_0164_AUDIT.md；分阶段记录见BALANCE_0164_STAGES.md。

## 变更与根因

| 模块 | 根因/变更 |
|---|---|
| run-growth / moves | 原常规升级无限+6%精通，键只含技能ID。改为实例ID、每招3层×3%、全局6点、权威来源防重放；无资格时保存点数，界面标组和目标。闭包没有证据写错对象，不将玩家反馈全部归咎于闭包。|
| battle / passive definitions | 六级直接套旧公式会翻倍收益、守住间隔为零。线性收益减半，乘法收益开平方，守住11→6秒；封顶快照钳制。|
| levelup / run UI | 四固定栏产生空卡，已有招式强化被大量新招稀释。统一池三张无放回，已有强化权重18、进化40、新主动总权重18、新被动总权重18、已学被动每项12；存在主动时最多两被动。|
| rift / coop | used只在开局重置。成功返回按arena ID重开已消耗周期，从0充能；活跃形态结束后再充，失败/重放不刷新；只接房主奖励。|
| spawner / pickup | 普通XP供给叠加强输出和无限精通形成正反馈。保留xpFor，降低供给；Boss分球ceil额外增发改为精确拆分。|
| combat / projectile / hazards | 远程覆盖无需代价。首击不砍，穿透逐次×0.78，光束后续目标×0.88；追踪只有前0.65秒且最多1次穿透。加入有限、有1.5秒预警、双防照常生效的波次落点和攻击预算。|
| combat / world / player | wave、mark、decoy漏props，chain/turret无敌人找不到物品；陨石忽略物品目标，地雷持续补发使旧雷提前淘汰。补齐同几何物品命中/触发/寻敌；93招全部以实际施法验证。燕返0.8半径落点与全身碰撞冲突，且自动追敌抢方向；改2px全身扫路、玩家方向优先和有限脱困。|
| skill-vfx / telemetry | 多招共绘图分支、只有配色差异；分离9项代表样式。加入本地每秒状态/每30秒实测聚合及JSON/CSV导出。|

## 数值对照

| 项目 | 修改前 | 修改后 |
|---|---|---|
| 被动 | 每项3级，四槽 | 每项6级，仍四槽，满档收益不翻倍 |
| 生命 / 双防满被动 | +60 / +75 | +60 / +75 |
| 冷却 / 磁吸 / 学习满被动 | ×0.92³ / ×1.3³ / ×1.12³ | 相同（每级开平方） |
| 守住 | 10/8/6秒 | 11/10/9/8/7/6秒 |
| 精通 | 每选+6%，无限 | 每层+3%，每招3层，全局6点；只能Boss/裂隙 |
| 等级输出 | 每级4.5% | 保留；不同时削近战 |
| 普通XP供给 | 模板×5.6 | 0～180秒×4.2，180～600秒smoothstep降至×1.4，之后×1.4 |
| xpFor / 永久智慧 | 既有×4门槛 / 最高×1.4 | 不改 |
| 场景压力 | 高输出种子可无伤站桩 | 30秒开始，每24秒明示落点；3～5、12～15、24～27分钟每12秒；12×(1+t/600)特殊伤害，非纯伤害 |
| 攻击预算 | 无统一普通警告/弹幕预算 | 普通预警全局6、局部140范围2；房主创建的敌弹24；访客不独立丢弃权威弹道，不增加怪数 |
| 普通生成 / 生命曲线 | 64目标预算，含既有召唤例外 | 相同；实测总实体仍可能81～82，不虚称64硬上限 |

3.2后期XP候选在满强化喷火龙种子17于16分钟到85级，因过快否决。3.5%等级输出与前19级4%、此后2%候选在三构筑/种子17/600秒实测；样本存在击杀、掉落和选卡反馈分叉，未证明统一减等级输出的净收益，故保留4.5%并先去掉无成本无限精通。候选原始结果见offense35/offense-taper/p1-candidate.json。

不融合的四主动满级进化+四项六级被动需47次升级，即Lv48（3次学习+16次强化+4次进化+24次被动）。融合后可继续学习更多实例，需求更高，不声称所有融合Build应在Lv48完成；无可用成长时提供恢复，不再无限堆属性。

## 实际30分钟窗口成长

三种子、满永久数值强化；表中“存活数”以该时刻仍在模拟为准，已死亡项不补等级。两个版本存活集合可能不同，不能解释为配对因果中位数。30分钟为1799.97秒最后一帧，并非标准模式审判已通关。

| 构筑 | 分钟 | 原存活/3 | 新存活/3 | 原等级中位数 | 新等级中位数 |
|---|---:|---:|---:|---:|---:|
| melee | 0 | 3 | 3 | 1 | 1 |
| melee | 3 | 3 | 3 | 16 | 14 |
| melee | 6 | 3 | 3 | 29 | 28 |
| melee | 10 | 3 | 3 | 39 | 37 |
| melee | 15 | 3 | 3 | 51 | 46 |
| melee | 20 | 2 | 3 | 78 | 52 |
| melee | 25 | 2 | 3 | 87.5 | 57 |
| melee | 30 | 2 | 3 | 94 | 60 |
| ranged | 0 | 3 | 3 | 1 | 1 |
| ranged | 3 | 3 | 3 | 16 | 13 |
| ranged | 6 | 3 | 3 | 33 | 28 |
| ranged | 10 | 3 | 1 | 65 | 45 |
| ranged | 15 | 3 | 1 | 99 | 59 |
| ranged | 20 | 3 | 0 | 124 | — |
| ranged | 25 | 2 | 0 | 161 | — |
| ranged | 30 | 2 | 0 | 192 | — |
| tank | 0 | 3 | 3 | 1 | 1 |
| tank | 3 | 3 | 3 | 16 | 14 |
| tank | 6 | 3 | 3 | 27 | 24 |
| tank | 10 | 3 | 3 | 34 | 34 |
| tank | 15 | 3 | 3 | 44 | 39 |
| tank | 20 | 2 | 1 | 62 | 55 |
| tank | 25 | 2 | 1 | 67 | 59 |
| tank | 30 | 1 | 1 | 92 | 64 |

每分钟零/满强化、经验供给/实际拾取/实际获XP/未拾取、等级、HP、累计击杀和受伤保存在 `artifacts/balance/minute-economy-danger.csv`；死亡以后为空，不做延伸。每秒和30秒KPS/净伤/积压在新波次JSON.telemetry；原始完整choices、Boss首次接战/死亡和未杀死状态全部保留。

## 站桩、远近程与六维

喷火龙原开局种子17完全静止：179.97秒累计受伤107.5；修改后106.97秒受伤105。非所有原种子都可无伤挂机，不能把个例扩成普遍结论。早期0实损记录来自走位驾驶，非静止复现；满永久强化种子17静止原版受伤11.2但恢复至245满血，新版受伤64.1、结束181.1/185生命。必须区分实损、恢复与净损。

五代表物种（大钢蛇208、幸福蛋242、顽皮雷弹101、卡比兽143、壶壶213；覆盖低速高双防）×撞击/波导弹×静止/走位×三种子=60组。相同初始物种/投资/种子/波次；随后XP与选卡可能分叉，不伪称全程固定最终Build。以下是3种子的中位数；KPS来自真实死亡计数/实际存活时间。

| 物种 | 招式 | 静止实损 | 走位实损 | 静止KPS | 走位KPS | 静止存活/3 | 走位存活/3 |
|---|---|---:|---:|---:|---:|---:|---:|
| 208 | tackle | 257.4 | 0 | 2.734 | 1.567 | 2 | 3 |
| 208 | aura-sphere | 123.1 | 0 | 1.539 | 1.439 | 2 | 3 |
| 242 | tackle | 254.2 | 0 | 2.734 | 1.606 | 2 | 3 |
| 242 | aura-sphere | 223.1 | 0 | 1.522 | 1.45 | 3 | 3 |
| 101 | tackle | 321.9 | 0 | 2.734 | 1.484 | 2 | 3 |
| 101 | aura-sphere | 106.4 | 0 | 1.539 | 1.439 | 3 | 3 |
| 143 | tackle | 294.6 | 0 | 2.734 | 1.567 | 2 | 3 |
| 143 | aura-sphere | 237 | 0 | 1.539 | 1.422 | 3 | 3 |
| 213 | tackle | 191.7 | 0 | 2.734 | 1.717 | 2 | 3 |
| 213 | aura-sphere | 178.8 | 0 | 1.539 | 1.45 | 3 | 3 |

60组的静止/移动存活、零伤样本统计见原始matrix-modified.json，不删死亡样本。另有物防/特防100输入、纯伤害、闪避/格挡/护盾的同投资实结算表在matrix-modified.json.defense。高特防不替代物防，高速低防与低速双防保留取舍；恢复可抵消一般伤害不等于未发生伤害。

远程领先近战25%且更少受伤只是专项诊断条件，不是强制剪到等KPS。长期单主动远程样本仍有9～17分钟死亡，防御组也有首领拖长；夹具不使用玩家切组、额外初始主动、羁绊、特殊形态、地图祭坛和裂隙，不据此保证真人胜率。

## 静态与动态保留线

| 场景（各279） | 原击杀/清空 | 新击杀/清空 | 原存活 | 新存活 |
|---|---:|---:|---:|---:|
| moving | 273 | 273 | 279 | 279 |
| surround | 0 | 0 | 33 | 51 |
| boss | 152 | 140 | 271 | 271 |

撞击固定种子1/17/101：追击0.483秒击杀、包围脱身HP58.8、首领10.667秒，与原版相同。静态279组采用旧控靶生命，不冒充实际生成属性；另跑--scaled的837组真实HP（普通1076、Boss16519）。静态保留逐招HTK，敌人等级不读取玩家等级；同一时间同一敌人的生命不会因玩家升级同步膨胀。静态HTK是伤害包计数，DOT/多段需结合技能机制解释。

## P2视觉与观测

全部152定义、93普通伤害招式，以及16组修改前/14组修改后绘图分支疑似同质组见MOVE_IDENTITY_AUDIT.md与docs/data/move-identity.json。9项代表样式已区别；保留共享底层而非粗暴复制93份。真实Canvas接触表与同色组像素差异验证在move-identity-browser.json/png。8项检查，64敌人300帧局部模拟/战斗/VFX耗时另记录；不是整地图FPS或实体目标设备性能。

调试（本地打开dev.html的浏览器控制台；生产保护包不暴露G，不上传NAS）：

```javascript
G.Telemetry.start(G.Game.player); // 从当前实际状态开始采样
G.Telemetry.download(G.Game.player, "json");
G.Telemetry.download(G.Game.player, "csv");
```

JSON记录每招实际伤害/击杀/命中包、XP来源、物理/特殊/纯伤害、格挡/闪避/护盾/恢复、距离/静止/危险区停留、能量/使用次数、精通来源目标和组别。源自本地状态，账户/房间/UID不进导出。每30秒KPS只取真实计数差，不用理论DPS代替。

## 可复现命令

```powershell
node --test tests/*.test.cjs
node tools/measure-combat.cjs . artifacts/balance/static-modified.json
node tools/measure-dynamic-combat.cjs . artifacts/balance/dynamic-modified.json --all
node tools/measure-wave-growth.cjs . artifacts/balance/waves-modified-max.json --profiles=melee,ranged,tank --seeds=1,17,101 --strong --seconds=1800
node tools/measure-wave-growth.cjs . artifacts/balance/waves-modified-zero.json --profiles=melee,ranged,tank --seeds=1,17,101 --seconds=1800
node tools/measure-wave-growth.cjs . artifacts/balance/idle-modified.json --idle --profiles=ranged,melee,tank --seeds=1,17,101 --seconds=180
node tools/measure-wave-growth.cjs . artifacts/balance/waves-modified-party.json --profiles=melee,ranged --seeds=17 --players=4 --strong --seconds=1800
node tools/measure-balance-matrix.cjs . artifacts/balance/matrix-modified.json
node tools/measure-prop-hits.cjs . artifacts/balance/props.json
node tools/audit-move-identity.cjs --baseline artifacts/balance/baseline-source
node tests/growth-balance-browser.cjs
node tests/combat-round2-browser.cjs
node tests/progression-controller-browser.cjs
node tests/battle-browser.cjs
$env:PS_RELAY_ONLY='1'; node tests/battle-browser.cjs; Remove-Item Env:PS_RELAY_ONLY
node tests/special-expansion-browser.cjs
node tests/move-identity-browser.cjs
node tests/coop-rift.test.cjs
npm run build
node tests/nas-production.cjs
node tools/check-repeat-build.cjs
node tools/summarize-balance.cjs
```

基线源由 `git archive 0ce1d685` 提取；测量工具的第一个参数换为基线目录即可使用同一驾驶/统计接口重测。完整复现需要先运行economy-baseline/modified-zero/max四份种子17波次（参数同上，输出相应文件名），再运行汇总工具。

## 验证结果与尚未解决的验收

- 基线246/246，当前262/262单元；10,000次选卡性质、实例归属、来源/总量/单招上限、同名切组/融合、失败/重复裂隙、权威回执与旧快照钳制均覆盖。
- Chrome成长15、近战7、USB输入模拟20、特殊形态13、视觉/局部性能8项通过；八浏览器混合/纯中继各64项，含实际升级暂停、精通消息去重、裂隙返回重充、同一浏览器短断重连、挑战隔离和正常排名结算。物理手柄/手机未冒充验收。
- 生成页面曾因新被动描述缺译使构建失败；补齐中英文描述与页面六级说明后完整重建。旧四栏/无限精通测试按新规则更新，未删除六维、存档、挑战或联机断线测试。
- 最终生产包、重复构建和隔离回滚以artifacts/balance/VERIFICATION.txt的实际日志/退出码为准；NAS命令交付不等于已替用户更新远端。
- 仍待真实玩家30分钟体验、实体手机/手柄与公网跨区验收；剩余14组共享绘图分支需2秒人工盲测。长局远程/坦克的失败样本、超高等级存活子样本、首领拖长和召唤实体超64例外均保留，不宣称全部物种/技能已经同强度。
