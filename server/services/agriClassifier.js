/**
 * AgriSphere Agriculture Domain Guardrail Classifier
 * Strictly enforces that AgriSphere only responds to agriculture, crop, soil, farming,
 * pest, disease, weather, and livestock related queries.
 */

const UNRELATED_PATTERNS = [
  /write.*code/i, /java\b/i, /python\b/i, /javascript\b/i, /c\+\+/i, /html\b/i, /program\b/i,
  /tell me a joke/i, /who won/i, /football/i, /cricket match/i, /movie/i,
  /capital of/i, /write.*resume/i, /write.*essay/i, /math problem/i,
  /stock market/i, /crypto\b/i, /bitcoin/i, /relationship advice/i,
  /recipe for pizza/i, /who is the president/i, /who is prime minister/i
];

const AGRI_KEYWORDS = [
  'crop', 'soil', 'irrigation', 'water', 'fertilizer', 'pest', 'disease', 'blight',
  'aphid', 'harvest', 'sowing', 'seed', 'rice', 'paddy', 'wheat', 'maize', 'corn', 'tomato', 'potato',
  'onion', 'chilli', 'chili', 'pepper', 'cotton', 'sugarcane', 'banana', 'coconut', 'pulse', 'gram',
  'chickpea', 'lentil', 'bean', 'vegetable', 'fruit', 'weather', 'season', 'farm', 'yield',
  'organic', 'compost', 'npk', 'nitrogen', 'potassium', 'phosphorus', 'livestock', 'cattle',
  'dairy', 'goat', 'poultry', 'yellowing', 'yellow', 'leaves', 'leaf', 'wilt', 'fungus', 'weed',
  'rot', 'insect', 'field', 'cultivation', 'grow', 'growing', 'monsoon', 'rain', 'pesticide',
  'fungicide', 'manure', 'tractor', 'plow', 'drip', 'spot', 'spots'
];

function isUnrelatedQuery(text) {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();

  // 1. Explicit unrelated intent check
  if (UNRELATED_PATTERNS.some(regex => regex.test(trimmed))) {
    return true;
  }

  // 2. Short general queries without agri terms
  const lower = trimmed.toLowerCase();
  const hasAgriKeyword = AGRI_KEYWORDS.some(kw => lower.includes(kw));

  if (!hasAgriKeyword) {
    if (/^(hi|hello|hey|who are you|how are you)\??$/i.test(trimmed)) {
      return false; // Allowed greeting
    }
    if (trimmed.length < 50 && !/(grow|plant|field|land|season|water|leaf|green|yellow|brown|white|spot|bug|rot|soil|farm)/i.test(lower)) {
      return true;
    }
  }

  return false;
}

const GUARDRAIL_REJECTION_MESSAGE = "I'm AgriSphere, an agriculture-focused assistant. I can help with crops, soil, irrigation, fertilizers, pests, diseases, farming practices, and other agriculture topics.";

module.exports = {
  isUnrelatedQuery,
  GUARDRAIL_REJECTION_MESSAGE
};
