import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TransportIcons } from './TransportIcons';
import {
  getSupplyChain,
  toVisualizationSupplyChain,
} from '../services/supplyChainService';
import './SupplyChainVisualization.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const resolveRoutesBetweenNodes = (sourceNode, destinationNode, routes) => {
  if (!sourceNode || !destinationNode || !Array.isArray(routes)) return [];
  const sourceId = String(sourceNode._id || '');
  const destId = String(destinationNode._id || '');
  return routes.filter(
    (r) =>
      String(r.sourceNodeId || '') === sourceId &&
      String(r.destinationNodeId || '') === destId
  );
};

const formatNodeTypeBadge = (type) => {
  const upper = String(type || 'NODE').toUpperCase();
  switch (upper) {
    case 'SUPPLIER':
      return 'node-card__type node-card__type--supplier';
    case 'WAREHOUSE':
      return 'node-card__type node-card__type--warehouse';
    case 'FACTORY':
      return 'node-card__type node-card__type--factory';
    case 'CUSTOMER':
      return 'node-card__type node-card__type--customer';
    default:
      return 'node-card__type bg-slate-100 text-slate-700';
  }
};

const getTransportEmoji = (mode) => {
  switch (String(mode || '').toUpperCase()) {
    case 'ROAD':
      return '🚛';
    case 'RAIL':
      return '🚆';
    case 'SEA':
      return '🚢';
    case 'AIR':
      return '✈️';
    case 'PIPELINE':
      return '🛢️';
    default:
      return '🚚';
  }
};

const renderTransportIcon = (transportMode) => {
  if (!transportMode) return null;
  const formatted = transportMode.charAt(0).toUpperCase() + transportMode.slice(1).toLowerCase();
  const IconComponent = TransportIcons[formatted];
  if (IconComponent) {
    return (
      <span className="w-5 h-5 flex items-center justify-center text-slate-700">
        <IconComponent />
      </span>
    );
  }
  return <span>{getTransportEmoji(transportMode)}</span>;
};

// ─── Main Component ──────────────────────────────────────────────────────────

