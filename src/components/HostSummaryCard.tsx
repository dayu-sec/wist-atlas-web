import type { HostTopologyHost } from '../types/domain';
import { formatCount, formatRelative } from '../utils/format';
import { formatMbps, type HostTelemetry } from '../utils/telemetry';
import type { NodeStatus } from '../utils/status';
import { HostGlyph } from './icons';
import Sparkline from './Sparkline';
import StatusDot from './StatusDot';

export type TopGroupSummary = { name: string; count: number };

type Props = {
  host: HostTopologyHost | null;
  segmentCount: number;
  processCount: number;
  groupCount: number;
  serviceCount: number;
  topGroups: TopGroupSummary[];
  generatedAt?: string | null;
  loading: boolean;
  /** 点「服务」指标打开左栏的服务清单。 */
  onOpenServices?: () => void;
  /** 这台主机的容器数。为 0 时不占位置。 */
  containerCount?: number;
  status: NodeStatus;
  telemetry?: HostTelemetry;
  demo: boolean;
};

/**
 * 左栏是「这台机器的档案」，不是第二张图。
 *
 * 上一版把四个指标塞进四块灰色方块、底下一整条空白；现在指标用带分隔线的紧凑表格，
 * 下面接「高频进程」—— 1,120 个进程这个数字终于有了可读的构成。
 */
export default function HostSummaryCard({
  host,
  segmentCount,
  processCount,
  groupCount,
  serviceCount,
  topGroups,
  generatedAt,
  loading,
  onOpenServices,
  containerCount = 0,
  status,
  telemetry,
  demo,
}: Props) {
  const os = [host?.osName, host?.osVersion].filter(Boolean).join(' ');
  const maxCount = topGroups.reduce((max, group) => Math.max(max, group.count), 0);

  const metrics: { label: string; value: number; onClick?: () => void }[] = [
    { label: '网段', value: segmentCount },
    { label: '进程', value: processCount },
    { label: '进程分组', value: groupCount },
    { label: '服务', value: serviceCount, onClick: onOpenServices },
  ];

  return (
    <section className="border-b border-line px-4 pb-4 pt-4">
      <div className="flex items-start gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-[11px]"
          style={{ backgroundColor: 'var(--node-host-fill)', color: 'var(--node-host-stroke)' }}
          aria-hidden
        >
          <HostGlyph className="size-[19px]" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="truncate text-[15px] font-semibold leading-5 tracking-[-0.01em] text-ink">
            {host?.hostName ?? (loading ? '加载中…' : '未选择主机')}
          </h2>
          <p className="mt-1 truncate text-[11px] leading-4 text-ink-mute">
            {os || '系统信息未采集'}
            {host?.arch ? <span className="font-mono text-[10.5px] text-ink-faint"> · {host.arch}</span> : null}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[10px] leading-3 text-ink-mute">
            <StatusDot tone={status.tone} label={status.label} />
            <span>{status.label}</span>
            {generatedAt ? <span className="text-ink-faint">· 盘点于 {formatRelative(generatedAt)}</span> : null}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-[10px] border border-line">
        {metrics.map((metric, index) => {
          const cellClass = [
            'px-3 py-2.5 text-left',
            index % 2 === 0 ? 'border-r border-line' : '',
            index < 2 ? 'border-b border-line' : '',
            metric.onClick ? 'transition-colors hover:bg-elevated' : '',
          ].join(' ');
          const content = (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[9.5px] font-medium uppercase leading-none tracking-[0.08em] text-ink-faint">
                  {metric.label}
                </span>
                {metric.onClick && <span className="text-[9px] text-ink-faint">清单 ›</span>}
              </div>
              <div className="tnum mt-1 text-[18px] font-semibold leading-6 tracking-[-0.01em] text-ink">
                {formatCount(metric.value)}
              </div>
            </>
          );
          return metric.onClick ? (
            <button
              key={metric.label}
              type="button"
              onClick={metric.onClick}
              className={cellClass}
            >
              {content}
            </button>
          ) : (
            <div key={metric.label} className={cellClass}>
              {content}
            </div>
          );
        })}
      </div>

      {telemetry ? (
        <div className="mt-3 rounded-[10px] border border-line bg-elevated px-3 py-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-ink-faint">
              吞吐{demo ? ' · 示例' : ''}
            </span>
            <span className="text-[9px] text-ink-faint">近 15 分钟</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="tnum text-[16px] font-semibold leading-5 text-ink">
              {formatMbps(telemetry.inMbps)}
            </span>
            <span className="text-[9px] text-ink-faint">MB/s ↓</span>
            <span className="tnum ml-auto text-[10px] text-ink-mute">
              {formatMbps(telemetry.outMbps)} ↑
            </span>
          </div>
          <Sparkline values={telemetry.history} height={32} className="mt-1" />
        </div>
      ) : (
        <div className="mt-3 rounded-[10px] border border-dashed border-line px-3 py-2 text-[10px] text-ink-faint">
          遥测未接入 · 流量与趋势暂不可用
        </div>
      )}

      {containerCount > 0 && (
        <div className="mt-2 flex items-center justify-between text-[10.5px]">
          <span className="text-ink-faint">容器</span>
          <span className="tnum text-ink-soft">{formatCount(containerCount)}</span>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            高频进程
          </h3>
          <span className="text-[9.5px] text-ink-faint">按进程数</span>
        </div>

        {topGroups.length > 0 ? (
          <ul className="mt-2.5 space-y-2.5">
            {topGroups.map((group) => (
              <li key={group.name}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[11px] leading-4 text-ink-soft" title={group.name}>
                    {group.name}
                  </span>
                  <span className="tnum shrink-0 text-[10px] text-ink-mute">
                    {formatCount(group.count)}
                  </span>
                </div>
                <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-subtle">
                  <div
                    className="h-full rounded-full bg-brand/35"
                    style={{ width: `${maxCount > 0 ? Math.max(3, (group.count / maxCount) * 100) : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[10.5px] text-ink-faint">
            {loading ? '正在读取进程分组…' : '暂无进程分组数据'}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3 text-[10.5px]">
        <span className="text-ink-faint">盘点时间</span>
        <span className="text-ink-soft" title={generatedAt ?? undefined}>
          {generatedAt ? formatRelative(generatedAt) : '—'}
        </span>
      </div>
    </section>
  );
}
