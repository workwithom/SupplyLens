# SupplyLens — Product Evolution & 5-Day Implementation Plan

## 1. Purpose of This Document

This document is the **working product and engineering specification for the next evolution of SupplyLens**.

It is intentionally separate from the original README's "current status" description:

- The original README describes what is implemented today.
- This document describes what we are going to evolve over the next 5 days.
- Do not claim planned features as already implemented.
- Implement incrementally. Do not rebuild the whole application in one step.
- Every implementation step must preserve working existing features unless the step explicitly replaces them.

The coding agent (Cursor) should read this document before making changes.

---

# 2. Product Definition

## 2.1 Core problem

Supply chains contain dependencies between suppliers, warehouses, factories, transportation routes, and customers.

When a route or node becomes unavailable, a planner needs to answer:

1. What part of the supply chain is affected?
2. How long could the disruption matter?
3. How much inventory buffer is available?
4. Could a stockout occur?
5. Are there alternative routes?
6. What is the tradeoff between speed and cost?
7. What action should the planner consider?

## 2.2 Product statement

> **SupplyLens helps supply-chain planners model a supply chain, simulate a disruption, calculate its basic operational impact, and use AI to explain the impact and recommend mitigation options.**

The value is NOT simply "AI-powered visualization".

The core workflow is:

```text
Model
  ↓
Simulate disruption
  ↓
Calculate impact
  ↓
Compare alternatives
  ↓
Explain + recommend
```

## 2.3 Important product boundary

SupplyLens does NOT currently have real enterprise operational data.

Therefore the first realistic version uses:

- user-entered data
- realistic synthetic/demo templates
- deterministic calculations based on configured assumptions

Later, the system can accept CSV/JSON imports and eventually external ERP/WMS/TMS/carrier/weather integrations.

Never pretend synthetic data is real operational data.

---

# 3. Product Philosophy

## Keep it simple but real

Do NOT turn the project into an artificial enterprise architecture.

Do NOT add:

- Kafka without a real event-stream requirement
- Kubernetes without a deployment-scale requirement
- microservices without independent scaling/team ownership needs
- IoT integrations just for appearance
- GPS tracking without a data provider
- machine-learning forecasting without historical data
- complex Monte Carlo simulation before deterministic simulation works

The target is a small, believable disruption-analysis product.

---

# 4. Current Project Baseline

The current application is a React/Vite frontend with an Express/Node backend.

Current implemented capabilities include:

- authentication
- MongoDB/Mongoose user persistence
- JWT authentication
- protected React routes
- supply-chain builder
- checkpoints
- product states
- transport modes: Air, Sea, Road, Rail, Pipeline
- route visualization
- disruption simulation
- Groq-based simulation impact analysis
- deterministic fallback analysis
- CSV/HTML report export
- Gemini generation endpoint
- Gemini supply-chain chatbot
- Open-Meteo weather endpoint

Important current limitations:

- supply-chain definitions are not persisted
- route data is passed through React Router state
- dashboard data is hard-coded/sample data
- there are no live carrier/GPS/IoT/ERP feeds
- risk-analysis JSON is rendered but not independently validated/calculated
- AI output is advisory
- Groq is currently called from the browser
- backend AI endpoints need validation/rate limiting/observability
- automated tests are missing

These limitations are accepted for the prototype and are the starting point for this evolution.

---

# 5. Target User

## Primary persona

A supply-chain/logistics analyst or planner at a small or mid-sized manufacturing/distribution company.

Example:

```text
Supplier
   ↓
Warehouse
   ↓
Factory
   ↓
Customer
```

The planner wants to know:

> "If this route fails, what happens and what should I do?"

This is the primary use case.

Do not attempt to satisfy every enterprise supply-chain role in this 5-day evolution.

---

# 6. Target User Experience

The target workflow is:

```text
Login
  ↓
Dashboard
  ↓
My Supply Chains
  ↓
Open a supply chain
  ↓
Visualize network
  ↓
Select route/node
  ↓
Create disruption scenario
  ↓
Risk Engine calculates impact
  ↓
Compare alternatives
  ↓
AI explains results
  ↓
Recommendations
  ↓
Export report
```

