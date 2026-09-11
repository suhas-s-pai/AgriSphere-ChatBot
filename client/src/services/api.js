import axios from 'axios';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

export const analyzeContent = async (content, mode = 'AUTO') => {
  try {
    const res = await client.post('/analyze', { content, mode });
    return res.data;
  } catch (err) {
    if (err.response && err.response.data) {
      return err.response.data;
    }
    throw new Error(err.message || 'Failed to connect to ScamSniff API service.');
  }
};

export const getHistory = async (params = {}) => {
  try {
    const res = await client.get('/history', { params });
    return res.data;
  } catch (err) {
    console.warn('History API offline, returning empty result:', err.message);
    return { success: false, count: 0, scans: [] };
  }
};

export const getScanDetails = async (id) => {
  try {
    const res = await client.get(`/history/${id}`);
    return res.data;
  } catch (err) {
    throw new Error(err.message || 'Unable to fetch scan details.');
  }
};

export const getDashboardStats = async () => {
  try {
    const res = await client.get('/dashboard');
    return res.data;
  } catch (err) {
    console.warn('Dashboard API offline:', err.message);
    return {
      success: false,
      stats: {
        totalScans: 0,
        highRisk: 0,
        suspicious: 0,
        lowRisk: 0,
        categories: [],
        recentScans: []
      }
    };
  }
};

export const submitFeedback = async (scanId, isHelpful, comment = '') => {
  try {
    const res = await client.post('/feedback', { scanId, isHelpful, comment });
    return res.data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};
