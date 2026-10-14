# PokéSurvivor 开源与中文部署核查

核查日期：2026-10-14（Asia/Tokyo）。本轮只调查并保存结论，未 fork、克隆、下载游戏资产或部署。

## 结论

**代码开源，可以 fork 并制作中文版；无需扒站。** 官方网站的公开脚本给出的源代码地址、作者 itch.io 页面与 GitHub 仓库相互吻合：[官方仓库](https://github.com/JPTER78/pokesurvivor)、[作者发布页](https://jpter78.itch.io/pokesurvivor)、[游戏网站](https://pokesurvivor.com/)。GitHub API 当次返回 main 为 `537440510dcdadf8ed711ec3dea7ae795533a662`，提交时间 `2026-10-13T22:04:14Z`：[提交](https://github.com/JPTER78/pokesurvivor/commit/537440510dcdadf8ed711ec3dea7ae795533a662)。

## 许可与部署条件

- `js/`、`css/`、`index.html`、`tools/` 与 `js/data/music.js` 使用 MIT，允许修改及分发，需保留版权和许可声明。[LICENSE](https://github.com/JPTER78/pokesurvivor/blob/main/LICENSE)
- `assets/pokemon/` 精灵素材不是 MIT，而是 SpriteCollab 的 CC BY-NC 4.0；应保留艺术家署名、许可链接及修改说明，并用于非商业目的。[LICENSE](https://github.com/JPTER78/pokesurvivor/blob/main/LICENSE)、[CC 官方许可说明](https://creativecommons.org/licenses/by-nc/4.0/)、[作者名单](https://github.com/JPTER78/pokesurvivor/blob/main/CREDITS.md)
- Pixelify Sans 字体为 SIL OFL 1.1；Pokémon 名称和角色权利仍属于相关权利方。代码 MIT 不等于全部素材或品牌权利都开放。[LICENSE](https://github.com/JPTER78/pokesurvivor/blob/main/LICENSE)
- 作者发布文档明确给出静态站点/GitHub Pages 部署方式，并要求不做广告或收费。因此博客承载中文游戏在技术上可行，建议独立无广告游戏子站，博客提供入口；是否适配现有博客域名、目录和构建需另查博客仓库。[发布文档](https://github.com/JPTER78/pokesurvivor/blob/main/docs/PUBLICAR.md)
- Firebase 不配置时使用浏览器本地存档；云存档、账户、排行与联机需要独立 Firebase 项目和授权域名。中文部署不应直接继承作者线上后端配置。[Firebase 配置文档](https://github.com/JPTER78/pokesurvivor/blob/main/docs/FIREBASE.md)

## 已存在的中文贡献

当次访问两项均为 **Open**，不是已合并主线：

1. [简体中文 PR #88](https://github.com/JPTER78/pokesurvivor/pull/88)：说明涵盖游戏 UI、966 种官方简体宝可梦名称、招式/物品术语、中文字体、`/zh/` 入口和 11 个玩家页面。提交者报告本地测试通过，但线上 Firebase/WebRTC 联机仍待验证。可优先审查和复用，避免从零重复翻译。
2. [繁体中文 PR #74](https://github.com/JPTER78/pokesurvivor/pull/74)：为现有西班牙语/英语选择器增加繁体中文，说明包含可玩游戏内容；外部玩家网站页面维持原语言，线上服务未测。

上述测试结果属于 PR 作者陈述，本轮未独立执行。

## 推荐后续路径

先 fork 官方源码并保留上游关系；审查简体贡献与当前 main 差异；将中文词典、术语来源及字体与通用工具分离；验证本地游戏、存档、移动端和独立后端；最后部署无广告中文游戏子站并添加博客入口。若目标没有明确源码/素材许可，获取浏览器文件本身也不自动取得公开重发许可；本游戏已提供源码，不需要采用该路线。


## 2026-10-14 本地发行执行

后续已建立 jyh9521/PokeSurvivor-CN fork、审查并合并 PR #88，完成独立本地存档发行。此文件上面的“本轮仅调查”描述对应最初调查阶段；执行结果见 LOCAL_EDITION.md。
