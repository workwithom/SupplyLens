import { useLocation, useNavigate } from 'react-router-dom';
import { TransportIcons } from './TransportIcons';
import { useEffect, useState } from 'react';
import './SupplyChainVisualization.css';

const SupplyChainVisualization = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [brokenLinks, setBrokenLinks] = useState([]);
  const supplyChainData = location.state?.supplyChainData;

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const toggleSimulationMode = () => {
    console.log('Toggling simulation mode from:', isSimulationMode, 'to:', !isSimulationMode);
    setIsSimulationMode(!isSimulationMode);
    if (isSimulationMode) {
      setBrokenLinks([]);
    }
  };

  const toggleLinkBreak = (fromIndex, toIndex) => {
    console.log('Toggling link break for:', fromIndex, 'to:', toIndex);
    console.log('Current broken links:', brokenLinks);
    
    const linkKey = `${fromIndex}-${toIndex}`;
    const existingIndex = brokenLinks.findIndex(link => link.key === linkKey);
    
    if (existingIndex >= 0) {
      // Remove from broken links
      console.log('Removing link from broken links');
      setBrokenLinks(brokenLinks.filter((_, index) => index !== existingIndex));
    } else {
      // Add to broken links
      console.log('Adding link to broken links');
      const newBrokenLink = {
        key: linkKey,
        from: supplyChainData.checkpoints[fromIndex].location,
        to: supplyChainData.checkpoints[toIndex].location,
        transport: supplyChainData.checkpoints[fromIndex].transport_mode,
        fromIndex,
        toIndex
      };
      setBrokenLinks([...brokenLinks, newBrokenLink]);
    }
  };

  const isLinkBroken = (fromIndex, toIndex) => {
    const linkKey = `${fromIndex}-${toIndex}`;
    return brokenLinks.some(link => link.key === linkKey);
  };

  const handleSimulationSubmit = () => {
    navigate('/simulation-impact', {
      state: {
        supplyChainData: supplyChainData,
        brokenLinks: brokenLinks
      }
    });
  };

  if (!supplyChainData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No supply chain data found</h2>
          <button
            onClick={() => navigate('/create-supply-chain')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="supply-chain-container">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/create-supply-chain')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Builder
          </button>
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
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
