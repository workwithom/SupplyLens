// Groq API configuration
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Function to analyze supply chain impact using Groq AI
export const analyzeSupplyChainImpact = async (supplyChainData, brokenLinks) => {
  try {
    console.log('Starting Groq AI analysis...');

    // Prepare the analysis prompt
    const analysisPrompt = createAnalysisPrompt(supplyChainData, brokenLinks);

    // Call Groq API
    const analysis = await callGroqAPI(analysisPrompt);

    // Parse and structure the response
    const structuredAnalysis = parseGroqResponse(analysis, supplyChainData, brokenLinks);

    console.log('Groq AI analysis completed:', structuredAnalysis);
    return structuredAnalysis;

  } catch (error) {
    console.error('Error in Groq AI analysis:', error);

    // Fallback to basic analysis if Groq fails
    console.log('Falling back to basic analysis...');
    return generateFallbackAnalysis(supplyChainData, brokenLinks);
  }
};

// Create comprehensive analysis prompt for Groq
const createAnalysisPrompt = (supplyChainData, brokenLinks) => {
  const product = supplyChainData.product || 'Supply Chain';
  const checkpoints = supplyChainData.checkpoints || [];
  const brokenCount = brokenLinks.length;
  const totalSegments = Math.max(1, checkpoints.length - 1);

  return `You are an expert supply chain analyst and consultant. Analyze the following supply chain disruption scenario and provide comprehensive insights.

SUPPLY CHAIN DATA:
- Product: ${product}
- Total Checkpoints: ${checkpoints.length}
- Checkpoints: ${checkpoints.map(cp => `${cp.location} (${cp.type || 'Unknown'})`).join(' → ')}
- Total Segments: ${totalSegments}
- Broken Links: ${brokenCount}

BROKEN LINKS DETAILS:
${brokenLinks.map((link, index) =>
  `${index + 1}. From: ${link.from} → To: ${link.to} (Type: ${link.transport || 'Transportation'})`
).join('\n')}

Please provide a comprehensive analysis in the following JSON format (respond ONLY with valid JSON, no additional text):

{
  "impactAssessment": {
    "severity": "Low/Medium/High/Critical",
    "overallImpact": "Detailed description of overall impact",
    "immediateEffects": ["Effect 1", "Effect 2", "Effect 3"],
    "longTermEffects": ["Long-term effect 1", "Long-term effect 2"],
    "financialImpact": "Detailed financial impact assessment",
    "operationalImpact": "Detailed operational impact assessment",
    "customerImpact": "How this affects customers",
    "marketImpact": "Market and competitive implications"
  },
  "problems": [
    {
      "category": "Category name",
      "description": "Detailed problem description",
      "severity": "Low/Medium/High/Critical",
      "rootCause": "Root cause analysis",
      "affectedAreas": ["Area 1", "Area 2"]
    }
  ],
  "recommendations": [
    {
      "type": "Immediate/Short-term/Long-term/Strategic",
      "action": "Specific action to take",
      "priority": "Low/Medium/High/Critical",
      "expectedOutcome": "Expected result",
      "implementationSteps": ["Step 1", "Step 2"],
      "resourceRequirements": "Resources needed",
      "timeline": "Expected timeline"
    }
  ],
  "alternativeRoutes": [
    {
      "description": "Alternative route description",
      "feasibility": "High/Medium/Low",
      "timeImpact": "Time impact assessment",
      "costImpact": "Cost impact assessment",
      "riskLevel": "Low/Medium/High",
      "implementationDifficulty": "Easy/Medium/Hard"
    }
  ],
  "riskMitigation": [
    {
      "strategy": "Strategy name",
      "implementation": "Implementation details",
      "timeline": "Implementation timeline",
      "effectiveness": "Expected effectiveness",
      "cost": "Estimated cost"
    }
  ],
  "recoveryPlan": {
    "immediateActions": ["Action 1", "Action 2"],
    "shortTermGoals": ["Goal 1", "Goal 2"],
    "longTermGoals": ["Goal 1", "Goal 2"],
    "successMetrics": ["Metric 1", "Metric 2"]
  },
  "supplyChainResilience": {
    "currentResilience": "Low/Medium/High",
    "improvementAreas": ["Area 1", "Area 2"],
    "bestPractices": ["Practice 1", "Practice 2"],
    "technologyRecommendations": ["Tech 1", "Tech 2"]
  }
}

Focus on providing actionable insights, specific recommendations, and comprehensive analysis that would help supply chain managers make informed decisions. Consider industry best practices, risk management, and operational efficiency.`;
};

// Call Groq API
const callGroqAPI = async (prompt) => {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are an expert supply chain analyst. Provide comprehensive, actionable analysis in the exact JSON format requested. Be specific, detailed, and practical in your recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error('Groq API call failed:', error);
    throw error;
  }
};

