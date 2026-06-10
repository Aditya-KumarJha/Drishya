import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCcw, Signal } from 'lucide-react';
import { getPublicProjectStatus, getPublicStatus } from '../../../services/statusApi';
import { formatInterval } from '../dashboardUtils';

const getMonitorState = (monitor, analytics) => {
  if (!monitor.active) {
    return {
      badge: 'border-slate-300 bg-slate-100 text-slate-600',
      dot: 'bg-slate-300',
      label: 'Paused',
    };
  }

  if (analytics?.status === 'DOWN' || analytics?.failures > 0) {
    return {
      badge: 'border-red-300 bg-red-50 text-red-700',
      dot: 'bg-red-500',
      label: 'Investigating',
    };
  }

  if (analytics?.totalChecks > 0) {
    return {
      badge: 'border-emerald-300 bg-emerald-50 text-emerald-700',
      dot: 'bg-[#00E676]',
      label: 'Operational',
    };
  }

  return {
    badge: 'border-amber-300 bg-amber-50 text-amber-700',
    dot: 'bg-[#FFD600]',
    label: 'Waiting for logs',
  };
};

const SummaryCard = ({ icon: Icon, label, value, tone }) => (
  <article className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-[5px_5px_0_#0F172A]">
    <div className="flex items-center gap-3">
      <span className={`grid h-10 w-10 place-items-center rounded-xl border-[3px] border-black ${tone}`}>
        <Icon size={19} strokeWidth={3} />
      </span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
      </div>
    </div>
  </article>
);

const StatusPagesSection = ({
  analyticsByMonitorId,
  apiBaseUrl,
  isLoadingAnalytics,
  isLoadingSummary,
  monitors,
  onRefresh,
  projects = [],
  summary,
  summaryError,
  uptimeReports = {},
}) => {
  const [publicStatusBySlug, setPublicStatusBySlug] = useState({});
  const [projectStatusBySlug, setProjectStatusBySlug] = useState({});

  useEffect(() => {
    const publicMonitors = monitors.filter((monitor) => monitor.publicStatusEnabled && monitor.publicSlug);
    if (!publicMonitors.length) {
      setPublicStatusBySlug({});
      return undefined;
    }

    let active = true;
    Promise.allSettled(publicMonitors.map((monitor) => getPublicStatus(monitor.publicSlug)))
      .then((results) => {
        if (!active) return;

        const nextStatus = {};
        results.forEach((result, index) => {
          const slug = publicMonitors[index].publicSlug;
          nextStatus[slug] = result.status === 'fulfilled'
            ? { ok: true, payload: result.value }
            : { ok: false, error: result.reason?.message || 'Public endpoint unavailable' };
        });
        setPublicStatusBySlug(nextStatus);
      });

    return () => {
      active = false;
    };
  }, [monitors]);

  useEffect(() => {
    const publicProjects = projects.filter((project) => project.publicStatusEnabled !== false && project.publicSlug);
    if (!publicProjects.length) {
      setProjectStatusBySlug({});
      return undefined;
    }

    let active = true;
    Promise.allSettled(publicProjects.map((project) => getPublicProjectStatus(project.publicSlug)))
      .then((results) => {
        if (!active) return;

        const nextStatus = {};
        results.forEach((result, index) => {
          const slug = publicProjects[index].publicSlug;
          nextStatus[slug] = result.status === 'fulfilled'
            ? { ok: true, payload: result.value }
            : { ok: false, error: result.reason?.message || 'Project status unavailable' };
        });
        setProjectStatusBySlug(nextStatus);
      });

    return () => {
      active = false;
    };
  }, [projects]);

  return (
  <section className="grid min-w-0 gap-5">
    <div className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_#0F172A]">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <h2 className="text-lg font-black text-slate-950">Status pages</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
            Backend summary plus monitor health calculated from saved monitor records and check logs.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-[#FFD600] px-4 text-sm font-black text-black shadow-[3px_3px_0_#0F172A] hover:bg-[#00E676]"
        >
          <RefreshCcw className={isLoadingSummary || isLoadingAnalytics ? 'animate-spin' : ''} size={17} strokeWidth={3} />
          Refresh status
        </button>
      </div>

      {summaryError && (
        <div className="mt-4 rounded-xl border-[3px] border-black bg-red-50 p-3 text-sm font-black text-red-700">
          {summaryError}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={Signal} label="Backend monitors" value={summary?.totalMonitors ?? monitors.length} tone="bg-[#BFE8FF] text-blue-900" />
        <SummaryCard icon={AlertTriangle} label="Open incidents" value={summary?.activeIncidents ?? '-'} tone="bg-[#FFD600] text-black" />
        <SummaryCard icon={CheckCircle2} label="Global uptime" value={summary?.uptime != null ? `${summary.uptime}%` : '-'} tone="bg-[#00E676] text-black" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {['24h', '7d', '30d'].map((range) => (
          <div key={range} className="rounded-xl border-2 border-black bg-[#FDFBF7] px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">SLA {range}</p>
            <p className="mt-1 text-lg font-black text-slate-950">{uptimeReports[range]?.uptime ?? '-'}%</p>
            <p className="mt-1 text-[11px] font-bold text-slate-500">{uptimeReports[range]?.totalChecks ?? 0} checks</p>
          </div>
        ))}
      </div>
    </div>

    {projects.length > 0 && (
      <div className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_#0F172A]">
        <h3 className="font-black text-slate-950">Project status pages</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {projects.map((project) => {
            const projectStatus = project.publicSlug ? projectStatusBySlug[project.publicSlug] : null;
            return (
              <div key={project._id || project.id} className="rounded-xl border-2 border-black bg-[#FDFBF7] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-950">{project.name}</p>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${projectStatus?.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-500'}`}>
                    {projectStatus?.ok ? `${projectStatus.payload.uptime}%` : 'Checking'}
                  </span>
                </div>
                {project.publicStatusEnabled !== false && project.publicSlug ? (
                  <a
                    href={`${apiBaseUrl}/status/project/${project.publicSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block break-all text-sm font-black text-[#1E6BFF] underline decoration-[3px] underline-offset-4"
                  >
                    {apiBaseUrl}/status/project/{project.publicSlug}
                  </a>
                ) : (
                  <p className="mt-2 text-sm font-black text-slate-500">Public project status disabled</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}

    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      {monitors.length === 0 ? (
        <div className="rounded-2xl border-[3px] border-dashed border-slate-300 bg-white p-8 text-center shadow-[6px_6px_0_#0F172A]">
          <p className="text-lg font-black text-slate-950">No monitors to publish</p>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            Create monitors first, then this tab can show service status from backend data.
          </p>
        </div>
      ) : (
        monitors.map((monitor) => {
          const analytics = analyticsByMonitorId[monitor.id];
          const state = getMonitorState(monitor, analytics);
          const publicStatus = monitor.publicSlug ? publicStatusBySlug[monitor.publicSlug] : null;
          const publicMonitor = publicStatus?.payload?.monitor;

          return (
            <article key={monitor.id} className="min-w-0 rounded-2xl border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_#0F172A]">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-3 w-3 shrink-0 rounded-full border-2 border-black ${state.dot}`} />
                    <h3 className="truncate font-black text-slate-950">{monitor.name}</h3>
                  </div>
                  <p className="mt-2 break-all text-sm font-bold leading-5 text-slate-500">{monitor.method} {monitor.url}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${state.badge}`}>
                  {state.label}
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border-2 border-black bg-[#FDFBF7] px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Interval</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{formatInterval(monitor.interval)}</p>
                </div>
                <div className="rounded-xl border-2 border-black bg-[#FDFBF7] px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Checks</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{analytics?.totalChecks ?? '-'}</p>
                </div>
                <div className="rounded-xl border-2 border-black bg-[#FDFBF7] px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Latency</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{analytics ? `${analytics.avgLatency}ms` : '-'}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border-2 border-black bg-[#EAF1FF] px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Public endpoint</p>
                {monitor.publicStatusEnabled && monitor.publicSlug ? (
                  <div className="mt-1 grid gap-2">
                    <a
                      href={`${apiBaseUrl}/status/${monitor.publicSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all text-sm font-black text-[#1E6BFF] underline decoration-[3px] underline-offset-4"
                    >
                      {apiBaseUrl}/status/{monitor.publicSlug}
                    </a>
                    <div className={`rounded-lg border-2 border-black px-3 py-2 text-xs font-black ${publicStatus?.ok ? 'bg-emerald-50 text-emerald-700' : publicStatus ? 'bg-red-50 text-red-700' : 'bg-white text-slate-500'}`}>
                      {publicStatus?.ok
                        ? `Public API live: ${publicMonitor?.lastStatus || 'PENDING'}`
                        : publicStatus?.error || 'Checking public API'}
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm font-black text-slate-500">Public status disabled</p>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>

    {isLoadingAnalytics && (
      <div className="fixed bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-xl border-[3px] border-black bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-[4px_4px_0_#0F172A] lg:bottom-4">
        <Activity size={17} strokeWidth={3} className="text-[#1E6BFF]" />
        Loading status data
      </div>
    )}
  </section>
  );
};

export default StatusPagesSection;
