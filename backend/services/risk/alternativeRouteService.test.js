import assert from "node:assert/strict";
import test from "node:test";
import { AlternativeRouteError, findAlternativeRoutes } from "./alternativeRouteService.js";

const disruptedRouteId = "111111111111111111111111";

const createSupplyChain = (routes) => ({ routes });

// ─── Existing tests (unchanged) ────────────────────────────────────────────

test("compares alternate direct routes against the disrupted route", () => {
  const alternatives = findAlternativeRoutes({
    supplyChain: createSupplyChain([
      {
        _id: disruptedRouteId,
        sourceNodeId: "222222222222222222222222",
        destinationNodeId: "333333333333333333333333",
        transportMode: "RAIL",
        transitDays: 3,
        cost: 80000,
      },
      {
        _id: "444444444444444444444444",
        sourceNodeId: "222222222222222222222222",
        destinationNodeId: "333333333333333333333333",
        transportMode: "ROAD",
        transitDays: 1,
        cost: 120000,
      },
      {
        _id: "555555555555555555555555",
        sourceNodeId: "222222222222222222222222",
        destinationNodeId: "999999999999999999999999",
        transportMode: "AIR",
        transitDays: 1,
        cost: 150000,
      },
    ]),
    disruptedRouteId,
  });

  assert.deepEqual(alternatives, [
    {
      routeId: "444444444444444444444444",
      sourceNodeId: "222222222222222222222222",
      destinationNodeId: "333333333333333333333333",
      transportMode: "ROAD",
      transitDays: 1,
      cost: 120000,
      additionalCost: 40000,
      timeSaved: 2,
      // stockoutDays defaults to null → stockoutAvoided = null
      stockoutAvoided: null,
    },
  ]);
});

test("returns no alternatives when no comparable direct replacement exists", () => {
  const alternatives = findAlternativeRoutes({
    supplyChain: createSupplyChain([
      {
        _id: disruptedRouteId,
        sourceNodeId: "222222222222222222222222",
        destinationNodeId: "333333333333333333333333",
        transitDays: 3,
        cost: 80000,
      },
      {
        _id: "444444444444444444444444",
        sourceNodeId: "222222222222222222222222",
        destinationNodeId: "999999999999999999999999",
        transitDays: 1,
        cost: 120000,
      },
    ]),
    disruptedRouteId,
  });

  assert.deepEqual(alternatives, []);
});

test("rejects missing routes and disrupted routes without comparable metrics", () => {
  assert.throws(
    () => findAlternativeRoutes({ supplyChain: createSupplyChain([]), disruptedRouteId }),
    (error) => error instanceof AlternativeRouteError && error.code === "ROUTE_NOT_FOUND",
  );

  assert.throws(
    () => findAlternativeRoutes({
      supplyChain: createSupplyChain([
        {
          _id: disruptedRouteId,
          sourceNodeId: "222222222222222222222222",
          destinationNodeId: "333333333333333333333333",
          transitDays: -1,
          cost: 80000,
        },
      ]),
      disruptedRouteId,
    }),
    (error) => error instanceof AlternativeRouteError && error.code === "INVALID_ROUTE_METRICS",
  );
});

// ─── New tests for stockoutAvoided ─────────────────────────────────────────

const buildChainWithAlternative = ({ alternativeTransitDays, alternativeCost = 120000 } = {}) =>
  createSupplyChain([
    {
      _id: disruptedRouteId,
      sourceNodeId: "aaa",
      destinationNodeId: "bbb",
      transportMode: "RAIL",
      transitDays: 3,
      cost: 80000,
    },
    {
      _id: "cccccccccccccccccccccccc",
      sourceNodeId: "aaa",
      destinationNodeId: "bbb",
      transportMode: "ROAD",
      transitDays: alternativeTransitDays,
      cost: alternativeCost,
    },
  ]);

test("stockoutAvoided is true when the alternative transit days are less than the disruption duration and a stockout was projected", () => {
  // Disruption: 7 days, inventory coverage: 5 days → stockoutDays = 2
  // Alternative transit: 1 day < 7 days → can restore supply before stockout
  const alternatives = findAlternativeRoutes({
    supplyChain: buildChainWithAlternative({ alternativeTransitDays: 1 }),
    disruptedRouteId,
    stockoutDays: 2,
    disruptionDurationDays: 7,
  });

  assert.equal(alternatives.length, 1);
  assert.equal(alternatives[0].stockoutAvoided, true);
});

test("stockoutAvoided is false when the alternative is too slow to restore supply before the disruption ends", () => {
  // Disruption: 7 days, alternative transit: 8 days → cannot restore in time
  const alternatives = findAlternativeRoutes({
    supplyChain: buildChainWithAlternative({ alternativeTransitDays: 8 }),
    disruptedRouteId,
    stockoutDays: 2,
    disruptionDurationDays: 7,
  });

  assert.equal(alternatives.length, 1);
  assert.equal(alternatives[0].stockoutAvoided, false);
});

test("stockoutAvoided is false when no stockout was projected (stockoutDays = 0)", () => {
  // No stockout was projected, so the alternative does not need to "avoid" anything
  const alternatives = findAlternativeRoutes({
    supplyChain: buildChainWithAlternative({ alternativeTransitDays: 1 }),
    disruptedRouteId,
    stockoutDays: 0,
    disruptionDurationDays: 7,
  });

  assert.equal(alternatives.length, 1);
  assert.equal(alternatives[0].stockoutAvoided, false);
});

test("stockoutAvoided is null when demand data is unavailable (stockoutDays = null)", () => {
  // Demand is unknown → we cannot determine whether stockout would occur
  const alternatives = findAlternativeRoutes({
    supplyChain: buildChainWithAlternative({ alternativeTransitDays: 1 }),
    disruptedRouteId,
    stockoutDays: null,
    disruptionDurationDays: 7,
  });

  assert.equal(alternatives.length, 1);
  assert.equal(alternatives[0].stockoutAvoided, null);
});

test("stockoutAvoided boundary: alternative transit exactly equal to disruption duration does not avoid stockout", () => {
  // Boundary: transitDays === disruptionDurationDays → not strictly less than → false
  const alternatives = findAlternativeRoutes({
    supplyChain: buildChainWithAlternative({ alternativeTransitDays: 7 }),
    disruptedRouteId,
    stockoutDays: 2,
    disruptionDurationDays: 7,
  });

  assert.equal(alternatives.length, 1);
  assert.equal(alternatives[0].stockoutAvoided, false);
});
