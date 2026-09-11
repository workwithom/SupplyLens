import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupplyChains } from '../services/supplyChainService';

const MySupplyChains = () => {
  const navigate = useNavigate();
  const [supplyChains, setSupplyChains] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchChains = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await getSupplyChains();
        if (isMounted) {
          setSupplyChains(data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load your supply chains.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchChains();
    return () => {
      isMounted = false;
    };
  }, []);

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

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                My Supply Chains
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {supplyChains.length} Saved {supplyChains.length === 1 ? 'Network' : 'Networks'}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Manage, inspect, and simulate disruption scenarios across your saved supply-chain networks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              ← Dashboard
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

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-800 text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by network name, product name, or SKU..."
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
              All ({supplyChains.length})
            </button>
            <button
              onClick={() => setActiveFilter('WITH_ALTERNATIVES')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeFilter === 'WITH_ALTERNATIVES'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              With Alternate Routes
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

        {/* Content Area */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading your saved supply chains...
            </div>
          ) : supplyChains.length === 0 ? (
            /* Empty state for zero saved chains */
            <div className="p-16 text-center text-slate-500">
              <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No supply chains yet</h3>
              <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">
                Create your first supply-chain network to start modeling disruptions and evaluating risk.
              </p>
              <button
                onClick={() => navigate('/create-supply-chain')}
                className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors shadow-sm inline-flex items-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>+ Create Supply Chain</span>
              </button>
            </div>
          ) : filteredChains.length === 0 ? (
            /* Empty state for search filter with no matches */
            <div className="p-12 text-center text-slate-500 text-sm">
              <p className="font-semibold text-slate-700 mb-1">No supply chains match your search filter</p>
              <p className="text-xs text-slate-500 mb-4">Try clearing the search query or changing filters.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('ALL');
                }}
                className="text-xs font-semibold text-orange-600 hover:underline"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            /* Table of Supply Chains */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Supply Chain Network</th>
                    <th className="py-3 px-4">Product / SKU</th>
                    <th className="py-3 px-4 text-center">Nodes</th>
                    <th className="py-3 px-4 text-center">Routes</th>
                    <th className="py-3 px-4 text-center">Redundancy</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredChains.map((chain) => {
                    const altCount = getAlternateRouteCount(chain.routes);
                    const nodeCount = chain.nodes?.length || 0;
                    const routeCount = chain.routes?.length || 0;
                    const primaryProduct = chain.products?.[0];

                    return (
                      <tr key={chain._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {(chain.name || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-sm truncate max-w-[220px]" title={chain.name}>
                                {chain.name}
                              </div>
                              {chain.description && (
                                <div className="text-[11px] text-slate-500 truncate max-w-[220px]" title={chain.description}>
                                  {chain.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-800 truncate max-w-[160px]" title={primaryProduct?.name}>
                            {primaryProduct?.name || 'Standard Product'}
                          </div>
                          {primaryProduct?.sku && (
                            <div className="text-[11px] text-slate-400 font-mono">
                              SKU: {primaryProduct.sku}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                            {nodeCount}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                            {routeCount}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          {altCount > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200" title={`${altCount} alternate route(s) configured`}>
                              ✅ {altCount} Alternate{altCount === 1 ? '' : 's'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                              Direct (No Alt)
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                          {formatDate(chain.updatedAt || chain.createdAt)}
                        </td>

                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/supply-chain-visualization/${chain._id}`)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-md font-semibold text-xs transition-colors shadow-sm"
                          >
                            <span>View & Simulate</span>
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
      </div>
    </div>
  );
};

export default MySupplyChains;

