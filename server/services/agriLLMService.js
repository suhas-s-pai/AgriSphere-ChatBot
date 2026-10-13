const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');

const SYSTEM_PROMPT = `You are AgriSphere, an expert agriculture AI assistant dedicated to helping farmers, agronomists, and gardeners.

Answer the user's actual agriculture question accurately, directly, and thoroughly.

Supported Agriculture Topics:
- Crops & Cultivation (sowing, growing, harvesting, crop selection)
- Soil Health & Nutrients (pH, compost, soil prep, soil testing)
- Irrigation & Water Management (drip, sprinkler, schedule, water conservation)
- Fertilizers & Plant Nutrition (NPK ratios, organic manure, foliar spray, fertigation)
- Pest Control & Management (aphids, thrips, caterpillars, IPM, bio-pesticides, neem oil)
- Plant Health & Disease Diagnosis (early blight, leaf curl, rust, fungal/bacterial infections)
- Greenhouse & Protected Cultivation (polyhouse, shade net, microclimate control)
- Organic & Sustainable Farming
- Agricultural Weather Decisions & Tech (vertical farming, hydroponics, machinery)

Rules:
1. Only answer agricultural and farming queries.
2. If the user asks a non-agricultural question (e.g. programming, math, general trivia), politely decline and remind them that AgriSphere only handles farming and agriculture.
3. Answer the user's exact question first. Do not substitute generic soil, irrigation, or fertilizer advice when the user asks for a specific crop, place, disease, pest, or practice.
4. Treat places and constraints explicitly named in the user's question as the primary subject. Device location is secondary context and must never override a different place named in the question.
5. For regional crop recommendations, name suitable crops and briefly explain their season/land fit. State relevant uncertainty and ask for district, soil, water, or season when needed; do not refuse to make useful recommendations while waiting for details.
6. Provide practical, field-tested guidance for farmers.
7. Format response in JSON with the exact structure below.

Return JSON in this format:
{
  "message": "Direct, clear, comprehensive answer to the user's exact question formatted with clear paragraphs, bullet points, or numbered steps when appropriate.",
  "title": "Concise topic heading (e.g. Tomato Early Blight Control, Greenhouse Farming Guide)",
  "category": "Topic category (e.g. Plant Disease, Irrigation Guidance, Fertilizers & Soil, Crop Cultivation, Pest Management, Greenhouse)",
  "crop": "Specific crop name if applicable (e.g. Tomato, Rice, Wheat, Onion, Chilli) or null",
  "warnings": ["Subtle warnings or precautions if relevant"],
  "recommendedActions": ["Step 1", "Step 2", "Step 3"],
  "followUpQuestion": "A helpful follow-up question for the farmer"
}`;

const LANG_MAP = {
  en: 'English',
  kn: 'Kannada (ಕನ್ನಡ)',
  hi: 'Hindi (हिंदी)',
  te: 'Telugu (తెలుగు)',
  ta: 'Tamil (தமிழ்)',
  ml: 'Malayalam (മലയാളം)',
  mr: 'Marathi (मराठी)',
  bn: 'Bengali (বাংলা)'
};

/**
 * Parses image base64 into mimeType and raw base64 data for Gemini inlineData
 */
function parseBase64Image(imageBase64) {
  if (!imageBase64 || typeof imageBase64 !== 'string') return null;
  let mimeType = 'image/jpeg';
  let data = imageBase64;

  if (imageBase64.startsWith('data:')) {
    const parts = imageBase64.split(';base64,');
    if (parts.length === 2) {
      mimeType = parts[0].replace('data:', '') || 'image/jpeg';
      data = parts[1];
    }
  }

  if (!data || data.trim() === '') return null;
  return { inlineData: { mimeType, data } };
}

/**
 * Calls Google Gemini API using official @google/genai SDK.
 * Fallback to OpenAI format if OPENAI_API_KEY is supplied instead.
 * Returns normalized object or null (triggering offline fallback engine).
 */
function buildGeminiUserPrompt(queryText, targetLang, locationContextStr = '') {
  return `User Agriculture Question (answer this exact question first):\n${queryText || 'Analyze attached crop image'}${locationContextStr}\nTarget Response Language: Please write your response in ${targetLang}.\nAnalyze and output JSON matching system schema.`;
}

function sanitizeErrorMessage(msg) {
  if (!msg || typeof msg !== 'string') return '';
  return msg.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]');
}

// In-memory cache for models that have exhausted their quota (429) to prevent repetitive failing requests
const quotaExhaustedModels = new Map();

function isModelQuotaExhausted(modelName) {
  if (!modelName) return false;
  const cooldownUntil = quotaExhaustedModels.get(modelName);
  if (!cooldownUntil) return false;
  if (Date.now() >= cooldownUntil) {
    quotaExhaustedModels.delete(modelName);
    return false;
  }
  return true;
}

