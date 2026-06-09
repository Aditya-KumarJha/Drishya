import { Database, RefreshCcw, ServerCog, Settings2 } from 'lucide-react';
import { formatInterval } from '../dashboardUtils';

const SettingCard = ({ icon: Icon, label, value, note }) => (
  <article className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-[5px_5px_0_#0F172A]">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[3px] border-black bg-[#BFE8FF] text-blue-900">
        <Icon size={19} strokeWidth={3} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="mt-1 break-words text-base font-black text-slate-950">{value}</p>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{note}</p>
      </div>
    </div>
  </article>
);

const SettingsSection = ({ activeCount, apiBaseUrl, averageInterval, isLoadingMonitors, monitors, onCreate, onRefresh, pausedCount }) => (
  <section className="grid min-w-0 gap-5">
    <div className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_#0F172A]">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <h2 className="text-lg font-black text-slate-950">Backend settings</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
            This backend currently exposes monitor records, logs, AI insights and dashboard summaries. Editable settings are the monitor records themselves.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoadingMonitors}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-[#FFD600] px-4 text-sm font-black text-black shadow-[3px_3px_0_#0F172A] hover:bg-[#00E676] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className={isLoadingMonitors ? 'animate-spin' : ''} size={17} strokeWidth={3} />
          Refresh backend
        </button>
      </div>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <SettingCard
        icon={Database}
        label="API base"
        value={apiBaseUrl}
        note="Frontend requests use this base URL for monitor, log and dashboard endpoints."
      />
      <SettingCard
        icon={ServerCog}
        label="Scheduler eligible"
        value={`${activeCount} active / ${pausedCount} paused`}
        note="The backend scheduler queues checks only for monitors whose active flag is true."
      />
      <SettingCard
        icon={Settings2}
        label="Default interval"
        value={averageInterval ? `${averageInterval}s average` : 'No active monitors'}
        note="Intervals are stored per monitor in milliseconds and submitted through the monitor create/edit dialog."
      />
      <SettingCard
        icon={Database}
        label="Backend routes in use"
        value="/monitors, /logs/analytics/:id, /dashboard/summary, /dashboard/incidents/:id, /dashboard/ai/:id"
        note="The empty auth/admin/settings backend modules do not expose routes yet, so this tab avoids fake controls."
      />
    </div>

    <div className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_#0F172A]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950">Monitor configuration</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Add or edit backend monitor records to change URL, method, interval and active state.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-xl border-[3px] border-black bg-[#00E676] px-4 py-2 text-sm font-black text-black shadow-[3px_3px_0_#0F172A] hover:bg-[#FFD600]"
        >
          New monitor
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {monitors.length === 0 ? (
          <div className="rounded-xl border-[3px] border-dashed border-slate-300 bg-[#FDFBF7] p-4 text-sm font-black text-slate-500">
            No backend monitor records yet.
          </div>
        ) : (
          monitors.slice(0, 5).map((monitor) => (
            <div key={monitor.id} className="grid gap-2 rounded-xl border-[3px] border-black bg-[#FDFBF7] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate font-black text-slate-950">{monitor.name}</p>
                <p className="mt-1 break-all text-sm font-bold text-slate-500">{monitor.method} {monitor.url}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
                <span className={`rounded-full border px-2.5 py-1 ${monitor.active ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-100 text-slate-600'}`}>
                  {monitor.active ? 'Active' : 'Paused'}
                </span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
                  {formatInterval(monitor.interval)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </section>
);

export default SettingsSection;
