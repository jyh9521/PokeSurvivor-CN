> 当前0.18.0：主动招式分路线成长、进化预算、训练/精通加法结算、真实属性说明；新增特殊就绪提醒、Z演出、水流喷射修正和连续随机音乐。协议17、存档schema3。完整对照见[招式成长专项报告](docs/MOVE_GROWTH_REPORT.md)。

> 当前0.17.0：安全精通、成长/压制分层、多人普通HP独立预算；协议16、存档schema3，生命+20无上限保留。完整实测、否决候选与未验证事项见[战斗平衡V2报告](docs/BALANCE_V2_REPORT.md)。下文旧版本段落保留为历史记录。

# PokéSurvivor-CN

PokéSurvivor 的独立简体中文分支，提供单机游玩与浏览器本地存档。

## NAS 自托管

NAS 模式提供账号、浏览器与 NAS 双份存档、最多八人房主权威 P2P 联机和在线排行榜，不依赖 Firebase。使用随发行包提供的 Dockerfile 与 Compose 部署，详见 [Unraid 安装与反代说明](docs/UNRAID.md)。直接打开静态网页仍保留单机本地存档模式。

0.16.8 起战斗快照、命中事件和主机检查点只走 WebRTC：优先玩家直连，失败后使用 Cloudflare Realtime TURN；无需独立VPS或Worker。NAS 保留账号、存档、排行榜、房间与鉴权信令。主动转移房主会先验证新主机直连拓扑，再交接现有战斗；失败保留原主机。按 [Cloudflare TURN 设置与验证](docs/TURN_0168.md) 在NAS运行交互式设置向导，再执行更新；密钥不放进网页。原版生命成长保持每次＋20且无上限。

## 本机游玩

安装 Node.js 后双击 **Start-Local.cmd**，或运行 `npm start`，打开 <http://127.0.0.1:8765/>。

**创建本地账号才能保存进度；访客不保存。** 本版不使用原站账号，不连接原站 Firebase；云存档、在线好友、联机与在线排行未启用。保持相同浏览器与访问地址即可继续存档。清除网站数据会删除本地进度。

- [完整游玩说明](README-LOCAL.md)
- [本地版构建与验证](docs/LOCAL_EDITION.md)
- [中文术语与字体维护](docs/LOCALIZATION.md)
- [保留的原版说明](README.upstream.md)

## 开发

```powershell
npm ci
npm run build
npm test
npm run test:browser
npm run test:file
npm run package
```

构建还需 Python 3.12；字体／页面校验依赖见 `requirements-localization.txt`。直接游玩无需 npm 安装依赖。

## 来源与许可

fork 自 [JPTER78/pokesurvivor](https://github.com/JPTER78/pokesurvivor)，简体中文基于 wheart22 的 [PR #88](https://github.com/JPTER78/pokesurvivor/pull/88)，其界面草稿参考 DabaoHuang 的繁体贡献。修改仅维护于本 fork，未向上游提交。

基础代码 MIT；移植的触控布局、固定摇杆与提示居中代码遵循 PolyForm Noncommercial 1.0.0，见 [上游声明](UPSTREAM-NOTICES.md) 与 [完整许可证](LICENSE-NONCOMMERCIAL.md)；SpriteCollab 精灵 CC BY-NC 4.0；字体 OFL。保留 [LICENSE](LICENSE)、[CREDITS.md](CREDITS.md) 与字体许可证。非商业同人项目，不代表宝可梦官方，无广告、付费或捐赠入口。
