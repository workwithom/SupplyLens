import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_URL from '../config/api';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log('Sending registration request with data:', formData);

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed. Please try again.');
      }

      // Store token and user data
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Dispatch storage event to notify other components
        window.dispatchEvent(new Event('storage'));

        // Redirect to supply chain builder
        navigate('/create-supply-chain', { replace: true });
      } else {
        throw new Error('No authentication token received');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Could not connect to the server. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #ff6b9d, #c44569, #f8b500)'
    }}>
      {/* Floating Glassmorphism Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="backdrop-blur-md bg-white/100 border border-white/20 rounded-full shadow-xl p-4">
            <div className="flex pl-4 justify-between items-center">
              {/* Logo */}
              <div className="flex items-center space-x-2 logo-container">
                <img src="/supplylens-logo.png" alt="SupplyLens" className="h-10 w-auto object-contain" />
              </div>

              {/* Functional Navigation Menu */}
              <div className="md:flex items-center space-x-8">
                <button
                  onClick={() => navigate('/')}
                  className="text-gray-700 font-medium hover:text-orange-500 transition-colors nav-link"
                >
                  Home
                </button>
                <button
                  onClick={() => navigate('/create-supply-chain')}
                  className="text-gray-600 font-medium hover:text-orange-500 transition-colors nav-link"
                >
                  Create Supply Chain
                </button>
                {isLoggedIn && (
                  <>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="text-gray-600 font-medium hover:text-orange-500 transition-colors nav-link"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => navigate('/supply-chain-visualization')}
                      className="text-gray-600 font-medium hover:text-orange-500 transition-colors nav-link"
                    >
                      Risk Analysis
                    </button>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-4">
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-lg hover:shadow-xl"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem('token');
                        setIsLoggedIn(false);
                        navigate('/');
                      }}
                      className="px-4 py-2 text-gray-600 font-medium hover:text-orange-500 transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate('/login')}
                      className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-lg hover:shadow-xl"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => navigate('/signup')}
                      className="px-4 py-2 text-gray-600 font-medium hover:text-orange-500 transition-colors"
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full"></div>
        <div className="absolute top-20 left-32 w-16 h-16 bg-white rounded-full"></div>
        <div className="absolute top-32 left-20 w-8 h-8 bg-white rounded-full border-2 border-white"></div>

        <div className="absolute top-16 right-20 w-24 h-24 bg-white rounded-full"></div>
        <div className="absolute top-32 right-32 w-12 h-12 bg-white rounded-full"></div>
        <div className="absolute top-48 right-16 w-6 h-6 bg-white rounded-full"></div>

        <div className="absolute bottom-20 left-16 w-20 h-20 bg-white rounded-full"></div>
        <div className="absolute bottom-32 left-32 w-10 h-10 bg-white rounded-full"></div>
        <div className="absolute bottom-16 left-48 w-4 h-4 bg-white rounded-full"></div>

        <div className="absolute bottom-16 right-20 w-28 h-28 bg-white rounded-full"></div>
        <div className="absolute bottom-32 right-40 w-14 h-14 bg-white rounded-full"></div>
        <div className="absolute bottom-48 right-24 w-7 h-7 bg-white rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 pt-24">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Section - SignUp Form */}
          <div className="bg-black/20 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
            {/* Logo */}
            <div className="flex items-center mb-8">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
                <div className="w-4 h-4 bg-gradient-to-br from-pink-400 to-orange-400 rounded"></div>
              </div>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Create Account</h1>
              <p className="text-white/80">Please Enter your Account details</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg" role="alert">
                  <span className="block sm:inline">{error}</span>
                </div>
              )}

              {/* Name Field */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-center">
                <input type="checkbox" className="mr-2 rounded border-white/20 bg-black/30 text-pink-500 focus:ring-pink-500/50" />
                <label className="text-white/80 text-sm">
                  I agree to the <a href="#" className="text-pink-400 underline hover:text-pink-300">Terms and Conditions</a>
                </label>
              </div>

              {/* Sign Up Button */}
              <button
                type="submit"
                className="w-full py-3 px-6 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold rounded-full hover:from-pink-600 hover:to-orange-600 transition-all duration-300 transform hover:scale-105"
              >
                Sign up
              </button>

              {/* Social Login */}
              <div className="flex justify-center space-x-4 mt-6">
                <button className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300">
                  <span className="text-white font-bold text-lg">G</span>
                </button>
                <button className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </button>
                <button className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300">
                  <span className="text-white font-bold text-lg">f</span>
                </button>
              </div>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-white/80 text-sm">
                  Already have an account?
                  <button
                    onClick={() => navigate('/login')}
                    className="text-pink-400 underline hover:text-pink-300 ml-1"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          </div>

          {/* Right Section - Testimonial */}
          <div className="bg-black/30 backdrop-blur-xl rounded-3xl p-8 border border-white/10 relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 right-10 w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full blur-xl"></div>
              <div className="absolute bottom-10 left-10 w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full blur-xl"></div>
            </div>

            <div className="relative z-10">
              <div className="mb-8">
                <p className="text-white/80 text-sm">What's our</p>
                <h2 className="text-3xl font-bold text-white">Users Said.</h2>
              </div>

              <div className="mb-8">
                <div className="text-6xl text-white/20 mb-4">"</div>
                <p className="text-white/90 text-lg leading-relaxed">
                  Building supply chains has never been this intuitive. The platform makes complex logistics feel simple and manageable.
                </p>
              </div>

              <div className="mb-8">
                <p className="text-white font-semibold">Sarah Johnson</p>
                <p className="text-white/70 text-sm">Supply Chain Manager at TechCorp</p>
              </div>

              {/* Navigation Buttons */}
              <div className="flex space-x-3">
                <button className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center hover:bg-pink-600 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Promotional Card */}
        <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-sm rounded-2xl p-6 max-w-sm border border-white/20 shadow-2xl">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Start building resilient supply chains today</h3>
          <p className="text-gray-600 text-sm mb-4">Join thousands of companies optimizing their logistics with AI-powered insights and real-time analytics.</p>
          <div className="flex items-center justify-end space-x-2">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full border-2 border-white"></div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-green-400 rounded-full border-2 border-white"></div>
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full border-2 border-white"></div>
            </div>
            <span className="text-sm text-gray-500">+2k</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
