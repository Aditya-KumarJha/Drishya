import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getDashboardSummary, getIncidentDetails } from '../services/dashboardApi';
import { getMonitorAnalytics } from '../services/logApi';
import { getAlerts } from '../services/alertApi';
import {
  createMonitor,
  deleteMonitor,
  getMonitors,
  updateMonitor,
} from '../services/monitorApi';

/**
 * Fetch all monitors from backend
 */
export const fetchMonitors = createAsyncThunk(
  'dashboard/fetchMonitors',
  async (_, { rejectWithValue }) => {
    
    try {
      return await getMonitors();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Fetch dashboard summary statistics
 * Falls back to calculating from monitors if API fails
 */
export const fetchDashboardSummary = createAsyncThunk(
  'dashboard/fetchDashboardSummary',
  async (_, { getState, rejectWithValue }) => {
    try {
      const summary = await getDashboardSummary();
      
      // If API returns null (failed), calculate from monitors
      if (!summary) {
        const { monitors } = getState().dashboard;
        const activeCount = monitors.filter(m => m.active).length;
        
        return {
          totalMonitors: monitors.length,
          activeMonitors: activeCount,
          pausedMonitors: monitors.length - activeCount,
          totalIncidents: 0, // Can't calculate without incident data
          averageUptime: 0,  // Can't calculate without analytics data
        };
      }
      
      return summary;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Fetch analytics for all monitors
 * Returns empty structure for monitors with no data
 */
export const fetchAnalytics = createAsyncThunk(
  'dashboard/fetchAnalytics',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { monitors } = getState().dashboard;

      if (monitors.length === 0) {
        return {};
      }

      const entries = await Promise.all(
        monitors.map(async (monitor) => {
          const analytics = await getMonitorAnalytics(monitor.id);
          return [monitor.id, analytics];
        }),
      );

      return Object.fromEntries(entries);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * Fetch incidents and AI insights for all monitors
 * Returns empty arrays for monitors with no data
 */
export const fetchIncidentDetails = createAsyncThunk(
  'dashboard/fetchIncidentDetails',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { monitors } = getState().dashboard;

      if (monitors.length === 0) {
        return {
          aiInsightsByMonitorId: {},
          incidentsByMonitorId: {},
        };
      }

      const entries = await Promise.all(
        monitors.map(async (monitor) => {
          const details = await getIncidentDetails(monitor.id);
          return [monitor.id, details];
        }),
      );

      return entries.reduce((data, [monitorId, details]) => {
        data.incidentsByMonitorId[monitorId] = details.incidents;
        data.aiInsightsByMonitorId[monitorId] = details.aiInsights;
        return data;
      }, {
        aiInsightsByMonitorId: {},
        incidentsByMonitorId: {},
      });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchAlerts = createAsyncThunk('dashboard/fetchAlerts', async (_, { rejectWithValue }) => {
  try {
    return await getAlerts();
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

/**
 * Create a new monitor
 */
export const createMonitorRecord = createAsyncThunk(
  'dashboard/createMonitor',
  async (monitorData, { rejectWithValue }) => {
    try {
      return await createMonitor(monitorData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Update an existing monitor
 */
export const updateMonitorRecord = createAsyncThunk(
  'dashboard/updateMonitor',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await updateMonitor(id, data);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Delete a monitor
 */
export const deleteMonitorRecord = createAsyncThunk(
  'dashboard/deleteMonitor',
  async (id, { rejectWithValue }) => {
    try {
      await deleteMonitor(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * Toggle monitor active/paused status
 */
export const toggleMonitorRecord = createAsyncThunk(
  'dashboard/toggleMonitor',
  async (monitor, { rejectWithValue }) => {
    try {
      return await updateMonitor(monitor.id, {
        url: monitor.url,
        method: monitor.method,
        interval: monitor.interval,
        active: !monitor.active,
      });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  aiInsightsByMonitorId: {},
  analyticsByMonitorId: {},
  analyticsError: '',
  alerts: null,
  alertsError: '',
  isLoadingAlerts: false,
  dashboardSummary: null,
  dashboardSummaryError: '',
  deletingMonitorId: null,
  incidentDetailsError: '',
  incidentsByMonitorId: {},
  isLoadingAnalytics: false,
  isLoadingDashboardSummary: false,
  isLoadingIncidentDetails: false,
  isLoadingMonitors: true,
  isSavingMonitor: false,
  monitorError: '',
  monitors: [],
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearMonitorError(state) {
      state.monitorError = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlerts.pending, (state) => {
        state.isLoadingAlerts = true;
        state.alertsError = '';
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.isLoadingAlerts = false;
        state.alerts = action.payload;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.isLoadingAlerts = false;
        state.alertsError = action.payload || action.error.message || 'Unable to load alerts';
      })
      .addCase(fetchMonitors.pending, (state) => {
        state.isLoadingMonitors = true;
        state.monitorError = '';
      })
      .addCase(fetchMonitors.fulfilled, (state, action) => {
        state.isLoadingMonitors = false;
        state.monitors = action.payload;
      })
      .addCase(fetchMonitors.rejected, (state, action) => {
        state.isLoadingMonitors = false;
        state.monitorError = action.payload || action.error.message || 'Unable to load monitors';
      })
      .addCase(fetchAnalytics.pending, (state) => {
        state.isLoadingAnalytics = true;
        state.analyticsError = '';
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.isLoadingAnalytics = false;
        state.analyticsByMonitorId = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.isLoadingAnalytics = false;
        state.analyticsError = action.payload || action.error.message || 'Unable to load log analytics';
      })
      .addCase(fetchIncidentDetails.pending, (state) => {
        state.isLoadingIncidentDetails = true;
        state.incidentDetailsError = '';
      })
      .addCase(fetchIncidentDetails.fulfilled, (state, action) => {
        state.isLoadingIncidentDetails = false;
        state.aiInsightsByMonitorId = action.payload.aiInsightsByMonitorId;
        state.incidentsByMonitorId = action.payload.incidentsByMonitorId;
      })
      .addCase(fetchIncidentDetails.rejected, (state, action) => {
        state.isLoadingIncidentDetails = false;
        state.incidentDetailsError = action.payload || action.error.message || 'Unable to load AI incident details';
      })
      .addCase(fetchDashboardSummary.pending, (state) => {
        state.isLoadingDashboardSummary = true;
        state.dashboardSummaryError = '';
      })
      .addCase(fetchDashboardSummary.fulfilled, (state, action) => {
        state.isLoadingDashboardSummary = false;
        state.dashboardSummary = action.payload;
      })
      .addCase(fetchDashboardSummary.rejected, (state, action) => {
        state.isLoadingDashboardSummary = false;
        state.dashboardSummaryError = action.payload || action.error.message || 'Unable to load dashboard summary';
      })
      .addCase(createMonitorRecord.pending, (state) => {
        state.isSavingMonitor = true;
        state.monitorError = '';
      })
      .addCase(createMonitorRecord.fulfilled, (state, action) => {
        state.isSavingMonitor = false;
        state.monitors.unshift(action.payload);
      })
      .addCase(createMonitorRecord.rejected, (state, action) => {
        state.isSavingMonitor = false;
        state.monitorError = action.payload || action.error.message || 'Unable to create monitor';
      })
      .addCase(updateMonitorRecord.pending, (state) => {
        state.isSavingMonitor = true;
        state.monitorError = '';
      })
      .addCase(updateMonitorRecord.fulfilled, (state, action) => {
        state.isSavingMonitor = false;
        state.monitors = state.monitors.map((monitor) => (
          monitor.id === action.payload.id ? action.payload : monitor
        ));
      })
      .addCase(updateMonitorRecord.rejected, (state, action) => {
        state.isSavingMonitor = false;
        state.monitorError = action.payload || action.error.message || 'Unable to update monitor';
      })
      .addCase(toggleMonitorRecord.pending, (state) => {
        state.isSavingMonitor = true;
        state.monitorError = '';
      })
      .addCase(toggleMonitorRecord.fulfilled, (state, action) => {
        state.isSavingMonitor = false;
        state.monitors = state.monitors.map((monitor) => (
          monitor.id === action.payload.id ? action.payload : monitor
        ));
      })
      .addCase(toggleMonitorRecord.rejected, (state, action) => {
        state.isSavingMonitor = false;
        state.monitorError = action.payload || action.error.message || 'Unable to update monitor';
      })
      .addCase(deleteMonitorRecord.pending, (state, action) => {
        state.deletingMonitorId = action.meta.arg;
        state.monitorError = '';
      })
      .addCase(deleteMonitorRecord.fulfilled, (state, action) => {
        state.deletingMonitorId = null;
        state.monitors = state.monitors.filter((monitor) => monitor.id !== action.payload);
      })
      .addCase(deleteMonitorRecord.rejected, (state, action) => {
        state.deletingMonitorId = null;
        state.monitorError = action.payload || action.error.message || 'Unable to delete monitor';
      });
  },
});

export const { clearMonitorError } = dashboardSlice.actions;

export default dashboardSlice.reducer;
