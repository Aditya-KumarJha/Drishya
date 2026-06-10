import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, RefreshCcw } from 'lucide-react';
import { toast } from 'react-toastify';
import IncidentsSection from './components/IncidentsSection';
import AIChatSection from './components/AIChatSection';
import AlertsSection from './components/AlertsSection';
import MonitorDialog from './components/MonitorDialog';
import MonitorsSection from './components/MonitorsSection';
import { MobileNav, SidebarContent } from './components/Navigation';
import OverviewSection from './components/OverviewSection';
import PricingSection from './components/PricingSection';
import SettingsSection from './components/SettingsSection';
import StatusPagesSection from './components/StatusPagesSection';
import ProfileDialog from './components/ProfileDialog';
import { emptyMonitorForm, navItems } from './dashboardData';
import { getApiBaseUrl } from '../../services/dashboardApi';
import {
  connectSocket,
  joinMonitorRoom,
  joinUserRoom,
  leaveMonitorRoom,
} from '../../services/socket';
import {
  createMonitorRecord,
  deleteMonitorRecord,
  fetchAnalytics,
  fetchAlerts,
  fetchDashboardSummary,
  fetchIncidentDetails,
  fetchMonitors,
  toggleMonitorRecord,
  updateMonitorRecord,
} from '../../store/dashboardSlice';
import { setAuthUser } from '../../store/authSlice';
import {
  selectAnalyticsByMonitorId,
  selectAIInsightsByMonitorId,
  selectAlerts,
  selectDashboard,
  selectDashboardCounts,
  selectFilteredMonitors,
  selectIncidentsByMonitorId,
  selectMonitors,
} from '../../store/dashboardSelectors';
import { SEO } from '../../components/seo';
import { setCurrentUser, updateProfile } from '../../services/authApi';
import { getBillingSummary } from '../../services/billingApi';
import { openCreditCheckout } from '../../services/razorpayCheckout';
import { createProject, getProjects } from '../../services/projectApi';
import { getUptimeReport } from '../../services/reportApi';

const DashboardPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { view } = useParams();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [createForm, setCreateForm] = useState(emptyMonitorForm);
  const [editForm, setEditForm] = useState(emptyMonitorForm);
  const [projects, setProjects] = useState([]);
  const [projectError, setProjectError] = useState('');
  const [uptimeReports, setUptimeReports] = useState({});
  const [billing, setBilling] = useState(null);
  const [purchasingPlanId, setPurchasingPlanId] = useState('');
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const {
    analyticsError,
    alertsError,
    dashboardSummary,
    dashboardSummaryError,
    deletingMonitorId,
    incidentDetailsError,
    isLoadingAnalytics,
    isLoadingAlerts,
    isLoadingDashboardSummary,
    isLoadingIncidentDetails,
    isLoadingMonitors,
    isSavingMonitor,
    monitorError,
  } = useSelector(selectDashboard);
  const monitors = useSelector(selectMonitors);
  const authUser = useSelector((state) => state.auth.user);
  const analyticsByMonitorId = useSelector(selectAnalyticsByMonitorId);
  const aiInsightsByMonitorId = useSelector(selectAIInsightsByMonitorId);
  const incidentsByMonitorId = useSelector(selectIncidentsByMonitorId);
  const alertsPayload = useSelector(selectAlerts);
  const filteredMonitors = useSelector((state) => selectFilteredMonitors(state, query, statusFilter));
  const {
    activeCount,
    averageInterval,
    pausedCount,
  } = useSelector(selectDashboardCounts);
  const validViewIds = navItems.map((item) => item.id);
  const activeView = validViewIds.includes(view) ? view : 'overview';
  // Socket.IO realtime signals
  useEffect(() => {
    const socket = connectSocket();
    joinUserRoom();

    const monitorIds = monitors.map((m) => m.id);
    monitorIds.forEach((id) => joinMonitorRoom(id));

    const onMonitorStatus = (payload) => {
      void payload;
      // Cheap refresh: keep UI in sync with backend check results.
      dispatch(fetchAnalytics());
      dispatch(fetchIncidentDetails());
    };

    const onIncidentNew = (payload) => {
      toast.warn('New incident detected');
      void payload;
      dispatch(fetchIncidentDetails());
      dispatch(fetchAnalytics());
    };

    const onAlertSent = (payload) => {
      toast.info('Alert sent');
      void payload;
    };

    socket.on('monitor:status', onMonitorStatus);
    socket.on('incident:new', onIncidentNew);
    socket.on('alert:sent', onAlertSent);

    return () => {
      socket.off('monitor:status', onMonitorStatus);
      socket.off('incident:new', onIncidentNew);
      socket.off('alert:sent', onAlertSent);
      monitorIds.forEach((id) => leaveMonitorRoom(id));
    };
  }, [dispatch, monitors]);

  const loadMonitors = useCallback(() => {
    dispatch(fetchMonitors());
  }, [dispatch]);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => dispatch(fetchMonitors()), 0);

    return () => window.clearTimeout(refreshTimer);
  }, [dispatch]);

  const loadProjects = useCallback(() => {
    setProjectError('');
    getProjects()
      .then(setProjects)
      .catch((error) => setProjectError(error.message || 'Failed to load projects'));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadProjects, 0);
    return () => window.clearTimeout(timer);
  }, [loadProjects]);

  const loadBilling = useCallback(() => {
    getBillingSummary()
      .then(setBilling)
      .catch((error) => toast.error(error.message || 'Failed to load credits'));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadBilling, 0);
    return () => window.clearTimeout(timer);
  }, [loadBilling]);

  const loadAnalytics = useCallback(() => {
    dispatch(fetchAnalytics());
  }, [dispatch]);

  const loadIncidentDetails = useCallback(() => {
    dispatch(fetchIncidentDetails());
  }, [dispatch]);

  useEffect(() => {
    if (activeView === 'overview' || activeView === 'incidents' || activeView === 'logs' || activeView === 'status') {
      const analyticsTimer = window.setTimeout(loadAnalytics, 0);

      return () => window.clearTimeout(analyticsTimer);
    }
  }, [activeView, loadAnalytics, monitors.length]);

  useEffect(() => {
    if (activeView === 'incidents' || activeView === 'logs') {
      const detailsTimer = window.setTimeout(loadIncidentDetails, 0);

      return () => window.clearTimeout(detailsTimer);
    }
  }, [activeView, loadIncidentDetails, monitors.length]);

  const loadAlerts = useCallback(() => {
    dispatch(fetchAlerts());
  }, [dispatch]);

  useEffect(() => {
    if (activeView === 'alerts') {
      const timer = window.setTimeout(loadAlerts, 0);
      return () => window.clearTimeout(timer);
    }
  }, [activeView, loadAlerts]);

  const loadDashboardSummary = useCallback(() => {
    dispatch(fetchDashboardSummary());
  }, [dispatch]);

  const loadUptimeReports = useCallback(() => {
    Promise.all(['24h', '7d', '30d'].map((range) => getUptimeReport({ range }).then((report) => [range, report])))
      .then((entries) => setUptimeReports(Object.fromEntries(entries)))
      .catch((error) => toast.error(error.message || 'Failed to load uptime reports'));
  }, []);

  useEffect(() => {
    if (activeView === 'status' || activeView === 'settings') {
      const summaryTimer = window.setTimeout(loadDashboardSummary, 0);

      return () => window.clearTimeout(summaryTimer);
    }
  }, [activeView, loadDashboardSummary]);

  useEffect(() => {
    if (activeView === 'status') {
      const reportTimer = window.setTimeout(loadUptimeReports, 0);
      return () => window.clearTimeout(reportTimer);
    }
  }, [activeView, loadUptimeReports]);

  const activeNavItem = navItems.find((item) => item.id === activeView);

  const selectView = (view) => {
    navigate(`/dashboard/${view}`);
    setMobileSidebarOpen(false);
  };

  const openCreateDialog = () => {
    navigate('/dashboard/monitors');
    setCreateDialogOpen(true);
  };

  const refreshStatusPages = () => {
    loadDashboardSummary();
    loadAnalytics();
    loadProjects();
    loadUptimeReports();
  };

  const refreshIncidents = () => {
    loadAnalytics();
    loadIncidentDetails();
  };

  const updateCreateForm = (field, value) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
  };

  const updateEditForm = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const closeCreateDialog = () => {
    setCreateForm(emptyMonitorForm);
    setCreateDialogOpen(false);
  };

  const closeEditDialog = () => {
    setEditingId(null);
    setEditForm(emptyMonitorForm);
    setEditDialogOpen(false);
  };

  const buildMonitorPayload = (form) => {
    let headers = {};
    if (form.headersText?.trim()) {
      headers = JSON.parse(form.headersText);
    }

    return {
      ...form,
      headers,
      regions: form.regionsText,
      expectedStatusCodes: form.expectedStatusCodes,
      notificationEmails: form.notificationEmailsText,
    };
  };

  const createDefaultProject = () => {
    createProject({ name: 'Production', description: 'Primary production services' })
      .then((project) => {
        setProjects((current) => [project, ...current]);
        toast.success('Project created');
      })
      .catch((error) => toast.error(error.message || 'Failed to create project'));
  };

  const saveProfile = (payload) => {
    setIsSavingProfile(true);
    updateProfile(payload)
      .then((user) => {
        setCurrentUser(user);
        setProfileDialogOpen(false);
        toast.success('Profile updated');
        dispatch(setAuthUser(user));
      })
      .catch((error) => toast.error(error.response?.data?.message || error.message || 'Failed to update profile'))
      .finally(() => setIsSavingProfile(false));
  };

  const buyCredits = (planId) => {
    setPurchasingPlanId(planId);
    openCreditCheckout({
      planId,
      user: authUser,
      onSuccess: (summary) => {
        setBilling(summary);
        toast.success('Credits added after payment verification');
      },
    })
      .catch((error) => {
        if (error.message !== 'Payment cancelled') {
          toast.error(error.message || 'Failed to complete payment');
        }
      })
      .finally(() => setPurchasingPlanId(''));
  };

  const handleCreateSubmit = (event) => {
    event.preventDefault();

    try {
      new URL(createForm.url);
      const payload = buildMonitorPayload(createForm);
      dispatch(createMonitorRecord(payload))
        .unwrap()
        .then(() => {
          closeCreateDialog();
        });
    } catch {
      toast.error('Check the URL and headers JSON before saving');
      return;
    }
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();

    try {
      new URL(editForm.url);
      const payload = buildMonitorPayload(editForm);
      dispatch(updateMonitorRecord({ id: editingId, data: payload }))
        .unwrap()
        .then(() => {
          closeEditDialog();
        });
    } catch {
      toast.error('Check the URL and headers JSON before saving');
      return;
    }
  };

  const editMonitor = (monitor) => {
    setEditingId(monitor.id);
    setEditForm({
      projectId: monitor.projectId || '',
      groupName: monitor.groupName || 'Default',
      url: monitor.url,
      method: monitor.method,
      interval: String(monitor.interval),
      timeoutMs: String(monitor.timeoutMs || 10000),
      expectedStatusCodes: monitor.expectedStatusCodes?.join(',') || '',
      headersText: monitor.headers && Object.keys(monitor.headers).length
        ? JSON.stringify(monitor.headers, null, 2)
        : '',
      body: monitor.body || '',
      responseKeyword: monitor.responseKeyword || '',
      checkTypes: monitor.checkTypes || ['HTTP'],
      regionsText: monitor.regions?.join(', ') || 'primary',
      cronExpression: monitor.cronExpression || '',
      notificationEmailsText: monitor.notificationEmails?.join(', ') || '',
      publicStatusEnabled: monitor.publicStatusEnabled !== false,
      active: monitor.active,
    });
    setEditDialogOpen(true);
  };

  const deleteMonitor = (id) => {
    dispatch(deleteMonitorRecord(id))
      .unwrap()
      .then(() => {
        if (editingId === id) {
          closeEditDialog();
        }
      });
  };

  const toggleMonitor = (id) => {
    const monitor = monitors.find((item) => item.id === id);

    if (!monitor) return;

    dispatch(toggleMonitorRecord(monitor));
  };

  return (
    <>
      <SEO
        title={`${activeNavItem?.label || 'Dashboard'} Dashboard`}
        description="Private Drishya Monitor OS dashboard for uptime, incidents, alerts, and AI monitoring insights."
        noIndex
      />
      <main
      className="h-screen overflow-hidden bg-[#1E6BFF] font-sans text-slate-950"
      style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)',
        backgroundSize: '34px 34px',
      }}
    >
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/45 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] border-r-[4px] border-black bg-[#00E676] p-5 shadow-[10px_0_0_#0A0C10] transition-transform lg:hidden ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+16px)]'
        }`}
      >
        <SidebarContent
          activeView={activeView}
          onClose={() => setMobileSidebarOpen(false)}
          onViewChange={selectView}
        />
      </aside>

      <MobileNav activeView={activeView} onViewChange={selectView} />

      <div className={`grid h-screen overflow-hidden transition-[grid-template-columns] duration-300 ${sidebarOpen ? 'lg:grid-cols-[280px_minmax(0,1fr)]' : 'lg:grid-cols-[92px_minmax(0,1fr)]'}`}>
        <aside className="hidden h-screen overflow-hidden border-r-[4px] border-black bg-[#00E676] p-5 shadow-[8px_0_0_#0A0C10] lg:block">
          <SidebarContent
            activeView={activeView}
            compact={!sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onOpen={() => setSidebarOpen(true)}
            onViewChange={selectView}
          />
        </aside>

        <section className="flex h-screen min-w-0 flex-col overflow-hidden">
          <header className="z-30 shrink-0 border-b-[4px] border-black bg-white/92 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  className="grid h-11 w-11 place-items-center rounded-2xl border-[3px] border-black bg-[#FFD600] font-black italic text-black shadow-[4px_4px_0_#0F172A] lg:hidden"
                  onClick={() => setMobileSidebarOpen(true)}
                  aria-label="Open sidebar"
                >
                  D
                </button>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1E6BFF]">Command Center</p>
                  <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{activeNavItem?.label || 'Overview'}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="grid h-10 w-10 place-items-center rounded-xl border-[3px] border-black bg-white text-slate-950 shadow-[3px_3px_0_#0F172A] hover:bg-[#FFD600] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={loadMonitors}
                  disabled={isLoadingMonitors}
                  aria-label="Refresh dashboard"
                >
                  <RefreshCcw className={isLoadingMonitors ? 'animate-spin' : ''} size={18} strokeWidth={3} />
                </button>
                <button
                  type="button"
                  onClick={openCreateDialog}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border-[3px] border-black bg-[#00E676] px-4 text-sm font-black text-black shadow-[3px_3px_0_#0F172A] hover:bg-[#FFD600]"
                >
                  <Plus size={18} strokeWidth={3} />
                  <span className="hidden sm:inline">New monitor</span>
                </button>
              </div>
            </div>
          </header>

          <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-24 lg:pb-0">
            <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
              {monitorError && (
                <div className="rounded-2xl border-[3px] border-black bg-red-50 p-4 text-sm font-black text-red-700 shadow-[4px_4px_0_#0F172A]">
                  {monitorError}
                </div>
              )}
              {projectError && (
                <div className="rounded-2xl border-[3px] border-black bg-red-50 p-4 text-sm font-black text-red-700 shadow-[4px_4px_0_#0F172A]">
                  {projectError}
                </div>
              )}

              {activeView === 'overview' && (
                <OverviewSection
                  activeCount={activeCount}
                  analyticsByMonitorId={analyticsByMonitorId}
                  averageInterval={averageInterval}
                  billing={billing}
                  monitors={monitors}
                  onEditProfile={() => setProfileDialogOpen(true)}
                  onViewMonitors={() => selectView('monitors')}
                  pausedCount={pausedCount}
                  totalCount={monitors.length}
                  user={authUser}
                />
              )}

              {activeView === 'monitors' && (
                <MonitorsSection
                  deletingMonitorId={deletingMonitorId}
                  filteredMonitors={filteredMonitors}
                  isLoadingMonitors={isLoadingMonitors}
                  isSavingMonitor={isSavingMonitor}
                  onCreate={openCreateDialog}
                  onDelete={deleteMonitor}
                  onEdit={editMonitor}
                  onQueryChange={setQuery}
                  onStatusFilterChange={setStatusFilter}
                  onToggle={toggleMonitor}
                  query={query}
                  statusFilter={statusFilter}
                />
              )}

              {activeView === 'incidents' && (
                <IncidentsSection
                  aiInsightsByMonitorId={aiInsightsByMonitorId}
                  analyticsByMonitorId={analyticsByMonitorId}
                  analyticsError={analyticsError}
                  incidentDetailsError={incidentDetailsError}
                  incidentsByMonitorId={incidentsByMonitorId}
                  isLoadingAnalytics={isLoadingAnalytics || isLoadingIncidentDetails}
                  monitors={monitors}
                  onRefresh={refreshIncidents}
                />
              )}

              {activeView === 'logs' && (
                <IncidentsSection
                  aiInsightsByMonitorId={aiInsightsByMonitorId}
                  analyticsByMonitorId={analyticsByMonitorId}
                  incidentsByMonitorId={incidentsByMonitorId}
                  isLoadingAnalytics={isLoadingAnalytics || isLoadingIncidentDetails}
                  monitors={monitors}
                  onRefresh={refreshIncidents}
                  showLogsFirst
                />
              )}

              {activeView === 'alerts' && (
                <AlertsSection
                  alertsPayload={alertsPayload}
                  error={alertsError}
                  isLoading={isLoadingAlerts}
                  monitors={monitors}
                  onRefresh={loadAlerts}
                />
              )}

              {activeView === 'chat' && (
                <AIChatSection monitors={monitors} />
              )}

              {activeView === 'status' && (
                <StatusPagesSection
                  analyticsByMonitorId={analyticsByMonitorId}
                  isLoadingAnalytics={isLoadingAnalytics}
                  isLoadingSummary={isLoadingDashboardSummary}
                  monitors={monitors}
                  onRefresh={refreshStatusPages}
                  apiBaseUrl={getApiBaseUrl()}
                  projects={projects}
                  summary={dashboardSummary}
                  summaryError={dashboardSummaryError || analyticsError}
                  uptimeReports={uptimeReports}
                />
              )}

              {activeView === 'pricing' && (
                <PricingSection
                  billing={billing}
                  isPurchasing={purchasingPlanId}
                  onPurchase={buyCredits}
                />
              )}

              {activeView === 'settings' && (
                <SettingsSection
                  activeCount={activeCount}
                  apiBaseUrl={getApiBaseUrl()}
                  averageInterval={averageInterval}
                  isLoadingMonitors={isLoadingMonitors}
                  monitors={monitors}
                  onCreate={openCreateDialog}
                  onCreateProject={createDefaultProject}
                  onEdit={editMonitor}
                  onRefresh={loadMonitors}
                  pausedCount={pausedCount}
                  projects={projects}
                />
              )}
            </div>
          </div>
        </section>
      </div>

      {createDialogOpen && (
        <MonitorDialog
          form={createForm}
          isSaving={isSavingMonitor}
          mode="create"
          onClose={closeCreateDialog}
          projects={projects}
          onSubmit={handleCreateSubmit}
          onUpdate={updateCreateForm}
        />
      )}

      {editDialogOpen && (
        <MonitorDialog
          form={editForm}
          isSaving={isSavingMonitor}
          mode="edit"
          onClose={closeEditDialog}
          projects={projects}
          onSubmit={handleEditSubmit}
          onUpdate={updateEditForm}
        />
      )}
      {profileDialogOpen && (
        <ProfileDialog
          user={authUser}
          isSaving={isSavingProfile}
          onClose={() => setProfileDialogOpen(false)}
          onSubmit={saveProfile}
        />
      )}
      </main>
    </>
  );
};

export default DashboardPage;
