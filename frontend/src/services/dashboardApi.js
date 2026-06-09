import axiosInstance from './axiosInstance';
import { API_BASE_URL } from './apiConfig';

/**
 * Format AI insights for display
 * Converts suggestion string/array to array format
 * Cleans markdown symbols and formatting
 */
const formatAIInsight = (insight) => {
  if (!insight) return null;

  // Handle suggestion field - convert to array if string
  let suggestions = [];
  if (insight.suggestion) {
    if (Array.isArray(insight.suggestion)) {
      suggestions = insight.suggestion;
    } else if (typeof insight.suggestion === 'string') {
      // Split by newlines or bullet points
      suggestions = insight.suggestion
        .split(/[\n•-]/)
        .map(s => s.trim())
        .filter(Boolean);
    }
  }

  // Clean markdown symbols from suggestions
  const cleanedSuggestions = suggestions.map(suggestion => 
    suggestion
      .replace(/^\*\*|\*\*$/g, '') // Remove ** from start/end
      .replace(/^\*|\*$/g, '')     // Remove * from start/end
      .replace(/^-\s*/, '')        // Remove leading dash
      .replace(/^•\s*/, '')        // Remove leading bullet
      .replace(/^\d+\.\s*/, '')    // Remove leading numbers (1. 2. etc)
      .trim()
  ).filter(Boolean);

  return {
    ...insight,
    confidence: typeof insight.confidence === 'number' ? insight.confidence : 0,
    explanation: insight.explanation || insight.reason || '',
    headline: insight.headline || '',
    predictedIssues: Array.isArray(insight.predictedIssues)
      ? insight.predictedIssues
      : Array.isArray(insight.predictions)
        ? insight.predictions
        : [],
    resolutionSteps: Array.isArray(insight.resolutionSteps) ? insight.resolutionSteps : [],
    severity: insight.severity || 'low',
    signals: Array.isArray(insight.signals) ? insight.signals : [],
    solutionSummary: insight.solutionSummary || '',
    suggestions: cleanedSuggestions,
    isCritical: insight.severity === 'critical' || insight.priority === 'high',
  };
};

/**
 * Fetch dashboard summary statistics
 * GET /dashboard/summary
 * 
 * Fallback: Calculate from monitors if API fails
 */
export const getDashboardSummary = async () => {
  try {
    const { data } = await axiosInstance.get('/dashboard/summary');
    return data;
  } catch (error) {
    // Fallback: Return null, let Redux calculate from monitors
    console.warn('Dashboard summary API failed, will calculate from monitors:', error.message);
    return null;
  }
};

/**
 * Fetch incident timeline for a monitor
 * GET /dashboard/incidents/:monitorId
 */
export const getIncidentTimeline = async (monitorId) => {
  try {
    const { data } = await axiosInstance.get(`/dashboard/incidents/${monitorId}`);
    const incidents = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return incidents;
  } catch (error) {
    console.warn(`Failed to fetch incidents for monitor ${monitorId}:`, error.message);
    return [];
  }
};

/**
 * Fetch AI insights for a monitor
 * GET /ai/insights/:monitorId
 */
export const getAIInsights = async (monitorId) => {
  try {
    const { data } = await axiosInstance.get(`/ai/insights/${monitorId}`);
    const insights = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return insights.map(formatAIInsight).filter(Boolean);
  } catch (error) {
    console.warn(`Failed to fetch AI insights for monitor ${monitorId}:`, error.message);
    return [];
  }
};

/**
 * Fetch both incidents and AI insights together
 * Used by Redux thunk for efficiency
 */
export const getIncidentDetails = async (monitorId) => {
  try {
    const [incidents, aiInsights] = await Promise.all([
      getIncidentTimeline(monitorId),
      getAIInsights(monitorId),
    ]);

    return {
      incidents,
      aiInsights,
    };
  } catch (error) {
    console.warn(`Failed to fetch incident details for monitor ${monitorId}:`, error.message);
    return {
      incidents: [],
      aiInsights: [],
    };
  }
};

export const getApiBaseUrl = () => API_BASE_URL;
