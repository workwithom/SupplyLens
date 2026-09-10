# SupplyLens

SupplyLens is a React and Express prototype for building supply-chain routes, visualizing checkpoints, simulating broken transport links, and generating AI-assisted impact analysis.

This README describes the repository as it exists today. It does not describe planned functionality as if it were already available.

## Current Status

The following capabilities are implemented in the current codebase:

- React single-page application served by Vite.
- Express backend with JSON request handling and CORS configuration.
- User registration, login, logout, and authenticated profile lookup.
- MongoDB persistence for user records through Mongoose.
- Password hashing with `bcryptjs` through the user model.
- JWT creation and cookie-based authentication middleware.
- Protected React routes for the dashboard, builder, visualization, and simulation pages.
- Supply-chain builder with a product name, multiple checkpoints, product states, and transport modes.
- Supported transport modes: Air, Sea, Road, Rail, and Pipeline.
- Route visualization showing checkpoints, segments, transport icons, start/end locations, and transport-mode summaries.
- Simulation mode that lets a user break and restore individual route links in the current browser flow.
- AI-powered simulation impact analysis through the Groq API when `VITE_GROQ_API_KEY` is configured.
- Deterministic local fallback analysis when the Groq request fails or its response cannot be parsed.
- CSV and HTML export for simulation impact reports.
- JSON input and client-side rendering for the risk-analysis page.
- Gemini-backed general generation endpoint for builder analysis and structured checkpoint suggestions.
- Gemini-backed supply-chain chatbot endpoint.
- Open-Meteo geocoding and weather endpoint that returns tomorrow's minimum, maximum, and average temperature for a city.

## Important Current Limitations

These are limitations of the current implementation, not hidden production features:

- Supply-chain definitions are not saved to MongoDB. Builder data is passed between pages through React Router state and is lost on refresh or when the flow is left.
- The dashboard uses hard-coded sample metrics, names, charts, and performance rows. It is not connected to stored supply-chain records.
- Dashboard search, sidebar links, notification controls, revenue views, messages, and settings are presentational UI elements and are not backed by working features.
- There is no live carrier, GPS, IoT, ERP, supplier, inventory, or shipment feed. The application does not currently provide real-time operational visibility.
- Risk analysis accepts JSON typed by the user and renders it locally. It does not independently calculate or verify a risk score.
- AI results are advisory generated text. They are not a source of truth for costs, delivery times, risk, compliance, or operational decisions.
- The simulation is a what-if UI flow. It does not change a real shipment, route, supplier, inventory position, or database record.
- The simulation impact service calls Groq directly from the browser. Exposing `VITE_GROQ_API_KEY` to a browser build is not suitable for production.
- The backend Gemini endpoints do not currently have request schemas, rate limiting, usage quotas, or centralized observability.
- The repository does not currently include automated tests. The backend `test` script is a placeholder that exits with an error.

## Implemented User Flows

### Authentication

1. A user registers with a name, email, and password.
2. The backend checks for an existing email and creates a MongoDB user document.
3. The Mongoose model hashes the password before persistence.
4. The backend creates a JWT and sets a `token` cookie.
5. The frontend also stores the returned token and user object in `localStorage` for its current route guard.
6. Login, logout, and `/api/auth/me` are available through the authentication router.

The current authentication implementation should be hardened before production use because the token is also returned in the JSON response and stored by the frontend.

### Build and Visualize a Supply Chain

1. Enter a product name.
2. Add or remove checkpoints.
3. Set a location and product state for each checkpoint.
4. Select a transport mode between checkpoints.
5. Submit the route to call the backend Gemini generation endpoint.
6. Open the route diagram, which displays the data held in the current navigation state.

The Gemini response is requested during submission, but the current navigation primarily passes the entered route data to the visualization page. The generated response is parsed and logged by the builder rather than being persisted as a report.

### Simulate a Disruption

1. Start simulation mode on the route diagram.
2. Break or restore transport links.
3. Submit the broken-link scenario.
4. The impact page calculates baseline impact values and attempts a structured Groq analysis.
5. If Groq is unavailable or returns invalid JSON, local fallback logic supplies impact, problems, recommendations, alternative routes, mitigation, recovery, and resilience sections.
6. Export the result as CSV or HTML.

### AI Assistant