// Parse Groq API response
const parseGroqResponse = (response, supplyChainData, brokenLinks) => {
  try {
    // Try to parse the JSON response
    const parsed = JSON.parse(response);

    // Validate and enhance the response
    return {
      impactAssessment: {
        severity: parsed.impactAssessment?.severity || calculateSeverity(brokenLinks, supplyChainData),
        overallImpact: parsed.impactAssessment?.overallImpact || determineOverallImpact(calculateSeverity(brokenLinks, supplyChainData)),
        immediateEffects: parsed.impactAssessment?.immediateEffects || analyzeEffects(brokenLinks, supplyChainData).immediate,
        longTermEffects: parsed.impactAssessment?.longTermEffects || analyzeEffects(brokenLinks, supplyChainData).longTerm,
        financialImpact: parsed.impactAssessment?.financialImpact || calculateFinancialImpact(calculateSeverity(brokenLinks, supplyChainData)),
        operationalImpact: parsed.impactAssessment?.operationalImpact || calculateOperationalImpact(calculateSeverity(brokenLinks, supplyChainData)),
        customerImpact: parsed.impactAssessment?.customerImpact || "Customer satisfaction and delivery times may be affected",
        marketImpact: parsed.impactAssessment?.marketImpact || "Market position and competitive advantage may be impacted"
      },
      problems: parsed.problems || identifyProblems(brokenLinks),
      recommendations: parsed.recommendations || generateRecommendations(identifyProblems(brokenLinks)),
      alternativeRoutes: parsed.alternativeRoutes || generateAlternativeRoutes(supplyChainData, brokenLinks),
      riskMitigation: parsed.riskMitigation || generateRiskMitigation(brokenLinks),
      recoveryPlan: parsed.recoveryPlan || generateRecoveryPlan(brokenLinks),
      supplyChainResilience: parsed.supplyChainResilience || generateResilienceAnalysis(supplyChainData, brokenLinks)
    };

  } catch (parseError) {
    console.error('Failed to parse Groq response:', parseError);
    console.log('Raw response:', response);

    // Fallback to basic analysis
    return generateFallbackAnalysis(supplyChainData, brokenLinks);
  }
};

// Generate fallback analysis when Groq fails
const generateFallbackAnalysis = (supplyChainData, brokenLinks) => {
  const severity = calculateSeverity(brokenLinks, supplyChainData);
  const effects = analyzeEffects(brokenLinks, supplyChainData);
  const problems = identifyProblems(brokenLinks);
  const recommendations = generateRecommendations(problems);

  return {
    impactAssessment: {
      severity,
      overallImpact: determineOverallImpact(severity),
      immediateEffects: effects.immediate,
      longTermEffects: effects.longTerm,
      financialImpact: calculateFinancialImpact(severity, effects),
      operationalImpact: calculateOperationalImpact(severity, effects),
      customerImpact: "Customer satisfaction and delivery times may be affected",
      marketImpact: "Market position and competitive advantage may be impacted"
    },
    problems,
    recommendations,
    alternativeRoutes: generateAlternativeRoutes(supplyChainData, brokenLinks),
    riskMitigation: generateRiskMitigation(brokenLinks),
    recoveryPlan: generateRecoveryPlan(brokenLinks),
    supplyChainResilience: generateResilienceAnalysis(supplyChainData, brokenLinks)
  };
};

// Enhanced helper functions
const generateAlternativeRoutes = (supplyChainData, brokenLinks) => {
  const routes = [];

  if (brokenLinks.length > 0) {
    routes.push({
      description: "Activate backup suppliers and alternative transportation routes",
      feasibility: "High",
      timeImpact: "May add 2-3 days to delivery",
      costImpact: "15-25% cost increase expected",
      riskLevel: "Medium",
      implementationDifficulty: "Medium"
    });

    routes.push({
      description: "Implement cross-docking and consolidation strategies",
      feasibility: "Medium",
      timeImpact: "May reduce delays by 1-2 days",
      costImpact: "5-10% cost increase",
      riskLevel: "Low",
      implementationDifficulty: "Easy"
    });
  }

  return routes;
};

const generateRiskMitigation = (brokenLinks) => {
  const strategies = [];

  if (brokenLinks.length > 0) {
    strategies.push({
      strategy: "Implement real-time monitoring and alerting",
      implementation: "Deploy IoT sensors and tracking systems",
      timeline: "2-4 weeks",
      effectiveness: "High - immediate visibility into disruptions",
      cost: "Medium - requires technology investment"
    });

    strategies.push({
      strategy: "Develop supplier diversification program",
      implementation: "Identify and qualify backup suppliers",
      timeline: "3-6 months",
      effectiveness: "High - reduces dependency on single sources",
      cost: "Low - primarily relationship building"
    });
  }

  return strategies;
};

