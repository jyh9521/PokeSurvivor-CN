# Unraid：NAS 双份存档、联机和排行榜

## 功能

同一个容器提供静态游戏、账号登录、SQLite 存档、在线排行榜、好友邀请及最多四人 WebSocket 联机。没有 Firebase、Google 登录、TURN 或其他按玩家用量收费的后端依赖。

浏览器先保存，再上传 NAS。网络中断时保留待同步副本，重新联网后重试。换设备登录同一 NAS 账号即可下载存档。相同账号的联机连接以最后连接的设备为准；不同设备的存档写入通过版本号检测冲突。

冲突不会自动把金币取最大值，也不会静默覆盖。设置 → 账号提供状态、立即同步、浏览器／NAS 版本选择、备份导出；会话过期后可重新验证游戏账号。每个账号自动保留最近 20 个 NAS 历史版本供维护使用；玩家历史查询和恢复接口关闭。网络响应丢失后的重复保存具有持久化幂等标识。

## 安装

解压 `PokeSurvivor-CN-NAS-0.2.0.zip` 到 NAS 上一个独立目录，例如 `/mnt/user/appdata/pokesurvivor-cn/app`。也可以克隆仓库；发行包已包含构建好的网页，无需在 NAS 安装 Python 或前端构建依赖。

在解压目录复制 `deploy/nas.env.example` 为 `.env`，调整：

```dotenv
HOST_PORT=8766
DATA_PATH=/mnt/user/appdata/pokesurvivor-cn/data
PUBLIC_ORIGIN=https://game.example.com
TRUST_PROXY=true
REGISTRATION=true
PUID=99
PGID=100
```

- `HOST_PORT` 选择未占用端口；容器内始终为 **8080**。
- `PUBLIC_ORIGIN` 是最终访问的精确 HTTPS 来源，不含子路径。局域网初次测试可先留空；公开前填写实际域名。
- 独立子域名部署在 `/`；反代完整转发 `/api/*` 和 `/api/ws`，不要只转发游戏 HTML。
- `REGISTRATION=false` 可关闭新账号注册，已有账号仍能登录。
- 本例使用 Unraid 常见的 99:100；若使用其他 UID/GID，同时调整目录所有者。

首次建立数据目录：

```sh
mkdir -p /mnt/user/appdata/pokesurvivor-cn/data
chown 99:100 /mnt/user/appdata/pokesurvivor-cn/data
docker compose up -d --build
docker compose logs --tail 50
```

容器名称和网络由 Compose 管理；无需 Firebase 项目或云端密钥。数据目录应保留，更新程序不清空它。访问 `http://NAS-IP:8766/api/health` 应得到 `{"ok":true}`。

## 反代

在已有反代中新增游戏子域名，目标为 `http://NAS-IP:8766`，启用 HTTPS 和 WebSocket 支持。Nginx 对应设置：

```nginx
location / {
    proxy_pass http://NAS-IP:8766;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
    client_max_body_size 1m;
}
```

只转发游戏容器，Unraid 管理界面不属于此配置。WebSocket 联机通过相同 HTTPS 入口，不需要额外开放 UDP/TURN 端口。流量经 NAS 转发，NAS 上行和玩家网络延迟影响实际人数及体验。

## 账号

首次注册游戏账号，密码需 8–64 个字符；账号名使用 3–16 个字母、数字或下划线。账号密码不是 Unraid 管理员密码。公开版本不提供旧本地账号导入，以免通过迁移入口回退进度。

## 同步、恢复与退出

- 存档变动立即写入浏览器，约 0.5 秒后尝试上传；失败每 5 秒重试。
- 无待上传改动时，“立即同步”读取 NAS 新版本；有改动时上传。标签页重新可见时也会检查。
- 出现冲突时两份都保留，手动选择后将额外保存冲突备份。不要依靠手动修改时间戳来决定金币归属。
- 未同步或有冲突时，退出账号会被暂停，避免隐藏未完成的同步；可先导出本地备份。会话过期时，账号页仅在会话失效时显示“重新验证游戏账号”。
- 浏览器副本仍依赖网站数据；清除网站数据会删除该副本。NAS 副本可登录后恢复。

## 数据备份与版本回退

账号密码使用带盐 scrypt，数据库仅保存验证散列；会话使用随机 HttpOnly cookie，数据库保存令牌散列。HTTPS 部署启用 Secure cookie。SQLite 文件包含账号及存档，应作为私人数据备份。

通过 SQLite 备份接口产生一致快照，不直接复制正在写入的主文件而漏掉 WAL：

```sh
docker compose exec pokesurvivor node server/backup.cjs /data/backups/manual.sqlite
```

再把备份文件复制到另一块盘或另一台设备。历史版本不是异机备份。

回退前停止容器，保留当前数据目录，再把对应备份恢复为 `/data/pokesurvivor.sqlite`；同时处理与旧数据库不匹配的 `-wal`、`-shm` 文件。程序与数据库快照成套回退。首次部署版 schema 为 1，房间和正在进行的比赛不持久化；容器重启会结束联机房间，已同步的账号及存档保留。

## 排行榜与验收

成绩由登录账号绑定的一次性比赛凭证提交，身份、队伍和伙伴由服务器记录，校验实际经过时间与基本数值范围；重复成绩提交会被拒绝。比赛模拟仍在玩家浏览器中，因此这不是服务器权威战斗或完整防作弊系统。排行榜按 UTC 划分日／周／月，支持单人、团队、伙伴过滤及好友视图。

本机已验证真实 SQLite 重启持久化、两浏览器账号与同步、冲突处理、断网重试、好友邀请、真实联机走位传输、比赛结算和服务端排行。测试未使用 Firebase 配置或 WebSocket 模拟。Docker Compose 配置和基础镜像清单已校验；Unraid 安装、真实域名 HTTPS 及外网多设备联机需在实际 NAS 上验收。

NAS 验收顺序：健康接口 → 注册和刷新恢复 → 两设备登录恢复 → 手机与电脑互加好友／邀请／开局 → 结算排行 → 容器重启后存档恢复 → 确认玩家历史接口返回 403 → SQLite 备份读取。

服务工作线程不会缓存 /api/ 私人响应。离线重新打开 NAS 网页仍取决于此前缓存的网页与素材；完整本机发行包不依赖 NAS 在线。开启 TRUST_PROXY 后，速率限制取可信反代转发链的最后一个有效 IP；容器入口应只经既有反代公开。

## 0.2.1 公开发布检查

玩家端关闭历史查询、恢复和旧本地账号导入；服务器拒绝 /api/history 与 /api/restore（403），旧客户端也不能恢复。自动历史备份仍保留。/dev.html、数据库、.env、server/ 不通过游戏 HTTP 服务暴露。账号删除需验证本人密码；备份导出只下载本人浏览器游戏数据，不包含服务器密码或 NAS 文件。账号公开资料和排行榜仍显示游戏昵称及统计。同步与冲突选择仍保留；由于模拟和存档来自浏览器，此版本不保证防修改存档或作弊。

PUBLIC_ORIGIN 必须包括实际 HTTPS 端口，例如 https://pokemon.blfy.cc:9521。反代保持 WebSocket 支持。更新方式见 deploy/update-unraid.sh；数据库 schema 不变，原账号和存档目录不迁移。
