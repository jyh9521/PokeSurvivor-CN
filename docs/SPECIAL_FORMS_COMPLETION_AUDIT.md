# Mega、Z招式与极巨化：补全核对与实施方案

> 实施更新：0.16.0已按合格素材白名单落地；本文件保留实施前核对记录。当前功能与剩余缺口见 SPECIAL_CONTENT_RELEASE.md。

核对日期：2026-10-16。结论针对当前工作区源码及当日读取的原作数据与SpriteCollab快照。

**本轮只做研究和资料整理：未修改游戏代码、正式素材、存档格式、依赖或版本；未提交、推送或部署。**

## 1. 结论与统计口径

|系统|原作身份基准|当前缺口|现有素材允许的下一步|
|---|---|---|---|
|Mega|87物种、97条身份记录；含Z-A及DLC，条目数不等于独立外观数|数据都有，但默认只取每物种第一形态；完整独立特性、分支选择和形态前置条件未完成|40条精确形态具有真实待机、移动、攻击动作；其余57条暂缓|
|通用Z|18属性攻击Z，并包括变化招式的Z效果|只有一个通用范围爆发；没有按基础招式属性/威力转换，也没有变化Z|既有角色素材可以复用；先补机制与现有引擎特效，不能把18种配色称完整原作动画|
|专属Z|17招、19物种，另有严格形态与基础招式条件|17招的独立机制均未完成；不能以所有物种有Z按钮计作专属Z已实装|优先现有正确基础形态；阿罗拉雷丘、其他鬃岩狼人、谜拟丘现形、究极奈克洛兹玛需独立形态接入；7款帽子及奈克洛兹玛融合形态因素材不足暂缓|
|普通极巨化|按剑盾可用物种及例外规则，不是全国所有物种|当前所有物种通用放大、加血和增伤；缺极巨招式转换、极巨防壁、资格规则|正确基础形态有战斗素材即可做；普通极巨化本来就可沿用原模型放大|
|超极巨化|32物种、34条形态记录；武道熊师两流派不同，颤弦蝾螈高低调共享外观|全部专属形态和招式未实装；巨炭山、大王铜象连基础物种也未入图鉴|0条达到真实待机+移动+攻击准入条件；34条全部暂缓，不使用普通放大替代|

### 素材准入规则

1. 必须匹配精确物种与形态；普通/地区形态、X/Y/Z、雌雄、米立龙姿态等分别检查。不得用名字含Mega的模糊匹配。
2. 必须有真实Idle、Walk以及Attack/Swing/Strike/Shoot等攻击动作。解析CopyOf后，攻击若实际指向Idle/Walk/Rotate则不合格。
3. 本次实际读取AnimData.xml，下载所选PNG，用Pillow校验PNG并检查帧尺寸；仅有头像、Idle或tracker空节点均不算战斗角色可用。
4. “动作齐全”仅为实施候选，不代表已完成方向、锚点、碰撞体、屏幕可读性、联机或实机验收；异色需单独核验，不自动承诺。
5. 招式不必凭空增加角色变身素材。普通Z和普通极巨化可复用正确角色与现有粒子/弹道模块；需要专属人物模型或原作过场素材的项目必须另过素材检查，当前清单不宣称原作过场素材已存在。

## 1.1 通用Z与普通极巨化：基础物种缺失清单

按继承解析后的`@pkmn/dex@0.10.11`原作世代资格数据核对：USUM有807个通用Z潜在基础物种；剑盾有661个可普通极巨化基础物种（664个可用减苍响、藏玛然特、无极汰那）。这是基础物种口径，尚需各招式与特殊形态条件，不等于每个形态都合法，也不是官方直接发布的全量接口。来源、规则与版本见原作研究笔记。

本地当前975物种中，对应覆盖USUM候选787个、剑盾极巨化候选641个；**两套原作名单各缺20个基础物种**，重叠13个、合计27个。其余已开放的跨世代使用者应明确标作本作扩展，不能算原作资格已核对。

|编号|缺失基础物种|USUM通用Z候选|剑盾普通极巨化候选|当前精确基础形态素材|
|---|---|---|---|---|
|0514|爆香猿|是|否|仅头像，暂缓|
|0516|冷水猿|是|否|仅头像，暂缓|
|0520|咕咕鸽|是|是|仅头像，暂缓|
|0522|斑斑马|是|否|仅头像，暂缓|
|0523|雷电斑马|是|否|仅头像，暂缓|
|0538|投摔鬼|是|是|仅头像，暂缓|
|0558|岩殿居蟹|是|是|仅头像，暂缓|
|0564|原盖海龟|是|是|仅头像，暂缓|
|0565|肋骨海龟|是|是|仅头像，暂缓|
|0591|败露球菇|是|是|仅头像，暂缓|
|0592|轻飘飘|是|是|仅头像，暂缓|
|0616|小嘴蜗|是|是|仅头像，暂缓|
|0618|泥巴鱼|是|是|动作不全，暂缓（Idle、Rotate）|
|0626|爆炸头水牛|是|是|仅头像，暂缓|
|0683|芳香精|是|是|动作不全，暂缓（Idle、Rotate）|
|0732|喇叭啄鸟|是|否|仅头像，暂缓|
|0733|铳嘴大鸟|是|否|动作不全，暂缓（Idle、Rotate）|
|0735|猫鼬探长|是|否|仅头像，暂缓|
|0756|灯罩夜菇|是|是|仅头像，暂缓|
|0765|智挥猩|是|是|仅头像，暂缓|
|0837|小炭仔|否|是|仅头像，暂缓|
|0838|大炭车|否|是|仅头像，暂缓|
|0839|巨炭山|否|是|仅头像，暂缓|
|0866|踏冰人偶|否|是|仅头像，暂缓|
|0878|铜象|否|是|仅头像，暂缓|
|0879|大王铜象|否|是|动作不全，暂缓（Walk、Idle、Rotate）|
|0893|萨戮德|否|是|仅头像，暂缓|

