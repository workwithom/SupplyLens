# AI-Powered Supply Chain Impact Analysis

## Overview

The Supply Lens application now features a comprehensive AI-powered impact analysis system that uses Groq's advanced language models to provide detailed insights into supply chain disruptions. This system analyzes broken links, identifies problems, provides actionable recommendations, and creates recovery plans.

## Features

### 🚀 AI-Powered Analysis
- **Real-time Analysis**: Uses Groq API for instant, intelligent analysis
- **Comprehensive Insights**: Covers impact assessment, problems, recommendations, and recovery plans
- **Industry Expertise**: Leverages supply chain best practices and risk management knowledge

### 📊 Impact Assessment
- **Severity Classification**: Low, Medium, High, Critical
- **Multi-dimensional Impact**: Financial, operational, customer, and market impacts
- **Immediate vs Long-term Effects**: Short and long-term consequence analysis

### 🔍 Problem Identification
- **Root Cause Analysis**: Identifies underlying causes of disruptions
- **Affected Areas**: Maps impact across different business functions
- **Severity Prioritization**: Helps focus on most critical issues

### 💡 Smart Recommendations
- **Actionable Solutions**: Specific, implementable recommendations
- **Implementation Steps**: Step-by-step guidance for each recommendation
- **Resource Requirements**: Clear understanding of what's needed
- **Timeline Estimates**: Realistic timeframes for implementation

### 🛣️ Alternative Routes
- **Route Feasibility**: Assessment of alternative supply chain paths
- **Cost & Time Impact**: Quantified impact of route changes
- **Risk Assessment**: Understanding of new route risks

### 🛡️ Risk Mitigation
- **Strategic Planning**: Long-term risk reduction strategies
- **Technology Recommendations**: Tools and systems for better monitoring
- **Implementation Guidance**: Practical steps for risk management

### 📈 Recovery Planning
- **Immediate Actions**: 0-24 hour response plan
- **Short-term Goals**: 1-7 day recovery objectives
- **Long-term Goals**: 1-6 month strategic improvements
- **Success Metrics**: KPIs to measure recovery progress

### 🏗️ Supply Chain Resilience
- **Current Resilience Score**: Assessment of existing resilience
- **Improvement Areas**: Specific areas for enhancement
- **Best Practices**: Industry-proven resilience strategies
- **Technology Roadmap**: Tools and systems for improvement

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the `supply-lens` directory:

```bash
# Copy the template
cp env.template .env

# Edit the .env file and add your Groq API key
GROQ_API_KEY=your_actual_groq_api_key_here
VITE_GROQ_API_KEY=your_actual_groq_api_key_here
```

### 2. API Key Setup

1. Sign up for a Groq account at [https://console.groq.com/](https://console.groq.com/)
2. Generate an API key from your dashboard
3. Add the key to your `.env` file

### 3. Running the Application

```bash
cd supply-lens
npm install
npm run dev
```

## How to Use

### 1. Create a Supply Chain
- Navigate to "Create Supply Chain"
- Define your product and checkpoints
- Set up transportation links

### 2. Run Simulation
- Go to "Supply Chain Visualization"
- Click transport icons to break links
- Submit simulation for analysis

### 3. View AI Analysis
- The system automatically calls Groq API
- Comprehensive analysis is generated
- View detailed insights and recommendations

## API Integration Details

### Groq API Configuration
- **Model**: llama3-70b-8192 (high-performance, cost-effective)
- **Temperature**: 0.3 (balanced creativity and consistency)
- **Max Tokens**: 4000 (comprehensive responses)
- **System Prompt**: Expert supply chain analyst role

### Fallback System
- If Groq API fails, falls back to enhanced local analysis
- Ensures system reliability even during API issues
- Maintains user experience quality

## Analysis Output Structure

The AI generates structured JSON responses including:

```json
{
  "impactAssessment": {
    "severity": "High",
    "overallImpact": "Detailed impact description",
    "immediateEffects": ["Effect 1", "Effect 2"],
    "longTermEffects": ["Long-term effect 1"],
    "financialImpact": "Financial impact assessment",
    "operationalImpact": "Operational impact assessment",
    "customerImpact": "Customer impact analysis",
    "marketImpact": "Market implications"
  },
  "problems": [...],
  "recommendations": [...],
  "alternativeRoutes": [...],
  "riskMitigation": [...],
  "recoveryPlan": {...},
  "supplyChainResilience": {...}
}
```

## Benefits

### For Supply Chain Managers
- **Quick Decision Making**: Instant, intelligent analysis
- **Risk Awareness**: Comprehensive understanding of disruptions
- **Actionable Plans**: Clear next steps and recovery strategies
- **Cost Optimization**: Better resource allocation and planning

### For Operations Teams
- **Immediate Response**: Clear immediate action items
- **Process Improvement**: Long-term optimization strategies
- **Technology Guidance**: Tools and systems recommendations
- **Training Insights**: Areas for skill development

### For Business Leaders
- **Strategic Planning**: Long-term resilience building
- **Investment Decisions**: Technology and process investments
- **Competitive Advantage**: Improved supply chain performance
- **Risk Management**: Proactive risk mitigation strategies

## Troubleshooting

### API Key Issues
- Ensure `.env` file exists and contains correct API key
- Check API key validity in Groq console
- Verify environment variable loading

### Analysis Failures
- System automatically falls back to local analysis
- Check browser console for error details
- Verify internet connectivity for API calls

### Performance Issues
- Groq API typically responds in 2-5 seconds
- Large supply chains may take longer to analyze
- Consider breaking complex chains into smaller segments

## Security Considerations

- API keys are stored in environment variables
- No sensitive data is logged or stored
- API calls use HTTPS encryption
- Fallback analysis runs locally without external calls

## Future Enhancements

- **Custom Models**: Industry-specific analysis models
- **Historical Learning**: Learn from previous disruptions
- **Predictive Analytics**: Forecast potential disruptions
- **Integration APIs**: Connect with existing supply chain systems
- **Multi-language Support**: Analysis in multiple languages

## Support

For technical support or feature requests:
- Check the application console for error messages
- Review the Groq API documentation
- Ensure proper environment configuration

---

**Note**: This system provides AI-powered insights but should be used alongside human expertise and judgment for critical business decisions.
