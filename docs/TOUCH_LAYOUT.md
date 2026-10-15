# 触控布局与滚轮技能切换（0.7.3）

## 操作

设置 → 操作 → 自定义触控布局。拖动技能栏、装备、暂停按钮和固定摇杆；也可选择控件，用水平/垂直滑条调整。手柄沿用方向导航、A 确认、B 返回；选择框和滑条复用现有通用组件，无新增游戏内按键冲突。

横屏和竖屏分别保存归一化位置。编辑时旋转屏幕，可继续编辑另一个方向；保存同时保留两份草稿。取消不写入设置；重置仅清除当前方向位置并选回浮动模式，保存后生效。布局和摇杆模式仅存当前浏览器，不写账号或 NAS 存档。

固定摇杆在默认或自定义位置显示，附近触摸启动，底座不跟随长拖动；浮动模式保留原来的跟随行为。松手、取消触摸、旋转、调整模式均清除旧移动向量。游戏 HUD 的绘制与触摸命中继续共用 HUD.layout，编辑器也读取同一几何函数。装备在竖屏下仍独立于技能栏，屏幕安全边距与边缘约束保留。

开启鼠标点击移动时，游戏中滚轮向上切换上一个技能，向下切换下一个技能，末尾循环。复用 Input.bindings.previous/next 和 Player.cycle；菜单、暂停、弹窗、死亡、冻结、后台及关闭鼠标模式时不处理。Ctrl/修饰键、水平手势不拦截；像素/行/页滚轮统一量纲并限制切换速率，避免细微抖动和高速连跳。键盘和手柄原有切换方式不变。

## 移植与许可

来源：JPTER78/pokesurvivor 的 4de8495，仅选择触控布局、固定/浮动摇杆和游戏大型提示居中修复；未导入官方云域名检查。保留 LICENSE-NONCOMMERCIAL.md 完整原文与 UPSTREAM-NOTICES.md 必要署名；LICENSE 和 README 标明新移植部分与原 MIT 部分的区别。静态 ZIP、NAS Docker 镜像和游戏关于页面保留/链接这些声明。

本次不调整数据库结构、账号标识、存档格式、联机协议或排行榜。

## 可复现验证入口

- `node --test tests/*.test.cjs`：完整单元回归及新增布局、摇杆、滚轮边界与许可测试。
- `node tests/touch-layout-browser.cjs`：认证 NAS + 实际 Chromium 页面、触屏事件、鼠标滚轮、受控手柄输入、横竖屏布局、保存/取消、通知居中与账号存档保留。
- `node tests/portrait-browser.cjs`、`node tests/controller-hotfix-browser.cjs`、`node tests/click-move-browser.cjs`：原有输入与竖屏回归。
- `node tests/nas-production.cjs`（可设 `PS_PORTRAIT=1`）：受保护生产包、实际 Service Worker、布局编辑器和许可证 HTTP 交付、账号及双存档回归。
- `node tools/check-repeat-build.cjs`：两次生产构建与 ZIP 的 SHA256 一致。

浏览器手柄测试使用受控标准设备数据，不等于实体手柄或真实手机验收；NAS 更新脚本在本地做 shell 语法检查，实际 NAS 部署由用户执行。可执行隔离回滚与日志在 `artifacts/touch-controls/`，不会恢复/覆盖 NAS 数据。
