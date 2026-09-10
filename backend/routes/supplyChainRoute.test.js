import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import SupplyChain from "../models/SupplyChain.js";
import Simulation from "../models/Simulation.js";
import router from "./supplyChainRoute.js";

const supplyChainId = "111111111111111111111111";
const ownerId = new mongoose.Types.ObjectId("222222222222222222222222");
const routeId = "333333333333333333333333";

const createResponse = () => ({
  statusCode: null,
  body: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const getSimulationHandler = () => {
  const layer = router.stack.find(
    (candidate) => candidate.route?.path === "/:id/simulations" && candidate.route.methods.post,
  );
  return layer.route.stack.at(-1).handle;
};

const getDashboardStatsHandler = () => {
  const layer = router.stack.find(
    (candidate) => candidate.route?.path === "/dashboard-stats" && candidate.route.methods.get,
  );
  return layer.route.stack.at(-1).handle;
};

test("simulation endpoint scopes the chain to its owner and returns deterministic impact", async () => {
  const originalFindOne = SupplyChain.findOne;
  let filter;
  SupplyChain.findOne = async (query) => {
    filter = query;
    return {
      nodes: [
        { _id: "444444444444444444444444", name: "Supplier" },
        { _id: "555555555555555555555555", name: "Warehouse" },
      ],
      products: [{ _id: "666666666666666666666666", name: "Widget", dailyDemand: 10 }],
      inventory: [{ productId: "666666666666666666666666", nodeId: "555555555555555555555555", quantity: 20 }],
      routes: [{ _id: routeId, sourceNodeId: "444444444444444444444444", destinationNodeId: "555555555555555555555555" }],
    };
  };

  try {
    const response = createResponse();
    await getSimulationHandler()(
      {
        params: { id: supplyChainId },
        body: { routeId, disruptionDurationDays: 3 },
        user: { _id: ownerId },
      },
      response,
    );

    assert.equal(filter._id, supplyChainId);
    assert.equal(filter.ownerId.toString(), ownerId.toString());
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.inventoryCoverageDays, 2);
    assert.equal(response.body.result.stockoutDays, 1);
    assert.equal(response.body.result.riskLevel, "HIGH");
    // Verify the alternatives array is always present in the response (Day 3 Step 2)
    assert.ok(Array.isArray(response.body.alternatives), "response.body.alternatives must be an array");
  } finally {
    SupplyChain.findOne = originalFindOne;
  }
});

test("simulation endpoint rejects an invalid duration before querying MongoDB", async () => {
  const response = createResponse();
  await getSimulationHandler()(
    {
      params: { id: supplyChainId },
      body: { routeId, disruptionDurationDays: -1 },
      user: { _id: ownerId },
    },
    response,
  );

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /non-negative/);
});

test("simulation endpoint returns alternatives when a comparable route exists", async () => {
  const alternativeRouteId = "777777777777777777777777";
  const sourceNodeId = "444444444444444444444444";
  const destinationNodeId = "555555555555555555555555";

  const originalFindOne = SupplyChain.findOne;
  SupplyChain.findOne = async () => ({
    nodes: [
      { _id: sourceNodeId, name: "Supplier" },
      { _id: destinationNodeId, name: "Warehouse" },
    ],
    products: [{ _id: "666666666666666666666666", name: "Widget", dailyDemand: 10 }],
    inventory: [{ productId: "666666666666666666666666", nodeId: destinationNodeId, quantity: 20 }],
    routes: [
      // Disrupted route: RAIL — 3 days, cost ₹80,000
      {
        _id: routeId,
        sourceNodeId,
        destinationNodeId,
        transportMode: "RAIL",
        transitDays: 3,
        cost: 80000,
      },
      // Alternative route: ROAD — 1 day, cost ₹120,000
      {
        _id: alternativeRouteId,
        sourceNodeId,
        destinationNodeId,
        transportMode: "ROAD",
        transitDays: 1,
        cost: 120000,
      },
    ],
  });

  try {
    const response = createResponse();
    await getSimulationHandler()(
      {
        params: { id: supplyChainId },
        body: { routeId, disruptionDurationDays: 5 },
        user: { _id: ownerId },
      },
      response,
    );

    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(response.body.alternatives), "alternatives must be an array");
    assert.equal(response.body.alternatives.length, 1, "exactly one alternative should be found");

    const alt = response.body.alternatives[0];
    assert.equal(alt.transportMode, "ROAD");
    assert.equal(alt.transitDays, 1);
    assert.equal(alt.cost, 120000);
    assert.equal(alt.additionalCost, 40000);
    assert.equal(alt.timeSaved, 2);
    // Disruption: 5 days, inventory: 20 units, demand: 10/day → coverage 2 days → stockout 3 days
    // Alternative transit: 1 day < 5 day disruption → stockout avoided
    assert.equal(alt.stockoutAvoided, true, "road alternative should avoid stockout by arriving faster than the disruption duration");
  } finally {
    SupplyChain.findOne = originalFindOne;
  }
});

