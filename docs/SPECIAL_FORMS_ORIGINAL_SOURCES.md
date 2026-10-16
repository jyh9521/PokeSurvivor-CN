# 原作特殊形态与招式名单：来源核对

> 实施更新：0.16.0已按合格素材白名单落地；本文件保留实施前核对记录。当前功能与剩余缺口见 SPECIAL_CONTENT_RELEASE.md。

核对日期：2026-10-16。只读研究；未更改游戏、素材或玩法。该文档记录原作基准，不把第三方数据条目等同于本项目已实装。

## 口径与来源

- Mega包含《X/Y》《欧米伽红宝石/阿尔法蓝宝石》以及《传说 Z-A》及Mega Dimension资料；不能只按旧的48形态核对。官方已公开[路卡利欧Z等DLC形态](https://legends.pokemon.com/en-us/dlc)及[烈咬陆鲨Z](https://legends.pokemon.com/en-gb/news/mega-garchomp-z)，`mega-z`不是可直接剔除的错误数据。
- Z招式按《究极之日/究极之月》规则核对；不将之后登场的地区形态自动纳入专属Z资格。
- 极巨化按《剑/盾》规则核对，不混入Pokémon GO的Max招式体系。
- 官方网页用于确认机制与特殊形态；PokeAPI数据仓库用于批量身份清单；Showdown源码用于交叉核对招式和形态条件。后两者是公开第三方项目的原始数据/实现，不是宝可梦官方API或官方授权素材证明。

## Mega完整身份基准

精确筛选 `identifier` 含 `-mega`：**97条数据记录、87个物种**。不能用无连字符的 `mega` 筛选，否则会误计大竺葵/meganium、远古巨蜓/yanmega。

[清单数据源 pokemon.csv](https://raw.githubusercontent.com/PokeAPI/pokeapi/81d20919845b6a445969b9265aab5cec6b04cece/data/v2/csv/pokemon.csv)；[形态标志交叉源 pokemon_forms.csv](https://raw.githubusercontent.com/PokeAPI/pokeapi/81d20919845b6a445969b9265aab5cec6b04cece/data/v2/csv/pokemon_forms.csv)。表内记录数不强行等同于完全不同外观数，例如雌雄和颜色分支有时属于同一Mega概念。

|编号|中文物种|形态标识|
|---|---|---|
|0003|妙蛙花|`venusaur-mega`|
|0006|喷火龙|`charizard-mega-x`|
|0006|喷火龙|`charizard-mega-y`|
|0009|水箭龟|`blastoise-mega`|
|0065|胡地|`alakazam-mega`|
|0094|耿鬼|`gengar-mega`|
|0115|袋兽|`kangaskhan-mega`|
|0127|凯罗斯|`pinsir-mega`|
|0130|暴鲤龙|`gyarados-mega`|
|0142|化石翼龙|`aerodactyl-mega`|
|0150|超梦|`mewtwo-mega-x`|
|0150|超梦|`mewtwo-mega-y`|
|0181|电龙|`ampharos-mega`|
|0212|巨钳螳螂|`scizor-mega`|
|0214|赫拉克罗斯|`heracross-mega`|
|0229|黑鲁加|`houndoom-mega`|
|0248|班基拉斯|`tyranitar-mega`|
|0257|火焰鸡|`blaziken-mega`|
|0282|沙奈朵|`gardevoir-mega`|
|0303|大嘴娃|`mawile-mega`|
|0306|波士可多拉|`aggron-mega`|
|0308|恰雷姆|`medicham-mega`|
|0310|雷电兽|`manectric-mega`|
|0354|诅咒娃娃|`banette-mega`|
|0359|阿勃梭鲁|`absol-mega`|
|0445|烈咬陆鲨|`garchomp-mega`|
|0448|路卡利欧|`lucario-mega`|
|0460|暴雪王|`abomasnow-mega`|
|0380|拉帝亚斯|`latias-mega`|
|0381|拉帝欧斯|`latios-mega`|
|0260|巨沼怪|`swampert-mega`|
|0254|蜥蜴王|`sceptile-mega`|
|0302|勾魂眼|`sableye-mega`|
|0334|七夕青鸟|`altaria-mega`|
|0475|艾路雷朵|`gallade-mega`|
|0531|差不多娃娃|`audino-mega`|
|0319|巨牙鲨|`sharpedo-mega`|
|0080|呆壳兽|`slowbro-mega`|
|0208|大钢蛇|`steelix-mega`|
|0018|大比鸟|`pidgeot-mega`|
|0362|冰鬼护|`glalie-mega`|
|0719|蒂安希|`diancie-mega`|
|0376|巨金怪|`metagross-mega`|
|0384|烈空坐|`rayquaza-mega`|
|0323|喷火驼|`camerupt-mega`|
|0428|长耳兔|`lopunny-mega`|
|0373|暴飞龙|`salamence-mega`|
|0015|大针蜂|`beedrill-mega`|
|0036|皮可西|`clefable-mega`|
|0071|大食花|`victreebel-mega`|
|0121|宝石海星|`starmie-mega`|
|0149|快龙|`dragonite-mega`|
|0154|大竺葵|`meganium-mega`|
|0160|大力鳄|`feraligatr-mega`|
|0227|盔甲鸟|`skarmory-mega`|
|0478|雪妖女|`froslass-mega`|
|0500|炎武王|`emboar-mega`|
|0530|龙头地鼠|`excadrill-mega`|
|0545|蜈蚣王|`scolipede-mega`|
|0560|头巾混混|`scrafty-mega`|
|0604|麻麻鳗鱼王|`eelektross-mega`|
|0609|水晶灯火灵|`chandelure-mega`|
|0652|布里卡隆|`chesnaught-mega`|
|0655|妖火红狐|`delphox-mega`|
|0658|甲贺忍蛙|`greninja-mega`|
|0668|火炎狮|`pyroar-mega`|
|0670|花叶蒂|`floette-mega`|
|0687|乌贼王|`malamar-mega`|
|0689|龟足巨铠|`barbaracle-mega`|
|0691|毒藻龙|`dragalge-mega`|
|0701|摔角鹰人|`hawlucha-mega`|
|0718|基格尔德|`zygarde-mega`|
|0780|老翁龙|`drampa-mega`|
|0870|列阵兵|`falinks-mega`|
|0026|雷丘|`raichu-mega-x`|
|0026|雷丘|`raichu-mega-y`|
|0358|风铃铃|`chimecho-mega`|
|0359|阿勃梭鲁|`absol-mega-z`|
|0398|姆克鹰|`staraptor-mega`|
|0445|烈咬陆鲨|`garchomp-mega-z`|
|0448|路卡利欧|`lucario-mega-z`|
|0485|席多蓝恩|`heatran-mega`|
|0491|达克莱伊|`darkrai-mega`|
|0623|泥偶巨人|`golurk-mega`|
|0678|超能妙喵|`meowstic-male-mega`|
|0740|好胜毛蟹|`crabominable-mega`|
|0768|具甲武者|`golisopod-mega`|
|0801|玛机雅娜|`magearna-mega`|
|0801|玛机雅娜|`magearna-original-mega`|
|0807|捷拉奥拉|`zeraora-mega`|
|0952|狠辣椒|`scovillain-mega`|
|0970|晶光花|`glimmora-mega`|
|0978|米立龙|`tatsugiri-curly-mega`|
|0978|米立龙|`tatsugiri-droopy-mega`|
|0978|米立龙|`tatsugiri-stretchy-mega`|
|0998|戟脊龙|`baxcalibur-mega`|
|0678|超能妙喵|`meowstic-female-mega`|

### Mega机制与资格注意

- [经典Mega官方说明](https://www.pokemon.co.jp/ex/xy/story/02.html)：特定宝可梦的战斗中临时变化，不是永久进化。需要独立的物种/形态白名单、形态选择、种族值、属性和特性映射。烈空坐在经典规则下以画龙点睛为条件，不能简单强制所有物种持石。
- [Z-A官方Mega机制](https://legends.pokemon.com/en-us/mega-pokemon)：实时战斗有Mega能量与临时维持机制，不能把经典的持续到战斗结束和Z-A的能量持续制描述为同一套规则。项目可选统一幸存者改编，但应明确。
- 原始回归的盖欧卡/固拉多不是Mega；究极奈克洛兹玛是究极爆发，不是Mega；无极巨化无极汰那也不是Mega。应单独建系统或留待以后，不能通过名字/体型混入。

## Z招式：通用与专属分开

[官方说明](https://www.pokemon.co.jp/ex/sun_moon/fight/160901_01.html)：招式属性与Z纯晶匹配，而不是单纯看使用者第一属性；一个通常战斗使用一次。通用系统不是物种白名单；应检查学会的基础招式与纯晶。

### 通用18属性

一般、火、水、电、草、冰、格斗、毒、地面、飞行、超能力、虫、岩石、幽灵、龙、恶、钢、妖精。攻击类Z招式通常继承基础招式的物理/特殊类别，并按基础招式换算威力；变化招式使用Z效果而非统一爆炸。因此18个属性视觉包也不等于变化Z效果已完成。

### 专属17招（19个物种，包含形态条件）

[条件交叉来源 items.ts](https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/items.ts)；[官方专属Z概念](https://www.pokemon.co.jp/ex/sun_moon/fight/160901_01.html)、[皮卡丘/伊布](https://www.pokemon.co.jp/ex/sun_moon/fight/160920_01.html)、[究极日月新增与奈克洛兹玛共享](https://www.pokemon.co.jp/ex/usum/gamesystem/170922_01.html)。

|使用者/形态|专属Z招式|基础招式|
|---|---|---|
|阿罗拉雷丘（非普通雷丘）|驾雷驭电戏冲浪 / Stoked Sparksurfer|十万伏特|
|狙射树枭（非洗翠形态）|遮天蔽日暗影箭 / Sinister Arrow Raid|缝影|
|伊布|九彩升华齐聚顶 / Extreme Evoboost|珍藏|
|炽焰咆哮虎|极恶飞跃粉碎击 / Malicious Moonsault|DD金勾臂|
|杖尾鳞甲龙（含霸主）|炽魂热舞烈音爆 / Clangorous Soulblaze|鳞片噪音|
|露奈雅拉、奈克洛兹玛拂晓之翼|月华飞溅落灵霄 / Menacing Moonraze Maelstrom|暗影之光|
|鬃岩狼人白昼/黑夜/黄昏|狼啸石牙飓风暴 / Splintered Stormshards|尖石攻击|
|玛夏多|七星夺魂腿 / Soul-Stealing 7-Star Strike|暗影偷盗|
|梦幻|起源超新星大爆炸 / Genesis Supernova|精神强念|
|谜拟丘化形/现形（含霸主）|亲密无间大乱揍 / Let’s Snuggle Forever|嬉闹|
|普通皮卡丘|皮卡皮卡必杀击 / Catastropika|伏特攻击|
|戴帽皮卡丘：初始/丰缘/神奥/合众/卡洛斯/阿罗拉/就决定是你了|千万伏特 / 10,000,000 Volt Thunderbolt|十万伏特|
|西狮海壬|海神庄严交响乐 / Oceanic Operetta|泡影的咏叹调|
|卡比兽|认真起来大爆击 / Pulverizing Pancake|终极冲击|
|索尔迦雷欧、奈克洛兹玛黄昏之鬃|日光回旋下苍穹 / Searing Sunraze Smash|流星闪冲|
|卡璞鸣鸣/蝶蝶/哞哞/鳍鳍|巨人卫士·阿罗拉 / Guardian of Alola|自然之怒|
|究极奈克洛兹玛|焚天灭世炽光爆 / Light That Burns the Sky|光子喷涌|

关键差异：伊布是强化类而非伤害爆发；四卡璞按当前生命比例处理，不能变成对首领无上限斩杀；焚天灭世炽光爆按攻击/特攻比较决定伤害类别；场地、破防/无视特性、麻痹、清场及强化等效果需逐招独立映射。帽子皮卡丘“世界帽”不属于第七世代可用专属Z名单，不能因同名物种自动放行。究极爆发是焚天灭世炽光爆前置形态系统，不是简单给普通奈克洛兹玛加按钮。

## 极巨化/超极巨化

[官方极巨化说明](https://swordshield.pokemon.com/en-gb/gameplay/pokemon-become-huge-dynamax/)与[极巨招式/极巨防壁](https://swordshield.pokemon.com/en-au/gameplay/dynamaxing-max-moves/)：通常持续3回合，普通攻击转换极巨招式，变化招式转换极巨防壁。幸存者实时持续时间属于改编，不应称原作20秒。

- 普通极巨化沿用原模型，不要求每只新变身贴图；但只指剑盾可用、规则允许的宝可梦，不能把历代所有1025种全部声称原作可极巨化。后续世代未进剑盾物种属于跨世代改编。
- 苍响、藏玛然特、无极汰那为特殊禁止资格；无极巨化无极汰那是剧情形态，不是玩家可选普通极巨化。该例外以[Showdown极巨化实现](https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/conditions.ts)及[战斗动作验证](https://raw.githubusercontent.com/smogon/pokemon-showdown/master/sim/battle-actions.ts)交叉核对，非官网逐项明文名单。
- [官方超极巨化说明](https://swordshield.pokemon.com/en-us/gameplay/gigantamax/)：仅特定物种中的特定个体可超极巨化，拥有专属外形和专属超极巨招式；普通极巨化不能使用超极巨招式。物种资格和个体资格应分开。

### 超极巨化全量：34条数据记录、32个物种

同一个超极巨化概念可能有基础形态分支；例如颤弦蝾螈高调/低调在数据中分两条，但不能仅凭条目数说有两种不同超极巨外观。武道熊师两流派则确有不同形态/专属招式。[官方武道熊师说明](https://www.pokemon.co.jp/ex/sword_shield_expansion/pokemon/200109_02/)。

|编号|物种|数据形态|专属招式（英文身份键）|
|---|---|---|---|
|0003|妙蛙花|`venusaur-gmax`|G-Max Vine Lash|
|0006|喷火龙|`charizard-gmax`|G-Max Wildfire|
|0009|水箭龟|`blastoise-gmax`|G-Max Cannonade|
|0012|巴大蝶|`butterfree-gmax`|G-Max Befuddle|
|0025|皮卡丘|`pikachu-gmax`|G-Max Volt Crash|
|0052|喵喵|`meowth-gmax`|G-Max Gold Rush|
|0068|怪力|`machamp-gmax`|G-Max Chi Strike|
|0094|耿鬼|`gengar-gmax`|G-Max Terror|
|0099|巨钳蟹|`kingler-gmax`|G-Max Foam Burst|
|0131|拉普拉斯|`lapras-gmax`|G-Max Resonance|
|0133|伊布|`eevee-gmax`|G-Max Cuddle|
|0143|卡比兽|`snorlax-gmax`|G-Max Replenish|
|0569|灰尘山|`garbodor-gmax`|G-Max Malodor|
|0809|美录梅塔|`melmetal-gmax`|G-Max Meltdown|
|0812|轰擂金刚猩|`rillaboom-gmax`|G-Max Drum Solo|
|0815|闪焰王牌|`cinderace-gmax`|G-Max Fireball|
|0818|千面避役|`inteleon-gmax`|G-Max Hydrosnipe|
|0823|钢铠鸦|`corviknight-gmax`|G-Max Wind Rage|
|0826|以欧路普|`orbeetle-gmax`|G-Max Gravitas|
|0834|暴噬龟|`drednaw-gmax`|G-Max Stonesurge|
|0839|巨炭山|`coalossal-gmax`|G-Max Volcalith|
|0841|苹裹龙|`flapple-gmax`|G-Max Tartness|
|0842|丰蜜龙|`appletun-gmax`|G-Max Sweetness|
|0844|沙螺蟒|`sandaconda-gmax`|G-Max Sandblast|
|0849|颤弦蝾螈|`toxtricity-amped-gmax`|G-Max Stun Shock|
|0851|焚焰蚣|`centiskorch-gmax`|G-Max Centiferno|
|0858|布莉姆温|`hatterene-gmax`|G-Max Smite|
|0861|长毛巨魔|`grimmsnarl-gmax`|G-Max Snooze|
|0869|霜奶仙|`alcremie-gmax`|G-Max Finale|
|0879|大王铜象|`copperajah-gmax`|G-Max Steelsurge|
|0884|铝钢龙|`duraludon-gmax`|G-Max Depletion|
|0892|武道熊师|`urshifu-single-strike-gmax`|G-Max One Blow|
|0892|武道熊师|`urshifu-rapid-strike-gmax`|G-Max Rapid Flow|
|0849|颤弦蝾螈|`toxtricity-low-key-gmax`|G-Max Stun Shock|

以上专属招式键交叉来源：[Showdown物种定义](https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/pokedex.ts)。需要的不只是扩大原招式：持续场地伤害、异常、能力变化、回复、移除场地/墙、拘束、回复树果或削减招式资源等应分别适配。极巨化主要增加生命，不是自动给所有攻击再乘统一伤害倍率；普通极巨招式还需天气/场地、己方强化或敌方削弱等效果映射。本作不具备回合、PP、性别等语义时，应明确设计等价规则而非声称完全复刻。

## 素材准入与补全建议（原作研究侧）

1. Mega/超极巨化必须逐个精确形态核验现有素材库的战斗动画，不以头像、官方立绘或普通形态放大冒充。检查Idle/Walk等运行时要求、方向、帧数、阴影/锚点；异色另列可用状态。
2. 原作名单、基础物种是否已入游戏、精确形态素材、六维属性/特性、专属招式、实际可选入口，应是分开的审计字段。只有身份数据不算完成。
3. 普通极巨化无需新物种外形，可以先补资格与极巨招式映射；超极巨化则严格依可用战斗素材白名单分批开放。
4. Z招式多数不需变身素材；使用者现有动画可用还不代表专属Z演出素材可用。若同意沿用现有素材库的可组合弹道/光效，可先补通用属性转换与专属机制；若必须完整原作演出，缺演出素材的列为待补，不伪装已有。
5. 先修形态选择、资格、基础招式转换和结束还原，再导入有素材形态；未有精确素材者保留缺失清单，不开假变身。联机同步物种+形态键而非只发基础编号，避免喷火龙X/Y、路卡利欧/Z互相混淆。

## 数据可复核标识

- 采集来源为2026-10-16读取；PokeAPI已固定提交 `81d20919845b6a445969b9265aab5cec6b04cece`；Showdown master会变动，后续实施应固定commit。
- pokemon.csv SHA256：`16c81c33188b0eac403aa2f759fcbe9e42c611f722d263f5b5a6a5bff9f8ce6b`。
- pokemon_species_names.csv SHA256：`820cde17074cdb1c2b0595c997fb8f998e773bd5da3bb525dec85703c86c5fd9`。
- 形态枚举规则：`"-mega" in identifier` / `"-gmax" in identifier`，以species_id去重统计物种。

## 本地图鉴缺失50只与原作可用名单的交集

核对输入：本仓库 `tools/localization/catalog-missing.json` 的50物种。独立临时目录安装 `@pkmn/dex@0.10.11`，未修改项目依赖。使用继承解析后的 `Dex.forGen(7)` / `Dex.forGen(8)`，不是正则扫描mods覆盖文件，更不是只看伽勒尔地区图鉴。来源：[包作者仓库](https://github.com/pkmn/ps/tree/main/dex)、[Showdown物种解析与资格字段](https://raw.githubusercontent.com/smogon/pokemon-showdown/master/sim/dex-species.ts)、[剑盾可用标志](https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/mods/gen8/formats-data.ts)、[七代可用标志](https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/mods/gen7/formats-data.ts)。第三方实现可复核结果，不冒称官方直接提供的全量兼容接口。

- **通用Z潜在使用者缺20只**：第七世代 `exists && !isNonstandard`。`Future`、`LGPE`等不计入；Meltan/Melmetal在该Dex里明确标 `LGPE`，未用“编号≤807”或“introduced generation≤7”偷换。此处只核对物种可在USUM使用；实际可发动哪属性Z仍需基础招式和纯晶条件。
- **剑盾普通极巨化使用者缺20只**：第八世代 `exists && !isNonstandard && !cannotDynamax`。明确包含扩展票/可传送物种，不把非地区图鉴物种排掉。苍响、藏玛然特、无极汰那对应 `cannotDynamax=true`；这个标志是必要的附加条件。
- 两组有13只重叠，合并去重27只；不是总共缺40个不同物种。50只中其余23只均为第九世代，不能自动称原作USUM或剑盾可用。七代中另有7只未入剑盾（表中Z为“是”、极巨化为“否”）。
- **超极巨化所需基础物种缺2只**：839巨炭山、879大王铜象。对应变身动画还须单独核验，不能将普通形态有/无动画等同超极巨形态素材状态。专属Z19物种没有本地图鉴缺失基础物种，但地区形态/帽子/变身前置仍见本次素材审计。

|编号|本地缺失物种|USUM通用Z物种资格|剑盾普通极巨化资格|
|---|---|---|---|
|514|爆香猿|是|否（剑盾未收录）|
|516|冷水猿|是|否（剑盾未收录）|
|520|咕咕鸽|是|是|
|522|斑斑马|是|否（剑盾未收录）|
|523|雷电斑马|是|否（剑盾未收录）|
|538|投摔鬼|是|是|
|558|岩殿居蟹|是|是|
|564|原盖海龟|是|是|
|565|肋骨海龟|是|是|
|591|败露球菇|是|是|
|592|轻飘飘|是|是|
|616|小嘴蜗|是|是|
|618|泥巴鱼|是|是|
|626|爆炸头水牛|是|是|
|683|芳香精|是|是|
|732|喇叭啄鸟|是|否（剑盾未收录）|
|733|铳嘴大鸟|是|否（剑盾未收录）|
|735|猫鼬探长|是|否（剑盾未收录）|
|756|灯罩夜菇|是|是|
|765|智挥猩|是|是|
|837|小炭仔|否（七代未登场）|是|
|838|大炭车|否（七代未登场）|是|
|839|巨炭山|否（七代未登场）|是|
|866|踏冰人偶|否（七代未登场）|是|
|878|铜象|否（七代未登场）|是|
|879|大王铜象|否（七代未登场）|是|
|893|萨戮德|否（七代未登场）|是|

复核逻辑（在上述隔离安装包目录可运行，缺失名单路径指向本仓库）：

```js
const {Dex} = require("@pkmn/dex");
const missing = require("C:/Users/noway/Documents/ChatGPT/PokeSurviver/tools/localization/catalog-missing.json").missing;
for (const gen of [7, 8]) {
  const result = missing.filter(({en}) => {
    const s = Dex.forGen(gen).species.get(en);
    return s.exists && !s.isNonstandard && (gen !== 8 || !s.cannotDynamax);
  });
  console.log(gen, result.length, result.map(x => x.dex));
}
```

结果：第7世代20、第8世代20，退出状态0。此核对没有把对战分级的Uber/AG等强度禁用当成游戏内不可用；普通极巨化与超极巨化个体资格仍分开。

### 全国物种级资格全量导出

已生成并重读验证 `artifacts/special-forms-audit/original-eligibility.json`，含全国1–1025每物种中文名、原始标识、解析后的gen7/gen8名称、exists/isNonstandard/cannotDynamax及逐条判断依据，固定包版本`@pkmn/dex@0.10.11`。结果：USUM通用Z潜在物种807；剑盾可普通极巨化物种661（剑盾可用664减苍响/藏玛然特/无极汰那3例外）；未解析身份0。这个表是基础物种默认形态口径，不能替代地区形态、特殊形态或招式合法性逐项核验。
