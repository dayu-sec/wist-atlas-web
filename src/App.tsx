import { useEffect, useMemo, useState } from 'react';
import { useTheme } from './hooks/useTheme';
import AppHeader from './components/AppHeader';
import LegendCard from './components/LegendCard';
import HostSummaryCard from './components/HostSummaryCard';
import StatusBar from './components/StatusBar';
import ServiceListPanel from './components/ServiceListPanel';
import { ChevronRight, TopologyCanvasView, useTopologyView } from '@dayu-sec/wist-atlas-graph/ui';
import { createAtlasClient } from '@dayu-sec/wist-atlas-graph';
import type { ServiceSummaryDto } from '@dayu-sec/wist-atlas-graph';

const USE_FIXTURE = import.meta.env.VITE_USE_FIXTURE === '1';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  // 独立部署：前缀跟随页面 base，令牌读同源 sessionStorage —— 与迁移前一致。
  const client = useMemo(() => createAtlasClient(), []);
  const [demoTelemetry, setDemoTelemetry] = useState(() => {
    try {
      const stored = window.localStorage.getItem('wist-atlas-demo');
      if (stored === '1' || stored === '0') return stored === '1';
    } catch {
      // 忽略隐私模式
    }
    return import.meta.env.DEV;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('wist-atlas-demo', demoTelemetry ? '1' : '0');
    } catch {
      // 忽略
    }
  }, [demoTelemetry]);

  const view = useTopologyView({
    client,
    demo: demoTelemetry,
    fixture: USE_FIXTURE ? 'live-topology' : undefined,
  });

  // —— 以下三块是「产品外壳」才有状态：服务清单抽屉、按对象 ID 查询、资产卡回退 ——
  const [hostQueryId, setHostQueryId] = useState('');
  const [networkId, setNetworkId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [serviceListOpen, setServiceListOpen] = useState(false);
  const [serviceListCollapsed, setServiceListCollapsed] = useState(false);
  const [services, setServices] = useState<ServiceSummaryDto[] | null>(null);
  const [serviceListLoading, setServiceListLoading] = useState(false);
  const [serviceListError, setServiceListError] = useState<string | null>(null);

  const toggleServiceList = () => {
    setServiceListOpen((current) => {
      const next = !current;
      if (next) setServiceListCollapsed(false);
      return next;
    });
  };

  useEffect(() => {
    if (USE_FIXTURE || !serviceListOpen || services) return;
    let cancelled = false;
    // 服务清单是懒加载的外部数据，进入 loading 是这次请求的同步起点。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServiceListLoading(true);
    setServiceListError(null);
    client.fetchServices().then((res) => {
      if (cancelled) return;
      setServiceListLoading(false);
      if (res.status === 'ok') setServices(res.data.services);
      else setServiceListError(`[${res.code}] ${res.message}`);
    });
    return () => {
      cancelled = true;
    };
  }, [client, serviceListOpen, services]);

  const railHost =
    view.hostTopology?.host ??
    (view.primaryHostNode
      ? {
          id: view.primaryHostNode.objectId,
          hostName: view.primaryHostNode.label,
          machineId: null,
          osName: (view.primaryHostNode.properties.osName as string | undefined) ?? null,
          osVersion: (view.primaryHostNode.properties.osVersion as string | undefined) ?? null,
          arch: null,
        }
      : null);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <AppHeader
        host={railHost}
        hostName={railHost?.hostName ?? '未选择主机'}
        hosts={view.hosts}
        selectedHostId={view.hostId}
        onSelectHost={(nextHostId) => view.setHostId(nextHostId)}
        scannedAt={view.scannedAt}
        loading={view.loading}
        onRefresh={view.refresh}
        theme={theme}
        onToggleTheme={toggleTheme}
        hostStatus={view.hostStatus}
        health={view.health}
        demo={demoTelemetry}
        onToggleDemo={() => setDemoTelemetry((current) => !current)}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="shell flex w-[304px] shrink-0 flex-col overflow-y-auto border-r border-line">
          <HostSummaryCard
            host={railHost}
            segmentCount={view.segmentCount}
            processCount={view.processCount}
            groupCount={view.groupCount}
            serviceCount={view.serviceCount}
            topGroups={view.topGroups}
            generatedAt={view.hostTopology?.generatedAt ?? null}
            loading={view.loading}
            onOpenServices={toggleServiceList}
            containerCount={view.hostTopology?.containers?.length ?? 0}
            status={view.hostStatus}
            telemetry={view.telemetry.host}
            demo={demoTelemetry}
          />

          {serviceListOpen && (
            <ServiceListPanel
              services={services}
              loading={serviceListLoading}
              error={serviceListError}
              collapsed={serviceListCollapsed}
              onToggle={() => setServiceListCollapsed((current) => !current)}
              onClose={() => setServiceListOpen(false)}
              onOpenService={view.openService}
            />
          )}

          <LegendCard kinds={view.kinds} />

          <details className="group border-b border-line px-4 py-3.5">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-[10.5px] text-ink-faint transition-colors hover:text-ink-soft">
              <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
              按对象 ID 查询
            </summary>

            <div className="mt-3 space-y-3">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const trimmed = hostQueryId.trim();
                  if (trimmed) view.setHostId(trimmed);
                }}
                className="space-y-1.5"
              >
                <label className="block text-[9.5px] text-ink-faint" htmlFor="host-id-input">
                  主机对象 ID
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="host-id-input"
                    type="text"
                    placeholder="UUID"
                    value={hostQueryId}
                    onChange={(event) => setHostQueryId(event.target.value)}
                    className="h-7 min-w-0 flex-1 rounded-[7px] border border-line bg-elevated px-2 font-mono text-[10.5px] text-ink placeholder:text-ink-faint focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/15"
                  />
                  <button
                    type="submit"
                    className="h-7 shrink-0 rounded-[7px] bg-ink px-2.5 text-[10.5px] font-medium text-white transition-colors hover:bg-brand-strong"
                  >
                    查询
                  </button>
                </div>
              </form>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const trimmed = networkId.trim();
                  if (trimmed) view.openNetwork(trimmed);
                }}
                className="space-y-1.5"
              >
                <label className="block text-[9.5px] text-ink-faint" htmlFor="network-id-input">
                  网段对象 ID
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="network-id-input"
                    type="text"
                    placeholder="UUID"
                    value={networkId}
                    onChange={(event) => setNetworkId(event.target.value)}
                    className="h-7 min-w-0 flex-1 rounded-[7px] border border-line bg-elevated px-2 font-mono text-[10.5px] text-ink placeholder:text-ink-faint focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/15"
                  />
                  <button
                    type="submit"
                    className="h-7 shrink-0 rounded-[7px] border border-line bg-surface px-2.5 text-[10.5px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:bg-elevated"
                  >
                    查询
                  </button>
                </div>
              </form>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const trimmed = serviceId.trim();
                  if (trimmed) view.openService(trimmed);
                }}
                className="space-y-1.5"
              >
                <label className="block text-[9.5px] text-ink-faint" htmlFor="service-id-input">
                  服务对象 ID
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="service-id-input"
                    type="text"
                    placeholder="UUID"
                    value={serviceId}
                    onChange={(event) => setServiceId(event.target.value)}
                    className="h-7 min-w-0 flex-1 rounded-[7px] border border-line bg-elevated px-2 font-mono text-[10.5px] text-ink placeholder:text-ink-faint focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/15"
                  />
                  <button
                    type="submit"
                    className="h-7 shrink-0 rounded-[7px] border border-line bg-surface px-2.5 text-[10.5px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:bg-elevated"
                  >
                    查询
                  </button>
                </div>
              </form>
            </div>
          </details>

          <details className="group px-4 py-3.5">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-[10.5px] text-ink-faint transition-colors hover:text-ink-soft">
              <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
              对象标识
            </summary>
            <div className="mt-2.5 space-y-2">
              <IdRow label="主机 ID" value={railHost?.id} />
              <IdRow label="机器 ID" value={railHost?.machineId} />
            </div>
          </details>

          <div className="mt-auto px-4 py-4 text-[10px] leading-4 text-ink-faint">
            只读视图 · 数据来自最近一次主机盘点
          </div>
        </aside>

        <TopologyCanvasView view={view} theme={theme} />
      </div>

      <StatusBar
        hostCount={view.hostCount}
        segmentCount={view.segmentCount}
        processCount={view.processCount}
        groupCount={view.groupCount}
        nodeCount={view.graphNodes.length}
        edgeCount={view.graphEdgeCount}
        queryTime={view.displayGraph?.metadata?.queryTime ?? null}
        loading={view.loading}
        demo={demoTelemetry}
      />
    </div>
  );
}

function IdRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="text-[10px]">
      <div className="text-ink-faint">{label}</div>
      <div className="mt-0.5 truncate font-mono text-[9.5px] leading-4 text-ink-mute" title={value}>
        {value}
      </div>
    </div>
  );
}
