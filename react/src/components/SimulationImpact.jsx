import { useLocation, useNavigate } from 'react-router-dom';
import { TransportIcons } from './TransportIcons';
import { useEffect, useState } from 'react';
import { analyzeSupplyChainImpact } from '../services/groqService';
import './SimulationImpact.css';

const SimulationImpact = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState(null);
  const { supplyChainData, brokenLinks } = location.state || {};

  useEffect(() => {
    setIsVisible(true);

    const performAnalysis = async () => {
      if (supplyChainData && brokenLinks) {
        try {
          setIsLoading(true);
          const analysis = await analyzeSupplyChainImpact(supplyChainData, brokenLinks);
          setAnalysisData(analysis);
        } catch (error) {
          console.error('Error performing analysis:', error);
          // Use fallback analysis
          const fallbackAnalysis = {
            impactAssessment: {
              severity: "Medium",
              overallImpact: "Supply chain disruption detected",
              immediateEffects: ["Production delays", "Inventory shortages"],
              longTermEffects: ["Customer dissatisfaction", "Revenue loss"],
              financialImpact: "Significant financial impact expected",
              operationalImpact: "Operational efficiency compromised"
            },
            problems: [
              {
                category: "Transportation",
                description: "Transportation links broken",
                severity: "High"
              }
            ],
            recommendations: [
              {
                type: "Immediate",
                action: "Activate backup suppliers",
                priority: "High",
                expectedOutcome: "Minimize disruption"
              }
            ],
            alternativeRoutes: [],
            riskMitigation: []
          };
          setAnalysisData(fallbackAnalysis);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    performAnalysis();
  }, [supplyChainData, brokenLinks]);

  if (!supplyChainData || !brokenLinks) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No simulation data found</h2>
          <button
            onClick={() => navigate('/supply-chain-visualization')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Calculate impact based on broken links
  const calculateImpact = () => {
    const totalSegments = supplyChainData.checkpoints.length - 1;
    const brokenSegments = brokenLinks.length;
    const impactPercentage = (brokenSegments / totalSegments) * 100;

    let severity = 'Low';
    if (impactPercentage > 50) severity = 'High';
    else if (impactPercentage > 25) severity = 'Medium';

    return {
      totalSegments,
      brokenSegments,
      impactPercentage: Math.round(impactPercentage),
      severity,
      isChainBroken: brokenSegments >= totalSegments
    };
  };

  const impact = calculateImpact();

  // Use Groq analysis data if available, otherwise use calculated impact
  const finalSeverity = analysisData?.impactAssessment?.severity || impact.severity;

  const getImpactColor = (severity) => {
    switch (severity) {
      case 'High': return 'text-red-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getImpactBgColor = (severity) => {
    switch (severity) {
      case 'High': return 'bg-red-100 border-red-300';
      case 'Medium': return 'bg-yellow-100 border-yellow-300';
      case 'Low': return 'bg-green-100 border-green-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const exportReport = (format) => {
    let content, filename, mimeType;

    switch (format) {
      case 'pdf':
        // Create a print-friendly version and use browser print
        const printWindow = window.open('', '_blank');
        const printContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Supply Chain Impact Analysis Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
              .title { color: #f97316; font-size: 24px; margin-bottom: 10px; }
              .timestamp { color: #6b7280; font-size: 14px; }
              .section { margin-bottom: 25px; }
              .section-title { color: #374151; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #f97316; padding-left: 15px; }
              .metric { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
              .metric-title { font-weight: bold; color: #374151; margin-bottom: 5px; }
              .broken-link { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
              .broken-link-title { color: #dc2626; font-weight: bold; margin-bottom: 5px; }
              .ai-analysis { background: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; }
              .impact-level { display: inline-block; background: #f97316; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
              .recommendation { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
              .recommendation-title { color: #16a34a; font-weight: bold; margin-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #d1d5db; padding: 12px; text-align: left; }
              th { background: #f9fafb; font-weight: bold; }
              @media print { body { margin: 0; } .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Supply Chain Impact Analysis Report</div>
              <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
            </div>

            <div class="section">
              <div class="section-title">Supply Chain Overview</div>
              <div class="metric">
                <div class="metric-title">Product</div>
                <div>${supplyChainData.product}</div>
              </div>
              <div class="metric">
                <div class="metric-title">Total Checkpoints</div>
                <div>${supplyChainData.checkpoints.length}</div>
              </div>
              <div class="metric">
                <div class="metric-title">Total Links</div>
                <div>${supplyChainData.links.length}</div>
              </div>
            </div>

            ${brokenLinks.length > 0 ? `
              <div class="section">
                <div class="section-title">Broken Links Analysis</div>
                <table>
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th>Transport</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${brokenLinks.map(link => `
                      <tr>
                        <td>${link.from}</td>
                        <td>${link.to}</td>
                        <td>${link.transport}</td>
                        <td style="color: #dc2626; font-weight: bold;">BROKEN</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            ${analysisData?.impactAssessment?.overallImpact ? `
              <div class="section">
                <div class="section-title">AI Analysis Summary</div>
                <div class="ai-analysis">
                  <div style="margin-bottom: 15px;">
                    <strong>Summary:</strong><br>
                    ${analysisData.impactAssessment.overallImpact}
                  </div>
                  <div style="margin-bottom: 15px;">
                    <strong>Impact Level:</strong>
                    <span class="impact-level">${finalSeverity}</span>
                  </div>
                  ${analysisData.recommendations && analysisData.recommendations.length > 0 ? `
                    <div style="margin-bottom: 15px;">
                      <strong>Recommendations:</strong>
                    </div>
                    ${analysisData.recommendations.map((rec, index) => `
                      <div class="recommendation">
                        <div class="recommendation-title">Recommendation ${index + 1}</div>
                        <div>${rec.action}</div>
                      </div>
                    `).join('')}
                  ` : ''}
                </div>
              </div>
            ` : ''}

            <div class="no-print" style="text-align: center; margin-top: 40px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
              <p>Click the print button or press Ctrl+P to save as PDF</p>
              <button onclick="window.print()" style="background: #f97316; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 10px;">
                Print / Save as PDF
              </button>
            </div>
          </body>
          </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        return;

      case 'csv':
        // Create CSV content
        let csvContent = 'Product,Checkpoint,Status,Transport,Impact\n';

        // Add supply chain data
        supplyChainData.checkpoints.forEach(checkpoint => {
          csvContent += `${supplyChainData.product},${checkpoint.name},Active,,\n`;
        });

        // Add broken links
        brokenLinks.forEach(link => {
          csvContent += `${supplyChainData.product},${link.from} → ${link.to},Broken,${link.transport},High\n`;
        });

        // Add AI analysis if available
        if (analysisData?.impactAssessment?.overallImpact) {
          csvContent += `${supplyChainData.product},AI Analysis,${finalSeverity},,${finalSeverity}\n`;
        }

        // Create and download CSV
        const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const csvLink = document.createElement('a');
        const csvUrl = URL.createObjectURL(csvBlob);
        csvLink.setAttribute('href', csvUrl);
        csvLink.setAttribute('download', 'supply-chain-impact-analysis.csv');
        csvLink.style.visibility = 'hidden';
        document.body.appendChild(csvLink);
        csvLink.click();
        document.body.removeChild(csvLink);
        return;

      case 'html':
      default:
        // Enhanced HTML export
        let reportContent = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Supply Chain Impact Analysis Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
              .title { color: #f97316; font-size: 28px; margin-bottom: 10px; }
              .timestamp { color: #6b7280; font-size: 14px; }
              .section { margin-bottom: 30px; }
              .section-title { color: #374151; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #f97316; padding-left: 15px; }
              .metric { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
              .metric-title { font-weight: bold; color: #374151; margin-bottom: 5px; }
              .broken-link { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
              .broken-link-title { color: #dc2626; font-weight: bold; margin-bottom: 5px; }
              .ai-analysis { background: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; }
              .impact-level { display: inline-block; background: #f97316; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
              .recommendation { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
              .recommendation-title { color: #16a34a; font-weight: bold; margin-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #d1d5db; padding: 12px; text-align: left; }
              th { background: #f9fafb; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Supply Chain Impact Analysis Report</div>
              <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
            </div>
        `;

        // Add supply chain overview
        reportContent += `
          <div class="section">
            <div class="section-title">Supply Chain Overview</div>
            <div class="metric">
              <div class="metric-title">Product</div>
              <div>${supplyChainData.product}</div>
            </div>
            <div class="metric">
              <div class="metric-title">Total Checkpoints</div>
              <div>${supplyChainData.checkpoints.length}</div>
            </div>
            <div class="metric">
              <div class="metric-title">Total Links</div>
              <div>${supplyChainData.links.length}</div>
            </div>
          </div>
        `;

        // Add broken links analysis
        if (brokenLinks.length > 0) {
          reportContent += `
            <div class="section">
              <div class="section-title">Broken Links Analysis</div>
              <table>
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Transport</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
          `;

          brokenLinks.forEach(link => {
            reportContent += `
              <tr>
                <td>${link.from}</td>
                <td>${link.to}</td>
                <td>${link.transport}</td>
                <td style="color: #dc2626; font-weight: bold;">BROKEN</td>
              </tr>
            `;
          });

          reportContent += `
                </tbody>
              </table>
            </div>
          `;
        }

        // Add AI analysis if available
        if (analysisData?.impactAssessment?.overallImpact) {
          reportContent += `
            <div class="section">
              <div class="section-title">AI Analysis Summary</div>
              <div class="ai-analysis">
                <div style="margin-bottom: 15px;">
                  <strong>Summary:</strong><br>
                  ${analysisData.impactAssessment.overallImpact}
                </div>
                <div style="margin-bottom: 15px;">
                  <strong>Impact Level:</strong>
                  <span class="impact-level">${finalSeverity}</span>
                </div>
          `;

          if (analysisData.recommendations && analysisData.recommendations.length > 0) {
            reportContent += `
              <div style="margin-bottom: 15px;">
                <strong>Recommendations:</strong>
              </div>
            `;

            analysisData.recommendations.forEach((rec, index) => {
              reportContent += `
                <div class="recommendation">
                  <div class="recommendation-title">Recommendation ${index + 1}</div>
                  <div>${rec.action}</div>
                </div>
              `;
            });
          }

          reportContent += `
              </div>
            </div>
          `;
        }

        // Close HTML
        reportContent += `
          </body>
          </html>
        `;

        // Create and download HTML file
        const blob = new Blob([reportContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'supply-chain-impact-analysis.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="simulation-impact-container">
        <div className="text-center">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Analyzing Supply Chain Impact...</h2>
            <p className="text-gray-600">Using AI to generate detailed analysis and recommendations</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="simulation-impact-container">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/supply-chain-visualization')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Visualization
          </button>
          <h1 className="text-4xl font-bold text-gray-900">
            Simulation Impact Analysis
          </h1>
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

        <div className="bg-white rounded-xl shadow-lg p-6 mb-12">
          <h2 className="text-2xl font-bold text-blue-600">Product: {supplyChainData.product}</h2>
          <p className="text-gray-600 mt-2">Simulation Results</p>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="impact-summary-section">
        <div className={`impact-summary-card ${getImpactBgColor(finalSeverity)}`}>
          <h3 className="text-2xl font-bold mb-4">AI-Powered Impact Assessment</h3>
          <div className="impact-metrics">
            <div className="impact-metric">
              <span className="metric-label">Total Segments:</span>
              <span className="metric-value">{impact.totalSegments}</span>
            </div>
            <div className="impact-metric">
              <span className="metric-label">Broken Segments:</span>
              <span className="metric-value text-red-600">{impact.brokenSegments}</span>
            </div>
            <div className="impact-metric">
              <span className="metric-label">AI Impact Level:</span>
              <span className={`metric-value ${getImpactColor(finalSeverity)}`}>
                {finalSeverity}
              </span>
            </div>
            <div className="impact-metric">
              <span className="metric-label">Chain Status:</span>
              <span className={`metric-value ${impact.isChainBroken ? 'text-red-600' : 'text-green-600'}`}>
                {impact.isChainBroken ? 'BROKEN' : 'OPERATIONAL'}
              </span>
            </div>
          </div>
          {analysisData?.impactAssessment?.overallImpact && (
            <div className="ai-overall-impact">
              <h4 className="text-lg font-semibold mb-2">AI Analysis Summary:</h4>
              <p className="text-gray-700">{analysisData.impactAssessment.overallImpact}</p>
            </div>
          )}
        </div>
      </div>

      {/* Broken Links Details */}
      <div className="broken-links-section">
        <div className="broken-links-card">
          <h3 className="text-xl font-bold mb-4">Broken Links Details</h3>
          <div className="broken-links-list">
            {brokenLinks.map((link, index) => (
              <div key={index} className="broken-link-item">
                <div className="broken-link-info">
                  <span className="link-from">{link.from}</span>
                  <div className="link-arrow">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                  <span className="link-to">{link.to}</span>
                </div>
                <div className="link-transport">
                  <span className="transport-label">{link.transport}</span>
                  <svg className="transport-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI-Generated Problems */}
      {analysisData?.problems && analysisData.problems.length > 0 && (
        <div className="problems-section">
          <div className="problems-card">
            <h3 className="text-xl font-bold mb-4">AI Agent-Identified Problems</h3>
            <div className="problems-list">
              {analysisData.problems.map((problem, index) => (
                <div key={index} className={`problem-item ${problem.severity.toLowerCase()}-priority`}>
                  <div className="problem-header">
                    <span className="problem-category">{problem.category}</span>
                    <span className={`problem-severity ${problem.severity.toLowerCase()}`}>
                      {problem.severity}
                    </span>
                  </div>
                  <p className="problem-description">{problem.description}</p>
                  {problem.rootCause && (
                    <p className="problem-root-cause"><strong>Root Cause:</strong> {problem.rootCause}</p>
                  )}
                  {problem.affectedAreas && problem.affectedAreas.length > 0 && (
                    <div className="problem-affected-areas">
                      <strong>Affected Areas:</strong>
                      <div className="affected-areas-tags">
                        {problem.affectedAreas.map((area, areaIndex) => (
                          <span key={areaIndex} className="affected-area-tag">{area}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI-Generated Recommendations */}
      {analysisData?.recommendations && analysisData.recommendations.length > 0 && (
        <div className="recommendations-section">
          <div className="recommendations-card">
            <h3 className="text-xl font-bold mb-4">AI-Agent's Recommendations</h3>
            <div className="recommendations-list">
              {analysisData.recommendations.map((rec, index) => (
                <div key={index} className={`recommendation-item ${rec.priority.toLowerCase()}-priority`}>
                  <div className="recommendation-header">
                    <span className="recommendation-type">{rec.type}</span>
                    <span className={`recommendation-priority ${rec.priority.toLowerCase()}`}>
                      {rec.priority}
                    </span>
                  </div>
                  <div className="recommendation-content">
                    <p className="recommendation-action"><strong>Action:</strong> {rec.action}</p>
                    <p className="recommendation-outcome"><strong>Expected Outcome:</strong> {rec.expectedOutcome}</p>
                    {rec.implementationSteps && rec.implementationSteps.length > 0 && (
                      <div className="implementation-steps">
                        <strong>Implementation Steps:</strong>
                        <ol className="steps-list">
                          {rec.implementationSteps.map((step, stepIndex) => (
                            <li key={stepIndex} className="step-item">{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {rec.resourceRequirements && (
                      <p className="resource-requirements"><strong>Resources Needed:</strong> {rec.resourceRequirements}</p>
                    )}
                    {rec.timeline && (
                      <p className="timeline"><strong>Timeline:</strong> {rec.timeline}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recovery Plan */}
      {analysisData?.recoveryPlan && (
        <div className="recovery-plan-section">
          <div className="recovery-plan-card">
            <h3 className="text-xl font-bold mb-4">Recovery Plan</h3>
            <div className="recovery-plan-content">
              {analysisData.recoveryPlan.immediateActions && (
                <div className="recovery-phase">
                  <h4 className="phase-title">Immediate Actions (0-24 hours)</h4>
                  <ul className="action-list">
                    {analysisData.recoveryPlan.immediateActions.map((action, index) => (
                      <li key={index} className="action-item">{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisData.recoveryPlan.shortTermGoals && (
                <div className="recovery-phase">
                  <h4 className="phase-title">Short-term Goals (1-7 days)</h4>
                  <ul className="action-list">
                    {analysisData.recoveryPlan.shortTermGoals.map((goal, index) => (
                      <li key={index} className="action-item">{goal}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisData.recoveryPlan.longTermGoals && (
                <div className="recovery-phase">
                  <h4 className="phase-title">Long-term Goals (1-6 months)</h4>
                  <ul className="action-list">
                    {analysisData.recoveryPlan.longTermGoals.map((goal, index) => (
                      <li key={index} className="action-item">{goal}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisData.recoveryPlan.successMetrics && (
                <div className="recovery-phase">
                  <h4 className="phase-title">Success Metrics</h4>
                  <ul className="action-list">
                    {analysisData.recoveryPlan.successMetrics.map((metric, index) => (
                      <li key={index} className="action-item">{metric}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Supply Chain Resilience Analysis */}
      {analysisData?.supplyChainResilience && (
        <div className="resilience-section">
          <div className="resilience-card">
            <h3 className="text-xl font-bold mb-4">Supply Chain Resilience Analysis</h3>
            <div className="resilience-content">
              <div className="resilience-score">
                <h4 className="score-title">Current Resilience Level</h4>
                <div className={`resilience-indicator ${analysisData.supplyChainResilience.currentResilience.toLowerCase()}`}>
                  {analysisData.supplyChainResilience.currentResilience}
                </div>
              </div>

              {analysisData.supplyChainResilience.improvementAreas && (
                <div className="resilience-area">
                  <h4 className="area-title">Areas for Improvement</h4>
                  <ul className="improvement-list">
                    {analysisData.supplyChainResilience.improvementAreas.map((area, index) => (
                      <li key={index} className="improvement-item">{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisData.supplyChainResilience.bestPractices && (
                <div className="resilience-area">
                  <h4 className="area-title">Best Practices</h4>
                  <ul className="best-practices-list">
                    {analysisData.supplyChainResilience.bestPractices.map((practice, index) => (
                      <li key={index} className="practice-item">{practice}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisData.supplyChainResilience.technologyRecommendations && (
                <div className="resilience-area">
                  <h4 className="area-title">Technology Recommendations</h4>
                  <ul className="tech-recommendations-list">
                    {analysisData.supplyChainResilience.technologyRecommendations.map((tech, index) => (
                      <li key={index} className="tech-item">{tech}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alternative Routes */}
      {analysisData?.alternativeRoutes && analysisData.alternativeRoutes.length > 0 && (
        <div className="alternative-routes-section">
          <div className="alternative-routes-card">
            <h3 className="text-xl font-bold mb-4">Alternative Routes Analysis</h3>
            <div className="alternative-routes-list">
              {analysisData.alternativeRoutes.map((route, index) => (
                <div key={index} className="alternative-route-item">
                  <h4 className="route-description">{route.description}</h4>
                  <div className="route-details">
                    <span className={`route-feasibility ${route.feasibility.toLowerCase()}`}>
                      Feasibility: {route.feasibility}
                    </span>
                    <span className="route-time">Time Impact: {route.timeImpact}</span>
                    <span className="route-cost">Cost Impact: {route.costImpact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Risk Mitigation Strategies */}
      {analysisData?.riskMitigation && analysisData.riskMitigation.length > 0 && (
        <div className="risk-mitigation-section">
          <div className="risk-mitigation-card">
            <h3 className="text-xl font-bold mb-4">Risk Mitigation Strategies</h3>
            <div className="risk-mitigation-list">
              {analysisData.riskMitigation.map((strategy, index) => (
                <div key={index} className="risk-mitigation-item">
                  <h4 className="strategy-name">{strategy.strategy}</h4>
                  <p className="strategy-implementation"><strong>Implementation:</strong> {strategy.implementation}</p>
                  <p className="strategy-timeline"><strong>Timeline:</strong> {strategy.timeline}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="export-section">
        <div className="export-card">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Export Analysis Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => exportReport('pdf')}
              className="export-button bg-red-600 hover:bg-red-700 text-white"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export as PDF
            </button>

            <button
              onClick={() => exportReport('csv')}
              className="export-button bg-green-600 hover:bg-green-700 text-white"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export as CSV
            </button>

            <button
              onClick={() => exportReport('html')}
              className="export-button bg-blue-600 hover:bg-blue-700 text-white"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export as HTML
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-3 text-center">
            Choose your preferred format to download the complete analysis report
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons-section">
        <button
          onClick={() => navigate('/supply-chain-visualization')}
          className="action-button secondary"
        >
          Run Another Simulation
        </button>
        <button
          onClick={() => navigate('/create-supply-chain')}
          className="action-button primary"
        >
          Create New Supply Chain
        </button>
      </div>
    </div>
  );
};

export default SimulationImpact;
