import { useState, useEffect, useMemo, useRef } from 'react';
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

// ─── Constants ───────────────────────────────────────────────────────────────

const NODE_TYPES = [
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'FACTORY', label: 'Factory' },
  { value: 'CUSTOMER', label: 'Customer' },
];

const CRITICALITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const TRANSPORT_MODES = [
  { value: 'ROAD', label: 'Road', emoji: '🚛' },
  { value: 'RAIL', label: 'Rail', emoji: '🚆' },
  { value: 'SEA', label: 'Sea', emoji: '🚢' },
  { value: 'AIR', label: 'Air', emoji: '✈️' },
  { value: 'PIPELINE', label: 'Pipeline', emoji: '🛢️' },
];

const getTransportEmoji = (mode) => {
  const match = TRANSPORT_MODES.find((m) => m.value === mode);
  return match ? match.emoji : '🚚';
};

const renderTransportIcon = (transportMode) => {
  if (!transportMode) return null;
  const formatted = transportMode.charAt(0).toUpperCase() + transportMode.slice(1).toLowerCase();
  const IconComponent = TransportIcons[formatted];
  return IconComponent ? (
    <span className="w-4 h-4 inline-flex items-center justify-center">
      <IconComponent />
    </span>
  ) : (
    <span>{getTransportEmoji(transportMode)}</span>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const SupplyChainBuilder = () => {
  const navigate = useNavigate();

  // Section references for smooth scrolling from stepper
  const section1Ref = useRef(null);
  const section2Ref = useRef(null);
  const section3Ref = useRef(null);
  const section4Ref = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // ── State: Section 1 (Supply Chain Details) ────────────────────────────────
  const [supplyChainName, setSupplyChainName] = useState('');
  const [description, setDescription] = useState('');

  // ── State: Section 2 (Product Information) ─────────────────────────────────
  const [product, setProduct] = useState(() => ({
    _id: createEmbeddedId(),
    name: '',
    sku: '',
    criticality: 'MEDIUM',
    dailyDemand: '',
  }));

  // ── State: Section 3 (Checkpoints / Nodes) ──────────────────────────────────
  const [nodes, setNodes] = useState(() => {
    const supplierId = createEmbeddedId();
    const customerId = createEmbeddedId();

    return [
      {
        _id: supplierId,
        name: '',
        location: '',
        type: 'SUPPLIER',
        inventoryQuantity: '',
        capacity: '',
      },
      {
        _id: customerId,
        name: '',
        location: '',
        type: 'CUSTOMER',
        inventoryQuantity: '',
        capacity: '',
      },
    ];
  });

  // ── State: Section 3 (Transport Routes with Alternates) ────────────────────
  const [routes, setRoutes] = useState(() => []);

  // Initialize initial route connecting the initial checkpoints with blank inputs
  useEffect(() => {
    if (routes.length === 0 && nodes.length >= 2) {
      setRoutes([
        {
          _id: createEmbeddedId(),
          sourceNodeId: nodes[0]._id,
          destinationNodeId: nodes[1]._id,
          transportMode: 'ROAD',
          transitDays: '',
          cost: '',
          capacityPerDay: '',
        },
      ]);
    }
  }, [nodes, routes.length]);

  // ── UI States ──────────────────────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState(1);
  const [showNetworkPreview, setShowNetworkPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // ── Route Semantic Classification (Primary vs Alternate) ───────────────────
  const routeClassificationMap = useMemo(() => {
    const map = new Map();
    const seenPairs = new Map();

    routes.forEach((route) => {
      const pairKey = `${route.sourceNodeId}➔${route.destinationNodeId}`;
      const count = seenPairs.get(pairKey) || 0;
      seenPairs.set(pairKey, count + 1);

      // First route between this pair is PRIMARY; subsequent routes are ALTERNATE
      map.set(route._id, {
        isAlternate: count > 0,
        label: count === 0 ? 'PRIMARY' : 'ALTERNATE',
        pairKey,
      });
    });

    return map;
  }, [routes]);

  const alternateRoutesCount = useMemo(() => {
    let count = 0;
    for (const info of routeClassificationMap.values()) {
      if (info.isAlternate) count++;
    }
    return count;
  }, [routeClassificationMap]);

  // ── Node Actions ───────────────────────────────────────────────────────────
  const updateProduct = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const addNode = () => {
    const newNode = {
      _id: createEmbeddedId(),
      name: '',
      location: '',
      type: 'WAREHOUSE',
      inventoryQuantity: '0',
      capacity: '',
    };
    setNodes((prev) => [...prev, newNode]);
  };

  const removeNode = (nodeIdToRemove) => {
    if (nodes.length <= 2) {
      alert('A supply chain requires at least 2 checkpoints to configure transport routes.');
      return;
    }

    // Remove node
    setNodes((prev) => prev.filter((n) => n._id !== nodeIdToRemove));

    // Remove any routes connected to this node to prevent orphaned relationships
    setRoutes((prev) =>
      prev.filter(
        (r) => r.sourceNodeId !== nodeIdToRemove && r.destinationNodeId !== nodeIdToRemove
      )
    );
  };

  const updateNode = (nodeId, field, value) => {
    setNodes((prev) =>
      prev.map((n) => (n._id === nodeId ? { ...n, [field]: value } : n))
    );
  };

  // ── Route Actions ──────────────────────────────────────────────────────────
  const addRoute = (initialSourceId = null, initialDestId = null) => {
    let sourceId = initialSourceId;
    let destId = initialDestId;

    if (!sourceId && nodes.length >= 2) {
      sourceId = nodes[0]._id;
      destId = nodes[1]._id;
    }

    const newRoute = {
      _id: createEmbeddedId(),
      sourceNodeId: sourceId,
      destinationNodeId: destId,
      transportMode: 'ROAD',
      transitDays: '',
      cost: '',
      capacityPerDay: '',
    };

    setRoutes((prev) => [...prev, newRoute]);
  };

  const addAlternateRouteFor = (sourceNodeId, destinationNodeId, currentMode) => {
    // Suggest a different transport mode
    const modes = ['AIR', 'ROAD', 'RAIL', 'SEA'];
    const altMode = modes.find((m) => m !== currentMode) || 'AIR';

    const newRoute = {
      _id: createEmbeddedId(),
      sourceNodeId,
      destinationNodeId,
      transportMode: altMode,
      transitDays: '',
      cost: '',
      capacityPerDay: '',
    };

    setRoutes((prev) => [...prev, newRoute]);
  };

  const removeRoute = (routeId) => {
    if (routes.length <= 1) {
      alert('At least 1 transport route is required in the supply chain network.');
      return;
    }
    setRoutes((prev) => prev.filter((r) => r._id !== routeId));
  };

  const updateRoute = (routeId, field, value) => {
    setRoutes((prev) =>
      prev.map((r) => (r._id === routeId ? { ...r, [field]: value } : r))
    );
  };

  // ── Validation ─────────────────────────────────────────────────────────────
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
      isNaN(Number(product.dailyDemand)) ||
      Number(product.dailyDemand) < 0
    ) {
      errors.push('Product Daily Demand is required and must be a non-negative number.');
    }

    if (nodes.length < 2) {
      errors.push('At least 2 checkpoints are required to configure a supply chain.');
    }

    nodes.forEach((node, idx) => {
      const label = node.name.trim() ? `Checkpoint "${node.name.trim()}"` : `Checkpoint ${idx + 1}`;
      if (!node.name.trim()) {
        errors.push(`Node Name is required for Checkpoint ${idx + 1}.`);
      }
      if (!node.location.trim()) {
        errors.push(`Location is required for ${label}.`);
      }
      if (!ALLOWED_NODE_TYPES.includes(node.type)) {
        errors.push(`Invalid node type for ${label}.`);
      }
      if (
        node.inventoryQuantity === '' ||
        node.inventoryQuantity === null ||
        isNaN(Number(node.inventoryQuantity)) ||
        Number(node.inventoryQuantity) < 0
      ) {
        errors.push(`Inventory Quantity is required for ${label} and must be a non-negative number.`);
      }
      if (
        node.capacity !== '' &&
        node.capacity !== null &&
        (isNaN(Number(node.capacity)) || Number(node.capacity) < 0)
      ) {
        errors.push(`Capacity for ${label} must be a non-negative number if specified.`);
      }
    });

    if (routes.length === 0) {
      errors.push('At least one transport route must be configured.');
    }

    routes.forEach((route, idx) => {
      const sourceNode = nodes.find((n) => n._id === route.sourceNodeId);
      const destNode = nodes.find((n) => n._id === route.destinationNodeId);
      const routeLabel = `Route ${idx + 1} (${sourceNode?.name || 'Source'} ➔ ${destNode?.name || 'Dest'})`;

      if (!route.sourceNodeId || !sourceNode) {
        errors.push(`Source node is missing or invalid for Route ${idx + 1}.`);
      }
      if (!route.destinationNodeId || !destNode) {
        errors.push(`Destination node is missing or invalid for Route ${idx + 1}.`);
      }
      if (route.sourceNodeId && route.destinationNodeId && route.sourceNodeId === route.destinationNodeId) {
        errors.push(`Route ${idx + 1} source and destination nodes cannot be the same.`);
      }
      if (!ALLOWED_TRANSPORT_MODES.includes(route.transportMode)) {
        errors.push(`Transport Mode is required for ${routeLabel}.`);
      }
      if (
        route.transitDays === '' ||
        route.transitDays === null ||
        isNaN(Number(route.transitDays)) ||
        Number(route.transitDays) < 0
      ) {
        errors.push(`Transit Days is required for ${routeLabel} and must be a non-negative number.`);
      }
      if (
        route.cost === '' ||
        route.cost === null ||
        isNaN(Number(route.cost)) ||
        Number(route.cost) < 0
      ) {
        errors.push(`Cost is required for ${routeLabel} and must be a non-negative number.`);
      }
      if (
        route.capacityPerDay !== '' &&
        route.capacityPerDay !== null &&
        (isNaN(Number(route.capacityPerDay)) || Number(route.capacityPerDay) < 0)
      ) {
        errors.push(`Capacity Per Day for ${routeLabel} must be a non-negative number if specified.`);
      }
    });

    // Check for exact duplicates
    const routeSignatures = new Set();
    routes.forEach((r, idx) => {
      const sig = `${r.sourceNodeId}|${r.destinationNodeId}|${r.transportMode}|${r.transitDays}|${r.cost}`;
      if (routeSignatures.has(sig)) {
        errors.push(`Route ${idx + 1} is completely identical to another route. Adjust mode, transit time, or cost.`);
      } else {
        routeSignatures.add(sig);
      }
    });

    return errors;
  };

  // ── Submit Handler ─────────────────────────────────────────────────────────
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
        nodes,
        routes,
      });

      const response = await createSupplyChain(payload);
      if (response && response.supplyChain?._id) {
        navigate(`/supply-chain-visualization/${response.supplyChain._id}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error creating supply chain:', err);
      setSaveError(err.message || 'Error creating supply chain. Please check your connection and inputs.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const scrollToSection = (ref, stepIndex) => {
    setActiveStep(stepIndex);
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ── Node Maps for fast lookups ──────────────────────────────────────────────
  const nodeMap = useMemo(() => {
    const map = new Map();
    nodes.forEach((n, idx) => {
      map.set(n._id, { ...n, index: idx + 1 });
    });
    return map;
  }, [nodes]);

  // Group routes by pair for review section
  const routesByPair = useMemo(() => {
    const map = new Map();
    routes.forEach((r) => {
      const key = `${r.sourceNodeId}➔${r.destinationNodeId}`;
      if (!map.has(key)) {
        map.set(key, {
          sourceNodeId: r.sourceNodeId,
          destinationNodeId: r.destinationNodeId,
          routes: [],
        });
      }
      map.get(key).routes.push(r);
    });
    return Array.from(map.values());
  }, [routes]);

  // ── Chatbot payload compatibility ──────────────────────────────────────────
  const currentSupplyChainData = useMemo(() => {
    return {
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
      checkpoints: nodes.map((node) => ({
        name: node.name,
        location: node.location,
        type: node.type,
        inventory_quantity: node.inventoryQuantity,
        capacity: node.capacity,
      })),
      routes: routes.map((route) => ({
        sourceNodeId: route.sourceNodeId,
        destinationNodeId: route.destinationNodeId,
        transport_mode: route.transportMode,
        transit_days: route.transitDays,
        cost: route.cost,
        capacity_per_day: route.capacityPerDay,
      })),
    };
  }, [supplyChainName, description, product, nodes, routes]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="sc-builder-container">
      {/* ───────────────────────────────────────────────────────────────────
          PAGE HEADER
         ─────────────────────────────────────────────────────────────────── */}
      <header className="builder-header">
        <div className="builder-header__top">
          <div className="builder-title-group">
            <div className="builder-tag">
              <span>⛓️</span>
              <span>Network Configuration</span>
            </div>
            <h1 className="builder-title">Supply Chain Builder</h1>
            <p className="builder-subtitle">
              Design an operational supply chain network. Configure nodes, inventory buffers, and multi-modal transport connections with alternate routes for resilience analysis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary-action text-xs"
            >
              ← Dashboard
            </button>
            <button
              type="button"
              onClick={() => setShowNetworkPreview((prev) => !prev)}
              className="btn-secondary-action text-xs"
            >
              <span>{showNetworkPreview ? 'Hide Network' : '🗺️ Preview Network'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────────────
          PROGRESS STEPPER INDICATOR
         ─────────────────────────────────────────────────────────────────── */}
      <nav className="stepper-nav" aria-label="Progress Stepper">
        <div
          className={`step-item ${activeStep === 1 ? 'step-item--active' : ''}`}
          onClick={() => scrollToSection(section1Ref, 1)}
        >
          <span className="step-number">1</span>
          <span className="step-label">Supply Chain Details</span>
        </div>
        <span className="step-divider">›</span>

        <div
          className={`step-item ${activeStep === 2 ? 'step-item--active' : ''}`}
          onClick={() => scrollToSection(section2Ref, 2)}
        >
          <span className="step-number">2</span>
          <span className="step-label">Product Information</span>
        </div>
        <span className="step-divider">›</span>

        <div
          className={`step-item ${activeStep === 3 ? 'step-item--active' : ''}`}
          onClick={() => scrollToSection(section3Ref, 3)}
        >
          <span className="step-number">3</span>
          <span className="step-label">Nodes & Routes</span>
        </div>
        <span className="step-divider">›</span>

        <div
          className={`step-item ${activeStep === 4 ? 'step-item--active' : ''}`}
          onClick={() => scrollToSection(section4Ref, 4)}
        >
          <span className="step-number">4</span>
          <span className="step-label">Review & Save</span>
        </div>
      </nav>

      {/* ───────────────────────────────────────────────────────────────────
          ERROR ALERTS
         ─────────────────────────────────────────────────────────────────── */}
      {validationErrors.length > 0 && (
        <div className="validation-alert-box" role="alert">
          <div className="validation-alert-title">
            <span>⚠️</span>
            <span>Please correct the following issues:</span>
          </div>
          <ul className="validation-alert-list">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {saveError && (
        <div className="validation-alert-box" role="alert">
          <div className="validation-alert-title">
            <span>⚠️</span>
            <span>Failed to save supply chain:</span>
          </div>
          <p className="text-sm mt-1">{saveError}</p>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          COLLAPSIBLE NETWORK PREVIEW
         ─────────────────────────────────────────────────────────────────── */}
      {showNetworkPreview && (
        <section className="network-preview-panel">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>🗺️</span>
              <span>Logical Network Topology Preview</span>
            </h3>
            <span className="text-xs text-slate-500">
              {nodes.length} nodes • {routes.length} routes ({alternateRoutesCount} alternate)
            </span>
          </div>

          <div className="preview-flow-track">
            {nodes.map((node, index) => {
              // Find routes originating from this node
              const outgoingRoutes = routes.filter((r) => r.sourceNodeId === node._id);

              return (
                <div key={node._id} className="flex items-center gap-2">
                  <div className="preview-node-chip">
                    <div className="text-[10px] font-bold uppercase text-slate-400">
                      #{index + 1} {node.type}
                    </div>
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {node.name || `Node ${index + 1}`}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {node.location || 'Location unspecified'}
                    </div>
                  </div>

                  {outgoingRoutes.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold">➔</span>
                      <div className="preview-routes-bundle">
                        {outgoingRoutes.map((r) => {
                          const cls = routeClassificationMap.get(r._id);
                          const dest = nodeMap.get(r.destinationNodeId);
                          return (
                            <span
                              key={r._id}
                              className={`preview-route-tag ${
                                cls?.isAlternate
                                  ? 'preview-route-tag--alternate'
                                  : 'preview-route-tag--primary'
                              }`}
                            >
                              {getTransportEmoji(r.transportMode)} {r.transportMode} to {dest?.name || 'Destination'} ({r.transitDays}d, ₹{Number(r.cost || 0).toLocaleString('en-IN')})
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          SECTION 1 — SUPPLY CHAIN DETAILS
         ─────────────────────────────────────────────────────────────────── */}
      <section ref={section1Ref} className="builder-section-card builder-section-card--orange">
        <div className="section-card-header">
          <div>
            <h2 className="section-card-title">
              <span className="text-orange-500">1.</span>
              <span>Supply Chain Details</span>
            </h2>
            <p className="section-card-subtitle">
              Identify and describe your operational supply chain model.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="scNameInput" className="form-label">
              <span>Supply Chain Name *</span>
            </label>
            <input
              id="scNameInput"
              type="text"
              value={supplyChainName}
              onChange={(e) => setSupplyChainName(e.target.value)}
              placeholder="e.g. Consumer Electronics Distribution Network"
              className="form-input"
              maxLength={120}
              required
            />
            <p className="form-helper">A clear operational title for this network configuration.</p>
          </div>

          <div className="form-group">
            <label htmlFor="scDescInput" className="form-label">
              <span>Description</span>
              <span className="text-slate-400 font-normal">
                {description.length}/500
              </span>
            </label>
            <textarea
              id="scDescInput"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional overview of network scope, operating facilities, and key transportation channels..."
              className="form-textarea"
              rows={2}
              maxLength={500}
            />
            <p className="form-helper">Briefly outline the operational objective of this network.</p>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          SECTION 2 — PRODUCT INFORMATION
         ─────────────────────────────────────────────────────────────────── */}
      <section ref={section2Ref} className="builder-section-card builder-section-card--blue">
        <div className="section-card-header">
          <div>
            <h2 className="section-card-title">
              <span className="text-blue-600">2.</span>
              <span>Product Information</span>
            </h2>
            <p className="section-card-subtitle">
              Configure product criticality and consumption demand used by the Risk Engine.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="form-group">
            <label htmlFor="prodNameInput" className="form-label">
              <span>Product Name *</span>
            </label>
            <input
              id="prodNameInput"
              type="text"
              value={product.name}
              onChange={(e) => updateProduct('name', e.target.value)}
              placeholder="e.g. Smartphone Component"
              className="form-input"
              required
            />
            <p className="form-helper">The primary material or finished product moving across this network.</p>
          </div>

          <div className="form-group">
            <label htmlFor="prodSkuInput" className="form-label">
              <span>SKU / Part ID</span>
            </label>
            <input
              id="prodSkuInput"
              type="text"
              value={product.sku}
              onChange={(e) => updateProduct('sku', e.target.value)}
              placeholder="e.g. PHONE-001"
              className="form-input"
            />
            <p className="form-helper">Optional inventory SKU identifier.</p>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Criticality *</span>
            </label>
            <div className="criticality-selector">
              {CRITICALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateProduct('criticality', opt.value)}
                  className={`criticality-btn criticality-btn--${opt.value.toLowerCase()} ${
                    product.criticality === opt.value ? 'criticality-btn--active' : ''
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="form-helper">Defines impact sensitivity in the Risk Engine.</p>
          </div>

          <div className="form-group">
            <label htmlFor="prodDemandInput" className="form-label">
              <span>Daily Demand (Units/Day) *</span>
            </label>
            <input
              id="prodDemandInput"
              type="number"
              min="0"
              step="1"
              value={product.dailyDemand}
              onChange={(e) => updateProduct('dailyDemand', e.target.value)}
              placeholder="e.g. 200"
              className="form-input"
              required
            />
            <p className="form-helper">
              Used by the Risk Engine to calculate inventory coverage and projected stockout.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          SECTION 3 — NODES & ROUTES (TWO-COLUMN ARCHITECTURE)
         ─────────────────────────────────────────────────────────────────── */}
      <section ref={section3Ref}>
        <div className="nodes-routes-grid">
          {/* ── Left Column: Checkpoints / Nodes ── */}
          <div className="nodes-column">
            <div className="column-header">
              <h2 className="column-title">
                <span>📍</span>
                <span>Checkpoints (Nodes)</span>
                <span className="pill-count">{nodes.length} Facilities</span>
              </h2>
              <button
                type="button"
                onClick={addNode}
                className="btn-secondary-action text-xs"
              >
                + Add Checkpoint
              </button>
            </div>

            <div className="nodes-list">
              {nodes.map((node, index) => {
                const circleNumber = String(index + 1);

                return (
                  <div key={node._id} className="builder-node-card">
                    <div className="builder-node-card__header">
                      <div className="builder-node-card__id">
                        <span className="builder-node-card__circle">{circleNumber}</span>
                        <span>Checkpoint {index + 1}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {nodes.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeNode(node._id)}
                            className="btn-delete-card"
                            title="Delete this checkpoint"
                          >
                            ✕ Delete
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="builder-node-grid">
                      <div className="form-group">
                        <label className="form-label">Node Name *</label>
                        <input
                          type="text"
                          value={node.name}
                          onChange={(e) => updateNode(node._id, 'name', e.target.value)}
                          placeholder="e.g. Warehouse Mumbai"
                          className="form-input text-xs"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Location *</label>
                        <input
                          type="text"
                          value={node.location}
                          onChange={(e) => updateNode(node._id, 'location', e.target.value)}
                          placeholder="e.g. Mumbai, India"
                          className="form-input text-xs"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Node Type *</label>
                        <select
                          value={node.type}
                          onChange={(e) => updateNode(node._id, 'type', e.target.value)}
                          className="form-select text-xs"
                        >
                          {NODE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Inventory Quantity *</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={node.inventoryQuantity}
                          onChange={(e) => updateNode(node._id, 'inventoryQuantity', e.target.value)}
                          placeholder="0"
                          className="form-input text-xs"
                          required
                        />
                        <p className="form-helper">Quantity of product currently on hand.</p>
                      </div>

                      <div className="form-group sm:col-span-2">
                        <label className="form-label">Capacity (Optional)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={node.capacity}
                          onChange={(e) => updateNode(node._id, 'capacity', e.target.value)}
                          placeholder="e.g. 5000"
                          className="form-input text-xs"
                        />
                        <p className="form-helper">Maximum storage or throughput volume limit.</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right Column: Transport Routes ── */}
          <div className="routes-column">
            <div className="column-header">
              <h2 className="column-title">
                <span>🚚</span>
                <span>Transport Routes</span>
                <span className="pill-count">
                  {routes.length} Total ({alternateRoutesCount} Alternate)
                </span>
              </h2>
              <button
                type="button"
                onClick={() => addRoute()}
                className="btn-secondary-action text-xs"
              >
                + Add Route
              </button>
            </div>

            <div className="routes-list">
              {routes.map((route, index) => {
                const classification = routeClassificationMap.get(route._id);
                const isAlternate = classification?.isAlternate;
                const sourceNode = nodeMap.get(route.sourceNodeId);
                const destNode = nodeMap.get(route.destinationNodeId);

                return (
                  <div
                    key={route._id}
                    className={`builder-route-card ${
                      isAlternate
                        ? 'builder-route-card--alternate'
                        : 'builder-route-card--primary'
                    }`}
                  >
                    <div className="builder-route-card__header">
                      <div className="builder-route-card__mode">
                        {renderTransportIcon(route.transportMode)}
                        <span>
                          Route {index + 1}: {route.transportMode}
                        </span>
                      </div>

                      <div className="builder-route-badges">
                        <span
                          className={`route-type-badge ${
                            isAlternate
                              ? 'route-type-badge--alternate'
                              : 'route-type-badge--primary'
                          }`}
                        >
                          {classification?.label || 'PRIMARY'}
                        </span>
                        {routes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRoute(route._id)}
                            className="btn-delete-card"
                            title="Delete route"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* From / To Node Selectors */}
                    <div className="builder-route-endpoints">
                      <div>
                        <label className="form-label text-[11px]">From Node *</label>
                        <select
                          value={route.sourceNodeId}
                          onChange={(e) => updateRoute(route._id, 'sourceNodeId', e.target.value)}
                          className="form-select text-xs"
                        >
                          {nodes.map((n, nIdx) => (
                            <option key={n._id} value={n._id}>
                              #{nIdx + 1} {n.name || 'Unnamed'} ({n.location || 'Location'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="endpoint-arrow hidden sm:block">➔</div>

                      <div>
                        <label className="form-label text-[11px]">To Node *</label>
                        <select
                          value={route.destinationNodeId}
                          onChange={(e) => updateRoute(route._id, 'destinationNodeId', e.target.value)}
                          className="form-select text-xs"
                        >
                          {nodes.map((n, nIdx) => (
                            <option key={n._id} value={n._id}>
                              #{nIdx + 1} {n.name || 'Unnamed'} ({n.location || 'Location'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Operational Fields */}
                    <div className="builder-route-grid">
                      <div className="form-group">
                        <label className="form-label text-[11px]">Mode *</label>
                        <select
                          value={route.transportMode}
                          onChange={(e) => updateRoute(route._id, 'transportMode', e.target.value)}
                          className="form-select text-xs"
                        >
                          {TRANSPORT_MODES.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.emoji} {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label text-[11px]">Transit Days *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={route.transitDays}
                          onChange={(e) => updateRoute(route._id, 'transitDays', e.target.value)}
                          placeholder="e.g. 3"
                          className="form-input text-xs"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label text-[11px]">Cost (₹) *</label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={route.cost}
                          onChange={(e) => updateRoute(route._id, 'cost', e.target.value)}
                          placeholder="e.g. 50000"
                          className="form-input text-xs"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label text-[11px]">Capacity/Day</label>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={route.capacityPerDay}
                          onChange={(e) => updateRoute(route._id, 'capacityPerDay', e.target.value)}
                          placeholder="e.g. 500"
                          className="form-input text-xs"
                        />
                      </div>
                    </div>

                    {/* Inline Quick Action: Add Alternate Route */}
                    <div className="builder-route-actions">
                      <button
                        type="button"
                        onClick={() =>
                          addAlternateRouteFor(
                            route.sourceNodeId,
                            route.destinationNodeId,
                            route.transportMode
                          )
                        }
                        className="btn-add-alternate-inline"
                        title="Add a backup route between these same two checkpoints"
                      >
                        <span>+ Add Alternate Route for this segment</span>
                      </button>

                      <span className="text-[11px] text-slate-400">
                        {sourceNode?.name || 'Origin'} ➔ {destNode?.name || 'Destination'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          SECTION 4 — REVIEW & SAVE
         ─────────────────────────────────────────────────────────────────── */}
      <section ref={section4Ref} className="builder-section-card builder-section-card--purple">
        <div className="section-card-header">
          <div>
            <h2 className="section-card-title">
              <span className="text-purple-600">4.</span>
              <span>Review & Save</span>
            </h2>
            <p className="section-card-subtitle">
              Verify your operational network before saving. Alternate routes will be evaluated by the Risk Engine.
            </p>
          </div>
        </div>

        <div className="review-summary-grid">
          <div className="review-stat-box">
            <div className="review-stat-box__label">Supply Chain</div>
            <div className="review-stat-box__value text-base">{supplyChainName || 'Unnamed'}</div>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{description || 'No description'}</p>
          </div>

          <div className="review-stat-box">
            <div className="review-stat-box__label">Primary Product</div>
            <div className="review-stat-box__value text-base">
              {product.name || 'Unnamed Product'}
              {product.sku ? ` (${product.sku})` : ''}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                {product.criticality}
              </span>
              <span className="text-xs text-slate-500">
                {product.dailyDemand ? `${product.dailyDemand} units/day` : 'No demand set'}
              </span>
            </div>
          </div>

          <div className="review-stat-box">
            <div className="review-stat-box__label">Network Scale</div>
            <div className="review-stat-box__value">
              {nodes.length} Nodes • {routes.length} Routes
            </div>
            <p className="text-xs text-purple-700 font-semibold mt-1">
              {alternateRoutesCount} Alternate / Backup Route{alternateRoutesCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Structured Segment Topology Review */}
        <div className="review-topology-list">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
            Segment Topology Breakdown
          </h3>

          {routesByPair.map((pair) => {
            const src = nodeMap.get(pair.sourceNodeId);
            const dst = nodeMap.get(pair.destinationNodeId);

            return (
              <div key={`${pair.sourceNodeId}➔${pair.destinationNodeId}`} className="review-segment-row">
                <div className="review-segment-pair">
                  <span>📍 {src?.name || 'Source'}</span>
                  <span className="text-slate-400">➔</span>
                  <span>📍 {dst?.name || 'Destination'}</span>
                  <span className="text-xs font-normal text-slate-500">
                    ({pair.routes.length} route{pair.routes.length === 1 ? '' : 's'})
                  </span>
                </div>

                <div className="review-routes-sublist">
                  {pair.routes.map((r) => {
                    const cls = routeClassificationMap.get(r._id);
                    return (
                      <div key={r._id} className="review-route-line">
                        <span
                          className={`route-type-badge ${
                            cls?.isAlternate
                              ? 'route-type-badge--alternate'
                              : 'route-type-badge--primary'
                          }`}
                        >
                          {cls?.label || 'PRIMARY'}
                        </span>
                        <span className="font-bold">
                          {getTransportEmoji(r.transportMode)} {r.transportMode}
                        </span>
                        <span>•</span>
                        <span>{r.transitDays} days</span>
                        <span>•</span>
                        <span>₹{Number(r.cost || 0).toLocaleString('en-IN')}</span>
                        {r.capacityPerDay && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">
                              {Number(r.capacityPerDay).toLocaleString('en-IN')} units/day
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          STICKY BOTTOM ACTION BAR
         ─────────────────────────────────────────────────────────────────── */}
      <footer className="builder-sticky-bar">
        <div className="builder-sticky-content">
          <div className="builder-sticky-summary">
            <span className="font-bold text-slate-800">
              {nodes.length} Checkpoints • {routes.length} Routes
            </span>
            {alternateRoutesCount > 0 ? (
              <span className="text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-xs">
                ✓ {alternateRoutesCount} Alternate Route{alternateRoutesCount === 1 ? '' : 's'} Configured
              </span>
            ) : (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                ℹ️ No alternate routes added
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => scrollToSection(section4Ref, 4)}
              className="btn-secondary-action hidden sm:inline-flex"
            >
              Review Summary
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="btn-primary-action"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Supply Chain…</span>
                </>
              ) : (
                <>
                  <span>Review & Create Supply Chain</span>
                  <span>➔</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>

      {/* ───────────────────────────────────────────────────────────────────
          CHATBOT ASSISTANT
         ─────────────────────────────────────────────────────────────────── */}
      <Chatbot
        isOpen={isChatbotOpen}
        onToggle={() => setIsChatbotOpen(!isChatbotOpen)}
        currentSupplyChain={currentSupplyChainData}
      />
    </div>
  );
};

export default SupplyChainBuilder;