The chatbot sends the user's message and the current in-memory supply-chain data to `POST /api/analyze-supply-chain`. The backend asks Gemini for a concise response containing an answer, risk assessment where relevant, recommendations, current-event considerations, and optimization suggestions.

### Weather Endpoint

`GET /weather?city=<city>` performs two server-side Open-Meteo requests:

1. Resolve the city to coordinates.
2. Fetch hourly temperature data.
3. Select tomorrow's temperatures.
4. Return the minimum, maximum, and average values.

This endpoint currently returns temperature only. It is not a shipment tracking or weather-alert system.

## Routes

### Frontend Routes

| Path | Access | Current behavior |
| --- | --- | --- |
| `/` | Public | Landing page |
| `/login` | Public | Login form |
| `/signup` | Public | Registration form |
| `/risk-analysis` | Public | Parse and display user-provided JSON |
| `/dashboard` | Protected | Dashboard with sample metrics and UI |
| `/create-supply-chain` | Protected | Build a route in memory |
| `/supply-chain-visualization` | Protected | View and simulate the current route |
| `/simulation-impact` | Protected | View and export disruption analysis |

### Backend Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a user |
| `POST` | `/api/auth/login` | Authenticate a user |
| `GET` | `/api/auth/logout` | Clear the authentication cookie |
| `GET` | `/api/auth/me` | Return the authenticated user |
| `POST` | `/api/generate` | Generate Gemini content for a prompt or route payload |
| `POST` | `/api/analyze-supply-chain` | Generate Gemini chatbot analysis |
| `GET` | `/weather?city=<city>` | Return tomorrow's city temperature summary |

## Architecture

```text
React + Vite
  |-- route state, local UI state, localStorage token
  |-- Gemini chatbot and generation requests
  |-- Groq simulation analysis request
  v
Express + Node.js
  |-- authentication routes and JWT middleware
  |-- Gemini API integration
  |-- Open-Meteo integration
  |-- Mongoose user model
  v
MongoDB
  `-- user documents only in the current implementation
```

### Technology Stack

- Frontend: React 19, React Router, Vite, Tailwind CSS, component CSS.
- Backend: Node.js, Express, Mongoose, CORS, cookie-parser, dotenv.
- Authentication: JSON Web Tokens and `bcryptjs`.
- AI: Google Generative AI SDK with Gemini 2.5 Flash and Gemini 1.5 Flash on the backend; Groq Llama 3 request from the frontend simulation service.
- External data: Open-Meteo geocoding and forecast APIs.
- Storage: MongoDB for users; route and analysis data are currently in memory during the browser flow.

## Local Setup

### Requirements

- Node.js with npm.
- A running MongoDB instance or MongoDB Atlas database.
- A Gemini API key for backend AI endpoints.
- A Groq API key only if the simulation should use Groq instead of its local fallback.

### Install

```bash
git clone https://github.com/workwithom/SupplyLens.git
cd SupplyLens

cd backend
npm install