这27只的实际素材检查结果：23只仅头像；泥巴鱼、芳香精、铳嘴大鸟只有Idle/Rotate，大王铜象只有Walk/Idle/Rotate。全部缺完整战斗动作，**本次不列入新增可玩物种排期**。素材库完善后再补，不把普通图鉴缺失当作可立即执行的内容。

全国1–1025的逐物种原作资格、理由、固定数据包版本与未解析计数见研究证据`original-eligibility.json`；未解析身份0。

## 2. Mega：完整核对

### 2.1 对上一次回答的精确修正

- 44条已导入素材记录并不等于44套完整、正确的形态：**40条精确形态动作齐全，2条动作不全，2条错误复用另一姿态。**
- 默认87个Mega资格物种中，39个默认形态具有齐全动作，2个默认形态动作不全，46个默认形态没有精确的完整战斗素材。
- **超梦Y**有完整素材且已导入，但运行时始终取第一条超梦X，因此Y目前选不到；X反而只有头像。这是应优先修复的形态选择问题。
- **Mega蜥蜴王**只有Idle/Walk/Rotate，缺真实攻击；**Mega风铃铃**只有Idle/Rotate，缺真实移动和攻击。现有导入器用回退动作制造了“齐全”的元数据。
- **米立龙下垂、平挺Mega**在现有导入记录中都指向`0978/0003`（上弓Mega），不能计作各自素材已存在。精确对应的`0978/0005`、`0978/0004`只有头像。
- 97条身份在当前战斗数据中均存在，87个基础物种均已入图鉴；缺口主要是精确形态、素材准入和机制，而非再添加87个基础物种。

### 2.2 本次允许进入实施排期的40条
喷火龙（mega_x）、胡地（mega）、耿鬼（mega）、袋兽（mega）、化石翼龙（mega）、超梦（mega_y）、黑鲁加（mega）、班基拉斯（mega）、沙奈朵（mega）、大嘴娃（mega）、恰雷姆（mega）、雷电兽（mega）、诅咒娃娃（mega）、阿勃梭鲁（mega）、路卡利欧（mega）、拉帝亚斯（mega）、拉帝欧斯（mega）、勾魂眼（mega）、七夕青鸟（mega）、艾路雷朵（mega）、巨牙鲨（mega）、呆壳兽（mega）、大钢蛇（mega）、冰鬼护（mega）、蒂安希（mega）、烈空坐（mega）、喷火驼（mega）、长耳兔（mega）、盔甲鸟（mega）、龙头地鼠（mega）、头巾混混（mega）、麻麻鳗鱼王（mega）、花叶蒂（mega）、毒藻龙（mega）、摔角鹰人（mega）、基格尔德（mega）、老翁龙（mega）、达克莱伊（mega）、捷拉奥拉（mega）、米立龙（Mega）

这些素材都已在当前Mega素材导入记录中；现库未发现额外尚未导入、且符合此准入规则的新Mega形态。重点是修复选择和机制，不是声称又新增40套。

### 2.3 因素材不足暂缓的57条

**动作不全（2）：** 蜥蜴王（mega）、风铃铃（mega）

**仅头像（54）：** 妙蛙花（mega）、喷火龙（mega_y）、水箭龟（mega）、凯罗斯（mega）、暴鲤龙（mega）、超梦（mega_x）、电龙（mega）、巨钳螳螂（mega）、赫拉克罗斯（mega）、火焰鸡（mega）、波士可多拉（mega）、烈咬陆鲨（mega）、暴雪王（mega）、巨沼怪（mega）、差不多娃娃（mega）、大比鸟（mega）、巨金怪（mega）、暴飞龙（mega）、大针蜂（mega）、皮可西（mega）、大食花（mega）、宝石海星（mega）、快龙（mega）、大竺葵（mega）、大力鳄（mega）、雪妖女（mega）、炎武王（mega）、蜈蚣王（mega）、水晶灯火灵（mega）、布里卡隆（mega）、妖火红狐（mega）、甲贺忍蛙（mega）、火炎狮（mega）、乌贼王（mega）、龟足巨铠（mega）、列阵兵（mega）、雷丘（mega_x）、雷丘（mega_y）、阿勃梭鲁（mega_z）、姆克鹰（mega）、烈咬陆鲨（mega_z）、路卡利欧（mega_z）、席多蓝恩（mega）、泥偶巨人（mega）、超能妙喵（Mega）、好胜毛蟹（mega）、具甲武者（mega）、玛机雅娜（Mega）、玛机雅娜（Original_Mega）、狠辣椒（mega）、晶光花（mega）、米立龙（Droopy_Mega）、米立龙（Stretchy_Mega）、戟脊龙（mega）

