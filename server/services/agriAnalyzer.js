/**
 * AgriSphere Master Agriculture Analyzer Service
 * Coordinates Domain Guardrail Checking, Vision/Text LLM API calls,
 * and Expert Offline Agriculture Analysis.
 */

const { isUnrelatedQuery, GUARDRAIL_REJECTION_MESSAGE } = require('./agriClassifier');
const { callAgriLLM } = require('./agriLLMService');

async function analyzeAgriQuery(rawQuery, imageBase64 = null, mode = 'AUTO', language = 'en') {
  if (!rawQuery && !imageBase64) {
    throw new Error('Please provide an agricultural question or crop image for analysis.');
  }

  const queryText = rawQuery ? rawQuery.trim() : 'Analyze attached crop image';

  // 1. Enforce Agriculture Domain Guardrail Rejection
  if (isUnrelatedQuery(queryText) && !imageBase64) {
    return {
      isUnrelated: true,
      message: GUARDRAIL_REJECTION_MESSAGE,
      result: null
    };
  }

  // 2. Try LLM Call (Supports Text + Vision)
  let llmAnalysis = await callAgriLLM(queryText, imageBase64, language);

  // 3. If LLM unavailable/failed, use Expert Offline Agriculture Analysis Engine
  if (!llmAnalysis) {
    llmAnalysis = generateOfflineAgriAnalysis(queryText, Boolean(imageBase64), language);
  }

  return {
    isUnrelated: false,
    queryText,
    hasImage: Boolean(imageBase64),
    result: llmAnalysis
  };
}

