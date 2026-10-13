/**
 * AgriSphere Conversation Persistence Service
 * Manages independent conversation threads, isolated message histories,
 * and reliable local persistence.
 */

const CONVERSATIONS_STORAGE_KEY = 'agrisphere_conversations';
const ACTIVE_CONV_ID_STORAGE_KEY = 'agrisphere_active_conversation_id';
const LEGACY_SESSION_CHAT_KEY = 'agrisphere-active-chat';
const LEGACY_SESSION_RECENTS_KEY = 'agrisphere-recents-cleared';

export function generateConversationId() {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getStoredConversations() {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Unable to load stored conversations:', err);
  }
  return [];
}

export function saveStoredConversations(conversations) {
  try {
    if (Array.isArray(conversations)) {
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
    }
  } catch (err) {
    console.warn('Unable to save conversations:', err);
  }
}

export function getStoredActiveConversationId() {
  try {
    return localStorage.getItem(ACTIVE_CONV_ID_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setStoredActiveConversationId(conversationId) {
  try {
    if (conversationId) {
      localStorage.setItem(ACTIVE_CONV_ID_STORAGE_KEY, conversationId);
    } else {
      localStorage.removeItem(ACTIVE_CONV_ID_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Unable to save active conversation id:', err);
  }
}

export function updateOrAddStoredConversation(conversation) {
  if (!conversation || !conversation.id) return [];
  const current = getStoredConversations();
  const index = current.findIndex(c => c.id === conversation.id);
  let updated;
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...conversation, updatedAt: new Date().toISOString() };
  } else {
    updated = [
      { ...conversation, createdAt: conversation.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() },
      ...current
    ];
  }
  saveStoredConversations(updated);
  return updated;
}

export function deleteStoredConversation(conversationId) {
  try {
    const current = getStoredConversations();
    const filtered = current.filter(c => c.id !== conversationId);
    saveStoredConversations(filtered);

    if (getStoredActiveConversationId() === conversationId) {
      setStoredActiveConversationId(null);
    }
    return filtered;
  } catch (err) {
    console.warn('Unable to delete stored conversation:', err);
    return [];
  }
}

export function clearAllStoredConversations() {
  try {
    localStorage.removeItem(CONVERSATIONS_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_CONV_ID_STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_CHAT_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_RECENTS_KEY);
  } catch (err) {
    console.warn('Unable to clear all stored conversations:', err);
  }
}

