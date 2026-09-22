const http = require('http');
const { isUnrelatedQuery, GUARDRAIL_REJECTION_MESSAGE } = require('../services/agriClassifier');
const { analyzeAgriQuery, generateOfflineAgriAnalysis } = require('../services/agriAnalyzer');
const app = require('../server');

async function runAgriSphereTestSuite() {
  console.log('🧪 Starting AgriSphere Automated Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraDetails = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${extraDetails}`);
      failed++;
    }
  }

  function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
      });
      req.on('error', err => reject(err));
      if (postData) req.write(postData);
      req.end();
    });
  }

  // Suite 1: Domain Guardrail Rejection
  console.log('[Suite 1: Agriculture Domain Guardrails]');
  const isCodeUnrelated = isUnrelatedQuery('Write Java code');
  assert(isCodeUnrelated === true, 'Rejects "Write Java code" query');

  const isJokeUnrelated = isUnrelatedQuery('Tell me a joke');
  assert(isJokeUnrelated === true, 'Rejects "Tell me a joke" query');

  const isCropAllowed = isUnrelatedQuery('My tomato leaves are turning yellow. What should I do?');
  assert(isCropAllowed === false, 'Allows agriculture tomato disease query');

  // Suite 2: Guardrail Response Message Verification
  console.log('\n[Suite 2: Guardrail Rejection Handler]');
  const rejectionResult = await analyzeAgriQuery('What is the capital of France?');
  assert(rejectionResult.isUnrelated === true, 'Flags capital of France as unrelated');
  assert(rejectionResult.message === GUARDRAIL_REJECTION_MESSAGE, 'Returns exact AgriSphere guardrail message');

  // Suite 3: Crop Disease Analysis
  console.log('\n[Suite 3: Plant Disease Analysis]');
  const diseaseRes = await analyzeAgriQuery('My tomato leaves are turning yellow with dark spots', null, 'AUTO', 'en');
  assert(diseaseRes.isUnrelated === false, 'Processes tomato disease query');
  assert(diseaseRes.result.crop === 'Tomato', 'Identifies crop as Tomato');
  assert(diseaseRes.result.category === 'Plant Disease', 'Categorizes as Plant Disease');

  // Suite 4: Irrigation Advice
  console.log('\n[Suite 4: Irrigation Schedule Advice]');
  const waterRes = await analyzeAgriQuery('When should I irrigate my paddy rice field?', null, 'AUTO', 'kn');
  assert(waterRes.result.crop.includes('Rice'), 'Identifies crop as Rice');
  assert(waterRes.result.category === 'Irrigation Guidance', 'Categorizes as Irrigation Guidance');

  // Suite 5: Image Attachment Handling
  console.log('\n[Suite 5: Image Attachment Architecture]');
  const dummyImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';
  const imgRes = await analyzeAgriQuery('Check this crop leaf', dummyImageBase64, 'AUTO', 'hi');
  assert(imgRes.hasImage === true, 'Registers image attachment payload');
  assert(imgRes.result.symptoms.some(s => s.includes('📷')), 'Includes visual camera note in symptoms');

  // Suite 6: Single Service HTTP Endpoint Tests
  console.log('\n[Suite 6: Single Web Service Deployment Endpoints]');
  
  let testServer;
  let port;

  try {
    testServer = app.listen(0);
    port = testServer.address().port;
  } catch (e) {
    port = process.env.PORT || 5000;
  }

  try {
    // Health
    const healthRes = await makeRequest({ hostname: 'localhost', port, path: '/api/health', method: 'GET' });
    assert(healthRes.statusCode === 200, 'GET /api/health returns 200 OK');
    assert(healthRes.body.includes('AgriSphere AI Agriculture Engine'), 'Health returns AgriSphere service name');

    // Root SPA
    const rootRes = await makeRequest({ hostname: 'localhost', port, path: '/', method: 'GET' });
    assert(rootRes.statusCode === 200, 'GET / returns 200 OK HTML');
    assert(rootRes.body.includes('AgriSphere'), 'Root serves compiled AgriSphere React index.html');

    // SPA Routes
    const dashRes = await makeRequest({ hostname: 'localhost', port, path: '/dashboard', method: 'GET' });
    assert(dashRes.statusCode === 200, 'GET /dashboard returns 200 OK (SPA fallback)');

    const cropsRes = await makeRequest({ hostname: 'localhost', port, path: '/crops', method: 'GET' });
    assert(cropsRes.statusCode === 200, 'GET /crops returns 200 OK (SPA fallback)');

    const historyRes = await makeRequest({ hostname: 'localhost', port, path: '/consultations', method: 'GET' });
    assert(historyRes.statusCode === 200, 'GET /consultations returns 200 OK (SPA fallback)');

    // POST /api/analyze
    const payload = JSON.stringify({ queryText: 'What fertilizer is suitable for maize crop?', language: 'en' });
    const analyzeHttpRes = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);

    assert(analyzeHttpRes.statusCode === 200, 'POST /api/analyze returns 200 OK');
    assert(analyzeHttpRes.body.includes('Maize') || analyzeHttpRes.body.includes('Fertilizer'), 'API analyze returns agricultural assessment JSON');

  } catch (err) {
    console.error('❌ Error during HTTP tests:', err);
    failed++;
  } finally {
    if (testServer) testServer.close();
  }


  console.log(`\n======================================================`);
  console.log(`📊 AgriSphere Test Suite: ${passed} PASSED, ${failed} FAILED out of ${passed + failed} assertions.`);
  console.log(`======================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runAgriSphereTestSuite();
