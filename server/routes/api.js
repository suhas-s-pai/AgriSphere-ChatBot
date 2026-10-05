const express = require('express');
const router = express.Router();

const { analyzeContent } = require('../controllers/analyzeController');
const { getHistory, getScanById } = require('../controllers/historyController');
const { getDashboardStats } = require('../controllers/dashboardController');
const { submitFeedback } = require('../controllers/feedbackController');
const { analyzeLimiter } = require('../middleware/rateLimiter');
const { getStatus } = require('../config/db');

// Health Check
router.get('/health', (req, res) => {
  const dbStatus = getStatus();
  return res.json({
    status: 'OK',
    service: 'AgriSphere AI Agriculture Engine',
    timestamp: new Date(),
    database: dbStatus,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== ''),
    alternativeLlmConfigured: Boolean(process.env.LLM_API_KEY && process.env.LLM_API_KEY.trim() !== ''),
    configuredModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  });
});

// Analyze Content (Agriculture Q&A + Image Analysis)
router.post('/analyze', analyzeLimiter, analyzeContent);

// History / Consultation Audit Routes
router.get('/history', getHistory);
router.get('/history/:id', getScanById);

// Dashboard Analytics Route
router.get('/dashboard', getDashboardStats);

// Feedback Route
router.post('/feedback', submitFeedback);

module.exports = router;
