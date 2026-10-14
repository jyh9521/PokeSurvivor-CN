# PokéSurvivor-CN

PokéSurvivor 的独立简体中文分支，提供单机游玩与浏览器本地存档。

## 游玩

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

代码 MIT；SpriteCollab 精灵 CC BY-NC 4.0；字体 OFL。保留 [LICENSE](LICENSE)、[CREDITS.md](CREDITS.md) 与字体许可证。非商业同人项目，不代表宝可梦官方，无广告、付费或捐赠入口。
