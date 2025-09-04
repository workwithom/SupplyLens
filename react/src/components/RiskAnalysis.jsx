import React, { useState } from 'react';

const RiskAnalysis = ({ data }) => {
  const [inputJson, setInputJson] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');

  const handleJsonInput = () => {
    try {
      const parsed = JSON.parse(inputJson);
      setParsedData(parsed);
      setError('');
    } catch (err) {
      setError('Invalid JSON format. Please check your input.');
      setParsedData(null);
    }
  };

  const renderCheckpoints = (checkpoints) => {
    if (!checkpoints || !Array.isArray(checkpoints)) {
      return <p className="text-gray-500">No checkpoints available</p>;
    }

    return (
      <div className="space-y-4">
        {checkpoints.map((checkpoint, index) => (
          <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                {index + 1}
              </div>
              <h4 className="text-lg font-semibold text-gray-800">
                Checkpoint {index + 1}
              </h4>
            </div>
            <div className="ml-9">
              {typeof checkpoint === 'object' ? (
                <div className="space-y-2">
                  {Object.entries(checkpoint).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="font-medium text-gray-700 min-w-[120px] capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span className="text-gray-600 ml-2">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">{String(checkpoint)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Risk Analysis Input</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="jsonInput" className="block text-sm font-medium text-gray-700 mb-2">
              Enter JSON Data
            </label>
            <textarea
              id="jsonInput"
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              placeholder='{"checkpoints": [...], "overall_risk": "15%", "recommendations": "..."}'
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          <button
            onClick={handleJsonInput}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
          >
            Analyze Data
          </button>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>

      {parsedData && (
        <div className="space-y-6">
          {/* Overall Risk Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                ⚠️
              </div>
              Overall Risk Assessment
            </h3>
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-800">Risk Level:</span>
                <span className="text-2xl font-bold text-red-600">
                  {parsedData.overall_risk || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Checkpoints Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                📍
              </div>
              Supply Chain Checkpoints
            </h3>
            {renderCheckpoints(parsedData.checkpoints)}
          </div>

          {/* Recommendations Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                💡
              </div>
              Recommendations
            </h3>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">
                {parsedData.recommendations || 'No recommendations available'}
              </p>
            </div>
          </div>

          {/* Raw JSON Display */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                📄
              </div>
              Raw JSON Data
            </h3>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskAnalysis;