**未找到精确战斗素材节点（1）：** 超能妙喵（Female_Mega）

### 2.4 全量逐形态表

“已导入”只说明正式目录存在记录，不能替代本次精确素材结论。“未被首形态选中”是运行时入口缺失，而非素材不足。

|编号|物种|原作身份|当前入口/素材记录|本次素材结论|素材库精确节点|
|---|---|---|---|---|---|
|0003|妙蛙花|`venusaur-mega`|默认可选；无导入素材|仅头像，暂缓|[0003/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0003/0001)|
|0006|喷火龙|`charizard-mega-x`|默认可选；已导入|动作齐全，可排期|[0006/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0006/0001)|
|0006|喷火龙|`charizard-mega-y`|未被首形态选中；无导入素材|仅头像，暂缓|[0006/0002](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0006/0002)|
|0009|水箭龟|`blastoise-mega`|默认可选；无导入素材|仅头像，暂缓|[0009/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0009/0001)|
|0065|胡地|`alakazam-mega`|默认可选；已导入|动作齐全，可排期|[0065/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0065/0001)|
|0094|耿鬼|`gengar-mega`|默认可选；已导入|动作齐全，可排期|[0094/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0094/0001)|
|0115|袋兽|`kangaskhan-mega`|默认可选；已导入|动作齐全，可排期|[0115/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0115/0001)|
|0127|凯罗斯|`pinsir-mega`|默认可选；无导入素材|仅头像，暂缓|[0127/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0127/0001)|
|0130|暴鲤龙|`gyarados-mega`|默认可选；无导入素材|仅头像，暂缓|[0130/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0130/0001)|
|0142|化石翼龙|`aerodactyl-mega`|默认可选；已导入|动作齐全，可排期|[0142/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0142/0001)|
|0150|超梦|`mewtwo-mega-x`|默认可选；无导入素材|仅头像，暂缓|[0150/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0150/0001)|
|0150|超梦|`mewtwo-mega-y`|未被首形态选中；已导入|动作齐全，可排期|[0150/0002](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0150/0002)|
|0181|电龙|`ampharos-mega`|默认可选；无导入素材|仅头像，暂缓|[0181/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0181/0001)|
|0212|巨钳螳螂|`scizor-mega`|默认可选；无导入素材|仅头像，暂缓|[0212/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0212/0001)|
|0214|赫拉克罗斯|`heracross-mega`|默认可选；无导入素材|仅头像，暂缓|[0214/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0214/0001)|
|0229|黑鲁加|`houndoom-mega`|默认可选；已导入|动作齐全，可排期|[0229/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0229/0001)|
|0248|班基拉斯|`tyranitar-mega`|默认可选；已导入|动作齐全，可排期|[0248/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0248/0001)|
|0257|火焰鸡|`blaziken-mega`|默认可选；无导入素材|仅头像，暂缓|[0257/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0257/0001)|
|0282|沙奈朵|`gardevoir-mega`|默认可选；已导入|动作齐全，可排期|[0282/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0282/0001)|
|0303|大嘴娃|`mawile-mega`|默认可选；已导入|动作齐全，可排期|[0303/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0303/0001)|
|0306|波士可多拉|`aggron-mega`|默认可选；无导入素材|仅头像，暂缓|[0306/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0306/0001)|
|0308|恰雷姆|`medicham-mega`|默认可选；已导入|动作齐全，可排期|[0308/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0308/0001)|
|0310|雷电兽|`manectric-mega`|默认可选；已导入|动作齐全，可排期|[0310/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0310/0001)|
|0354|诅咒娃娃|`banette-mega`|默认可选；已导入|动作齐全，可排期|[0354/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0354/0001)|
|0359|阿勃梭鲁|`absol-mega`|默认可选；已导入|动作齐全，可排期|[0359/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0359/0001)|
|0445|烈咬陆鲨|`garchomp-mega`|默认可选；无导入素材|仅头像，暂缓|[0445/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0445/0001)|
|0448|路卡利欧|`lucario-mega`|默认可选；已导入|动作齐全，可排期|[0448/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0448/0001)|
|0460|暴雪王|`abomasnow-mega`|默认可选；无导入素材|仅头像，暂缓|[0460/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0460/0001)|
|0380|拉帝亚斯|`latias-mega`|默认可选；已导入|动作齐全，可排期|[0380/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0380/0001)|
|0381|拉帝欧斯|`latios-mega`|默认可选；已导入|动作齐全，可排期|[0381/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0381/0001)|
|0260|巨沼怪|`swampert-mega`|默认可选；无导入素材|仅头像，暂缓|[0260/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0260/0001)|
|0254|蜥蜴王|`sceptile-mega`|默认可选；已导入|动作不全，暂缓|[0254/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0254/0001)|
|0302|勾魂眼|`sableye-mega`|默认可选；已导入|动作齐全，可排期|[0302/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0302/0001)|
|0334|七夕青鸟|`altaria-mega`|默认可选；已导入|动作齐全，可排期|[0334/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0334/0001)|
|0475|艾路雷朵|`gallade-mega`|默认可选；已导入|动作齐全，可排期|[0475/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0475/0001)|
|0531|差不多娃娃|`audino-mega`|默认可选；无导入素材|仅头像，暂缓|[0531/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0531/0001)|
|0319|巨牙鲨|`sharpedo-mega`|默认可选；已导入|动作齐全，可排期|[0319/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0319/0001)|
|0080|呆壳兽|`slowbro-mega`|默认可选；已导入|动作齐全，可排期|[0080/0002](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0080/0002)|
|0208|大钢蛇|`steelix-mega`|默认可选；已导入|动作齐全，可排期|[0208/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0208/0001)|
|0018|大比鸟|`pidgeot-mega`|默认可选；无导入素材|仅头像，暂缓|[0018/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0018/0001)|
|0362|冰鬼护|`glalie-mega`|默认可选；已导入|动作齐全，可排期|[0362/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0362/0001)|
|0719|蒂安希|`diancie-mega`|默认可选；已导入|动作齐全，可排期|[0719/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0719/0001)|
|0376|巨金怪|`metagross-mega`|默认可选；无导入素材|仅头像，暂缓|[0376/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0376/0001)|
|0384|烈空坐|`rayquaza-mega`|默认可选；已导入|动作齐全，可排期|[0384/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0384/0001)|
|0323|喷火驼|`camerupt-mega`|默认可选；已导入|动作齐全，可排期|[0323/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0323/0001)|
|0428|长耳兔|`lopunny-mega`|默认可选；已导入|动作齐全，可排期|[0428/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0428/0001)|
|0373|暴飞龙|`salamence-mega`|默认可选；无导入素材|仅头像，暂缓|[0373/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0373/0001)|
|0015|大针蜂|`beedrill-mega`|默认可选；无导入素材|仅头像，暂缓|[0015/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0015/0001)|
|0036|皮可西|`clefable-mega`|默认可选；无导入素材|仅头像，暂缓|[0036/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0036/0001)|
|0071|大食花|`victreebel-mega`|默认可选；无导入素材|仅头像，暂缓|[0071/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0071/0001)|
|0121|宝石海星|`starmie-mega`|默认可选；无导入素材|仅头像，暂缓|[0121/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0121/0001)|
|0149|快龙|`dragonite-mega`|默认可选；无导入素材|仅头像，暂缓|[0149/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0149/0001)|
|0154|大竺葵|`meganium-mega`|默认可选；无导入素材|仅头像，暂缓|[0154/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0154/0001)|
|0160|大力鳄|`feraligatr-mega`|默认可选；无导入素材|仅头像，暂缓|[0160/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0160/0001)|
|0227|盔甲鸟|`skarmory-mega`|默认可选；已导入|动作齐全，可排期|[0227/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0227/0001)|
|0478|雪妖女|`froslass-mega`|默认可选；无导入素材|仅头像，暂缓|[0478/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0478/0001)|
|0500|炎武王|`emboar-mega`|默认可选；无导入素材|仅头像，暂缓|[0500/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0500/0001)|
|0530|龙头地鼠|`excadrill-mega`|默认可选；已导入|动作齐全，可排期|[0530/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0530/0001)|
|0545|蜈蚣王|`scolipede-mega`|默认可选；无导入素材|仅头像，暂缓|[0545/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0545/0001)|
|0560|头巾混混|`scrafty-mega`|默认可选；已导入|动作齐全，可排期|[0560/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0560/0001)|
|0604|麻麻鳗鱼王|`eelektross-mega`|默认可选；已导入|动作齐全，可排期|[0604/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0604/0001)|
|0609|水晶灯火灵|`chandelure-mega`|默认可选；无导入素材|仅头像，暂缓|[0609/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0609/0001)|
|0652|布里卡隆|`chesnaught-mega`|默认可选；无导入素材|仅头像，暂缓|[0652/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0652/0001)|
|0655|妖火红狐|`delphox-mega`|默认可选；无导入素材|仅头像，暂缓|[0655/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0655/0001)|
|0658|甲贺忍蛙|`greninja-mega`|默认可选；无导入素材|仅头像，暂缓|[0658/0002](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0658/0002)|
|0668|火炎狮|`pyroar-mega`|默认可选；无导入素材|仅头像，暂缓|[0668/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0668/0001)|
|0670|花叶蒂|`floette-mega`|默认可选；已导入|动作齐全，可排期|[0670/0006](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0670/0006)|
|0687|乌贼王|`malamar-mega`|默认可选；无导入素材|仅头像，暂缓|[0687/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0687/0001)|
|0689|龟足巨铠|`barbaracle-mega`|默认可选；无导入素材|仅头像，暂缓|[0689/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0689/0001)|
|0691|毒藻龙|`dragalge-mega`|默认可选；已导入|动作齐全，可排期|[0691/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0691/0001)|
|0701|摔角鹰人|`hawlucha-mega`|默认可选；已导入|动作齐全，可排期|[0701/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0701/0001)|
|0718|基格尔德|`zygarde-mega`|默认可选；已导入|动作齐全，可排期|[0718/0005](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0718/0005)|
|0780|老翁龙|`drampa-mega`|默认可选；已导入|动作齐全，可排期|[0780/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0780/0001)|
|0870|列阵兵|`falinks-mega`|默认可选；无导入素材|仅头像，暂缓|[0870/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0870/0001)|
|0026|雷丘|`raichu-mega-x`|默认可选；无导入素材|仅头像，暂缓|[0026/0002](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0026/0002)|
|0026|雷丘|`raichu-mega-y`|未被首形态选中；无导入素材|仅头像，暂缓|[0026/0003](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0026/0003)|
|0358|风铃铃|`chimecho-mega`|默认可选；已导入|动作不全，暂缓|[0358/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0358/0001)|
|0359|阿勃梭鲁|`absol-mega-z`|未被首形态选中；无导入素材|仅头像，暂缓|[0359/0002](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0359/0002)|
|0398|姆克鹰|`staraptor-mega`|默认可选；无导入素材|仅头像，暂缓|[0398/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0398/0001)|
|0445|烈咬陆鲨|`garchomp-mega-z`|未被首形态选中；无导入素材|仅头像，暂缓|[0445/0002](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0445/0002)|
|0448|路卡利欧|`lucario-mega-z`|未被首形态选中；无导入素材|仅头像，暂缓|[0448/0002](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0448/0002)|
|0485|席多蓝恩|`heatran-mega`|默认可选；无导入素材|仅头像，暂缓|[0485/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0485/0001)|
|0491|达克莱伊|`darkrai-mega`|默认可选；已导入|动作齐全，可排期|[0491/0002](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0491/0002)|
|0623|泥偶巨人|`golurk-mega`|默认可选；无导入素材|仅头像，暂缓|[0623/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0623/0001)|
|0678|超能妙喵|`meowstic-male-mega`|默认可选；无导入素材|仅头像，暂缓|[0678/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0678/0001)|
|0740|好胜毛蟹|`crabominable-mega`|默认可选；无导入素材|仅头像，暂缓|[0740/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0740/0001)|
|0768|具甲武者|`golisopod-mega`|默认可选；无导入素材|仅头像，暂缓|[0768/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0768/0001)|
|0801|玛机雅娜|`magearna-mega`|默认可选；无导入素材|仅头像，暂缓|[0801/0002](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0801/0002)|
|0801|玛机雅娜|`magearna-original-mega`|未被首形态选中；无导入素材|仅头像，暂缓|[0801/0003](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0801/0003)|
|0807|捷拉奥拉|`zeraora-mega`|默认可选；已导入|动作齐全，可排期|[0807/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0807/0001)|
|0952|狠辣椒|`scovillain-mega`|默认可选；无导入素材|仅头像，暂缓|[0952/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0952/0001)|
|0970|晶光花|`glimmora-mega`|默认可选；无导入素材|仅头像，暂缓|[0970/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0970/0001)|
|0978|米立龙|`tatsugiri-curly-mega`|默认可选；已导入|动作齐全，可排期|[0978/0003](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0978/0003)|
|0978|米立龙|`tatsugiri-droopy-mega`|未被首形态选中；已导入|仅头像，暂缓|[0978/0005](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0978/0005)|
|0978|米立龙|`tatsugiri-stretchy-mega`|未被首形态选中；已导入|仅头像，暂缓|[0978/0004](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0978/0004)|
|0998|戟脊龙|`baxcalibur-mega`|默认可选；无导入素材|仅头像，暂缓|[0998/0001](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0998/0001)|
|0678|超能妙喵|`meowstic-female-mega`|未被首形态选中；无导入素材|无对应战斗素材，暂缓|—|

