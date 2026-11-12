import type { NetworkDomainItem } from '../api/assets';
import { accountShort } from '../api/assets';
import { ChevronRight, KindGlyph } from '@dayu-sec/wist-atlas-graph/ui';

type Props = {
  domains: NetworkDomainItem[] | null;
  loading: boolean;
  error?: string | null;
  collapsed: boolean;
  onToggle: () => void;
};

function totalHosts(domain: NetworkDomainItem): number {
  return domain.segments.reduce((sum, segment) => sum + segment.hostCount, 0);
}

/**
 * 这一批 VPC 属于哪个账号。
 *
 * 单账号是常态，显示尾号；多账号时**不能**拿第一个冒充全部 —— 那会让人以为
 * 「这些 VPC 都是那个账号的」。
 */
function accountLine(domains: NetworkDomainItem[]): string | null {
  const accounts = [...new Set(domains.map((domain) => domain.cloudAccount).filter(Boolean))];
  if (accounts.length === 0) return null;
  if (accounts.length === 1) return `账号 ${accountShort(accounts[0] as string)}`;
  return `${accounts.length} 个账号`;
}

/**
 * 左栏的「网络」面板：VPC → 子网。
 *
 * 为什么值得单独一栏：画布上只能看到「被主机用到的网段」，而 VPC 是地址空间的
 * 边界 —— 「这个账号里有几个 VPC、各自多大、哪些子网还没挂机器」只有列表能回答。
 * 未挂主机的子网恰恰是要看的：空子网是 CIDR 浪费，也可能是不该存在的东西。
 */
export default function NetworkPanel({ domains, loading, error, collapsed, onToggle }: Props) {
  const total = domains?.length ?? 0;
  const segmentTotal = domains?.reduce((sum, domain) => sum + domain.segments.length, 0) ?? 0;

  return (
    <section className="border-b border-line">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1 text-[9.5px] font-medium uppercase tracking-[0.08em] text-ink-faint transition-colors hover:text-ink-soft"
        >
          <ChevronRight className={`size-3 transition-transform ${collapsed ? '' : 'rotate-90'}`} />
          网络
          {total > 0 && (
            <span className="text-ink-faint">
              {' '}
              {total} VPC · {segmentTotal} 子网
            </span>
          )}
        </button>
      </div>

      {collapsed ? null : (
        <div className="px-4 pb-3.5">
          {error ? (
            <p className="text-[10.5px] leading-4 text-danger-strong">{error}</p>
          ) : loading && !domains ? (
            <p className="text-[10.5px] text-ink-faint">正在读取网络…</p>
          ) : total === 0 ? (
            <p className="text-[10.5px] text-ink-faint">还没有采集到 VPC</p>
          ) : (
            <ul className="-mx-1 space-y-1">
              {domains?.map((domain) => (
                <li key={domain.id}>
                  <details className="group/vpc">
                    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[7px] px-1 py-1 transition-colors hover:bg-elevated">
                      <span
                        className="grid size-5 shrink-0 place-items-center rounded-[6px]"
                        style={{
                          backgroundColor: 'var(--node-network-fill, var(--color-elevated))',
                          color: 'var(--node-network-stroke, var(--color-ink-mute))',
                        }}
                        aria-hidden
                      >
                        <KindGlyph kind="NetworkSegment" className="size-3" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-1.5">
                          <span className="truncate text-[11px] leading-4 text-ink-soft">
                            {domain.name}
                          </span>
                          {domain.cidr && (
                            <span className="shrink-0 font-mono text-[9.5px] text-ink-faint">
                              {domain.cidr}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[9.5px] text-ink-faint">
                          <span className="truncate font-mono">{domain.externalRef}</span>
                          <span className="tnum shrink-0">
                            {domain.segments.length} 子网 · {totalHosts(domain)} 主机
                          </span>
                        </span>
                      </span>
                      <ChevronRight className="size-3 shrink-0 text-ink-faint transition-transform group-open/vpc:rotate-90" />
                    </summary>

                    <div className="ml-7 mt-1 space-y-0.5 border-l border-line pl-2.5">
                      {domain.segments.length === 0 ? (
                        <p className="py-1 text-[9.5px] text-ink-faint">这个 VPC 下没有子网</p>
                      ) : (
                        domain.segments.map((segment) => (
                          <div key={segment.id} className="flex items-baseline gap-1.5 py-0.5">
                            <span className="min-w-0 flex-1 truncate text-[10.5px] text-ink-mute">
                              {segment.name}
                            </span>
                            <span className="shrink-0 font-mono text-[9.5px] text-ink-faint">
                              {segment.cidr ?? '—'}
                            </span>
                            <span
                              className={`tnum shrink-0 text-[9.5px] ${
                                segment.hostCount === 0 ? 'text-warn-strong' : 'text-ink-faint'
                              }`}
                              title={segment.hostCount === 0 ? '空子网：没有主机在用' : undefined}
                            >
                              {segment.hostCount}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}

          {total > 0 && (
            <p className="mt-2 px-1 text-[9.5px] leading-4 text-ink-faint">
              {[accountLine(domains ?? []), '右侧数字是该子网的主机数']
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
