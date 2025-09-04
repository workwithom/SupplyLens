import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [selectedGrade, setSelectedGrade] = useState('All Grades');

  // Fake data for supply chain metrics
  const metricsData = [
    {
      title: 'Total Supply Chains',
      value: '156',
      icon: '📊',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      watermark: '🌱'
    },
    {
      title: 'Active Checkpoints',
      value: '2,847',
      icon: '📍',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600',
      watermark: '🌱'
    },
    {
      title: 'Total Routes',
      value: '89',
      icon: '🛣️',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      watermark: '🌱'
    },
    {
      title: 'Monthly Revenue',
      value: '$42.3k',
      icon: '💰',
      bgColor: 'bg-pink-100',
      textColor: 'text-pink-600',
      watermark: '🌱'
    }
  ];

  // Fake data for supply chain performance
  const performanceData = [
    {
      name: 'Electronics Supply Chain',
      id: 'SC-2024-001',
      class: 'High Priority',
      grade: 'A+',
      efficiency: '98.5%'
    },
    {
      name: 'Food & Beverage Chain',
      id: 'SC-2024-002',
      class: 'Medium Priority',
      grade: 'B+',
      efficiency: '87.2%'
    },
    {
      name: 'Automotive Parts Chain',
      id: 'SC-2024-003',
      class: 'High Priority',
      grade: 'A',
      efficiency: '94.8%'
    },
    {
      name: 'Pharmaceutical Chain',
      id: 'SC-2024-004',
      class: 'Critical Priority',
      grade: 'A+',
      efficiency: '99.1%'
    }
  ];

  // Fake data for supply chain distribution
  const distributionData = [
    { category: 'Manufacturing', count: 45, percentage: 28.8, color: 'bg-orange-500' },
    { category: 'Retail', count: 38, percentage: 24.4, color: 'bg-blue-500' },
    { category: 'Healthcare', count: 32, percentage: 20.5, color: 'bg-green-500' },
    { category: 'Technology', count: 25, percentage: 16.0, color: 'bg-purple-500' },
    { category: 'Others', count: 16, percentage: 10.3, color: 'bg-gray-500' }
  ];

  // Fake data for attendance/performance chart
  const chartData = [
    { date: '10-Jun', present: 145, absent: 11 },
    { date: '12-Jun', present: 142, absent: 14 },
    { date: '14-Jun', present: 148, absent: 8 },
    { date: '16-Jun', present: 150, absent: 6 },
    { date: '18-Jun', present: 160, absent: 4 },
    { date: '20-Jun', present: 155, absent: 9 },
    { date: '22-Jun', present: 158, absent: 7 },
    { date: '24-Jun', present: 162, absent: 3 },
    { date: '26-Jun', present: 159, absent: 5 }
  ];

  // Fake upcoming events
  const upcomingEvents = [
    {
      date: '28 Jun, 2024',
      event: 'Supply Chain Optimization Workshop',
      icon: '📚'
    },
    {
      date: '30 Jun, 2024',
      event: 'Q2 Performance Review Meeting',
      icon: '📊'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">SL</span>
              </div>
              <span className="text-xl font-bold text-gray-900">SupplyLens</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                </svg>
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
                  JS
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Jack Snyder</div>
                  <div className="text-gray-500">jack@supplylens.com</div>
                </div>
              </div>
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
              <a href="#" className="flex items-center space-x-3 px-4 py-3 bg-orange-100 text-orange-700 rounded-lg font-medium">
                <span>📊</span>
                <span>Dashboard</span>
              </a>
              <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                <span>🔗</span>
                <span>Supply Chains</span>
              </a>
              <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                <span>📍</span>
                <span>Checkpoints</span>
              </a>
              <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                <span>🛣️</span>
                <span>Routes</span>
              </a>
              <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                <span>💰</span>
                <span>Revenue</span>
              </a>
              <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                <span>📧</span>
                <span>Messages</span>
              </a>
              <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg">
                <span>⚙️</span>
                <span>Settings</span>
              </a>
            </nav>

            <div className="mt-8 text-center">
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Good Morning, Jack</h1>
            <p className="text-gray-600">Welcome to SupplyLens Dashboard</p>

            <div className="mt-6 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search supply chains, checkpoints..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metricsData.map((metric, index) => (
              <div key={index} className={`${metric.bgColor} rounded-xl p-6 relative overflow-hidden metrics-card`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{metric.title}</p>
                    <p className={`text-3xl font-bold ${metric.textColor}`}>{metric.value}</p>
                  </div>
                  <span className="text-3xl">{metric.icon}</span>
                </div>
                <div className="absolute top-2 right-2 text-4xl opacity-20">{metric.watermark}</div>
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Charts and Data Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Performance Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm chart-container">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Supply Chain Performance (June 2024)</h3>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
                >
                  <option>Last 10 Days</option>
                  <option>Last 30 Days</option>
                  <option>Last 3 Months</option>
                </select>
              </div>

              <div className="space-y-4">
                {chartData.map((data, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-20 text-sm text-gray-600">{data.date}</div>
                    <div className="flex-1 flex space-x-2">
                      <div className="flex-1 bg-orange-500 rounded h-8 flex items-center justify-center text-white text-sm font-medium chart-bar">
                        {data.present}
                      </div>
                      <div className="flex-1 bg-gray-800 rounded h-8 flex items-center justify-center text-white text-sm font-medium chart-bar">
                        {data.absent}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center space-x-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
                    <span className="text-sm text-gray-600">Inactive</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Distribution Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Supply Chain Distribution</h3>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
                >
                  <option>All Classes</option>
                  <option>High Priority</option>
                  <option>Medium Priority</option>
                  <option>Low Priority</option>
                </select>
              </div>

              <div className="space-y-4">
                {distributionData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between distribution-item p-2 rounded">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 ${item.color} rounded-full`}></div>
                      <span className="text-sm text-gray-700">{item.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{item.count}</div>
                      <div className="text-xs text-gray-500">{item.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Table */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-8 performance-table">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Supply Chain Performance</h3>
              <div className="flex space-x-4">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
                >
                  <option>All Classes</option>
                  <option>High Priority</option>
                  <option>Medium Priority</option>
                  <option>Low Priority</option>
                </select>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
                >
                  <option>All Grades</option>
                  <option>A+</option>
                  <option>A</option>
                  <option>B+</option>
                  <option>B</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Priority</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Grade</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {item.name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{item.id}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.class === 'High Priority' ? 'bg-red-100 text-red-800' :
                          item.class === 'Critical Priority' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.class}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.grade === 'A+' ? 'bg-green-100 text-green-800' :
                          item.grade === 'A' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">{item.efficiency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white shadow-sm min-h-screen p-6 right-sidebar">
          {/* User Profile */}
          <div className="text-center mb-8 user-profile">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
              JS
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Jack Snyder</h3>
            <p className="text-sm text-gray-500">jack@supplylens.com</p>
          </div>

          {/* Call to Action */}
          <div className="bg-orange-500 rounded-xl p-6 text-white mb-8 cta-card">
            <h4 className="font-semibold mb-3">Join the community and find out more</h4>
            <button className="w-full bg-white text-orange-500 py-2 px-4 rounded-lg font-medium hover:bg-gray-100 transition-colors">
              Explore Now
            </button>
          </div>

          {/* Calendar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-gray-900">June 2024</h4>
              <div className="flex space-x-2">
                <button className="text-gray-400 hover:text-gray-600 calendar-nav p-1 rounded">‹</button>
                <button className="text-gray-400 hover:text-gray-600 calendar-nav p-1 rounded">›</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-xs">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={index} className="text-center py-2 text-gray-500">{day}</div>
              ))}
              {Array.from({ length: 30 }, (_, i) => (
                <div key={i + 1} className={`text-center py-2 text-sm calendar-day ${
                  i + 1 === 25 ? 'bg-orange-500 text-white rounded-full' :
                  [28, 30].includes(i + 1) ? 'relative' : 'text-gray-900'
                }`}>
                  {i + 1}
                  {[28, 30].includes(i + 1) && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Upcoming Events</h4>
            <div className="space-y-3">
              {upcomingEvents.map((event, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg event-card">
                  <span className="text-orange-500">{event.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{event.event}</div>
                    <div className="text-xs text-gray-500">{event.date}</div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
