# 更新日志

本文件记录 `wist-atlas-web` 的所有重要变更。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 变更

- **图谱内核抽到共享包** [`@dayu-sec/wist-atlas-graph@0.1.0`](https://github.com/dayu-sec/wist-atlas-graph)：
  领域类型、版式算法（聚焦 / 运行时 / 服务）、状态与健康口径、搜索索引、画布显示装配
  （`buildDisplayGraph` 及前缀常量）全部改从包里引入；本仓删除对应副本（约 -1900 行）。
  目的是让 `wist-field-web` 的「资产拓扑」页复用同一张画布，而不是 iframe 嵌入整个应用。
- API 客户端改为 `createAtlasClient({ baseUrl, headers, fetchImpl })`；不传参时行为与 0.1.3 一致
  （前缀跟随 `document.baseURI`，令牌读同源 `sessionStorage['wist.console.token']`）。
- **装配逻辑也进了包**（`@dayu-sec/wist-atlas-graph@0.3.1`）：`useTopologyView` 接管取图、
  资卡、进程分组展开/分页、选中/聚焦/搜索；本仓 `App.tsx` 从 777 行降到 ~290 行，只剩页面外壳。
- **画布层也进了包**（`./ui`）：`TopologyCanvas`、
  `NodeCard`、`NodeDetailPanel`、`CanvasToolbar`、`FocusBar`、`StatusDot`、`Sparkline`、
  图标与 `useAppState` 全部删除本地副本，改为从包引入；画布视觉统一由 `GraphRoot` +
  `styles.css` 提供（Tailwind 在包内编译并作用域化，本仓不再为画布维护样式）。
  迁移后用同一份 fixture 做像素比对：与迁移前 0 差异。
- 依赖形态用 GitHub Release 的 tgz 直链（构建镜像里没有 git/ssh，`github:` 简写在
  `node:24-alpine` 上拉不下来）。

## [未发布]

### 变更

- 依赖升到 `@dayu-sec/wist-atlas-graph@0.4.2`：**多主机总览**改为网格版式，只保留主机与
  被多台主机共享的网段；主机内部的运行时/分组/服务/容器在总览里收起，双击主机或点详情面板的
  「查看主机拓扑」进入单机视图。顶栏切换器在多主机时显示「全部主机（总览）」。
- 详情抽屉与聚焦条新增「居中」按钮（快速把当前卡片放回可视区中心，抽屉打开时自动让位）。
- 画布工具条新增 **全部 / 用户 / 系统** 进程过滤；`com.apple.*`、`launchd`、`systemd-*`、内核线程归为系统进程。

## [0.1.2] - 2026-11-05

### 变更

- 嵌在星象台（console-web 的 `/atlas/`）里时，API 请求会带上 `Authorization: Bearer`：
  令牌读宿主页同一个 `sessionStorage` 键（`wist.console.token`）。同源 iframe 共享
  sessionStorage，所以不需要把令牌传参、也不需要 cookie。
- 独立部署（`wist-atlas-stack`）时没有这个键，行为与之前完全一致（不带头）。

## [0.1.1] - 2026-11-02

### 变更

- 支持挂在子路径（`/atlas/`）：构建改为相对资源路径（`base: './'`），
  API 前缀由 `document.baseURI` 推导，不再写死 `/api`。
  用途是嵌进计算区运维台（`wist-console-web`）的「资产拓扑」页。
- `index.html` 的 favicon 改为相对路径；根路径部署行为不变。

## [0.1.0] - 2026-10-28

### 新增

- 从 `wist-atlas/visualization/` 拆出为独立前端仓，保留拓扑画布、主机 / 服务 / 网段焦点视图，
  以及深色 / 浅色主题、聚焦模式和示例遥测。
- 构建产物目录从 `build/` 改为 `dist/`，不再入库。
- 新增 `Dockerfile` + nginx 配置：托管静态资源，并把 `/api` 反代到 `wist-atlas`。
- 新增 CI / release 流水线，release 推送多架构镜像到 GHCR。
- 开发态 `/api` 代理目标可通过 `VITE_API_PROXY_TARGET` 覆盖。

### 配套

- 后端：`wist-atlas v0.3.0`
- 编排：`wist-atlas-stack v0.1.0`
