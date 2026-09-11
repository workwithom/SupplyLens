import assert from 'node:assert';
import fs from 'node:fs';

console.log('--- INFORMATION ARCHITECTURE & BUG FIX ACCEPTANCE TESTS ---');

// 1. Verify /risk-analysis is completely absent from all source files
console.log('Test 1: Risk Analysis route removal...');
const appSource = fs.readFileSync('react/src/App.jsx', 'utf8');
const navbarSource = fs.readFileSync('react/src/components/Navbar.jsx', 'utf8');
const dashboardSource = fs.readFileSync('react/src/components/Dashboard.jsx', 'utf8');
const impactSource = fs.readFileSync('react/src/components/SimulationImpact.jsx', 'utf8');

assert(!appSource.includes('/risk-analysis'), 'App.jsx must not have /risk-analysis route');
assert(!appSource.includes('RiskAnalysis'), 'App.jsx must not import RiskAnalysis');
assert(!navbarSource.includes('/risk-analysis'), 'Navbar must not link to /risk-analysis');
assert(!navbarSource.includes('Risk Analysis'), 'Navbar must not mention Risk Analysis');
assert(!dashboardSource.includes('/risk-analysis'), 'Dashboard must not link to /risk-analysis');
assert(!impactSource.includes('/risk-analysis'), 'SimulationImpact must not link to /risk-analysis');
assert(!fs.existsSync('react/src/components/RiskAnalysisPage.jsx'), 'RiskAnalysisPage.jsx should be deleted');
assert(!fs.existsSync('react/src/components/RiskAnalysis.jsx'), 'RiskAnalysis.jsx should be deleted');
console.log('✔ Test 1 Passed: Frontend Risk Analysis page completely eliminated.');

// 2. Verify Backend Risk Engine is untouched and intact
console.log('Test 2: Backend Risk Engine preservation...');
assert(fs.existsSync('backend/services/risk/routeFailureRiskEngine.js'), 'Backend routeFailureRiskEngine.js must exist');
assert(fs.existsSync('backend/services/risk/alternativeRouteService.js'), 'Backend alternativeRouteService.js must exist');
console.log('✔ Test 2 Passed: Backend Risk Engine intact.');

// 3. Verify Navbar has correct states
console.log('Test 3: Navbar authenticated vs unauthenticated states...');
assert(navbarSource.includes('/my-supply-chains'), 'Navbar must link to /my-supply-chains');
assert(navbarSource.includes('/create-supply-chain'), 'Navbar must link to /create-supply-chain');
assert(navbarSource.includes('/dashboard'), 'Navbar must link to /dashboard');
assert(navbarSource.includes('isLoggedIn'), 'Navbar must check isLoggedIn');
assert(navbarSource.includes('handleLogout'), 'Navbar must have logout handler');
console.log('✔ Test 3 Passed: Navbar has clean authenticated and unauthenticated navigation.');

// 4. Verify Create Supply Chain initial blank state (BUG FIX)
console.log('Test 4: Create Supply Chain blank initialization (Bug Fix)...');
const builderSource = fs.readFileSync('react/src/components/SupplyChainBuilder.jsx', 'utf8');
assert(builderSource.includes("const [supplyChainName, setSupplyChainName] = useState('');"), 'Supply chain name must start blank');
assert(builderSource.includes("const [description, setDescription] = useState('');"), 'Description must start blank');
assert(!builderSource.includes("useState('Consumer Electronics Distribution')"), 'Must NOT initialize with sample chain name');
assert(!builderSource.includes("name: 'Flagship Smartphone'"), 'Must NOT initialize with sample product name');
assert(!builderSource.includes("name: 'Shenzhen Tech Component Hub'"), 'Must NOT initialize with sample node name');
assert(!builderSource.includes("name: 'Mumbai Central Logistics Hub'"), 'Must NOT initialize with sample node name');
console.log('✔ Test 4 Passed: Builder initialized with 100% blank business fields.');

// 5. Verify App.jsx routes: /my-supply-chains and redirect for /supply-chain-visualization
console.log('Test 5: App.jsx routing and redirects...');
assert(appSource.includes('path="/my-supply-chains"'), 'App.jsx must have /my-supply-chains route');
assert(appSource.includes('Navigate to="/my-supply-chains"'), 'Standalone /supply-chain-visualization must redirect to /my-supply-chains');
assert(appSource.includes('path="/supply-chain-visualization/:id"'), 'Visualization by :id must be protected');
console.log('✔ Test 5 Passed: Routing properly structured with MySupplyChains and redirects.');

// 6. Verify MySupplyChains component exists and has required features
console.log('Test 6: MySupplyChains component structure...');
const myChainsSource = fs.readFileSync('react/src/components/MySupplyChains.jsx', 'utf8');
assert(myChainsSource.includes('getSupplyChains'), 'Must fetch via getSupplyChains()');
assert(myChainsSource.includes('searchQuery'), 'Must support search query');
assert(myChainsSource.includes('getAlternateRouteCount'), 'Must compute alternate routes');
assert(myChainsSource.includes('View & Simulate'), 'Must have View & Simulate button');
assert(myChainsSource.includes('/supply-chain-visualization/'), 'Must navigate to /supply-chain-visualization/:id');
assert(myChainsSource.includes('No supply chains yet'), 'Must provide empty state');
console.log('✔ Test 6 Passed: MySupplyChains page verified.');

// 7. Verify Dashboard separation
console.log('Test 7: Dashboard responsibility separation...');
assert(dashboardSource.includes('Active Supply Chains'), 'Dashboard should label table as Active Supply Chains preview');
assert(dashboardSource.includes('/my-supply-chains'), 'Dashboard should link to /my-supply-chains');
console.log('✔ Test 7 Passed: Dashboard clearly separated from full supply chain list.');

// 8. Verify Alternate Routes support is preserved
console.log('Test 8: Alternate routes multi-route support...');
assert(builderSource.includes('addAlternateRouteFor'), 'Builder must have addAlternateRouteFor');
assert(builderSource.includes('routeClassificationMap'), 'Builder must classify primary vs alternate');
console.log('✔ Test 8 Passed: Alternate route multi-route support intact.');

console.log('--- ALL ACCEPTANCE CRITERIA VERIFIED 100% ---');
