# 简中贡献需求审查

范围：`537440510dcdadf8ed711ec3dea7ae795533a662...a23065deefa1dd4d23557c7b10f6d8d99af42dbc`；仅需求轴，静态源码审查，未修改游戏文件。

## 发现

- **[P1，fork 发布阻断] 贡献不是独立本地存档发行版。** `js/core/firebase-config.js` 仍指向上游项目；`tools/preview.js` 仅通过本地预览服务器注入配置拦截器，常规静态 HTTP/HTTPS 发布不经过它。`js/core/db.js:initCloud()` 会加载 Firebase SDK 并接入上游。合并后须在发行源码中置空配置并重建，而不是仅使用预览服务器。`dev.html` 的隐私/云存档说明、中文攻略与 README 的云存档/合作承诺也需随本地版调整。
- **[P2] 简中昵称文案残留繁体字。** `js/data/lang-zh-cn.js` 的 `Elige tu apodo`、`Guardar apodo`、`Tu apodo:` 等多处输出“暱称”，同文件新增模板却使用“昵称”；须统一为“昵称”。这是实际文本问题，现有 Han 字符检测不会发现简繁混用。
- **[P2，测试证据不足] file:// 测试未证明账户进度保存。** `tests/offline-browser.cjs` 只检查启动、语言、字体和帮助链接，没有注册、登录、进度写入及重启恢复；而且主动覆盖 `FIREBASE_CONFIG`，不是未改动发行文件。建议在 HTTP 与 file:// 各用全新浏览器环境验证本地账户注册→保存宝可梦/金币→刷新恢复→登出登录恢复，并检测外部请求为零。

## 已实现与边界

语言及 966 名称分别维护；官方名称审核资料和源版本已固定；`move/type/form` 消除同名歧义；称号 option 显式保存原文 value；昵称 DOM 使用 translate=no、Canvas 使用 rawCanvas；游戏模型、存档字段及网络 ID 未被翻译。中文路径保留 `base href=../`，`pageUrl()` 对 file:// 附加 index.html；本地字体自托管。

新增翻译工具、静态中文攻略及测试属于合理维护范围。上游域名 canonical、sitemap、生成器 SITE 属于 fork 发布待配置项，贡献文档已明确说明；当前个人本地版不应把它们误认为个人站配置。未发现需要拒绝整个贡献的游戏机制修改。建议合入个人 fork 后单独提交本地化发行修正，不向上游提交。


## 合并后处理

本地发行配置、账号持久化实测、简体昵称用词、字体输入版本及哈希校验已修正。详见 LOCAL_EDITION.md。数字格式器重构仅列为维护建议，未在此次扩大改动。
