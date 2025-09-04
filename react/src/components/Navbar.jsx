import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  // Don't render navbar on home page (/), login page, and signup page since they have their own floating navbar
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-gray-900 font-bold text-xl">
          Supply Lens
        </Link>
        <div className="flex space-x-4">
          <Link
            to="/risk-analysis"
            className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition-colors"
          >
            Risk Analysis
          </Link>
          {!isLoggedIn ? (
            <>
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition-colors"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/create-supply-chain"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition-colors"
              >
                Create Supply Chain
              </Link>
              <Link
                to="/supply-chain-visualization"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition-colors"
              >
                View Routes
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition-colors"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
