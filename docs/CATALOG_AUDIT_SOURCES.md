# 图鉴补全：数据与现有素材库核对

核对日期：2026-10-16（Asia/Tokyo）。本文件是导入前资料审计，不代表所有物种已完成入库或游戏验收。

## 全国编号边界

- [宝可梦官方全国图鉴](https://www.pokemon.com/pokedex/) 当前检索范围为 1–1025；[官方桃歹郎页面](https://sg.portal-pokemon.com/pokedex/1025/) 明确标注 No.1025。以此作为本次既有全国编号补全边界。
- [PokeAPI 主数据 pokemon_species.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon_species.csv) 本次直接读取到末两行为 1024 Terapagos、1025 Pecharunt，覆盖该编号范围；其 pokemon/种族数据和六维仍应按 species ID、默认 variety 对齐，不把额外形态的高位 pokemon ID 当新物种。[接口定义](https://pokeapi.co/docs/v2#pokemon-species) 区分物种、品种与形态。
- 不能写成“全世界只存在 1025 种已公开宝可梦”：[Winds / Waves 官方公告页](https://windswaves.pokemon.com/en-us/) 已公布 Browt、Pombon、Gecqua 及 2027 年发售安排，但本次官方全国图鉴和 PokeAPI 主数据没有给出其正式全国编号。因此不自行分配 1026+，也不从推测补入正式目录。
- 在线 pokeapi.co API 本次请求返回 HTTP 403；上述覆盖结论来自其维护方公开主数据仓库，不宣称在线 API 本次成功响应。

## 素材快照与审计方法

- SpriteCollab 固定版本：[`afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d`](https://github.com/PMDCollab/SpriteCollab/tree/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d)。本地 `tools/cache/catalog-expansion/revision.txt` 与 `tracker.json` 对齐；tracker SHA-256 为 `d10ecfab7d9c9c3b553c4396e6967c92d7ff60ad715022f5638c00dcfbaeaf9c`。
- 对照导入前 `G.DEX` 966 个全国编号，本次缺 59 个。现有 `tools/fetch_pokedex.py` 和 `tools/fetch_sprites.py` 只检查物种根节点且强制同时出现 Idle、Walk、Attack；这会排除嵌套形态，以及使用 Swing / Shoot 的真实攻击动画。
- 递归检查 tracker 的 subgroups，排除 Shiny 作为普通素材；检查候选的实际 AnimData.xml、帧数和 CopyOf，而不是仅看 sprite_complete。tracker 中 sprite_files 键的 false 值不是“文件缺失”的判据。
- 对全部 59 个物种的固定版本 `portrait/NNNN/Normal.png` 实际请求均成功：59 / 59 为有效 PNG，尺寸全部为 40×40。这里只读验证，未写入正式素材目录。
- [素材库说明](https://github.com/PMDCollab/SpriteCollab/blob/master/README.md) 明确区分 Overworld Sprite 与 Portrait；头像存在不等于行走／攻击动画存在。其内容使用约定要求非商业并署名；导入应继续沿用项目已有作者 credits 和来源记录。

## 结论：59 个缺失物种的素材分类

|类别|数量|含义|
|---|---:|---|
|嵌套形态有 Idle / Walk / Attack|4|870、999、1003、1008；形态含义需标注|
|有 Idle / Walk 与真实 Swing / Shoot 攻击|5|593、668、865、948、1025；现有根节点筛选误排|
|仅部分精灵动画|9|不具备完整待机／移动／真实攻击组合；含879只有待机与行走|
|仅头像、无任何精灵动画键|41|可作为同库头像，但不可称已有完整战斗动画|
|头像也缺失|0|59个均实际验证有Normal.png|

“具备游戏所需三种动画”不等于 SpriteCollab 将整套全部动作标记为 fully featured。其余 Hurt / Faint 等仍按导入器明确回退；不得把 Idle 回退声称为真实攻击动作。

### 可用真实动画候选（已读取固定版本 AnimData.xml）

|编号|物种|路径|实际动作|注意|
|---:|---|---|---|---|
|593|胖嘟嘟 / Jellicent|[sprite/0593](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0593/AnimData.xml)|Idle / Walk / Swing|同种普通雄性；Swing 对应攻击|
|668|火炎狮 / Pyroar|[sprite/0668/0000/0000/0002](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0668/0000/0000/0002/AnimData.xml)|Idle / Walk / Swing / Double|Female；需明确使用雌性形态|
|865|葱游兵 / Sirfetch_d|[sprite/0865](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0865/AnimData.xml)|Idle / Walk / Swing / Double|Swing 对应攻击|
|870|列阵兵 / Falinks|[sprite/0870/0002](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0870/0002/AnimData.xml)|Idle / Walk / Attack / Shoot|Brass 单兵；另有 0870/0003 Trooper；不是整队精灵|
|948|原野水母 / Toedscool|[sprite/0948](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0948/AnimData.xml)|Idle / Walk / Swing / Double|Swing 对应攻击|
|999|索财灵 / Gimmighoul|[sprite/0999/0001](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/0999/0001/AnimData.xml)|Idle / Walk / Attack / Shoot|Roaming 游走形态；Shoot CopyOf RearUp|
|1003|古鼎鹿 / Ting_Lu|[sprite/1003/0001](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/1003/0001/AnimData.xml)|Idle / Walk / Attack / Shoot|库内名称 Temp，属于临时视觉版本|
|1008|密勒顿 / Miraidon|[sprite/1008/0001](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/1008/0001/AnimData.xml)|Idle / Walk / Attack / Shoot|Low_Power 低功率形态|
|1025|桃歹郎 / Pecharunt|[sprite/1025](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/sprite/1025/AnimData.xml)|Idle / Walk / Swing / Shoot|Shoot CopyOf Charge；Swing 有独立9帧|

实际 XML 采样：593 Swing 9帧；668 Swing 9帧／Double 16帧；865 Swing 9帧；948 Swing 9帧；1025 Swing 9帧。870 两个候选 Attack 均10帧；999 Attack 13帧；1003 Attack14帧；1008 Attack11帧。879 XML仅 Walk4帧、Idle1帧，没有攻击动作。

### 导入前完整缺失名单

下表“部分动画”只表示已有若干动作，不承诺这些动作可直接构成完整角色。每行头像链接已实际核验有效；真实动画按上节形态路径处理。

|编号|物种（素材库名称）|分类|根节点已有精灵动作|同库头像|
|---:|---|---|---|---|
|514|爆香猿 / Simisear|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0514/Normal.png)|
|516|冷水猿 / Simipour|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0516/Normal.png)|
|520|咕咕鸽 / Tranquill|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0520/Normal.png)|
|522|斑斑马 / Blitzle|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0522/Normal.png)|
|523|雷电斑马 / Zebstrika|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0523/Normal.png)|
|538|投摔鬼 / Throh|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0538/Normal.png)|
|558|岩殿居蟹 / Crustle|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0558/Normal.png)|
|564|原盖海龟 / Tirtouga|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0564/Normal.png)|
|565|肋骨海龟 / Carracosta|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0565/Normal.png)|
|591|败露球菇 / Amoonguss|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0591/Normal.png)|
|592|轻飘飘 / Frillish|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0592/Normal.png)|
|593|胖嘟嘟 / Jellicent|真实动画候选|Walk,Sleep,Idle,Rotate,Swing|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0593/Normal.png)|
|616|小嘴蜗 / Shelmet|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0616/Normal.png)|
|618|泥巴鱼 / Stunfisk|部分动画|Idle,Rotate|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0618/Normal.png)|
|626|爆炸头水牛 / Bouffalant|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0626/Normal.png)|
|668|火炎狮 / Pyroar|真实动画候选|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0668/Normal.png)|
|683|芳香精 / Aromatisse|部分动画|Idle,Rotate|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0683/Normal.png)|
|732|喇叭啄鸟 / Trumbeak|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0732/Normal.png)|
|733|铳嘴大鸟 / Toucannon|部分动画|Idle,Rotate|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0733/Normal.png)|
|735|猫鼬探长 / Gumshoos|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0735/Normal.png)|
|756|灯罩夜菇 / Shiinotic|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0756/Normal.png)|
|765|智挥猩 / Oranguru|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0765/Normal.png)|
|837|小炭仔 / Rolycoly|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0837/Normal.png)|
|838|大炭车 / Carkol|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0838/Normal.png)|
|839|巨炭山 / Coalossal|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0839/Normal.png)|
|865|葱游兵 / Sirfetch_d|真实动画候选|Walk,Idle,Swing,Double,Rotate|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0865/Normal.png)|
|866|踏冰人偶 / Mr_Rime|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0866/Normal.png)|
|870|列阵兵 / Falinks|真实动画候选|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0870/Normal.png)|
|878|铜象 / Cufant|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0878/Normal.png)|
|879|大王铜象 / Copperajah|部分动画|Walk,Idle,Rotate|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0879/Normal.png)|
|893|萨戮德 / Zarude|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0893/Normal.png)|
|929|奥利纽 / Dolliv|部分动画|Idle,Rotate|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0929/Normal.png)|
|931|怒鹦哥 / Squawkabilly|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0931/Normal.png)|
|942|偶叫獒 / Maschiff|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0942/Normal.png)|
|943|獒教父 / Mabosstiff|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0943/Normal.png)|
|944|滋汁鼹 / Shroodle|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0944/Normal.png)|
|945|涂标客 / Grafaiai|部分动画|Idle,Rotate|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0945/Normal.png)|
|947|怖纳噬草 / Brambleghast|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0947/Normal.png)|
|948|原野水母 / Toedscool|真实动画候选|Walk,Sleep,Idle,Rotate,Swing,Double|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0948/Normal.png)|
|949|陆地水母 / Toedscruel|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0949/Normal.png)|
|950|毛崖蟹 / Klawf|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0950/Normal.png)|
|954|虫甲圣 / Rabsca|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0954/Normal.png)|
|956|超能艳鸵 / Espathra|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0956/Normal.png)|
|962|下石鸟 / Bombirdier|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0962/Normal.png)|
|973|缠红鹤 / Flamigo|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0973/Normal.png)|
|986|猛恶菇 / Brute_Bonnet|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0986/Normal.png)|
|990|铁辙迹 / Iron_Treads|部分动画|Sleep,Idle,Rotate|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0990/Normal.png)|
|993|铁脖颈 / Iron_Jugulis|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0993/Normal.png)|
|999|索财灵 / Gimmighoul|真实动画候选|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/0999/Normal.png)|
|1001|古简蜗 / Wo_Chien|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/1001/Normal.png)|
|1002|古剑豹 / Chien_Pao|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/1002/Normal.png)|
|1003|古鼎鹿 / Ting_Lu|真实动画候选|Idle,Rotate|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/1003/Normal.png)|
|1008|密勒顿 / Miraidon|真实动画候选|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/1008/Normal.png)|
|1014|够赞狗 / Okidogi|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/1014/Normal.png)|
|1020|破空焰 / Gouging_Fire|部分动画|Idle,Rotate|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/1020/Normal.png)|
|1021|猛雷鼓 / Raging_Bolt|部分动画|Idle,Swing,Double,Rotate,Sleep|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/1021/Normal.png)|
|1022|铁磐岩 / Iron_Boulder|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/1022/Normal.png)|
|1023|铁头壳 / Iron_Crown|仅头像|—|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/1023/Normal.png)|
|1025|桃歹郎 / Pecharunt|真实动画候选|Walk,Shoot,Twirl,Sleep,Hurt,Idle,Charge,Rotate,Swing|[Normal.png](https://raw.githubusercontent.com/PMDCollab/SpriteCollab/afef3762a2e5cdf9cf88957aa3f9dff43ec88e8d/portrait/1025/Normal.png)|

## 对实现的建议（推论，不是来源事实）

1. 全国图鉴数据先按 1–1025 稳定身份组织；新增编号不改变旧存档 dex key。
2. 真正动画候选走明确的 `sourcePath` 与动画别名，导入时解析 CopyOf；正常／异色分别记录来源，不能只换目录尾缀。
3. 形态选择保留作者视觉含义。特别是列阵兵单兵、古鼎鹿 Temp、索财灵游走、密勒顿低功率，不能将其无标注描述为标准形态动画齐全。
4. 对剩余 50 个物种，若采用同库头像作为临时战斗视觉，应显式保存 portrait-fallback 标志；移动／受击可以由引擎程序化表现，但不能把程序化缩放或移动称为素材库真实帧动画。等待上游补全后，可不改全国编号替换为动画。
5. 六维可从 PokeAPI 保存为原作 base stats；幸存者数值、初始招式、物种技能池与特性属于游戏平衡设计，独立配置并验证物攻／特攻、本系、至少一个开局可用主动技能。不需要凭空编造原作六维。
6. 本轮审计不测试获取概率、抽卡、多人同步、像素缩放和各尺寸UI；这些由实际导入阶段单独验收。

## 本次实施范围确认

用户本次选择只加入具有可用战斗素材的物种。因此候选新增为 9 个（966 → 975），不使用头像冒充战斗动画；另外 50 个仍保留为后续待补，不写成“全图鉴已补齐”。上表中 9 个“真实动画候选”为本次导入候选，9 个“部分动画”与 41 个“仅头像”合计 50 个待补。中文名称来自 [PokeAPI pokemon_species_names.csv（zh-Hans，language ID 12）](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon_species_names.csv)，按全国编号对齐。

### 本次 9 个导入候选

- #0593 胖嘟嘟（Jellicent）
- #0668 火炎狮（Pyroar）
- #0865 葱游兵（Sirfetch_d）
- #0870 列阵兵（Falinks）
- #0948 原野水母（Toedscool）
- #0999 索财灵（Gimmighoul）
- #1003 古鼎鹿（Ting_Lu）
- #1008 密勒顿（Miraidon）
- #1025 桃歹郎（Pecharunt）

### 仍缺可用完整战斗动画的 50 个物种

- #0514 爆香猿（Simisear）
- #0516 冷水猿（Simipour）
- #0520 咕咕鸽（Tranquill）
- #0522 斑斑马（Blitzle）
- #0523 雷电斑马（Zebstrika）
- #0538 投摔鬼（Throh）
- #0558 岩殿居蟹（Crustle）
- #0564 原盖海龟（Tirtouga）
- #0565 肋骨海龟（Carracosta）
- #0591 败露球菇（Amoonguss）
- #0592 轻飘飘（Frillish）
- #0616 小嘴蜗（Shelmet）
- #0618 泥巴鱼（Stunfisk）
- #0626 爆炸头水牛（Bouffalant）
- #0683 芳香精（Aromatisse）
- #0732 喇叭啄鸟（Trumbeak）
- #0733 铳嘴大鸟（Toucannon）
- #0735 猫鼬探长（Gumshoos）
- #0756 灯罩夜菇（Shiinotic）
- #0765 智挥猩（Oranguru）
- #0837 小炭仔（Rolycoly）
- #0838 大炭车（Carkol）
- #0839 巨炭山（Coalossal）
- #0866 踏冰人偶（Mr_Rime）
- #0878 铜象（Cufant）
- #0879 大王铜象（Copperajah）
- #0893 萨戮德（Zarude）
- #0929 奥利纽（Dolliv）
- #0931 怒鹦哥（Squawkabilly）
- #0942 偶叫獒（Maschiff）
- #0943 獒教父（Mabosstiff）
- #0944 滋汁鼹（Shroodle）
- #0945 涂标客（Grafaiai）
- #0947 怖纳噬草（Brambleghast）
- #0949 陆地水母（Toedscruel）
- #0950 毛崖蟹（Klawf）
- #0954 虫甲圣（Rabsca）
- #0956 超能艳鸵（Espathra）
- #0962 下石鸟（Bombirdier）
- #0973 缠红鹤（Flamigo）
- #0986 猛恶菇（Brute_Bonnet）
- #0990 铁辙迹（Iron_Treads）
- #0993 铁脖颈（Iron_Jugulis）
- #1001 古简蜗（Wo_Chien）
- #1002 古剑豹（Chien_Pao）
- #1014 够赞狗（Okidogi）
- #1020 破空焰（Gouging_Fire）
- #1021 猛雷鼓（Raging_Bolt）
- #1022 铁磐岩（Iron_Boulder）
- #1023 铁头壳（Iron_Crown）
