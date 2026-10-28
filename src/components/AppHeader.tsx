import type { HostSummaryDto, HostTopologyHost } from '../types/domain';
import type { HealthCounts, NodeStatus } from '../utils/status';
import { formatRelative } from '../utils/format';
import { BrandMark, ChevronRight, MoonIcon, RefreshIcon, SunIcon } from './icons';

type Props = {
  host: HostTopologyHost | null;
  hostName: string;
  /** 主机列表：多于一台时顶栏变成切换器。 */
  hosts: HostSummaryDto[];
  /** 当前聚焦的主机；空字符串 = 全部主机（总览）。 */
  selectedHostId: string;
  onSelectHost: (hostId: string) => void;
  scannedAt?: string | null;
  loading: boolean;
  onRefresh: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  hostStatus: NodeStatus;
  health: HealthCounts;
  demo: boolean;
  onToggleDemo: () => void;
};

/**
 * 一条 52px 的顶栏承担四件事：产品身份、我在哪、换一台机器看、这份数据有多新。
 * 搜索/布局这些画布操作不放这里 —— 它们属于画布，见 CanvasToolbar。
 */
export default function AppHeader({
  host,
  hostName,
  hosts,
  selectedHostId,
  onSelectHost,
  scannedAt,
  loading,
  onRefresh,
  theme,
  onToggleTheme,
  hostStatus,
  health,
  demo,
  onToggleDemo,
}: Props) {
  const os = [host?.osName, host?.osVersion].filter(Boolean).join(' ');
  const relative = scannedAt ? formatRelative(scannedAt) : null;
  const pingColor =
    hostStatus.tone === 'ok'
      ? 'bg-ok'
      : hostStatus.tone === 'warn'
        ? 'bg-warn'
        : hostStatus.tone === 'danger'
          ? 'bg-danger'
          : 'bg-ink-faint';
  const healthTone =
    health.danger > 0 ? 'danger' : health.warn > 0 ? 'warn' : health.ok > 0 ? 'ok' : 'unknown';
  const healthText =
    health.danger > 0
      ? `${health.danger} 异常`
      : health.warn > 0
        ? `${health.warn} 注意`
        : health.ok > 0
          ? '全部正常'
          : '未采集';

  return (
    <header className="shell flex h-[52px] shrink-0 items-center gap-2.5 border-b border-line px-4">
      <div className="flex items-center gap-2">
        <BrandMark className="size-[26px]" />
        <span className="text-[13px] font-semibold tracking-[-0.01em] text-ink">wist-atlas</span>
      </div>

      <span className="mx-1 h-4 w-px bg-line-strong/70" aria-hidden />

      <nav className="flex min-w-0 items-center gap-1 text-[12px]" aria-label="位置">
        <span className="shrink-0 text-ink-faint">资产</span>
        <ChevronRight className="size-3 shrink-0 text-line-strong" />
        <span className="shrink-0 text-ink-faint">主机</span>
        <ChevronRight className="size-3 shrink-0 text-line-strong" />
        {hosts.length > 1 ? (
          <select
            value={selectedHostId}
            onChange={(event) => onSelectHost(event.target.value)}
            aria-label="切换主机"
            title={`共 ${hosts.length} 台主机`}
            className="h-6 max-w-[220px] truncate rounded-md border border-line bg-surface px-1.5 text-[12px] font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          >
            <option value="">全部主机（总览）</option>
            {hosts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.hostName}
                {item.stale ? '（已退役）' : ''}
              </option>
            ))}
          </select>
        ) : (
          <span className="truncate font-medium text-ink" title={hostName}>
            {hostName}
          </span>
        )}
      </nav>

      {os && (
        <span className="ml-1 hidden shrink-0 rounded-md border border-line bg-elevated px-1.5 py-0.5 text-[10px] text-ink-soft xl:inline">
          {os}
        </span>
      )}
      {host?.arch && (
        <span className="hidden shrink-0 rounded-md border border-line bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-ink-mute xl:inline">
          {host.arch}
        </span>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="flex items-center gap-1.5 text-[11px] text-ink-mute">
          <span className="relative flex size-1.5">
            <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-40 ${pingColor}`} />
            <span className={`relative inline-flex size-1.5 rounded-full ${pingColor}`} />
          </span>
          {loading ? '同步中' : relative ? `${hostStatus.label} · ${relative}` : '等待同步'}
        </span>

        <span className="hidden items-center gap-1.5 rounded-full border border-line bg-elevated px-2 py-1 text-[10px] text-ink-soft md:inline-flex">
          <span className={`dot ${healthTone}`} />
          {healthText}
        </span>

        <button
          type="button"
          onClick={onToggleDemo}
          title={
            demo
              ? '关闭示例数据：当前流量、健康、趋势是演示值'
              : '打开示例数据：用演示值预览流量、健康、趋势'
          }
          className={`flex h-7 items-center gap-1.5 rounded-full border px-2 text-[10px] font-medium transition-colors ${
            demo
              ? 'border-warn-line bg-warn-soft text-warn-strong'
              : 'border-line bg-elevated text-ink-faint hover:text-ink-soft'
          }`}
        >
          <span className={`size-1.5 rounded-full ${demo ? 'bg-warn' : 'bg-ink-faint'}`} />
          {demo ? '示例数据' : '真实数据'}
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
          title={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
          className="grid size-8 place-items-center rounded-lg border border-line bg-surface text-ink-soft transition-colors hover:border-line-strong hover:bg-elevated"
        >
          {theme === 'dark' ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[12px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshIcon className={`size-3.5 text-ink-mute ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>
    </header>
  );
}