### 2.5 Mega机制补全范围

- 用稳定`speciesId + formKey`索引资格、形态、属性、六维、特性与素材，取代所有`mega[0]`。兼容既有只存全国编号的存档，不把颜色/性别误当新全国编号。
- 仅在素材合格的精确分支上开放按钮。超梦当前可做Y，X待素材；喷火龙当前可做X，Y待素材；其他新Z分支同理。
- 对花叶蒂永恒之花等特殊来源形态、雌雄、地区形态、米立龙姿态明确前置条件；普通花叶蒂不能无条件冒充永恒之花来源。
- 特性当前是通用适配分组，不是每个原作特性独立实现。需单独设计亲子爱、天气、皮肤类属性转换等关键差异，并明确其幸存者改编。
- Mega换动画后重算方向、尺寸、脚点、碰撞半径与受击高度；当前仅换Animator不足以证明完整形态适配。
- 区分经典Mega、Z-A能量制和Mega Z分支机制。持续30秒、每局一次等现有规则属于本作设计，不能叫原作精确还原。

## 3. Z招式：缺物种、形态与机制

### 3.1 通用Z

通用攻击Z按**基础招式的属性、物理/特殊类别和威力**转换，不按宝可梦第一属性；变化招式应走强化/恢复/重置等Z效果。通用Z不是19个专属物种的白名单。

