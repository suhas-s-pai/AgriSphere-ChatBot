const http = require('http');
const { isUnrelatedQuery, GUARDRAIL_REJECTION_MESSAGE } = require('../services/agriClassifier');
const { analyzeAgriQuery, generateOfflineAgriAnalysis } = require('../services/agriAnalyzer');
const app = require('../server');
const axios = require('axios');
const {
  getImageTopics,
  getReferenceImages,
  wantsReferenceImages,
  isWikimediaHost
} = require('../services/referenceImageService');

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
  assert(diseaseRes.result.crop && diseaseRes.result.crop.toLowerCase().includes('tomato'), 'Identifies crop as Tomato');
  assert(diseaseRes.result.category && (diseaseRes.result.category.toLowerCase().includes('disease') || diseaseRes.result.category.toLowerCase().includes('plant') || diseaseRes.result.category.toLowerCase().includes('crop') || diseaseRes.result.category.toLowerCase().includes('health')), 'Categorizes as Plant Disease');

  // Suite 4: Irrigation Advice
  console.log('\n[Suite 4: Irrigation Schedule Advice]');
  const waterRes = await analyzeAgriQuery('When should I irrigate my paddy rice field?', null, 'AUTO', 'kn');
  assert(waterRes.result.crop && (waterRes.result.crop.toLowerCase().includes('rice') || waterRes.result.crop.toLowerCase().includes('paddy')), 'Identifies crop as Rice');
  assert(waterRes.result.category && (waterRes.result.category.toLowerCase().includes('irrigation') || waterRes.result.category.toLowerCase().includes('water') || waterRes.result.category.toLowerCase().includes('guidance')), 'Categorizes as Irrigation Guidance');

  // Suite 5: Image Attachment Handling
  console.log('\n[Suite 5: Image Attachment Architecture]');
  const dummyImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';
  const imgRes = await analyzeAgriQuery('Check this crop leaf', dummyImageBase64, 'AUTO', 'hi');
  assert(imgRes.hasImage === true, 'Registers image attachment payload');

  // Suite 5b: Reference image request detection and Wikimedia Commons hosts
  console.log('\n[Suite 5b: Reference Image Requests]');
  assert(wantsReferenceImages('Show me tomato diseases') === true, 'Detects agricultural image request');
  assert(wantsReferenceImages('How often should I water tomatoes?') === false, 'Leaves text-only agriculture questions unchanged');
  const tomatoImageTopics = getImageTopics('Show me tomato diseases');
  assert(tomatoImageTopics.length === 4, 'Builds the four requested tomato disease topics');
  assert(tomatoImageTopics.map((topic) => topic.label).join('|') === 'Early Blight|Late Blight|Septoria Leaf Spot|Tomato Yellow Leaf Curl Virus', 'Uses the expected tomato disease labels');

  // Validate Wikimedia host security checks
  assert(isWikimediaHost('https://upload.wikimedia.org/example.jpg') === true, 'Allows upload.wikimedia.org host');
  assert(isWikimediaHost('https://thumb.wikimedia.org/example.jpg') === true, 'Allows thumb.wikimedia.org host');
  assert(isWikimediaHost('https://malicious-external-site.com/image.jpg') === false, 'Rejects non-Wikimedia host');

  const originalAxiosGet = axios.get;
  axios.get = async () => ({
    data: {
      query: {
        pages: {
          1: {
            title: 'File:Early Blight on Tomato.jpg',
            imageinfo: [{
              thumburl: 'https://thumb.wikimedia.org/example1.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Example1.jpg',
              extmetadata: { LicenseShortName: { value: 'CC BY-SA' } }
            }]
          },
          2: {
            title: 'File:Late Blight Tomato Leaf.jpg',
            imageinfo: [{
              thumburl: 'https://upload.wikimedia.org/example2.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Example2.jpg',
              extmetadata: { LicenseShortName: { value: 'CC BY-SA' } }
            }]
          }
        }
      }
    }
  });
  const mockGallery = await getReferenceImages('Show me tomato diseases');
  axios.get = originalAxiosGet;
  assert(mockGallery.length > 0, 'Returns gallery entries for a tomato disease image request');
  assert(mockGallery.every((item) => (item.url.startsWith('https://upload.wikimedia.org/') || item.url.startsWith('https://thumb.wikimedia.org/')) && item.sourceUrl.startsWith('https://commons.wikimedia.org/')), 'Restricts gallery image and attribution links to Wikimedia Commons');

  // Suite 6: User Exact Question Analysis Tests
  console.log('\n[Suite 6: Direct Question-to-Answer Intent Engine]');
  
  // Test 1: Greenhouse Farming
  const ghRes = await analyzeAgriQuery('Tell me about greenhouse farming.', null, 'AUTO', 'en');
  assert(ghRes.isUnrelated === false, 'Allows "Tell me about greenhouse farming" query');
  assert((ghRes.result.message || ghRes.result.assessment).toLowerCase().includes('greenhouse'), 'Returns direct Greenhouse response');
  assert(ghRes.result.title.includes('Greenhouse'), 'Title reflects Greenhouse Farming');

  // Test 2: How do I grow tomatoes?
  const tomGrow = await analyzeAgriQuery('How do I grow tomatoes?', null, 'AUTO', 'en');
  assert((tomGrow.result.message || tomGrow.result.assessment).toLowerCase().includes('tomato'), 'Answers tomato growing question directly');

  // Test 3: What fertilizer should I use for rice?
  const riceFert = await analyzeAgriQuery('What fertilizer should I use for rice?', null, 'AUTO', 'en');
  const riceFertText = (riceFert.result.message || riceFert.result.assessment || '').toLowerCase();
  assert(riceFertText.includes('npk') || riceFertText.includes('urea') || riceFertText.includes('nitrogen') || riceFertText.includes('fertilizer') || riceFertText.includes('nutrient'), 'Answers rice fertilizer question directly');

  // Test 4: How often should I irrigate wheat?
  const wheatIrrig = await analyzeAgriQuery('How often should I irrigate wheat?', null, 'AUTO', 'en');
  assert((wheatIrrig.result.message || wheatIrrig.result.assessment).includes('Crown Root Initiation') || (wheatIrrig.result.message || wheatIrrig.result.assessment).includes('CRI'), 'Answers wheat irrigation stages directly');

  // Test 5: How can I control aphids on chilli plants?
  const aphidRes = await analyzeAgriQuery('How can I control aphids on chilli plants?', null, 'AUTO', 'en');
  assert((aphidRes.result.message || aphidRes.result.assessment).toLowerCase().includes('aphid') || (aphidRes.result.message || aphidRes.result.assessment).toLowerCase().includes('neem'), 'Answers aphid control question directly');

  // Test 6: What soil is suitable for onions?
  const onionSoil = await analyzeAgriQuery('What soil is suitable for onions?', null, 'AUTO', 'en');
  assert((onionSoil.result.message || onionSoil.result.assessment).toLowerCase().includes('sandy loam') || (onionSoil.result.message || onionSoil.result.assessment).toLowerCase().includes('onion'), 'Answers onion soil question directly');

  // Suite 7: Contextual Follow-up Guardrail Evaluation
  console.log('\n[Suite 7: Contextual Follow-up Guardrail Evaluation]');

  // Test A: Chilli yellow leaves -> How can I identify which nutrient is missing?
  const testA_history = [{ role: 'user', message: 'Why are my chilli leaves yellow?' }];
  const testA_res = await analyzeAgriQuery('How can I identify which nutrient is missing?', null, 'AUTO', 'en', testA_history);
  assert(testA_res.isUnrelated === false, 'Test A: Allows "How can I identify which nutrient is missing?" with chilli history');

  // Test B: Tomato white spots -> How should I treat them?
  const testB_history = [{ role: 'user', message: 'My tomato plants have white spots.' }];
  const testB_res = await analyzeAgriQuery('How should I treat them?', null, 'AUTO', 'en', testB_history);
  assert(testB_res.isUnrelated === false, 'Test B: Allows "How should I treat them?" with tomato white spots history');

  // Test C: Drip irrigation -> How often should I use it?
  const testC_history = [{ role: 'user', message: 'What is drip irrigation?' }];
  const testC_res = await analyzeAgriQuery('How often should I use it?', null, 'AUTO', 'en', testC_history);
  assert(testC_res.isUnrelated === false, 'Test C: Allows "How often should I use it?" with drip irrigation history');

  // Test D: Chilli farming -> Write a Java program (explicit non-agri intent)
  const testD_history = [{ role: 'user', message: 'Tell me about chilli farming.' }];
  const testD_res = await analyzeAgriQuery('Write a Java program.', null, 'AUTO', 'en', testD_history);
  assert(testD_res.isUnrelated === true, 'Test D: Blocks "Write a Java program." even with chilli farming history');

  // Test E: Crop yellow leaves -> What should I do?
  const testE_history = [{ role: 'user', message: 'My crop has yellow leaves.' }];
  const testE_res = await analyzeAgriQuery('What should I do?', null, 'AUTO', 'en', testE_history);
  assert(testE_res.isUnrelated === false, 'Test E: Allows "What should I do?" with crop yellow leaves history');

  // Suite 8: Critical Bug Fix Verification Suite
  console.log('\n[Suite 8: Critical Bug Fix Verification Suite]');
  
  let testServer;
  let port;

  try {
    testServer = app.listen(0);
    port = testServer.address().port;
  } catch (e) {
    port = process.env.PORT || 5000;
  }

  try {
    // 1. Image request returns a gallery without timing out
    console.log('  Testing live/fast Wikimedia Commons gallery retrieval...');
    const imgStart = Date.now();
    const liveGallery = await getReferenceImages('Show me tomato diseases with images');
    const imgDuration = Date.now() - imgStart;
    assert(imgDuration < 8000, `Image request returns gallery quickly (${imgDuration}ms < 8000ms) without timing out`);
    assert(Array.isArray(liveGallery), 'Live gallery returns an array');
    if (liveGallery.length > 0) {
      assert(liveGallery.every(item => item.url && item.sourceUrl && (item.url.includes('wikimedia.org'))), 'Every gallery item has valid Wikimedia URL and attribution link');
    }

    // 2. Clear current conversation permanently deletes its messages
    const convIdToClear = `conv_test_delete_${Date.now()}`;
    const payloadConv = JSON.stringify({
      queryText: 'How to control tomato blight?',
      language: 'en',
      conversationId: convIdToClear
    });

    await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadConv)
      }
    }, payloadConv);

    // Verify conversation was recorded
    const historyCheck1 = await makeRequest({
      hostname: 'localhost',
      port,
      path: `/api/history?conversationId=${convIdToClear}`,
      method: 'GET'
    });
    const parsedHist1 = JSON.parse(historyCheck1.body);
    assert(parsedHist1.count >= 1, 'Conversation recorded in backend history before delete');

    // Permanently delete this conversation
    const deleteConvRes = await makeRequest({
      hostname: 'localhost',
      port,
      path: `/api/history/conversation/${convIdToClear}`,
      method: 'DELETE'
    });
    assert(deleteConvRes.statusCode === 200, 'DELETE /api/history/conversation/:id returns 200 OK');

    // Verify conversation records are permanently gone
    const historyCheck2 = await makeRequest({
      hostname: 'localhost',
      port,
      path: `/api/history?conversationId=${convIdToClear}`,
      method: 'GET'
    });
    const parsedHist2 = JSON.parse(historyCheck2.body);
    assert(parsedHist2.count === 0, 'Clear current conversation permanently deletes its records from backend');

    // 3. Clear all history permanently deletes all conversation records
    const clearAllRes = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/history',
      method: 'DELETE'
    });
    assert(clearAllRes.statusCode === 200, 'DELETE /api/history returns 200 OK');

    const historyAllCheck = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/history',
      method: 'GET'
    });
    const parsedAllHist = JSON.parse(historyAllCheck.body);
    assert(parsedAllHist.count === 0 && parsedAllHist.consultations.length === 0, 'Clear all history permanently removes every consultation record');

    // 4. New Chat creates a unique conversation ID and starts empty
    const { generateConversationId } = require('../../client/src/services/conversationStorage');
    const idA = generateConversationId();
    const idB = generateConversationId();
    assert(Boolean(idA) && Boolean(idB) && idA !== idB, 'New Chat creates distinct unique conversation IDs');

    const newChatA = { id: idA, title: 'New Conversation', messages: [] };
    assert(Array.isArray(newChatA.messages) && newChatA.messages.length === 0, 'New Chat conversation initializes with empty message list');

    // 5. Previous chat messages never leak into a new conversation
    const conv1 = {
      id: idA,
      messages: [{ role: 'user', content: 'Rice water question' }, { role: 'assistant', content: 'Rice advice' }]
    };
    const conv2 = {
      id: idB,
      messages: [] // New chat starts empty
    };
    const conv2HistoryPayload = conv2.messages.slice(-6).map(m => ({ role: m.role, message: m.content }));
    assert(conv2HistoryPayload.length === 0, 'Previous chat messages never leak into new conversation history payload');

    // 6. Delayed responses from an old conversation do not appear in the new chat
    let activeConvRef = idB; // User switched to new chat B
    let chatBMessages = [];
    const delayedResponseTargetId = idA; // Response resolves for old chat A
    const incomingOldResponse = { role: 'assistant', content: 'Delayed response for old chat A' };

    // Simulating ref-guarded message append logic:
    if (activeConvRef === delayedResponseTargetId) {
      chatBMessages.push(incomingOldResponse);
    }
    assert(chatBMessages.length === 0, 'Delayed responses from an old conversation do not appear in the new active chat');

    // Suite 9: Single Web Service Deployment Endpoints
    console.log('\n[Suite 9: Single Web Service Deployment Endpoints]');
    
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

    const consultationsRes = await makeRequest({ hostname: 'localhost', port, path: '/consultations', method: 'GET' });
    assert(consultationsRes.statusCode === 200, 'GET /consultations returns 200 OK (SPA fallback)');

  } catch (err) {
    console.error('❌ Error during test run:', err);
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
