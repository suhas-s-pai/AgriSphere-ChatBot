const Consultation = require('../models/Consultation');
const { getStatus, memoryStore } = require('../config/db');

exports.getHistory = async (req, res, next) => {
  try {
    const { category, search, conversationId, limit = 50 } = req.query;
    const { isConnected } = getStatus();

    let consultations = [];

    if (isConnected) {
      const filter = {};
      if (category && category !== 'ALL') filter.category = category;
      if (conversationId) filter.conversationId = conversationId;
      if (search) {
        filter.$or = [
          { crop: { $regex: search, $options: 'i' } },
          { assessment: { $regex: search, $options: 'i' } },
          { queryText: { $regex: search, $options: 'i' } }
        ];
      }
      consultations = await Consultation.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
    } else {
      // Memory Store filtering
      consultations = [...memoryStore.scans];
      if (category && category !== 'ALL') {
        consultations = consultations.filter(s => s.category === category);
      }
      if (conversationId) {
        consultations = consultations.filter(s => s.conversationId === conversationId);
      }
      if (search) {
        const queryStr = search.toLowerCase();
        consultations = consultations.filter(s =>
          (s.crop && s.crop.toLowerCase().includes(queryStr)) ||
          (s.assessment && s.assessment.toLowerCase().includes(queryStr)) ||
          (s.queryText && s.queryText.toLowerCase().includes(queryStr))
        );
      }
      consultations = consultations.slice(0, Number(limit));
    }

    return res.json({
      success: true,
      count: consultations.length,
      consultations,
      scans: consultations
    });
  } catch (err) {
    next(err);
  }
};

exports.getScanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isConnected } = getStatus();

    let consultation = null;
    if (isConnected) {
      try {
        consultation = await Consultation.findById(id);
      } catch (err) {
        // Fall through
      }
    }

    if (!consultation) {
      consultation = memoryStore.scans.find(s => s._id.toString() === id);
    }

    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: 'Consultation entry not found.'
      });
    }

    return res.json({
      success: true,
      consultation,
      scan: consultation
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Permanently deletes all consultation history records.
 * Clears MongoDB collection and in-memory store.
 */
exports.clearAllHistory = async (req, res, next) => {
  try {
    const { isConnected } = getStatus();
    let deletedCount = 0;

    if (isConnected) {
      try {
        const delResult = await Consultation.deleteMany({});
        deletedCount = delResult.deletedCount || 0;
      } catch (dbErr) {
        console.warn('⚠️ Error clearing consultations from MongoDB:', dbErr.message);
      }
    }

    const memoryCount = memoryStore.scans.length;
    memoryStore.scans = [];

    console.log(`✅ Permanently cleared all consultation records (DB: ${deletedCount}, Memory: ${memoryCount}).`);
    return res.json({
      success: true,
      message: 'All consultation history cleared permanently.',
      deletedCount: deletedCount || memoryCount
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Permanently deletes all records belonging to a specific conversation.
 */
exports.deleteConversationHistory = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required.' });
    }

    const { isConnected } = getStatus();
    let deletedCount = 0;

    if (isConnected) {
      try {
        const delResult = await Consultation.deleteMany({
          $or: [
            { conversationId },
            { _id: conversationId }
          ]
        });
        deletedCount = delResult.deletedCount || 0;
      } catch (dbErr) {
        console.warn('⚠️ Error deleting conversation from MongoDB:', dbErr.message);
      }
    }

    const initialMemCount = memoryStore.scans.length;
    memoryStore.scans = memoryStore.scans.filter(
      s => s.conversationId !== conversationId && s._id.toString() !== conversationId
    );
    const memDeleted = initialMemCount - memoryStore.scans.length;

    console.log(`✅ Permanently deleted conversation ${conversationId} records (DB: ${deletedCount}, Memory: ${memDeleted}).`);
    return res.json({
      success: true,
      message: `Conversation ${conversationId} deleted permanently.`,
      deletedCount: deletedCount || memDeleted
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Permanently deletes a single consultation entry by ID.
 */
exports.deleteHistoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isConnected } = getStatus();

    if (isConnected) {
      try {
        await Consultation.findByIdAndDelete(id);
      } catch (err) {
        // Fall back to deleting by conversationId or string _id
        await Consultation.deleteMany({
          $or: [{ _id: id }, { conversationId: id }]
        });
      }
    }

    memoryStore.scans = memoryStore.scans.filter(
      s => s._id.toString() !== id && s.conversationId !== id
    );

    return res.json({
      success: true,
      message: 'Consultation deleted permanently.'
    });
  } catch (err) {
    next(err);
  }
};
