# Supply Lens - AI-Powered Supply Chain Builder

A modern web application for building and analyzing supply chains with AI assistance.

## Features

### 🏗️ Supply Chain Builder
- Interactive checkpoint creation
- Multiple transport modes (Air, Sea, Road, Rail, Pipeline)
- Real-time supply chain visualization
- Export functionality

### 🤖 AI Assistant (NEW!)
- **Intelligent Supply Chain Analysis**: Get AI-powered insights about your supply chain
- **Risk Assessment**: Identify potential vulnerabilities and risks
- **Current Events Impact**: Understand how global events might affect your supply chain
- **Optimization Suggestions**: Receive actionable recommendations for improvement
- **Real-time Chat Interface**: Interactive sidebar chatbot with quick action buttons

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Gemini API key

### Frontend Setup
```bash
cd supply-lens
npm install
npm run dev
```

### Backend Setup
```bash
cd backened
npm install
# Create .env file with your GEMINI_API_KEY
npm start
```

### Environment Variables
Create a `.env` file in the `backened` folder:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

## How to Use the AI Assistant

1. **Open the AI Assistant**: Click the "AI Assistant" button in the header or use the floating chat button
2. **Ask Questions**: Use natural language to ask about your supply chain
3. **Quick Actions**: Use pre-built questions for common analyses:
   - "Analyze my supply chain"
   - "Identify potential risks"
   - "Check for current events impact"
   - "Suggest optimizations"
   - "What are the weak points?"

## API Endpoints

- `POST /api/generate` - General AI generation
- `POST /api/analyze-supply-chain` - Supply chain specific analysis

## Technology Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **AI**: Google Gemini API
- **Styling**: Tailwind CSS with custom gradients

## Project Structure

```
supply-lens/
├── src/
│   ├── components/
│   │   ├── SupplyChainBuilder.jsx  # Main supply chain builder
│   │   ├── Chatbot.jsx             # AI chatbot component
│   │   ├── LandingPage.jsx         # Landing page
│   │   └── data.jsx                # API utilities
│   ├── App.jsx                     # Main app component
│   └── main.jsx                    # Entry point
└── backened/
    └── index.js                    # Express server with Gemini API
```

## Contributing

Feel free to submit issues and enhancement requests!
