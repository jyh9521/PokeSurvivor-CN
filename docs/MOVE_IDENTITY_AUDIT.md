# 全招式机制与视觉身份审计（0.16.5）

生成：`node tools/audit-move-identity.cjs --baseline artifacts/balance-0165/baseline-source`。数据来自真实Moves.ALL、Sprites.actionFor、SkillVFX.style与VFX.forMove；动画示例物种为喷火龙，其他物种按实际动画素材回退。JSON包含射程、弹道、命中函数、状态、冷却和进化效果。不是凭技能名称猜测。

## 疑似同质组与处理

同kind与同一视觉绘图分支的候选组（忽略配色及数值，专门检出换皮风险）；相同底层函数不表示所有数值和范围完全相同。以下ID逐组审阅，保留伤害/冷却/范围差异，避免为去重篡改官方名称或属性。

### 修改前候选组
- `tackle`, `wing-attack`, `body-slam`, `karate-chop`, `metal-claw`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。
- `quick-attack`, `aerial-ace`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。
- `water-gun`, `poison-sting`, `spirit-shackle`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。
- `vine-whip`, `lick`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。
- `razor-leaf`, `bonemerang`, `psycho-cut`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。
- `discharge`, `dazzling-gleam`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。
- `psybeam`, `flash-cannon`, `moongeist-beam`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。
- `bug-bite`, `bite`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。
- `rock-throw`, `bullet-seed`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。
- `spikes`, `toxic-spikes`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。
- `air-slash`, `last-resort`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。
- `leech-seed`, `stealth-rock`, `natures-madness`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。
- `hyper-beam`, `photon-geyser`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。
- `shadow-sneak`, `aqua-jet`, `spectral-thief`：共用施放/同一绘图分支，仅配色与参数未必足以识别，优先比较频率和命中覆盖。

### 本轮高频识别改进

- `water-gun` / `hydro-pump`：水滴短流与双线压力水柱。
- `bubble` / `bubble-beam`：散开气泡团与定向气泡枪。
- `confusion` / `psychic` / `hex`：环绕念珠、向内收束十字、保留诅咒符文；保留各自原命中类别。
- `rock-slide` / `hail` / `meteor-mash`：方岩落石、六向冰晶、菱形金属拖尾，不再一律雨线；原范围/落点规则保持。
- `ice-beam`：连续冰棱，区别高压水柱和普通直线枪流。

### 修改后共享绘图分支的候选组

## 剩余14组本轮处理

- `tackle` → shoulder；`wing-attack` → wings；`body-slam` → body-drop；`karate-chop` → chop-plane；`metal-claw` → metal-talons
- `quick-attack` → speed-lines；`aerial-ace` → aerial-cross
- `water-gun` → water-stream；`poison-sting` → barbed-sting；`spirit-shackle` → shackle-arrow
- `vine-whip` → whip-leaves；`lick` → curl-tongue
- `razor-leaf` → serrated-leaf；`bonemerang` → bone-return；`psycho-cut` → psi-crescent
- `discharge` → electric-burst；`dazzling-gleam` → star-flare
- `psybeam` → sine-prism；`flash-cannon` → metal-rail；`moongeist-beam` → lunar-channel
- `bug-bite` → mandibles；`bite` → closing-fangs
- `rock-throw` → tumble-rock；`bullet-seed` → seed-burst
- `spikes` → ground-spikes；`toxic-spikes` → poison-barbs
- `air-slash` → air-scissors；`last-resort` → final-star
- `leech-seed` → root-seed；`stealth-rock` → orbit-stones；`natures-madness` → guardian-jaws
- `hyper-beam` → horizontal-charge；`photon-geyser` → rising-prism
- `shadow-sneak` → shadow-steps；`aqua-jet` → jet-wake；`spectral-thief` → spectral-hand

全部36个ID改为独立轮廓/展开节奏；不是把style标签换名后仍调用相同绘图分支。旧样式族检测规则保持不变。伤害类别、冷却、范围、碰撞和地形规则保留。

## 浏览器证据

`node tests/move-identity-browser.cjs`输出全部36个ID及旧代表样式的真实Canvas接触表、同色/同半径/同quality/三个时刻的33对逐像素差异和浏览器性能计数。截图在artifacts/balance-0165/move-identity.png。自动化证明代表样式在相同属性下图像不同，不等于真实玩家2秒识别成功；后者必须人工盲测。

## 全部定义

