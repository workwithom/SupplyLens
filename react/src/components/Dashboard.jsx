import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getSupplyChains } from '../services/supplyChainService';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [supplyChains, setSupplyChains] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError('');
        const [statsData, chainsData] = await Promise.all([
          getDashboardStats().catch(() => null),
          getSupplyChains().catch(() => []),
        ]);

        if (isMounted) {
          if (statsData?.success) {
            setStats(statsData);
          }
          setSupplyChains(chainsData || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load dashboard data');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    // Listen to storage changes for user profile sync
    const handleStorage = () => {
      try {
        setUser(JSON.parse(localStorage.getItem('user') || '{}'));
      } catch {
        setUser({});
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  };

  const userName = user.name || 'Supply Planner';
  const userEmail = user.email || 'planner@supplylens.com';
  const userInitials =
    userName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'SL';

  // Metrics backed by real backend data
  const metricsData = [
    {
      title: 'Saved Supply Chains',
      value: stats?.metrics?.totalSupplyChains ?? supplyChains.length ?? 0,
      icon: '📊',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      watermark: '🌱',
    },
    {
      title: 'Total Simulations',
      value: stats?.metrics?.totalSimulations ?? 0,
      icon: '⚡',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      watermark: '⚡',
    },
    {
      title: 'High-Risk Scenarios',
      value: stats?.metrics?.highRiskScenarios ?? 0,
      icon: '⚠️',
      bgColor: 'bg-red-100',
      textColor: 'text-red-600',
      watermark: '⚠️',
    },
    {
      title: 'Monitored Routes',
      value: stats?.metrics?.totalRoutes ?? 0,
      icon: '🛣️',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600',
      watermark: '📍',
    },
  ];

  // Filter supply chains by search query
  const filteredChains = supplyChains.filter((chain) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (chain.name || '').toLowerCase();
    const product = (chain.products?.[0]?.name || '').toLowerCase();
    return name.includes(q) || product.includes(q);
  });

  // Transport distribution backed by backend data
  const distributionData = stats?.transportDistribution || [];

  // Recent simulations backed by backend data
  const recentSimulations = stats?.recentSimulations || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div
              className="flex items-center space-x-4 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">SL</span>
              </div>
              <span className="text-xl font-bold text-gray-900">SupplyLens</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/create-supply-chain')}
                className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                + New Chain
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
                  {userInitials}
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{userName}</div>
                  <div className="text-gray-500 text-xs">{userEmail}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600 text-sm ml-2"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen sidebar">
          <div className="p-6">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-xl">⚡</span>
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center space-x-3 px-4 py-3 bg-orange-100 text-orange-700 rounded-lg font-medium text-left"
              >
                <span>📊</span>
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => navigate('/supply-chain-visualization')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg text-left"
              >
                <span>🔗</span>
                <span>Visualization</span>
              </button>
              <button
                onClick={() => navigate('/create-supply-chain')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg text-left"
              >
                <span>➕</span>
                <span>Create Chain</span>
              </button>
              <button
                onClick={() => navigate('/risk-analysis')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg text-left"
              >
                <span>🛡️</span>
                <span>Risk Analysis</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {userName}</h1>
            <p className="text-gray-600">Real-time supply chain metrics and simulation insights</p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="mt-6 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter saved supply chains..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
                <svg
                  className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metricsData.map((metric, index) => (
              <div
                key={index}
                className={`${metric.bgColor} rounded-xl p-6 relative overflow-hidden metrics-card`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{metric.title}</p>
                    <p className={`text-3xl font-bold ${metric.textColor}`}>
                      {isLoading ? '...' : metric.value}
                    </p>
                  </div>
                  <span className="text-3xl">{metric.icon}</span>
                </div>
                <div className="absolute top-2 right-2 text-4xl opacity-20">
                  {metric.watermark}
                </div>
              </div>
            ))}
          </div>

          {/* Charts and Data Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Supply Chain Node & Route Breakdown */}
            <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm chart-container">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Supply Chain Structure Breakdown
                </h3>
                <span className="text-xs text-gray-500">
                  {supplyChains.length} Saved {supplyChains.length === 1 ? 'Chain' : 'Chains'}
                </span>
              </div>

              {supplyChains.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <p className="mb-3">No supply chains created yet.</p>
                  <button
                    onClick={() => navigate('/create-supply-chain')}
                    className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Create Your First Chain
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {supplyChains.slice(0, 6).map((chain) => {
                    const nodeCount = chain.nodes?.length || 0;
                    const routeCount = chain.routes?.length || 0;
                    return (
                      <div key={chain._id} className="flex items-center space-x-4">
                        <div className="w-36 text-sm font-medium text-gray-700 truncate" title={chain.name}>
                          {chain.name}
                        </div>
                        <div className="flex-1 flex space-x-2">
                          <div
                            className="bg-orange-500 rounded h-8 flex items-center justify-center text-white text-xs font-semibold chart-bar"
                            style={{ flex: Math.max(1, nodeCount) }}
                            title={`${nodeCount} checkpoints`}
                          >
                            {nodeCount} Nodes
                          </div>
                          <div
                            className="bg-gray-800 rounded h-8 flex items-center justify-center text-white text-xs font-semibold chart-bar"
                            style={{ flex: Math.max(1, routeCount) }}
                            title={`${routeCount} routes`}
                          >
                            {routeCount} Routes
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center space-x-6 mt-4 pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">Checkpoints (Nodes)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
                      <span className="text-xs text-gray-600">Transport Routes</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Transport Distribution Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Transport Mode Distribution</h3>
                <span className="text-xs text-gray-500">Real Data</span>
              </div>

              {distributionData.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">
                  No transport routes configured yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {distributionData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between distribution-item p-2 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 ${item.color} rounded-full`}></div>
                        <span className="text-sm text-gray-700 font-medium">{item.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">{item.count}</div>
                        <div className="text-xs text-gray-500">{item.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Saved Supply Chains Table */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-8 performance-table">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Saved Supply Chains</h3>
              <span className="text-sm text-gray-500">
                {filteredChains.length} of {supplyChains.length} chains
              </span>
            </div>

            {filteredChains.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">
                {searchQuery
                  ? 'No supply chains match your filter.'
                  : 'No supply chains saved yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">ID</th>
                      <th className="text-left py-3 px-4 font-semibold">Product</th>
                      <th className="text-left py-3 px-4 font-semibold">Nodes</th>
                      <th className="text-left py-3 px-4 font-semibold">Routes</th>
                      <th className="text-right py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChains.map((chain) => (
                      <tr
                        key={chain._id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {(chain.name || 'S').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">{chain.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-gray-500">
                          #{chain._id.slice(-6).toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {chain.products?.[0]?.name || 'Not specified'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {chain.nodes?.length || 0}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {chain.routes?.length || 0}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() =>
                              navigate(`/supply-chain-visualization/${chain._id}`)
                            }
                            className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                          >
                            View & Simulate →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white shadow-sm min-h-screen p-6 right-sidebar">
          {/* User Profile */}
          <div className="text-center mb-8 user-profile">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow">
              {userInitials}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{userName}</h3>
            <p className="text-sm text-gray-500">{userEmail}</p>
          </div>

          {/* Call to Action Card */}
          <div className="bg-orange-500 rounded-xl p-6 text-white mb-8 cta-card">
            <h4 className="font-semibold mb-2">Test Disruption Scenarios</h4>
            <p className="text-xs text-orange-100 mb-4">
              Simulate route failures, calculate stockout risks, and evaluate alternative paths.
            </p>
            <button
              onClick={() => navigate('/create-supply-chain')}
              className="w-full bg-white text-orange-500 py-2 px-4 rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors"
            >
              + Create Supply Chain
            </button>
          </div>

          {/* Recent Simulation Scenarios */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Recent Scenarios</h4>
            {recentSimulations.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-xs text-gray-500 text-center leading-relaxed">
                No simulations run yet. Select a saved supply chain to test route failure impact.
              </div>
            ) : (
              <div className="space-y-3">
                {recentSimulations.map((sim) => (
                  <div
                    key={sim._id}
                    onClick={() =>
                      sim.supplyChainId &&
                      navigate(`/supply-chain-visualization/${sim.supplyChainId}`)
                    }
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-900 truncate max-w-[140px]">
                        {sim.supplyChainName || 'Route Failure'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          sim.riskLevel === 'CRITICAL' || sim.riskLevel === 'HIGH'
                            ? 'bg-red-100 text-red-700'
                            : sim.riskLevel === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-700'
                            : sim.riskLevel === 'LOW'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {sim.riskLevel}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>{sim.transportMode} · {sim.disruptionDurationDays}d disruption</span>
                      <span>
                        {sim.stockoutDays != null
                          ? sim.stockoutDays > 0
                            ? `${sim.stockoutDays}d stockout`
                            : 'No stockout'
                          : 'Demand n/a'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