当前只有`z-burst`：伤害模板90、半径220、立即范围命中；取自身第一属性，伤害类别取当前主动招式。原作18属性转换、基础威力映射、变化Z、纯晶/解锁条件均未完成。

本作可以保留“一局一次、蓄满能量发动”的实时适配，但必须在说明中与原作持有纯晶规则区分。是否将后世代物种纳入通用Z应作为“跨世代适配”明确配置，不能伪称第七世代原作可用。

### 3.2 专属Z的完整17招名单

以下17招目前均缺独立实现；19个相关基础物种全部已经在当前图鉴，但拥有普通物种不等于拥有所需地区/特殊形态。

|使用者/精确形态|专属Z|所需基础招式|当前素材判断与排期|
|---|---|---|---|
|阿罗拉雷丘|驾雷驭电戏冲浪|十万伏特|地区形态动作齐全，未独立接入；可排期，不能给普通雷丘冒用|
|普通狙射树枭|遮天蔽日暗影箭|缝影|原形素材可用；洗翠形态不自动纳入|
|伊布|九彩升华齐聚顶|珍藏|原形素材可用；必须是强化机制，非爆炸|
|炽焰咆哮虎|极恶飞跃粉碎击|DD金勾臂|原形素材可用|
|杖尾鳞甲龙|炽魂热舞烈音爆|鳞片噪音|原形素材可用；霸主体型作为同外形资格分支，不声称有独立新素材|
|露奈雅拉／奈克洛兹玛拂晓之翼|月华飞溅落灵霄|暗影之光|露奈雅拉可排期；拂晓之翼仅头像，暂缓该使用者分支|
|鬃岩狼人白昼／黑夜／黄昏|狼啸石牙飓风暴|尖石攻击|三种形态素材均齐全；黑夜/黄昏尚需独立形态入口|
|玛夏多|七星夺魂腿|暗影偷盗|原形素材可用|
|梦幻|起源超新星大爆炸|精神强念|原形素材可用，基础招式已存在|
|谜拟丘化形／现形|亲密无间大乱揍|嬉闹|两种素材齐全；现形及画皮状态转换尚需接入；霸主不算独立新外观|
|普通皮卡丘|皮卡皮卡必杀击|伏特攻击|原形素材可用|
|7款第七世代戴帽皮卡丘|千万伏特|十万伏特|初始/丰缘/神奥/合众/卡洛斯/阿罗拉/就决定是你了：均只有头像，全部暂缓；世界帽不属此原作名单|
|西狮海壬|海神庄严交响乐|泡影的咏叹调|原形素材可用|
|卡比兽|认真起来大爆击|终极冲击|原形素材可用|
|索尔迦雷欧／奈克洛兹玛黄昏之鬃|日光回旋下苍穹|流星闪冲|索尔迦雷欧可排期；黄昏之鬃仅头像，暂缓该使用者分支|
|四位卡璞|巨人卫士·阿罗拉|自然之怒|四种原形素材可用；比例伤害需首领上限，避免无条件秒杀|
|究极奈克洛兹玛|焚天灭世炽光爆|光子喷涌|究极形态动作齐全，但究极爆发前置系统未做且两融合前置形态缺素材；完整原作路线暂缓，不直接给普通奈克洛兹玛|