| ID | 中文名称 | 属性/分类 | kind | 施放动画(6) | 样式/弹道 | 射程 | 冷却 | 状态 | 进化 |
|---|---|---|---|---|---|---:|---:|---|---|
| tackle | 撞击 | normal/physical | melee | Attack | shoulder/star | 69 | 0.45 | {"knock":90} | 猛撞 |
| quick-attack | 电光一闪 | normal/physical | dash | Attack | speed-lines/streak | 110 | 0.75 | {"knock":40} | 神速 |
| swords-dance | 剑舞 | normal/status | buff | Charge | impact/star | — | 0.85 | {} | — |
| agility | 高速移动 | normal/status | buff | Charge | impact/star | — | 0.85 | {} | — |
| harden | 变硬 | normal/status | buff | Charge | impact/star | — | 0.85 | {} | — |
| ember | 火花 | fire/special | projectile | Shoot | flame/fire | 496 | 0.52 | {"burn":1} | 大字爆炎 |
| flamethrower | 喷射火焰 | fire/special | cone | Shoot | jet/fire | 159.6 | 0.7 | {"burn":1} | 过热 |
| fire-spin | 火焰旋涡 | fire/special | orbit | Charge | vortex/fire | 62 | 0.3 | {"burn":1} | 神圣之火 |
| heat-wave | 热风 | fire/special | nova | Shoot | heat/fire | 275 | 1.25 | {"burn":1} | 喷火 |
| water-gun | 水枪 | water/special | projectile | Shoot | water-stream/drop | 525 | 0.44 | {} | 热水 |
| bubble | 泡沫 | water/special | nova | Shoot | bubble-cloud/bubble | 273 | 1 | {"slow":0.45} | 冲浪 |
| hydro-pump | 水炮 | water/special | beam | Shoot | pressure-jet/drop | 250 | 1.5 | {} | 加农水炮 |
| aqua-ring | 水流环 | water/status | buff | Charge | wave/drop | — | 0.9 | {} | — |
| vine-whip | 藤鞭 | grass/physical | melee | Attack | whip-leaves/leaf | 115.34 | 0.558 | {"knock":60} | 强力鞭打 |
| razor-leaf | 飞叶快刀 | grass/physical | boomerang | Shoot | serrated-leaf/leaf | 210 | 0.9 | {} | 飞叶风暴 |
| leaf-storm | 落英缤纷 | grass/physical | orbit | Charge | leaves/leaf | 74 | 0.26 | {} | 花瓣舞 |
| giga-drain | 打草结 | grass/special | aura | Charge | vine/leaf | 76 | 0.55 | {} | 疯狂植物 |
| thunder-shock | 电击 | electric/special | projectile | Shoot | fork/bolt | 528 | 0.4 | {} | 打雷 |
| discharge | 放电 | electric/special | aura | Charge | electric-burst/bolt | 70 | 0.45 | {} | 电气场地 |
| thunderbolt | 十万伏特 | electric/special | chain | Shoot | strike/bolt | 140 | 0.95 | {} | 电磁炮 |
| confusion | 念力 | psychic/special | projectile | Shoot | mind-orbs/ring | 616 | 0.58 | {} | 精神冲击 |
| psybeam | 幻象光线 | psychic/special | beam | Shoot | sine-prism/ring | 215 | 1.15 | {} | 预知未来 |
| psychic | 精神强念 | psychic/special | mark | Shoot | mind-crush/ring | 64 | 1.9 | {"slow":0.3} | 精神强念 + |
| sludge | 污泥攻击 | poison/special | projectile | Shoot | glob/blob | 435 | 0.6 | {"poison":1} | 污泥炸弹 |
| mud-shot | 泥巴射击 | ground/special | nova | Shoot | splash/blob | 200 | 1.1 | {"slow":0.4} | 大地之力 |
| gust | 起风 | flying/special | orbit | Charge | feather/wind | 72 | 0.26 | {"knock":40} | 暴风 |
| wing-attack | 翅膀攻击 | flying/physical | melee | Attack | wings/wind | 83.95 | 0.495 | {"knock":70} | 勇鸟猛攻 |
| body-slam | 泰山压顶 | normal/physical | melee | Attack | body-drop/star | 76.7 | 0.855 | {"knock":140} | 终极冲击 |
| hyper-voice | 巨声 | normal/special | nova | Shoot | impact/note | 234 | 1.15 | {} | 吵闹 |
| poison-sting | 毒针 | poison/physical | projectile | Shoot | barbed-sting/needle | 420 | 0.34 | {"poison":1} | 毒击 |
| toxic | 剧毒 | poison/special | trail | Walk | glob/blob | 26 | 0.3 | {"poison":1} | 毒瓦斯 |
| bulldoze | 重踏 | ground/physical | aura | Charge | quake/blob | 80 | 0.7 | {"slow":0.35} | 地震 |
| bug-bite | 虫咬 | bug/physical | melee | Attack | mandibles/needle | 63.25 | 0.378 | {"knock":40} | 十字剪 |
| string-shot | 吐丝 | bug/special | mine | Charge | seed/web | 56 | 1.1 | {"slow":0.6} | 黏黏网 |
| bug-buzz | 虫鸣 | bug/special | aura | Charge | seed/needle | 66 | 0.45 | {} | 虫群 |
| rock-throw | 落石 | rock/physical | projectile | Shoot | tumble-rock/rock | 364 | 0.7 | {"knock":90} | 尖石攻击 |
| rock-slide | 岩崩 | rock/physical | meteor | Charge | boulder-fall/rock | 52.9 | 1.3 | {"knock":50} | 隐形岩 |
| ice-beam | 冰冻光束 | ice/special | beam | Shoot | ice-lance/shard | 220 | 1.1 | {"slow":0.7} | 暴风雪 |
| powder-snow | 细雪 | ice/special | aura | Charge | snow/shard | 76 | 0.55 | {"slow":0.45} | 冰冻之风 |
| karate-chop | 空手劈 | fighting/physical | melee | Attack | chop-plane/ball | 72.45 | 0.45 | {"knock":110} | 近身战 |
| aura-sphere | 波导弹 | fighting/special | projectile | Shoot | impact/ball | 600 | 0.62 | {} | 真气弹 |
| lick | 舌舔 | ghost/physical | melee | Attack | curl-tongue/shadow | 69 | 0.432 | {"slow":0.55} | 暗影拳 |
| shadow-ball | 暗影球 | ghost/special | projectile | Shoot | shadow/shadow | 448 | 0.66 | {} | 潜灵奇袭 |
| dragon-rage | 龙之怒 | dragon/special | beam | Shoot | dragon/fire | 230 | 1 | {} | 流星群 |
| dragon-dance | 龙之舞 | dragon/status | buff | Charge | dragon/fire | — | 0.7 | {} | — |
| fairy-wind | 妖精之风 | fairy/special | nova | Shoot | petals/star | 276 | 1 | {} | 月亮之力 |
| dazzling-gleam | 魔法闪耀 | fairy/special | aura | Charge | star-flare/star | 72 | 0.5 | {} | 薄雾场地 |
| metal-claw | 金属爪 | steel/physical | melee | Attack | metal-talons/shard | 72.45 | 0.45 | {"knock":60} | 铁头 |
| flash-cannon | 加农光炮 | steel/special | beam | Shoot | metal-rail/shard | 220 | 1.05 | {} | 铁蹄光线 |
| bite | 咬住 | dark/physical | melee | Attack | closing-fangs/crescent | 66.7 | 0.405 | {"knock":70} | 咬碎 |
| dark-pulse | 恶之波动 | dark/special | nova | Shoot | ripple/crescent | 264 | 1.15 | {} | 大声咆哮 |
| night-shade | 黑夜魔影 | dark/special | aura | Charge | tendrils/crescent | 72 | 0.5 | {} | 恶梦 |
| bonemerang | 骨头回力镖 | ground/physical | boomerang | Shoot | bone-return/crescent | 230 | 0.95 | {"knock":40} | 骨棒乱打 |
| psycho-cut | 精神利刃 | psychic/physical | boomerang | Shoot | psi-crescent/crescent | 200 | 0.8 | {} | 精神之牙 |
| spikes | 撒菱 | ground/special | mine | Charge | ground-spikes/star | 60 | 1.2 | {} | 地裂 |
| toxic-spikes | 毒菱 | poison/special | mine | Charge | poison-barbs/star | 56 | 1.1 | {"poison":2} | 垃圾射击 |
| hail | 冰雹 | ice/special | meteor | Charge | ice-rain/shard | 46 | 1.2 | {"slow":0.4} | 雪崩 |
| meteor-mash | 彗星拳 | steel/physical | meteor | Charge | metal-fall/rock | 62.1 | 1.4 | {"knock":80} | 磁铁炸弹 |
| will-o-wisp | 鬼火 | fire/special | turret | Charge | wisps/ball | — | 3.5 | {"burn":1} | 炼狱 |
| substitute | 替身 | normal/special | decoy | Shoot | decoy/star | 85 | 6 | {} | 替身 + |
| aerial-ace | 燕返 | flying/physical | dash | Attack | aerial-cross/wind | 120 | 0.75 | {"knock":60} | 杂技 |
| flame-wheel | 火焰轮 | fire/physical | trail | Walk | wheel/fire | 28 | 0.28 | {"burn":1} | 闪焰冲锋 |
| bubble-beam | 泡沫光线 | water/special | cone | Shoot | bubble-lance/bubble | 153 | 0.65 | {"slow":0.3} | 水流尾 |
| hex | 祸不单行 | ghost/special | chain | Shoot | sigil/shadow | 150 | 0.9 | {} | 灵骚 |
| z-burst | Z招式 | normal/special | mark | Shoot | impact/star | 220 | 999 | {} | — |
| surf | 冲浪 | water/special | wave | Shoot | wave/drop | 210 | 2.4 | {"slow":0.2} | 冲浪 + |
| icy-wind | 冰冻之风 | ice/special | wave | Shoot | frost/shard | 170 | 1.9 | {"slow":0.55} | 冰冻之风 + |
| air-slash | 空气斩 | flying/special | wave | Shoot | air-scissors/wind | 230 | 1.3 | {"knock":30} | 空气斩 + |
| whirlpool | 潮旋 | water/special | mark | Shoot | vortex/drop | 78 | 2.2 | {"slow":0.55} | 潮旋 + |
| leech-seed | 寄生种子 | grass/special | mark | Shoot | root-seed/leaf | 76 | 2.8 | {"seedHeal":0.012} | 寄生种子 + |
| stealth-rock | 隐形岩 | rock/special | mark | Shoot | orbit-stones/rock | 70 | 2.3 | {"knock":25} | 隐形岩 + |
| earth-power | 大地之力 | ground/special | mark | Shoot | fissure/blob | 72 | 2 | {} | 大地之力 + |
| counter | 双倍奉还 | fighting/physical | counter | Shoot | claw/ball | 90 | 1.2 | {"knock":30} | 双倍奉还 + |
| explosion | 大爆炸 | normal/physical | mark | Shoot | blast/star | 115 | 3.5 | {} | 大爆炸 + |
| hyper-beam | 破坏光线 | normal/special | beam | Shoot | horizontal-charge/star | 320 | 2.4 | {} | 破坏光线 + |
| dragon-pulse | 龙之波动 | dragon/special | wave | Shoot | dragon/fire | 240 | 1.8 | {} | 龙之波动 + |
| bullet-seed | 种子机关枪 | grass/physical | projectile | Shoot | seed-burst/leaf | 400 | 0.7 | {} | 种子机关枪 + |
| shadow-sneak | 影子偷袭 | ghost/physical | dash | Attack | shadow-steps/shadow | 105 | 1.15 | {} | 影子偷袭 + |
| aqua-jet | 水流喷射 | water/physical | dash | Attack | jet-wake/drop | 115 | 1 | {} | 水流喷射 + |
| volt-tackle | 伏特攻击 | electric/physical | dash | Attack | charge/bolt | 160 | 1.8 | {} | 伏特攻击 + |
| spirit-shackle | 缝影 | ghost/physical | projectile | Shoot | shackle-arrow/shadow | 504 | 1.4 | {"slow":0.4} | 缝影 + |
| last-resort | 珍藏 | normal/physical | wave | Shoot | final-star/star | 170 | 2.7 | {} | 珍藏 + |
| darkest-lariat | ＤＤ金勾臂 | dark/physical | aura | Charge | wheel/crescent | 105 | 1.9 | {"ignoreArmor":true} | ＤＤ金勾臂 + |
| clanging-scales | 鳞片噪音 | dragon/special | wave | Shoot | radial/fire | 220 | 2.1 | {} | 鳞片噪音 + |
| moongeist-beam | 暗影之光 | ghost/special | beam | Shoot | lunar-channel/shadow | 340 | 2.5 | {"ignoreArmor":true} | 暗影之光 + |
| stone-edge | 尖石攻击 | rock/physical | mark | Shoot | spikes/rock | 70 | 2 | {} | 尖石攻击 + |
| spectral-thief | 暗影偷盗 | ghost/physical | dash | Attack | spectral-hand/shadow | 150 | 1.8 | {"stealShield":true} | 暗影偷盗 + |
| play-rough | 嬉闹 | fairy/physical | melee | Attack | hearts/star | 98 | 1.2 | {"knock":18} | 嬉闹 + |
| sparkling-aria | 泡影的咏叹调 | water/special | wave | Shoot | ripple/drop | 220 | 2.1 | {} | 泡影的咏叹调 + |
| giga-impact | 终极冲击 | normal/physical | rolling | Shoot | quake/star | 220 | 3 | {"knock":28} | 终极冲击 + |
| sunsteel-strike | 流星闪冲 | steel/physical | dash | Attack | lance/shard | 190 | 2.5 | {"ignoreArmor":true} | 流星闪冲 + |
| natures-madness | 自然之怒 | fairy/special | mark | Shoot | guardian-jaws/star | 68 | 2.3 | {} | 自然之怒 + |
| photon-geyser | 光子喷涌 | psychic/special | beam | Shoot | rising-prism/ring | 310 | 2.3 | {} | 光子喷涌 + |
| seed-bomb | 种子炸弹 | grass/physical | lob | Shoot | seed/leaf | 72 | 1.7 | {} | 种子炸弹 + |
| dragon-darts | 龙箭 | dragon/physical | split | Shoot | fork/fire | 390 | 1.3 | {} | 龙箭 + |
| magical-leaf | 魔法叶 | grass/special | curve | Shoot | leaves/leaf | 352 | 1.1 | {} | 魔法叶 + |
| water-shuriken | 飞水手里剑 | water/special | ricochet | Shoot | wheel/drop | 465 | 1 | {} | 飞水手里剑 + |
| rollout | 滚动 | rock/physical | rolling | Shoot | rock/rock | 324 | 1.6 | {} | 滚动 + |
| mystical-fire | 魔法火焰 | fire/special | spiral | Shoot | vortex/fire | 270 | 1.7 | {"burn":0.5} | 魔法火焰 + |
| z-normal | 究极无敌大冲撞 | normal/special | mark | Shoot | impact/star | 220 | 999 | {} | — |
| z-fire | 超强极限爆焰弹 | fire/special | mark | Shoot | flame/fire | 220 | 999 | {} | — |
| z-water | 超级水流大漩涡 | water/special | mark | Shoot | wave/drop | 220 | 999 | {} | — |
| z-electric | 终极伏特狂雷闪 | electric/special | mark | Shoot | fork/bolt | 220 | 999 | {} | — |
| z-grass | 绚烂缤纷花怒放 | grass/special | mark | Shoot | vine/leaf | 220 | 999 | {} | — |
| z-ice | 激狂大地万里冰 | ice/special | mark | Shoot | frost/shard | 220 | 999 | {} | — |
| z-fighting | 全力无双激烈拳 | fighting/special | mark | Shoot | impact/ball | 220 | 999 | {} | — |
| z-poison | 强酸剧毒灭绝雨 | poison/special | mark | Shoot | vortex/blob | 220 | 999 | {} | — |
| z-ground | 地隆啸天大终结 | ground/special | mark | Shoot | fissure/blob | 220 | 999 | {} | — |
| z-flying | 极速俯冲轰烈撞 | flying/special | mark | Shoot | feather/wind | 220 | 999 | {} | — |
| z-psychic | 至高精神破坏波 | psychic/special | mark | Shoot | sigil/ring | 220 | 999 | {} | — |
| z-bug | 绝对捕食回旋斩 | bug/special | mark | Shoot | seed/needle | 220 | 999 | {} | — |
| z-rock | 毁天灭地巨岩坠 | rock/special | mark | Shoot | rock/rock | 220 | 999 | {} | — |
| z-ghost | 无尽暗夜之诱惑 | ghost/special | mark | Shoot | shadow/shadow | 220 | 999 | {} | — |
| z-dragon | 究极巨龙震天地 | dragon/special | mark | Shoot | dragon/fire | 220 | 999 | {} | — |
| z-dark | 黑洞吞噬万物灭 | dark/special | mark | Shoot | jaws/crescent | 220 | 999 | {} | — |
| z-steel | 超绝螺旋连击 | steel/special | mark | Shoot | claw/shard | 220 | 999 | {} | — |
| z-fairy | 可爱星星飞天撞 | fairy/special | mark | Shoot | sigil/star | 220 | 999 | {} | — |
| stoked-sparksurfer | 驾雷驭电戏冲浪 | electric/special | wave | Shoot | fork/bolt | 220 | 999 | {"slow":0.65} | — |
| sinister-arrow-raid | 遮天蔽日暗影箭 | ghost/special | beam | Shoot | shadow/shadow | 220 | 999 | {} | — |
| extreme-evoboost | 九彩升华齐聚顶 | normal/special | mark | Shoot | impact/star | 220 | 999 | {} | — |
| malicious-moonsault | 极恶飞跃粉碎击 | dark/special | mark | Shoot | jaws/crescent | 220 | 999 | {} | — |
| clangorous-soulblaze | 炽魂热舞烈音爆 | dragon/special | nova | Shoot | dragon/fire | 220 | 999 | {} | — |
| menacing-moonraze-maelstrom | 月华飞溅落灵霄 | ghost/special | beam | Shoot | shadow/shadow | 220 | 999 | {"ignoreArmor":true} | — |
| splintered-stormshards | 狼啸石牙飓风暴 | rock/special | meteor | Charge | rock/rock | 220 | 999 | {} | — |
| soul-stealing-7-star-strike | 七星夺魂腿 | ghost/special | dash | Attack | shadow/shadow | 220 | 999 | {} | — |
| genesis-supernova | 起源超新星大爆炸 | psychic/special | wave | Shoot | sigil/ring | 220 | 999 | {} | — |
| lets-snuggle-forever | Let's Snuggle Forever | fairy/special | mark | Shoot | sigil/star | 220 | 999 | {} | — |
| catastropika | 皮卡皮卡必杀击 | electric/special | dash | Attack | fork/bolt | 220 | 999 | {} | — |
| oceanic-operetta | 海神庄严交响乐 | water/special | wave | Shoot | wave/drop | 220 | 999 | {} | — |
| pulverizing-pancake | 认真起来大爆击 | normal/special | rolling | Shoot | impact/star | 220 | 999 | {} | — |
| searing-sunraze-smash | 日光回旋下苍穹 | steel/special | dash | Attack | claw/shard | 220 | 999 | {"ignoreArmor":true} | — |
| guardian-of-alola | 巨人卫士・阿罗拉 | fairy/special | guardian | Shoot | sigil/star | 220 | 999 | {} | — |
| max-normal | 极巨攻击 | normal/special | mark | Shoot | impact/star | 100 | 999 | {} | — |
| max-fire | 极巨火爆 | fire/special | mark | Shoot | flame/fire | 100 | 999 | {} | — |
| max-water | 极巨水流 | water/special | mark | Shoot | wave/drop | 100 | 999 | {} | — |
| max-electric | 极巨闪电 | electric/special | mark | Shoot | fork/bolt | 100 | 999 | {} | — |
| max-grass | 极巨草原 | grass/special | mark | Shoot | vine/leaf | 100 | 999 | {} | — |
| max-ice | 极巨寒冰 | ice/special | mark | Shoot | frost/shard | 100 | 999 | {} | — |
| max-fighting | 极巨拳斗 | fighting/special | mark | Shoot | impact/ball | 100 | 999 | {} | — |
| max-poison | 极巨酸毒 | poison/special | mark | Shoot | vortex/blob | 100 | 999 | {} | — |
| max-ground | 极巨大地 | ground/special | mark | Shoot | fissure/blob | 100 | 999 | {} | — |
| max-flying | 极巨飞冲 | flying/special | mark | Shoot | feather/wind | 100 | 999 | {} | — |
| max-psychic | 极巨超能 | psychic/special | mark | Shoot | sigil/ring | 100 | 999 | {} | — |
| max-bug | 极巨虫蛊 | bug/special | mark | Shoot | seed/needle | 100 | 999 | {} | — |
| max-rock | 极巨岩石 | rock/special | mark | Shoot | rock/rock | 100 | 999 | {} | — |
| max-ghost | 极巨幽魂 | ghost/special | mark | Shoot | shadow/shadow | 100 | 999 | {} | — |
| max-dragon | 极巨龙骑 | dragon/special | mark | Shoot | dragon/fire | 100 | 999 | {} | — |
| max-dark | 极巨恶霸 | dark/special | mark | Shoot | jaws/crescent | 100 | 999 | {} | — |
| max-steel | 极巨钢铁 | steel/special | mark | Shoot | claw/shard | 100 | 999 | {} | — |
| max-fairy | 极巨妖精 | fairy/special | mark | Shoot | sigil/star | 100 | 999 | {} | — |
| z-support | Z辅助强化 | normal/special | mark | Shoot | impact/star | 1 | 999 | {} | — |
| max-guard | 极巨防壁 | normal/status | mark | Shoot | impact/star | 1 | 999 | {} | — |