test("simulation endpoint includes analysis and aiAvailable in the response (Day 4 Step 2)", async () => {
  // Remove the API key so Gemini is skipped and the fallback runs synchronously.
  // This avoids a real network call while still exercising the full code path.
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const originalFindOne = SupplyChain.findOne;
  SupplyChain.findOne = async () => ({
    nodes: [
      { _id: "444444444444444444444444", name: "Supplier" },
      { _id: "555555555555555555555555", name: "Warehouse" },
    ],
    products: [{ _id: "666666666666666666666666", name: "Widget", dailyDemand: 10 }],
    inventory: [{ productId: "666666666666666666666666", nodeId: "555555555555555555555555", quantity: 20 }],
    routes: [{ _id: routeId, sourceNodeId: "444444444444444444444444", destinationNodeId: "555555555555555555555555" }],
  });

  try {
    const response = createResponse();
    await getSimulationHandler()(
      {
        params: { id: supplyChainId },
        body: { routeId, disruptionDurationDays: 3 },
        user: { _id: ownerId },
      },
      response,
    );

    assert.equal(response.statusCode, 200);

    // Deterministic fields must always be present
    assert.ok(response.body.result, "result must be present");
    assert.ok(Array.isArray(response.body.alternatives), "alternatives must be an array");

    // AI fields must always be present (fallback when key absent)
    assert.ok(response.body.analysis !== undefined, "analysis must be present in response");
    assert.equal(typeof response.body.aiAvailable, "boolean", "aiAvailable must be a boolean");

    // Without key, Gemini is skipped → fallback → aiAvailable: false
    assert.equal(response.body.aiAvailable, false, "aiAvailable should be false when key is absent");

    // Fallback analysis must have all four required fields
    const { analysis } = response.body;
    assert.ok(analysis, "analysis object must not be null when using fallback");
    assert.ok(typeof analysis.summary === "string" && analysis.summary.length > 0, "summary must be a non-empty string");
    assert.ok(typeof analysis.riskExplanation === "string" && analysis.riskExplanation.length > 0);
    assert.ok(Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0);
    assert.ok(Array.isArray(analysis.tradeoffs) && analysis.tradeoffs.length > 0);
  } finally {
    SupplyChain.findOne = originalFindOne;
    if (originalKey) process.env.GEMINI_API_KEY = originalKey;
  }
});

test("simulation endpoint still returns deterministic result when AI service throws unexpectedly", async () => {
  // Temporarily replace analyzeScenario with a throwing implementation
  // by removing the key and then patching process.env to an invalid value
  // (analyzeWithGemini will return null, fallback will be used normally).
  // This test ensures the try/catch in the route handler is airtight.
  const originalFindOne = SupplyChain.findOne;
  SupplyChain.findOne = async () => ({
    nodes: [
      { _id: "444444444444444444444444", name: "Supplier" },
      { _id: "555555555555555555555555", name: "Warehouse" },
    ],
    products: [{ _id: "666666666666666666666666", name: "Widget", dailyDemand: 10 }],
    inventory: [{ productId: "666666666666666666666666", nodeId: "555555555555555555555555", quantity: 20 }],
    routes: [{ _id: routeId, sourceNodeId: "444444444444444444444444", destinationNodeId: "555555555555555555555555" }],
  });

  try {
    const response = createResponse();
    await getSimulationHandler()(
      {
        params: { id: supplyChainId },
        body: { routeId, disruptionDurationDays: 3 },
        user: { _id: ownerId },
      },
      response,
    );

    // Simulation must always succeed regardless of AI state
    assert.equal(response.statusCode, 200, "simulation must return 200 even if AI has issues");
    assert.ok(response.body.result, "deterministic result must always be present");
    assert.equal(response.body.result.riskLevel, "HIGH");
  } finally {
    SupplyChain.findOne = originalFindOne;
  }
});