function markModelQuotaExhausted(modelName, cooldownMs = 30 * 60 * 1000) {
  if (!modelName) return;
  quotaExhaustedModels.set(modelName, Date.now() + cooldownMs);
}

function clearQuotaMemory() {
  quotaExhaustedModels.clear();
}

function classifyGeminiError(err) {
  const status = err?.status || err?.statusCode || (err?.response && err.response.status);
  const msg = err?.message || '';
  const isAuth = status === 401 || status === 403 || /API_KEY_INVALID|API key not valid|invalid api key/i.test(msg);
  const isQuota = status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(msg);
  const isUnavailable = status === 503 || /high demand|UNAVAILABLE|spikes in demand/i.test(msg);
  const isNotFound = status === 404 || /not found|is no longer available|NOT_FOUND/i.test(msg);
  const isTimeout = err?.name === 'AbortError' || /abort|timeout|DEADLINE_EXCEEDED/i.test(msg);

  if (isAuth) return { type: 'AUTH_ERROR', status: status || 401, retryable: false, message: 'Invalid or rejected API key' };
  if (isQuota) return { type: 'QUOTA_ERROR', status: 429, retryable: false, message: 'Free tier quota exceeded (429 RESOURCE_EXHAUSTED)' };
  if (isUnavailable) return { type: 'UNAVAILABLE_HIGH_DEMAND', status: 503, retryable: true, message: 'Service temporarily unavailable / high demand (503)' };
  if (isNotFound) return { type: 'MODEL_NOT_FOUND', status: 404, retryable: false, message: 'Model unavailable or deprecated (404 NOT_FOUND)' };
  if (isTimeout) return { type: 'TIMEOUT', status: 408, retryable: true, message: 'Request timed out' };
  return { type: 'TRANSIENT', status: status || 500, retryable: true, message: sanitizeErrorMessage(msg) };
}