const generateRecoveryPlan = (brokenLinks) => {
  return {
    immediateActions: [
      "Assess current inventory levels and customer commitments",
      "Activate emergency response team",
      "Communicate with key stakeholders"
    ],
    shortTermGoals: [
      "Restore critical supply chain links within 48 hours",
      "Minimize customer impact and maintain service levels",
      "Implement temporary workarounds for non-critical disruptions"
    ],
    longTermGoals: [
      "Strengthen supply chain resilience through diversification",
      "Implement advanced monitoring and predictive analytics",
      "Develop comprehensive risk management framework"
    ],
    successMetrics: [
      "Supply chain uptime percentage",
      "Customer satisfaction scores",
      "Cost impact reduction",
      "Recovery time from disruptions"
    ]
  };
};

const generateResilienceAnalysis = (supplyChainData, brokenLinks) => {
  const resilienceScore = brokenLinks.length === 0 ? "High" :
                         brokenLinks.length <= 2 ? "Medium" : "Low";

  return {
    currentResilience: resilienceScore,
    improvementAreas: [
      "Supplier diversification",
      "Technology implementation",
      "Process optimization",
      "Risk assessment and monitoring"
    ],
    bestPractices: [
      "Maintain multiple supplier relationships",
      "Implement real-time visibility tools",
      "Regular risk assessments and scenario planning",
      "Cross-training and skill development"
    ],
    technologyRecommendations: [
      "Supply chain management software",
      "IoT and sensor technology",
      "Predictive analytics and AI",
      "Blockchain for transparency"
    ]
  };
};

// Legacy helper functions (kept for fallback)
const calculateSeverity = (brokenLinks, supplyChainData) => {
  const totalLinks = countTotalLinks(supplyChainData);
  const brokenLinkCount = brokenLinks.length;
  const ratio = brokenLinkCount / totalLinks;

  if (ratio >= 0.5) return "High";
  if (ratio >= 0.25) return "Medium";
  return "Low";
};

const analyzeEffects = (brokenLinks, supplyChainData) => {
  const immediate = [];
  const longTerm = [];

  if (brokenLinks.length > 0) {
    immediate.push("Production delays", "Inventory shortages");
    longTerm.push("Customer dissatisfaction", "Revenue loss");
  }

  if (brokenLinks.length >= 3) {
    immediate.push("Supply chain bottlenecks");
    longTerm.push("Market share reduction");
  }

  return { immediate, longTerm };
};

const identifyProblems = (brokenLinks) => {
  return brokenLinks.map(link => ({
    category: link.transport || "Transportation",
    description: `${link.transport || 'Transportation'} link broken between ${link.from} and ${link.to}`,
    severity: "High",
    rootCause: "Infrastructure failure or operational disruption",
    affectedAreas: ["Logistics", "Production", "Customer Service"]
  }));
};

const generateRecommendations = (problems) => {
  const recommendations = [];

  if (problems.length > 0) {
    recommendations.push({
      type: "Immediate",
      action: "Activate backup suppliers and alternative routes",
      priority: "High",
      expectedOutcome: "Minimize disruption and maintain operations",
      implementationSteps: ["Contact backup suppliers", "Reroute shipments", "Update logistics plans"],
      resourceRequirements: "Additional logistics staff and transportation capacity",
      timeline: "24-48 hours"
    });
  }

  if (problems.length >= 3) {
    recommendations.push({
      type: "Strategic",
      action: "Diversify supply chain network and implement risk management",
      priority: "Medium",
      expectedOutcome: "Improved resilience and reduced future disruptions",
      implementationSteps: ["Supplier assessment", "Risk analysis", "Technology implementation"],
      resourceRequirements: "Strategic planning team and technology investment",
      timeline: "3-6 months"
    });
  }

  return recommendations;
};

const determineOverallImpact = (severity) => {
  switch (severity) {
    case "High":
      return "Critical supply chain disruption detected requiring immediate attention";
    case "Medium":
      return "Moderate supply chain disruption detected with manageable impact";
    case "Low":
      return "Minor supply chain disruption detected with minimal impact";
    default:
      return "Supply chain disruption detected requiring analysis";
  }
};

const calculateFinancialImpact = (severity, effects) => {
  if (severity === "High") return "Severe financial impact expected with potential revenue loss of 15-25%";
  if (severity === "Medium") return "Significant financial impact expected with potential revenue loss of 5-15%";
  return "Minimal financial impact expected with potential revenue loss of 1-5%";
};

const calculateOperationalImpact = (severity, effects) => {
  if (severity === "High") return "Operations severely compromised with significant productivity loss";
  if (severity === "Medium") return "Operational efficiency compromised with moderate productivity loss";
  return "Minor operational impact with minimal productivity loss";
};

const countTotalLinks = (supplyChainData) => {
  return supplyChainData.links?.length || Math.max(1, (supplyChainData.checkpoints?.length || 1) - 1);
};
