import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppState } from './hooks/useAppState';
import { useTheme } from './hooks/useTheme';
import AppHeader from './components/AppHeader';
import TopologyCanvas from './components/TopologyCanvas';
import CanvasToolbar from './components/CanvasToolbar';
import LegendCard from './components/LegendCard';
import HostSummaryCard from './components/HostSummaryCard';
import StatusBar from './components/StatusBar';
import NodeDetailPanel from './components/NodeDetailPanel';
import ServiceListPanel from './components/ServiceListPanel';
import FocusBar from './components/FocusBar';
import { ChevronRight } from './components/icons';
import {
  buildDisplayGraph,
  getProcessViewMode,
  getSelectedLoadedProcessGroups,
  PROCESS_GROUP_DISPLAY_LIMIT,
  PROCESS_GROUP_PAGE_SIZE,
  PROCESS_GROUP_PREFIX,
  PROCESS_GROUP_OVERFLOW_PREFIX,
  PROCESS_SUMMARY_PREFIX,
  SERVICE_OVERFLOW_PREFIX,
} from '@dayu-sec/wist-atlas-graph';
import { buildSearchIndex, countMatches } from '@dayu-sec/wist-atlas-graph';
import { buildTelemetry } from '@dayu-sec/wist-atlas-graph';
import { countHealth, freshnessStatus, resolveNodeStatus } from '@dayu-sec/wist-atlas-graph';
import {
  fetchHostProcessGroupsPage,
  fetchHostProcessOverview,
  fetchFirstHostProcessTopology,
  fetchHostProcessTopology,
  fetchHosts,
  fetchHostTopology,
  fetchNetworkTopology,
  fetchServiceTopology,
  fetchServices,
  loadFixture,
} from '@dayu-sec/wist-atlas-graph';
import type {
  HostProcessGroupDto,
  HostSummaryDto,
  LoadedProcessGroupsState,
  LayerKind,
  NodeKind,
  ServiceSummaryDto,
} from '@dayu-sec/wist-atlas-graph';

const DEFAULT_HOST_ID = import.meta.env.VITE_DEFAULT_HOST_ID as string | undefined;
const USE_FIXTURE = import.meta.env.VITE_USE_FIXTURE === '1';

