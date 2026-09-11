import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getSupplyChains } from '../services/supplyChainService';
import './Dashboard.css';

// SVG Helper for transport modes
const TransportModeIcon = ({ mode, className = 'w-4 h-4' }) => {
  const m = (mode || '').toUpperCase();
  if (m === 'ROAD') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    );
  }
  if (m === 'SEA') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17c2 0 3-1.5 5-1.5s3 1.5 5 1.5 3-1.5 5-1.5 3 1.5 5 1.5M3 20c2 0 3-1.5 5-1.5s3 1.5 5 1.5 3-1.5 5-1.5 3 1.5 5 1.5M4 14l2-8h12l2 8" />
      </svg>
    );
  }
  if (m === 'AIR') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    );
  }
  if (m === 'RAIL') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16M8 4v16m8-16v16" />
      </svg>
    );
  }
  if (m === 'PIPELINE') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
};

// Risk badge component
const RiskBadge = ({ level }) => {
  const norm = (level || 'UNKNOWN').toUpperCase();
  let cls = 'risk-badge--unknown';
  if (norm === 'CRITICAL' || norm === 'HIGH') cls = 'risk-badge--high';
  else if (norm === 'MEDIUM') cls = 'risk-badge--medium';
  else if (norm === 'LOW') cls = 'risk-badge--low';
  return <span className={`risk-badge ${cls}`}>{norm}</span>;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [supplyChains, setSupplyChains] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, WITH_ALTERNATIVES, MULTI_NODE
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
          setError(err.message || 'Unable to load dashboard data.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute alternative routes for a chain
  const getAlternateRouteCount = (routes = []) => {
    if (!Array.isArray(routes) || routes.length === 0) return 0;
    const pairCounts = new Map();
    let alternates = 0;
    for (const r of routes) {
      if (!r.sourceNodeId || !r.destinationNodeId) continue;
      const key = `${r.sourceNodeId}->${r.destinationNodeId}`;
      const count = (pairCounts.get(key) || 0) + 1;
      pairCounts.set(key, count);
      if (count > 1) {
        alternates++;
      }
    }
    return alternates;
  };

  // Real backend metrics
  const totalChains = stats?.metrics?.totalSupplyChains ?? supplyChains.length ?? 0;
  const totalSims = stats?.metrics?.totalSimulations ?? 0;
  const highRiskCount = stats?.metrics?.highRiskScenarios ?? 0;
  const totalRoutesCount = stats?.metrics?.totalRoutes ?? 0;
  const productsAtRisk = stats?.metrics?.productsAtRisk ?? 0;
  const routesAtRisk = stats?.metrics?.routesAtRisk ?? 0;

  // Filtered supply chains based on search and active filter
  const filteredChains = useMemo(() => {
    return supplyChains.filter((chain) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (chain.name || '').toLowerCase();
      const product = (chain.products?.[0]?.name || '').toLowerCase();
      const sku = (chain.products?.[0]?.sku || '').toLowerCase();

      const matchesSearch = !q || name.includes(q) || product.includes(q) || sku.includes(q);
      if (!matchesSearch) return false;

      if (activeFilter === 'WITH_ALTERNATIVES') {
        return getAlternateRouteCount(chain.routes) > 0;
      }
      if (activeFilter === 'MULTI_NODE') {
        return (chain.nodes?.length || 0) >= 3;
      }
      return true;
    });
  }, [supplyChains, searchQuery, activeFilter]);

  // Displayed chains for dashboard preview (top 5 active)
  const displayedChains = filteredChains.slice(0, 5);

  // Recent simulations from backend
  const recentSimulations = stats?.recentSimulations || [];

  // Transport distribution from backend
  const transportDistribution = stats?.transportDistribution || [];

  // Controlled simulations count (real calculation based on totalSims and highRiskCount)
  const controlledSims = Math.max(0, totalSims - highRiskCount);
  const highRiskPercent = totalSims > 0 ? ((highRiskCount / totalSims) * 100).toFixed(1) : 0;
  const controlledPercent = totalSims > 0 ? ((controlledSims / totalSims) * 100).toFixed(1) : 0;

  return (
    <div className="dashboard-container py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-800 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Compact Dashboard Header */}
        <div className="dash-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Supply Chain Overview
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Monitor network resilience, evaluate route disruption risk, and compare recovery options.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/my-supply-chains')}
                className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                My Supply Chains
              </button>
              <button
                onClick={() => navigate('/create-supply-chain')}
                className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-sm flex items-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>+ Create Supply Chain</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by supply chain name, product, or SKU..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-slate-800 placeholder-slate-400 bg-slate-50/50"
              />
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center space-x-1 text-xs">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeFilter === 'ALL'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Chains ({supplyChains.length})
              </button>
              <button
                onClick={() => setActiveFilter('WITH_ALTERNATIVES')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeFilter === 'WITH_ALTERNATIVES'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                With Alternatives
              </button>
              <button
                onClick={() => setActiveFilter('MULTI_NODE')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeFilter === 'MULTI_NODE'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Multi-Node (3+)
              </button>
            </div>
          </div>
        </div>

        {/* 2. Compact 4-Card KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Saved Chains */}
          <div className="dash-card kpi-card kpi-card--green">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Saved Chains
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {isLoading ? '...' : totalChains}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Active network models</p>
          </div>

          {/* Card 2: Simulations */}
          <div className="dash-card kpi-card kpi-card--blue">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Simulations
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {isLoading ? '...' : totalSims}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Disruption tests evaluated</p>
          </div>

          {/* Card 3: High-Risk Scenarios */}
          <div className="dash-card kpi-card kpi-card--red">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  High-Risk Scenarios
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {isLoading ? '...' : highRiskCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {highRiskCount > 0 ? 'Requires attention & mitigation' : '0 critical exposures'}
            </p>
          </div>

          {/* Card 4: Monitored Routes */}
          <div className="dash-card kpi-card kpi-card--orange">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Monitored Routes
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {isLoading ? '...' : totalRoutesCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Active logistics corridors</p>
          </div>
        </div>

        {/* 3. Priority Alert / Requires Attention Section */}
        {highRiskCount > 0 ? (
          <div className="dash-card p-4 border-l-4 border-l-red-500 bg-red-50/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-900">
                    Disruption Vulnerabilities Require Attention
                  </h3>
                  <p className="text-xs text-red-700 mt-0.5">
                    {highRiskCount} high-risk disruption scenario{highRiskCount === 1 ? '' : 's'} recorded.
                    {productsAtRisk > 0 && ` ${productsAtRisk} product${productsAtRisk === 1 ? '' : 's'} at risk.`}
                    {routesAtRisk > 0 && ` ${routesAtRisk} critical route link${routesAtRisk === 1 ? '' : 's'} exposed to stockout.`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/my-supply-chains')}
                className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors shadow-sm self-start sm:self-auto"
              >
                Inspect Networks →
              </button>
            </div>
          </div>
        ) : (
          <div className="dash-card p-4 border-l-4 border-l-green-500 bg-green-50/40">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-green-900">
                  Network Resilience Stable
                </h3>
                <p className="text-xs text-green-700 mt-0.5">
                  No immediate high-risk disruption scenarios detected across your current simulations.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. Risk Overview Section */}
        <div className="dash-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Risk Overview</h2>
              <p className="text-xs text-slate-500">
                Authoritative severity breakdown across recorded simulation runs
              </p>
            </div>
            <div className="text-xs font-medium text-slate-500">
              Total Evaluated Scenarios: <span className="font-bold text-slate-800">{totalSims}</span>
            </div>
          </div>

          {totalSims === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              <p className="mb-2 font-medium">No disruption scenarios evaluated yet.</p>
              <button
                onClick={() => navigate('/my-supply-chains')}
                className="text-orange-600 hover:text-orange-700 font-semibold"
              >
                Simulate a route outage on one of your saved chains →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stacked Proportional Bar */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="text-red-700 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                    High & Critical Risk: {highRiskCount} ({highRiskPercent}%)
                  </span>
                  <span className="text-green-700 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" />
                    Controlled & Lower Risk: {controlledSims} ({controlledPercent}%)
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-red-500 h-full transition-all duration-500"
                    style={{ width: `${highRiskPercent}%` }}
                    title={`High Risk: ${highRiskCount}`}
                  />
                  <div
                    className="bg-green-500 h-full transition-all duration-500"
                    style={{ width: `${controlledPercent}%` }}
                    title={`Controlled: ${controlledSims}`}
                  />
                </div>
              </div>

              {/* Recent Scenario Risk Breakdown Chips */}
              {recentSimulations.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-600">
                  <span className="font-medium text-slate-500">Recent Scenarios Severity:</span>
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => {
                    const count = recentSimulations.filter((s) => s.riskLevel === lvl).length;
                    if (count === 0) return null;
                    return (
                      <span key={lvl} className="inline-flex items-center gap-1.5">
                        <RiskBadge level={lvl} />
                        <span className="font-semibold text-slate-800">{count}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Two-Column Analytics Area: Saved Chains vs Recent Scenarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Saved Supply Chains Table */}
          <div className="dash-card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Active Supply Chains</h2>
                  <p className="text-xs text-slate-500">
                    Preview of {displayedChains.length} active networks
                  </p>
                </div>
                <button
                  onClick={() => navigate('/my-supply-chains')}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  View All ({supplyChains.length}) →
                </button>
              </div>

              {filteredChains.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  {supplyChains.length === 0 ? (
                    <div>
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <p className="font-semibold text-slate-700 mb-1">Your supply-chain workspace is empty</p>
                      <p className="text-slate-500 mb-4 max-w-sm mx-auto">
                        Create your first network to start simulating disruptions and evaluating alternative routes.
                      </p>
                      <button
                        onClick={() => navigate('/create-supply-chain')}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors shadow-sm"
                      >
                        + Create Supply Chain
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-slate-600">No supply chains match your search filter.</p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setActiveFilter('ALL');
                        }}
                        className="text-orange-600 hover:underline mt-2 inline-block font-semibold"
                      >
                        Reset filters
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="table-scroll-container">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Supply Chain</th>
                        <th>Product</th>
                        <th>Nodes</th>
                        <th>Routes</th>
                        <th>Status</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedChains.map((chain) => {
                        const altCount = getAlternateRouteCount(chain.routes);
                        return (
                          <tr key={chain._id}>
                            <td>
                              <div className="flex items-center space-x-2.5">
                                <div className="w-7 h-7 rounded-md bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                  {(chain.name || 'S').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 truncate max-w-[150px]" title={chain.name}>
                                    {chain.name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="text-xs text-slate-700 truncate max-w-[120px]" title={chain.products?.[0]?.name}>
                                {chain.products?.[0]?.name || 'Standard'}
                              </div>
                              {chain.products?.[0]?.sku && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {chain.products[0].sku}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                                {chain.nodes?.length || 0}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs font-semibold text-slate-700">
                                  {chain.routes?.length || 0}
                                </span>
                                {altCount > 0 && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-green-100 text-green-700 rounded" title={`${altCount} alternate route(s)`}>
                                    +{altCount} alt
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                Active
                              </span>
                            </td>
                            <td className="text-right">
                              <button
                                onClick={() => navigate(`/supply-chain-visualization/${chain._id}`)}
                                className="table-action-btn"
                                title="View & Simulate"
                              >
                                <span>Simulate</span>
                                <span>→</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Table footer / View All redirect to My Supply Chains */}
            {supplyChains.length > 0 && (
              <div className="pt-3 mt-2 border-t border-slate-100 text-center">
                <button
                  onClick={() => navigate('/my-supply-chains')}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  Manage All {supplyChains.length} Supply Chains in Workspace →
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Recent Simulation Scenarios Feed */}
          <div className="dash-card p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Simulation Scenarios</h2>
                <p className="text-xs text-slate-500">Historical route disruption evaluations</p>
              </div>
              <span className="text-xs font-medium text-slate-400">
                {recentSimulations.length} recorded
              </span>
            </div>

            {recentSimulations.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-700 mb-1">No simulations run yet</p>
                <p className="text-slate-500 mb-4 max-w-sm mx-auto">
                  Run a disruption scenario on one of your saved supply chains to test resiliency.
                </p>
                <button
                  onClick={() => navigate('/supply-chain-visualization')}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 transition-colors shadow-sm"
                >
                  View Supply Chains
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSimulations.map((sim) => (
                  <div
                    key={sim._id}
                    className="scenario-feed-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <RiskBadge level={sim.riskLevel} />
                        <span className="text-sm font-semibold text-slate-900 truncate" title={sim.supplyChainName}>
                          {sim.supplyChainName || 'Supply Chain'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-slate-600">
                        <span className="inline-flex items-center space-x-1 font-medium">
                          <TransportModeIcon mode={sim.transportMode} className="w-3.5 h-3.5 text-slate-500" />
                          <span>{sim.transportMode}</span>
                        </span>
                        <span>•</span>
                        <span>{sim.disruptionDurationDays}d disruption</span>
                        <span>•</span>
                        <span className={sim.stockoutDays > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-medium'}>
                          {sim.stockoutDays != null
                            ? sim.stockoutDays > 0
                              ? `${sim.stockoutDays}d stockout`
                              : 'No stockout'
                            : 'Coverage n/a'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {sim.supplyChainId && (
                        <button
                          onClick={() => navigate(`/supply-chain-visualization/${sim.supplyChainId}`)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        >
                          View Analysis →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 6. Two-Column Operational Summary: Transport Distribution vs Network Structure */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Transport Mode Distribution */}
          <div className="dash-card p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Transport Mode Distribution</h2>
                <p className="text-xs text-slate-500">Active corridors by transport type</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {totalRoutesCount} Total Routes
              </span>
            </div>

            {transportDistribution.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No transport corridors configured yet.
              </div>
            ) : (
              <div className="space-y-3.5">
                {transportDistribution.map((item) => {
                  const mode = item.category || 'OTHER';
                  return (
                    <div key={mode} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <TransportModeIcon mode={mode} className="w-3.5 h-3.5 text-slate-600" />
                          <span>{mode}</span>
                        </span>
                        <span className="text-slate-600 font-medium">
                          {item.count} routes ({item.percentage}%)
                        </span>
                      </div>
                      <div className="dist-bar-track">
                        <div
                          className="dist-bar-fill bg-orange-500"
                          style={{ width: `${Math.min(100, item.percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Network Structure Breakdown */}
          <div className="dash-card p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Network Structure</h2>
                <p className="text-xs text-slate-500">Checkpoints, routes, and alternate redundancy</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {supplyChains.length} Saved Chains
              </span>
            </div>

            {supplyChains.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No saved networks available to summarize.
              </div>
            ) : (
              <div className="space-y-2.5">
                {supplyChains.slice(0, 5).map((chain) => {
                  const nodeCount = chain.nodes?.length || 0;
                  const routeCount = chain.routes?.length || 0;
                  const altCount = getAlternateRouteCount(chain.routes);
                  return (
                    <div
                      key={chain._id}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-3">
                        <span className="font-semibold text-slate-900 truncate block max-w-[200px]" title={chain.name}>
                          {chain.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {chain.products?.[0]?.name || 'Standard Item'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-700">
                          {nodeCount} Nodes
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-700">
                          {routeCount} Routes
                        </span>
                        {altCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-green-50 border border-green-200 font-bold text-green-700">
                            {altCount} Alt
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-500">
                            Direct
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

