import { useNavigate, useParams } from 'react-router-dom';
import { TransportIcons } from './TransportIcons';
import { useEffect, useState } from 'react';
import { getSupplyChain, getSupplyChains, toVisualizationSupplyChain } from '../services/supplyChainService';
import './SupplyChainVisualization.css';

const resolveRouteBetweenNodes = (sourceNode, destinationNode, routes) => {
  if (!sourceNode || !destinationNode || !Array.isArray(routes)) return null;
  const sourceId = String(sourceNode._id || '');
  const destId = String(destinationNode._id || '');
  return (
    routes.find(
      (r) =>
        String(r.sourceNodeId || '') === sourceId &&
        String(r.destinationNodeId || '') === destId
    ) || null
  );
};

const renderTransportIcon = (transportMode) => {
  if (!transportMode) return null;
  const formatted = transportMode.charAt(0).toUpperCase() + transportMode.slice(1).toLowerCase();
  const IconComponent = TransportIcons[formatted];
  return IconComponent ? <IconComponent /> : null;
};

const SupplyChainVisualization = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [brokenLinks, setBrokenLinks] = useState([]);
  const [supplyChain, setSupplyChain] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [disruptionDurationDays, setDisruptionDurationDays] = useState(1);
  const [simulationError, setSimulationError] = useState('');

  useEffect(() => {
    if (!id) {
      const loadDefaultChain = async () => {
        try {
          const chains = await getSupplyChains();
          if (chains && chains.length > 0) {
            navigate(`/supply-chain-visualization/${chains[0]._id}`, { replace: true });
          } else {
            setLoadError('No saved supply chains found. Create a supply chain to visualize routes.');
          }
        } catch {
          setLoadError('Select or create a supply chain to view its route.');
        }
      };
      loadDefaultChain();
      return;
    }

    const loadSupplyChain = async () => {
      try {
        setLoadError('');
        const data = await getSupplyChain(id);
        setSupplyChain(data);
      } catch (error) {
        setLoadError(error.message || 'Unable to load supply chain.');
      }
    };

    loadSupplyChain();
  }, [id, navigate]);

  const toggleSimulationMode = () => {
    setIsSimulationMode(!isSimulationMode);
    if (isSimulationMode) {
      setBrokenLinks([]);
      setSimulationError('');
    }
  };

  const nodes = supplyChain?.nodes || [];
  const routes = supplyChain?.routes || [];
  const products = supplyChain?.products || [];
  const primaryProduct = products[0] || null;

  const toggleLinkBreak = (fromIndex, toIndex, route) => {
    if (!route || !route._id) {
      setSimulationError('The selected connection is not a saved route.');
      return;
    }

    const routeIdStr = String(route._id);
    const linkKey = `${fromIndex}-${toIndex}`;
    const isCurrentlyBroken = brokenLinks.some(
      (link) => link.key === linkKey || String(link.routeId) === routeIdStr
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
      // Route failure simulation evaluates exactly one broken route
      setBrokenLinks([newBrokenLink]);
      setSimulationError('');
    }
  };

  const isLinkBroken = (fromIndex, toIndex, route) => {
    const linkKey = `${fromIndex}-${toIndex}`;
    const routeIdStr = route?._id ? String(route._id) : null;
    return brokenLinks.some(
      (link) =>
        link.key === linkKey ||
        (routeIdStr && String(link.routeId) === routeIdStr)
    );
  };

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
    if (!Number.isFinite(duration) || duration < 0) {
      setSimulationError('Enter a non-negative disruption duration in days.');
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

  if (!supplyChain && !loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading supply chain...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{loadError}</h2>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
            >
              ← Dashboard
            </button>
            <button
              onClick={() => navigate('/create-supply-chain')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Supply Chain
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="supply-chain-container">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
            >
              ← Dashboard
            </button>
            <button
              onClick={() => navigate('/create-supply-chain')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Builder
            </button>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            Supply Chain Route Diagram
          </h1>
          <div className="flex gap-2">
            <button
              onClick={toggleSimulationMode}
              className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                isSimulationMode 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {isSimulationMode ? 'Exit Simulation' : 'Start Simulation'}
            </button>
            <button
              onClick={() => navigate('/create-supply-chain')}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Supply Chain
            </button>
          </div>
        </div>

        {/* Chain Overview Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-12 text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-500">Supply Chain</span>
              <h2 className="text-2xl font-bold text-gray-900">{supplyChain.name || 'Untitled Supply Chain'}</h2>
              {supplyChain.description && (
                <p className="text-gray-500 text-sm mt-1">{supplyChain.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 border-t md:border-t-0 md:border-l md:pl-6 pt-3 md:pt-0 border-gray-100">
              <div>
                <span className="block font-medium text-gray-400 text-xs">Primary Product</span>
                <span className="font-semibold text-gray-800">{primaryProduct?.name || 'N/A'}</span>
                {primaryProduct?.sku && <span className="text-xs text-gray-400 ml-1">({primaryProduct.sku})</span>}
              </div>
              <div>
                <span className="block font-medium text-gray-400 text-xs">Criticality</span>
                <span className="font-semibold text-gray-800">{primaryProduct?.criticality || 'N/A'}</span>
              </div>
              <div>
                <span className="block font-medium text-gray-400 text-xs">Daily Demand</span>
                <span className="font-semibold text-gray-800">
                  {primaryProduct?.dailyDemand !== undefined ? `${primaryProduct.dailyDemand} units/day` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="block font-medium text-gray-400 text-xs">Network Size</span>
                <span className="font-semibold text-gray-800">{nodes.length} nodes • {Math.max(0, nodes.length - 1)} segments</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Route Diagram Container */}
      <div className={`route-diagram-container ${isSimulationMode ? 'simulation-active' : ''}`}>
        {isSimulationMode && (
          <div className="simulation-banner">
            <div className="simulation-banner-content">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Simulation Mode Active — Click a transport route to break or restore it</span>
            </div>
          </div>
        )}

        {nodes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No nodes found in this supply chain network.
          </div>
        ) : (
          <div className="route-timeline">
            {nodes.map((node, index) => {
              const nextNode = nodes[index + 1];
              const route = nextNode ? resolveRouteBetweenNodes(node, nextNode, routes) : null;
              const broken = route && isLinkBroken(index, index + 1, route);
              const hasRoute = Boolean(route);

              return (
                <div key={node._id || index} className="route-node-container">
                  {/* Checkpoint / Node */}
                  <div className="route-node" style={{ '--index': index }}>
                    <div className="node-number">{index + 1}</div>
                    <div className="node-content">
                      <h3 className="node-location">{node.location || node.name || `Node ${index + 1}`}</h3>
                      <div className="node-metadata">
                        {node.name && node.location && node.name !== node.location && (
                          <p className="node-name-text">{node.name}</p>
                        )}
                        <div className="node-badges">
                          {node.type && <span className="node-type-badge">{node.type}</span>}
                          {node.capacity !== undefined && node.capacity !== null && (
                            <span className="node-cap-badge">Cap: {node.capacity.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inter-Node Connection and Route Transport */}
                  {index < nodes.length - 1 && (
                    <div className="route-connection">
                      <div className={`connection-line ${broken ? 'broken' : ''}`}></div>
                      <div className="transport-container">
                        {hasRoute ? (
                          <div className={`transport-indicator ${broken ? 'broken' : ''}`}>
                            <div className="transport-icon">
                              {renderTransportIcon(route.transportMode) || (
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              )}
                            </div>
                            <span className="transport-label">
                              <span>{route.transportMode}</span>
                              {(route.transitDays !== undefined || route.cost !== undefined) && (
                                <span className="route-metrics-badge">
                                  {route.transitDays !== undefined ? `${route.transitDays}d` : ''}
                                  {route.transitDays !== undefined && route.cost !== undefined ? ' • ' : ''}
                                  {route.cost !== undefined ? `$${route.cost.toLocaleString()}` : ''}
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="transport-indicator unconfigured">
                            <div className="transport-icon">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <span className="transport-label">Unlinked</span>
                          </div>
                        )}

                        {isSimulationMode && hasRoute && (
                          <button
                            onClick={() => toggleLinkBreak(index, index + 1, route)}
                            className={`break-link-btn ${broken ? 'broken' : ''}`}
                            title={broken ? 'Restore Route' : 'Break Route'}
                          >
                            {broken ? (
                              <div className="break-btn-content">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="break-btn-text">Restore</span>
                              </div>
                            ) : (
                              <div className="break-btn-content">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="break-btn-text">Break</span>
                              </div>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Section */}
      <div className="summary-section">
        <div className="summary-card">
          <h3 className="summary-title">Route Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Starting Point:</span>
              <span className="summary-value">{nodes[0]?.location || nodes[0]?.name || 'N/A'}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">End Point:</span>
              <span className="summary-value">{nodes[nodes.length - 1]?.location || nodes[nodes.length - 1]?.name || 'N/A'}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Segments:</span>
              <span className="summary-value">{Math.max(0, nodes.length - 1)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Transport Modes:</span>
              <span className="summary-value">
                {routes.length > 0
                  ? [...new Set(routes.map((r) => r.transportMode).filter(Boolean))].join(', ')
                  : 'None'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Transit Days:</span>
              <span className="summary-value">
                {routes.reduce((sum, r) => sum + (Number(r.transitDays) || 0), 0)} days
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Transport Cost:</span>
              <span className="summary-value">
                ${routes.reduce((sum, r) => sum + (Number(r.cost) || 0), 0).toLocaleString()}
              </span>
            </div>
            {isSimulationMode && (
              <div className="summary-item">
                <span className="summary-label">Broken Route:</span>
                <span className="summary-value text-red-600">
                  {brokenLinks.length === 1 ? `${brokenLinks[0].from} ➔ ${brokenLinks[0].to}` : 'None selected'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulation Submit Section */}
      {isSimulationMode && (
        <div className="simulation-submit-section">
          <div className="simulation-info">
            <p className="simulation-text">
              Select one route connection to simulate a disruption, specify the duration, and analyze downstream impact.
            </p>
            <p className="simulation-status">
              Selected Broken Route: <span className="text-red-600 font-bold">{brokenLinks.length === 1 ? `${brokenLinks[0].from} ➔ ${brokenLinks[0].to} (${brokenLinks[0].transport})` : 'None'}</span>
            </p>
            <label className="block mt-3 text-sm font-medium text-gray-700">
              Disruption duration (days)
              <input
                type="number"
                min="0"
                step="1"
                value={disruptionDurationDays}
                onChange={(event) => setDisruptionDurationDays(event.target.value)}
                className="ml-3 w-24 rounded border border-gray-300 px-2 py-1"
              />
            </label>
            {simulationError && <p className="mt-2 text-red-600" role="alert">{simulationError}</p>}
          </div>
          <button
            onClick={handleSimulationSubmit}
            className="simulation-submit-btn"
            disabled={brokenLinks.length === 0}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Analyze Impact
          </button>
        </div>
      )}
    </div>
  );
};

export default SupplyChainVisualization;

