import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getdata } from './data';
import Chatbot from './Chatbot';
import { TransportIcons } from './TransportIcons';
import './SupplyChainBuilder.css';

const SupplyChainBuilder = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const [productName, setProductName] = useState('');
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [checkpoints, setCheckpoints] = useState([
    {
      id: 1,
      location: '',
      product_state: '',
      transport_mode: ''
    }
  ]);

  const addCheckpoint = () => {
    const newCheckpoint = {
      id: Date.now(),
      location: '',
      product_state: '',
      transport_mode: ''
    };
    setCheckpoints([...checkpoints, newCheckpoint]);
  };

  const removeCheckpoint = (id) => {
    if (checkpoints.length > 1) {
      setCheckpoints(checkpoints.filter(checkpoint => checkpoint.id !== id));
    }
  };

  const updateCheckpoint = (id, field, value) => {
    setCheckpoints(checkpoints.map(checkpoint =>
      checkpoint.id === id ? { ...checkpoint, [field]: value } : checkpoint
    ));
  };

  function parseAIResponse(rawResponse) {
    if (!rawResponse) return null;

    // Remove variable assignment like "jsonData =" or "const data =" at the start
    let cleaned = rawResponse.replace(/^\s*(const|let|var)?\s*\w+\s*=\s*/, '');

    // Remove triple backticks ``` or ```json
    cleaned = cleaned.replace(/^```json\s*/, '')
      .replace(/^```/, '')
      .replace(/```$/, '');

    // Trim whitespace
    cleaned = cleaned.trim();

    // Extract JSON part (from first { to last })
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) return null;

    cleaned = cleaned.slice(firstBrace, lastBrace + 1);

    // Parse into JavaScript object
    try {
      return JSON.parse(cleaned);
    } catch (err) {
      console.error("Failed to parse JSON:", err);
      return null;
    }
  }

  const handleSubmit = async () => {
    if (!productName.trim()) {
      alert('Please enter a product name');
      return;
    }

    if (checkpoints.some(cp => !cp.location.trim() || !cp.product_state.trim())) {
      alert('Please fill in all required fields');
      return;
    }

    const supplyChainData = {
      product: productName,
      checkpoints: checkpoints.map((cp, index) => {
        const checkpointData = {
          location: cp.location,
          product_state: cp.product_state,
        };
        if (index > 0) {
          checkpointData.transport_mode = cp.transport_mode;
        }
        return checkpointData;
      })
    };

    try {
      let t = await getdata(supplyChainData);
      let final = parseAIResponse(t);
      console.log(final);

      // Navigate to visualization page with the supply chain data
      navigate('/supply-chain-visualization', {
        state: { supplyChainData: supplyChainData }
      });
    } catch (error) {
      console.error('Error creating supply chain:', error);
      alert('Error creating supply chain. Please try again.');
    }
  };

  const transportModes = ['Air', 'Sea', 'Road', 'Rail', 'Pipeline'];

  const currentSupplyChainData = {
    product: productName,
    checkpoints: checkpoints.map((cp, index) => {
      const checkpointData = {
        location: cp.location,
        product_state: cp.product_state,
      };
      if (index > 0) {
        checkpointData.transport_mode = cp.transport_mode;
      }
      return checkpointData;
    })
  };

  const CheckpointBox = ({ checkpoint, index, total }) => (
    <div className="checkpoint-box bg-white rounded-xl shadow-lg p-6 relative z-10 border-l-4 border-orange-500"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-900">Checkpoint {index + 1}</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            value={checkpoint.location}
            onChange={(e) => updateCheckpoint(checkpoint.id, 'location', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-colors"
            placeholder="Enter location"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Product State</label>
          <input
            type="text"
            value={checkpoint.product_state}
            onChange={(e) => updateCheckpoint(checkpoint.id, 'product_state', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-colors"
            placeholder="Enter product state"
          />
        </div>
        {index < total - 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Transport Mode</label>
            <select
              value={checkpoint.transport_mode}
              onChange={(e) => updateCheckpoint(checkpoint.id, 'transport_mode', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-colors"
            >
              <option value="">Select transport mode</option>
              {transportModes.map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );

  const TransportConnection = ({ mode, index }) => {
    const TransportIcon = TransportIcons[mode];
    return (
      <div className="transport-connection flex items-center justify-center py-4">
        <div className="transport-line">
          <div className="transport-icon">
            {TransportIcon && <TransportIcon />}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center text-gray-600 hover:text-orange-500 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </button>

            <button
              onClick={() => setIsChatbotOpen(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              AI Assistant
            </button>
          </div>

          {/* Hero Section */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-2xl p-8 text-white mb-8">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-3">Create Your Supply Chain</h1>
            <p className="text-orange-100 text-lg">Build a customized supply chain with interactive checkpoints and AI-powered insights</p>
          </div>
        </div>

        {/* Product Name Input */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border-l-4 border-blue-500">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <label className="block text-xl font-semibold text-gray-900">
              Product Name *
            </label>
          </div>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g., Diamonds, Electronics, Food Products..."
            className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-lg"
          />
        </div>

        {/* Checkpoints */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Supply Chain Checkpoints</h2>
            </div>
            <button
              onClick={addCheckpoint}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Checkpoint
            </button>
          </div>

          {checkpoints.map((checkpoint, index) => (
            <div key={checkpoint.id} className="border border-gray-200 rounded-xl p-6 mb-6 bg-gradient-to-r from-gray-50 to-white hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-sm">{index + 1}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Checkpoint {index + 1}
                  </h3>
                </div>
                {checkpoints.length > 1 && (
                  <button
                    onClick={() => removeCheckpoint(checkpoint.id)}
                    className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              <div className={`grid ${index === 0 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={checkpoint.location}
                    onChange={(e) => updateCheckpoint(checkpoint.id, 'location', e.target.value)}
                    placeholder="e.g., Surat, India"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Product State *
                  </label>
                  <input
                    type="text"
                    value={checkpoint.product_state}
                    onChange={(e) => updateCheckpoint(checkpoint.id, 'product_state', e.target.value)}
                    placeholder="e.g., Raw Diamond"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>

                {index < checkpoints.length - 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Transport Mode to Next Checkpoint
                    </label>
                    <select
                      value={checkpoint.transport_mode}
                      onChange={(e) => updateCheckpoint(checkpoint.id, 'transport_mode', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select Transport Mode</option>
                      {transportModes.map(mode => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Visual Connection Line */}
              {index < checkpoints.length - 1 && (
                <div className="mt-6">
                  {checkpoint.transport_mode ? (
                    <div className="transport-connection">
                      <div className="transport-line">
                        <div className="transport-icon">
                          {(() => {
                            const TransportIcon = TransportIcons[checkpoint.transport_mode];
                            return TransportIcon ? <TransportIcon /> : null;
                          })()}
                        </div>
                      </div>
                      <div className="text-center text-sm text-gray-600 mt-3 font-medium">
                        {checkpoint.transport_mode}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <div className="w-0.5 h-12 bg-gradient-to-b from-gray-300 to-gray-400 relative">
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-400 rounded-full"></div>
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-400 rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            onClick={handleSubmit}
            className="px-12 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xl font-semibold rounded-full hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 shadow-lg"
          >
            <span className="flex items-center justify-center">
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Create Supply Chain
            </span>
          </button>
        </div>
      </div>

      {/* Chatbot */}
      <Chatbot
        supplyChainData={currentSupplyChainData}
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
      />

      {/* Floating Chat Button */}
      {!isChatbotOpen && (
        <button
          onClick={() => setIsChatbotOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 z-40 flex items-center justify-center transform hover:scale-110"
          title="Open AI Assistant"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default SupplyChainBuilder;
