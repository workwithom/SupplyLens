import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import SupplyChainBuilder from './components/SupplyChainBuilder';
import SupplyChainVisualization from './components/SupplyChainVisualization';
import SimulationImpact from './components/SimulationImpact';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import RiskAnalysisPage from './components/RiskAnalysisPage';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white text-gray-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/create-supply-chain" element={<PrivateRoute><SupplyChainBuilder /></PrivateRoute>} />
          <Route path="/supply-chain-visualization" element={<PrivateRoute><SupplyChainVisualization /></PrivateRoute>} />
          <Route path="/simulation-impact" element={<PrivateRoute><SimulationImpact /></PrivateRoute>} />
          <Route path="/risk-analysis" element={<RiskAnalysisPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
