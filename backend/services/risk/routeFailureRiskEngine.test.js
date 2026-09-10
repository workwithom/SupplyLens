import assert from "node:assert/strict";
import test from "node:test";
import { analyzeRouteFailure, RiskEngineError } from "./routeFailureRiskEngine.js";

const createSupplyChain = ({ criticality = "MEDIUM", dailyDemand = 10, inventory = [] } = {}) => ({
  nodes: [
    { _id: "111111111111111111111111", name: "Supplier" },
    { _id: "222222222222222222222222", name: "Warehouse" },
    { _id: "333333333333333333333333", name: "Factory" },
    { _id: "444444444444444444444444", name: "Customer" },
  ],
  products: [
    { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Widget", criticality, dailyDemand },
  ],
  inventory,
  routes: [
    {
      _id: "bbbbbbbbbbbbbbbbbbbbbbbb",
      sourceNodeId: "111111111111111111111111",
      destinationNodeId: "222222222222222222222222",
    },
    {
      _id: "cccccccccccccccccccccccc",
      sourceNodeId: "222222222222222222222222",
      destinationNodeId: "333333333333333333333333",
    },
    {
      _id: "dddddddddddddddddddddddd",
      sourceNodeId: "333333333333333333333333",
      destinationNodeId: "444444444444444444444444",
    },
  ],
});

test("calculates downstream nodes, coverage, and an expected stockout", () => {
  const supplyChain = createSupplyChain({
    inventory: [
      {
        productId: "aaaaaaaaaaaaaaaaaaaaaaaa",
        nodeId: "222222222222222222222222",
        quantity: 20,
      },
      {
        productId: "aaaaaaaaaaaaaaaaaaaaaaaa",
        nodeId: "333333333333333333333333",
        quantity: 10,
      },
    ],
  });

  const result = analyzeRouteFailure({
    supplyChain,
    routeId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    disruptionDurationDays: 5,
  });

  assert.deepEqual(result.affectedNodes.map((node) => node.name), ["Warehouse", "Factory", "Customer"]);
  assert.equal(result.inventory.quantity, 30);
  assert.equal(result.inventoryCoverageDays, 3);
  assert.equal(result.stockoutDays, 2);
  assert.equal(result.riskLevel, "HIGH");
});

test("marks a critical product stockout as critical", () => {
  const result = analyzeRouteFailure({
    supplyChain: createSupplyChain({
      criticality: "HIGH",
      inventory: [],
    }),
    routeId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    disruptionDurationDays: 1,
  });

  assert.equal(result.inventoryCoverageDays, 0);
  assert.equal(result.stockoutDays, 1);
  assert.equal(result.riskLevel, "CRITICAL");
});

test("returns medium risk when available inventory prevents a stockout", () => {
  const result = analyzeRouteFailure({
    supplyChain: createSupplyChain({
      inventory: [
        {
          productId: "aaaaaaaaaaaaaaaaaaaaaaaa",
          nodeId: "222222222222222222222222",
          quantity: 100,
        },
      ],
    }),
    routeId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    disruptionDurationDays: 5,
  });

  assert.equal(result.inventoryCoverageDays, 10);
  assert.equal(result.stockoutDays, 0);
  assert.equal(result.riskLevel, "MEDIUM");
});

test("returns low risk for a zero-day route failure", () => {
  const result = analyzeRouteFailure({
    supplyChain: createSupplyChain(),
    routeId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    disruptionDurationDays: 0,
  });

  assert.equal(result.riskLevel, "LOW");
});

test("returns unknown calculations when daily demand is zero or unavailable", () => {
  const result = analyzeRouteFailure({
    supplyChain: createSupplyChain({ dailyDemand: 0 }),
    routeId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    disruptionDurationDays: 5,
  });

  assert.equal(result.dailyDemand, null);
  assert.equal(result.inventoryCoverageDays, null);
  assert.equal(result.stockoutDays, null);
  assert.equal(result.riskLevel, "UNKNOWN");
});

test("handles missing inventory and missing downstream nodes without producing false calculations", () => {
  const noInventoryResult = analyzeRouteFailure({
    supplyChain: createSupplyChain(),
    routeId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    disruptionDurationDays: 2,
  });
  const supplyChainWithMissingDestination = createSupplyChain();
  supplyChainWithMissingDestination.routes[0].destinationNodeId = "eeeeeeeeeeeeeeeeeeeeeeee";

  const missingNodeResult = analyzeRouteFailure({
    supplyChain: supplyChainWithMissingDestination,
    routeId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    disruptionDurationDays: 2,
  });

  assert.equal(noInventoryResult.inventory.quantity, 0);
  assert.equal(noInventoryResult.stockoutDays, 2);
  assert.equal(missingNodeResult.affectedNodes.length, 0);
  assert.equal(missingNodeResult.riskLevel, "UNKNOWN");
});

test("rejects invalid durations and missing routes", () => {
  const supplyChain = createSupplyChain();

  assert.throws(
    () => analyzeRouteFailure({ supplyChain, routeId: "bbbbbbbbbbbbbbbbbbbbbbbb", disruptionDurationDays: -1 }),
    (error) => error instanceof RiskEngineError && error.code === "INVALID_DURATION",
  );
  assert.throws(
    () => analyzeRouteFailure({ supplyChain, routeId: "missing", disruptionDurationDays: 1 }),
    (error) => error instanceof RiskEngineError && error.code === "ROUTE_NOT_FOUND",
  );
  assert.throws(
    () => analyzeRouteFailure({
      supplyChain: createSupplyChain({
        inventory: [{ productId: "aaaaaaaaaaaaaaaaaaaaaaaa", nodeId: "222222222222222222222222", quantity: -1 }],
      }),
      routeId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      disruptionDurationDays: 1,
    }),
    (error) => error instanceof RiskEngineError && error.code === "INVALID_INVENTORY",
  );
  assert.throws(
    () => analyzeRouteFailure({
      supplyChain: createSupplyChain({ dailyDemand: -1 }),
      routeId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      disruptionDurationDays: 1,
    }),
    (error) => error instanceof RiskEngineError && error.code === "INVALID_DEMAND",
  );
});
