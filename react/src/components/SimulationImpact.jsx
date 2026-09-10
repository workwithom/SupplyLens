import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { runRouteFailureSimulation } from "../services/supplyChainService";
import "./SimulationImpact.css";

// ─── Formatting helpers ────────────────────────────────────────────────────

const formatDays = (value) =>
  value === null || value === undefined
    ? "Unavailable"
    : `${value} day${value === 1 ? "" : "s"}`;

const formatCostAbsolute = (value) =>
  Number.isFinite(value) ? `₹${value.toLocaleString("en-IN")}` : "Unavailable";

const getRiskBadgeClass = (riskLevel) => {
  switch (riskLevel) {
    case "CRITICAL": return "risk-badge risk-badge--critical";
    case "HIGH":     return "risk-badge risk-badge--high";
    case "MEDIUM":   return "risk-badge risk-badge--medium";
    case "LOW":      return "risk-badge risk-badge--low";
    default:         return "risk-badge risk-badge--unknown";
  }
};

const getRiskColors = (riskLevel) => {
  switch (riskLevel) {
    case "CRITICAL":
    case "HIGH":
      return "bg-red-100 border-red-300 text-red-700";
    case "MEDIUM":
      return "bg-yellow-100 border-yellow-300 text-yellow-700";
    case "LOW":
      return "bg-green-100 border-green-300 text-green-700";
    default:
      return "bg-gray-100 border-gray-300 text-gray-700";
  }
};

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Single metric row inside the impact summary card. */
const MetricRow = ({ label, value, valueClass = "", subtitle = "" }) => (
  <div className="impact-metric">
    <div className="flex flex-col">
      <span className="metric-label">{label}</span>
      {subtitle && <span className="text-xs text-gray-500 font-normal mt-0.5">{subtitle}</span>}
    </div>
    <span className={`metric-value ${valueClass}`}>{value}</span>
  </div>
);

/**
 * Shows the disrupted route's node path (from → to).
 * Falls back gracefully when brokenLinks state is absent (e.g. page refresh).
 */
const DisruptedRoutePath = ({ brokenLinks, disruptedRoute, supplyChain }) => {
  if (brokenLinks && brokenLinks.length > 0) {
    return brokenLinks.map((link) => (
      <div key={link.key || link.routeId} className="broken-link-item">
        <span className="link-from">{link.from}</span>
        <span className="mx-3">→</span>
        <span className="link-to">{link.to}</span>
        <span className="ml-4 text-gray-500 font-medium">
          {link.transport || disruptedRoute?.transportMode || ""}
        </span>
      </div>
    ));
  }
  if (disruptedRoute) {
    const nodes = supplyChain?.nodes || [];
    const sourceNode = nodes.find((n) => String(n._id) === String(disruptedRoute.sourceNodeId));
    const destNode = nodes.find((n) => String(n._id) === String(disruptedRoute.destinationNodeId));
    const fromName = sourceNode?.location || sourceNode?.name || "Source Node";
    const destName = destNode?.location || destNode?.name || "Destination Node";

    return (
      <div className="broken-link-item">
        <span className="link-from">{fromName}</span>
        <span className="mx-3">→</span>
        <span className="link-to">{destName}</span>
        <span className="ml-4 text-gray-500 font-medium">
          {disruptedRoute.transportMode || "Unavailable"}
        </span>
      </div>
    );
  }
  return <p className="text-gray-500 italic">Route details unavailable.</p>;
};

