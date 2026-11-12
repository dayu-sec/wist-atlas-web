import type { ElasticIpItem } from '../api/assets';
import { chargeTypeLabel, isIdle, targetKindLabel } from '../api/assets';
import { ChevronRight } from '@dayu-sec/wist-atlas-graph/ui';

type Props = {
  ips: ElasticIpItem[] | null;
  loading: boolean;
  error?: string | null;
  collapsed: boolean;
  onToggle: () => void;
};

function bindingText(ip: ElasticIpItem): string {
  const kind = targetKindLabel(ip.boundTargetKind);
  const target = ip.boundExternalTargetRef;
  if (!kind && !target) return '未绑定';
  return [kind, target].filter(Boolean).join(' · ');
}

/**
 * 左栏的「公网 IP」面板。
 *
 * 这一栏同时服务两个产品轴：
 * - **成本**：`unbound` 的地址照样按小时计费，是纯浪费，所以排最前面并标黄；
 * - **暴露面**：绑在主机上的地址就是这台机对外可见的入口，数量本身就是风险信号。
 *
 * 状态只认云侧给的三档（`bound` / `unbound` / `unknown`）。`unknown` 不标黄 ——
 * 「闲置」是要花钱的结论，猜错会让人去删一个还在用的地址。
 */
export default function PublicIpPanel({ ips, loading, error, collapsed, onToggle }: Props) {
  const total = ips?.length ?? 0;
  const idle = ips?.filter(isIdle).length ?? 0;
  // 闲置排前面：那是最该被处理的一批。
  const sorted = ips ? [...ips].sort((a, b) => Number(isIdle(b)) - Number(isIdle(a))) : [];

  return (
    <section className="border-b border-line">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1 text-[9.5px] font-medium uppercase tracking-[0.08em] text-ink-faint transition-colors hover:text-ink-soft"
        >
          <ChevronRight className={`size-3 transition-transform ${collapsed ? '' : 'rotate-90'}`} />
          公网 IP
          {total > 0 && (
            <span className={idle > 0 ? 'text-warn-strong' : 'text-ink-faint'}>
              {' '}
              {total}
              {idle > 0 ? ` · ${idle} 闲置` : ''}
            </span>
          )}
        </button>
      </div>

      {collapsed ? null : (
        <div className="px-4 pb-3.5">
          {error ? (
            <p className="text-[10.5px] leading-4 text-danger-strong">{error}</p>
          ) : loading && !ips ? (
            <p className="text-[10.5px] text-ink-faint">正在读取公网 IP…</p>
          ) : total === 0 ? (
            <p className="text-[10.5px] text-ink-faint">还没有采集到公网 IP</p>
          ) : (
            <ul className="-mx-1 space-y-0.5">
              {sorted.map((ip) => {
                const idleIp = isIdle(ip);
                return (
                  <li
                    key={ip.id}
                    className="rounded-[7px] px-1 py-1 transition-colors hover:bg-elevated"
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${
                          idleIp ? 'bg-warn' : 'bg-ok'
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-soft">
                        {ip.address}
                      </span>
                      {ip.bandwidthMbps !== null && (
                        <span className="tnum shrink-0 text-[9.5px] text-ink-faint">
                          {ip.bandwidthMbps} Mbps
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-1.5 pl-3 text-[9.5px]">
                      <span
                        className={`truncate ${
                          idleIp ? 'text-warn-strong' : 'text-ink-mute'
                        }`}
                        title={ip.boundExternalTargetRef ?? undefined}
                      >
                        {bindingText(ip)}
                      </span>
                      <span className="ml-auto shrink-0 text-ink-faint">
                        {[chargeTypeLabel(ip.chargeType), `#${ip.externalRef}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {total > 0 && (
            <p className="mt-2 px-1 text-[9.5px] leading-4 text-ink-faint">
              闲置地址照样按小时计费 · 数据来自云账号采集
            </p>
          )}
        </div>
      )}
    </section>
  );
}
