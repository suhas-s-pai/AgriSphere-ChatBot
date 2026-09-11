const Scan = require('../models/Scan');
const { getStatus, memoryStore } = require('../config/db');

exports.getHistory = async (req, res, next) => {
  try {
    const { riskLevel, category, search, limit = 50 } = req.query;
    const { isConnected } = getStatus();

    let scans = [];

    if (isConnected) {
      const filter = {};
      if (riskLevel && riskLevel !== 'ALL') filter.riskLevel = riskLevel;
      if (category && category !== 'ALL') filter.category = category;
      if (search) {
        filter.$or = [
          { category: { $regex: search, $options: 'i' } },
          { explanation: { $regex: search, $options: 'i' } },
          { sanitizedContent: { $regex: search, $options: 'i' } }
        ];
      }
      scans = await Scan.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
    } else {
      // Memory Store filtering
      scans = [...memoryStore.scans];
      if (riskLevel && riskLevel !== 'ALL') {
        scans = scans.filter(s => s.riskLevel === riskLevel);
      }
      if (category && category !== 'ALL') {
        scans = scans.filter(s => s.category === category);
      }
      if (search) {
        const queryStr = search.toLowerCase();
        scans = scans.filter(s =>
          (s.category && s.category.toLowerCase().includes(queryStr)) ||
          (s.explanation && s.explanation.toLowerCase().includes(queryStr)) ||
          (s.sanitizedContent && s.sanitizedContent.toLowerCase().includes(queryStr))
        );
      }
      scans = scans.slice(0, Number(limit));
    }

    return res.json({
      success: true,
      count: scans.length,
      scans
    });
  } catch (err) {
    next(err);
  }
};

exports.getScanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isConnected } = getStatus();

    let scan = null;
    if (isConnected) {
      try {
        scan = await Scan.findById(id);
      } catch (err) {
        // May fail if not valid ObjectId, fall through
      }
    }

    if (!scan) {
      scan = memoryStore.scans.find(s => s._id.toString() === id);
    }

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan entry not found.'
      });
    }

    return res.json({
      success: true,
      scan
    });
  } catch (err) {
    next(err);
  }
};
