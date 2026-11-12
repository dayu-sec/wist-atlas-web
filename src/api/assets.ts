/**
 * 资产面板的只读取数（VPC / 子网、公网 IP）。
 *
 * 为什么不放进 `@dayu-sec/wist-atlas-graph`：这两个是**产品外壳**的面板（和
 * `ServiceListPanel` 一样），不是画布能力；放进包里就得为两个列表发一次 npm 版本。
 * 但「API 前缀」和「令牌从哪来」必须与画布同一套口径 —— 这里刻意抄
 * `createAtlasClient` 的默认值，改口径时两处一起改。
 */

export type NetworkSegmentItem = {
  id: string;
  externalRef: string | null;
  name: string;
  cidr: string | null;
  gatewayIp: string | null;
  addressFamily: string;
  cloudAccount: string | null;
  stale: boolean;
  /** 还挂在这个子网上的主机数（只算没封口的关联）。 */
  hostCount: number;
};

export type NetworkDomainItem = {
  id: string;
  externalRef: string | null;
  name: string;
  cidr: string | null;
  cloudAccount: string | null;
  stale: boolean;
  staleAt: string | null;
  segments: NetworkSegmentItem[];
};

export type ElasticIpItem = {
  id: string;
  externalRef: string;
  address: string;
  /** `bound` / `unbound` / `unknown`。 */
  status: string;
  chargeType: string | null;
  bandwidthMbps: number | null;
  cloudAccount: string | null;
  /** `host` / `nat_gateway` / `clb` … */
  boundTargetKind: string | null;
  boundHostId: string | null;
  /** 认不出主机时至少知道云上绑了谁（`ins-xxx` / `nat-xxx`）。 */
  boundExternalTargetRef: string | null;
  boundSince: string | null;
  lastInventoryAt: string;
  stale: boolean;
  staleAt: string | null;
};

export type AssetListResult<T> =
  | { ok: true; items: T[] }
  | { ok: false; message: string };

/** 前缀跟随页面 base：挂根时 `/api`，挂 `/atlas/` 下时 `/atlas/api`。 */
function apiBase(): string {
  if (typeof document === 'undefined') return '/api';
  try {
    return new URL('api', document.baseURI).pathname.replace(/\/$/, '');
  } catch {
    return '/api';
  }
}

function authHeaders(): Record<string, string> {
  try {
    const token = window.sessionStorage.getItem('wist.console.token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

type Envelope = {
  status?: string;
  data?: unknown;
  code?: string;
  message?: string;
};

function asItems<T>(data: unknown, key: string): T[] {
  const holder = data as Record<string, unknown> | null;
  const value = holder?.[key];
  if (!Array.isArray(value)) throw new Error(`缺少 ${key}`);
  return value as T[];
}

async function getList<T>(
  path: string,
  pick: (data: unknown) => T[],
): Promise<AssetListResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, { headers: authHeaders() });
  } catch (err) {
    return { ok: false, message: `请求失败：${err instanceof Error ? err.message : String(err)}` };
  }
  if (!response.ok) {
    return { ok: false, message: `HTTP ${response.status}` };
  }
  let body: Envelope;
  try {
    body = (await response.json()) as Envelope;
  } catch {
    return { ok: false, message: '响应不是 JSON' };
  }
  if (body.status !== 'ok') {
    return {
      ok: false,
      message: [body.code, body.message].filter(Boolean).join(' ') || '未知错误',
    };
  }
  try {
    return { ok: true, items: pick(body.data) };
  } catch {
    return { ok: false, message: '响应形状不符合预期' };
  }
}

/** VPC + 子网（含每段主机数）。 */
export function fetchNetworkDomains(): Promise<AssetListResult<NetworkDomainItem>> {
  return getList('/network-domains?limit=200', (data) =>
    asItems<NetworkDomainItem>(data, 'networkDomains'),
  );
}

/** 弹性公网 IP（含绑定目标）。默认隐藏云上已释放的。 */
export function fetchElasticIps(): Promise<AssetListResult<ElasticIpItem>> {
  return getList('/elastic-ips?limit=500', (data) => asItems<ElasticIpItem>(data, 'elasticIps'));
}

/** 云账号键 `tencent:100041355715` → `100041355715`。 */
export function accountShort(account: string | null): string | null {
  if (!account) return null;
  const at = account.lastIndexOf(':');
  return at >= 0 ? account.slice(at + 1) : account;
}

const CHARGE_TYPES: Record<string, string> = {
  TRAFFIC_POSTPAID_BY_HOUR: '按流量',
  BANDWIDTH_POSTPAID_BY_HOUR: '按带宽',
  BANDWIDTH_PREPAID: '带宽包年包月',
  BANDWIDTH_PACKAGE: '共享带宽包',
};

const TARGET_KINDS: Record<string, string> = {
  host: '主机',
  cvm: '主机',
  nat_gateway: 'NAT 网关',
  clb: '负载均衡',
};

/** 计费方式：云侧给的是大写下划线码，面板里要能读。 */
export function chargeTypeLabel(code: string | null): string | null {
  if (!code) return null;
  return CHARGE_TYPES[code] ?? code;
}

/** 绑定目标类型：`nat_gateway` → `NAT 网关`。 */
export function targetKindLabel(kind: string | null): string | null {
  if (!kind) return null;
  return TARGET_KINDS[kind] ?? kind;
}

/**
 * 闲置判定：只有 `unbound` 算闲置。
 *
 * `unknown`（云侧状态没归一出来）不算 —— 闲置是要花钱的结论，猜错会让人去删一个
 * 还在用的地址。面板上仍会给它一个中性底色，让人自己看。
 */
export function isIdle(ip: ElasticIpItem): boolean {
  return ip.status === 'unbound';
}
