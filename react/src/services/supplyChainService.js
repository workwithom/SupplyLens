import API_URL from "../config/api";

const createEmbeddedId = () => {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const formatTransportMode = (mode) => {
  if (!mode) return "";
  return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
};

const request = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to save supply chain");
  }

  return data;
};

export const createSupplyChainPayload = ({ productName, checkpoints }) => {
  const nodes = checkpoints.map((checkpoint) => {
    const location = checkpoint.location.trim();

    return {
      _id: createEmbeddedId(),
      name: location,
      location,
    };
  });

  const products = [
    {
      _id: createEmbeddedId(),
      name: productName.trim(),
    },
  ];

  const routes = checkpoints.slice(0, -1).map((checkpoint, index) => ({
    sourceNodeId: nodes[index]._id,
    destinationNodeId: nodes[index + 1]._id,
    ...(checkpoint.transport_mode ? { transportMode: checkpoint.transport_mode } : {}),
  }));

  return {
    // The current builder only asks for a product name, so it is the temporary chain name.
    name: productName.trim(),
    nodes,
    products,
    routes,
  };
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
  const nodes = supplyChain.nodes || [];
  const routes = supplyChain.routes || [];
  const products = supplyChain.products || [];

  return {
    id: supplyChain._id,
    product: products[0]?.name || supplyChain.name,
    checkpoints: nodes.map((node, index) => {
      const nextNode = nodes[index + 1];
      const route = routes.find(
        (candidate) =>
          String(candidate.sourceNodeId) === String(node._id) &&
          String(candidate.destinationNodeId) === String(nextNode?._id),
      );

      return {
        location: node.location || node.name || "Unnamed location",
        // Product state has no approved persistent domain field in Day 1.
        product_state: "Not specified",
        transport_mode: formatTransportMode(route?.transportMode),
        routeId: route?._id,
      };
    }),
  };
};
