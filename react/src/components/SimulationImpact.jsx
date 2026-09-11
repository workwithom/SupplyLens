import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { runRouteFailureSimulation, getSupplyChain } from '../services/supplyChainService.js';
import './SimulationImpact.css';

// ─── Value Formatters ────────────────────────────────────────────────────────

const formatDays = (value) => {
  if (value === null || value === undefined) return 'Unavailable';
  const num = Number(value);
  if (!Number.isFinite(num)) return 'Unavailable';
  return `${Number.isInteger(num) ? num : Number(num.toFixed(1))} day${num === 1 ? '' : 's'}`;
};

const formatCost = (value) => {
  if (value === null || value === undefined) return 'Unavailable';
  const num = Number(value);
  return Number.isFinite(num) ? `₹${num.toLocaleString('en-IN')}` : 'Unavailable';
};

const getRiskClass = (riskLevel) => {
  switch (riskLevel) {
    case 'CRITICAL':
      return 'risk-badge risk-badge--critical';
    case 'HIGH':
      return 'risk-badge risk-badge--high';
    case 'MEDIUM':
      return 'risk-badge risk-badge--medium';
    case 'LOW':
      return 'risk-badge risk-badge--low';
    default:
      return 'risk-badge risk-badge--unknown';
  }
};

const getMetricCardModifier = (riskLevel) => {
  switch (riskLevel) {
    case 'CRITICAL':
      return 'metric-card--critical';
    case 'HIGH':
      return 'metric-card--high';
    case 'MEDIUM':
      return 'metric-card--medium';
    case 'LOW':
      return 'metric-card--low';
    default:
      return 'metric-card--unknown';
  }
};

// ─── Subcomponents ──────────────────────────────────────────────────────────

