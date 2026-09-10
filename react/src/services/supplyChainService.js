import API_URL from "../config/api.js";

export const createEmbeddedId = () => {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const ALLOWED_NODE_TYPES = ["SUPPLIER", "WAREHOUSE", "FACTORY", "CUSTOMER"];
export const ALLOWED_CRITICALITY = ["LOW", "MEDIUM", "HIGH"];
export const ALLOWED_TRANSPORT_MODES = ["ROAD", "RAIL", "SEA", "AIR", "PIPELINE"];

const isValidObjectId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

const ensureStableId = (id) => (isValidObjectId(id) ? id : createEmbeddedId());

const parseRequiredNonNegativeNumber = (value, fieldName) => {
  if (value === null || value === undefined || value === "") {
    throw new Error(`${fieldName} is required and must be a non-negative number.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a valid non-negative number (received: ${value}).`);
  }
  return parsed;
};

const parseOptionalNonNegativeNumber = (value, fieldName) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a valid non-negative number if specified (received: ${value}).`);
  }
  return parsed;
};

const canonicalTransportMode = (mode, routeIndex) => {
  if (typeof mode !== "string" || !mode.trim()) {
    throw new Error(`Route ${routeIndex + 1} transport mode is required.`);
  }
  const upper = mode.trim().toUpperCase();
  if (!ALLOWED_TRANSPORT_MODES.includes(upper)) {
    throw new Error(
      `Route ${routeIndex + 1} transport mode "${mode}" is invalid. Allowed modes: ${ALLOWED_TRANSPORT_MODES.join(", ")}`
    );
  }
  return upper;
};

const canonicalNodeType = (type, nodeIndex) => {
  if (typeof type !== "string" || !type.trim()) {
    throw new Error(`Checkpoint ${nodeIndex + 1} node type is required.`);
  }
  const upper = type.trim().toUpperCase();
  if (!ALLOWED_NODE_TYPES.includes(upper)) {
    throw new Error(
      `Checkpoint ${nodeIndex + 1} node type "${type}" is invalid. Allowed types: ${ALLOWED_NODE_TYPES.join(", ")}`
    );
  }
  return upper;
};

const canonicalCriticality = (criticality) => {
  if (typeof criticality !== "string" || !criticality.trim()) {
    return "MEDIUM";
  }
  const upper = criticality.trim().toUpperCase();
  if (!ALLOWED_CRITICALITY.includes(upper)) {
    throw new Error(
      `Product criticality "${criticality}" is invalid. Allowed values: ${ALLOWED_CRITICALITY.join(", ")}`
    );
  }
  return upper;
};

const formatTransportMode = (mode) => {
  if (!mode) return "";
  return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
};

const request = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: "include",
    });
  } catch (networkError) {
    throw new Error(networkError.message || "Network error: Unable to reach SupplyLens API.");
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    // Non-JSON response body
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("storage"));
      throw new Error(data.message || "Session expired. Please log in again.");
    }
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
};

export const createSupplyChainPayload = (input) => {
  if (!input || typeof input !== "object") {
    throw new Error("Input payload must be an object.");
  }

  // Backward compatibility for legacy { productName, checkpoints } calls
  if (input.productName !== undefined && input.name === undefined) {
    const productName = typeof input.productName === "string" ? input.productName.trim() : "";
    if (!productName) {
      throw new Error("A product name is required.");
    }
    const checkpoints = Array.isArray(input.checkpoints) ? input.checkpoints : [];
    if (checkpoints.length < 2) {
      throw new Error("At least 2 checkpoints are required to configure a supply chain.");
    }
    const productId = createEmbeddedId();

    const nodes = checkpoints.map((checkpoint, index) => {
      const location = typeof checkpoint.location === "string" ? checkpoint.location.trim() : "";
      if (!location) {
        throw new Error(`Location is required for Checkpoint ${index + 1}.`);
      }
      return {
        _id: ensureStableId(checkpoint._id),
        name: checkpoint.name?.trim() || location,
        location,
        type: canonicalNodeType(checkpoint.type || "WAREHOUSE", index),
      };
    });

    const products = [
      {
        _id: productId,
        name: productName,
        criticality: "MEDIUM",
        dailyDemand: 10,
      },
    ];

    const inventory = nodes.map((node) => ({
      productId,
      nodeId: node._id,
      quantity: 0,
    }));

    const routes = checkpoints.slice(0, -1).map((checkpoint, index) => ({
      _id: createEmbeddedId(),
      sourceNodeId: nodes[index]._id,
      destinationNodeId: nodes[index + 1]._id,
      transportMode: canonicalTransportMode(checkpoint.transport_mode || "ROAD", index),
      transitDays: 1,
      cost: 0,
    }));

    return {
      name: productName,
      nodes,
      products,
      inventory,
      routes,
    };
  }

  const {
    name = "",
    description = "",
    product = {},
    checkpoints = [],
    routes = [],
  } = input;

  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName) {
    throw new Error("A supply chain name is required.");
  }

  if (!product || typeof product !== "object" || !product.name || !product.name.trim()) {
    throw new Error("A product name is required.");
  }

  if (!Array.isArray(checkpoints) || checkpoints.length < 2) {
    throw new Error("At least 2 checkpoints are required to configure a supply chain.");
  }

  const productId = ensureStableId(product._id);
  const productDoc = {
    _id: productId,
    name: product.name.trim(),
    criticality: canonicalCriticality(product.criticality),
    dailyDemand: parseRequiredNonNegativeNumber(product.dailyDemand, "Product daily demand"),
  };

  if (typeof product.sku === "string" && product.sku.trim()) {
    productDoc.sku = product.sku.trim();
  }

  const nodeDocs = checkpoints.map((cp, index) => {
    const cpName = typeof cp.name === "string" ? cp.name.trim() : "";
    const cpLocation = typeof cp.location === "string" ? cp.location.trim() : "";

    if (!cpName) {
      throw new Error(`Node Name is required for Checkpoint ${index + 1}.`);
    }
    if (!cpLocation) {
      throw new Error(`Location is required for Checkpoint ${index + 1}.`);
    }

    const nodeDoc = {
      _id: ensureStableId(cp._id),
      name: cpName,
      location: cpLocation,
      type: canonicalNodeType(cp.type, index),
    };

    const parsedCapacity = parseOptionalNonNegativeNumber(
      cp.capacity,
      `Checkpoint ${index + 1} capacity`
    );
    if (parsedCapacity !== undefined) {
      nodeDoc.capacity = parsedCapacity;
    }

    return nodeDoc;
  });

  const inventoryDocs = checkpoints.map((cp, index) => ({
    productId,
    nodeId: nodeDocs[index]._id,
    quantity: parseRequiredNonNegativeNumber(
      cp.inventoryQuantity,
      `Checkpoint ${index + 1} inventory quantity`
    ),
  }));

  if (!Array.isArray(routes) || routes.length < checkpoints.length - 1) {
    throw new Error(
      `Expected ${checkpoints.length - 1} routes connecting adjacent checkpoints, but received ${routes?.length || 0}.`
    );
  }

  const routeDocs = checkpoints.slice(0, -1).map((_, index) => {
    const route = routes[index];
    if (!route || typeof route !== "object") {
      throw new Error(`Route ${index + 1} configuration is missing.`);
    }

    const routeDoc = {
      _id: ensureStableId(route._id),
      sourceNodeId: nodeDocs[index]._id,
      destinationNodeId: nodeDocs[index + 1]._id,
      transportMode: canonicalTransportMode(route.transportMode, index),
      transitDays: parseRequiredNonNegativeNumber(
        route.transitDays,
        `Route ${index + 1} transit days`
      ),
      cost: parseRequiredNonNegativeNumber(
        route.cost,
        `Route ${index + 1} cost`
      ),
    };

    const parsedCapacityPerDay = parseOptionalNonNegativeNumber(
      route.capacityPerDay,
      `Route ${index + 1} capacity per day`
    );
    if (parsedCapacityPerDay !== undefined) {
      routeDoc.capacityPerDay = parsedCapacityPerDay;
    }

    return routeDoc;
  });

  const payload = {
    name: trimmedName,
    nodes: nodeDocs,
    products: [productDoc],
    inventory: inventoryDocs,
    routes: routeDocs,
  };

  if (typeof description === "string" && description.trim()) {
    payload.description = description.trim();
  }

  return payload;
};

export const createSupplyChain = (payload) => {
  return request("/api/supply-chains", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getSupplyChain = async (id) => {
  const data = await request(`/api/supply-chains/${id}`);
  return data.supplyChain;
};

export const getSupplyChains = async () => {
  const data = await request("/api/supply-chains");
  return data.supplyChains || [];
};

export const getDashboardStats = async () => {
  const data = await request("/api/supply-chains/dashboard-stats");
  return data;
};

export const runRouteFailureSimulation = async (
  supplyChainId,
  { routeId, disruptionDurationDays },
) => {
  const data = await request(`/api/supply-chains/${supplyChainId}/simulations`, {
    method: "POST",
    body: JSON.stringify({ routeId, disruptionDurationDays }),
  });
  return {
    result: data.result,
    alternatives: data.alternatives || [],
    analysis: data.analysis || null,
    aiAvailable: data.aiAvailable === true,
  };
};

export const toVisualizationSupplyChain = (supplyChain) => {
  if (!supplyChain) return { id: null, product: "", checkpoints: [] };
  const nodes = supplyChain.nodes || [];
  const routes = supplyChain.routes || [];
  const products = supplyChain.products || [];

  return {
    id: supplyChain._id,
    name: supplyChain.name || "",
    product: products[0]?.name || supplyChain.name || "Unnamed product",
    checkpoints: nodes.map((node, index) => {
      const nextNode = nodes[index + 1];
      const route = routes.find(
        (candidate) =>
          String(candidate.sourceNodeId) === String(node._id) &&
          String(candidate.destinationNodeId) === String(nextNode?._id),
      );

      return {
        _id: node._id,
        name: node.name,
        type: node.type,
        capacity: node.capacity,
        location: node.location || node.name || "Unnamed location",
        // Product state has no approved persistent domain field in Day 1.
        product_state: "Not specified",
        transport_mode: formatTransportMode(route?.transportMode),
        routeId: route?._id,
        transitDays: route?.transitDays,
        cost: route?.cost,
      };
    }),
  };
};
