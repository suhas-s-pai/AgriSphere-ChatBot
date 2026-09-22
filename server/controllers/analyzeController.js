const { analyzeAgriQuery } = require('../services/agriAnalyzer');
const Consultation = require('../models/Consultation');
const { getStatus, memoryStore } = require('../config/db');

exports.analyzeContent = async (req, res, next) => {
  try {
    const { content, queryText, image, mode = 'AUTO', language = 'en' } = req.body;
    const textToAnalyze = queryText || content || '';

    if (!textToAnalyze.trim() && !image) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an agricultural query or upload a crop photo to analyze.'
      });
    }

    if (textToAnalyze.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Query length exceeds maximum limit.'
      });
    }

    const { isUnrelated, message, result, hasImage } = await analyzeAgriQuery(textToAnalyze, image, mode, language);

    if (isUnrelated) {
      return res.json({
        success: true,
        isUnrelated: true,
        message
      });
    }

    // Save to DB / Memory Store
    let savedId = `agri-${Date.now()}`;
    const consultationData = {
      category: result.category,
      crop: result.crop,
      queryText: textToAnalyze,
      hasImage,
      imageUrl: hasImage ? 'image-attached' : '',
      language,
      assessment: result.assessment,
      confidence: result.confidence,
      symptoms: result.symptoms,
      causes: result.possibleCauses,
      recommendedActions: result.recommendedActions,
      prevention: result.prevention,
      createdAt: new Date()
    };

    const { isConnected } = getStatus();
    if (isConnected) {
      try {
        const newDoc = await Consultation.create(consultationData);
        savedId = newDoc._id.toString();
      } catch (dbErr) {
        console.warn('⚠️ Could not save consultation to MongoDB:', dbErr.message);
      }
    }

    // Save into memory store
    const memEntry = { _id: savedId, ...consultationData };
    memoryStore.scans.unshift(memEntry);

    return res.json({
      success: true,
      isUnrelated: false,
      consultationId: savedId,
      result: {
        consultationId: savedId,
        ...result
      }
    });

  } catch (err) {
    next(err);
  }
};