/** Stockout avoided badge — green ✓ / grey ✗ / grey "unavailable". */
const StockoutAvoidedBadge = ({ value, stockoutDays }) => {
  if (value === null) {
    return (
      <span className="stockout-badge stockout-badge--unknown" title="Daily demand or inventory is not defined to compute stockout avoidance">
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

/**
 * Side-by-side tradeoff comparison card (original route vs alternative).
 * Used in both the deterministic comparison section and the AI tradeoffs list.
 */
const TradeoffCard = ({ alt, disruptedRoute, stockoutDays, index }) => {
  const additionalCostClass =
    alt.additionalCost > 0
      ? "tradeoff-delta tradeoff-delta--worse"
      : alt.additionalCost < 0
      ? "tradeoff-delta tradeoff-delta--better"
      : "tradeoff-delta tradeoff-delta--neutral";

  const additionalCostLabel =
    Number.isFinite(alt.additionalCost)
      ? alt.additionalCost > 0
        ? `+₹${Math.abs(alt.additionalCost).toLocaleString("en-IN")} (higher cost)`
        : alt.additionalCost < 0
        ? `-₹${Math.abs(alt.additionalCost).toLocaleString("en-IN")} (cost savings)`
        : "₹0 (same cost)"
      : "Unavailable";

  const timeSavedClass =
    alt.timeSaved > 0
      ? "tradeoff-delta tradeoff-delta--better"
      : alt.timeSaved < 0
      ? "tradeoff-delta tradeoff-delta--worse"
      : "tradeoff-delta tradeoff-delta--neutral";

  const timeSavedLabel =
    Number.isFinite(alt.timeSaved)
      ? alt.timeSaved > 0
        ? `${alt.timeSaved} day${alt.timeSaved === 1 ? "" : "s"} faster`
        : alt.timeSaved < 0
        ? `${Math.abs(alt.timeSaved)} day${Math.abs(alt.timeSaved) === 1 ? "" : "s"} slower`
        : "Same transit time (0 days)"
      : "Unavailable";

  return (
    <div className="tradeoff-card" key={alt.routeId || index}>
      <div className="tradeoff-card__header">
        <span className="text-sm font-semibold text-gray-700 mr-1">
          Alternative Route Option #{index + 1}:
        </span>
        <span className="mode-badge">{alt.transportMode || "Alternative Mode"}</span>
        <StockoutAvoidedBadge value={alt.stockoutAvoided} stockoutDays={stockoutDays} />
      </div>

      <div className="tradeoff-comparison">
        <div className="tradeoff-col tradeoff-col--original">
          <p className="tradeoff-col__label">Original Disrupted Route</p>
          <div className="tradeoff-col__metrics">
            <div className="tradeoff-stat">
              <span className="tradeoff-stat__key">Transit time</span>
              <span className="tradeoff-stat__val">{formatDays(disruptedRoute?.transitDays ?? null)}</span>
            </div>
            <div className="tradeoff-stat">
              <span className="tradeoff-stat__key">Transport cost</span>
              <span className="tradeoff-stat__val">{formatCostAbsolute(disruptedRoute?.cost)}</span>
            </div>
          </div>
        </div>

        <div className="tradeoff-vs" aria-hidden="true">vs</div>

        <div className="tradeoff-col tradeoff-col--alternative">
          <p className="tradeoff-col__label">Alternative Route</p>
          <div className="tradeoff-col__metrics">
            <div className="tradeoff-stat">
              <span className="tradeoff-stat__key">Transit time</span>
              <span className="tradeoff-stat__val">{formatDays(alt.transitDays)}</span>
            </div>
            <div className="tradeoff-stat">
              <span className="tradeoff-stat__key">Transport cost</span>
              <span className="tradeoff-stat__val">{formatCostAbsolute(alt.cost)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tradeoff-deltas">
        <div className={additionalCostClass}>
          <span className="tradeoff-delta__key">Additional cost vs original:</span>
          <span className="tradeoff-delta__val">{additionalCostLabel}</span>
        </div>
        <div className={timeSavedClass}>
          <span className="tradeoff-delta__key">Time saved vs original:</span>
          <span className="tradeoff-delta__val">{timeSavedLabel}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * AI Analysis section — summary, risk explanation, recommendations, tradeoffs.
 * Includes a non-blocking "AI unavailable" notice when the fallback was used.
 */
const AiAnalysisSection = ({ analysis, aiAvailable }) => {
  if (!analysis) {
    return (
      <section className="ai-analysis-section">
        <div className="ai-analysis-card">
          <div className="ai-analysis-header">
            <h3 className="summary-title" style={{ marginBottom: 0 }}>AI Analysis</h3>
            <span className="ai-provider-badge ai-provider-badge--fallback">
              Unavailable
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-3">
            AI explanatory analysis is currently unavailable. All numerical risk metrics, inventory coverage, and alternative route comparisons above are computed deterministically from saved supply chain data.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="ai-analysis-section">
      <div className="ai-analysis-card">
        {/* Header with provider indicator */}
        <div className="ai-analysis-header">
          <h3 className="summary-title" style={{ marginBottom: 0 }}>AI Analysis</h3>
          {aiAvailable ? (
            <span className="ai-provider-badge ai-provider-badge--live">
              ✦ Gemini AI
            </span>
          ) : (
            <span className="ai-provider-badge ai-provider-badge--fallback">
              ⚡ Deterministic fallback
            </span>
          )}
        </div>

        {/* Non-blocking unavailability notice */}
        {!aiAvailable && (
          <div className="ai-unavailable-notice" role="status">
            <strong>AI explanation unavailable.</strong> The analysis below is generated from deterministic simulation data only. Connect a Gemini API key to enable live AI-powered explanations.
          </div>
        )}

        {/* Summary */}
        <div className="ai-block">
          <h4 className="ai-block__title">Summary</h4>
          <p className="ai-block__body">{analysis.summary}</p>
        </div>

        {/* Risk Explanation */}
        <div className="ai-block">
          <h4 className="ai-block__title">Risk Explanation</h4>
          <p className="ai-block__body">{analysis.riskExplanation}</p>
        </div>

        {/* Recommendations */}
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

        {/* AI Tradeoffs */}
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
  );
};

// ─── Main component ──────────────────────────────────────────────────────────

const SimulationImpact = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
      // ignore JSON parse error
    }
    return location.state || {};
  });

  const {
    supplyChainId,
    routeId,
    disruptionDurationDays,
    supplyChain,
    supplyChainData,
    brokenLinks,
  } = params;

  useEffect(() => {
    if (!supplyChainId || !routeId || disruptionDurationDays === undefined) {
      setError("No simulation data found. Select a saved route and duration first.");
      setIsLoading(false);
      return;
    }

    const runSimulation = async () => {
      try {
        setError("");
        const simulationResponse = await runRouteFailureSimulation(supplyChainId, {
          routeId,
          disruptionDurationDays: Number(disruptionDurationDays),
        });
        setResult(simulationResponse.result);
        setAlternatives(simulationResponse.alternatives || []);
        setAnalysis(simulationResponse.analysis || null);
        setAiAvailable(simulationResponse.aiAvailable === true);
      } catch (requestError) {
        setError(requestError.message || "Unable to run the simulation.");
      } finally {
        setIsLoading(false);
      }
    };

    runSimulation();
  }, [supplyChainId, routeId, disruptionDurationDays]);

  const handleExportJson = () => {
    if (!result) return;
    const reportData = {
      title: "SupplyLens Simulation Impact Report",
      generatedAt: new Date().toISOString(),
      supplyChain: {
        id: supplyChainId,
        product: result.product?.name || supplyChain?.products?.[0]?.name || supplyChainData?.product || "Unavailable",
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
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `supplylens-simulation-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const visualizationPath = supplyChainId
    ? `/supply-chain-visualization/${supplyChainId}`
    : "/create-supply-chain";

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto" />
          <p className="text-gray-600 mt-4">Running simulation and AI analysis…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Simulation Unavailable</h2>
          <p className="mb-6 text-red-600 text-sm" role="alert">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-800 text-sm font-medium"
            >
              ← Dashboard
            </button>
            <button
              onClick={() => navigate(visualizationPath)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 text-sm font-medium"
            >
              Back to Visualization
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const riskColors = getRiskColors(result.riskLevel);
  const disruptedRoute = result.disruptedRoute;
  const productName = result.product?.name || supplyChain?.products?.[0]?.name || supplyChainData?.product || "Unavailable";
  const productSku = result.product?.sku || supplyChain?.products?.[0]?.sku;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="supply-chain-container">

      {/* ── Page header ── */}
      <div className="text-center">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4 no-print">
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-800 text-sm font-medium"
            >
              ← Dashboard
            </button>
            <button
              onClick={() => navigate(visualizationPath)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 text-sm font-medium"
            >
              Visualization
            </button>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Simulation Impact Analysis</h1>
          <div className="flex gap-2">
            <button
              onClick={handleExportJson}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 text-sm font-medium flex items-center gap-1.5"
              title="Download JSON Report"
            >
              <span>📥</span>
              <span>Export JSON</span>
            </button>
            <button
              onClick={handlePrint}
              className="rounded-lg bg-gray-600 px-3 py-2 text-white hover:bg-gray-700 text-sm font-medium flex items-center gap-1.5"
              title="Print / Save as PDF"
            >
              <span>🖨️</span>
              <span>Print / PDF</span>
            </button>
            <button
              onClick={() => navigate("/create-supply-chain")}
              className="rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700 text-sm font-medium"
            >
              New Chain
            </button>
          </div>
        </div>
        <div className="mb-12 rounded-xl bg-white p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-blue-600">
            Product: {productName}{productSku ? ` (${productSku})` : ""}
          </h2>
          <p className="mt-2 text-gray-500 text-sm">
            Deterministic route-failure simulation — numerical results are calculated from saved supply-chain data.
            AI explanation is additive and does not modify these values.
          </p>
        </div>
      </div>

      {/* ── Section 1: Risk Impact Summary ── */}
      <section className="impact-summary-section">
        <div className={`impact-summary-card border ${riskColors}`}>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-2xl font-bold">Risk Level:</h3>
            <span className={getRiskBadgeClass(result.riskLevel)}>{result.riskLevel}</span>
          </div>
          {result.riskLevel === "UNKNOWN" && (
            <p className="mb-4 text-xs text-gray-600 bg-white/70 p-2.5 rounded-lg border border-gray-200">
              Risk level cannot be determined: {result.affectedNodes?.length === 0 ? "no downstream nodes are affected by this route disruption." : "daily demand or downstream inventory data is not defined."}
            </p>
          )}
          <div className="impact-metrics">
            <MetricRow
              label="Disruption Type"
              value="ROUTE_FAILURE"
              subtitle="Single route severed"
            />
            <MetricRow
              label="Disruption Duration"
              value={formatDays(result.disruption?.durationDays)}
              subtitle="Planned outage period"
            />
            <MetricRow
              label="Inventory Coverage"
              value={
                result.inventoryCoverageDays != null
                  ? `${Number.isInteger(result.inventoryCoverageDays) ? result.inventoryCoverageDays : Number(result.inventoryCoverageDays.toFixed(1))} days`
                  : "Data unavailable"
              }
              subtitle="Buffer available before depletion"
            />
            <MetricRow
              label="Projected Stockout"
              value={
                result.stockoutDays == null
                  ? "Data unavailable"
                  : result.stockoutDays === 0
                  ? "0 days"
                  : `${Number.isInteger(result.stockoutDays) ? result.stockoutDays : Number(result.stockoutDays.toFixed(1))} days`
              }
              valueClass={result.stockoutDays > 0 ? "text-red-700 font-bold" : ""}
              subtitle={
                result.stockoutDays == null
                  ? "Requires daily demand data"
                  : result.stockoutDays === 0
                  ? "Buffer covers disruption"
                  : "Unfulfilled demand period"
              }
            />
          </div>
        </div>
      </section>

      {/* ── Section 2: Disrupted Route ── */}
      <section className="broken-links-section">
        <div className="broken-links-card">
          <h3 className="mb-4 text-xl font-bold">Disrupted Route</h3>
          <DisruptedRoutePath
            brokenLinks={brokenLinks}
            disruptedRoute={disruptedRoute}
            supplyChain={supplyChain}
          />
          {disruptedRoute && (
            <div className="mt-4 flex flex-wrap gap-6 text-sm text-gray-600">
              {disruptedRoute.transitDays != null && (
                <span className="route-time">
                  Transit: <strong>{formatDays(disruptedRoute.transitDays)}</strong>
                </span>
              )}
              {disruptedRoute.cost != null && (
                <span className="route-cost">
                  Cost: <strong>{formatCostAbsolute(disruptedRoute.cost)}</strong>
                </span>
              )}
              {disruptedRoute.capacityPerDay != null && (
                <span className="route-time">
                  Capacity: <strong>{disruptedRoute.capacityPerDay.toLocaleString("en-IN")} units/day</strong>
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Section 3: Affected Downstream Nodes ── */}
      <section className="summary-section">
        <div className="summary-card">
          <h3 className="summary-title">Affected Downstream Nodes</h3>
          {result.affectedNodes && result.affectedNodes.length > 0 ? (
            <ul className="mt-4 list-inside list-disc text-gray-700 space-y-1">
              {result.affectedNodes.map((node, index) => (
                <li key={node._id || `${node.name}-${index}`}>
                  <strong className="text-gray-900">{node.location || node.name}</strong>
                  {node.type ? ` (${node.type})` : ""}
                  {node.location && node.name && node.name !== node.location ? ` — ${node.name}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-gray-500 italic">
              No downstream nodes are affected by this route disruption.
            </p>
          )}
        </div>
      </section>

      {/* ── Section 4: Alternative Routes — Tradeoff Comparison ── */}
      <section className="alternative-routes-section">
        <div className="alternative-routes-card">
          <h3 className="summary-title">Alternative Routes — Tradeoff Comparison</h3>
          <p className="mt-1 mb-4 text-sm text-gray-500">
            Direct replacement route options connecting the same source and destination as the disrupted route.
            Comparison metrics are computed deterministically from saved supply-chain data.
          </p>

          {alternatives.length === 0 ? (
            <div className="alternative-route-item p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="route-description text-gray-700 font-medium">No alternative routes available.</p>
              <p className="mt-1 text-sm text-gray-500">
                To evaluate alternative routes, add a secondary route between the same two nodes with transit days and cost set in the supply chain builder.
              </p>
            </div>
          ) : (
            <div className="alternative-routes-list">
              {alternatives.map((alt, index) => (
                <TradeoffCard
                  key={alt.routeId || index}
                  alt={alt}
                  disruptedRoute={disruptedRoute}
                  stockoutDays={result.stockoutDays}
                  index={index}
                />
              ))}
            </div>
          )}

          <p className="mt-6 text-xs text-gray-400">
            * Stockout avoided indicates whether the alternative route transit time restores supply before inventory runs out based on
            the configured transit time and disruption duration — not an AI prediction.
          </p>
        </div>
      </section>

      {/* ── Section 5: AI Analysis ── */}
      <AiAnalysisSection analysis={analysis} aiAvailable={aiAvailable} />

    </div>
  );
};

export default SimulationImpact;