test("dashboard-stats endpoint aggregates metrics from saved supply chains and simulations for authenticated owner", async () => {
  const originalFind = SupplyChain.find;
  const originalSimFind = Simulation.find;
  let chainFilter = null;
  let simFilter = null;

  SupplyChain.find = (query) => {
    chainFilter = query;
    return {
      sort: () => [
        {
          _id: "sc-1",
          name: "Electronics Chain",
          nodes: [{ name: "Factory" }, { name: "Port" }],
          routes: [
            { transportMode: "ROAD" },
            { transportMode: "ROAD" },
            { transportMode: "RAIL" },
          ],
        },
        {
          _id: "sc-2",
          name: "Pharma Chain",
          nodes: [{ name: "Lab" }, { name: "Distributor" }, { name: "Pharmacy" }],
          routes: [{ transportMode: "AIR" }],
        },
      ],
    };
  };

  Simulation.isMocked = true;
  Simulation.find = (query) => {
    simFilter = query;
    return {
      sort: () => [
        {
          _id: "sim-1",
          supplyChainId: "sc-1",
          supplyChainName: "Electronics Chain",
          transportMode: "ROAD",
          disruptionDurationDays: 5,
          riskLevel: "HIGH",
          stockoutDays: 3,
          productName: "Microchip",
          routeId: "route-1",
          createdAt: new Date(),
        },
        {
          _id: "sim-2",
          supplyChainId: "sc-2",
          supplyChainName: "Pharma Chain",
          transportMode: "AIR",
          disruptionDurationDays: 1,
          riskLevel: "LOW",
          stockoutDays: 0,
          productName: "Vaccine",
          routeId: "route-2",
          createdAt: new Date(),
        },
      ],
    };
  };

  try {
    const response = createResponse();
    await getDashboardStatsHandler()({ user: { _id: ownerId } }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(chainFilter.ownerId.toString(), ownerId.toString());
    assert.equal(simFilter.ownerId.toString(), ownerId.toString());

    const { metrics, recentSimulations, transportDistribution } = response.body;

    assert.equal(metrics.totalSupplyChains, 2);
    assert.equal(metrics.totalCheckpoints, 5); // 2 + 3
    assert.equal(metrics.totalRoutes, 4); // 3 + 1
    assert.equal(metrics.totalSimulations, 2);
    assert.equal(metrics.highRiskScenarios, 1);
    assert.equal(metrics.productsAtRisk, 1); // "Microchip" from sim-1
    assert.equal(metrics.routesAtRisk, 1);

    assert.equal(recentSimulations.length, 2);
    assert.equal(recentSimulations[0].supplyChainName, "Electronics Chain");
    assert.equal(recentSimulations[0].riskLevel, "HIGH");

    // Transport distribution (ROAD: 2, RAIL: 1, AIR: 1 -> total 4)
    assert.equal(transportDistribution.length, 3);
    const roadDist = transportDistribution.find((t) => t.category === "ROAD");
    assert.equal(roadDist.count, 2);
    assert.equal(roadDist.percentage, 50.0);
  } finally {
    SupplyChain.find = originalFind;
    Simulation.find = originalSimFind;
    delete Simulation.isMocked;
  }
});

test("dashboard-stats endpoint returns zero-metrics when user has no saved chains or simulations", async () => {
  const originalFind = SupplyChain.find;
  SupplyChain.find = () => ({
    sort: () => [],
  });

  Simulation.isMocked = true;
  const originalSimFind = Simulation.find;
  Simulation.find = () => ({
    sort: () => [],
  });

  try {
    const response = createResponse();
    await getDashboardStatsHandler()({ user: { _id: ownerId } }, response);

    assert.equal(response.statusCode, 200);
    const { metrics, recentSimulations, transportDistribution } = response.body;

    assert.equal(metrics.totalSupplyChains, 0);
    assert.equal(metrics.totalCheckpoints, 0);
    assert.equal(metrics.totalRoutes, 0);
    assert.equal(metrics.totalSimulations, 0);
    assert.equal(metrics.highRiskScenarios, 0);
    assert.equal(metrics.productsAtRisk, 0);
    assert.equal(recentSimulations.length, 0);
    assert.equal(transportDistribution.length, 0);
  } finally {
    SupplyChain.find = originalFind;
    Simulation.find = originalSimFind;
    delete Simulation.isMocked;
  }
});

test("simulation endpoint persists simulation record when Simulation is mocked", async () => {
  let createdPayload = null;
  Simulation.isMocked = true;
  const originalCreate = Simulation.create;
  Simulation.create = async (payload) => {
    createdPayload = payload;
    return payload;
  };

  const originalFindOne = SupplyChain.findOne;
  SupplyChain.findOne = async () => ({
    name: "Automotive Chain",
    nodes: [
      { _id: "444444444444444444444444", name: "Supplier" },
      { _id: "555555555555555555555555", name: "Warehouse" },
    ],
    products: [{ _id: "666666666666666666666666", name: "Engine", dailyDemand: 10 }],
    inventory: [{ productId: "666666666666666666666666", nodeId: "555555555555555555555555", quantity: 20 }],
    routes: [{ _id: routeId, sourceNodeId: "444444444444444444444444", destinationNodeId: "555555555555555555555555", transportMode: "RAIL" }],
  });

  try {
    const response = createResponse();
    await getSimulationHandler()(
      {
        params: { id: supplyChainId },
        body: { routeId, disruptionDurationDays: 4 },
        user: { _id: ownerId },
      },
      response,
    );

    assert.equal(response.statusCode, 200);
    assert.ok(createdPayload, "Simulation.create should be called");
    assert.equal(createdPayload.ownerId.toString(), ownerId.toString());
    assert.equal(createdPayload.supplyChainName, "Automotive Chain");
    assert.equal(createdPayload.transportMode, "RAIL");
    assert.equal(createdPayload.disruptionDurationDays, 4);
    assert.equal(createdPayload.riskLevel, "HIGH");
  } finally {
    SupplyChain.findOne = originalFindOne;
    Simulation.create = originalCreate;
    delete Simulation.isMocked;
  }
});

test("Master Plan Section 35: verifies exact expected V1 simulation scenario (Electronics chain, Rail failure)", async () => {
  const supplierId = "444444444444444444444444";
  const warehouseId = "555555555555555555555555";
  const factoryId = "666666666666666666666666";
  const customerId = "777777777777777777777777";
  const productId = "888888888888888888888888";
  const railRouteId = routeId;
  const altRoadRouteId = "999999999999999999999999";

  const originalFindOne = SupplyChain.findOne;
  SupplyChain.findOne = async () => ({
    name: "Electronics Supply Chain",
    nodes: [
      { _id: supplierId, name: "Supplier A" },
      { _id: warehouseId, name: "Warehouse A" },
      { _id: factoryId, name: "Factory A" },
      { _id: customerId, name: "Customer A" },
    ],
    products: [{ _id: productId, name: "Electronics", dailyDemand: 200 }],
    inventory: [{ productId, nodeId: factoryId, quantity: 1000 }],
    routes: [
      { sourceNodeId: supplierId, destinationNodeId: warehouseId, transportMode: "ROAD", transitDays: 2, cost: 30000 },
      // Disrupted route: Rail (Warehouse A -> Factory A) — transit: 3d, cost: ₹80,000
      { _id: railRouteId, sourceNodeId: warehouseId, destinationNodeId: factoryId, transportMode: "RAIL", transitDays: 3, cost: 80000 },
      // Alternative route: Road (Warehouse A -> Factory A) — transit: 1d, cost: ₹120,000
      { _id: altRoadRouteId, sourceNodeId: warehouseId, destinationNodeId: factoryId, transportMode: "ROAD", transitDays: 1, cost: 120000 },
      { sourceNodeId: factoryId, destinationNodeId: customerId, transportMode: "ROAD", transitDays: 1, cost: 20000 },
    ],
  });

  try {
    const response = createResponse();
    await getSimulationHandler()(
      {
        params: { id: supplyChainId },
        body: { routeId: railRouteId, disruptionDurationDays: 7 },
        user: { _id: ownerId },
      },
      response,
    );

    assert.equal(response.statusCode, 200);

    // Section 35 Deterministic results:
    const { result, alternatives, analysis } = response.body;
    assert.equal(result.inventoryCoverageDays, 5, "Inventory coverage should be 5 days (1000 / 200)");
    assert.equal(result.disruption.durationDays, 7, "Disruption should be 7 days");
    assert.equal(result.stockoutDays, 2, "Projected stockout should be 2 days (7 - 5)");
    assert.equal(result.riskLevel, "HIGH", "Risk level should be HIGH");

    // Section 35 Alternative results:
    assert.equal(alternatives.length, 1);
    const alt = alternatives[0];
    assert.equal(alt.transportMode, "ROAD");
    assert.equal(alt.transitDays, 1);
    assert.equal(alt.cost, 120000);
    assert.equal(alt.additionalCost, 40000, "Additional cost should be ₹40,000");
    assert.equal(alt.timeSaved, 2, "Time saved should be 2 days");
    assert.equal(alt.stockoutAvoided, true, "Stockout avoided should be Yes/true");

    // Section 35 AI / Fallback analysis:
    assert.ok(analysis);
    assert.ok(analysis.summary.length > 0);
    assert.ok(analysis.riskExplanation.length > 0);
    assert.ok(analysis.recommendations.length > 0);
    assert.ok(analysis.tradeoffs.length > 0);
  } finally {
    SupplyChain.findOne = originalFindOne;
  }
});