16个不同基础招式中，当前只定义了**十万伏特、精神强念**；其余14个缺失：缝影、珍藏、DD金勾臂、鳞片噪音、暗影之光、尖石攻击、暗影偷盗、嬉闹、伏特攻击、泡影的咏叹调、终极冲击、流星闪冲、自然之怒、光子喷涌。定义存在仍不等于每个合法使用者已经能学到，应同时核验物种技能池。

### 3.3 Z精确形态素材明细

|编号|物种|形态|素材结论|形态库路径|
|---|---|---|---|---|
|0025|皮卡丘|普通形态|动作齐全，可排期|0025|
|0133|伊布|普通形态|动作齐全，可排期|0133|
|0143|卡比兽|普通形态|动作齐全，可排期|0143|
|0151|梦幻|普通形态|动作齐全，可排期|0151|
|0724|狙射树枭|普通形态|动作齐全，可排期|0724|
|0727|炽焰咆哮虎|普通形态|动作齐全，可排期|0727|
|0730|西狮海壬|普通形态|动作齐全，可排期|0730|
|0778|谜拟丘|普通形态|动作齐全，可排期|0778|
|0785|卡璞・鸣鸣|普通形态|动作齐全，可排期|0785|
|0786|卡璞・蝶蝶|普通形态|动作齐全，可排期|0786|
|0787|卡璞・哞哞|普通形态|动作齐全，可排期|0787|
|0788|卡璞・鳍鳍|普通形态|动作齐全，可排期|0788|
|0791|索尔迦雷欧|普通形态|动作齐全，可排期|0791|
|0792|露奈雅拉|普通形态|动作齐全，可排期|0792|
|0802|玛夏多|普通形态|动作齐全，可排期|0802|
|0784|杖尾鳞甲龙|普通形态|动作齐全，可排期|0784|
|0778|谜拟丘|Busted|动作齐全，可排期|0778/0001|
|0026|雷丘|Alola|动作齐全，可排期|0026/0001|
|0025|皮卡丘|Original_Cap|仅头像，暂缓|0025/0008|
|0025|皮卡丘|Hoenn_Cap|仅头像，暂缓|0025/0009|
|0025|皮卡丘|Sinnoh_Cap|仅头像，暂缓|0025/0010|
|0025|皮卡丘|Unova_Cap|仅头像，暂缓|0025/0011|
|0025|皮卡丘|Kalos_Cap|仅头像，暂缓|0025/0012|
|0025|皮卡丘|Alola_Cap|仅头像，暂缓|0025/0013|
|0025|皮卡丘|Partner_Cap|仅头像，暂缓|0025/0014|
|0745|鬃岩狼人|普通形态|动作齐全，可排期|0745|
|0745|鬃岩狼人|Midnight|动作齐全，可排期|0745/0001|
|0745|鬃岩狼人|Dusk|动作齐全，可排期|0745/0002|
|0800|奈克洛兹玛|Dusk_Mane|仅头像，暂缓|0800/0001|
|0800|奈克洛兹玛|Dawn_Wings|仅头像，暂缓|0800/0002|
|0800|奈克洛兹玛|Ultra|动作齐全，可排期|0800/0003|

