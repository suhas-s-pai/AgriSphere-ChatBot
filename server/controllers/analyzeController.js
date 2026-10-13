const { analyzeAgriQuery, generateOfflineAgriAnalysis } = require('../services/agriAnalyzer');
const { isUnrelatedQuery, GUARDRAIL_REJECTION_MESSAGE } = require('../services/agriClassifier');
const Consultation = require('../models/Consultation');
const { getStatus, memoryStore } = require('../config/db');
const { getReferenceImages, wantsReferenceImages } = require('../services/referenceImageService');

exports.analyzeContent = async (req, res, next) => {
  try {
    const {
      location,
      query,
      content,
      queryText,
      message: inputMsg,
      image,
      mode = 'AUTO',
      language = 'en',
      history = [],
      messages = [],
      conversationId = null,
      chatId = null
    } = req.body;

    const activeConversationId = conversationId || chatId || null;
    const textToAnalyze = (query || queryText || content || inputMsg || '').trim();
    const chatHistory = Array.isArray(history) && history.length > 0 ? history : messages;

    console.log('POST /api/analyze RECEIVED');
    console.log('REQUEST BODY:', { ...req.body, image: image ? '[Attached]' : undefined });
    console.log('USER QUESTION:', textToAnalyze || '[Image Query]');
    if (activeConversationId) {
      console.log('CONVERSATION ID:', activeConversationId);
    }
    if (location) {
      console.log('LOCATION CONTEXT RECEIVED:', location);
    }

    if (!textToAnalyze && !image) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an agricultural query or upload a crop photo to analyze.'
      });
    }

    if (textToAnalyze.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Query length exceeds maximum limit.'
      });
    }

    // 1. Instant Agriculture Domain Guardrail Check
    if (isUnrelatedQuery(textToAnalyze, chatHistory) && !image) {
      const responsePayload = {
        success: true,
        isUnrelated: true,
        conversationId: activeConversationId,
        message: GUARDRAIL_REJECTION_MESSAGE,
        category: 'Agriculture Domain Guardrail',
        language
      };
      console.log('ANALYZE RESPONSE (GUARDRAIL):', responsePayload);
      return res.status(200).json(responsePayload);
    }

    // 2. Parallel Processing: Run LLM analysis and Wikimedia image search concurrently
    // Image search does not wait for Gemini or block if Gemini is slow/rate-limited
    const requestedImages = wantsReferenceImages(textToAnalyze);
    const imageSearchPromise = requestedImages
      ? getReferenceImages(textToAnalyze, chatHistory)
      : Promise.resolve([]);

    const aiAnalysisPromise = analyzeAgriQuery(
      textToAnalyze,
      image,
      mode,
      language,
      chatHistory,
      location
    );

    const [aiSettled, imagesSettled] = await Promise.allSettled([
      aiAnalysisPromise,
      imageSearchPromise
    ]);

    let aiResultData = null;
    let hasImageAttachment = Boolean(image);

    if (aiSettled.status === 'fulfilled') {
      const aiResponse = aiSettled.value;
      if (aiResponse.isUnrelated) {
        return res.status(200).json({
          success: true,
          isUnrelated: true,
          conversationId: activeConversationId,
          message: aiResponse.message || GUARDRAIL_REJECTION_MESSAGE,
          category: 'Agriculture Domain Guardrail',
          language
        });
      }
      aiResultData = aiResponse.result;
      hasImageAttachment = aiResponse.hasImage;
    } else {
      console.warn('⚠️ AI analysis rejected or timed out, falling back to offline agricultural engine:', aiSettled.reason?.message);
      aiResultData = generateOfflineAgriAnalysis(textToAnalyze, Boolean(image), language);
    }

    const referenceImages = imagesSettled.status === 'fulfilled'
      ? (imagesSettled.value || [])
      : [];

    const aiMessage = aiResultData.message || aiResultData.assessment || 'Agricultural guidance completed.';
    const savedId = `agri-${Date.now()}`;
    const categoryName = aiResultData.category || 'General Agriculture';
    const titleName = aiResultData.title || aiResultData.crop || 'Agricultural Advisory';

    const responsePayload = {
      success: true,
      isUnrelated: false,
      consultationId: savedId,
      conversationId: activeConversationId,
      message: aiMessage,
      title: titleName,
      category: categoryName,
      crop: aiResultData.crop || null,
      language,
      referenceImages,
      referenceImagesRequested: requestedImages,
      result: {
        consultationId: savedId,
        conversationId: activeConversationId,
        message: aiMessage,
        assessment: aiMessage,
        title: titleName,
        category: categoryName,
        crop: aiResultData.crop || null,
        referenceImages,
        referenceImagesRequested: requestedImages,
        recommendedActions: aiResultData.recommendedActions || [],
        warnings: aiResultData.warnings || [],
        followUpQuestion: aiResultData.followUpQuestion || null
      }
    };

    const consultationData = {
      conversationId: activeConversationId,
      category: categoryName,
      crop: aiResultData.crop || 'General Crop',
      queryText: textToAnalyze,
      hasImage: hasImageAttachment,
      imageUrl: hasImageAttachment ? 'image-attached' : '',
      language,
      assessment: aiMessage,
      confidence: aiResultData.confidence || 90,
      symptoms: aiResultData.symptoms || [],
      causes: aiResultData.possibleCauses || [],
      recommendedActions: aiResultData.recommendedActions || [],
      prevention: aiResultData.prevention || [],
      createdAt: new Date()
    };

    const { isConnected } = getStatus();
    if (isConnected) {
      try {
        const newDoc = await Consultation.create(consultationData);
        responsePayload.consultationId = newDoc._id.toString();
        responsePayload.result.consultationId = newDoc._id.toString();
      } catch (dbErr) {
        console.warn('⚠️ Could not save consultation to MongoDB:', dbErr.message);
      }
    }

    const memEntry = { _id: savedId, ...consultationData };
    memoryStore.scans.unshift(memEntry);

    console.log('ANALYZE RESPONSE (SUCCESS): consultationId =', responsePayload.consultationId, ', images =', referenceImages.length);
    return res.status(200).json(responsePayload);

  } catch (err) {
    console.error('ANALYZE ERROR:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to process the agriculture query.'
    });
  }
};