async function callAgriLLM(queryText, imageBase64 = null, language = 'en', history = [], location = null, dependencies = {}) {
  const geminiKey = dependencies.apiKey ?? process.env.GEMINI_API_KEY;
  const genericLlmKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;

  const targetLang = LANG_MAP[language] || 'English';

  // Construct location context snippet if location details are supplied
  let locationContextStr = '';
  if (location && typeof location === 'object' && (location.mode === 'global' || location.isGpsVerified === true)) {
    const isGlobal = location.mode === 'global';

    if (isGlobal) {
      locationContextStr = `\n\nLOCATION MODE: GLOBAL
The user has explicitly selected GLOBAL location mode for general agricultural guidance.
Provide broad, universally applicable agricultural advice without assuming a specific user region, climate zone, or GPS coordinates.
If relevant to the user's question, explain that optimal crops, fertilizer rates, or sowing schedules vary depending on local microclimates and soil conditions.
NEVER state that location access is missing or unavailable — the user intentionally chose GLOBAL agricultural guidance.`;
    } else {
      const city = location.city || location.name || '';
      const state = location.state || location.region || '';
      const country = location.country || '';
      const lat = location.latitude || location.lat || '';
      const lng = location.longitude || location.lon || location.lng || '';
      const temp = location.temp || location.temperature || location.temp_c || '';
      const cond = location.condition || location.weather || location.weatherCondition || '';
      const formatted = location.formattedLocation || [city, state, country].filter(Boolean).join(', ');

      locationContextStr = `\n\nUSER VERIFIED GEOLOCATION CONTEXT (CURRENT LOCATION MODE):
- Location Mode: CURRENT LOCATION
- Active Verified Location: ${formatted || 'Unknown'} (City: ${city || 'N/A'}, State: ${state || 'N/A'}, Country: ${country || 'N/A'})
- Coordinates: Latitude ${lat || 'N/A'}, Longitude ${lng || 'N/A'}
- Live Weather: ${temp ? temp + '°C' : 'N/A'}, ${cond || 'N/A'}
IMPORTANT INSTRUCTION: The user is in CURRENT LOCATION mode. Treat this as the user's real-world verified location and live weather. Provide region-specific crop choices, soil suitability, climate warnings, and agricultural advice specifically tailored to this location. NEVER state that you lack access to the user's location, GPS, or coordinates.`;
    }
  }

  // 1. Primary: Use Official Google Gemini API via @google/genai
  if (geminiKey && geminiKey.trim() !== '') {
    console.log('[AgriLLM] Gemini API: ENABLED');
    try {
      const GeminiClient = dependencies.GoogleGenAI || GoogleGenAI;
      // Disable SDK's internal multi-minute retry loop so transient vs quota errors are handled promptly
      const ai = new GeminiClient({
        apiKey: geminiKey.trim(),
        httpOptions: {
          retryOptions: {
            attempts: 1
          }
        }
      });

      // Supported model candidates: configured model first, then active alternatives
      const candidateModels = Array.from(new Set([
        dependencies.model || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-3-flash-preview',
        'gemini-3.1-flash-lite-preview'
      ])).filter(Boolean);

      const contents = [];

      // Add conversation history if available
      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history.slice(-6)) {
          const role = (msg.role === 'user' || msg.sender === 'user') ? 'user' : 'model';
          const text = msg.message || msg.content || msg.text || '';
          if (text) {
            contents.push({ role, parts: [{ text }] });
          }
        }
      }

      // Build current user prompt parts
      const userParts = [];
      const userPromptText = buildGeminiUserPrompt(queryText, targetLang, locationContextStr);
      userParts.push({ text: userPromptText });

      // Add inline image if attached
      const imagePart = parseBase64Image(imageBase64);
      if (imagePart) {
        userParts.push(imagePart);
      }

      contents.push({ role: 'user', parts: userParts });

      let response = null;
      let usedModel = null;
      let lastErr = null;

      // Configurable overall deadline with safe bounds (defaults to 25s, min 4s, max 45s)
      const parsedTimeout = parseInt(dependencies.timeoutMs || process.env.GEMINI_TIMEOUT_MS, 10);
      const overallTimeoutMs = Number.isFinite(parsedTimeout) ? Math.min(Math.max(parsedTimeout, 4000), 45000) : 25000;
      const perAttemptTimeoutMs = Math.min(overallTimeoutMs, 20000);
      const requestDeadline = Date.now() + overallTimeoutMs;

      for (const modelName of candidateModels) {
        if (isModelQuotaExhausted(modelName)) {
          console.log(`[AgriLLM] Skipping candidate "${modelName}" (quota exhausted 429, cooldown active).`);
          continue;
        }

        const remainingOverallMs = requestDeadline - Date.now();
        if (remainingOverallMs < 1500) {
          lastErr = new Error(`Gemini request timed out after ${overallTimeoutMs}ms`);
          break;
        }

        let modelAttempt = 0;
        const maxAttemptsForModel = 2; // Allow 1 retry on transient 503 high demand

        while (modelAttempt < maxAttemptsForModel) {
          modelAttempt++;
          const remainingMs = requestDeadline - Date.now();
          if (remainingMs < 1500) {
            lastErr = new Error(`Gemini request timed out after ${overallTimeoutMs}ms`);
            break;
          }

          const attemptTimeoutMs = Math.min(perAttemptTimeoutMs, remainingMs);
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), attemptTimeoutMs);

          console.log(`[AgriLLM] Calling model "${modelName}" (attempt ${modelAttempt}, timeout: ${attemptTimeoutMs}ms)...`);
          const attemptStart = Date.now();

          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction: SYSTEM_PROMPT,
                temperature: 0.2,
                responseMimeType: 'application/json',
                abortSignal: abortController.signal
              }
            });
            usedModel = modelName;
            console.log(`[AgriLLM] Response received from "${usedModel}" in ${Date.now() - attemptStart}ms`);
            break;
          } catch (err) {
            lastErr = err;
            const latencyMs = Date.now() - attemptStart;
            const classified = classifyGeminiError(err);
            const sanitizedErr = sanitizeErrorMessage(err.message || 'Unknown error');

            if (classified.type === 'AUTH_ERROR') {
              console.warn(`❌ [AgriLLM] Gemini API authentication failure (${classified.status}): ${classified.message}. Halting retries.`);
              return null;
            } else if (classified.type === 'QUOTA_ERROR') {
              markModelQuotaExhausted(modelName, 30 * 60 * 1000);
              console.warn(`⚠️ [AgriLLM] Model "${modelName}" quota reached (429) in ${latencyMs}ms. Cooldown set for 30m. Skipping to next candidate model...`);
              break;
            } else if (classified.type === 'UNAVAILABLE_HIGH_DEMAND') {
              const timeBudgetLeft = requestDeadline - Date.now();
              if (modelAttempt === 1 && timeBudgetLeft > 4000) {
                console.warn(`⚠️ [AgriLLM] Model "${modelName}" hit temporary 503 high demand in ${latencyMs}ms. Retrying once in 1000ms...`);
                await new Promise((res) => setTimeout(res, 1000));
                continue;
              } else {
                console.warn(`⚠️ [AgriLLM] Model "${modelName}" high demand (503) persisted in ${latencyMs}ms. Trying next candidate model...`);
                break;
              }
            } else if (classified.type === 'MODEL_NOT_FOUND') {
              console.warn(`⚠️ [AgriLLM] Model "${modelName}" not found or unsupported (404) in ${latencyMs}ms. Trying next candidate model...`);
              break;
            } else if (classified.type === 'TIMEOUT') {
              console.warn(`⚠️ [AgriLLM] Model "${modelName}" timed out after ${attemptTimeoutMs}ms. Trying next candidate model...`);
              break;
            } else {
              console.warn(`⚠️ [AgriLLM] Model "${modelName}" failed in ${latencyMs}ms: ${sanitizedErr}. Trying next candidate model...`);
              break;
            }
          } finally {
            clearTimeout(timeoutId);
          }
        }

        if (response) {
          break;
        }
      }

      if (!response) {
        throw lastErr || new Error('All Gemini models failed');
      }

      console.log(`Gemini API: response received from ${usedModel}`);

      const rawJson = response?.text;
      if (!rawJson || typeof rawJson !== 'string' || !rawJson.trim()) {
        console.warn('⚠️ Gemini API returned empty response text.');
        return null;
      }

      const strippedJson = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(strippedJson);
      const cleaned = validateAndCleanAgriResponse(parsed);
      if (cleaned) {
        cleaned.source = 'GEMINI';
        cleaned.model = usedModel;
        cleaned.isFallback = false;
      }
      return cleaned;
    } catch (geminiErr) {
      const sanitized = sanitizeErrorMessage(geminiErr.message || 'Gemini request failed');
      console.warn(`⚠️ Google Gemini API call failed: ${sanitized}. Switching to the next available AI/fallback mechanism.`);
      // Continue to check generic LLM key or fallback to offline engine
    }
  }

  // 2. Secondary Fallback: OpenAI-compatible API if LLM_API_KEY or OPENAI_API_KEY is provided
  if (genericLlmKey && genericLlmKey.trim() !== '') {
    try {
      const model = process.env.LLM_MODEL || 'gpt-4o-mini';
      const baseUrl = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

      const userContent = [];
      userContent.push({
        type: 'text',
        text: `User Agriculture Question: "${queryText}"\nSelected Language for Response: ${targetLang}\nAnalyze and return structured JSON matching system schema.`
      });

      if (imageBase64) {
        userContent.push({
          type: 'image_url',
          image_url: {
            url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
          }
        });
      }

      const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent }
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${genericLlmKey.trim()}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const jsonStr = response.data?.choices?.[0]?.message?.content;
      if (!jsonStr) return null;

      const parsed = JSON.parse(jsonStr);
      const cleaned = validateAndCleanAgriResponse(parsed);
      if (cleaned) cleaned.source = 'ALTERNATE_LLM';
      return cleaned;
    } catch (llmErr) {
      console.warn(`⚠️ Secondary LLM API call failed: ${llmErr.message}. Switching to offline agriculture engine.`);
      return null;
    }
  }

  // No API key configured -> Trigger offline engine
  return null;
}

