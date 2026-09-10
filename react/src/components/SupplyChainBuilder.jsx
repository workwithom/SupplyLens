import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Chatbot from './Chatbot';
import { TransportIcons } from './TransportIcons';
import {
  createSupplyChain,
  createSupplyChainPayload,
  createEmbeddedId,
  ALLOWED_NODE_TYPES,
  ALLOWED_CRITICALITY,
  ALLOWED_TRANSPORT_MODES,
} from '../services/supplyChainService';
import './SupplyChainBuilder.css';

const NODE_TYPES = [
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'FACTORY', label: 'Factory' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'CUSTOMER', label: 'Customer' },
];

const CRITICALITY_LEVELS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const TRANSPORT_MODES = [
  { value: 'ROAD', label: 'Road' },
  { value: 'RAIL', label: 'Rail' },
  { value: 'SEA', label: 'Sea' },
  { value: 'AIR', label: 'Air' },
  { value: 'PIPELINE', label: 'Pipeline' },
];

const renderTransportIcon = (transportMode) => {
  if (!transportMode) return null;
  const formatted = transportMode.charAt(0).toUpperCase() + transportMode.slice(1).toLowerCase();
  const IconComponent = TransportIcons[formatted];
  return IconComponent ? <IconComponent /> : null;
};

const SupplyChainBuilder = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Section 1: Supply Chain Details
  const [supplyChainName, setSupplyChainName] = useState('');
  const [description, setDescription] = useState('');

  // Section 2: Product (with stable embedded ID)
  const [product, setProduct] = useState(() => ({
    _id: createEmbeddedId(),
    name: '',
    sku: '',
    criticality: 'MEDIUM',
    dailyDemand: '',
  }));

  // Section 3: Checkpoints / Nodes (with stable embedded IDs)
  const [checkpoints, setCheckpoints] = useState(() => [
    {
      _id: createEmbeddedId(),
      name: '',
      location: '',
      type: 'SUPPLIER',
      inventoryQuantity: '0',
      capacity: '',
    },
    {
      _id: createEmbeddedId(),
      name: '',
      location: '',
      type: 'CUSTOMER',
      inventoryQuantity: '0',
      capacity: '',
    },
  ]);

  // Section 4: Routes between adjacent checkpoints (with stable embedded IDs)
  const [routes, setRoutes] = useState(() => [
    {
      _id: createEmbeddedId(),
      transportMode: 'ROAD',
      transitDays: '1',
      cost: '0',
      capacityPerDay: '',
    },
  ]);

  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  const updateProduct = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const addCheckpoint = () => {
    const newCheckpoint = {
      _id: createEmbeddedId(),
      name: '',
      location: '',
      type: 'WAREHOUSE',
      inventoryQuantity: '0',
      capacity: '',
    };

    const newRoute = {
      _id: createEmbeddedId(),
      transportMode: 'ROAD',
      transitDays: '1',
      cost: '0',
      capacityPerDay: '',
    };

    setCheckpoints((prev) => [...prev, newCheckpoint]);
    setRoutes((prev) => [...prev, newRoute]);
  };

  const removeCheckpoint = (index) => {
    if (checkpoints.length <= 2) {
      alert('A supply chain requires at least 2 checkpoints to connect a transport route.');
      return;
    }

    const nextCheckpoints = checkpoints.filter((_, i) => i !== index);
    const routeIndexToRemove = index === checkpoints.length - 1 ? index - 1 : index;
    const nextRoutes = routes.filter((_, i) => i !== routeIndexToRemove);

    setCheckpoints(nextCheckpoints);
    setRoutes(nextRoutes);
  };

  const updateCheckpoint = (index, field, value) => {
    setCheckpoints((prev) =>
      prev.map((cp, i) => (i === index ? { ...cp, [field]: value } : cp))
    );
  };

  const updateRoute = (index, field, value) => {
    setRoutes((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const validateForm = () => {
    const errors = [];

    if (!supplyChainName.trim()) {
      errors.push('Supply Chain Name is required.');
    }

    if (!product.name.trim()) {
      errors.push('Product Name is required.');
    }

    if (!ALLOWED_CRITICALITY.includes(product.criticality)) {
      errors.push(`Product Criticality must be one of: ${ALLOWED_CRITICALITY.join(', ')}.`);
    }

    if (
      product.dailyDemand === '' ||
      product.dailyDemand === null ||
      product.dailyDemand === undefined ||
      isNaN(Number(product.dailyDemand)) ||
      Number(product.dailyDemand) < 0
    ) {
      errors.push('Product Daily Demand is required and must be a non-negative number.');
    }

    if (checkpoints.length < 2) {
      errors.push('At least 2 checkpoints are required to configure a supply chain.');
    }

    checkpoints.forEach((cp, idx) => {
      const label = cp.name.trim() ? `Checkpoint "${cp.name.trim()}"` : `Checkpoint ${idx + 1}`;
      if (!cp.name.trim()) {
        errors.push(`Node Name is required for Checkpoint ${idx + 1}.`);
      }
      if (!cp.location.trim()) {
        errors.push(`Location is required for ${label}.`);
      }
      if (!ALLOWED_NODE_TYPES.includes(cp.type)) {
        errors.push(`Invalid node type for ${label}. Must be one of: ${ALLOWED_NODE_TYPES.join(', ')}.`);
      }
      if (
        cp.inventoryQuantity === '' ||
        cp.inventoryQuantity === null ||
        cp.inventoryQuantity === undefined ||
        isNaN(Number(cp.inventoryQuantity)) ||
        Number(cp.inventoryQuantity) < 0
      ) {
        errors.push(`Inventory Quantity is required for ${label} and must be a non-negative number.`);
      }
      if (
        cp.capacity !== '' &&
        cp.capacity !== null &&
        cp.capacity !== undefined &&
        (isNaN(Number(cp.capacity)) || Number(cp.capacity) < 0)
      ) {
        errors.push(`Capacity for ${label} must be a non-negative number if provided.`);
      }
    });

    routes.forEach((route, idx) => {
      const sourceName = checkpoints[idx]?.name?.trim() || `Checkpoint ${idx + 1}`;
      const destName = checkpoints[idx + 1]?.name?.trim() || `Checkpoint ${idx + 2}`;
      const routeLabel = `Route ${idx + 1} (${sourceName} ➔ ${destName})`;

      if (!ALLOWED_TRANSPORT_MODES.includes(route.transportMode)) {
        errors.push(`Transport Mode is required for ${routeLabel}. Must be one of: ${ALLOWED_TRANSPORT_MODES.join(', ')}.`);
      }
      if (
        route.transitDays === '' ||
        route.transitDays === null ||
        route.transitDays === undefined ||
        isNaN(Number(route.transitDays)) ||
        Number(route.transitDays) < 0
      ) {
        errors.push(`Transit Days is required for ${routeLabel} and must be a non-negative number.`);
      }
      if (
        route.cost === '' ||
        route.cost === null ||
        route.cost === undefined ||
        isNaN(Number(route.cost)) ||
        Number(route.cost) < 0
      ) {
        errors.push(`Cost is required for ${routeLabel} and must be a non-negative number.`);
      }
      if (
        route.capacityPerDay !== '' &&
        route.capacityPerDay !== null &&
        route.capacityPerDay !== undefined &&
        (isNaN(Number(route.capacityPerDay)) || Number(route.capacityPerDay) < 0)
      ) {
        errors.push(`Capacity Per Day for ${routeLabel} must be a non-negative number if provided.`);
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    if (isSaving) return;
    setSaveError('');
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationErrors([]);

    try {
      setIsSaving(true);
      const payload = createSupplyChainPayload({
        name: supplyChainName,
        description,
        product,
        checkpoints,
        routes,
      });

      const { supplyChain } = await createSupplyChain(payload);
      navigate(`/supply-chain-visualization/${supplyChain._id}`);
    } catch (error) {
      console.error('Error creating supply chain:', error);
      setSaveError(error.message || 'Error creating supply chain. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const currentSupplyChainData = {
    supply_chain: {
      name: supplyChainName,
      description,
    },
    product: {
      name: product.name,
      sku: product.sku,
      criticality: product.criticality,
      daily_demand: product.dailyDemand,
    },
    checkpoints: checkpoints.map((cp, idx) => ({
      name: cp.name,
      location: cp.location,
      type: cp.type,
      inventory_quantity: cp.inventoryQuantity,
      capacity: cp.capacity || null,
      outgoing_route:
        idx < routes.length
          ? {
              transport_mode: routes[idx].transportMode,
              transit_days: routes[idx].transitDays,
              cost: routes[idx].cost,
              capacity_per_day: routes[idx].capacityPerDay || null,
            }
          : null,
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-6">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-gray-600 hover:text-orange-500 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100 font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>

          <button
            onClick={() => setIsChatbotOpen(true)}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            AI Assistant
          </button>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-2xl p-8 text-white mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">Supply Chain Builder</h1>
          <p className="text-orange-100 text-center text-base max-w-2xl mx-auto">
            Design an operational supply chain network. Configure your product, checkpoint nodes, inventory levels, and inter-node transport routes.
          </p>
        </div>

        {/* Validation Errors Alert Banner */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl shadow-sm mb-8" role="alert">
            <div className="flex items-start">
              <div className="shrink-0 text-red-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-base font-semibold text-red-800">
                  Please resolve the following before saving:
                </h3>
                <ul className="mt-2 list-disc list-inside text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Save Error Alert */}
        {saveError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm mb-8" role="alert">
            <p className="text-red-700 font-medium">{saveError}</p>
          </div>
        )}

        {/* Section 1: Supply Chain Details */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border-l-4 border-orange-500">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">1. Supply Chain Details</h2>
              <p className="text-sm text-gray-500">General identification and description of your supply network</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Supply Chain Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={supplyChainName}
                onChange={(e) => setSupplyChainName(e.target.value)}
                placeholder="e.g., Electronics Global Distribution Network"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Description <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief summary of network scope, tiers, or operational objectives..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Product Information */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border-l-4 border-blue-500">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">2. Product Information</h2>
              <p className="text-sm text-gray-500">Operational specifications for the primary product moving through the chain</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={product.name}
                onChange={(e) => updateProduct('name', e.target.value)}
                placeholder="e.g., Microcontroller Chip X1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                SKU <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={product.sku}
                onChange={(e) => updateProduct('sku', e.target.value)}
                placeholder="e.g., MCU-CHIP-9000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Criticality <span className="text-red-500">*</span>
              </label>
              <select
                value={product.criticality}
                onChange={(e) => updateProduct('criticality', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white"
              >
                {CRITICALITY_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Criticality defines the priority level evaluated during disruption simulations.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Daily Demand (units/day) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={product.dailyDemand}
                onChange={(e) => updateProduct('dailyDemand', e.target.value)}
                placeholder="e.g., 25"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used by the Risk Engine to compute inventory coverage and stockout days.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Checkpoints & Routes */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-200 mb-6 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">3. Checkpoints & Transport Routes</h2>
                <p className="text-sm text-gray-500">Configure sequential checkpoint nodes and the transport routes connecting them</p>
              </div>
            </div>

            <button
              type="button"
              onClick={addCheckpoint}
              className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 self-start sm:self-auto"
            >
              <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Checkpoint
            </button>
          </div>

          {/* Sequential Checkpoints & Routes */}
          <div className="space-y-4">
            {checkpoints.map((checkpoint, index) => {
              const route = routes[index];
              const isLastCheckpoint = index === checkpoints.length - 1;

              return (
                <div key={checkpoint._id}>
                  {/* Checkpoint Node Card */}
                  <div className="checkpoint-box bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500 border border-gray-200">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-orange-600 font-bold text-sm">{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Checkpoint {index + 1}
                            {checkpoint.name.trim() && (
                              <span className="text-gray-500 font-normal text-base ml-2">
                                — {checkpoint.name.trim()}
                              </span>
                            )}
                          </h3>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-700">
                          {checkpoint.type}
                        </span>
                      </div>

                      {checkpoints.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeCheckpoint(index)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
                          title="Remove this checkpoint"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Node Information Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Node Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={checkpoint.name}
                          onChange={(e) => updateCheckpoint(index, 'name', e.target.value)}
                          placeholder="e.g., Shenzhen Fabrication Plant"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Location <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={checkpoint.location}
                          onChange={(e) => updateCheckpoint(index, 'location', e.target.value)}
                          placeholder="e.g., Shenzhen, China"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Node Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={checkpoint.type}
                          onChange={(e) => updateCheckpoint(index, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white"
                        >
                          {NODE_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Inventory Quantity (units) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={checkpoint.inventoryQuantity}
                          onChange={(e) => updateCheckpoint(index, 'inventoryQuantity', e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">Product quantity held at this node</p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Capacity (units) <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={checkpoint.capacity}
                          onChange={(e) => updateCheckpoint(index, 'capacity', e.target.value)}
                          placeholder="e.g., 5000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">Maximum storage / throughput capacity</p>
                      </div>
                    </div>
                  </div>

                  {/* Route Connector Card (Between this checkpoint and the next) */}
                  {!isLastCheckpoint && route && (
                    <div key={route._id} className="route-connector-box my-4">
                      {/* Route Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-orange-200/60 gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="p-1 bg-orange-100 text-orange-600 rounded">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </span>
                          <span className="font-semibold text-gray-800 text-sm">
                            Route {index + 1}:
                          </span>
                          <span className="text-gray-700 text-sm font-medium">
                            {checkpoint.name.trim() || `Checkpoint ${index + 1}`}
                          </span>
                          <span className="text-orange-500 font-bold">➔</span>
                          <span className="text-gray-700 text-sm font-medium">
                            {checkpoints[index + 1]?.name.trim() || `Checkpoint ${index + 2}`}
                          </span>
                        </div>
                        <span className="self-start sm:self-auto text-xs px-2.5 py-0.5 rounded-full font-semibold bg-orange-200 text-orange-800">
                          {route.transportMode}
                        </span>
                      </div>

                      {/* Route Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Transport Mode <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={route.transportMode}
                            onChange={(e) => updateRoute(index, 'transportMode', e.target.value)}
                            className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white"
                          >
                            {TRANSPORT_MODES.map((mode) => (
                              <option key={mode.value} value={mode.value}>
                                {mode.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Transit Days <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={route.transitDays}
                            onChange={(e) => updateRoute(index, 'transitDays', e.target.value)}
                            placeholder="e.g., 2"
                            className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Cost ($) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={route.cost}
                            onChange={(e) => updateRoute(index, 'cost', e.target.value)}
                            placeholder="e.g., 1500"
                            className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Capacity / Day <span className="text-gray-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={route.capacityPerDay}
                            onChange={(e) => updateRoute(index, 'capacityPerDay', e.target.value)}
                            placeholder="e.g., 500"
                            className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white"
                          />
                        </div>
                      </div>

                      {/* Animated Connection Visual */}
                      <div className="mt-4 pt-2">
                        <div className="transport-connection">
                          <div className="transport-line">
                            <div className="transport-icon">
                              {renderTransportIcon(route.transportMode)}
                            </div>
                          </div>
                        </div>
                        <div className="text-center text-xs text-gray-600 mt-2 font-medium">
                          {route.transportMode} transport • {route.transitDays || 0} transit days • ${route.cost || 0} cost
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Section */}
        <div className="text-center mt-8">
          {validationErrors.length > 0 && (
            <p className="mb-4 text-sm text-red-600 font-medium">
              Please fix the validation errors above before creating the supply chain.
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-12 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg font-semibold rounded-full hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span className="flex items-center justify-center">
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Saving Supply Chain...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Create Supply Chain
                </>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Chatbot Modal */}
      <Chatbot
        supplyChainData={currentSupplyChainData}
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
      />

      {/* Floating Chat Button */}
      {!isChatbotOpen && (
        <button
          type="button"
          onClick={() => setIsChatbotOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 z-40 flex items-center justify-center transform hover:scale-110"
          title="Open AI Assistant"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SupplyChainBuilder;
