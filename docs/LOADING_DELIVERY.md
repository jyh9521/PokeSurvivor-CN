# 0.7.4 静态资源交付与启动恢复

## 改动范围

- NAS 静态服务新增 Brotli/gzip 协商与异步压缩，使用 Node 原生 zlib，无第三方依赖。压缩结果按文件内容与编码缓存，最多 64 项／16 MiB；原文件更新后不会复用旧内容。
- 响应包含 Vary: Accept-Encoding、分编码 ETag、准确的 Content-Length；支持条件请求 304 与 HEAD。未接受压缩的客户端得到原始字节；图片与 WOFF2 不重复压缩。
- JS、CSS 只有在 v 参数与当前文件实际 SHA-1 前 10 位相同时，才设置一年 immutable 缓存。错误版本号、HTML、Service Worker、version.json 均需重新校验，避免固定入口被长期锁在旧版本。
- 根目录、英语、简中入口使用同一个带内容指纹的 CSS。版本 JSON 和原更新器保留，不影响菜单更新等待、对局结束后更新和更新前同步存档的规则。
- Service Worker 升级到 code-v4，版本化 JS/CSS 优先读取已成功缓存的同版本资源；入口与版本检查走网络优先。错误 MIME、失败响应和版本不匹配的响应不进入永久代码缓存；显式 reload/no-store 绕过 cache-first。
- /api、认证、账号、存档、排行榜和 WebSocket 均不接入静态缓存与压缩，不改数据库、协议或持久化挂载。

## 启动状态与重试

关键样式、状态机与基础中英西文案直接包含在 HTML 中，不依赖外部 CSS、主脚本或字体。样式表采用非阻塞下载，真实样式标记通过校验后才允许启动游戏。

主样式或主脚本失败、初始化异常时，玩家看到可读错误与重试按钮，未初始化的登录表单不会露出来。超过 8 秒仍未完成时显示真实等待时间与重试入口，不显示虚构百分比、不自动循环刷新；迟到的资源仍可完成原启动。字体准备最多等待 5 秒，随后采用备用字体继续启动。

重试最多用 8 秒重新请求公共样式／脚本（cache: reload），随后刷新页面。不会清除 localStorage、Cookie、账号、浏览器存档或 NAS 数据；Service Worker 的显式 reload 请求可绕过旧的代码缓存。用户主动重试期间即使原资源迟到，也不会短暂开放游戏后再突然刷新。正常进入游戏后停止启动看门狗，后续游戏操作不受影响。

未启用 JavaScript 时保留内嵌说明和普通刷新链接。完整首页 HTML 本身尚未到达时，这个客户端界面尚不能出现。

## 验证

- `node --test tests/static-delivery.test.cjs`：真实 HTTP 的解压字节一致性、质量协商、HEAD、304、版本失效、并发请求、二进制与私有 API 隔离。
- `node tests/loading-browser.cjs`：实际受保护包，注入 CSS/JS 中断、脚本异常、长时间等待、字体 Promise 不结束和旧代码缓存；验证重试、存储保留、横竖屏可读性、语言切换、缓存复用与私有 API 不入缓存。
- `node tests/nas-production.cjs`（含 PS_PORTRAIT=1）：真实 Service Worker、认证、双份存档和原有功能。
- `node tests/portrait-browser.cjs`、`node tests/gamepad-browser.cjs`：既有手机布局与手柄回归。
- `node tools/check-local-state.cjs --file --protected`：本地文件方式与原本地账号存档不回退。
- `node tools/check-repeat-build.cjs`、`python -X utf8 tests/locale_pages.py`：生产包复现、页面资源引用与字体字形覆盖。

基线通过 85 项单元测试；缺少新功能时新增 HTTP 验证 4 项全部失败，CSS 中断浏览器复现也失败；改版验证和隔离回滚的精确命令、输出、哈希见 `artifacts/loading/VERIFICATION.txt`。浏览器故障注入验证不等于真实手机、NAS 部署或中日公网性能验收。本次减小静态下载量，不宣称修复公网丢包或实时联机延迟。

## Unraid 更新

沿用现有 update-unraid.sh 与 data 挂载，镜像版本 0.7.4。脚本先备份 SQLite，再重建与检查；失败恢复旧容器。保留 PUBLIC_ORIGIN=https://pokemon.blfy.cc:9521 与宿主端口 2333。部署后可检查：

```sh
curl -sSI -H 'Accept-Encoding: gzip' http://127.0.0.1:2333/js/app.min.js
curl -sSI -H 'Accept-Encoding: gzip' https://pokemon.blfy.cc:9521/js/app.min.js
```

应看到 Content-Encoding: gzip 与 Vary: Accept-Encoding。反代若修改响应，公网头以实测为准；不要对 /api 和 WebSocket 设置公共缓存。
