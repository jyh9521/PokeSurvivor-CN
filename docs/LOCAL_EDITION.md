# 中文本地发行维护

## 固定来源

- 官方主线：`537440510dcdadf8ed711ec3dea7ae795533a662`。
- 简中 PR #88：`a23065deefa1dd4d23557c7b10f6d8d99af42dbc`，共同基点 `a9b21f091d7e2e0b10bc9ef94836447bf63cddeb`。
- fork：`jyh9521/PokeSurvivor-CN`。所有提交仅推送此 fork；`upstream` 在本机设置为只读推送地址 `DISABLED`。未向上游提交 PR。

## 本地发行边界

`js/core/firebase-config.js` 的 `G.FIREBASE_CONFIG = null` 固定本地存储，`G.LOCAL_ONLY` 控制本地版说明与在线菜单。`dev.html` 中的 `PS_DEFAULT_LANGUAGE` 仅指定发行默认语言；通用 i18n 模块仍支持原浏览器语言规则、显式入口与已保存的选择。

账号、存档键和值沿用原版，昵称与内部 ID 不翻译。登录页明确提示创建本地账号才保存；访客不保存。在线好友和排行入口隐藏，Google 关联入口隐藏。原版联网模块保留源码，但本版本地配置不会初始化 Firebase。云端配置不是在预览服务器中伪造，而是真正写入源码并重新构建发行包。

`tools/build-local.cjs` 调用共用游戏和页面生成器，随后去掉原站 canonical、结构化数据和索引配置，标记静态说明页属于本地发行。`dev.html` 不被发行后处理改写。默认构建保留原版闭包和混淆；`--expose` 仅用于基于 G 的集成测试。

## 审查与修正

见 `docs/review-standards.md`、`docs/review-spec.md`。已固定字体下载 revision 并验证缓存与下载内容的锁定 SHA-256；新增 `input-lock.json`；修正“暱称”；补齐 PR 基点之后新增的 Gmail 和更新日志中文；冲突的 HTML、bundle、版本和页面由当前源码重新生成。通用数字格式器的重构属于低优先级维护建议，本次未扩大范围。

首次合并检验暴露了原版新增英语词条缺少中文及新更新日志缺译；最终修正后的 14 组单元测试、100 项源／测试构建的浏览器集成检查及实际发行存档验证通过。联机界面测试使用本地夹具，不等于在线服务验收；本版不启用在线服务。

## 构建与检查

使用 Node.js 22 或以上、Python 3.12 和已安装的 Chrome：

```powershell
npm ci
python -m pip install --target tools/cache/python -r requirements-localization.txt
npm run build
npm test
python tests/locale_pages.py
npm run test:browser
npm run test:file
npm run package
```

Python 路径可通过 `PYTHON` 环境变量指定。Python 子进程固定 UTF-8。JS 依赖版本和安装完整性由 `package-lock.json` 固定，不再让 npx 下载可变版本。构建时间默认取 package.json 的固定 buildEpoch（2026-10-14 UTC），亦支持 `SOURCE_DATE_EPOCH`。

中文字体新增字形时：`python tools/fetch_localization.py --fonts`，再运行 `python tools/make_zh_font.py`。下载或缓存哈希不匹配时停止，不会自动接受变化；需要重新审核后显式修改锁文件。

深入 UI 检查先运行 `node tools/build-local.cjs --expose`，再运行 `node tests/i18n-browser.cjs` 并分别传入 `dev.html`、`index.html`、`en/index.html`、`zh/index.html`。完成后重新 `npm run build` 恢复普通发行。

`tools/check-local-state.cjs` 使用隔离的真实浏览器配置文件，不注入 Firebase 配置；覆盖注册、选择伙伴、强化购买、游玩结算、刷新、退出／重新登录及关闭／重启浏览器，记录外部请求和页面错误。文件模式与 HTTP 模式均独立验证。不会使用或清除个人浏览器存档。

## 本地证据

`artifacts/` 被忽略，不提交浏览器测试数据、隔离原版副本或发行 ZIP。该目录保存原始文件哈希、修改副本、差异、验证记录、回滚脚本、截图、打包清单。回滚只在带专用标记的隔离副本中测试，主工作目录保持中文版。

本阶段未发布博客、未启用 Pages、未建立 Firebase 项目。

复审发现英语入口 base 插入依赖旧 header 的精确匹配；已改为基于 charset 插入，并补充英语与中文入口的资源路径回归校验。分享元数据也已改为本地发行说明。

发行后处理曾在未重新生成的联系页累积标记；已改为幂等替换，补充单页标记数量与双次构建／ZIP 哈希一致性检查 `npm run test:reproducible`。

## 0.2.0 NAS 扩展

另见 UNRAID.md。静态／文件模式仍回退本地存档；只有同来源 /api/config 确认 NAS 后端后才启用在线 adapters。
