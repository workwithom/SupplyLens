import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

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

  return (
    <div className="h-screen bg-gray-50" style={{ backgroundImage: "url('/supplylens-bg.jpg')", backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}>
      {/* Single Glassmorphism Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-4">
        <div className="max-w-7xl  mx-auto">
          <div className="backdrop-blur-md bg-white/100 border border-white/20 rounded-full shadow-xl p-4">
            <div className="flex  pl-4 justify-between items-center">
              {/* Logo */}
              <div className="flex items-center space-x-2 logo-container">
                <img src="/supplylens-logo.png" alt="SupplyLens" className="h-10 w-auto object-contain" />
              </div>

              {/* Functional Navigation Menu */}
              <div className=" md:flex items-center space-x-8">
                <a href="/" className="text-gray-700 font-medium hover:text-orange-500 transition-colors nav-link">Home</a>
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
                  <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-lg hover:shadow-xl"
                  >
                    Login / Register
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Brand Banner - shown first */}
      <section className="pt-56 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="relative inline-block pt-20">
            <div className="text-9xl lg:text-18xl font-extrabold tracking-tight brand-bounce" style={{ fontFamily: 'monospace' }}>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-red-600 to-pink-600">SUPPLY</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-red-400 to-pink-400"> LENS</span>
            </div>
            <p className="mt-3 text-base md:text-lg text-gray-600">BEYOND RESILIENCE, TOWARD SUPREMACY.</p>
          </div>
        </div>
      </section>

      {/* Hero Section - Enhanced */}
      <div className="relative min-h-screen flex items-center px-6 pt-32 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full mt-50">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              {/* Pagination */}
              <div className="text-sm text-gray-500 font-medium">[1/8]</div>

              {/* Main Headline */}
              <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
                BUILDING SUPPLY CHAINS THAT
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-pink-500">STICK</span>
              </h1>

              {/* Description */}
              <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                We craft supply chain visualizations, impact analysis, and risk management solutions that drive operational efficiency, resilience, and long-term growth.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/create-supply-chain')}
                  className="px-8 py-4 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors transform hover:-translate-y-1 hover:shadow-lg cta-button"
                >
                  Get Started
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-8 py-4 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors cta-button"
                >
                  Contact Us
                </button>
                <div className="flex items-center gap-3 text-sm text-gray-500 pt-1">
                  <div className="flex -space-x-2">
                    <img alt="avatar" src={`https://api.dicebear.com/7.x/identicon/svg?seed=1`} className="w-6 h-6 rounded-full border border-white" />
                    <img alt="avatar" src={`https://api.dicebear.com/7.x/identicon/svg?seed=2`} className="w-6 h-6 rounded-full border border-white" />
                    <img alt="avatar" src={`https://api.dicebear.com/7.x/identicon/svg?seed=3`} className="w-6 h-6 rounded-full border border-white" />
                  </div>
                  <span>Trusted by 1,200+ teams</span>
                </div>
              </div>
            </div>

            {/* Right Content - 3D Illustration */}
            <div className="relative">
              {/* Main 3D Computer */}
              <div className="relative w-80 h-80 mx-auto">
                {/* Monitor */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-64 h-40 bg-orange-500 rounded-lg shadow-2xl computer-monitor">
                  <div className="absolute top-2 left-2 right-2 bottom-2 bg-white rounded-md">
                    {/* Screen Content */}
                    <div className="p-3">
                      <div className="w-full h-2 bg-gray-300 rounded mb-2"></div>
                      <div className="w-3/4 h-2 bg-gray-300 rounded mb-2"></div>
                      <div className="w-1/2 h-2 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                  {/* Webcam */}
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full"></div>
                </div>

                {/* Keyboard */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-72 h-16 bg-white rounded-lg shadow-xl border-2 border-gray-200 computer-keyboard"></div>

                {/* Stand */}
                <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-4 h-16 bg-orange-400 rounded-full"></div>
              </div>

              {/* Floating Elements */}
              <div className="absolute top-10 right-10 w-12 h-12 bg-yellow-400 rounded-lg shadow-lg flex items-center justify-center floating-element">
                <span className="text-2xl">😊</span>
              </div>

              <div className="absolute top-20 left-10 w-10 h-10 bg-yellow-400 rounded-lg shadow-lg flex items-center justify-center floating-element">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <div className="absolute bottom-20 right-20 w-8 h-16 bg-white rounded-lg shadow-lg transform rotate-12 floating-element"></div>

              <div className="absolute bottom-32 left-20 w-6 h-6 bg-orange-300 rounded-full shadow-lg floating-element"></div>

              <div className="absolute top-40 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-white rounded-lg shadow-lg transform -rotate-45 floating-element"></div>

              <div className="absolute bottom-40 right-32 w-8 h-8 bg-yellow-400 rounded-full shadow-lg flex items-center justify-center floating-element">
                <span className="text-lg">😊</span>
              </div>

              {/* Growth Statistic - Moved up to avoid overlap */}
              <div className="absolute -top-20 right-0 bg-white rounded-lg shadow-lg p-4 border-l-4 border-green-500 growth-stat">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-lg font-bold text-green-600">132% GROWTH</span>
                </div>
                <p className="text-sm text-gray-600 max-w-xs">
                  Our clients see measurable operational improvement through strategic supply chain visualization and AI-powered analysis.
                </p>
              </div>

              {/* Social Media Icons */}
              <div className="absolute top-0 right-0 flex flex-col space-y-4 mt-32">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg social-icon">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                  </svg>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg social-icon">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg social-icon">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Background gradient blobs */}

        <div className="pointer-events-none absolute -bottom-20 -right-20 w-[28rem] h-[28rem] bg-pink-200/40 rounded-full blur-3xl"></div>
      </div>

      {/* Trusted By Logos */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-500 text-sm mb-6">Trusted by forward-thinking teams</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 items-center opacity-80">
            {['Acme','Globex','Umbrella','Initech','Stark','Wayne'].map((brand) => (
              <div key={brand} className="flex items-center justify-center">
                <span className="text-gray-400 font-semibold tracking-widest text-sm">{brand.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Removed previous Bottom Section brand block to avoid duplication */}

      {/* KPI Stats */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[{k:'Avg. Risk Reduction',v:'38%'},{k:'Deployment Time',v:'< 7 days'},{k:'Scenario Runs',v:'10k+/mo'},{k:'Customer NPS',v:'72'}].map((item) => (
            <div key={item.k} className="p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className="text-3xl font-extrabold text-gray-900">{item.v}</div>
              <div className="text-sm text-gray-500 mt-1">{item.k}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {step:'01',title:'Model your chain',desc:'Define suppliers, plants, DCs, transports and constraints with guided templates.'},
              {step:'02',title:'Simulate scenarios',desc:'Run multi-factor disruptions, demand spikes and network changes in minutes.'},
              {step:'03',title:'Act with insight',desc:'Get clear recommendations, risk scores and ROI impact to decide faster.'},
            ].map((card) => (
              <div key={card.step} className="relative p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition">
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center shadow-lg">{card.step}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-gray-600">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <div className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose SupplyLens?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform provides everything you need to create comprehensive supply chain visualizations
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6 rounded-xl hover:shadow-lg transition-all duration-300 feature-card">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Interactive Mapping</h3>
              <p className="text-gray-600">Create visual supply chains with interactive checkpoints and real-time updates</p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6 rounded-xl hover:shadow-lg transition-all duration-300 feature-card">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Analysis</h3>
              <p className="text-gray-600">Get intelligent insights and recommendations for your supply chain operations</p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6 rounded-xl hover:shadow-lg transition-all duration-300 feature-card">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Risk Management</h3>
              <p className="text-gray-600">Identify and mitigate risks with comprehensive analysis and reporting</p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">Teams get results with SupplyLens</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[1,2,3].map((i) => (
              <div key={i} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <img alt="avatar" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} className="w-10 h-10 rounded-full" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Ops Lead #{i}</div>
                    <div className="text-xs text-gray-500">Consumer Goods</div>
                  </div>
                </div>
                <p className="text-gray-700">“We cut disruption response from weeks to hours and saw immediate service-level gains.”</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-10">Frequently asked questions</h2>
          <div className="divide-y divide-gray-200 border border-gray-100 rounded-2xl">
            {[
              {q:'Do I need data to get started?',a:'No. You can begin with our guided templates and refine with your data over time.'},
              {q:'Can I integrate with my tools?',a:'Yes. We support CSV uploads today and API-based integrations on request.'},
              {q:'Is there a free trial?',a:'We offer a sandbox to model a sample network and run basic scenarios.'},
            ].map((item, idx) => (
              <div key={item.q} className="p-5">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full flex items-center justify-between text-left">
                  <span className="font-semibold text-gray-900">{item.q}</span>
                  <span className={`ml-3 transition-transform ${openFaqIndex === idx ? 'rotate-45' : ''}`}>
                    <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14"/></svg>
                  </span>
                </button>
                {openFaqIndex === idx && (
                  <p className="mt-3 text-gray-600">{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <div className="py-20 px-6 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Build Your Supply Chain?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Start creating your customized supply chain visualization today
          </p>
          <button
            onClick={() => navigate('/create-supply-chain')}
            className="px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300"
          >
            Get Started Now
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <img src="/supplylens-logo.png" alt="SupplyLens" className="h-8 w-auto object-contain" />
          </div>
          <p className="text-gray-400">© 2024 SupplyLens. All rights reserved.</p>
        </div>
      </footer>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-auto z-50">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white/90 backdrop-blur shadow-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm md:text-base text-gray-700">
            <span className="font-semibold text-gray-900">Start modeling today</span> — your first scenario is on us.
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/create-supply-chain')}
              className="px-5 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600">
              Create Supply Chain
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200">
              Explore Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
