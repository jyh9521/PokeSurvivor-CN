> 当前0.16.8的Cloudflare TURN兜底、免费额度保护与NAS部署以 [TURN_0168.md](TURN_0168.md) 为准；下文保留历史版本记录。

# 0.16.7：原版生命成长与房主 P2P

基线：`e08027b39d07aad60a093c28886c0501dcdae4e0`（0.16.6）。当前通信协议13，账号存档仍为schema3。

## 修改前后与已复现根因

| 项目 | 基线 | 本轮 |
|---|---|---|
| 生命强化 | 每次最大生命/当前生命各＋10，6级封顶 | 每次各＋20，无升级次数上限；其余被动6级及四被动槽不变 |
| 同一角色连续选择12次生命 | 接受6次，最大生命＋60 | 接受12次，最大生命＋240；联机接收方保留12级 |
| SDP前的1个ICE候选 | 丢弃，应用0个 | 按协商attempt有界暂存，设置远端SDP后应用1个 |
| RTC不可用时的帧、事件重试与探测探针 | 差分夹具经NAS发送4包 | 发送0包；大厅阻止开始，不将卡顿隐藏为NAS回退 |
| 快照与事件 | 同一有序可靠DataChannel | 快照独立无序、maxRetransmits=0；事件、确认和检查点走可靠通道 |
| 同步上限 | 房间固定10Hz | 健康直连上限30Hz，队列压力时降至25/20/15/10/5Hz；丢弃过期快照，不丢可靠事件 |
| NAS短断 | 同时拆除RTC | 保留已鉴权RTC，重新连接NAS控制通道；明确撤销登录仍立即断开 |
| 房主转移 | 仅大厅，运行中的Coop.host固定 | 大厅重建主机星形拓扑；战斗中先验证候选新主机拓扑，再冻结/排空/交接并切换战斗权威 |
| 房间刷新 | HTTP旧快照能覆盖较新的WebSocket社交状态 | 服务器generation＋单调revision，忽略同generation过期快照 |

前三项新增回归在改动前实际失败，输出见`artifacts/p2p-0167/red-tests.txt`。额外的HTTP/WS竞争也在真实Chrome测试中复现：第三人已加入，但房主仍被旧HTTP响应覆盖为两人，因此没有向第三人发起RTC。上述是已确认代码缺陷，不将本机复现冒充玩家具体运营商网络的诊断结果。

## 当前传输和交接

- NAS保留账号鉴权、双份存档、排行榜、在线大厅、邀请、房间、开局信令及主机交接回执。服务器拒绝`f`、`rtc-wire`及其他非信令战斗包，客户端也不再向NAS补送战斗事件。
- 房主浏览器负责敌人生成/AI/生命/击杀、掉落和团队经验；每位玩家保留自己的移动、招式、被动、精通和特殊形态。远近程攻击的原有权威结算不变。
- 短暂ICE disconnected保留5秒恢复窗口，协商20秒超时；已失败协商延迟15秒重试。早到ICE按attempt隔离，最多两个attempt、每个64个候选；旧房间/旧连接的数据不进入新连接。
- 战斗转移入口：房主暂停菜单的“转移主机 → 队友”。所有人完成升级/道具/融合选择、无待处理等级且正常战斗时可用；按钮是普通可聚焦按钮，沿用现有手柄UI导航。
- NAS先授权候选新主机与所有队友协商，但原主机仍保有权威。随后所有客户端冻结、排空原可靠事件。候选主机的整个直连拓扑必须先成功，才接受检查点；失败会中止并保留原主机和原局。
- 检查点通过RTC切片发送（每片8000字符，总量上限8Mi字符），包括世界seed/地形破坏、完整敌人及AI/阶段/燃烧等计时器、暂存地图敌人、拾取物、刷怪、裂隙、审判、事件/NPC、天气、危险区、团队经验/货币、助攻贡献及近战/战斗事件去重栅栏。每位玩家的本地招式实例/形态/精通、弹幕与友方技能场不清空重建。
- 恢复Enemy/Animator方法和minion关联，不把JSON对象当实例；恢复NPC原来的跟随目标、审判命中记录和裂隙序列号。新主机不会因恢复敌人而额外计入“生成”遥测。
- 候选接收完毕向NAS提交nonce＋epoch回执。仅原房主可提交匹配、未过期回执，NAS再递增epoch并转移**原run凭证所有者**，不创建新局、不重置起始时间、不改变成员/存档。转移时保留已预检成功的RTC连接，清除旧主机权威。
- 诊断显示P2P真实选中候选对RTT、连接阶段、失败原因、待连数量、队列、同步频率；NAS RTT仅作为后端控制链路指标。没有“显示直连但事件重试仍经NAS”的混合伪直连。