For the first version, "real-time monitoring" is NOT required.

---

# 7. The Most Important Architectural Principle

## Deterministic engine first, AI second

If something can be calculated from structured data, calculate it in code.

### Deterministic code should calculate

- inventory coverage
- expected delay
- affected nodes
- affected routes
- stockout days
- route capacity
- route cost
- alternative route cost difference
- transit-time difference
- basic risk level

### AI should handle

- natural-language explanation
- scenario summary
- recommendation wording
- mitigation suggestions
- tradeoff explanation
- prioritization/explanation of available alternatives

AI must NOT be the authoritative calculator for core numerical facts.

Bad architecture:

```text
User
 ↓
LLM
 ↓
"Risk = 83%, delay = 5 days"
```

Good architecture:

```text
Structured supply-chain data
          ↓
     Risk Engine
          ↓
   deterministic facts
          ↓
      AI Service
          ↓
 explanation + recommendations
```

This makes the system safer, more testable, and easier to defend.

---

# 8. Target Architecture

Use a modular monolith.

```text
                         USER
                           │
                           ▼
                    React + Vite
                           │
                       HTTPS/REST
                           │
                           ▼
                ┌────────────────────┐
                │   Express Backend  │
                │                    │
                │ Auth               │
                │ Supply Chain       │
                │ Simulation         │
                │ Risk Engine        │
                │ AI Service         │
                │ Report Service     │
                └─────────┬──────────┘
                          │
              ┌───────────┼────────────┐
              ▼           ▼            ▼
           MongoDB      Gemini        Groq
              │
              ▼
      Supply-chain records
```

The backend should eventually be organized roughly as:

```text
backend/
  models/
  routes/
  controllers/
  services/
    risk/
    simulation/
    ai/
  validators/
  middleware/
  utils/
```

Do not reorganize the entire backend before it is needed. Refactor incrementally.

---

# 9. Core Domain Model

The first realistic version should use these concepts.

## 9.1 User

Existing authentication model.

```text
User
- name
- email
- passwordHash
```

Do not redesign authentication unless required for the current step.

---

## 9.2 SupplyChain

```text
SupplyChain
- name
- description
- ownerId
- products[]
- nodes[]
- routes[]
- createdAt
- updatedAt
```

A supply chain belongs to a user.

---

## 9.3 Node

A node represents a meaningful physical/business location.

Types:

```text
SUPPLIER
WAREHOUSE
FACTORY
CUSTOMER
```

Fields:

```text
Node
- id
- name
- type
- location
- capacity
```

For the first version, location can remain a simple string or structured city/country field.

Do not add complex geospatial infrastructure unless needed.

---

## 9.4 Product

```text
Product
- id
- name
- sku
- criticality
- dailyDemand
```

Criticality can initially be:

```text
LOW
MEDIUM
HIGH
```

---

## 9.5 Inventory

Inventory can initially be associated with a node and product:

```text
Inventory
- productId
- nodeId
- quantity
```

For the first version, do not build a complete inventory management system.

We only need enough inventory information to estimate coverage and stockout risk.

---

## 9.6 Route

A route connects two nodes.

```text
Route
- id
- sourceNodeId
- destinationNodeId
- transportMode
- transitDays
- capacityPerDay
- cost
```

Transport modes:

```text
ROAD
RAIL
SEA
AIR
PIPELINE
```

Only use modes that make sense for the selected nodes/data.

---

# 10. Synthetic Data Strategy

Because SupplyLens does not yet have real supply-chain feeds, we will use realistic synthetic data.

## Example template

Electronics supply chain:

```text
Supplier A
    │
    │ Road — 2 days
    ▼
Warehouse A
    │
    │ Rail — 3 days
    ▼
Factory A
    │
    │ Road — 1 day
    ▼
Customer A
```

Example values:

```text
Warehouse inventory = 1000 units
Daily demand        = 200 units

Rail transit        = 3 days
Rail capacity       = 500 units/day
Rail cost           = ₹80,000
```

Inventory coverage:

```text
inventoryCoverageDays
    = inventoryQuantity / dailyDemand

    = 1000 / 200
    = 5 days
```

If disruption duration is 7 days:

```text
stockoutDays
    = max(0, disruptionDays - inventoryCoverageDays)

    = max(0, 7 - 5)
    = 2 days
```

This is a simulation based on assumptions, not a real-world prediction.

---

# 11. Risk Engine V1

Keep the first risk engine simple.

## Inputs

```text
Supply chain
Disruption
Inventory
Product demand
Routes
```

## Disruption V1

Start with one disruption type:

```text
ROUTE_FAILURE
```

Input:

```text
routeId
durationDays
```

Later we can add:

```text
NODE_FAILURE
WEATHER_DISRUPTION
SUPPLIER_FAILURE
```

but not initially.

---

# 12. Risk Engine V1 Calculations

The engine should calculate:

## 12.1 Affected route

The disrupted route.

## 12.2 Affected downstream nodes

Identify nodes downstream from the disrupted route.

For a simple linear chain:

```text
Supplier → Warehouse → Factory → Customer
```

if:

```text
Warehouse → Factory
```

fails, then Factory and Customer are downstream affected nodes.

The initial implementation may support only simple directed paths. Do not build a complicated graph engine unless the existing route structure requires it.

---

## 12.3 Inventory coverage

```text
inventoryCoverageDays =
    inventoryQuantity / dailyDemand
```

Guard against:

- zero demand
- negative values
- missing inventory

---

## 12.4 Stockout days

```text
stockoutDays =
    max(0, disruptionDurationDays - inventoryCoverageDays)
```

---

## 12.5 Basic risk level

Initial rules:

```text
LOW:
    no expected stockout

MEDIUM:
    disruption affects operations but
    stockout is not expected

HIGH:
    stockout is expected

CRITICAL:
    stockout is significant and/or
    critical product is affected
```

The exact thresholds should be implemented in a centralized risk-rule module, not scattered throughout React components.

The rules must be documented and testable.

---

# 13. Alternative Route Logic V1

We want to compare alternative routes.

Example:

Normal route:

```text
Rail
Transit = 3 days
Cost = ₹80,000
```

Alternative:

```text
Road
Transit = 1 day
Cost = ₹120,000
```

Calculate:

```text
additionalCost = alternativeCost - normalCost
timeSaved = normalTransitDays - alternativeTransitDays
```

Then determine whether the alternative reduces projected stockout risk.

Example:

```text
Normal:
7 day disruption
5 day inventory
2 day stockout

Alternative:
1 day replacement transit
stockout avoided
```

The system should present the tradeoff clearly.

---

# 14. AI Layer

AI receives deterministic results.

Example payload:

```json
{
  "disruption": {
    "type": "ROUTE_FAILURE",
    "durationDays": 7
  },
  "impact": {
    "inventoryCoverageDays": 5,
    "stockoutDays": 2,
    "riskLevel": "HIGH"
  },
  "alternatives": [
    {
      "transportMode": "ROAD",
      "transitDays": 1,
      "cost": 120000,
      "additionalCost": 40000,
      "stockoutAvoided": true
    }
  ]
}
```

AI should produce structured output such as:

```json
{
  "summary": "...",
  "riskExplanation": "...",
  "recommendations": [
    "...",
    "..."
  ],
  "tradeoffs": [
    "..."
  ]
}
```

Do not let AI invent numerical facts.

Prompt it to use the supplied facts and explicitly say when information is unavailable.

---

# 15. AI Provider Strategy

The application should have an abstraction:

```text
AI Service
  ↓
analyzeScenario(data)
```

Provider implementations can be:

```text
Gemini
Groq
Local fallback
```

Do not hard-code AI-provider logic into UI components.

All production API keys must remain server-side.

Current Groq browser access must eventually become:

```text
React
  ↓
Express
  ↓
Groq
```

not:

```text
React
  ↓
Groq
```

---

# 16. AI Failure Strategy

AI is optional for the core simulation.

If AI:

- times out
- returns invalid JSON
- reaches quota
- is unavailable

