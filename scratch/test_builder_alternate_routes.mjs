import assert from 'node:assert/strict';
import { createSupplyChainPayload } from '../react/src/services/supplyChainService.js';
import { findAlternativeRoutes } from '../backend/services/risk/alternativeRouteService.js';

console.log('--- TEST 1: 2-node chain ---');
const chain2 = createSupplyChainPayload({
  name: 'Two Node Chain',
  description: 'Testing 2 nodes',
  product: {
    _id: '111111111111111111111111',
    name: 'Widget',
    sku: 'W-01',
    criticality: 'LOW',
    dailyDemand: '50'
  },
  nodes: [
    { _id: '222222222222222222222222', name: 'Supplier', location: 'City A', type: 'SUPPLIER', inventoryQuantity: '100' },
    { _id: '333333333333333333333333', name: 'Customer', location: 'City B', type: 'CUSTOMER', inventoryQuantity: '50' },
  ],
  routes: [
    {
      _id: '444444444444444444444444',
      sourceNodeId: '222222222222222222222222',
      destinationNodeId: '333333333333333333333333',
      transportMode: 'ROAD',
      transitDays: '2',
      cost: '1000'
    }
  ]
});

assert.equal(chain2.nodes.length, 2);
assert.equal(chain2.routes.length, 1);
assert.equal(chain2.inventory.length, 2);
assert.equal(chain2.products[0].dailyDemand, 50);
console.log('✔ TEST 1 Passed: 2-node payload valid.');

console.log('--- TEST 2 & 4: Alternate route between same nodes ---');
const nodeA = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const nodeB = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const nodeC = 'cccccccccccccccccccccccc';

const chainWithAlt = createSupplyChainPayload({
  name: 'Resilient Electronics Chain',
  description: 'Chain with SEA (primary) and AIR (alternate)',
  product: {
    _id: 'dddddddddddddddddddddddd',
    name: 'Smartphone',
    sku: 'PHONE-001',
    criticality: 'HIGH',
    dailyDemand: '100'
  },
  nodes: [
    { _id: nodeA, name: 'Supplier Shenzhen', location: 'Shenzhen', type: 'SUPPLIER', inventoryQuantity: '1000', capacity: '5000' },
    { _id: nodeB, name: 'Warehouse Mumbai', location: 'Mumbai', type: 'WAREHOUSE', inventoryQuantity: '500', capacity: '4000' },
    { _id: nodeC, name: 'Customer Delhi', location: 'Delhi', type: 'CUSTOMER', inventoryQuantity: '200', capacity: '2000' },
  ],
  routes: [
    // Primary route A -> B
    {
      _id: '100000000000000000000001',
      sourceNodeId: nodeA,
      destinationNodeId: nodeB,
      transportMode: 'SEA',
      transitDays: '5',
      cost: '50000',
      capacityPerDay: '1000'
    },
    // Alternate route A -> B
    {
      _id: '100000000000000000000002',
      sourceNodeId: nodeA,
      destinationNodeId: nodeB,
      transportMode: 'AIR',
      transitDays: '2',
      cost: '150000',
      capacityPerDay: '500'
    },
    // Route B -> C
    {
      _id: '100000000000000000000003',
      sourceNodeId: nodeB,
      destinationNodeId: nodeC,
      transportMode: 'RAIL',
      transitDays: '3',
      cost: '25000',
      capacityPerDay: '800'
    }
  ]
});

assert.equal(chainWithAlt.nodes.length, 3);
assert.equal(chainWithAlt.routes.length, 3);
console.log('✔ Payload created with 3 routes (2 connecting Node A -> Node B).');

console.log('--- TEST 6 & 7: Alternative Route Service evaluation ---');
// Disrupted route is SEA (100000000000000000000001)
const alternatives = findAlternativeRoutes({
  supplyChain: chainWithAlt,
  disruptedRouteId: '100000000000000000000001',
  stockoutDays: 2,
  disruptionDurationDays: 7
});

assert.equal(alternatives.length, 1);
const altAir = alternatives[0];
assert.equal(altAir.routeId, '100000000000000000000002');
assert.equal(altAir.transportMode, 'AIR');
assert.equal(altAir.transitDays, 2);
assert.equal(altAir.cost, 150000);
assert.equal(altAir.additionalCost, 100000); // 150,000 - 50,000
assert.equal(altAir.timeSaved, 3); // 5 - 2 days faster
assert.equal(altAir.stockoutAvoided, true); // 2 days transit < 7 days disruption duration
console.log('✔ TEST 6 & 7 Passed: Alternative Route Service correctly identified AIR route!');
console.log('  Time Saved: ' + altAir.timeSaved + ' days');
console.log('  Additional Cost: ₹' + altAir.additionalCost);
console.log('  Stockout Avoided: ' + altAir.stockoutAvoided);

console.log('--- ALL ACCEPTANCE TESTS PASSED! ---');

