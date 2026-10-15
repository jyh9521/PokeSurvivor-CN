# 0.6.1 下拉列表、强化布局与手柄振动

## 复现与根因

`node tests/controller-hotfix-browser.cjs` 在 0.6.0 上复现四项失败：再次点击本体不收起、手柄 A 不展开可见列表、旧 pulse 接口没有收到调用、双按钮强化卡片说明列不足 150 CSS px。

- 旧鼠标入口使用 SelectPopup，手柄入口仍使用 select 原地预览；现在两者共用视口列表。
- 原本再次点击本体会 close 后立即 open。现在相同 source 再次打开就是收起。
- 弹出列表不使用空间方向打分，改为按选项顺序上/下移动并自动滚动；A 提交原 change 事件，B/Escape 取消。通过 UIFocus.enter 记录实际 select 为触发控件，避免纯手柄取消后回到上次点击的设置标签。
- 原强化卡片第三列的 auto 按钮宽度挤压文本列。现在图标/完整说明为首行，操作按钮独立第二行；所有卡片统一处理，窄屏网格可收缩，说明和等级点可正常换行。

## 振动

新增无第三方依赖的 Haptics 模块，优先原生 `vibrationActuator.playEffect('dual-rumble')`，兼容 `hapticActuators[].pulse`。不支持的 effect 或调用拒绝会尝试 pulse；全部失败时返回明确状态，不吞掉失败信息。

真实扣血仍是唯一受击入口，强度和时长有上限；测试振动为 350ms。连接手柄并启用“手柄振动”即可接收受击反馈，不依赖当前 UI 提示是否刚被鼠标切换；普通鼠标活动不再中断已发出的振动。失焦、隐藏、断开、关闭手柄或振动设置时停止；异步旧请求没有权限在停止或新请求后重启马达。

设置 → 操作新增“手柄振动”开关、“测试振动”和状态文本，区分未连接、无接口、调用中、完成、被中断及拒绝。API 完成只代表浏览器执行了指令，仍需玩家确认真实马达是否振动，不把模拟执行器当作实物验收。

参考：[原生 playEffect 的结果与异常](https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/playEffect)、[旧 pulse 接口](https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/pulse)。浏览器、驱动和连接模式仍决定可用接口；界面提供诊断而不保证每种设备具备振动能力。

## 回归入口

```sh
npm run test:nas
node tests/controller-hotfix-browser.cjs
node tests/gamepad-browser.cjs
node tests/interaction-browser.cjs
npm run test:nas:production
npm run test:reproducible
node tools/verify-controller-hotfix-transaction.cjs
```

真实 Chromium、真实本地 NAS 与受控 Gamepad API 覆盖设置/宝可梦/招式下拉框、鼠标与手柄混用、取消焦点恢复、多尺寸长说明、接口回退及失败状态。未完成实物手柄马达验收。账号、存档、金币、50% 返还、联机与排行榜业务没有变更。
