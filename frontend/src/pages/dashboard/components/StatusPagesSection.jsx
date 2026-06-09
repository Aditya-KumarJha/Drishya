import { Activity, AlertTriangle, CheckCircle2, RefreshCcw, Signal } from 'lucide-react';
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
  isLoadingAnalytics,
  isLoadingSummary,
  monitors,
  onRefresh,
  summary,
  summaryError,
}) => (
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
    </div>

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

export default StatusPagesSection;