const SupplyChainVisualization = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [brokenLinks, setBrokenLinks] = useState([]);
  const [supplyChain, setSupplyChain] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [disruptionDurationDays, setDisruptionDurationDays] = useState(7);
  const [simulationError, setSimulationError] = useState('');

  // Auto-load supply chain
  useEffect(() => {
    if (!id) {
      navigate('/my-supply-chains', { replace: true });
      return;
    }

    let isMounted = true;
    const loadData = async () => {
      try {
        setLoadError('');
        const data = await getSupplyChain(id);
        if (isMounted) {
          setSupplyChain(data);
        }
      } catch (err) {
        if (isMounted) {
          setLoadError(err.message || 'Unable to load supply chain.');
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  // Derived arrays
  const nodes = useMemo(() => supplyChain?.nodes || [], [supplyChain]);
  const routes = useMemo(() => supplyChain?.routes || [], [supplyChain]);
  const products = useMemo(() => supplyChain?.products || [], [supplyChain]);
  const primaryProduct = products[0] || null;

  // Toggle simulation mode
  const toggleSimulationMode = () => {
    setIsSimulationMode((prev) => {
      const next = !prev;
      if (!next) {
        setBrokenLinks([]);
        setSimulationError('');
      }
      return next;
    });
  };

  // Toggle route failure
  const toggleLinkBreak = (fromIndex, toIndex, route) => {
    if (!route || !route._id) {
      setSimulationError('The selected connection is not a saved route.');
      return;
    }

    const routeIdStr = String(route._id);
    const linkKey = `${fromIndex}-${toIndex}-${routeIdStr}`;
    const isCurrentlyBroken = brokenLinks.some(
      (link) => String(link.routeId) === routeIdStr
    );

    if (isCurrentlyBroken) {
      setBrokenLinks([]);
      setSimulationError('');
    } else {
      const sourceNode = nodes[fromIndex];
      const destNode = nodes[toIndex];
      const newBrokenLink = {
        key: linkKey,
        routeId: routeIdStr,
        from: sourceNode?.location || sourceNode?.name || `Node ${fromIndex + 1}`,
        to: destNode?.location || destNode?.name || `Node ${toIndex + 1}`,
        transport: route.transportMode || 'ROAD',
        transitDays: route.transitDays,
        cost: route.cost,
        fromIndex,
        toIndex,
      };
      // Single route disruption model
      setBrokenLinks([newBrokenLink]);
      setSimulationError('');
    }
  };

  const isLinkBroken = (route) => {
    if (!route || !route._id) return false;
    const routeIdStr = String(route._id);
    return brokenLinks.some((link) => String(link.routeId) === routeIdStr);
  };

  // Submit simulation
  const handleSimulationSubmit = () => {
    if (brokenLinks.length !== 1) {
      setSimulationError('Select exactly one route for this route-failure simulation.');
      return;
    }

    const selectedLink = brokenLinks[0];
    if (!selectedLink.routeId) {
      setSimulationError('The selected connection is not a saved route.');
      return;
    }

    const duration = Number(disruptionDurationDays);
    if (!Number.isFinite(duration) || duration <= 0) {
      setSimulationError('Enter a positive disruption duration in days (minimum 1 day).');
      return;
    }

    setSimulationError('');
    const simState = {
      supplyChainId: id,
      routeId: selectedLink.routeId,
      disruptionDurationDays: duration,
      supplyChain,
      supplyChainData: toVisualizationSupplyChain(supplyChain),
      brokenLinks,
    };

    try {
      sessionStorage.setItem('lastSimulation', JSON.stringify(simState));
    } catch {
      // ignore storage quota error
    }

    navigate('/simulation-impact', {
      state: simState,
    });
  };

  // ── Loading & Error Views ──────────────────────────────────────────────────

  if (!supplyChain && !loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center max-w-sm w-full">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-base font-bold text-slate-800 mb-1">Loading Supply Chain</h2>
          <p className="text-xs text-slate-500">Retrieving network topology and routes from MongoDB…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center max-w-md w-full">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
            ⛓️
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Network Unavailable</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">{loadError}</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold"
            >
              ← Dashboard
            </button>
            <button
              onClick={() => navigate('/create-supply-chain')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold"
            >
              + Create Supply Chain
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="supply-chain-container">
      {/* ───────────────────────────────────────────────────────────────────
          1. HEADER & ACTIONS
         ─────────────────────────────────────────────────────────────────── */}
      <header className="viz-header">
        <div className="viz-header__toolbar">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              ← Dashboard
            </button>
            <button
              onClick={() => navigate('/my-supply-chains')}
              className="inline-flex items-center px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-xs font-semibold transition-colors"
            >
              My Supply Chains
            </button>
          </div>

          <h1 className="viz-header__title">Supply Chain Network</h1>

          <div className="viz-actions">
            <button
              onClick={toggleSimulationMode}
              className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                isSimulationMode
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              <span className="mr-1.5">{isSimulationMode ? '✕' : '⚡'}</span>
              <span>{isSimulationMode ? 'Exit Simulation' : 'Start Simulation'}</span>
            </button>
            <button
              onClick={() => navigate('/create-supply-chain')}
              className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-xs font-semibold transition-colors"
            >
              + Create Supply Chain
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            2. SUPPLY CHAIN HEADER & PRODUCT METADATA
           ───────────────────────────────────────────────────────────────── */}
        <div className="chain-overview-card">
          <div className="chain-overview__info">
            <div className="chain-overview__tag">Operational Supply Chain</div>
            <h2 className="chain-overview__name">
              {supplyChain.name || 'Untitled Supply Chain'}
            </h2>
            {supplyChain.description && (
              <p className="chain-overview__desc">{supplyChain.description}</p>
            )}
          </div>

          <div className="chain-overview__stats">
            <div className="stat-chip">
              <span className="stat-chip__label">Primary Product</span>
              <span className="stat-chip__value">
                {primaryProduct?.name || 'Unnamed Product'}
                {primaryProduct?.sku ? ` (${primaryProduct.sku})` : ''}
              </span>
            </div>

            <div className="stat-chip">
              <span className="stat-chip__label">Criticality</span>
              <span className="stat-chip__value">
                {primaryProduct?.criticality || 'MEDIUM'}
              </span>
            </div>

            <div className="stat-chip">
              <span className="stat-chip__label">Daily Demand</span>
              <span className="stat-chip__value">
                {primaryProduct?.dailyDemand != null
                  ? `${Number(primaryProduct.dailyDemand).toLocaleString('en-IN')} units/day`
                  : 'Not defined'}
              </span>
            </div>

            <div className="stat-chip">
              <span className="stat-chip__label">Network Topology</span>
              <span className="stat-chip__value">
                {nodes.length} nodes • {routes.length} routes
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────────────
          3. SIMULATION CONTROL PANEL (WHEN ACTIVE)
         ─────────────────────────────────────────────────────────────────── */}
      {isSimulationMode && (
        <section className="simulation-panel" aria-label="Simulation Controls">
          <div className="simulation-panel__title">
            <span>⚡</span>
            <span>Simulation Mode Active</span>
          </div>
          <p className="simulation-panel__desc">
            Select a transport connection below to simulate a single-route disruption, specify the duration, and analyze authoritative downstream impact.
          </p>

          <div className="simulation-controls-grid">
            {/* Selected Route Display */}
            <div>
              <label className="sim-field-label">Selected Broken Route</label>
              <div
                className={`sim-selected-route-pill ${
                  brokenLinks.length === 0 ? 'sim-selected-route-pill--empty' : ''
                }`}
              >
                {brokenLinks.length === 1 ? (
                  <span>
                    ⚠️ {brokenLinks[0].from} ➔ {brokenLinks[0].to} ({brokenLinks[0].transport})
                  </span>
                ) : (
                  <span>No route broken — click 'Break Route' below</span>
                )}
              </div>
            </div>

            {/* Disruption Duration Input */}
            <div>
              <label htmlFor="simDurationInput" className="sim-field-label">
                Disruption Duration (Days)
              </label>
              <div className="duration-input-wrapper">
                <input
                  id="simDurationInput"
                  type="number"
                  min="1"
                  step="1"
                  value={disruptionDurationDays}
                  onChange={(e) => setDisruptionDurationDays(e.target.value)}
                  className="duration-input"
                />
                <button
                  type="button"
                  onClick={() => setDisruptionDurationDays(3)}
                  className="duration-quick-btn"
                  title="Set to 3 days"
                >
                  3d
                </button>
                <button
                  type="button"
                  onClick={() => setDisruptionDurationDays(7)}
                  className="duration-quick-btn"
                  title="Set to 7 days"
                >
                  7d
                </button>
                <button
                  type="button"
                  onClick={() => setDisruptionDurationDays(14)}
                  className="duration-quick-btn"
                  title="Set to 14 days"
                >
                  14d
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <div>
              <label className="sim-field-label">&nbsp;</label>
              <button
                onClick={handleSimulationSubmit}
                disabled={brokenLinks.length !== 1}
                className="btn-analyze-impact"
              >
                <span>⚡</span>
                <span>Analyze Impact</span>
              </button>
            </div>
          </div>

          {simulationError && (
            <p className="mt-3 text-xs text-red-700 font-semibold" role="alert">
              ⚠️ {simulationError}
            </p>
          )}
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          4. ROUTE NETWORK VIEW (SCALABLE & HORIZONTALLY EXPANDABLE)
          Supports 2, 3, 4, 5, 6, 8, 10+ nodes without card overlap
         ─────────────────────────────────────────────────────────────────── */}
      <section
        className={`route-canvas-wrapper ${
          isSimulationMode ? 'route-canvas-wrapper--simulation' : ''
        }`}
      >
        <div className="route-canvas-header">
          <div className="route-canvas-title">
            <span>🗺️</span>
            <span>Route Network Topology</span>
            <span className="text-xs font-semibold text-slate-500 ml-2">
              ({nodes.length} checkpoints • {Math.max(0, nodes.length - 1)} segments)
            </span>
          </div>
          {nodes.length > 3 && (
            <div className="route-canvas-scroll-hint">
              <span>← Scroll horizontally to view full network →</span>
            </div>
          )}
        </div>

        {nodes.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No checkpoints found in this supply chain network.
          </div>
        ) : (
          <div className="route-canvas-scroll" ref={scrollContainerRef}>
            <div className="route-track">
              {nodes.map((node, index) => {
                const nextNode = nodes[index + 1];
                const segmentRoutes = nextNode
                  ? resolveRoutesBetweenNodes(node, nextNode, routes)
                  : [];
                const nodeNumber = String(index + 1).padStart(2, '0');

                return (
                  <div key={node._id || index} className="inline-flex items-center">
                    {/* ── Node Card ── */}
                    <div className="node-card">
                      <div className="node-card__top">
                        <span className="node-card__number">{nodeNumber}</span>
                        <span className={formatNodeTypeBadge(node.type)}>
                          {node.type || 'FACILITY'}
                        </span>
                      </div>

                      <div>
                        <h3 className="node-card__name" title={node.name || `Node ${index + 1}`}>
                          {node.name || `Node ${index + 1}`}
                        </h3>
                        <p className="node-card__loc" title={node.location}>
                          {node.location || 'Location unspecified'}
                        </p>
                      </div>

                      <div className="node-card__footer">
                        <span className="node-card__cap">
                          Cap:{' '}
                          {node.capacity != null
                            ? Number(node.capacity).toLocaleString('en-IN')
                            : 'N/A'}
                        </span>
                        {index === 0 ? (
                          <span className="text-blue-600 font-bold text-[10px]">ORIGIN</span>
                        ) : index === nodes.length - 1 ? (
                          <span className="text-emerald-600 font-bold text-[10px]">DESTINATION</span>
                        ) : null}
                      </div>
                    </div>

                    {/* ── Inter-Node Route Segment (Connection) ── */}
                    {index < nodes.length - 1 && (
                      <div className="route-segment">
                        <div
                          className={`route-segment__track ${
                            segmentRoutes.some((r) => isLinkBroken(r))
                              ? 'route-segment--broken'
                              : ''
                          }`}
                        />

                        <div className="flex flex-col gap-2 w-full items-center relative z-10">
                          {segmentRoutes.length === 0 ? (
                            <div className="route-segment__card">
                              <div className="route-segment__header">
                                <span>UNLINKED</span>
                              </div>
                              <span className="text-[10px] text-amber-600 font-semibold">
                                Unconfigured
                              </span>
                            </div>
                          ) : (
                            segmentRoutes.map((route, rIdx) => {
                              const broken = isLinkBroken(route);
                              const isAlternate = rIdx > 0;

                              return (
                                <div
                                  key={route._id || rIdx}
                                  className={`route-segment__card ${
                                    broken ? 'route-segment__card--broken' : ''
                                  }`}
                                >
                                  <div className="route-segment__header">
                                    {renderTransportIcon(route.transportMode)}
                                    <span>{route.transportMode}</span>
                                    <span
                                      className={`route-type-badge ${
                                        isAlternate
                                          ? 'route-type-badge--alternate'
                                          : 'route-type-badge--primary'
                                      }`}
                                    >
                                      {isAlternate ? 'ALT' : 'PRI'}
                                    </span>
                                  </div>

                                  <div className="route-segment__metrics">
                                    <span>{route.transitDays != null ? `${route.transitDays}d` : 'N/A'}</span>
                                    <span>•</span>
                                    <span>{route.cost != null ? `₹${Number(route.cost).toLocaleString('en-IN')}` : 'N/A'}</span>
                                  </div>

                                  {route.capacityPerDay != null && (
                                    <div className="route-segment__capacity">
                                      {Number(route.capacityPerDay).toLocaleString('en-IN')}/day
                                    </div>
                                  )}

                                  <div
                                    className={`route-segment__status ${
                                      broken
                                        ? 'route-segment__status--disrupted'
                                        : 'route-segment__status--normal'
                                    }`}
                                  >
                                    {broken ? '⚠️ DISRUPTED' : 'NORMAL'}
                                  </div>

                                  {/* Break / Restore Action Button in Simulation Mode */}
                                  {isSimulationMode && (
                                    <button
                                      type="button"
                                      onClick={() => toggleLinkBreak(index, index + 1, route)}
                                      className={`btn-toggle-route ${
                                        broken
                                          ? 'btn-toggle-route--restore'
                                          : 'btn-toggle-route--break'
                                      }`}
                                      title={broken ? 'Restore connection' : 'Simulate route failure'}
                                    >
                                      <span>{broken ? '🔄 Restore' : '⚡ Break'}</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          5. ROUTE SUMMARY
         ─────────────────────────────────────────────────────────────────── */}
      <section className="summary-card" aria-label="Route Summary">
        <h3 className="summary-title">Route Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Starting Point</span>
            <span className="summary-value" title={nodes[0]?.location || nodes[0]?.name}>
              {nodes[0]?.location || nodes[0]?.name || 'N/A'}
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-label">End Point</span>
            <span className="summary-value" title={nodes[nodes.length - 1]?.location || nodes[nodes.length - 1]?.name}>
              {nodes[nodes.length - 1]?.location || nodes[nodes.length - 1]?.name || 'N/A'}
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-label">Total Checkpoints</span>
            <span className="summary-value">{nodes.length} nodes</span>
          </div>

          <div className="summary-item">
            <span className="summary-label">Transport Modes</span>
            <span
              className="summary-value"
              title={
                routes.length > 0
                  ? [...new Set(routes.map((r) => r.transportMode).filter(Boolean))].join(', ')
                  : 'None'
              }
            >
              {routes.length > 0
                ? [...new Set(routes.map((r) => r.transportMode).filter(Boolean))].join(', ')
                : 'None'}
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-label">Total Transit Days</span>
            <span className="summary-value">
              {routes.reduce((sum, r) => sum + (Number(r.transitDays) || 0), 0)} days
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-label">Total Transport Cost</span>
            <span className="summary-value">
              ₹{routes.reduce((sum, r) => sum + (Number(r.cost) || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {isSimulationMode && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Active Disruption:</span>
              <span className={brokenLinks.length === 1 ? 'text-red-600 font-bold' : 'text-slate-500'}>
                {brokenLinks.length === 1
                  ? `${brokenLinks[0].from} ➔ ${brokenLinks[0].to} (${brokenLinks[0].transport})`
                  : 'None selected'}
              </span>
            </div>
            {brokenLinks.length === 1 && (
              <span className="text-slate-500">
                Duration: <strong>{disruptionDurationDays} days</strong>
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default SupplyChainVisualization;
