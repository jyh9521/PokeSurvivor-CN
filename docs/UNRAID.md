# Unraid 部署与升级（0.19.0）

当前程序 **0.19.0**、联机协议 **18**、SQLite schema **3**。物种招式池、进化继承及特殊招式变更见 [版本报告](LEARNSETS_REPORT.md)。本轮不迁移存档 schema，也未对实际 NAS 数据执行升级。

账号、存档、排行榜和房间信令通过同源 HTTPS / WebSocket `/api/ws`；战斗数据使用 WebRTC，支持八人普通联机。直连不可用时可选 Cloudflare Realtime TURN 中继。TURN 用量可能计费，配置中的额度保护不是供应商账单硬上限。早期“四人、全 WebSocket 转发、没有 TURN”的说明不适用于当前版本。

## 两种部署路径

| 配置 | Compose | 独立 Docker |
|---|---|---|
| 管理方式 | Compose project + `pokesurvivor` service 标签 | 显式指定的无 Compose 标签容器 |
| 容器名 | 通常 `<project>-pokesurvivor-1`，以实际标签和 ID 为准 | 旧脚本默认 `pokesurvivor-cn` |
| 默认宿主端口 | `8766`（HOST_PORT）→8080/tcp | 旧脚本 2333→2333/tcp，PORT=2333 |
| 数据目录 | DATA_PATH，默认 `./nas-data` → `/data` | 旧默认 `/mnt/user/appdata/pokesurvivor-cn/data` → `/data` |
| 用户 | PUID:PGID，默认99:100 | 保留实际 User |
| 更新入口 | `deploy/update-compose.sh` | `deploy/update-unraid.sh` |
| 回退 | 冻结已解析配置，以原镜像 ID 重建同一 service | 保留原容器，失败恢复原名称并启动 |

升级不自动统一已有端口。独立容器保留实际端口映射、环境（包括 PORT、PUBLIC_ORIGIN、TRUST_PROXY、REGISTRATION 和全部 CF_*）、用户、bind、标签及安全选项。无法可靠重建的自定义网络、命令、设备或资源限制会拒绝升级。Compose 检查 project/service 标签及环境、端口、用户、数据目录漂移；请先让 `.env` 与线上配置一致。两条入口均不会使用 `compose down`，不会操作其他 service。

## 首次 Compose 安装

使用当前仓库源码（不是旧的0.2.0安装包），Docker Engine、Compose v2，及更新脚本需要的宿主机 Python 3.9+。固定 project 名，后续始终使用同一名称。在仓库根目录：

```sh
cp deploy/nas.env.example .env
# 编辑 .env，填写 DATA_PATH、精确的 PUBLIC_ORIGIN 和需要的 TURN 设置
mkdir -p /mnt/user/appdata/pokesurvivor-cn/data
chown 99:100 /mnt/user/appdata/pokesurvivor-cn/data
docker compose -p pokesurvivor-cn up -d --build
docker compose -p pokesurvivor-cn logs --tail 50 pokesurvivor
```

默认访问 `http://NAS-IP:8766`。`.env` 的 DATA_PATH 应为上述绝对目录；不设置时会使用仓库内 `nas-data`。不要对既有数据执行递归改属主或建立空目录冒充原挂载。

PUBLIC_ORIGIN 为玩家访问的精确来源（含非标准 HTTPS 端口，不带路径）。REGISTRATION=false 关闭注册。反代目标是实际宿主端口，完整转发网站、`/api/*` 和 `/api/ws`，启用 WebSocket Upgrade、HTTPS、足够长的读超时。TRUST_PROXY=true 时，容器入口仅向可信反代公开。WebRTC 直连需要玩家网络允许相关流量；TURN 不是让 NAS 开放一个额外游戏 UDP 端口。

TURN 可通过 `deploy/setup-cloudflare-turn.sh` 配置；Compose 读取 `.env` 中 CF_TURN_KEY_ID、CF_TURN_KEY_API_TOKEN、CF_ACCOUNT_ID、CF_ANALYTICS_TOKEN、CF_TURN_CAP_GB、CF_TURN_OTHER_USAGE_GB。独立容器先将 TURN 配置加入实际容器环境；更新器不会再额外读取或覆盖旁边的 turn.env。密钥只留服务器，勿提交仓库。

