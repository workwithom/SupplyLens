import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSupplyChains, runRouteFailureSimulation } from '../services/supplyChainService.js';
import './SimulationImpact.css';

// ─── Formatting helpers ────────────────────────────────────────────────────

const formatDays = (value) =>
  value === null || value === undefined
    ? 'Unavailable'
    : `${Number.isInteger(value) ? value : Number(value.toFixed(1))} day${value === 1 ? '' : 's'}`;

const formatCostAbsolute = (value) =>
  Number.isFinite(value) ? `₹${value.toLocaleString('en-IN')}` : 'Unavailable';

const getRiskBadgeClass = (riskLevel) => {
  switch (riskLevel) {
    case 'CRITICAL':
      return 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300';
    case 'HIGH':
      return 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200';
    case 'MEDIUM':
      return 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800 border border-yellow-300';
    case 'LOW':
      return 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-100 text-green-800 border border-green-300';
    default:
      return 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-300';
  }
};

const getRiskContainerStyle = (riskLevel) => {
  switch (riskLevel) {
    case 'CRITICAL':
    case 'HIGH':
      return 'border-red-300 bg-red-50/40';
    case 'MEDIUM':
      return 'border-yellow-300 bg-yellow-50/40';
    case 'LOW':
      return 'border-green-300 bg-green-50/40';
    default:
      return 'border-gray-300 bg-gray-50/40';
  }
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const MetricItem = ({ label, value, subtitle = '', valueClass = '' }) => (
  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
    <div>
      <span className="text-xs uppercase tracking-wider font-semibold text-gray-500 block mb-1">
        {label}
      </span>
      {subtitle && <span className="text-xs text-gray-400 block mb-2">{subtitle}</span>}
    </div>
    <span className={`text-xl font-bold text-gray-900 ${valueClass}`}>{value}</span>
  </div>
);

const StockoutAvoidedBadge = ({ value, stockoutDays }) => {
  if (value === null) {
    return (
      <span className="stockout-badge stockout-badge--unknown" title="Daily demand or inventory is not defined">
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
      <span className="stockout-badge stockout-badge--yes" title="Alternative restores supply before inventory depletes">
        ✓ Avoids stockout
      </span>
    );
  }
  return (
    <span className="stockout-badge stockout-badge--no" title="Alternative transit time exceeds inventory buffer">
      ✗ Does not avoid stockout
    </span>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────

const RiskAnalysis = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [supplyChains, setSupplyChains] = useState([]);
  const [isLoadingChains, setIsLoadingChains] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [selectedChainId, setSelectedChainId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [disruptionDurationDays, setDisruptionDurationDays] = useState(7);

  const [validationError, setValidationError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [simulationData, setSimulationData] = useState(null);

  // Load saved supply chains on mount
  useEffect(() => {
    let isMounted = true;

    const fetchChains = async () => {
      try {
        setIsLoadingChains(true);
        setLoadError('');
        const chains = await getSupplyChains();
        if (!isMounted) return;

        setSupplyChains(chains);

        if (chains.length > 0) {
          // Pre-select chain from location.state if provided, otherwise default to first chain
          const preselected = location.state?.supplyChainId
            ? chains.find((c) => String(c._id) === String(location.state.supplyChainId))
            : null;

          const activeChain = preselected || chains[0];
          setSelectedChainId(activeChain._id);

          const activeRoutes = activeChain.routes || [];
          if (activeRoutes.length > 0) {
            setSelectedRouteId(activeRoutes[0]._id);
          }
        }
      } catch (err) {
        if (isMounted) {
          setLoadError(err.message || 'Failed to load saved supply chains.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingChains(false);
        }
      }
    };

    fetchChains();

    return () => {
      isMounted = false;
    };
  }, [location.state?.supplyChainId]);

  // When selectedChainId changes, update available routes and preselect the first route
  const handleChainChange = (e) => {
    const nextChainId = e.target.value;
    setSelectedChainId(nextChainId);
    setSimulationData(null);
    setAnalysisError('');
    setValidationError('');

    const chain = supplyChains.find((c) => String(c._id) === String(nextChainId));
    const routes = chain?.routes || [];
    if (routes.length > 0) {
      setSelectedRouteId(routes[0]._id);
    } else {
      setSelectedRouteId('');
    }
  };

  const selectedChain = supplyChains.find((c) => String(c._id) === String(selectedChainId));
  const nodes = selectedChain?.nodes || [];
  const routes = selectedChain?.routes || [];
  const product = selectedChain?.products?.[0] || null;

  const nodesById = new Map(nodes.map((n) => [String(n._id), n]));

  const getRouteLabel = (route, index) => {
    const sourceNode = nodesById.get(String(route.sourceNodeId));
    const destNode = nodesById.get(String(route.destinationNodeId));
    const fromLabel = sourceNode?.location || sourceNode?.name || `Node ${index + 1}`;
    const toLabel = destNode?.location || destNode?.name || `Node ${index + 2}`;
    const mode = route.transportMode || 'ROAD';
    const days = route.transitDays != null ? `${route.transitDays}d` : '1d';
    const cost = route.cost != null ? `₹${Number(route.cost).toLocaleString('en-IN')}` : '₹0';

    return `${fromLabel} ➔ ${toLabel} [${mode} · ${days} · ${cost}]`;
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (isAnalyzing) return;

    if (!selectedChainId) {
      setValidationError('Please select a saved supply chain.');
      return;
    }

    if (!selectedRouteId) {
      setValidationError('Please select a route to evaluate.');
      return;
    }

    const duration = Number(disruptionDurationDays);
    if (!Number.isFinite(duration) || duration < 0) {
      setValidationError('Enter a non-negative disruption duration in days.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setValidationError('');
      setAnalysisError('');

      const response = await runRouteFailureSimulation(selectedChainId, {
        routeId: selectedRouteId,
        disruptionDurationDays: duration,
      });

      setSimulationData(response);
    } catch (err) {
      setAnalysisError(err.message || 'Failed to analyze risk. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportJson = () => {
    if (!simulationData?.result) return;
    const { result, alternatives, analysis, aiAvailable } = simulationData;

    const reportData = {
      title: 'SupplyLens Supply Chain Risk Analysis Report',
      generatedAt: new Date().toISOString(),
      supplyChain: {
        id: selectedChainId,
        name: selectedChain?.name,
        product: product?.name || 'Unavailable',
      },
      disruption: result.disruption,
      disruptedRoute: result.disruptedRoute,
      deterministicImpact: {
        riskLevel: result.riskLevel,
        inventoryCoverageDays: result.inventoryCoverageDays,
        stockoutDays: result.stockoutDays,
        affectedNodes: result.affectedNodes,
      },
      alternativeRoutes: alternatives,
      aiAnalysis: analysis,
      aiAvailable,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supplylens-risk-analysis-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // ─── Render: Loading State ───────────────────────────────────────────────
  if (isLoadingChains) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto" />
          <p className="text-gray-600 mt-4 text-base font-medium">
            Loading your saved supply chains…
          </p>
        </div>
      </div>
    );
  }

  // ─── Render: Load Error State ────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl shadow-lg text-center border border-red-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Supply Chains</h2>
        <p className="text-red-600 mb-6 text-sm" role="alert">{loadError}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            ← Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Empty Supply Chains State ───────────────────────────────────
  if (supplyChains.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-10 bg-white rounded-2xl shadow-xl text-center border border-gray-200">
        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ⛓️
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Saved Supply Chains Yet</h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm leading-relaxed">
          Risk analysis evaluates deterministic stockout impact on your saved operational supply chains. Create your first supply chain with nodes and transport routes to begin.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 bg-gray-700 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            ← Dashboard
          </button>
          <button
            onClick={() => navigate('/create-supply-chain')}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            + Create Supply Chain
          </button>
        </div>
      </div>
    );
  }

  // ─── Result derived values ───────────────────────────────────────────────
  const result = simulationData?.result;
  const alternatives = simulationData?.alternatives || [];
  const analysis = simulationData?.analysis;
  const aiAvailable = simulationData?.aiAvailable === true;

  const disruptedRoute = result?.disruptedRoute;
  const sourceNode = disruptedRoute ? nodesById.get(String(disruptedRoute.sourceNodeId)) : null;
  const destNode = disruptedRoute ? nodesById.get(String(disruptedRoute.destinationNodeId)) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* ── Top Header & Navigation ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors"
          >
            ← Dashboard
          </button>
          {selectedChainId && (
            <button
              onClick={() => navigate(`/supply-chain-visualization/${selectedChainId}`)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              Visualization
            </button>
          )}
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900">Supply Chain Risk Analysis</h1>
          <p className="text-sm text-gray-500 mt-1">
            Deterministic route-failure simulation and stockout risk evaluation on saved MongoDB supply chains.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/create-supply-chain')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
          >
            + New Chain
          </button>
        </div>
      </div>

      {/* ── Configuration Card (Inputs) ── */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8 no-print">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
            1
          </span>
          Select Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Supply Chain Dropdown */}
          <div>
            <label htmlFor="chainSelect" className="block text-sm font-semibold text-gray-700 mb-2">
              Saved Supply Chain
            </label>
            <select
              id="chainSelect"
              value={selectedChainId}
              onChange={handleChainChange}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              {supplyChains.map((chain) => (
                <option key={chain._id} value={chain._id}>
                  {chain.name} ({chain.products?.[0]?.name || 'Product'})
                </option>
              ))}
            </select>
          </div>

          {/* Route Dropdown */}
          <div>
            <label htmlFor="routeSelect" className="block text-sm font-semibold text-gray-700 mb-2">
              Route to Disrupt
            </label>
            {routes.length === 0 ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                No transport routes in this chain.{' '}
                <button
                  onClick={() => navigate('/create-supply-chain')}
                  className="font-bold underline ml-1 text-amber-900"
                >
                  Configure routes
                </button>
              </div>
            ) : (
              <select
                id="routeSelect"
                value={selectedRouteId}
                onChange={(e) => {
                  setSelectedRouteId(e.target.value);
                  setSimulationData(null);
                  setValidationError('');
                }}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {routes.map((route, idx) => (
                  <option key={route._id} value={route._id}>
                    {getRouteLabel(route, idx)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Selected Chain Metadata Banner */}
        {selectedChain && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-500 block">Product</span>
              <strong className="text-gray-900 text-sm">{product?.name || 'Unnamed Product'}</strong>
              {product?.sku && <span className="text-gray-400 block">{product.sku}</span>}
            </div>
            <div>
              <span className="text-gray-500 block">Criticality</span>
              <strong className="text-gray-900 text-sm">{product?.criticality || 'MEDIUM'}</strong>
            </div>
            <div>
              <span className="text-gray-500 block">Daily Demand</span>
              <strong className="text-gray-900 text-sm">
                {product?.dailyDemand != null ? `${product.dailyDemand} units/day` : 'N/A'}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 block">Topology</span>
              <strong className="text-gray-900 text-sm">
                {nodes.length} Nodes · {routes.length} Routes
              </strong>
            </div>
          </div>
        )}

        {/* Duration Input & Analyze Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 pt-2 border-t border-gray-100">
          <div className="w-full sm:w-64">
            <label htmlFor="durationInput" className="block text-sm font-semibold text-gray-700 mb-1">
              Disruption Duration (Days)
            </label>
            <input
              id="durationInput"
              type="number"
              min="0"
              step="1"
              value={disruptionDurationDays}
              onChange={(e) => {
                setDisruptionDurationDays(e.target.value);
                setValidationError('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
              placeholder="e.g. 7"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || routes.length === 0}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Running Simulation…</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Analyze Risk</span>
              </>
            )}
          </button>
        </div>

        {validationError && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg" role="alert">
            {validationError}
          </div>
        )}

        {analysisError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg" role="alert">
            {analysisError}
          </div>
        )}
      </div>

      {/* ─── Simulation Results View ──────────────────────────────────────── */}
      {result && (
        <div className="space-y-8">
          {/* Action Bar (Export JSON / Print) */}
          <div className="flex justify-end gap-2 no-print">
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1 shadow-sm"
              title="Download JSON Report"
            >
              <span>📥</span>
              <span>Export JSON</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors flex items-center gap-1 shadow-sm"
              title="Print / Save PDF"
            >
              <span>🖨️</span>
              <span>Print / PDF</span>
            </button>
          </div>

          {/* Section 1: Risk Level & Metrics Summary */}
          <section className="bg-white rounded-2xl shadow-lg border p-6">
            <div className={`p-6 rounded-2xl border ${getRiskContainerStyle(result.riskLevel)} mb-6`}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-900">Authoritative Risk Level:</span>
                  <span className={getRiskBadgeClass(result.riskLevel)}>{result.riskLevel}</span>
                </div>
                <span className="text-xs text-gray-500 font-mono bg-white px-2.5 py-1 rounded-md border border-gray-200">
                  Calculated by backend Risk Engine
                </span>
              </div>

              {result.riskLevel === 'UNKNOWN' && (
                <div className="mb-4 p-3 bg-white/80 rounded-xl border border-gray-300 text-xs text-gray-700 leading-relaxed">
                  <strong>Risk level cannot be quantified:</strong>{' '}
                  {result.affectedNodes?.length === 0
                    ? 'No downstream nodes are resolved from this route disruption.'
                    : 'Inventory or daily demand data is not defined for the affected product/nodes.'}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricItem
                  label="Disruption Type"
                  value="ROUTE_FAILURE"
                  subtitle="Single route severed"
                />
                <MetricItem
                  label="Disruption Duration"
                  value={formatDays(result.disruption?.durationDays)}
                  subtitle="Simulated outage window"
                />
                <MetricItem
                  label="Inventory Coverage"
                  value={
                    result.inventoryCoverageDays != null
                      ? `${Number.isInteger(result.inventoryCoverageDays) ? result.inventoryCoverageDays : Number(result.inventoryCoverageDays.toFixed(1))} days`
                      : 'Data unavailable'
                  }
                  subtitle="Buffer available before depletion"
                />
                <MetricItem
                  label="Projected Stockout"
                  value={
                    result.stockoutDays == null
                      ? 'Data unavailable'
                      : result.stockoutDays === 0
                      ? '0 days'
                      : `${Number.isInteger(result.stockoutDays) ? result.stockoutDays : Number(result.stockoutDays.toFixed(1))} days`
                  }
                  valueClass={result.stockoutDays > 0 ? 'text-red-700 font-bold' : ''}
                  subtitle={
                    result.stockoutDays == null
                      ? 'Requires daily demand data'
                      : result.stockoutDays === 0
                      ? 'Buffer covers disruption'
                      : 'Unfulfilled customer demand period'
                  }
                />
              </div>
            </div>

            {/* Section 2: Disrupted Route Details */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Disrupted Route Details</h3>
              <div className="bg-red-50/60 border border-red-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-800 bg-white px-3 py-1 rounded-md shadow-xs">
                    {sourceNode?.location || sourceNode?.name || 'Source'}
                  </span>
                  <span className="text-red-500 font-bold">➔</span>
                  <span className="font-bold text-gray-800 bg-white px-3 py-1 rounded-md shadow-xs">
                    {destNode?.location || destNode?.name || 'Destination'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-gray-700">
                  <span className="mode-badge">{disruptedRoute?.transportMode || 'ROAD'}</span>
                  <span>Transit: {formatDays(disruptedRoute?.transitDays)}</span>
                  <span>Cost: {formatCostAbsolute(disruptedRoute?.cost)}</span>
                  {disruptedRoute?.capacityPerDay != null && (
                    <span>Capacity: {disruptedRoute.capacityPerDay.toLocaleString('en-IN')} units/day</span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Downstream Nodes Impacted */}
            <div className="border-t border-gray-100 pt-6 mt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Affected Downstream Nodes</h3>
              {result.affectedNodes && result.affectedNodes.length > 0 ? (
                <ul className="list-inside list-disc text-gray-700 space-y-1.5 text-sm">
                  {result.affectedNodes.map((node, idx) => (
                    <li key={node._id || idx}>
                      <strong className="text-gray-900">{node.location || node.name}</strong>
                      {node.type && (
                        <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {node.type}
                        </span>
                      )}
                      {node.location && node.name && node.name !== node.location && (
                        <span className="text-gray-500 text-xs ml-2">— {node.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No downstream nodes are affected by this route disruption.
                </p>
              )}
            </div>
          </section>

          {/* Section 4: Alternative Routes Tradeoffs */}
          <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              Alternative Routes — Direct Replacement Tradeoffs
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Routes connecting the same source and destination. Metrics are computed deterministically from saved supply chain data.
            </p>

            {alternatives.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-700 font-medium text-sm">No alternative routes found.</p>
                <p className="text-xs text-gray-500 mt-1">
                  To evaluate alternative options, add a second route between the same two nodes with transit days and cost in the supply chain builder.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {alternatives.map((alt, idx) => {
                  const additionalCostLabel = Number.isFinite(alt.additionalCost)
                    ? alt.additionalCost > 0
                      ? `+₹${Math.abs(alt.additionalCost).toLocaleString('en-IN')} (higher cost)`
                      : alt.additionalCost < 0
                      ? `-₹${Math.abs(alt.additionalCost).toLocaleString('en-IN')} (cost savings)`
                      : '₹0 (same cost)'
                    : 'Unavailable';

                  const timeSavedLabel = Number.isFinite(alt.timeSaved)
                    ? alt.timeSaved > 0
                      ? `${alt.timeSaved} day${alt.timeSaved === 1 ? '' : 's'} faster`
                      : alt.timeSaved < 0
                      ? `${Math.abs(alt.timeSaved)} day${Math.abs(alt.timeSaved) === 1 ? '' : 's'} slower`
                      : 'Same transit time (0 days)'
                    : 'Unavailable';

                  return (
                    <div key={alt.routeId || idx} className="tradeoff-card">
                      <div className="tradeoff-card__header">
                        <span className="text-sm font-semibold text-gray-700 mr-1">
                          Alternative Option #{idx + 1}:
                        </span>
                        <span className="mode-badge">{alt.transportMode || 'Alternative Mode'}</span>
                        <StockoutAvoidedBadge value={alt.stockoutAvoided} stockoutDays={result.stockoutDays} />
                      </div>

                      <div className="tradeoff-comparison">
                        <div className="tradeoff-col tradeoff-col--original">
                          <p className="tradeoff-col__label">Original Disrupted Route</p>
                          <div className="tradeoff-col__metrics">
                            <div className="tradeoff-stat">
                              <span className="tradeoff-stat__key">Transit</span>
                              <span className="tradeoff-stat__val">{formatDays(disruptedRoute?.transitDays)}</span>
                            </div>
                            <div className="tradeoff-stat">
                              <span className="tradeoff-stat__key">Cost</span>
                              <span className="tradeoff-stat__val">{formatCostAbsolute(disruptedRoute?.cost)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="tradeoff-vs" aria-hidden="true">vs</div>

                        <div className="tradeoff-col tradeoff-col--alternative">
                          <p className="tradeoff-col__label">Alternative Route</p>
                          <div className="tradeoff-col__metrics">
                            <div className="tradeoff-stat">
                              <span className="tradeoff-stat__key">Transit</span>
                              <span className="tradeoff-stat__val">{formatDays(alt.transitDays)}</span>
                            </div>
                            <div className="tradeoff-stat">
                              <span className="tradeoff-stat__key">Cost</span>
                              <span className="tradeoff-stat__val">{formatCostAbsolute(alt.cost)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="tradeoff-deltas">
                        <div
                          className={`tradeoff-delta ${
                            alt.additionalCost > 0
                              ? 'tradeoff-delta--worse'
                              : alt.additionalCost < 0
                              ? 'tradeoff-delta--better'
                              : 'tradeoff-delta--neutral'
                          }`}
                        >
                          <span className="tradeoff-delta__key">Additional cost vs original:</span>
                          <span className="tradeoff-delta__val">{additionalCostLabel}</span>
                        </div>
                        <div
                          className={`tradeoff-delta ${
                            alt.timeSaved > 0
                              ? 'tradeoff-delta--better'
                              : alt.timeSaved < 0
                              ? 'tradeoff-delta--worse'
                              : 'tradeoff-delta--neutral'
                          }`}
                        >
                          <span className="tradeoff-delta__key">Time saved vs original:</span>
                          <span className="tradeoff-delta__val">{timeSavedLabel}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 5: AI Explanatory Analysis */}
          {analysis && (
            <section className="ai-analysis-section">
              <div className="ai-analysis-card">
                <div className="ai-analysis-header">
                  <h3 className="summary-title" style={{ marginBottom: 0 }}>
                    AI Analysis & Operational Explanation
                  </h3>
                  {aiAvailable ? (
                    <span className="ai-provider-badge ai-provider-badge--live">✦ Gemini AI</span>
                  ) : (
                    <span className="ai-provider-badge ai-provider-badge--fallback">
                      ⚡ Deterministic fallback
                    </span>
                  )}
                </div>

                {!aiAvailable && (
                  <div className="ai-unavailable-notice" role="status">
                    <strong>AI explanation unavailable.</strong> The analysis below is generated from deterministic simulation data only. Connect a Gemini API key to enable live AI explanations.
                  </div>
                )}

                <div className="ai-block">
                  <h4 className="ai-block__title">Summary</h4>
                  <p className="ai-block__body">{analysis.summary}</p>
                </div>

                <div className="ai-block">
                  <h4 className="ai-block__title">Risk Explanation</h4>
                  <p className="ai-block__body">{analysis.riskExplanation}</p>
                </div>

                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <div className="ai-block">
                    <h4 className="ai-block__title">Recommendations</h4>
                    <ol className="ai-list ai-list--ordered">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="ai-list__item">{rec}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {analysis.tradeoffs && analysis.tradeoffs.length > 0 && (
                  <div className="ai-block">
                    <h4 className="ai-block__title">Tradeoffs</h4>
                    <ul className="ai-list ai-list--unordered">
                      {analysis.tradeoffs.map((tradeoff, i) => (
                        <li key={i} className="ai-list__item">{tradeoff}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="ai-disclaimer">
                  AI analysis is explanatory only. All numerical values (coverage days, stockout, costs) come from the
                  deterministic simulation and are not modified by the AI. Always verify recommendations against your
                  operational context.
                </p>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default RiskAnalysis;
