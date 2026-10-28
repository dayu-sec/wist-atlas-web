# 更新日志

本文件记录 `wist-atlas-web` 的所有重要变更。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

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