## 安全更新

先拉取并审核源码。更新器以当前脚本所在仓库为构建目录，不自行 git pull。管理员在设置 → 账号开启维护排空，等待 activeRuns=0、activeRooms=0、draining=true、ready=true。旧版没有这些字段时一律拒绝自动升级，应另行安排无人维护窗口及人工备份迁移。

先执行只读检查（不构建、不备份、不停容器），再去掉 `--check` 执行：

```sh
# Compose：project 必须是现有部署的真实 project，不可随意新起一个名字
sh deploy/update-compose.sh --project pokesurvivor-cn \
  --data /mnt/user/appdata/pokesurvivor-cn/data --check
sh deploy/update-compose.sh --project pokesurvivor-cn \
  --data /mnt/user/appdata/pokesurvivor-cn/data

# 独立容器：只有确认是此路径后才执行
sh deploy/update-unraid.sh --container pokesurvivor-cn \
  --data /mnt/user/appdata/pokesurvivor-cn/data --check
sh deploy/update-unraid.sh --container pokesurvivor-cn \
  --data /mnt/user/appdata/pokesurvivor-cn/data
```

如使用自定义 Compose 文件，额外提供 `--file /绝对路径/compose.yaml`；环境解析目录为此仓库根目录。不再接受旧脚本的单个 Origin 参数，Origin 沿用实际部署配置。不要用独立脚本更新 Compose 容器，即使名字恰好相同。

更新顺序：锁定目标 → 校验原 SQLite 与唯一可写 bind → 排空检查 → 构建唯一镜像标签 → 无数据挂载的版本检查 → 使用保留的 CF_* 检查 TURN → 再检查排空 → 在线 SQLite 一致性备份 → 替换指定容器 → 校验镜像 ID、版本、协议、schema、健康和维护状态。

快照位于 `/data/backups/pre-0.19.0-<唯一时间戳>.sqlite`，包含已提交 WAL 内容。备份失败时不停止原容器。失败或 SIGINT/SIGTERM/SIGHUP 在替换阶段触发原镜像与快照回退，保留失败数据库及 WAL/SHM 为 `.failed-<时间戳>`。回退会舍弃快照之后的写入，因此维护期间应通知玩家暂停账号和存档操作。成功后也保持维护，管理员验收后手动开放。

SIGKILL、断电、Docker daemon 不可用或磁盘故障无法保证自动回退。不要在更新过程中手工运行 Compose 或重命名容器。独立容器成功后保留 `*-previous-*`，验收前不要删除；镜像和数据库快照也要保留。Compose 使用临时权限0600的完整已解析配置重建目标，不更改 `.env` 或原 compose.yaml；后续手工 Compose 操作前应使用同一已审核源码。

## 人工恢复与备份

手动一致性备份示例：

```sh
docker compose -p pokesurvivor-cn exec pokesurvivor \
  node server/backup.cjs /data/backups/manual.sqlite
```

将备份另存到不同磁盘或设备，SQLite 含私人账号及存档。人工恢复须停止目标容器并核实没有其他进程写同一目录，先保留失败数据库及其 -wal/-shm，再将匹配版本的快照恢复为 pokesurvivor.sqlite，保证用户可写；程序与快照成套回退。不要直接复制正在写入的主数据库。房间与进行中的比赛不持久化。原有领取回执、账号和存档随完整数据库保留，不能新建空库替代。

## 验证边界

离线验证命令：`python3 -m unittest discover -s tests -p 'deployment_test.py'`，服务端验证：`npm run test:nas`。这些结果不能证明正式 NAS 部署成功。

真实 NAS 另行授权后验收：健康接口 version=0.19.0/protocol=18/schema=3 → 原账号登录及存档 → 浏览器刷新/缓存更新 → WebSocket 信令 → 跨网络 WebRTC 直连及 TURN 回退 → 多人开局结算 → 重启后持久化 → 一致性备份读取。完成前不要宣称线上升级成功。