专属招式特效需要逐招用现有引擎特效组合设计并验收；本次核对的是角色形态素材，不将角色动作齐全推断为库内已有17套原作Z招式过场。

## 4. 普通极巨化与超极巨化

### 4.1 普通极巨化

- 原作普通极巨化沿用角色原模型，故正确基础角色动作齐全时不需要为每只寻找一套新“巨型精灵图”。
- 当前20秒、最大生命+50%、伤害+20%只是统一增益；缺18属性极巨攻击转换、变化招式转换极巨防壁，以及天气、场地、能力变化等区别。
- 需独立配置剑盾可用资格，禁止苍响、藏玛然特、无极汰那；剧情无极巨化不作为玩家按钮。后世代物种如继续允许发动，应明确列为本作适配。
- 招式转换与当前学习招式绑定，不能只改外观；转换结束恢复原招式等级与冷却，不改永久收藏与基础形态。
- 普通极巨化与Mega互斥，不能叠加形态增益；死亡、退出、重连、时间到必须撤销临时生命和碰撞体变化。

### 4.2 超极巨化

本次**34条均不满足战斗素材准入**。其中喷火龙、霜奶仙仅有Idle/Rotate，缺移动和攻击；15条仅头像，17条无对应精灵/头像素材或空节点。

其中基础物种巨炭山（839）、大王铜象（879）也尚未入当前图鉴。即使以后补入普通形态，也不等于补入超极巨化。

|编号|物种|精确形态身份|基础物种已入游戏|素材结论|
|---|---|---|---|---|
|0003|妙蛙花|`venusaur-gmax`|是|仅头像，暂缓|
|0006|喷火龙|`charizard-gmax`|是|动作不全，暂缓|
|0009|水箭龟|`blastoise-gmax`|是|仅头像，暂缓|
|0012|巴大蝶|`butterfree-gmax`|是|仅头像，暂缓|
|0025|皮卡丘|`pikachu-gmax`|是|仅头像，暂缓|
|0052|喵喵|`meowth-gmax`|是|仅头像，暂缓|
|0068|怪力|`machamp-gmax`|是|仅头像，暂缓|
|0094|耿鬼|`gengar-gmax`|是|仅头像，暂缓|
|0099|巨钳蟹|`kingler-gmax`|是|无对应战斗素材，暂缓|
|0131|拉普拉斯|`lapras-gmax`|是|仅头像，暂缓|
|0133|伊布|`eevee-gmax`|是|仅头像，暂缓|
|0143|卡比兽|`snorlax-gmax`|是|仅头像，暂缓|
|0569|灰尘山|`garbodor-gmax`|是|无对应战斗素材，暂缓|
|0809|美录梅塔|`melmetal-gmax`|是|仅头像，暂缓|
|0812|轰擂金刚猩|`rillaboom-gmax`|是|无对应战斗素材，暂缓|
|0815|闪焰王牌|`cinderace-gmax`|是|无对应战斗素材，暂缓|
|0818|千面避役|`inteleon-gmax`|是|无对应战斗素材，暂缓|
|0823|钢铠鸦|`corviknight-gmax`|是|无对应战斗素材，暂缓|
|0826|以欧路普|`orbeetle-gmax`|是|无对应战斗素材，暂缓|
|0834|暴噬龟|`drednaw-gmax`|是|无对应战斗素材，暂缓|
|0839|巨炭山|`coalossal-gmax`|否|无对应战斗素材，暂缓|
|0841|苹裹龙|`flapple-gmax`|是|仅头像，暂缓|
|0842|丰蜜龙|`appletun-gmax`|是|无对应战斗素材，暂缓|
|0844|沙螺蟒|`sandaconda-gmax`|是|仅头像，暂缓|
|0849|颤弦蝾螈|`toxtricity-amped-gmax`|是|无对应战斗素材，暂缓|
|0851|焚焰蚣|`centiskorch-gmax`|是|无对应战斗素材，暂缓|
|0858|布莉姆温|`hatterene-gmax`|是|无对应战斗素材，暂缓|
|0861|长毛巨魔|`grimmsnarl-gmax`|是|仅头像，暂缓|
|0869|霜奶仙|`alcremie-gmax`|是|动作不全，暂缓|
|0879|大王铜象|`copperajah-gmax`|否|无对应战斗素材，暂缓|
|0884|铝钢龙|`duraludon-gmax`|是|仅头像，暂缓|
|0892|武道熊师|`urshifu-single-strike-gmax`|是|无对应战斗素材，暂缓|
|0892|武道熊师|`urshifu-rapid-strike-gmax`|是|无对应战斗素材，暂缓|
|0849|颤弦蝾螈|`toxtricity-low-key-gmax`|是|无对应战斗素材，暂缓|

