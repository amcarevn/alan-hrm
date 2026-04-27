export const API_BASE_URL = 'https://cbbackend.runagent.io';

export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/auth/login',
  ME: '/auth/me',
  API_KEYS: '/auth/api-keys/',
  API_KEY_DETAIL: '/auth/api-keys/{api_key_id}',

  // Chatbots
  BOTS: '/api/v1/bots/',
  BOT_DETAIL: '/api/v1/bots/{bot_id}',
  BOT_ACTIVATE: '/api/v1/bots/{bot_id}/activate',
  BOT_DEACTIVATE: '/api/v1/bots/{bot_id}/deactivate',
  BOT_STATS: '/api/v1/bots/{bot_id}/stats',
  ACTIVE_BOTS: '/api/v1/bots/active/list',

  // Admin
  ADMIN_CONVERSATIONS: '/admin/conversations/',
  ADMIN_CONVERSATION_DETAIL: '/admin/conversations/{conversation_id}/',
  ADMIN_DOCUMENTS: '/admin/documents/',
  ADMIN_DOCUMENT_DETAIL: '/admin/documents/{document_id}/',
  ADMIN_HEALTH: '/admin/health',
  ADMIN_METRICS: '/admin/metrics',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_INFO: 'user_info',
} as const;

export const CHATBOT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
