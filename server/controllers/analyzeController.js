const { analyzeScam } = require('../services/scamAnalyzer');
const Scan = require('../models/Scan');
const { getStatus, memoryStore } = require('../config/db');

exports.analyzeContent = async (req, res, next) => {
  try {
    const { content, mode = 'AUTO' } = req.body;

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Please provide non-empty content to analyze.'
      });
    }

    if (content.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Content length exceeds the 10,000 character maximum limit.'
      });
    }

    const { isUnrelated, message, sanitizedContent, result } = await analyzeScam(content, mode);

    if (isUnrelated) {
      return res.json({
        success: true,
        isUnrelated: true,
        message
      });
    }

    // Save to Database / MemoryStore
    let savedScanId = `scan-${Date.now()}`;
    const scanData = {
      mode: result.mode,
      category: result.category,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      confidence: result.confidence,
      redFlags: result.redFlags,
      confirmedIndicators: result.confirmedIndicators,
      suspiciousIndicators: result.suspiciousIndicators,
      unknownInformation: result.unknownInformation,
      explanation: result.explanation,
      recommendedActions: result.recommendedActions,
      sanitizedContent,
      createdAt: new Date()
    };

    const { isConnected } = getStatus();
    if (isConnected) {
      try {
        const newScan = await Scan.create(scanData);
        savedScanId = newScan._id.toString();
      } catch (dbErr) {
        console.warn('⚠️ Could not save scan to MongoDB:', dbErr.message);
      }
    }

    // Save into memory store
    const memEntry = { _id: savedScanId, ...scanData };
    memoryStore.scans.unshift(memEntry);

    return res.json({
      success: true,
      isUnrelated: false,
      scanId: savedScanId,
      result: {
        scanId: savedScanId,
        ...result,
        sanitizedContent
      }
    });

  } catch (err) {
    next(err);
  }
};
