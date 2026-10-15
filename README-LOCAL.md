# PokéSurvivor 中文本地版

免费、非商业的宝可梦生存游戏中文分支。

## 开始游玩

- Windows：安装 Node.js 后，双击 `Start-Local.cmd`，在固定地址 `http://127.0.0.1:8765/` 游玩。
- 其他系统：在解压目录运行 `node tools/preview.js`，打开上述地址。
- 也支持直接双击 `index.html`，但不同浏览器对文件地址的存储行为不同，优先使用本地服务器。

**第一次请选择“注册账号”创建本地账号。访客模式不保存进度。**
账号名称沿用原版规则：3–16 个字母、数字或下划线。账号只是本机存档槽，不是原站账号。

金币、宝可梦收藏、强化、任务和纪录保存在当前浏览器的网站数据中。关闭页面或服务器后仍保留；同一浏览器、同一地址再次打开即可继续。清除网站数据、使用无痕窗口、更换浏览器、端口或文件路径可能导致原存档不可见。请勿使用常用网站的密码。

本版不连接原站 Firebase；未启用云存档、Google 登录、在线好友、在线排行或联机。启动和游玩无需登录 Google，也不会产生 Firebase 费用。界面保留英语和西班牙语切换。

电脑使用 WASD／方向键移动，1–4／Q／E 切换招式，Esc 暂停；手机横屏拖动移动。伙伴自动攻击。

## 来源与许可

- 源码：[JPTER78/pokesurvivor](https://github.com/JPTER78/pokesurvivor)，基础版本 MIT；新增移植部分见 [上游许可声明](UPSTREAM-NOTICES.md)。
- 简体中文贡献：wheart22 的 PR #88；保留贡献者署名。
- 精灵：PMD SpriteCollab，CC BY-NC 4.0，完整艺术家名单见 `CREDITS.md`。
- Pixelify 与 PSChinese／Noto Sans SC 字体：OFL，许可证位于 `assets/fonts/`。
- Pokémon 名称及角色属于相应权利方；本项目为非官方、非商业同人分支，没有广告或付费入口。

源码与维护说明：[jyh9521/PokeSurvivor-CN](https://github.com/jyh9521/PokeSurvivor-CN)。

## NAS 模式

同一份游戏也支持连接自己的 NAS 后端，提供双份存档、联机和在线排行。上述“未启用在线功能”描述的是本机／静态模式。安装说明见仓库的 docs/UNRAID.md。
