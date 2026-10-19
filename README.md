# PokéSurvivor-CN / 宝可梦生存 中文分支

PokéSurvivor 的独立简体中文分支，提供浏览器单机游玩、NAS 自托管、双份存档与多人合作。界面保留英语和西班牙语切换。

## 当前状态

当前源码版本为 **0.19.0**，联机协议 **18**，存档 schema **3**。本轮更新包括可追溯的物种招式池、线性进化继承、局内观察复制、特殊物种改编，以及可穿过墙、树、石头并检查落点的位移。

版本细节和验证范围见[招式池与位移报告](docs/LEARNSETS_REPORT.md)。旧版本的平衡与联机记录保留在文档中，不作为当前规则。

## 下载 / 使用

当前未在本仓库发布 GitHub Release；可下载源码或克隆本仓库，按以下方式运行。

### 本机单机

安装 Node.js（版本要求见 [package.json](package.json)）后，双击 `Start-Local.cmd`，或在仓库根目录运行：

```powershell
npm start
```

打开 `http://127.0.0.1:8765/`。首次请选择“注册账号”创建本地账号；**访客模式不保存进度**。本地账号只是当前浏览器的存档槽，不是原站账号，也不是 NAS 账号。

保持相同浏览器与访问地址即可继续存档；清除网站数据会删除本地进度。本机模式不连接原站 Firebase，也不启用 NAS 的在线功能。详见[本机游玩说明](README-LOCAL.md)。

### NAS 自托管

NAS 模式提供账号、浏览器与 NAS 双份存档、最多八人房间、好友与在线排行榜，不依赖原站 Firebase。使用仓库的 Dockerfile 与 Compose 部署，数据目录应独立持久化。

战斗数据走房主权威 WebRTC：优先玩家直连，失败后使用 Cloudflare Realtime TURN；NAS 负责账号、存档、排行榜、房间与鉴权信令。无需独立 VPS 或 Worker，TURN 密钥只保存在服务端。运行中的房主转移会先验证新拓扑，失败则保留原房主。

部署目录、端口和反向代理见 [Unraid 部署说明](docs/UNRAID.md)；Compose 与独立容器分别使用对应安全更新入口。当前连接方式见 [P2P 主机说明](docs/HOST_P2P_0167.md)和 [TURN 设置与验证](docs/TURN_0168.md)为准。

## 从源码构建

需要 Node.js、npm 和 Python 3.12；字体与页面校验依赖见 [requirements-localization.txt](requirements-localization.txt)。

```powershell
npm ci
python -m pip install -r requirements-localization.txt
npm run build
npm test
npm run test:browser
npm run test:file
npm run package
```

NAS 后端测试使用 `npm run test:nas`，当前招式池与位移测试使用 `npm run test:learnsets`。直接游玩现有网页不需要安装全部构建依赖。

## 文档

- [本地发行构建与验证](docs/LOCAL_EDITION.md)
- [中文术语与字体维护](docs/LOCALIZATION.md)
- [手柄操作](docs/GAMEPAD.md)
- [触控布局与鼠标滚轮](docs/TOUCH_LAYOUT.md)
- [战斗平衡记录](docs/BALANCE_V2_REPORT.md)
- [招式成长记录](docs/MOVE_GROWTH_REPORT.md)
- [保留的上游说明](README.upstream.md)

## 来源与许可

基于 [JPTER78/pokesurvivor](https://github.com/JPTER78/pokesurvivor)。简体中文基于 wheart22 的 [PR #88](https://github.com/JPTER78/pokesurvivor/pull/88)，界面草稿参考 DabaoHuang 的繁体贡献；本分支改动独立维护。

基础代码 MIT；移植的触控布局、固定摇杆与提示居中代码遵循 PolyForm Noncommercial 1.0.0；SpriteCollab 精灵 CC BY-NC 4.0，字体 OFL。详见 [LICENSE](LICENSE)、[非商业许可证](LICENSE-NONCOMMERCIAL.md)、[上游声明](UPSTREAM-NOTICES.md)与 [CREDITS.md](CREDITS.md)。

宝可梦名称及角色归相应权利方所有。本项目是非官方、非商业同人分支，没有广告、付费或捐赠入口。