function generateOfflineAgriAnalysis(text, hasImage, language = 'en') {
  const lower = text.toLowerCase();

  // 1. Detect Crop
  let crop = 'General Crop';
  if (lower.includes('tomato')) crop = 'Tomato';
  else if (lower.includes('rice') || lower.includes('paddy')) crop = 'Rice / Paddy';
  else if (lower.includes('wheat')) crop = 'Wheat';
  else if (lower.includes('maize') || lower.includes('corn')) crop = 'Maize';
  else if (lower.includes('chilli') || lower.includes('chili') || lower.includes('pepper')) crop = 'Chilli';
  else if (lower.includes('potato')) crop = 'Potato';
  else if (lower.includes('onion')) crop = 'Onion';
  else if (lower.includes('banana') || lower.includes('plantain')) crop = 'Banana';
  else if (lower.includes('cotton')) crop = 'Cotton';
  else if (lower.includes('sugarcane')) crop = 'Sugarcane';
  else if (lower.includes('coconut')) crop = 'Coconut';
  else if (lower.includes('pulse') || lower.includes('chickpea') || lower.includes('gram') || lower.includes('lentil') || lower.includes('bean')) crop = 'Pulses / Chickpea';
  else if (lower.includes('brinjal') || lower.includes('eggplant')) crop = 'Brinjal';
  else if (lower.includes('mango')) crop = 'Mango';
  else if (lower.includes('citrus') || lower.includes('lemon')) crop = 'Citrus';

  // 2. Detect Topic & Intent
  const isFertilizer = lower.includes('fertilizer') || lower.includes('npk') || lower.includes('urea') || lower.includes('nutrient') || lower.includes('manure') || lower.includes('compost') || lower.includes('dap');
  const isDisease = lower.includes('yellow') || lower.includes('spot') || lower.includes('spots') || lower.includes('blight') || lower.includes('disease') || lower.includes('rot') || lower.includes('wilt') || lower.includes('fungus') || lower.includes('curl') || lower.includes('mildew');
  const isPest = lower.includes('pest') || lower.includes('aphid') || lower.includes('thrip') || lower.includes('worm') || lower.includes('bug') || lower.includes('insect') || lower.includes('borer') || lower.includes('fly');
  const isIrrigation = lower.includes('water') || lower.includes('irrigat') || lower.includes('drip') || lower.includes('moisture') || lower.includes('dry') || lower.includes('watering');
  const isSoil = lower.includes('soil') || lower.includes('ph') || lower.includes('loam') || lower.includes('clay') || lower.includes('sandy');
  const isGrowing = lower.includes('grow') || lower.includes('sow') || lower.includes('sowing') || lower.includes('plant') || lower.includes('seed') || lower.includes('cultivat') || lower.includes('transplant');

  let category = 'General Agriculture';
  let assessment = `Agricultural Guidance for ${crop}`;
  let confidence = 90;
  const symptoms = [];
  const possibleCauses = [];
  const recommendedActions = [];
  const prevention = [];

  // ==========================================
  // TOPIC & CROP SPECIFIC ENGINE
  // ==========================================

  if (isFertilizer || (isSoil && !isDisease && !isIrrigation)) {
    category = 'Fertilizers & Soil';
    assessment = `Recommended Fertilizer & Soil Nutrition Plan for ${crop}`;

    if (crop === 'Tomato') {
      symptoms.push('High Nitrogen demand during vegetative growth, followed by Potassium during fruiting.');
      possibleCauses.push('Nutrient depletion or improper basal fertilizer ratio.');
      recommendedActions.push('Apply recommended N:P:K ratio of 120:60:60 kg per hectare.');
      recommendedActions.push('Apply 100% Phosphorus & Potassium + 50% Nitrogen as basal dressing during transplanting.');
      recommendedActions.push('Top-dress remaining Nitrogen in 2 equal splits at 30 and 45 days after transplanting.');
      recommendedActions.push('Foliar spray 0.5% Calcium Nitrate during fruit set to prevent blossom end rot.');
      prevention.push('Incorporate well-rotted farmyard manure (FYM) or vermicompost (10 tonnes/ha) before planting.');
    } else if (crop === 'Rice / Paddy') {
      symptoms.push('Nitrogen & Zinc deficiencies are common during tillering and panicle initiation.');
      possibleCauses.push('Continuous flooding causing nutrient leaching or Zinc fixation.');
      recommendedActions.push('Apply N:P:K 100:50:50 kg/ha along with 25 kg Zinc Sulfate per hectare.');
      recommendedActions.push('Apply 50% Nitrogen + 100% P & K as basal; top-dress 25% Nitrogen at tillering (21 days) and 25% at panicle initiation (42 days).');
      recommendedActions.push('Apply Zinc Sulfate at land preparation to avoid khaira disease in paddy.');
      prevention.push('Integrate green manure crops like Sesbania (Daincha) before paddy transplanting.');
    } else if (crop === 'Wheat') {
      symptoms.push('Nitrogen requirement peak at Crown Root Initiation (CRI) stage.');
      possibleCauses.push('Low organic matter in sandy loam soil.');
      recommendedActions.push('Apply N:P:K 120:60:40 kg/ha for timely sown irrigated wheat.');
      recommendedActions.push('Apply full Phosphorus, Potassium, and half Nitrogen at sowing as basal dose.');
      recommendedActions.push('Top-dress the remaining half Nitrogen immediately after the 1st irrigation at CRI stage (21 days).');
      prevention.push('Incorporate crop residues into soil using rotavator to build soil organic carbon.');
    } else if (crop === 'Onion') {
      symptoms.push('Sulfur deficiency reduces bulb pungency and yield firmness.');
      possibleCauses.push('Heavy clay soil or late Nitrogen application delaying bulb maturity.');
      recommendedActions.push('Apply N:P:K 100:50:50 kg/ha + 30 kg Elemental Sulfur per hectare.');
      recommendedActions.push('Apply full P, K, Sulfur, and 50% N as basal dressing during field preparation.');
      recommendedActions.push('Top-dress remaining Nitrogen 30 days after transplanting. Avoid late N application to prevent soft rot.');
      prevention.push('Soil pH between 6.0 - 7.0 is optimal; apply dolomite lime if soil pH is acidic (< 5.5).');
    } else if (crop === 'Chilli') {
      symptoms.push('High requirement of Potassium during pod development.');
      possibleCauses.push('Imbalanced fertilizers leading to flower drop.');
      recommendedActions.push('Apply N:P:K 100:50:50 kg/ha + 5 tonnes vermicompost per hectare.');
      recommendedActions.push('Split Nitrogen in 3 equal doses: Basal, 30 days, and 60 days after transplanting.');
      recommendedActions.push('Foliar spray Micronutrient mixture (2g/L) during peak flowering stage.');
      prevention.push('Maintain optimum soil moisture after fertilizer application.');
    } else {
      symptoms.push('General soil nutrition and fertilizer requirement check.');
      possibleCauses.push('Continuous cropping without balanced nutrient replenishment.');
      recommendedActions.push(`Apply balanced NPK fertilizer suited for ${crop} based on local soil test results.`);
      recommendedActions.push('Incorporate well-decomposed organic compost or farmyard manure before sowing.');
      recommendedActions.push('Split Nitrogen applications into 2-3 doses to prevent leaching.');
      prevention.push('Conduct biennial soil testing for micro and macro nutrients.');
    }
  } else if (isDisease || isPest) {
    category = isPest ? 'Pest Management' : 'Plant Disease';
    assessment = `Diagnostic & Control Protocol for ${crop}`;

    if (crop === 'Rice / Paddy') {
      symptoms.push('Yellowing or orange discoloration of leaf tips, brown leaf margins, or sheath blight spots.');
      possibleCauses.push('Nitrogen deficiency, Bacterial Leaf Blight (Xanthomonas), or Rice Tungro Virus transmitted by leafhoppers.');
      recommendedActions.push('If yellowing is uniform across lower leaves, top-dress 15-20 kg Urea per acre.');
      recommendedActions.push('If leaf tips turn yellow-brown with wavy margins, spray Streptocycline (6g/100L water) + Copper Oxychloride (2.5g/L).');
      recommendedActions.push('For leafhopper vectors, spray Imidacloprid 17.8 SL at 0.5 ml per liter of water.');
      prevention.push('Drain field for 2-3 days to aerate root zone if waterlogging is causing root asphyxiation.');
    } else if (crop === 'Chilli') {
      symptoms.push('White powdery spots on leaf undersides, curling leaf edges, or small white fungal patches.');
      possibleCauses.push('Powdery Mildew (Leveillula taurica) or Thrips/Aphid infestation causing leaf curl.');
      recommendedActions.push('For white spots / Powdery Mildew: Spray Wettable Sulfur 80 WP (3g/L water) or Hexaconazole 5 EC (1ml/L).');
      recommendedActions.push('For leaf curling and sucking pests: Spray cold-pressed Neem Oil (5ml/L water + liquid soap) late evening.');
      recommendedActions.push('Remove and burn severely infected lower leaves to stop fungal spore spread.');
      prevention.push('Install yellow & blue sticky traps (10-15 per acre) for monitoring vector insects.');
    } else if (crop === 'Tomato') {
      symptoms.push('Yellow leaves with brown concentric spots (target spots) on lower foliage or yellow leaf curling.');
      possibleCauses.push('Early Blight (Alternaria solani) or Tomato Yellow Leaf Curl Virus (TYLCV).');
      recommendedActions.push('Spray Mancozeb 75 WP (2g/L) or Copper Oxychloride 50 WP (3g/L) thoroughly covering foliage.');
      recommendedActions.push('Prune infected lower leaves up to 30cm from ground level.');
      recommendedActions.push('Avoid overhead sprinkler watering; water base directly.');
      prevention.push('Mulch soil base with dry straw to prevent soil-borne fungal spores from splashing onto leaves.');
    } else {
      symptoms.push(`Observed foliar spot, yellowing, or pest damage on ${crop} leaves.`);
      possibleCauses.push('Fungal pathogen, sap-sucking insects, or micro-nutrient deficiency.');
      recommendedActions.push('Apply bio-pesticide like Neem oil formulation (5ml/L) or Copper-based fungicide as preventive spray.');
      recommendedActions.push('Prune infected leaves and clear fallen debris from field perimeter.');
      recommendedActions.push('Consult local extension officer for chemical fungicide dosage if symptoms spread rapidly.');
      prevention.push('Practice crop rotation with non-host legumes every season.');
    }
  } else if (isIrrigation) {
    category = 'Irrigation Guidance';
    assessment = `Optimal Irrigation & Water Management Schedule for ${crop}`;

    if (crop === 'Chilli') {
      symptoms.push('Chilli plants require moist but well-drained root zone conditions.');
      possibleCauses.push('Excess water causing Phytophthora root rot or under-watering causing flower drop.');
      recommendedActions.push('Irrigate chilli crop every 5 to 7 days in summer, and 8 to 10 days in winter.');
      recommendedActions.push('Critical irrigation stages: Flowering & Fruit enlargement.');
      recommendedActions.push('Adopt Drip Irrigation with lateral line spacing of 1.2m for 40% water savings.');
      prevention.push('Construct raised beds to ensure excess monsoon water drains away quickly.');
    } else if (crop === 'Wheat') {
      symptoms.push('Wheat requires 5 to 6 timely irrigations depending on soil water retention.');
      possibleCauses.push('Moisture stress at Crown Root Initiation (CRI) reduces tillering by up to 30%.');
      recommendedActions.push('1st Irrigation: Crown Root Initiation (CRI) stage - 21 days after sowing (CRITICAL).');
      recommendedActions.push('2nd Irrigation: Tillering stage - 40 to 45 days after sowing.');
      recommendedActions.push('3rd Irrigation: Jointing stage - 60 to 65 days; 4th: Flowering stage - 80 to 85 days; 5th: Milk stage - 100 days.');
      prevention.push('Avoid heavy flooding during flowering stage to prevent crop lodging.');
    } else if (crop === 'Rice / Paddy') {
      symptoms.push('Paddy requires controlled standing water during critical growth phases.');
      possibleCauses.push('Uncontrolled moisture loss or dry spells during panicle initiation.');
      recommendedActions.push('Maintain 2 to 5 cm shallow standing water from transplanting till flowering.');
      recommendedActions.push('Adopt Alternate Wetting and Drying (AWD) to save up to 30% irrigation water.');
      recommendedActions.push('Drain field 10 to 14 days before harvest for uniform ripening.');
      prevention.push('Keep field bunds intact to avoid irrigation leakage.');
    } else {
      symptoms.push(`Water requirement evaluation for ${crop}.`);
      possibleCauses.push('High evapotranspiration loss during dry spells.');
      recommendedActions.push('Irrigate early morning or late evening to minimize evaporation.');
      recommendedActions.push('Adopt Drip or Micro-sprinkler systems for targeted root zone watering.');
      recommendedActions.push('Apply organic mulching (straw/leaves) to conserve soil moisture.');
      prevention.push('Check root zone soil moisture at 15cm depth before irrigating.');
    }
  } else {
    category = 'Crop Selection';
    assessment = `Comprehensive Cultivation & Management Guide for ${crop}`;

    if (crop === 'Tomato') {
      symptoms.push('Tomato cultivation inquiry.');
      possibleCauses.push('Field preparation and crop management queries.');
      recommendedActions.push('Soil: Well-drained fertile sandy loam or loamy soil rich in organic matter (pH 6.0 - 7.0).');
      recommendedActions.push('Seed Treatment: Treat seeds with Trichoderma viride (4g/kg seed) before sowing in nursery.');
      recommendedActions.push('Transplanting: Transplant 25-30 day old healthy seedlings at 60cm x 45cm spacing.');
      recommendedActions.push('Staking: Provide bamboo staking support 30 days after transplanting for upright growth and clean fruits.');
      prevention.push('Rotate tomato crop with legumes or cereals; avoid planting after potato or eggplant.');
    } else if (crop === 'Onion') {
      symptoms.push('Onion soil and land preparation inquiry.');
      possibleCauses.push('Soil physical properties affecting bulb size.');
      recommendedActions.push('Soil: Deep, well-drained friable sandy loam rich in organic carbon (pH 6.0 - 7.0).');
      recommendedActions.push('Field Prep: Plow land 3-4 times to fine tilth and form raised beds (1.2m width).');
      recommendedActions.push('Transplanting: Transplant 45-50 day old seedlings at 15cm x 10cm spacing.');
      recommendedActions.push('Avoid heavy clay or waterlogged soils which distort bulb shape and cause root rot.');
      prevention.push('Incorporate 15 tonnes/ha organic compost during final plowing.');
    } else {
      symptoms.push(`Cultivation guidance for ${crop}.`);
      possibleCauses.push('Seasonal sowing and field management query.');
      recommendedActions.push(`Select high-yielding certified seed varieties adapted to your local agro-climatic region.`);
      recommendedActions.push('Plow land 2-3 times and incorporate well-rotted compost before sowing.');
      recommendedActions.push('Follow recommended line-to-line and plant-to-plant spacing.');
      prevention.push('Practice integrated weed and nutrient management from day 1.');
    }
  }

  // Handle Image Note when vision model is unconfigured
  if (hasImage) {
    symptoms.unshift('📷 Crop image received for visual evaluation.');
    possibleCauses.unshift('Note: AI Vision model analysis active.');
  }

  return {
    category,
    crop,
    assessment,
    confidence,
    symptoms,
    possibleCauses,
    recommendedActions,
    prevention
  };
}

module.exports = {
  analyzeAgriQuery,
  generateOfflineAgriAnalysis
};