## 验证与复现

```powershell
node --test 'tests/*.test.cjs'
node tests/host-p2p-browser.cjs
$env:P2P_PLAYERS='8'; node tests/host-p2p-browser.cjs; Remove-Item Env:P2P_PLAYERS
node tests/battle-browser.cjs
$env:PS_RELAY_ONLY='1'; node tests/battle-browser.cjs; Remove-Item Env:PS_RELAY_ONLY
node tests/protected-coop-browser.cjs
node tests/nas-production.cjs
npm run test:reproducible
node tools/verify-host-p2p-0167.cjs
```

- 基线292/292；修改后299/299。包括原始HP、早到ICE、零NAS战斗回退、JSON敌人/NPC实例恢复、助攻贡献和后端交接鉴权/旧epoch/重复请求。
- 3人与8人真实Chrome RTC：两次战斗主机交接、大厅转移、原主机释放权威、原run凭证交接、NAS控制通道短断、候选新拓扑失败并恢复原局；64敌人压力下仍直连且事件年龄/缓冲有界，NAS战斗包0。
- 完整8浏览器战斗回归68项：近战命中、技能形态、成长、升级暂停、裂隙、精通去重、短断重连、真实存档奖励及组队排行榜。
- 关闭全部RTC别名的真实大厅：玩家准备后仍禁止开局，NAS战斗包0。历史“纯NAS对局”测试已替换为这一新产品行为，不再保留静默回退承诺。
- 发布混淆包20项通过公开UI验证P2P、暂停转移、转移后的组队结算及存档；不暴露G。NAS生产回归55项，覆盖账号、双份存档、鉴权、缓存、触屏、模拟手柄等。
- 连续两次生产构建及ZIP哈希一致。`artifacts/p2p-0167/VERIFICATION.txt`记录所有BASELINE/MODIFIED/ROLLBACK逐命令、输入、原样输出、退出码、原/新文件哈希及隔离恢复。主工作区保留修改版。

原始测量见`docs/data/host-p2p-0167.json`。3页面64敌人夹具约101FPS；8页面同机并发夹具约39FPS，所测发送/接收约15～30Hz，可靠事件年龄0，缓冲有界。它们用于证明真实传输路径、交接和队列，不把同机多页面资源争抢当作8台独立设备的帧率，也不宣称低配设备普遍锁60FPS。

## 仍需真实环境确认的事项

- 本轮RTC测试使用本机真实Chrome上下文及本机ICE，没有把公网不同运营商、手机/实体手柄作为已完成验收。新诊断可直接区分ICE未连通、网络队列和本地低FPS。
- STUN不能保证穿透每种防火墙/对称NAT。[MDN协议说明](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols#turn)说明此类情况可能需要TURN。当前严格P2P未接入收费TURN，直连失败会提示/重试并阻止开局，**不会偷偷使用NAS战斗中继**。
- 这里实现的是玩家主动交接。房主浏览器崩溃/刷新导致运行态丢失，仍不承诺无检查点的自动接管。NAS鉴权宽限期耗尽仍会移除离线成员/关闭房间；保持双份存档和服务端撤销会话语义。
- 交接超大检查点、选择中或新拓扑不可达时保留原主机，不丢弃现场来强行转移。渲染端60FPS与公网连接质量应分别验收。

## NAS更新

推送后的main使用原更新脚本。先排空旧对局并备份SQLite，保留既有数据挂载，健康检查失败回退容器。更新完所有玩家刷新到协议13；本轮不修改存档schema。

```sh
(
set -e
WORKDIR="$(mktemp -d /mnt/user/appdata/pokesurvivor-update-XXXXXX)"
git clone --depth 1 --branch main https://github.com/jyh9521/PokeSurvivor-CN.git "$WORKDIR"
cd "$WORKDIR"
sh deploy/update-unraid.sh 'https://pokemon.blfy.cc:9521'
)
```
