import React from 'react';
import RiskAnalysis from './RiskAnalysis';

const RiskAnalysisPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Supply Chain Risk Analysis
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Input your supply chain data in JSON format to analyze risks, view checkpoints, and get recommendations for your supply chain operations.
          </p>
        </div>
        
        <RiskAnalysis />
        
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Example JSON Format</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`{
  "checkpoints": [
    {
      "location": "Mining Site",
      "risk_level": "High",
      "description": "Diamond extraction point with security concerns"
    },
    {
      "location": "Processing Facility", 
      "risk_level": "Medium",
      "description": "Diamond cutting and polishing facility"
    }
  ],
  "overall_risk": "15%",
  "recommendations": "Use secure transportation and insurance for the shipment. Implement additional security measures at the final destination and value of the diamonds."
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskAnalysisPage;
