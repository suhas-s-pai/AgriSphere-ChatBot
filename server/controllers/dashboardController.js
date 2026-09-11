const Scan = require('../models/Scan');
const { getStatus, memoryStore } = require('../config/db');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const { isConnected } = getStatus();

    let allScans = [];
    if (isConnected) {
      allScans = await Scan.find({}).sort({ createdAt: -1 });
    } else {
      allScans = [...memoryStore.scans];
    }

    const totalScans = allScans.length;
    let highRisk = 0;
    let suspicious = 0;
    let lowRisk = 0;
    const categoryCounts = {};

    for (const s of allScans) {
      if (s.riskLevel === 'HIGH') highRisk++;
      else if (s.riskLevel === 'SUSPICIOUS') suspicious++;
      else lowRisk++;

      const cat = s.category || 'Other Suspicious Activity';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const categories = Object.keys(categoryCounts).map(cat => ({
      category: cat,
      count: categoryCounts[cat]
    })).sort((a, b) => b.count - a.count);

    return res.json({
      success: true,
      stats: {
        totalScans,
        highRisk,
        suspicious,
        lowRisk,
        categories,
        recentScans: allScans.slice(0, 5)
      }
    });

  } catch (err) {
    next(err);
  }
};
