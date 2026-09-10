import { useNavigate, useParams } from 'react-router-dom';
import { TransportIcons } from './TransportIcons';
import { useEffect, useState } from 'react';
import { getSupplyChain, getSupplyChains, toVisualizationSupplyChain } from '../services/supplyChainService';
import './SupplyChainVisualization.css';

const SupplyChainVisualization = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [brokenLinks, setBrokenLinks] = useState([]);
  const [supplyChainData, setSupplyChainData] = useState(null);
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
        const supplyChain = await getSupplyChain(id);
        setSupplyChainData(toVisualizationSupplyChain(supplyChain));
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
    }
  };

  const toggleLinkBreak = (fromIndex, toIndex) => {
    const linkKey = `${fromIndex}-${toIndex}`;
    const existingIndex = brokenLinks.findIndex((link) => link.key === linkKey);

    if (existingIndex >= 0) {
      setBrokenLinks(brokenLinks.filter((_, index) => index !== existingIndex));
    } else {
      const newBrokenLink = {
        key: linkKey,
        routeId: supplyChainData.checkpoints[fromIndex].routeId,
        from: supplyChainData.checkpoints[fromIndex].location,
        to: supplyChainData.checkpoints[toIndex].location,
        transport: supplyChainData.checkpoints[fromIndex].transport_mode,
        fromIndex,
        toIndex,
      };
      setBrokenLinks([...brokenLinks, newBrokenLink]);
    }
  };

  const isLinkBroken = (fromIndex, toIndex) => {
    const linkKey = `${fromIndex}-${toIndex}`;
    return brokenLinks.some((link) => link.key === linkKey);
  };

  const handleSimulationSubmit = () => {
    if (brokenLinks.length !== 1) {
      setSimulationError('Select exactly one route for this route-failure simulation.');
      return;
    }

    if (!brokenLinks[0].routeId) {
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
      routeId: brokenLinks[0].routeId,
      disruptionDurationDays: duration,
      supplyChainData,
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

  if (!supplyChainData && !loadError) {
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
        <div className="bg-white rounded-xl shadow-lg p-6 mb-12">
          <h2 className="text-2xl font-bold text-blue-600">Product: {supplyChainData.product}</h2>
          <p className="text-gray-600 mt-2">Total Checkpoints: {supplyChainData.checkpoints.length}</p>
          <p className="text-gray-600">Route Distance: {supplyChainData.checkpoints.length - 1} segments</p>
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
              <span>Simulation Mode Active - Click on transport icons to break/restore links</span>
            </div>
          </div>
        )}
        <div className="route-timeline">
          {supplyChainData.checkpoints.map((checkpoint, index) => (
            <div key={index} className="route-node-container">
              {/* Checkpoint Node */}
              <div className="route-node" style={{ '--index': index }}>
                <div className="node-number">{index + 1}</div>
                <div className="node-content">
                  <h3 className="node-location">{checkpoint.location}</h3>
                  <p className="node-state">{checkpoint.product_state}</p>
                </div>
              </div>

              {/* Connection Line and Transport */}
              {index < supplyChainData.checkpoints.length - 1 && (
                <div className="route-connection">
                  <div className={`connection-line ${isLinkBroken(index, index + 1) ? 'broken' : ''}`}></div>
                  <div className="transport-container">
                    {checkpoint.transport_mode ? (
                      <div className={`transport-indicator ${isLinkBroken(index, index + 1) ? 'broken' : ''}`}>
                        <div className="transport-icon">
                          {(() => {
                            const TransportIcon = TransportIcons[checkpoint.transport_mode];
                            return TransportIcon ? <TransportIcon /> : null;
                          })()}
                        </div>
                        <span className="transport-label">{checkpoint.transport_mode}</span>
                      </div>
                    ) : (
                      <div className={`transport-indicator ${isLinkBroken(index, index + 1) ? 'broken' : ''}`}>
                        <div className="transport-icon">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                        <span className="transport-label">Connection</span>
                      </div>
                    )}
                    {isSimulationMode && (
                      <button
                        onClick={() => toggleLinkBreak(index, index + 1)}
                        className={`break-link-btn ${isLinkBroken(index, index + 1) ? 'broken' : ''}`}
                        title={isLinkBroken(index, index + 1) ? 'Restore Link' : 'Break Link'}
                      >
                        {isLinkBroken(index, index + 1) ? (
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
          ))}
        </div>
      </div>

      {/* Summary Section */}
      <div className="summary-section">
        <div className="summary-card">
          <h3 className="summary-title">Route Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Starting Point:</span>
              <span className="summary-value">{supplyChainData.checkpoints[0]?.location}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">End Point:</span>
              <span className="summary-value">{supplyChainData.checkpoints[supplyChainData.checkpoints.length - 1]?.location}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Segments:</span>
              <span className="summary-value">{supplyChainData.checkpoints.length - 1}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Transport Modes:</span>
              <span className="summary-value">
                {[...new Set(supplyChainData.checkpoints.map(cp => cp.transport_mode).filter(Boolean))].join(', ')}
              </span>
            </div>
            {isSimulationMode && (
              <div className="summary-item">
                <span className="summary-label">Broken Links:</span>
                <span className="summary-value text-red-600">{brokenLinks.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulation Submit Button */}
      {isSimulationMode && (
        <div className="simulation-submit-section">
          <div className="simulation-info">
            <p className="simulation-text">
              Click on transport icons to break/restore links, then submit to see the impact analysis.
            </p>
            <p className="simulation-status">
              Broken Links: <span className="text-red-600 font-bold">{brokenLinks.length}</span>
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
