import type {
  ApiResponse,
  HostListDto,
  HostProcessGroupsPageDto,
  HostProcessOverviewDto,
  HostProcessTopologyGraph,
  HostTopologyDto,
  ServiceListDto,
} from '../types/domain';

// API 前缀跟随页面 base：挂在根时是 `/api`，挂在 `/atlas/` 下时是 `/atlas/api`。
// 子路径部署由宿主反代（console-web 的 `location /atlas/`）把前缀剥掉。
const BASE = new URL('api', document.baseURI).pathname.replace(/\/$/, '');

/** 嵌在星象台里时，用宿主页同一个 sessionStorage 键的访问令牌。 */
function bearerHeader(): Record<string, string> {
  try {
    const token = window.sessionStorage.getItem('wist.console.token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
  try {
    const url = new URL(`${BASE}${path}`, window.location.origin);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      // 星象台的 `/atlas/` 是**同源 iframe**，拿不到宿主页面的 JS 变量，
      // 但同源共享 `sessionStorage`：读同一个键，把令牌带到 BFF。
      // 独立部署（wist-atlas-stack）没有这个键，就不带头 —— 行为与以前一致。
      headers: bearerHeader(),
    });
    if (!res.ok) {
      return { status: 'error', code: String(res.status), message: res.statusText };
    }
    return res.json() as Promise<ApiResponse<T>>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'error', code: 'fetch_failed', message };
  }
}

// V1 required
export async function fetchHostTopology(hostId: string): Promise<ApiResponse<HostTopologyDto>> {
  return get<HostTopologyDto>(`/topology/host/${hostId}`);
}

export async function fetchFirstHostTopology(): Promise<ApiResponse<HostTopologyDto>> {
  return get<HostTopologyDto>('/topology/host/first');
}

/** 主机列表：顶栏切换器的数据源。默认不含已退役主机。 */
export async function fetchHosts(): Promise<ApiResponse<HostListDto>> {
  return get<HostListDto>('/hosts');
}

/** 服务清单：按「铺得多广」排序，只带规模指标（端点属于服务焦点视图）。 */
export async function fetchServices(): Promise<ApiResponse<ServiceListDto>> {
  return get<ServiceListDto>('/services');
}

// V1 optional enhancement
export async function fetchNetworkTopology(networkId: string): Promise<ApiResponse<HostProcessTopologyGraph>> {
  return get<HostProcessTopologyGraph>(`/topology/network/${networkId}`);
}

/** 服务焦点图：谁在监听、这套服务还跑在哪些主机上。 */
export async function fetchServiceTopology(serviceId: string): Promise<ApiResponse<HostProcessTopologyGraph>> {
  return get<HostProcessTopologyGraph>(`/topology/service/${serviceId}`);
}

// Dev-only mock (against Rust mock endpoint)
export async function fetchMockHostTopology(): Promise<ApiResponse<HostProcessTopologyGraph>> {
  return get<HostProcessTopologyGraph>('/__mock/topology/host');
}

// Static fixture loader (zero backend dependency)
export async function loadFixture(name: string): Promise<ApiResponse<HostProcessTopologyGraph>> {
  try {
    const res = await fetch(`/fixtures/${name}.json`);
    if (!res.ok) {
      return { status: 'error', code: String(res.status), message: res.statusText };
    }
    return res.json() as Promise<ApiResponse<HostProcessTopologyGraph>>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'error', code: 'fetch_failed', message };
  }
}

export async function fetchHostProcessTopology(hostId: string): Promise<ApiResponse<HostProcessTopologyGraph>> {
  return get<HostProcessTopologyGraph>(`/topology/host/${hostId}/processes`);
}

export async function fetchFirstHostProcessTopology(): Promise<ApiResponse<HostProcessTopologyGraph>> {
  return get<HostProcessTopologyGraph>('/topology/host/first/processes');
}

export async function fetchHostProcessOverview(
  hostId: string,
  topN = 12,
): Promise<ApiResponse<HostProcessOverviewDto>> {
  return get<HostProcessOverviewDto>(`/topology/host/${hostId}/process-overview`, {
    top_n: String(topN),
  });
}

export async function fetchHostProcessGroupsPage(
  hostId: string,
  limit = 50,
  offset = 0,
): Promise<ApiResponse<HostProcessGroupsPageDto>> {
  return get<HostProcessGroupsPageDto>(`/topology/host/${hostId}/process-groups`, {
    limit: String(limit),
    offset: String(offset),
  });
}