export default function App() {
  const [state, dispatch] = useAppState();
  const { theme, toggleTheme } = useTheme();
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
  const [hostId, setHostId] = useState('');
  const [hostQueryId, setHostQueryId] = useState('');
  const [hosts, setHosts] = useState<HostSummaryDto[]>([]);
  const [networkId, setNetworkId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [serviceListOpen, setServiceListOpen] = useState(false);
  const [serviceListCollapsed, setServiceListCollapsed] = useState(false);
  const [services, setServices] = useState<ServiceSummaryDto[] | null>(null);
  const [serviceListLoading, setServiceListLoading] = useState(false);
  const [serviceListError, setServiceListError] = useState<string | null>(null);
  const [expandedHosts, setExpandedHosts] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [overviewGroupsByHost, setOverviewGroupsByHost] = useState<Record<string, HostProcessGroupDto[]>>({});
  const [truncatedGroupsByHost, setTruncatedGroupsByHost] = useState<Record<string, number>>({});
  const [loadedGroupsByHost, setLoadedGroupsByHost] = useState<Record<string, LoadedProcessGroupsState>>({});
  const [groupPageLoadingByHost, setGroupPageLoadingByHost] = useState<Record<string, boolean>>({});

  // 主机列表只用于顶栏切换器。
  // 多于一台时默认聚焦第一台：左栏的资产卡、画布、地址栏才说的是同一台机器；
  // 想看全局就用下拉里的「全部主机（总览）」（`hostId = ''`）。
  useEffect(() => {
    if (USE_FIXTURE) return;
    let cancelled = false;
    fetchHosts().then((res) => {
      if (cancelled || res.status !== 'ok') return;
      setHosts(res.data.hosts);
      if (!DEFAULT_HOST_ID) {
        setHostId((current) => current || res.data.hosts[0]?.id || '');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadData = useCallback(() => {
    dispatch({ type: 'FETCH_GRAPH_START' });
    const done = (res: Awaited<ReturnType<typeof fetchHostProcessTopology>>) => {
      if (res.status === 'ok') {
        setExpandedHosts(new Set());
        setExpandedGroups(new Set());
        setOverviewGroupsByHost({});
        setTruncatedGroupsByHost({});
        setLoadedGroupsByHost({});
        setGroupPageLoadingByHost({});
        dispatch({ type: 'FETCH_GRAPH_SUCCESS', graph: res.data });
        // 只在新图换了主机时清空资产卡：无条件清空会和下面的资产卡加载抢跑。
        dispatch({
          type: 'CLEAR_HOST_TOPOLOGY_UNLESS',
          hostObjectId:
            res.data.nodes.find((node) => node.objectKind === 'HostInventory')?.objectId ?? '',
        });
      } else {
        dispatch({ type: 'FETCH_GRAPH_ERROR', error: res.message });
      }
    };

    if (USE_FIXTURE) {
      loadFixture('live-topology').then(done);
      return;
    }

    const host = hostId.trim() || DEFAULT_HOST_ID;
    if (!host) {
      fetchFirstHostProcessTopology().then(done);
      return;
    }
    fetchHostProcessTopology(host).then(done);
  }, [dispatch, hostId]);

  // Load fixture data on first mount so there is something to render.
  useEffect(() => {
    loadData();
  }, [loadData]);

  const queryHost = useCallback(() => {
    const trimmed = hostQueryId.trim();
    if (!trimmed) return;
    dispatch({ type: 'FETCH_GRAPH_START' });
    fetchHostProcessTopology(trimmed).then((res) => {
      if (res.status === 'ok') {
        setExpandedHosts(new Set());
        setExpandedGroups(new Set());
        setOverviewGroupsByHost({});
        setTruncatedGroupsByHost({});
        setLoadedGroupsByHost({});
        setGroupPageLoadingByHost({});
        dispatch({ type: 'FETCH_GRAPH_SUCCESS', graph: res.data });
      } else {
        dispatch({ type: 'FETCH_GRAPH_ERROR', error: `[${res.code}] ${res.message}` });
      }
    });
  }, [hostQueryId, dispatch]);

  /** 切到「这个网段里有哪些机器」。直接从节点点进来时拿节点上的 objectId，
   * 走表单时拿输入框的值。 */
  const openNetwork = useCallback(
    (segmentObjectId: string) => {
      const trimmed = segmentObjectId.trim();
      if (!trimmed) return;
      setNetworkId(trimmed);
      dispatch({ type: 'FETCH_GRAPH_START' });
      fetchNetworkTopology(trimmed).then((res) => {
        if (res.status === 'ok') {
          setExpandedHosts(new Set());
          setExpandedGroups(new Set());
          setExpandedServices(new Set());
          setOverviewGroupsByHost({});
          setTruncatedGroupsByHost({});
          setLoadedGroupsByHost({});
          setGroupPageLoadingByHost({});
          dispatch({ type: 'FETCH_GRAPH_SUCCESS', graph: res.data });
        } else {
          dispatch({ type: 'FETCH_GRAPH_ERROR', error: `[${res.code}] ${res.message}` });
        }
      });
    },
    [dispatch],
  );

  const queryNetwork = useCallback(() => {
    const trimmed = networkId.trim();
    if (!trimmed) return;
    openNetwork(trimmed);
  }, [networkId, openNetwork]);

  /** 切到「这个服务跑在哪些主机上」：服务卡上写着 `tcp/22 0.0.0.0`，
   * 点进去才看得到是谁在监听、同一套服务还有哪几台机在跑。 */
  const openService = useCallback(
    (serviceObjectId: string) => {
      const trimmed = serviceObjectId.trim();
      if (!trimmed) return;
      setServiceId(trimmed);
      dispatch({ type: 'FETCH_GRAPH_START' });
      fetchServiceTopology(trimmed).then((res) => {
        if (res.status === 'ok') {
          setExpandedHosts(new Set());
          setExpandedGroups(new Set());
          setExpandedServices(new Set());
          setOverviewGroupsByHost({});
          setTruncatedGroupsByHost({});
          setLoadedGroupsByHost({});
          setGroupPageLoadingByHost({});
          dispatch({ type: 'FETCH_GRAPH_SUCCESS', graph: res.data });
        } else {
          dispatch({ type: 'FETCH_GRAPH_ERROR', error: `[${res.code}] ${res.message}` });
        }
      });
    },
    [dispatch],
  );

  const queryService = useCallback(() => {
    const trimmed = serviceId.trim();
    if (!trimmed) return;
    openService(trimmed);
  }, [serviceId, openService]);

  /** 服务清单懒加载：不打开就不查，也不影响首屏。 */
  const toggleServiceList = useCallback(() => {
    setServiceListOpen((current) => {
      const next = !current;
      if (next) setServiceListCollapsed(false);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!serviceListOpen || services) return;
    let cancelled = false;
    // 服务清单是懒加载的外部数据，进入 loading 是这次请求的同步起点。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServiceListLoading(true);
    setServiceListError(null);
    fetchServices().then((res) => {
      if (cancelled) return;
      setServiceListLoading(false);
      if (res.status === 'ok') {
        setServices(res.data.services);
      } else {
        setServiceListError(`[${res.code}] ${res.message}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [serviceListOpen, services]);

  // 关键：选中节点/输入搜索词都会让 App 重渲染，如果把 displayGraph 每次重建，
  // 画布的「图结构签名」就每次都变，点一下节点就会重新布局。
  const displayGraph = useMemo(
    () =>
      buildDisplayGraph(
        state.graph,
        expandedHosts,
        expandedGroups,
        expandedServices,
        overviewGroupsByHost,
        truncatedGroupsByHost,
        loadedGroupsByHost,
        groupPageLoadingByHost,
      ),
    [
      state.graph,
      expandedHosts,
      expandedGroups,
      expandedServices,
      overviewGroupsByHost,
      truncatedGroupsByHost,
      loadedGroupsByHost,
      groupPageLoadingByHost,
    ],
  );
  const selectedNode =
    displayGraph?.nodes.find((n) => n.id === state.selectedNodeId) ?? null;

  // 左栏的资产卡要的是「当前这张图的主机」，不是「当前选中的节点」。
  // 之前 `hostTopology` 绑在选中项上：一点网段，资产卡就跟着空了。
  const primaryHostNode =
    displayGraph?.nodes.find((node) => node.objectKind === 'HostInventory') ?? null;

  useEffect(() => {
    const hostObjectId = primaryHostNode?.objectId;
    if (!hostObjectId) {
      dispatch({ type: 'FETCH_HOST_TOPOLOGY_SUCCESS', hostTopology: null });
      return;
    }
    if (state.hostTopology?.host.id === hostObjectId) return;

    fetchHostTopology(hostObjectId).then((res) => {
      if (res.status === 'ok') {
        dispatch({ type: 'FETCH_HOST_TOPOLOGY_SUCCESS', hostTopology: res.data });
      }
    });
  }, [primaryHostNode?.objectId, state.hostTopology?.host.id, dispatch]);

  useEffect(() => {
    if (USE_FIXTURE) return;
    if (!state.graph) return;

    const hostNodes = state.graph.nodes.filter((node) => node.objectKind === 'HostInventory');
    for (const hostNode of hostNodes) {
      if (overviewGroupsByHost[hostNode.objectId]) continue;
      fetchHostProcessOverview(hostNode.objectId, PROCESS_GROUP_DISPLAY_LIMIT).then((res) => {
        if (res.status !== 'ok') return;
        setOverviewGroupsByHost((current) => {
          if (current[hostNode.objectId]) return current;
          return { ...current, [hostNode.objectId]: res.data.topGroups };
        });
        setTruncatedGroupsByHost((current) => {
          if (current[hostNode.objectId] != null) return current;
          return { ...current, [hostNode.objectId]: res.data.truncatedGroupCount };
        });
      });
    }
  }, [state.graph, overviewGroupsByHost]);

  /**
   * 运行时卡片有两种意图：点卡片是「看详情」，点卡片底部的「展开进程分组」才是「铺开」。
   * 之前一次点击同时做两件事，详情抽屉正好盖住刚展开的分组。
   */
  const handleExpandNode = useCallback((nodeId: string) => {
    const hostNodeId = nodeId.startsWith(PROCESS_SUMMARY_PREFIX)
      ? nodeId.slice(PROCESS_SUMMARY_PREFIX.length)
      : nodeId;
    setExpandedHosts((current) => {
      const next = new Set(current);
      if (next.has(hostNodeId)) next.delete(hostNodeId);
      else next.add(hostNodeId);
      return next;
    });
    dispatch({ type: 'SELECT_NODE', nodeId: null });
  }, [dispatch]);

  const handleSelectNode = useCallback((nodeId: string | null) => {
    if (nodeId && nodeId.startsWith(PROCESS_SUMMARY_PREFIX)) {
      dispatch({ type: 'SELECT_NODE', nodeId });
      return;
    }
    if (nodeId && nodeId.startsWith(SERVICE_OVERFLOW_PREFIX)) {
      // 服务数据已全量在内存里，展开/收起都是本地行为，不用取接口。
      const hostNodeId = nodeId.slice(SERVICE_OVERFLOW_PREFIX.length);
      setExpandedServices((current) => {
        const next = new Set(current);
        if (next.has(hostNodeId)) {
          next.delete(hostNodeId);
        } else {
          next.add(hostNodeId);
        }
        return next;
      });
      dispatch({ type: 'SELECT_NODE', nodeId: null });
      return;
    }
    if (nodeId && nodeId.startsWith(PROCESS_GROUP_OVERFLOW_PREFIX)) {
      const hostNodeId = nodeId.slice(PROCESS_GROUP_OVERFLOW_PREFIX.length);
      const hostNode = state.graph?.nodes.find((node) => node.id === hostNodeId);
      dispatch({ type: 'SELECT_NODE', nodeId });
      if (hostNode && !groupPageLoadingByHost[hostNode.objectId]) {
        const hostObjectId = hostNode.objectId;
        const loadedState = loadedGroupsByHost[hostObjectId];
        const overviewCount = overviewGroupsByHost[hostObjectId]?.length ?? 0;
        if (loadedState && !loadedState.hasMore) {
          return;
        }
        const offset = loadedState?.offset ?? overviewCount;
        setGroupPageLoadingByHost((current) => ({ ...current, [hostObjectId]: true }));
        fetchHostProcessGroupsPage(hostObjectId, PROCESS_GROUP_PAGE_SIZE, offset).then((res) => {
          setGroupPageLoadingByHost((current) => ({ ...current, [hostObjectId]: false }));
          if (res.status !== 'ok') return;
          setLoadedGroupsByHost((current) => {
            const previous = current[hostObjectId];
            const existingGroups = previous?.groups ?? [];
            const mergedGroups = [...existingGroups];
            for (const group of res.data.groups) {
              if (!mergedGroups.some((item) => item.executable === group.executable)) {
                mergedGroups.push(group);
              }
            }
            return {
              ...current,
              [hostObjectId]: {
                groups: mergedGroups,
                offset: res.data.offset + res.data.groups.length,
                limit: res.data.limit,
                hasMore: res.data.hasMore,
                totalGroups: res.data.totalGroups,
              },
            };
          });
        });
      }
      return;
    }
    if (nodeId && nodeId.startsWith(PROCESS_GROUP_PREFIX)) {
      setExpandedGroups((current) => {
        const next = new Set(current);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      });
      dispatch({ type: 'SELECT_NODE', nodeId });
      return;
    }
    dispatch({ type: 'SELECT_NODE', nodeId });
  }, [dispatch, groupPageLoadingByHost, loadedGroupsByHost, overviewGroupsByHost, state.graph]);

  const railHost = state.hostTopology?.host ?? (primaryHostNode
    ? {
        id: primaryHostNode.objectId,
        hostName: primaryHostNode.label,
        machineId: null,
        osName: (primaryHostNode.properties.osName as string | undefined) ?? null,
        osVersion: (primaryHostNode.properties.osVersion as string | undefined) ?? null,
        arch: null,
      }
    : null);

  const graphNodes = useMemo(() => displayGraph?.nodes ?? [], [displayGraph]);
  const graphEdges = useMemo(() => displayGraph?.edges ?? [], [displayGraph]);
  const presentLayers = useMemo(() => {
    const layers: LayerKind[] = [];
    for (const node of graphNodes) {
      if (!layers.includes(node.layer)) layers.push(node.layer);
    }
    return layers;
  }, [graphNodes]);

  const presentKinds = useMemo(() => {
    const kinds: NodeKind[] = [];
    for (const node of graphNodes) {
      if (!kinds.includes(node.objectKind)) kinds.push(node.objectKind);
    }
    return kinds;
  }, [graphNodes]);

  const topGroups = useMemo(() => {
    return (state.hostTopology?.processGroups ?? []).slice(0, 5).map((group) => ({
      name: String(group.display_name ?? group.executable ?? '-'),
      count: Number(group.process_count ?? 0),
    }));
  }, [state.hostTopology]);

  const scannedAt = state.hostTopology?.generatedAt ?? displayGraph?.metadata?.queryTime ?? null;
  const telemetry = useMemo(
    () => buildTelemetry(displayGraph, demoTelemetry),
    [displayGraph, demoTelemetry],
  );
  const statusOptions = useMemo(() => ({ scannedAt, telemetry }), [scannedAt, telemetry]);
  const health = useMemo(
    () => countHealth(displayGraph, statusOptions),
    [displayGraph, statusOptions],
  );
  const hostStatus = primaryHostNode
    ? resolveNodeStatus(primaryHostNode, statusOptions)
    : freshnessStatus(scannedAt);
  const selectedStatus = selectedNode ? resolveNodeStatus(selectedNode, statusOptions) : null;
  const selectedTelemetry = selectedNode ? telemetry.nodes[selectedNode.id] : undefined;
  const focusNode = state.focusNodeId
    ? displayGraph?.nodes.find((node) => node.id === state.focusNodeId) ?? null
    : null;
  const focusLabel =
    focusNode?.objectKind === 'ProcessSummary' ? '运行时' : focusNode?.label ?? '';

  const handleFocusNode = useCallback(
    (nodeId: string) => dispatch({ type: 'FOCUS_NODE', nodeId }),
    [dispatch],
  );
  const handleExitFocus = useCallback(() => dispatch({ type: 'CLEAR_FOCUS' }), [dispatch]);

  // Esc：有聚焦先退聚焦，否则收起详情面板。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (state.focusNodeId) {
        dispatch({ type: 'CLEAR_FOCUS' });
      } else {
        dispatch({ type: 'SELECT_NODE', nodeId: null });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, state.focusNodeId]);

  const segmentCount = state.hostTopology?.networkSegments.length
    ?? graphNodes.filter((node) => node.objectKind === 'NetworkSegment').length;
  const processCount = state.hostTopology?.processes.length
    ?? Number(displayGraph?.metadata?.processCount ?? 0);
  const groupCount = state.hostTopology?.processGroups.length
    ?? graphNodes.filter((node) => node.objectKind === 'ProcessGroup').length;
  const serviceCount = state.hostTopology?.services.length
    ?? graphNodes.filter((node) => node.objectKind === 'ServiceEntity').length;
  const hostCount = Number(displayGraph?.metadata?.hostCount ?? (primaryHostNode ? 1 : 0));

  const searchIndex = useMemo(() => buildSearchIndex(displayGraph), [displayGraph]);
  const matchCount = state.searchQuery.trim()
    ? countMatches(searchIndex, state.searchQuery)
    : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <AppHeader
        host={railHost}
        hostName={railHost?.hostName ?? '未选择主机'}
        hosts={hosts}
        selectedHostId={hostId}
        onSelectHost={(nextHostId) => setHostId(nextHostId)}
        scannedAt={scannedAt}
        loading={state.loading}
        onRefresh={loadData}
        theme={theme}
        onToggleTheme={toggleTheme}
        hostStatus={hostStatus}
        health={health}
        demo={demoTelemetry}
        onToggleDemo={() => setDemoTelemetry((current) => !current)}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="shell flex w-[304px] shrink-0 flex-col overflow-y-auto border-r border-line">
          <HostSummaryCard
            host={railHost}
            segmentCount={segmentCount}
            processCount={processCount}
            groupCount={groupCount}
            serviceCount={serviceCount}
            topGroups={topGroups}
            generatedAt={state.hostTopology?.generatedAt ?? null}
            loading={state.loading}
            onOpenServices={toggleServiceList}
            containerCount={state.hostTopology?.containers?.length ?? 0}
            status={hostStatus}
            telemetry={telemetry.host}
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
              onOpenService={openService}
            />
          )}

          <LegendCard kinds={presentKinds} />

          <details className="group border-b border-line px-4 py-3.5">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-[10.5px] text-ink-faint transition-colors hover:text-ink-soft">
              <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
              按对象 ID 查询
            </summary>

            <div className="mt-3 space-y-3">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  queryHost();
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
                    onChange={(e) => setHostQueryId(e.target.value)}
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
                  queryNetwork();
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
                  queryService();
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

        <main className="relative flex min-w-0 flex-1">
          <div className="relative min-w-0 flex-1">
          <TopologyCanvas
            graph={displayGraph}
            selectedNodeId={state.selectedNodeId}
            onSelectNode={handleSelectNode}
            onExpandNode={handleExpandNode}
            searchQuery={state.searchQuery}
            layerVisibility={state.layerVisibility}
            scannedAt={scannedAt}
            hostArch={state.hostTopology?.host.arch ?? null}
            loading={state.loading}
            theme={theme}
            telemetry={telemetry}
            focusNodeId={state.focusNodeId}
            onFocusNode={handleFocusNode}
          />

          <div className="pointer-events-none absolute left-4 top-4 z-20">
            <CanvasToolbar
              searchQuery={state.searchQuery}
              onSearchChange={(query) => dispatch({ type: 'SET_SEARCH', query })}
              layerVisibility={state.layerVisibility}
              layers={presentLayers}
              onToggleLayer={(layer) => dispatch({ type: 'TOGGLE_LAYER', layer })}
              matchCount={matchCount}
            />
          </div>

          {focusNode && (
            <div className="pointer-events-none absolute left-4 top-[62px] z-20">
              <FocusBar label={focusLabel} onExit={handleExitFocus} />
            </div>
          )}

          {state.error && (
            <div className="absolute bottom-4 left-4 z-30 flex max-w-md items-start gap-2 rounded-[10px] border border-danger-line bg-danger-soft px-3 py-2 text-[11px] text-danger-strong shadow-[0_8px_24px_-12px_rgba(16,24,40,0.25)]">
              <span className="mt-px shrink-0 font-semibold">出错</span>
              <span className="min-w-0 break-all">{state.error}</span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'FETCH_GRAPH_ERROR', error: '' })}
                className="ml-auto shrink-0 rounded px-1 text-danger hover:text-danger-strong"
                aria-label="关闭错误提示"
              >
                ✕
              </button>
            </div>
          )}
          </div>

          <NodeDetailPanel
            node={selectedNode}
            graph={displayGraph}
            hostTopology={state.hostTopology}
            processViewMode={getProcessViewMode(selectedNode, loadedGroupsByHost, groupPageLoadingByHost)}
            loadedProcessGroups={getSelectedLoadedProcessGroups(selectedNode, loadedGroupsByHost)}
            onClose={() => dispatch({ type: 'SELECT_NODE', nodeId: null })}
            onOpenNetwork={openNetwork}
            onOpenService={openService}
            onFocusHost={(hostObjectId) => setHostId(hostObjectId)}
            onExpand={handleExpandNode}
            status={selectedStatus}
            telemetry={selectedTelemetry}
            demo={demoTelemetry}
            focused={Boolean(selectedNode && state.focusNodeId === selectedNode.id)}
            onFocus={() => selectedNode && handleFocusNode(selectedNode.id)}
            onExitFocus={handleExitFocus}
          />

        </main>
      </div>

      <StatusBar
        hostCount={hostCount}
        segmentCount={segmentCount}
        processCount={processCount}
        groupCount={groupCount}
        nodeCount={graphNodes.length}
        edgeCount={graphEdges.length}
        queryTime={displayGraph?.metadata?.queryTime ?? null}
        loading={state.loading}
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