the risk engine result must still be displayed.

Example:

```text
Risk: HIGH
Stockout: 2 days
Alternative: Road
Additional cost: ₹40,000
```

Then:

```text
AI explanation unavailable.
Deterministic simulation results are shown above.
```

Never make AI availability a prerequisite for the product's core calculation.

---

# 17. Dashboard V1

The existing dashboard contains sample data.

Replace it gradually with actual user data.

Useful metrics:

```text
My Supply Chains        4
Active Scenarios        3
High-Risk Routes        2
Products at Risk        5
```

Then:

```text
Recent scenarios
- Rail route failure
- Supplier disruption
- Warehouse disruption
```

Do not add decorative metrics that aren't backed by database records.

---

# 18. Data Flow

Target flow:

```text
React
  │
  │ POST /api/supply-chains
  ▼
Express
  │
  ▼
Validation
  │
  ▼
SupplyChain Service
  │
  ▼
MongoDB
  │
  ▼
Supply-chain ID
  │
  ▼
React
```

Opening a supply chain:

```text
React
  │
  │ GET /api/supply-chains/:id
  ▼
Express
  │
  ▼
MongoDB
  │
  ▼
SupplyChain
  │
  ▼
Visualization
```

Simulation:

```text
React
  │
  │ POST /api/supply-chains/:id/simulations
  ▼
Express
  │
  ▼
Simulation Service
  │
  ▼
Risk Engine
  │
  ▼
Deterministic Result
  │
  ▼
AI Service
  │
  ▼
Final Analysis
  │
  ▼
React
```

---

# 19. Database Decision

## MongoDB for this 5-day evolution

Keep MongoDB.

Reason:

- current project already uses it
- current scale is small
- supply-chain documents can be represented naturally
- migration would consume time without improving the immediate product

MongoDB is NOT a permanent architectural promise.

## PostgreSQL later

Consider PostgreSQL when the product has strong relationships between:

```text
suppliers
products
inventory
orders
shipments
warehouses
users
```

and needs:

- transactions
- constraints
- complex joins
- financial accuracy
- relational tenant isolation
- analytical queries

Do not migrate prematurely.

---

# 20. What We Are Building in 5 Days

## Day 1 — Persistence foundation

Goal:

> A supply chain can be created, saved to MongoDB, loaded again, and survive browser refresh.

Implement only:

```text
SupplyChain
Node
Route
Product
Inventory
```

and the required API endpoints.

No risk-engine work yet.

No major UI redesign.

---

## Day 2 — Deterministic simulation

Goal:

> Breaking a route produces a mathematically explainable impact result.

Implement:

```text
ROUTE_FAILURE
durationDays
affected nodes
inventory coverage
stockout days
risk level
```

No AI dependency.

---

## Day 3 — Alternatives

Goal:

> The system can compare a disrupted route with an alternative route.

Implement:

```text
alternative route
transit comparison
cost comparison
time saved
stockout avoided
```

---

## Day 4 — AI reasoning

Goal:

> AI explains the deterministic result and recommends actions.

Implement:

```text
AI service abstraction
server-side provider call
structured response
fallback behavior
recommendations
tradeoff explanation
```

---

## Day 5 — Product integration + hardening

Goal:

> The whole workflow feels like one coherent product.

Connect:

```text
Dashboard
 ↓
Saved Supply Chains
 ↓
Visualization
 ↓
Simulation
 ↓
Risk Result
 ↓
Alternatives
 ↓
AI Recommendation
 ↓
Report
```

Then:

- fix obvious bugs
- validate inputs
- protect endpoints
- remove client-side AI key exposure
- run lint/build
- add focused tests for the risk engine
- deploy a demo

---

# 21. Development Rules for Cursor

Cursor must follow these rules:

