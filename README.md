# wist-atlas-web

`wist-atlas` 的可视化前端。独立构建、独立发版，通过 `/api` 访问 `wist-atlas` 后端。

- 后端仓：[`wist-atlas`](https://github.com/dayu-sec/wist-atlas)
- 编排仓：[`wist-atlas-stack`](https://github.com/dayu-sec/wist-atlas-stack)

## 技术栈

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- Cytoscape（拓扑画布）

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
  api/         后端 API client
  components/  画布、面板、卡片
  hooks/       状态与主题
  types/       前端 DTO（对应后端 api-contract.md）
  utils/       纯展示逻辑
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
