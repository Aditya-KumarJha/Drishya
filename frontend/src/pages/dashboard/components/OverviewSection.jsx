import { AlertTriangle, CheckCircle2, Signal, Timer } from 'lucide-react';
import { formatInterval, statusStyles } from '../dashboardUtils';

const DonutChart = ({ activeCount, pausedCount, totalCount }) => {
  const activePercent = totalCount ? (activeCount / totalCount) * 100 : 0;
  const circumference = 2 * Math.PI * 36;

  return (
    <div className="grid gap-4 rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A] sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
      <svg viewBox="0 0 100 100" role="img" aria-label="Monitor active versus paused chart" className="mx-auto h-36 w-36">
        <circle cx="50" cy="50" r="36" fill="none" stroke="#E2E8F0" strokeWidth="16" />
        <circle
          cx="50"
          cy="50"
          r="36"
          fill="none"
          stroke="#00E676"
          strokeDasharray={`${(activePercent / 100) * circumference} ${circumference}`}
          strokeLinecap="round"
          strokeWidth="16"
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="48" textAnchor="middle" className="fill-slate-950 text-[16px] font-black">{Math.round(activePercent)}%</text>
        <text x="50" y="62" textAnchor="middle" className="fill-slate-500 text-[7px] font-black uppercase">active</text>
      </svg>
      <div>
        <h2 className="text-lg font-black text-slate-950">Monitor state</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">Active records are eligible for backend scheduler checks.</p>
        <div className="mt-4 grid gap-2">
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <span className="h-3 w-3 rounded-full border-2 border-black bg-[#00E676]" />
            Active {activeCount}
          </div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <span className="h-3 w-3 rounded-full border-2 border-black bg-slate-300" />
            Paused {pausedCount}
          </div>
        </div>
      </div>
    </div>
  );
};

const IntervalBars = ({ monitors }) => {
  const maxInterval = Math.max(...monitors.map((monitor) => Number(monitor.interval || 0)), 1);
  const visibleMonitors = monitors.slice(0, 6);

  return (
    <article className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
      <h2 className="text-lg font-black text-slate-950">Check intervals</h2>
      <p className="mt-1 text-sm font-medium text-slate-500">Per-monitor interval values stored by the backend.</p>
      <div className="mt-5 grid gap-3">
        {visibleMonitors.length === 0 ? (
          <div className="rounded-xl border-[3px] border-dashed border-slate-300 bg-[#FDFBF7] p-4 text-sm font-black text-slate-500">
            No interval data yet
          </div>
        ) : (
          visibleMonitors.map((monitor) => (
            <div key={monitor.id} className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.12em]">
                <span className="min-w-0 truncate text-slate-500">{monitor.name}</span>
                <span className="text-slate-950">{formatInterval(monitor.interval)}</span>
              </div>
              <div className="h-4 rounded-full border-2 border-black bg-[#FDFBF7]">
                <div
                  className="h-full rounded-full border-r-2 border-black bg-[#1E6BFF]"
                  style={{ width: `${Math.max(8, (Number(monitor.interval || 0) / maxInterval) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
};

const LogCoverageChart = ({ analyticsByMonitorId, monitors }) => {
  const rows = monitors.slice(0, 6).map((monitor) => ({
    monitor,
    checks: analyticsByMonitorId[monitor.id]?.totalChecks || 0,
  }));
  const maxChecks = Math.max(...rows.map((row) => row.checks), 1);

  return (
    <article className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
      <h2 className="text-lg font-black text-slate-950">Log coverage</h2>
      <p className="mt-1 text-sm font-medium text-slate-500">Recent check counts from backend log analytics.</p>
      <div className="mt-5 grid gap-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border-[3px] border-dashed border-slate-300 bg-[#FDFBF7] p-4 text-sm font-black text-slate-500">
            No log data yet
          </div>
        ) : (
          rows.map(({ monitor, checks }) => (
            <div key={monitor.id} className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.12em]">
                <span className="min-w-0 truncate text-slate-500">{monitor.name}</span>
                <span className="text-slate-950">{checks} checks</span>
              </div>
              <div className="h-4 rounded-full border-2 border-black bg-[#FDFBF7]">
                <div
                  className="h-full rounded-full border-r-2 border-black bg-[#00E676]"
                  style={{ width: `${Math.max(8, (checks / maxChecks) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
};

const OverviewSection = ({ activeCount, analyticsByMonitorId = {}, averageInterval, monitors, onViewMonitors, pausedCount, totalCount }) => (
  <>
    <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[
        ['Total monitors', totalCount, 'Stored in backend', Signal, 'text-emerald-700', 'bg-[#00E676]'],
        ['Active monitors', activeCount, 'Scheduler eligible', CheckCircle2, 'text-blue-800', 'bg-[#BFE8FF]'],
        ['Paused monitors', pausedCount, 'Currently disabled', AlertTriangle, 'text-amber-900', 'bg-[#FFD600]'],
        ['Avg interval', activeCount ? `${averageInterval}s` : '-', 'From monitor records', Timer, 'text-white', 'bg-[#1E6BFF]'],
      ].map(([label, value, note, Icon, iconClass, bgClass]) => (
        <article key={label} className="min-w-0 rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-slate-500">{label}</p>
            <span className={`grid h-10 w-10 place-items-center rounded-xl border-[3px] border-black ${bgClass} ${iconClass}`}>
              <Icon size={20} strokeWidth={3} />
            </span>
          </div>
          <div className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</div>
          <p className="mt-1 text-sm font-bold text-slate-500">{note}</p>
        </article>
      ))}
    </section>

    <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <DonutChart activeCount={activeCount} pausedCount={pausedCount} totalCount={totalCount} />
      <LogCoverageChart analyticsByMonitorId={analyticsByMonitorId} monitors={monitors} />
    </section>

    <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <article className="min-w-0 rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Monitor records</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Backend-backed monitor configuration and active state.</p>
          </div>
          <button
            type="button"
            onClick={onViewMonitors}
            className="rounded-xl border-[3px] border-black bg-[#1E6BFF] px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_#0F172A] hover:bg-blue-700"
          >
            View monitors
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {monitors.slice(0, 4).map((monitor) => (
            <div
             key={monitor.id} className="min-w-0 rounded-xl border-[3px] border-black bg-[#FDFBF7] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{monitor.name}</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-500">{monitor.method} {monitor.url}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">{formatInterval(monitor.interval)}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusStyles[monitor.status]}`}>
                  {monitor.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </article>

      <IntervalBars monitors={monitors} />
    </section>
  </>
);

export default OverviewSection;