1. Read this document before each implementation step.
2. Inspect the existing repository before modifying code.
3. Do not rewrite the entire application.
4. Do not create duplicate models/services if an existing implementation can be extended.
5. Preserve existing working authentication unless the current task requires changes.
6. Make one small coherent change at a time.
7. Do not implement future-day features early.
8. Do not add dependencies unless necessary.
9. Do not invent APIs or environment variables.
10. Do not expose new secrets to the frontend.
11. Keep business calculations out of React components.
12. Keep risk calculations deterministic and testable.
13. Keep AI calls behind the backend.
14. Use realistic synthetic data only where actual data is unavailable.
15. Clearly label synthetic/demo assumptions in the UI where appropriate.
16. Do not claim real-time tracking.
17. Do not claim AI predictions are ground truth.
18. After every step, run the relevant lint/build/tests.
19. Report files changed and why.
20. Stop after the requested step and wait for the next instruction.

---

# 22. Implementation Prompts for Cursor

## Prompt 0 — Project reconnaissance

Use this before making code changes.

```text
You are working on the SupplyLens repository.

FIRST read the repository's:
1. OLDversion.md
2. SUPPLYLENS_MASTER_PLAN.md
3. package.json files
4. backend structure
5. React structure
6. existing MongoDB/Mongoose models
7. existing Express routes/controllers/services
8. current supply-chain builder
9. current visualization
10. current simulation/impact implementation

Do NOT modify code yet.

Your job is to understand the existing architecture and identify:
- where supply-chain data is currently represented
- where it is stored temporarily
- how React Router state is currently used
- existing MongoDB models
- existing backend route conventions
- existing API response conventions
- existing authentication middleware
- existing simulation logic
- existing AI integrations
- any reusable components/services

Then give me:
A. Current relevant file tree
B. Current supply-chain data flow
C. Files that will likely need modification for Day 1
D. Potential conflicts/risks
E. A minimal implementation plan for Day 1 Step 1

Do not modify any files.
Stop after the analysis.
```

---

# 23. Day 1 — Step 1 Prompt

This is the first actual coding step.

```text
You are continuing work on SupplyLens.

Read SUPPLYLENS_MASTER_PLAN.md completely before coding.

We are on:
DAY 1 — PERSISTENCE FOUNDATION
STEP 1 ONLY.

Goal:
Understand and define the persistence model for a SupplyChain without breaking the current application.

First inspect the existing:
- User model
- supply-chain builder data structure
- checkpoint structure
- route/transport structure
- existing API patterns
- MongoDB connection setup

Do NOT implement the entire persistence system yet.

For this step:
1. Design the minimum Mongoose schema/model structure required for:
   - SupplyChain
   - Node
   - Route
   - Product
   - Inventory
2. Reuse existing concepts where possible.
3. Avoid unnecessary normalization or over-engineering.
4. Make ownership explicit through the authenticated user.
5. Preserve existing transport modes.
6. Preserve compatibility with the current builder as much as reasonably possible.
7. Do not modify the frontend unless absolutely necessary to establish compatibility.
8. Do not implement simulation/risk logic.
9. Do not implement AI changes.

Before editing, explain the proposed schema mapping and which files you will modify.

Then implement only this step.

After implementation:
- run backend lint/build if available
- verify MongoDB model imports compile
- report changed files
- explain any migration/compatibility concern

STOP after Step 1.
```

---

# 24. Day 1 — Step 2 Prompt

```text
Read SUPPLYLENS_MASTER_PLAN.md.

We are on DAY 1 — STEP 2.

Assume Step 1 is working.

Goal:
Create backend CRUD APIs for a user's supply chains.

Implement only the minimum required endpoints:

POST   /api/supply-chains
GET    /api/supply-chains
GET    /api/supply-chains/:id
PUT    /api/supply-chains/:id
DELETE /api/supply-chains/:id

Requirements:
- authenticated user ownership
- never return another user's supply chain
- validate required fields
- reuse existing authentication middleware
- follow existing backend conventions
- return consistent JSON responses
- do not implement risk/simulation/AI
- do not redesign unrelated routes
- do not add unnecessary dependencies

Inspect existing code before changing it.

After implementation:
- test the endpoints with the project's available method
- run lint/build if available
- report changed files
- mention any assumptions

STOP after Step 2.
```

---

# 25. Day 1 — Step 3 Prompt