超极巨化待素材就绪后，仍需：物种与个体资格、精确模型、各专属超极巨招式、不同流派映射与联机形态同步。不能靠新增34条数据或把普通形态放大来宣称完成。

## 5. 分阶段补全方案（尚未执行）

|优先级|内容|本轮方案的验收门槛|
|---|---|---|
|P0|修正素材/形态索引与资格审计|按精确形态标记可用、部分、仅头像、缺失；不再把Idle回退算攻击；米立龙不串姿态；保存旧存档兼容性|
|P1|完成现有40条合格Mega的入口与关键机制|超梦Y可独立选择；无素材分支不冒充；六维/属性/特性、形态前置、视觉和碰撞体一致；形态结束全部恢复|
|P2|通用Z转换与首批专属Z|先做现有普通形态可用的招式及14个缺失前置招式；按属性/物特/威力转换；伊布强化、卡璞比例伤害等不可统一爆炸|
|P3|接入素材齐全的地区/其他形态|阿罗拉雷丘、黑夜/黄昏鬃岩狼人、现形谜拟丘；兼容存档、技能池、资格与联机。究极奈克洛兹玛先保留候选，不跳过缺素材的原作前置路线|
|P4|普通极巨化机制|资格策略、极巨招式转换、极巨防壁与环境效果；无需伪造新物种立绘；手机体型/遮挡与碰撞明确|
|等待素材|其余57条Mega、7款帽子皮卡丘、黄昏之鬃/拂晓之翼、全部超极巨化|素材库出现精确形态的真实待机/移动/攻击后再重跑同一审计；不导入头像充数、不手绘替代、不以普通放大充数|

建议首批专属Z可按**皮卡丘、梦幻、伊布**三种机制试点：物理爆发、特殊爆发、强化。其余以同一机制基础继续，但每招保持独立条件与战斗差异，不承诺将原作回合效果直接搬成秒数。

### 实施时的测试矩阵

- 每个允许形态均验证对应PNG/元数据哈希、真实动作、方向、脚点、体型、碰撞与名称；每个暂缓形态验证不会误用按钮。
- 每个Z招式验证合法物种/精确形态/基础招式，物理与特殊计算，强化/比例伤害上限，单局次数和能量消耗；错误条件不得消耗资源。
- 极巨化/Mega验证结束、死亡、离房和重连后六维/生命/伤害/体型无残留；不能连续切换刷血或叠加倍率。
- 房主与客户端验证同一形态、同一招式效果、重复事件幂等、伤害由权威端结算；八人特效有预算。
- 桌面、手机触控、手柄分别验证选形态、切换和发动；保留原输入不抢焦点。
- 完成这些才做回归、构建、发布。本轮没有运行玩法测试，也没有发布任何新功能。

## 6. 来源与本次验证证据

原作详细名单、17招及前置、34条超极巨招式键与官方规则链接见 [原作来源核对](SPECIAL_FORMS_ORIGINAL_SOURCES.md)。

- SpriteCollab当日HEAD：[`afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d`](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d)。
- PokeAPI当日HEAD：[`81d20919845b6a445969b9265aab5cec6b04cece`](https://github.com/PokeAPI/pokeapi/tree/81d20919845b6a445969b9265aab5cec6b04cece/data/v2/csv)。
- 正式目录现有44条Mega记录共308个PNG哈希与记录逐一核对，失败0；哈希正确并不代表形态映射正确，米立龙复用问题即例证。
- 可复核证据在 `artifacts/special-forms-audit/`：`audit.py`、`audit.json`、`raw/`下实际XML/PNG、固定版本CSV及`extra-evidence.json`。这些是研究缓存，不进入游戏素材目录。
- 执行命令：`python artifacts/special-forms-audit/audit.py`（Windows控制台使用UTF-8）；最终执行退出码0，Mega97、Gmax34、Z精确外观31行，网络/图片验证失败0。