const StockoutAvoidedBadge = ({ value, stockoutDays }) => {
  if (value === null || value === undefined) {
    return (
      <span className="stockout-badge stockout-badge--unknown" title="Demand or inventory data not configured">
        Stockout Avoidance: Data unavailable
      </span>
    );
  }
  if (stockoutDays != null && stockoutDays <= 0) {
    return (
      <span className="stockout-badge stockout-badge--neutral" title="No stockout is projected for this disruption">
        — No stockout projected
      </span>
    );
  }
  if (value === true) {
    return (
      <span className="stockout-badge stockout-badge--yes" title="Alternative transit time restores supply before inventory buffer exhausts">
        ✓ Avoids stockout
      </span>
    );
  }
  return (
    <span className="stockout-badge stockout-badge--no" title="Alternative transit time exceeds available inventory buffer">
      ✗ Does not avoid stockout
    </span>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const SimulationImpact = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Parse navigation state or fallback to sessionStorage
  const [params] = useState(() => {
    if (location.state?.supplyChainId && location.state?.routeId) {
      return location.state;
    }
    try {
      const stored = sessionStorage.getItem('lastSimulation');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore storage parsing error
    }
    return location.state || {};
  });

  const {
    supplyChainId,
    routeId,
    disruptionDurationDays,
    supplyChain: initialSupplyChain,
  } = params;

  const [chain, setChain] = useState(initialSupplyChain || null);

  // Load full supply chain data if missing (e.g. direct refresh or from RiskAnalysis)
  useEffect(() => {
    if (!chain && supplyChainId) {
      getSupplyChain(supplyChainId)
        .then((data) => setChain(data))
        .catch(() => {
          // non-blocking: network topology view will degrade gracefully to result.affectedNodes
        });
    }
  }, [chain, supplyChainId]);

  // Execute simulation on mount
  useEffect(() => {
    if (!supplyChainId || !routeId || disruptionDurationDays === undefined) {
      setError('No simulation parameters found. Please select a route and disruption duration from the visualization or risk analysis page.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const runSim = async () => {
      try {
        setError('');
        const response = await runRouteFailureSimulation(supplyChainId, {
          routeId,
          disruptionDurationDays: Number(disruptionDurationDays),
        });
        if (isMounted) {
          setResult(response.result);
          setAlternatives(response.alternatives || []);
          setAnalysis(response.analysis || null);
          setAiAvailable(response.aiAvailable === true);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to execute route failure simulation.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    runSim();

    return () => {
      isMounted = false;
    };
  }, [supplyChainId, routeId, disruptionDurationDays]);

  // ── Derived Values ─────────────────────────────────────────────────────────

  const disruptedRoute = result?.disruptedRoute;
  const nodes = useMemo(() => chain?.nodes || [], [chain]);
  const routes = useMemo(() => chain?.routes || [], [chain]);

  const sourceNode = useMemo(() => {
    if (!disruptedRoute) return null;
    return nodes.find((n) => String(n._id) === String(disruptedRoute.sourceNodeId)) || null;
  }, [nodes, disruptedRoute]);

  const destNode = useMemo(() => {
    if (!disruptedRoute) return null;
    return nodes.find((n) => String(n._id) === String(disruptedRoute.destinationNodeId)) || null;
  }, [nodes, disruptedRoute]);

  const fromName = sourceNode?.location || sourceNode?.name || 'Source Node';
  const destName = destNode?.location || destNode?.name || 'Destination Node';

  const productName =
    result?.product?.name ||
    chain?.products?.[0]?.name ||
    'Primary Product';
  const productSku = result?.product?.sku || chain?.products?.[0]?.sku || '';
  const productCriticality = result?.product?.criticality || chain?.products?.[0]?.criticality || 'MEDIUM';

  const durationDays = result?.disruption?.durationDays ?? Number(disruptionDurationDays ?? 0);
  const coverageDays = result?.inventoryCoverageDays;
  const stockoutDays = result?.stockoutDays;
  const riskLevel = result?.riskLevel || 'UNKNOWN';
  const affectedNodes = result?.affectedNodes || [];

  // Identify recommended alternative
  const recommendedAltIndex = useMemo(() => {
    if (!alternatives || alternatives.length === 0) return -1;
    // 1. Look for alternative that avoids stockout
    const avoidsIndex = alternatives.findIndex((alt) => alt.stockoutAvoided === true);
    if (avoidsIndex !== -1) return avoidsIndex;
    // 2. Otherwise lowest additional cost
    let lowestCostIdx = 0;
    for (let i = 1; i < alternatives.length; i++) {
      if ((alternatives[i].additionalCost ?? Infinity) < (alternatives[lowestCostIdx].additionalCost ?? Infinity)) {
        lowestCostIdx = i;
      }
    }
    return lowestCostIdx;
  }, [alternatives]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleExportJson = () => {
    if (!result) return;
    const reportData = {
      title: 'SupplyLens Simulation Impact Report',
      generatedAt: new Date().toISOString(),
      supplyChain: {
        id: supplyChainId,
        name: chain?.name || 'Supply Chain',
        product: productName,
        sku: productSku,
        criticality: productCriticality,
      },
      disruption: result.disruption,
      disruptedRoute: result.disruptedRoute,
      deterministicImpact: {
        riskLevel: result.riskLevel,
        disruptionDurationDays: durationDays,
        inventoryCoverageDays: coverageDays,
        stockoutDays: stockoutDays,
        affectedNodes: result.affectedNodes,
      },
      recoveryOptions: alternatives,
      decisionSupport: {
        summary: analysis?.summary,
        riskExplanation: analysis?.riskExplanation,
        recommendations: analysis?.recommendations,
        tradeoffs: analysis?.tradeoffs,
        aiAvailable,
      },
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supplylens-disruption-${supplyChainId}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const visualizationPath = supplyChainId
    ? `/supply-chain-visualization/${supplyChainId}`
    : '/create-supply-chain';

  // ── Loading View ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center max-w-sm w-full">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-base font-bold text-slate-800 mb-1">Simulating Disruption</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Calculating inventory coverage, stockout windows, recovery options, and decision recommendations…
          </p>
        </div>
      </div>
    );
  }

  // ── Error View ─────────────────────────────────────────────────────────────

  if (error || !result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl border border-red-200 shadow-sm text-center max-w-md w-full">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Simulation Unavailable</h2>
          <p className="text-sm text-red-700 mb-6 leading-relaxed" role="alert">
            {error || 'No simulation result could be generated.'}
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-action btn-action--secondary text-xs"
            >
              ← Dashboard
            </button>
            <button
              onClick={() => navigate(visualizationPath)}
              className="btn-action btn-action--primary text-xs"
            >
              Back to Visualization
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Risk Explanation Copy ──────────────────────────────────────────────────

  const riskExplanationText = (() => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'Severe stockout imminent for high-criticality product. Immediate mitigation required.';
      case 'HIGH':
        return 'Substantial stockout projected. Available buffer fails to absorb route outage.';
      case 'MEDIUM':
        return 'Moderate vulnerability. Inventory absorbs failure or product criticality is moderate.';
      case 'LOW':
        return 'Minimal operational impact. Inventory buffer fully covers disruption duration.';
      default:
        return 'Risk cannot be quantified due to missing inventory or daily demand data.';
    }
  })();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="simulation-dashboard">
      {/* ───────────────────────────────────────────────────────────────────
          1. EXECUTIVE HEADER
          Answers: WHAT FAILED? & HOW SEVERE IS IT?
         ─────────────────────────────────────────────────────────────────── */}
      <header className="exec-header">
        <div className="exec-header__top">
          <div>
            <div className="exec-tag">
              <span>⚠️</span>
              <span>Supply Chain Disruption Analysis</span>
            </div>
            <h1 className="exec-header__title">
              {chain?.name || 'Supply Chain Disruption'}
            </h1>
            <p className="exec-header__subtitle">
              <strong>{productName}</strong>
              {productSku ? ` • SKU: ${productSku}` : ''}
              {` • Criticality: ${productCriticality}`}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="exec-header__actions no-print">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-action btn-action--secondary"
              title="Return to Dashboard"
            >
              ← Dashboard
            </button>
            <button
              onClick={() => navigate('/my-supply-chains')}
              className="btn-action btn-action--secondary"
              title="View All My Supply Chains"
            >
              📦 My Supply Chains
            </button>
            <button
              onClick={() => navigate(visualizationPath)}
              className="btn-action btn-action--dark"
              title="Configure and run another scenario"
            >
              ⚡ Run Another Scenario
            </button>
            <button
              onClick={handleExportJson}
              className="btn-action btn-action--primary"
              title="Download full JSON simulation report"
            >
              📥 Export JSON
            </button>
            <button
              onClick={handlePrint}
              className="btn-action btn-action--secondary"
              title="Print or save as PDF"
            >
              🖨️ Print / PDF
            </button>
          </div>
        </div>

        {/* Severed Route Banner */}
        <div className="exec-banner">
          <div className="exec-route-path">
            <span>{fromName}</span>
            <span className="exec-route-arrow">➔</span>
            <span>{destName}</span>
            <span className="exec-route-mode">
              {disruptedRoute?.transportMode || 'Transport Mode'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="exec-route-duration">
              {durationDays} DAY OUTAGE
            </span>
            <span className={getRiskClass(riskLevel)}>{riskLevel} RISK</span>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────────────
          2. EXECUTIVE METRICS GRID
          Answers: HOW SEVERE IS IT?
         ─────────────────────────────────────────────────────────────────── */}
      <section className="exec-metrics-grid" aria-label="Executive Metrics">
        {/* Metric 1: Risk Level */}
        <div className={`metric-card ${getMetricCardModifier(riskLevel)}`}>
          <div className="metric-card__header">
            <span className="metric-card__label">Risk Level</span>
            <span className={getRiskClass(riskLevel)}>{riskLevel}</span>
          </div>
          <div className="metric-card__value">{riskLevel}</div>
          <p className="metric-card__explanation">{riskExplanationText}</p>
        </div>

        {/* Metric 2: Disruption Duration */}
        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">Disruption Duration</span>
            <span className="text-xs text-slate-400">Outage Window</span>
          </div>
          <div className="metric-card__value">{formatDays(durationDays)}</div>
          <p className="metric-card__explanation">
            Planned duration of severed transport connection.
          </p>
        </div>

        {/* Metric 3: Inventory Coverage */}
        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">Inventory Coverage</span>
            <span className="text-xs text-slate-400">Downstream Buffer</span>
          </div>
          <div className="metric-card__value">
            {coverageDays != null ? formatDays(coverageDays) : 'Unavailable'}
          </div>
          <p className="metric-card__explanation">
            {coverageDays != null
              ? 'On-hand inventory available before supply halts.'
              : 'Inventory buffer data is not configured.'}
          </p>
        </div>

        {/* Metric 4: Projected Stockout */}
        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">Projected Stockout</span>
            <span className="text-xs text-slate-400">Shortage Period</span>
          </div>
          <div
            className={`metric-card__value ${
              stockoutDays > 0 ? 'text-red-600' : stockoutDays === 0 ? 'text-emerald-700' : ''
            }`}
          >
            {stockoutDays != null ? formatDays(stockoutDays) : 'Unavailable'}
          </div>
          <p className="metric-card__explanation">
            {stockoutDays == null
              ? 'Requires daily demand and inventory data.'
              : stockoutDays === 0
              ? 'Buffer fully covers disruption window (0 shortage).'
              : `Expected ${stockoutDays}-day unfulfilled demand period.`}
          </p>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          3. DISRUPTION IMPACT MAP / LOGICAL NETWORK VIEW
          Answers: WHAT FAILED? & WHAT WILL BE AFFECTED?
         ─────────────────────────────────────────────────────────────────── */}
      <section className="dash-card network-map-card">
        <div className="dash-card__header">
          <div>
            <h2 className="dash-card__title">
              <span>🗺️</span>
              <span>Disruption Network Flow</span>
            </h2>
            <p className="dash-card__subtitle">
              Logical supply-chain topology identifying severed connection and affected downstream facilities.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Source
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Disrupted Route / Affected
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Unaffected
            </span>
          </div>
        </div>

        <div className="network-flow">
          {nodes.length > 0 ? (
            nodes.map((node, index) => {
              const isSource = String(node._id) === String(disruptedRoute?.sourceNodeId);
              const isDest = String(node._id) === String(disruptedRoute?.destinationNodeId);
              const isAffected =
                isDest || affectedNodes.some((an) => String(an._id) === String(node._id));
              const boxModifier = isSource
                ? 'network-node-box--source'
                : isAffected
                ? 'network-node-box--affected'
                : 'network-node-box--unaffected';

              const nextNode = nodes[index + 1];
              let routeToNext = null;
              if (nextNode) {
                routeToNext = routes.find(
                  (r) =>
                    String(r.sourceNodeId) === String(node._id) &&
                    String(r.destinationNodeId) === String(nextNode._id)
                );
              }
              const isRouteDisrupted =
                routeToNext &&
                (String(routeToNext._id) === String(disruptedRoute?._id) ||
                  (isSource && String(nextNode._id) === String(disruptedRoute?.destinationNodeId)));

              return (
                <div key={node._id || index} className="flex items-center">
                  <div className={`network-node-box ${boxModifier}`}>
                    <div className="network-node-type">{node.type || 'NODE'}</div>
                    <div className="network-node-name" title={node.name}>
                      {node.name || `Node ${index + 1}`}
                    </div>
                    <div className="network-node-loc" title={node.location}>
                      {node.location || 'Location unspecified'}
                    </div>
                    {node.capacity != null && (
                      <div className="text-[10px] text-slate-400 mt-1">
                        Cap: {Number(node.capacity).toLocaleString('en-IN')}
                      </div>
                    )}
                    <div
                      className={`network-node-status ${
                        isSource
                          ? 'network-node-status--source'
                          : isAffected
                          ? 'network-node-status--affected'
                          : 'network-node-status--unaffected'
                      }`}
                    >
                      {isSource ? '● Origin Node' : isAffected ? '● Affected' : '✓ Unaffected'}
                    </div>
                  </div>

                  {nextNode && (
                    <div
                      className={`network-connector ${
                        isRouteDisrupted ? 'network-connector--disrupted' : ''
                      }`}
                    >
                      <div className="network-connector__line" />
                      <div className="network-connector__badge">
                        {isRouteDisrupted ? (
                          <span>
                            ╳ {routeToNext?.transportMode || disruptedRoute?.transportMode || 'ROUTE'}{' '}
                            (SEVERED)
                          </span>
                        ) : (
                          <span>➔ {routeToNext?.transportMode || 'TRANSIT'}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Fallback if nodes array is not yet loaded
            <div className="flex items-center gap-4 py-4 text-xs text-slate-600">
              <div className="network-node-box network-node-box--source">
                <div className="network-node-type">SOURCE</div>
                <div className="network-node-name">{fromName}</div>
                <div className="network-node-status network-node-status--source">● Origin</div>
              </div>
              <div className="network-connector network-connector--disrupted">
                <div className="network-connector__line" />
                <div className="network-connector__badge">
                  ╳ {disruptedRoute?.transportMode || 'ROUTE'} (SEVERED)
                </div>
              </div>
              <div className="network-node-box network-node-box--affected">
                <div className="network-node-type">DESTINATION</div>
                <div className="network-node-name">{destName}</div>
                <div className="network-node-status network-node-status--affected">● Affected</div>
              </div>
              {affectedNodes.length > 1 && (
                <div className="text-xs text-red-600 font-semibold pl-2">
                  + {affectedNodes.length - 1} additional downstream node(s) impacted
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          4. "WHAT HAPPENS?" SECTION: AFFECTED DOWNSTREAM NODES
          Answers: WHAT WILL BE AFFECTED?
         ─────────────────────────────────────────────────────────────────── */}
      <section className="dash-card">
        <div className="dash-card__header">
          <div>
            <h2 className="dash-card__title">
              <span>⚠️</span>
              <span>Downstream Operational Impact</span>
            </h2>
            <p className="dash-card__subtitle">
              Facilities experiencing immediate incoming shipment disruption due to the severed route.
            </p>
          </div>
          <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md">
            {affectedNodes.length} Affected Node{affectedNodes.length === 1 ? '' : 's'}
          </span>
        </div>

        {affectedNodes.length > 0 ? (
          <div className="affected-nodes-grid">
            {affectedNodes.map((node, index) => (
              <div key={node._id || index} className="affected-node-card">
                <div>
                  <div className="affected-node-card__header">
                    <span className="affected-node-card__type">{node.type || 'FACILITY'}</span>
                    <span className="affected-node-card__status">● Supply Halted</span>
                  </div>
                  <h3 className="affected-node-card__name">{node.name}</h3>
                  <p className="affected-node-card__location">{node.location || 'Location unspecified'}</p>
                </div>
                <div className="affected-node-card__metrics">
                  <span>
                    Capacity: <strong>{node.capacity != null ? Number(node.capacity).toLocaleString('en-IN') : 'N/A'}</strong>
                  </span>
                  <span>
                    Inventory:{' '}
                    <strong>{node.inventory != null ? `${node.inventory} units` : 'Not defined'}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 italic">
            No downstream nodes are directly impacted by this route disruption.
          </div>
        )}
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          5. INVENTORY / STOCKOUT TIMELINE
          Answers: WHEN WILL THE SUPPLY SHORTAGE HAPPEN?
         ─────────────────────────────────────────────────────────────────── */}
      <section className="dash-card timeline-card">
        <div className="dash-card__header">
          <div>
            <h2 className="dash-card__title">
              <span>⏱️</span>
              <span>Disruption & Stockout Timeline</span>
            </h2>
            <p className="dash-card__subtitle">
              Deterministic progression: Disruption window ({durationDays}d) vs. Inventory buffer ({coverageDays ?? 'N/A'}d) vs. Projected stockout ({stockoutDays ?? 'N/A'}d).
            </p>
          </div>
        </div>

        {coverageDays == null || stockoutDays == null ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <div className="text-xl mb-1">ℹ️</div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">Timeline Data Insufficient</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              A deterministic timeline cannot be rendered because inventory buffer or daily demand data is not configured for downstream nodes.
            </p>
          </div>
        ) : (
          <div className="timeline-visual">
            {/* Visual Bar */}
            {stockoutDays === 0 ? (
              // Case: Buffer covers disruption
              <div>
                <div className="timeline-bar">
                  <div
                    className="timeline-segment timeline-segment--coverage"
                    style={{ width: '100%' }}
                  >
                    Inventory Buffer Active ({coverageDays}d buffer covers {durationDays}d outage)
                  </div>
                </div>
                <div className="timeline-milestones">
                  <div className="timeline-milestone text-left">
                    <span className="timeline-milestone__day">Day 0</span>
                    <span className="timeline-milestone__desc">Outage Begins</span>
                  </div>
                  <div className="timeline-milestone text-center">
                    <span className="timeline-milestone__day">Day {durationDays}</span>
                    <span className="timeline-milestone__desc text-emerald-600 font-semibold">
                      Outage Ends • 0 Stockout Days
                    </span>
                  </div>
                  <div className="timeline-milestone text-right">
                    <span className="timeline-milestone__day">Day {coverageDays}</span>
                    <span className="timeline-milestone__desc">Full Buffer Runout</span>
                  </div>
                </div>
              </div>
            ) : (
              // Case: Stockout occurs
              <div>
                <div className="timeline-bar">
                  <div
                    className="timeline-segment timeline-segment--coverage"
                    style={{
                      width: `${Math.max(10, Math.min(90, (coverageDays / durationDays) * 100))}%`,
                    }}
                  >
                    Buffer ({coverageDays}d)
                  </div>
                  <div
                    className="timeline-segment timeline-segment--stockout"
                    style={{
                      width: `${Math.max(10, Math.min(90, (stockoutDays / durationDays) * 100))}%`,
                    }}
                  >
                    Stockout Shortage ({stockoutDays}d)
                  </div>
                </div>
                <div className="timeline-milestones">
                  <div className="timeline-milestone text-left">
                    <span className="timeline-milestone__day">Day 0</span>
                    <span className="timeline-milestone__desc">Outage Begins</span>
                  </div>
                  <div className="timeline-milestone text-center">
                    <span className="timeline-milestone__day">Day {coverageDays}</span>
                    <span className="timeline-milestone__desc text-red-600 font-semibold">
                      Buffer Depleted • Shortage Starts
                    </span>
                  </div>
                  <div className="timeline-milestone text-right">
                    <span className="timeline-milestone__day">Day {durationDays}</span>
                    <span className="timeline-milestone__desc">Route Restored</span>
                  </div>
                </div>
              </div>
            )}

            <div className="timeline-legend">
              <div className="timeline-legend__item">
                <span className="timeline-legend__dot timeline-legend__dot--coverage" />
                <span>Inventory Buffer Active (Fulfilled from stock)</span>
              </div>
              <div className="timeline-legend__item">
                <span className="timeline-legend__dot timeline-legend__dot--stockout" />
                <span>Projected Stockout Period (Unfulfilled customer demand)</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          6. OPERATIONAL IMPACT SUMMARY
          Factual data table supported strictly by backend
         ─────────────────────────────────────────────────────────────────── */}
      <section className="dash-card">
        <div className="dash-card__header">
          <h2 className="dash-card__title">
            <span>📊</span>
            <span>Deterministic Impact Facts</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Backend Risk Engine Truth</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <table className="fact-table">
            <tbody>
              <tr>
                <td className="fact-key">Severed Route Connection</td>
                <td className="fact-val">{fromName} ➔ {destName}</td>
              </tr>
              <tr>
                <td className="fact-key">Transport Mode</td>
                <td className="fact-val">{disruptedRoute?.transportMode || 'Unavailable'}</td>
              </tr>
              <tr>
                <td className="fact-key">Baseline Transit Time</td>
                <td className="fact-val">{formatDays(disruptedRoute?.transitDays)}</td>
              </tr>
              <tr>
                <td className="fact-key">Baseline Route Cost</td>
                <td className="fact-val">{formatCost(disruptedRoute?.cost)}</td>
              </tr>
            </tbody>
          </table>

          <table className="fact-table">
            <tbody>
              <tr>
                <td className="fact-key">Route Throughput Capacity</td>
                <td className="fact-val">
                  {disruptedRoute?.capacityPerDay != null
                    ? `${Number(disruptedRoute.capacityPerDay).toLocaleString('en-IN')} units/day`
                    : 'Unavailable'}
                </td>
              </tr>
              <tr>
                <td className="fact-key">Available Inventory Buffer</td>
                <td className="fact-val">{formatDays(coverageDays)}</td>
              </tr>
              <tr>
                <td className="fact-key">Projected Stockout Duration</td>
                <td className="fact-val text-red-600 font-bold">{formatDays(stockoutDays)}</td>
              </tr>
              <tr>
                <td className="fact-key">Impacted Downstream Facilities</td>
                <td className="fact-val">{affectedNodes.length} node{affectedNodes.length === 1 ? '' : 's'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          7. ALTERNATIVE ROUTE / RECOVERY OPTIONS
          Answers: WHAT ARE THE RECOVERY OPTIONS?
         ─────────────────────────────────────────────────────────────────── */}
      <section className="dash-card">
        <div className="dash-card__header">
          <div>
            <h2 className="dash-card__title">
              <span>🔄</span>
              <span>Alternative Route Recovery Options</span>
            </h2>
            <p className="dash-card__subtitle">
              Configured parallel routes connecting {fromName} and {destName} evaluated for rerouting feasibility.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            {alternatives.length} Option{alternatives.length === 1 ? '' : 's'} Available
          </span>
        </div>

        {alternatives.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
            <h4 className="text-sm font-bold text-slate-800 mb-1">
              No comparable recovery route is currently configured.
            </h4>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              To evaluate multi-modal resilience and rerouting, configure a secondary route between {fromName} and {destName} with transit duration and cost in the supply chain builder.
            </p>
            <button
              onClick={() => navigate('/create-supply-chain')}
              className="btn-action btn-action--primary text-xs"
            >
              + Configure Alternative Route in Builder
            </button>
          </div>
        ) : (
          <div className="alternatives-container">
            {alternatives.map((alt, index) => {
              const isRecommended = index === recommendedAltIndex;
              const additionalCost = alt.additionalCost;
              const timeSaved = alt.timeSaved;

              const costDeltaLabel =
                additionalCost > 0
                  ? `+₹${Math.abs(additionalCost).toLocaleString('en-IN')}`
                  : additionalCost < 0
                  ? `-₹${Math.abs(additionalCost).toLocaleString('en-IN')}`
                  : '₹0';

              const timeSavedLabel =
                timeSaved > 0
                  ? `${timeSaved}d faster`
                  : timeSaved < 0
                  ? `${Math.abs(timeSaved)}d slower`
                  : '0d difference';

              return (
                <div
                  key={alt.routeId || index}
                  className={`alt-card ${isRecommended ? 'alt-card--recommended' : ''}`}
                >
                  <div className="alt-card__header">
                    <div className="alt-card__mode">
                      <span>Option #{index + 1}: {alt.transportMode}</span>
                      {isRecommended && (
                        <span className="alt-card__badge-rec">Recommended Option</span>
                      )}
                    </div>
                    <StockoutAvoidedBadge value={alt.stockoutAvoided} stockoutDays={stockoutDays} />
                  </div>

                  <div className="alt-comparison-grid">
                    <div className="alt-stat">
                      <div className="alt-stat__label">Transit Time</div>
                      <div className="alt-stat__value">{formatDays(alt.transitDays)}</div>
                    </div>
                    <div className="alt-stat">
                      <div className="alt-stat__label">Route Cost</div>
                      <div className="alt-stat__value">{formatCost(alt.cost)}</div>
                    </div>
                    <div className="alt-stat">
                      <div className="alt-stat__label">Time Delta vs Baseline</div>
                      <div
                        className={`alt-stat__value ${
                          timeSaved > 0
                            ? 'alt-stat__value--better'
                            : timeSaved < 0
                            ? 'alt-stat__value--worse'
                            : 'alt-stat__value--neutral'
                        }`}
                      >
                        {timeSavedLabel}
                      </div>
                    </div>
                    <div className="alt-stat">
                      <div className="alt-stat__label">Cost Delta vs Baseline</div>
                      <div
                        className={`alt-stat__value ${
                          additionalCost < 0
                            ? 'alt-stat__value--better'
                            : additionalCost > 0
                            ? 'alt-stat__value--worse'
                            : 'alt-stat__value--neutral'
                        }`}
                      >
                        {costDeltaLabel}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          8. DECISION SUMMARY
          Executive synthesis based strictly on backend facts
         ─────────────────────────────────────────────────────────────────── */}
      <section className="decision-summary-card">
        <h3 className="decision-summary-title">
          <span>📋</span>
          <span>Executive Decision Summary</span>
        </h3>
        <div className="decision-summary-body space-y-2">
          <p>
            <strong>Current Situation:</strong> A {durationDays}-day disruption on the{' '}
            <strong>{disruptedRoute?.transportMode || 'primary'}</strong> route from{' '}
            <strong>{fromName}</strong> to <strong>{destName}</strong> severs the primary replenishment flow.
          </p>
          <p>
            <strong>Operational Consequence:</strong> Downstream inventory covers approximately{' '}
            <strong>{coverageDays != null ? `${coverageDays} day(s)` : 'unknown days'}</strong>,{' '}
            {stockoutDays > 0 ? (
              <span className="text-red-700 font-semibold">
                resulting in a projected {stockoutDays}-day stockout across {affectedNodes.length} facility(ies).
              </span>
            ) : stockoutDays === 0 ? (
              <span className="text-emerald-700 font-semibold">
                which fully absorbs the outage without any projected customer stockout.
              </span>
            ) : (
              'preventing exact stockout quantification due to missing demand data.'
            )}
          </p>
          <p>
            <strong>Recovery Feasibility:</strong>{' '}
            {alternatives.length > 0 ? (
              <span>
                {alternatives.length} alternative route option(s) available.{' '}
                {alternatives.some((a) => a.stockoutAvoided) ? (
                  <span className="text-emerald-700 font-semibold">
                    At least one alternative restores supply fast enough to prevent stockout.
                  </span>
                ) : (
                  <span>
                    No configured alternative route avoids stockout completely; evaluate expedited freight or inventory buffer expansion.
                  </span>
                )}
              </span>
            ) : (
              <span>
                No alternative route is currently configured between these nodes. Multi-modal redundancy is recommended.
              </span>
            )}
          </p>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          9. AI DECISION SUPPORT
          Answers: WHAT DOES THE AI RECOMMEND?
         ─────────────────────────────────────────────────────────────────── */}
      <section className="ai-section-card">
        <div className="dash-card__header">
          <div>
            <h2 className="dash-card__title">
              <span>🤖</span>
              <span>AI Decision Support</span>
            </h2>
            <p className="dash-card__subtitle">
              Qualitative contextual explanation, risk advisory, and mitigation tradeoffs.
            </p>
          </div>
          <span
            className={`ai-provider-pill ${
              aiAvailable ? 'ai-provider-pill--gemini' : 'ai-provider-pill--fallback'
            }`}
          >
            {aiAvailable ? '✦ Powered by Gemini AI' : '⚡ Deterministic Fallback Engine'}
          </span>
        </div>

        {analysis ? (
          <div className="space-y-3">
            {/* Situation */}
            {analysis.summary && (
              <div className="ai-subcard">
                <h4 className="ai-subcard__title">Situation Overview</h4>
                <p className="ai-subcard__text">{analysis.summary}</p>
              </div>
            )}

            {/* Risk Explanation */}
            {analysis.riskExplanation && (
              <div className="ai-subcard">
                <h4 className="ai-subcard__title">Why This Disruption Matters</h4>
                <p className="ai-subcard__text">{analysis.riskExplanation}</p>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="ai-subcard">
                <h4 className="ai-subcard__title">Recommended Actions</h4>
                <ol className="ai-list">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Trade-offs */}
            {analysis.tradeoffs && analysis.tradeoffs.length > 0 && (
              <div className="ai-subcard">
                <h4 className="ai-subcard__title">Operational Trade-Offs</h4>
                <ul className="ai-list">
                  {analysis.tradeoffs.map((tradeoff, i) => (
                    <li key={i}>{tradeoff}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="ai-disclaimer-box">
              ⚠️ <strong>Notice:</strong> All numerical metrics (coverage days, stockout duration, route costs) are calculated deterministically by the backend Risk Engine. AI advisory provides explanatory context and does not alter numerical simulation results.
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
            AI analysis is currently unavailable. Numerical risk metrics and deterministic route evaluations remain fully authoritative.
          </div>
        )}
      </section>
    </div>
  );
};

export default SimulationImpact;