```text
Read SUPPLYLENS_MASTER_PLAN.md.

We are on DAY 1 — STEP 3.

Goal:
Connect the existing SupplyLens builder to persistence.

Current desired flow:

Create Supply Chain
    ↓
POST /api/supply-chains
    ↓
MongoDB
    ↓
return supplyChainId
    ↓
navigate to visualization using the ID

Also update visualization so it can load:

GET /api/supply-chains/:id

Requirements:
- preserve the existing builder UI as much as possible
- map current checkpoint/transport data into the new backend model
- do not rebuild the UI
- do not implement risk calculations
- do not implement AI changes
- browser refresh on the visualization page must no longer lose the supply chain
- handle loading/error/not-found states
- preserve authentication

Inspect current builder and visualization before editing.

After implementation:
1. create a supply chain
2. save it
3. open visualization
4. refresh the page
5. confirm the data remains available

Run lint/build.

Report changed files and test result.

STOP after this step.
```

---

# 26. Day 2 — Step 1 Prompt

```text
Read SUPPLYLENS_MASTER_PLAN.md.

We are now on DAY 2 — DETERMINISTIC SIMULATION — STEP 1.

Do NOT implement AI.

Goal:
Create a small backend Risk Engine that can calculate the impact of a ROUTE_FAILURE.

Input:
- supply chain
- routeId
- disruptionDurationDays

Calculate:
1. disrupted route
2. downstream affected nodes
3. relevant product inventory
4. daily demand
5. inventory coverage days
6. stockout days
7. basic risk level

Core calculation:

inventoryCoverageDays =
    inventoryQuantity / dailyDemand

stockoutDays =
    max(0, disruptionDurationDays - inventoryCoverageDays)

Handle:
- zero demand
- missing inventory
- invalid duration
- negative values
- missing route
- missing downstream nodes

Keep the risk engine independent of React.

Put the calculation in a testable backend service/module.

Do not add AI.
Do not redesign the dashboard.
Do not add alternative-route logic yet.

Add focused unit tests for the calculation.

Run tests and report results.

STOP.
```

---

# 27. Day 2 — Step 2 Prompt

```text
Read SUPPLYLENS_MASTER_PLAN.md.

DAY 2 — STEP 2.

Connect the deterministic Risk Engine to the existing simulation flow.

Goal:

User selects route
 ↓
sets disruption duration
 ↓
backend simulation endpoint
 ↓
Risk Engine
 ↓
structured deterministic result
 ↓
frontend displays result

The result should include:
- disruption information
- affected nodes
- inventory coverage
- stockout days
- risk level

Do NOT call Gemini or Groq in this step.

Do not let the frontend independently calculate the authoritative risk result.

Reuse the existing simulation UI where possible.

Add loading/error states.

Test the complete flow.

Run tests + lint + build.

STOP after this step.
```

---

# 28. Day 3 — Step 1 Prompt

```text
Read SUPPLYLENS_MASTER_PLAN.md.

DAY 3 — ALTERNATIVES — STEP 1.

Goal:
Allow the risk engine to identify alternative routes that can replace a disrupted route.

Use the existing route data.

For a disrupted route:
- find candidate routes connecting the same relevant source/destination or otherwise valid replacement path
- keep the first implementation simple
- do not build a general-purpose route optimization engine

For each alternative calculate:
- transport mode
- transit days
- cost
- additional cost compared with original route
- time saved compared with original route

Do not use AI.

Do not add complex graph algorithms unless the existing data requires them.

Add unit tests for the comparison calculations.

STOP after implementation and testing.
```

---

# 29. Day 3 — Step 2 Prompt

```text
Read SUPPLYLENS_MASTER_PLAN.md.

DAY 3 — STEP 2.

Goal:
Connect alternative-route comparison to the simulation result.

The simulation response should now contain:

Base disruption impact
+
Alternative routes
+
Cost/time comparison

Show the user:

Original route:
- transit
- cost

Alternative:
- transit
- cost
- additional cost
- time saved

Also indicate whether the alternative can avoid the projected stockout based on deterministic calculations.

Do not add AI.

Do not redesign unrelated pages.

Run tests, lint, and build.

STOP.
```

---

