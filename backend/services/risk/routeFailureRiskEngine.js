const SIGNIFICANT_STOCKOUT_DAYS = 3;

export class RiskEngineError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RiskEngineError";
    this.code = code;
  }
}

const asId = (value) => String(value ?? "");

const getDownstreamNodes = (nodes, routes, destinationNodeId) => {
  const nodesById = new Map(nodes.map((node) => [asId(node._id), node]));
  const routesBySource = new Map();

  for (const route of routes) {
    const sourceId = asId(route.sourceNodeId);
    const sourceRoutes = routesBySource.get(sourceId) || [];
    sourceRoutes.push(route);
    routesBySource.set(sourceId, sourceRoutes);
  }

  const visited = new Set();
  const queue = [asId(destinationNodeId)];
  const downstreamNodes = [];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodesById.get(nodeId);
    if (!node) continue;

    downstreamNodes.push(node);

    for (const route of routesBySource.get(nodeId) || []) {
      queue.push(asId(route.destinationNodeId));
    }
  }

  return downstreamNodes;
};

const determineRiskLevel = ({ affectedNodes, disruptionDurationDays, stockoutDays, criticality }) => {
  if (affectedNodes.length === 0 || stockoutDays === null) {
    return "UNKNOWN";
  }

  if (disruptionDurationDays === 0) {
    return "LOW";
  }

  if (stockoutDays <= 0) {
    return "MEDIUM";
  }

  if (criticality === "HIGH" || stockoutDays >= SIGNIFICANT_STOCKOUT_DAYS) {
    return "CRITICAL";
  }

  return "HIGH";
};

export const analyzeRouteFailure = ({ supplyChain, routeId, disruptionDurationDays }) => {
  if (!Number.isFinite(disruptionDurationDays) || disruptionDurationDays < 0) {
    throw new RiskEngineError(
      "INVALID_DURATION",
      "Disruption duration must be a non-negative number of days",
    );
  }

  const nodes = supplyChain?.nodes || [];
  const routes = supplyChain?.routes || [];
  const products = supplyChain?.products || [];
  const inventory = supplyChain?.inventory || [];
  const disruptedRoute = routes.find((route) => asId(route._id) === asId(routeId));

  if (!disruptedRoute) {
    throw new RiskEngineError("ROUTE_NOT_FOUND", "The requested route does not exist");
  }

  const affectedNodes = getDownstreamNodes(
    nodes,
    routes,
    disruptedRoute.destinationNodeId,
  );
  const product = products[0] || null;
  const affectedNodeIds = new Set(affectedNodes.map((node) => asId(node._id)));
  const relevantInventory = product
    ? inventory.filter(
      (entry) =>
        asId(entry.productId) === asId(product._id) &&
        affectedNodeIds.has(asId(entry.nodeId)),
    )
    : [];
  if (relevantInventory.some((entry) => !Number.isFinite(entry.quantity) || entry.quantity < 0)) {
    throw new RiskEngineError(
      "INVALID_INVENTORY",
      "Inventory quantities must be non-negative numbers",
    );
  }

  const inventoryQuantity = relevantInventory.reduce((total, entry) => total + entry.quantity, 0);
  const dailyDemand = product?.dailyDemand;

  if (dailyDemand !== undefined && (!Number.isFinite(dailyDemand) || dailyDemand < 0)) {
    throw new RiskEngineError(
      "INVALID_DEMAND",
      "Daily demand must be a non-negative number",
    );
  }

  const hasDemand = Number.isFinite(dailyDemand) && dailyDemand > 0;
  const inventoryCoverageDays = hasDemand ? inventoryQuantity / dailyDemand : null;
  const stockoutDays = hasDemand
    ? Math.max(0, disruptionDurationDays - inventoryCoverageDays)
    : null;
  const riskLevel = determineRiskLevel({
    affectedNodes,
    disruptionDurationDays,
    stockoutDays,
    criticality: product?.criticality,
  });

  return {
    disruption: {
      type: "ROUTE_FAILURE",
      routeId: asId(disruptedRoute._id),
      durationDays: disruptionDurationDays,
    },
    disruptedRoute,
    affectedNodes,
    product,
    inventory: {
      quantity: inventoryQuantity,
      entries: relevantInventory,
    },
    dailyDemand: hasDemand ? dailyDemand : null,
    inventoryCoverageDays,
    stockoutDays,
    riskLevel,
  };
};