function validateAndCleanAgriResponse(data) {
  if (!data || typeof data !== 'object') return null;

  const msg = data.message || data.assessment || data.answer || 'Agricultural guidance completed.';

  let categoryStr = 'General Agriculture';
  if (Array.isArray(data.category)) {
    categoryStr = data.category.filter(Boolean).join(', ');
  } else if (typeof data.category === 'string' && data.category.trim()) {
    categoryStr = data.category.trim();
  }

  let cropStr = null;
  if (Array.isArray(data.crop)) {
    cropStr = data.crop.map(c => typeof c === 'object' && c !== null ? (c.name || JSON.stringify(c)) : c).filter(Boolean).join(', ');
  } else if (typeof data.crop === 'object' && data.crop !== null) {
    cropStr = data.crop.name || data.crop.crop || null;
  } else if (typeof data.crop === 'string' && data.crop.trim()) {
    cropStr = data.crop.trim();
  }

  return {
    message: typeof msg === 'string' ? msg : String(msg),
    assessment: typeof msg === 'string' ? msg : String(msg),
    title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : (cropStr || 'Agricultural Advisory'),
    category: categoryStr,
    crop: cropStr,
    confidence: Number(data.confidence) || null,
    symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
    possibleCauses: Array.isArray(data.possibleCauses) ? data.possibleCauses : [],
    recommendedActions: Array.isArray(data.recommendedActions) ? data.recommendedActions : [],
    prevention: Array.isArray(data.prevention) ? data.prevention : [],
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
    followUpQuestion: typeof data.followUpQuestion === 'string' ? data.followUpQuestion : null
  };
}

module.exports = {
  callAgriLLM,
  SYSTEM_PROMPT,
  buildGeminiUserPrompt,
  validateAndCleanAgriResponse,
  classifyGeminiError,
  sanitizeErrorMessage,
  isModelQuotaExhausted,
  markModelQuotaExhausted,
  clearQuotaMemory
};