# 30. Day 4 — Step 1 Prompt

```text
Read SUPPLYLENS_MASTER_PLAN.md.

DAY 4 — AI REASONING — STEP 1.

Goal:
Create a backend AI service abstraction.

Required interface concept:

analyzeScenario(scenarioData)

The rest of the application must not depend directly on Gemini or Groq implementation details.

Create a provider structure that allows:
- Gemini
- Groq
- local fallback

Use whichever existing provider integration is most stable in the repository as the initial provider.

IMPORTANT:
- AI calls must happen on the backend
- do not expose API keys through VITE_* variables
- do not move secrets into React
- do not remove working deterministic simulation

AI receives deterministic facts and should NOT calculate authoritative numbers.

Return structured:
- summary
- riskExplanation
- recommendations
- tradeoffs

Validate AI output before returning it.

If AI fails, return deterministic results without AI text.

Do not redesign the UI yet.

STOP after implementation and testing.
```

---

# 31. Day 4 — Step 2 Prompt

```text
Read SUPPLYLENS_MASTER_PLAN.md.

DAY 4 — STEP 2.

Connect the AI Service to the simulation result.

Flow:

Simulation
 ↓
Risk Engine
 ↓
Deterministic facts
 ↓
AI Service
 ↓
Explanation + recommendations

AI prompt must explicitly instruct the model:
- use only supplied facts
- do not invent costs
- do not invent delays
- do not invent inventory quantities
- do not invent routes
- recommendations must be based on available alternatives
- clearly state when information is unavailable

Frontend should display:
1. deterministic impact
2. risk level
3. alternatives
4. AI explanation
5. recommendations
6. tradeoffs

If AI is unavailable:
show deterministic results and a non-blocking AI-unavailable message.

Run tests, lint, and build.

STOP.
```

---

# 32. Day 5 — Step 1 Prompt

```text
Read SUPPLYLENS_MASTER_PLAN.md.

DAY 5 — PRODUCT INTEGRATION — STEP 1.

Goal:
Replace the most important hard-coded dashboard values with real data from the authenticated user's saved supply chains and simulations.

Do not redesign the entire dashboard.

Implement only useful backed metrics such as:
- number of saved supply chains
- number of simulations
- number of high-risk scenarios
- number of products/routes currently affected in saved scenarios, if available

Every displayed metric must come from real backend data.

Do not fabricate values.

Preserve existing visual design as much as possible.

Run lint/build.

STOP.
```

---

# 33. Day 5 — Step 2 Prompt

```text
Read SUPPLYLENS_MASTER_PLAN.md.

DAY 5 — STEP 2.

Goal:
Make the main SupplyLens workflow feel coherent.

Verify and connect:

Login
 ↓
Dashboard
 ↓
Saved Supply Chain
 ↓
Visualization
 ↓
Simulation
 ↓
Deterministic Risk Result
 ↓
Alternative Routes
 ↓
AI Explanation
 ↓
Recommendations
 ↓
Existing Report Export

Fix only integration issues discovered during this workflow.

Do not introduce new large features.

Check:
- refresh behavior
- authentication
- ownership
- loading states
- API errors
- empty states
- malformed simulation input
- AI unavailable behavior

Run:
- lint
- build
- available tests

STOP and provide a concise integration report.
```

---

# 34. Day 5 — Final Hardening Prompt

```text
Read SUPPLYLENS_MASTER_PLAN.md.

This is the final 5-day hardening step.

Do not add new product features.

Review the implementation for:

SECURITY
- no client-side AI API keys
- authenticated supply-chain ownership
- input validation
- safe error responses

CORRECTNESS
- risk calculations are deterministic
- division by zero is handled
- negative/invalid values are rejected
- AI cannot overwrite deterministic facts

RELIABILITY
- AI failure does not break simulation
- missing data produces understandable errors
- refresh works on saved supply-chain pages

CODE QUALITY
- business logic is not duplicated in React
- risk engine is testable
- no obvious dead code from the old flow
- no unnecessary dependencies

Run:
- backend tests
- frontend lint
- frontend build
- backend checks

Do not refactor unrelated code.

Report:
1. what is now working
2. known limitations
3. remaining production risks
4. files changed during hardening

STOP.
```

