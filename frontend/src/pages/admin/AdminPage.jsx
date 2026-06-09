import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  LogOut,
  Menu,
  RefreshCcw,
  Shield,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  getAdminIncidents,
  getAdminSummary,
  getAdminUsers,
  resolveAdminIncident,
  toggleUserStatus,
  updateUserRole,
} from '../../services/adminApi';
import { setCurrentUser } from '../../services/authApi';
import { logoutUser } from '../../store/authSlice';

const AdminTile = ({ label, value }) => (
  <div className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1E6BFF]">{label}</p>
    <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
  </div>
);

const adminViews = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'incidents', label: 'Incidents', icon: CheckCircle2 },
  { id: 'summary', label: 'Summary', icon: FileText },
];

const panelButtonBase =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl border-[3px] border-black px-3 text-xs font-black uppercase tracking-[0.06em] shadow-[3px_3px_0_#0F172A] transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const SidebarContent = ({
  activeView,
  compact = false,
  isLoggingOut,
  onClose,
  onOpen,
  onLogout,
  onSelectView,
}) => (
  <div className="flex h-full flex-col">
    <div className={`flex items-center ${compact ? 'justify-center' : 'justify-between gap-3'}`}>
      <button
        type="button"
        onClick={compact ? onOpen : undefined}
        className={`flex min-w-0 items-center gap-3 ${compact ? 'justify-center' : 'cursor-default'}`}
        aria-label={compact ? 'Open sidebar' : 'Drishyam Admin'}
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-[3px] border-black bg-[#FFD600] font-black italic text-black shadow-[4px_4px_0_#0F172A]">
          A
        </span>
        {!compact && (
          <span className="min-w-0 text-black">
            <span className="block truncate text-lg font-black uppercase italic leading-none">Admin</span>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-black/55">Control Hub</span>
          </span>
        )}
      </button>

      {!compact && (
        <button
          className="grid h-10 w-10 place-items-center rounded-xl border-[3px] border-black bg-white text-black shadow-[3px_3px_0_#0F172A]"
          onClick={onClose}
          aria-label="Collapse sidebar"
        >
          <X size={18} strokeWidth={3} />
        </button>
      )}
    </div>

    <nav className="mt-10 grid gap-2">
      {adminViews.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelectView(id)}
          className={`flex h-12 items-center rounded-2xl border-[3px] border-black font-black ${
            compact ? 'justify-center px-0' : 'gap-3 px-3'
          } ${
            activeView === id
              ? 'bg-[#1E6BFF] text-white shadow-[4px_4px_0_#0F172A]'
              : 'bg-[#FDFBF7] text-black hover:bg-[#FFD600]'
          }`}
          title={label}
        >
          <Icon size={19} strokeWidth={3} />
          {!compact && <span className="text-sm">{label}</span>}
        </button>
      ))}
    </nav>

    <div className="mt-auto space-y-3">
      <button
        type="button"
        onClick={onLogout}
        disabled={isLoggingOut}
        className={`flex h-12 w-full items-center rounded-2xl border-[3px] border-black font-black ${
          compact ? 'justify-center px-0' : 'gap-3 px-3'
        } bg-red-500 text-white shadow-[4px_4px_0_#0F172A] hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60`}
        title="Logout"
      >
        <LogOut size={19} strokeWidth={3} />
        {!compact && <span className="text-sm">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>}
      </button>

      <div className={`rounded-2xl border-[3px] border-black bg-[#FDFBF7] p-4 text-black ${compact ? 'hidden' : 'block'}`}>
        <div className="flex items-center gap-2 text-sm font-black">
          <Shield size={18} className="text-[#1E6BFF]" />
          Admin privileges active
        </div>
        <p className="mt-2 text-sm leading-6 text-black/60">Manage users and incidents securely from one place.</p>
      </div>
    </div>
  </div>
);

const AdminPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [incidents, setIncidents] = useState([]);

  const counts = useMemo(() => {
    const totalUsers = users.length;
    const inactiveUsers = users.filter((u) => u.isActive === false).length;
    const openIncidents = incidents.filter((i) => i.status === 'OPEN').length;
    return { totalUsers, inactiveUsers, openIncidents };
  }, [incidents, users]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, usersRes, incidentsRes] = await Promise.all([
        getAdminSummary(),
        getAdminUsers(),
        getAdminIncidents(),
      ]);

      setSummary(summaryRes);
      setUsers(Array.isArray(usersRes?.users) ? usersRes.users : Array.isArray(usersRes) ? usersRes : []);
      setIncidents(
        Array.isArray(incidentsRes?.incidents) ? incidentsRes.incidents : Array.isArray(incidentsRes) ? incidentsRes : [],
      );
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Avoid calling setState directly in effect body (lint rule).
    queueMicrotask(() => {
      load();
    });
  }, []);

  const onToggleUser = async (id) => {
    try {
      await toggleUserStatus(id);
      toast.success('User status updated');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to update user');
    }
  };

  const onPromote = async (id, role) => {
    try {
      await updateUserRole(id, role);
      toast.success('User role updated');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to update role');
    }
  };

  const onResolveIncident = async (id) => {
    try {
      await resolveAdminIncident(id);
      toast.success('Incident resolved');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to resolve incident');
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await logoutUser();
      setCurrentUser(null);
      navigate('/signin');
    } catch (logoutError) {
      console.error('Admin logout failed:', logoutError);
      setCurrentUser(null);
      navigate('/signin');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <main
      className="h-screen overflow-hidden bg-[#1E6BFF] font-sans text-slate-950"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)',
        backgroundSize: '34px 34px',
      }}
    >
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/45 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-70 border-r-4 border-black bg-[#00E676] p-5 shadow-[10px_0_0_#0A0C10] transition-transform lg:hidden ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+16px)]'
        }`}
      >
        <SidebarContent
          activeView={activeView}
          isLoggingOut={isLoggingOut}
          onClose={() => setMobileSidebarOpen(false)}
          onLogout={handleLogout}
          onSelectView={(id) => {
            setActiveView(id);
            setMobileSidebarOpen(false);
          }}
        />
      </aside>

      <div
        className={`grid h-screen overflow-hidden transition-[grid-template-columns] duration-300 ${
          sidebarOpen ? 'lg:grid-cols-[280px_minmax(0,1fr)]' : 'lg:grid-cols-[92px_minmax(0,1fr)]'
        }`}
      >
        <aside className="hidden h-screen overflow-hidden border-r-4 border-black bg-[#00E676] p-5 shadow-[8px_0_0_#0A0C10] lg:block">
          <SidebarContent
            activeView={activeView}
            compact={!sidebarOpen}
            isLoggingOut={isLoggingOut}
            onClose={() => setSidebarOpen(false)}
            onOpen={() => setSidebarOpen(true)}
            onLogout={handleLogout}
            onSelectView={setActiveView}
          />
        </aside>

        <section className="flex h-screen min-w-0 flex-col overflow-hidden">
          <header className="z-30 shrink-0 border-b-4 border-black bg-white/92 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  className="grid h-11 w-11 place-items-center rounded-2xl border-[3px] border-black bg-[#FFD600] font-black italic text-black shadow-[4px_4px_0_#0F172A] lg:hidden"
                  onClick={() => setMobileSidebarOpen(true)}
                  aria-label="Open admin sidebar"
                >
                  <Menu size={20} strokeWidth={3} />
                </button>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1E6BFF]">Admin Console</p>
                  <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                    {adminViews.find((item) => item.id === activeView)?.label || 'Overview'}
                  </h1>
                </div>
              </div>

              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border-[3px] border-black bg-[#00E676] px-4 text-sm font-black text-black shadow-[3px_3px_0_#0F172A] hover:bg-[#FFD600] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw className={loading ? 'animate-spin' : ''} size={18} strokeWidth={3} />
                Refresh
              </button>
            </div>
          </header>

          <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-6">
            <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
              {error && (
                <div className="rounded-2xl border-[3px] border-black bg-red-50 p-4 text-sm font-black text-red-700 shadow-[6px_6px_0_#0F172A]">
                  {error}
                </div>
              )}

              {(activeView === 'overview' || activeView === 'summary') && (
                <div className="grid gap-4 md:grid-cols-3">
                  <AdminTile label="Total users" value={counts.totalUsers} />
                  <AdminTile label="Inactive users" value={counts.inactiveUsers} />
                  <AdminTile label="Open incidents" value={counts.openIncidents} />
                </div>
              )}

              {(activeView === 'overview' || activeView === 'users') && (
                <section className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black">Users</h2>
                      <p className="mt-1 text-sm font-bold text-slate-500">Toggle active state or update roles.</p>
                    </div>
                    <div className="rounded-xl border-[3px] border-black bg-[#EAF1FF] px-3 py-2 text-xs font-black uppercase tracking-[0.08em]">
                      Showing {Math.min(users.length, 25)} of {users.length}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {users.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-[#FDFBF7] p-4 text-sm font-black text-slate-500">
                        No users returned
                      </div>
                    ) : (
                      users.slice(0, 25).map((u) => (
                        <div key={u._id || u.id} className="rounded-xl border-2 border-black bg-[#FDFBF7] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-black text-slate-950">{u.email}</p>
                              <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                                role: {u.role || 'user'} · {u.isActive === false ? 'inactive' : 'active'}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => onToggleUser(u._id || u.id)}
                                className={`${panelButtonBase} bg-white text-black hover:bg-[#FFD600]`}
                              >
                                Toggle Status
                              </button>
                              <button
                                type="button"
                                onClick={() => onPromote(u._id || u.id, 'admin')}
                                className={`${panelButtonBase} bg-[#00E676] text-black hover:bg-[#FFD600]`}
                              >
                                Make Admin
                              </button>
                              <button
                                type="button"
                                onClick={() => onPromote(u._id || u.id, 'user')}
                                className={`${panelButtonBase} bg-[#BFE8FF] text-black hover:bg-[#FFD600]`}
                              >
                                Make User
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {(activeView === 'overview' || activeView === 'incidents') && (
                <section className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black">Incidents</h2>
                      <p className="mt-1 text-sm font-bold text-slate-500">Resolve incidents platform-wide.</p>
                    </div>
                    <div className="rounded-xl border-[3px] border-black bg-[#FFF4C2] px-3 py-2 text-xs font-black uppercase tracking-[0.08em]">
                      Open {counts.openIncidents}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {incidents.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-[#FDFBF7] p-4 text-sm font-black text-slate-500">
                        No incidents returned
                      </div>
                    ) : (
                      incidents.slice(0, 25).map((i) => (
                        <div key={i._id || i.id} className="rounded-xl border-2 border-black bg-[#FDFBF7] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-black text-slate-950">{i.message || 'Incident'}</p>
                              <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                                status: {i.status || '-'} · monitor: {i.monitorId || '-'}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={i.status === 'RESOLVED'}
                              onClick={() => onResolveIncident(i._id || i.id)}
                              className={`${panelButtonBase} bg-[#FFD600] text-black hover:bg-[#00E676]`}
                            >
                              Resolve Incident
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {activeView === 'summary' && summary && (
                <section className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
                  <h2 className="text-lg font-black">Backend summary</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">Raw server-level admin payload.</p>
                  <pre className="mt-3 max-h-115 overflow-auto rounded-xl border-2 border-black bg-[#FDFBF7] p-3 text-xs font-bold">
                    {JSON.stringify(summary, null, 2)}
                  </pre>
                </section>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default AdminPage;

