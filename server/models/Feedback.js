const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  scanId: {
    type: String,
    required: true
  },
  isHelpful: {
    type: Boolean,
    required: true
  },
  comment: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
