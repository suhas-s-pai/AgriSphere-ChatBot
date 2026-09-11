const Feedback = require('../models/Feedback');
const { getStatus, memoryStore } = require('../config/db');

exports.submitFeedback = async (req, res, next) => {
  try {
    const { scanId, isHelpful, comment = '' } = req.body;

    if (!scanId || typeof isHelpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'scanId and boolean isHelpful flag are required.'
      });
    }

    const feedbackData = {
      scanId,
      isHelpful,
      comment,
      createdAt: new Date()
    };

    const { isConnected } = getStatus();
    if (isConnected) {
      try {
        await Feedback.create(feedbackData);
      } catch (dbErr) {
        console.warn('⚠️ Could not save feedback to MongoDB:', dbErr.message);
      }
    }

    memoryStore.feedbacks.push(feedbackData);

    return res.json({
      success: true,
      message: 'Thank you for helping ScamSniff improve!'
    });
  } catch (err) {
    next(err);
  }
};
