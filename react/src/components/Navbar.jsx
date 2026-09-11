import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({});
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
      try {
        setUser(JSON.parse(localStorage.getItem('user') || '{}'));
      } catch {
        setUser({});
      }
    };

    syncAuth();
    window.addEventListener('storage', syncAuth);

    return () => {
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser({});
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  };

  // Don't render navbar on home page (/), login page, and signup page since they have their own hero/landing header
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  const userName = user.name || 'Supply Planner';
  const userInitials =
    userName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'SL';

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/supply-chain-visualization') {
      return location.pathname.startsWith('/supply-chain-visualization');
    }
    return location.pathname === path;
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Brand */}
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-orange-700 transition-colors">
                <span className="text-white text-sm font-bold tracking-tight">SL</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                  SupplyLens
                </span>
                <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">
                  Control Center
                </span>
              </div>
            </Link>

            {/* Main Navigation Links */}
            {isLoggedIn && (
              <nav className="hidden md:flex items-center space-x-1">
                <Link
                  to="/dashboard"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-orange-50 text-orange-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/create-supply-chain"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive('/create-supply-chain')
                      ? 'bg-orange-50 text-orange-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Create Supply Chain
                </Link>
                <Link
                  to="/my-supply-chains"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive('/my-supply-chains')
                      ? 'bg-orange-50 text-orange-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  My Supply Chains
                </Link>
              </nav>
            )}
          </div>

          {/* Right: Actions and Profile */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {!isLoggedIn ? (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-3 py-1.5 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white text-xs font-semibold flex items-center justify-center ring-2 ring-orange-500/20">
                    {userInitials}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-semibold text-slate-800 leading-tight max-w-[120px] truncate">
                      {userName}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-none">
                      Planner
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Logout"
                  aria-label="Logout"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
