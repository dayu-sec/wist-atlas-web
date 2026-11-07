# wist-atlas-web

`wist-atlas` 的可视化前端。独立构建、独立发版，通过 `/api` 访问 `wist-atlas` 后端。

- 后端仓：[`wist-atlas`](https://github.com/dayu-sec/wist-atlas)
- 编排仓：[`wist-atlas-stack`](https://github.com/dayu-sec/wist-atlas-stack)
- 图谱内核：[`wist-atlas-graph`](https://github.com/dayu-sec/wist-atlas-graph)

## 技术栈

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- Cytoscape（拓扑画布）

## 图谱内核（共享包）

领域类型、版式算法（聚焦剖面 / 运行时网格 / 服务焦点图）、节点状态口径、画布显示装配
（TopN / 溢出节点 / 单进程折叠）以及只读 API 客户端，都在
[`@dayu-sec/wist-atlas-graph`](https://github.com/dayu-sec/wist-atlas-graph)；`wist-field-web`
的「资产拓扑」页用的是同一份。本仓只保留页面外壳（顶栏 / 左栏 / 状态栏）与主题。

依赖形态是 **GitHub Release 里的 tgz 直链**，不是 `github:` 简写：

```json
"@dayu-sec/wist-atlas-graph": "https://github.com/dayu-sec/wist-atlas-graph/releases/download/v0.2.0/dayu-sec-wist-atlas-graph-0.2.0.tgz"
```

镜像是 `node:24-alpine`，构建阶段没有 git / ssh 凭据，`github:` 简写会在 `npm ci` 阶段拉不下来；
Release 的 tgz 里已经带好 `dist/`，HTTPS 直取即可。升级按时改 tag 号，并在两个仓同步。

## 开发

```bash
npm ci
npm run dev
```

默认把 `/api` 代理到 `http://localhost:8080`（`atlas` 的默认监听地址）。后端不在默认地址时：

```bash
VITE_API_PROXY_TARGET=http://127.0.0.1:18080 npm run dev
```

后端可先用内存演示模式启动：

```bash
cd ../wist-atlas
cargo run -p atlas-app -- memory serve --listen 0.0.0.0:8080
```

## 构建与检查

```bash
npm run build   # 输出到 dist/
npm run lint
```

## 镜像

```bash
docker build -t wist-atlas-web:dev .
```

运行镜像时把 `/api` 反代到后端：

```bash
docker run --rm -p 8080:80 \
  --add-host atlas:host-gateway \
  wist-atlas-web:dev
```

镜像内 nginx 监听 `80`，静态文件来自 `dist/`，`/api` 反代到 `http://atlas:8080`。
在 `wist-atlas-stack` 里，`atlas` 是 compose 服务名，不需要额外配置。

## 目录

```text
src/
  components/  页面外壳：顶栏、左栏资产卡、图例、服务清单、状态栏
  hooks/       主题
  App.tsx      数据装配（graph / 资产卡 / 展开状态）
public/
  fixtures/    零后端依赖的示例数据
```

API 契约以后端仓的 [`doc/frontend/api-contract.md`](https://github.com/dayu-sec/wist-atlas/blob/main/doc/frontend/api-contract.md) 为准。

## 挂在子路径（`/atlas/`）

本前端可以整站在子路径下提供（计算区运维台 `wist-console-web` 就是这么嵌的）：

- 构建用相对资源路径（`vite.config.ts` 的 `base: './'`），同一份产物既能挂根也能挂子路径；
- API 前缀按 `document.baseURI` 推导：挂根是 `/api`，挂 `/atlas/` 时是 `/atlas/api`；
- 宿主（例如 console-web 的 nginx）负责把 `/atlas/` 前缀剥掉再转给本容器：

```nginx
location /atlas/ {
    proxy_pass http://atlas-web:80/;
}
```

挂在子路径时，入口 URL 必须带尾斜杠（`/atlas/`）—— `document.baseURI` 才能解析成 `/atlas/api`。