---

# 35. Expected V1 Simulation Example

The finished system should be able to represent a synthetic scenario like:

```text
Electronics Supply Chain

Supplier A
    │
    │ Road — 2 days
    ▼
Warehouse A
    │
    │ Rail — 3 days
    ▼
Factory A
    │
    │ Road — 1 day
    ▼
Customer A
```

Data:

```text
Inventory: 1000 units
Daily demand: 200 units

Rail:
Transit: 3 days
Cost: ₹80,000
```

Simulation:

```text
Rail route failure
Duration: 7 days
```

Deterministic result:

```text
Inventory coverage: 5 days
Disruption: 7 days
Projected stockout: 2 days
Risk: HIGH
```

Alternative:

```text
Road
Transit: 1 day
Cost: ₹120,000
Additional cost: ₹40,000
Time saved: 2 days
Stockout avoided: Yes
```

AI explanation:

```text
The disruption is high risk because the expected disruption
duration exceeds the available inventory buffer.

The road alternative costs more but reduces transit time and
can avoid the projected stockout.

Recommended action:
Consider the road alternative if preventing the stockout
is more valuable than the additional transport cost.
```

The numerical values come from the deterministic engine.
The AI explains the result.

---

# 36. Future Evolution — After the 5-Day Version

Do not implement these during the first 5 days unless specifically instructed.

## Phase 2

- CSV/JSON import
- better node/route editing
- scenario history
- scenario comparison
- saved reports
- better risk rules
- supplier failure
- node failure
- basic weather-risk integration

## Phase 3

- shipment entity
- purchase orders
- inventory movements
- carrier data
- shipment status
- alerts

## Phase 4

External integrations:

```text
ERP
WMS
TMS
Carrier APIs
GPS
Weather
Supplier systems
```

## Phase 5

Scale only if needed:

```text
Redis
Queue
Background workers
Event ingestion
Analytics store
```

Potential future relational migration:

```text
PostgreSQL
+
PostGIS
```

if the domain becomes highly relational/geospatial.

---

# 37. Explicit Non-Goals

The current 5-day project is NOT:

- a real-time shipment tracking platform
- an ERP
- a TMS
- a WMS
- an IoT platform
- a carrier management system
- a guaranteed financial-loss predictor
- an autonomous logistics decision-maker
- an enterprise digital twin
- a machine-learning forecasting system

It is:

> A lightweight supply-chain disruption analysis and mitigation tool.

---

# 38. Project Defense Principles

When explaining the architecture:

### Why synthetic data?

Because the prototype does not have access to enterprise operational systems. Synthetic data allows the risk engine and simulation workflow to be demonstrated without falsely claiming real-time visibility.

### Why deterministic risk engine?

Core numerical calculations must be reproducible, testable, and explainable.

### Why AI?

AI converts structured simulation results into understandable explanations and recommendations.

### Why not let AI calculate risk?

LLMs can produce plausible but incorrect numerical results. Deterministic calculations are safer for operational facts.

### Why MongoDB?

It is appropriate for the current prototype and flexible supply-chain documents. PostgreSQL can be introduced later if strong relational constraints and transactional workflows become dominant.

### Why modular monolith?

The current scale does not justify microservices. A modular monolith is easier to develop, test, deploy, and operate.

### Why no Kafka?

There is no high-volume event-stream requirement yet.

### Why no real-time tracking?

Real-time tracking requires external data providers/integrations that the current prototype does not have.

### Why use AI if data is synthetic?

AI is not responsible for generating the underlying operational truth. It interprets the deterministic simulation results. Synthetic data simply supplies the initial scenario.

---

# 39. Definition of Success

At the end of this evolution, a user should be able to say:

> "I created a realistic supply chain, saved it, simulated a route failure, saw the calculated inventory/stockout impact, compared an alternative route, and received an AI explanation of the tradeoff."

If that workflow works reliably, SupplyLens has a coherent and defensible core product.

Do not expand the scope until this workflow is solid.
