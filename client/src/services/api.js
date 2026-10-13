import axios from 'axios';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 35000 // 35s timeout to allow resilient network responses without early truncation
});

export const analyzeContent = async (payload) => {
  try {
    const body = typeof payload === 'string'
      ? { message: payload, queryText: payload, content: payload }
      : { message: payload.queryText || payload.message || payload.content, queryText: payload.queryText || payload.message, ...payload };
    const res = await client.post('/analyze', body);
    const data = res.data;
    console.log('API RESPONSE:', data);
    return data;
  } catch (err) {
    if (err.response && err.response.data) {
      console.log('API RESPONSE (ERROR DATA):', err.response.data);
      return err.response.data;
    }
    console.error('API NETWORK ERROR:', err.message);
    return { success: false, error: err.message || 'Failed to connect to AgriSphere API service.' };
  }
};

export const getHistory = async (params = {}) => {
  try {
    const res = await client.get('/history', { params });
    return res.data;
  } catch (err) {
    console.warn('History API offline, returning empty result:', err.message);
    return { success: false, count: 0, consultations: [], scans: [] };
  }
};

export const getScanDetails = async (id) => {
  try {
    const res = await client.get(`/history/${id}`);
    return res.data;
  } catch (err) {
    throw new Error(err.message || 'Unable to fetch consultation details.');
  }
};

export const clearHistoryApi = async () => {
  try {
    const res = await client.delete('/history');
    return res.data;
  } catch (err) {
    console.error('Failed to clear all history:', err.message);
    throw new Error(err.response?.data?.message || err.message || 'Failed to clear consultation history.');
  }
};

export const deleteConversationApi = async (conversationId) => {
  try {
    const res = await client.delete(`/history/conversation/${conversationId}`);
    return res.data;
  } catch (err) {
    console.error(`Failed to delete conversation ${conversationId}:`, err.message);
    throw new Error(err.response?.data?.message || err.message || 'Failed to delete conversation.');
  }
};

export const deleteConsultationApi = async (id) => {
  try {
    const res = await client.delete(`/history/${id}`);
    return res.data;
  } catch (err) {
    console.error(`Failed to delete consultation ${id}:`, err.message);
    throw new Error(err.response?.data?.message || err.message || 'Failed to delete consultation record.');
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
        totalConsultations: 0,
        plantHealthCases: 0,
        irrigationGuidance: 0,
        fertilizerSoil: 0,
        pestManagement: 0,
        categories: [],
        recentConsultations: []
      }
    };
  }
};

export const submitFeedback = async (consultationId, isHelpful, comment = '') => {
  try {
    const res = await client.post('/feedback', { consultationId, scanId: consultationId, isHelpful, comment });
    return res.data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};
