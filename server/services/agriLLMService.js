const axios = require('axios');

const SYSTEM_PROMPT = `You are AgriSphere, an intelligent agriculture assistant designed to help farmers with farming decisions, crop selection, soil guidance, irrigation, fertilizers, pest control, plant disease diagnosis, and weather-related guidance.

Your ONLY domain is agriculture, farming, crops, soil, irrigation, livestock, and plant health.
You must NOT answer non-agricultural questions.

When analyzing plant images or text queries:
1. Provide practical, accurate, farmer-friendly advice.
2. Use structured JSON output.
3. Express confidence appropriately (never claim 100% certainty from an image alone; use "Possible", "Appears consistent with", "Likely").
4. Respond in the user's selected language when specified.

Return ONLY valid JSON matching this strict schema:
{
  "category": "Plant Disease" | "Crop Selection" | "Soil Guidance" | "Irrigation Guidance" | "Fertilizers & Soil" | "Pest Management" | "Weather Advisory" | "General Agriculture",
  "crop": "string",
  "assessment": "string",
  "confidence": number (0 to 100),
  "symptoms": ["string"],
  "possibleCauses": ["string"],
  "recommendedActions": ["string"],
  "prevention": ["string"]
}`;

async function callAgriLLM(queryText, imageBase64 = null, language = 'en') {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null; // Triggers offline agriculture fallback engine
  }

  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  const baseUrl = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

  const langNames = {
    en: 'English',
    kn: 'Kannada (ಕನ್ನಡ)',
    hi: 'Hindi (हिंदी)',
    te: 'Telugu (తెలుగు)',
    ta: 'Tamil (தமிழ்)',
    ml: 'Malayalam (മലയാളം)',
    mr: 'Marathi (मराठी)',
    bn: 'Bengali (বাংলা)'
  };
  const targetLang = langNames[language] || 'English';

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

  try {
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
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const jsonStr = response.data?.choices?.[0]?.message?.content;
    if (!jsonStr) return null;

    const parsed = JSON.parse(jsonStr);
    return validateAndCleanAgriResponse(parsed);
  } catch (err) {
    console.warn(`⚠️ AgriSphere LLM API call failed: ${err.message}. Switching to offline agriculture engine.`);
    return null;
  }
}

function validateAndCleanAgriResponse(data) {
  if (!data || typeof data !== 'object') return null;

  return {
    category: data.category || 'General Agriculture',
    crop: data.crop || 'General Crop',
    assessment: data.assessment || 'Agricultural guidance completed.',
    confidence: Math.min(Math.max(Number(data.confidence) || 85, 0), 100),
    symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
    possibleCauses: Array.isArray(data.possibleCauses) ? data.possibleCauses : [],
    recommendedActions: Array.isArray(data.recommendedActions) && data.recommendedActions.length > 0
      ? data.recommendedActions
      : ['Consult your local agricultural extension officer for specific regional recommendations.'],
    prevention: Array.isArray(data.prevention) ? data.prevention : []
  };
}

module.exports = {
  callAgriLLM,
  SYSTEM_PROMPT
};