cd ../react
npm install
```

### Backend Environment

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/supplylens
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRE=7d
COOKIE_EXPIRE=7
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend Environment

Create `react/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_GROQ_API_KEY=your_groq_api_key
```

Do not expose a real production Groq key through `VITE_GROQ_API_KEY`. Move that request behind the backend before deploying publicly.

### Run

In one terminal:

```bash
cd backend
npm start
```

In another terminal:

```bash
cd react
npm run dev
```

Frontend checks currently available:

```bash
cd react
npm run lint
npm run build
```

The backend does not currently have a real test command.

## Future Upgrade and Updates

The following items are potential future work. They are not implemented unless explicitly listed in the current-status section above.

### Product and Feature Updates

- Persist supply-chain definitions, checkpoints, route segments, simulations, and generated reports.
- Replace sample dashboard values with API-backed metrics and user-owned records.
- Add edit, duplicate, archive, delete, and version-history flows for supply chains.
- Add supplier, warehouse, inventory, purchase-order, shipment, carrier, and customer entities.
- Add deterministic risk rules alongside AI output so risk scores can be explained and audited.
- Add real shipment tracking through carrier APIs, GPS providers, EDI, or webhook integrations.
- Add alerts for delayed shipments, severe weather, broken links, stockouts, and supplier risk.
- Add saved scenario comparisons, Monte Carlo or probabilistic disruption modeling, and recovery-time objectives.
- Add role-based workspaces for administrators, planners, procurement teams, logistics teams, and viewers.
- Add audit logs, approval workflows, comments, report sharing, and scheduled exports.
- Move all third-party AI calls to the backend and add model selection, prompt versioning, cost controls, response validation, and redaction of sensitive data.
- Add proper validation for request bodies, email addresses, password policy, route shape, JSON risk input, and AI response schemas.
- Add automated unit, API, integration, and browser tests.

### Scalability Plan

#### Stage 1: Strengthen the current monolith

- Separate route handlers, services, validators, and repositories inside the Express application.
- Add MongoDB indexes for user email and future tenant or owner identifiers.
- Add pagination, filtering, projections, and bounded query results.
- Add structured logs, request IDs, health checks, metrics, and error tracking.
- Add Redis for rate limiting, short-lived cache entries, job state, and distributed session-related coordination where needed.
- Store generated reports and large exports in object storage rather than in MongoDB documents.
- Run the stateless API behind a load balancer with environment-based configuration and secret management.

#### Stage 2: Move slow work to jobs

AI analysis, weather refreshes, report generation, bulk imports, and external synchronization should run through a queue such as BullMQ with Redis, RabbitMQ, or a managed cloud queue. The API can then return a job ID and the frontend can poll or receive completion events rather than holding an HTTP request open.

#### Stage 3: Split only when ownership or load requires it

Keep authentication, route management, analysis orchestration, and reporting in a modular monolith until independent scaling or team ownership justifies a split. Possible later services include:

- Identity and tenant service.
- Supply-chain and master-data service.
- Shipment and event-ingestion service.
- Risk and simulation service.
- AI orchestration service.
- Reporting and export service.

Use an event bus for shipment updates and analysis jobs only after event contracts, retries, idempotency, and operational monitoring are defined.

### Database Options for Future Versions

MongoDB is reasonable for the current prototype and for flexible supply-chain documents. It can remain the primary store if route structures evolve quickly, most reads are document-oriented, and the application does not require many cross-entity transactions.

Move to a relational database such as PostgreSQL when the product requires:

- Strong relationships between suppliers, products, orders, inventory, shipments, checkpoints, and users.
- Multi-step transactions, financial accuracy, and consistent inventory reservations.
- Complex reporting, joins, constraints, and repeatable analytical queries.
- Mature row-level tenant isolation and relational audit history.

Possible relational designs include PostgreSQL with PostGIS for geographic data, TimescaleDB for time-series shipment events, or Azure Database for PostgreSQL for a managed deployment. Keep large event histories in a time-series or analytical store when transactional tables become too large.

Alternative approaches:

- **Polyglot persistence:** PostgreSQL for transactional master data, Redis for cache and queues, object storage for reports, and a warehouse such as BigQuery, Snowflake, or Azure Synapse for analytics.
- **MongoDB plus analytics store:** MongoDB for operational documents and a separate warehouse for historical reporting and BI workloads.
- **Event-driven storage:** Append shipment and sensor events to Kafka or a managed event stream, then project them into PostgreSQL, MongoDB, and analytical tables for their specific workloads.

Any migration should start with a data contract and ownership map, then use dual writes or change-data capture, backfill and reconcile records, run both systems during a verification period, and cut over only after consistency checks pass. A database change alone will not provide real-time visibility; external event sources, ingestion, idempotency, monitoring, and user-facing freshness indicators are also required.

## Security and Production Hardening Backlog

- Do not return or store JWTs in browser-accessible storage for production; use secure, appropriately configured cookies and CSRF protection.
- Move Groq calls out of the browser so API keys remain server-side.
- Configure secure cookies consistently for the deployment domain.
- Add rate limiting, request-size limits, input validation, and abuse protection to authentication and AI endpoints.
- Validate and sanitize AI output before rendering or using it in downstream workflows.
- Add secret management, dependency scanning, backups, restore testing, and MongoDB access controls.
- Add tenant isolation before supporting multiple companies in one deployment.

## License

This project currently declares the ISC license in the backend manifest. Add or update a root license file before publishing a complete license notice.

## Author

Built by [OM PATEL](https://github.com/workwithom).
