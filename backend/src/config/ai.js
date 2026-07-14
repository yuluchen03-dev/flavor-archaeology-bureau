const apiKey = process.env.AI_API_KEY || '';
const explicitMockMode = process.env.AI_MOCK_MODE === 'true';
const configured = Boolean(apiKey);
const mockMode = explicitMockMode && process.env.NODE_ENV !== 'production';

module.exports = {
  serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:5000/api',
  apiKey,
  configured,
  mockMode,
  mode: configured ? 'generated' : mockMode ? 'local' : 'degraded',
  analysisTimeout: Number(process.env.AI_ANALYSIS_TIMEOUT_MS || 5000),
  restorationTimeout: Number(process.env.AI_RESTORATION_TIMEOUT_MS || 8000),
};
