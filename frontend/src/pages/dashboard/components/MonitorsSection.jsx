import { gsap } from 'gsap';
import { Edit3, Power, Search, Trash2 } from 'lucide-react';
import { formatInterval, formatMonitorDate, statusStyles } from '../dashboardUtils';

const animatePress = (target) => {
  if (!target) return;

  gsap.killTweensOf(target);
  gsap.fromTo(
    target,
    { scale: 0.92, x: 2, y: 2 },
    { scale: 1, x: 0, y: 0, duration: 0.24, ease: 'back.out(3)' },
  );
};

const PressableIconButton = ({ children, className, disabled, onClick, ...props }) => (
  <button
    type="button"
    className={`${className} active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60`}
    disabled={disabled}
    onPointerDown={(event) => {
      if (!disabled) {
        animatePress(event.currentTarget);
      }
    }}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
);

const EmptyMonitors = ({ onCreate }) => (
  <div className="rounded-2xl border-[3px] border-dashed border-slate-300 bg-[#FDFBF7] p-6 text-center">
    <p className="text-lg font-black text-slate-950">No monitors found</p>
    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
      No service matches this search or status filter. Try another filter or create a new monitor.
    </p>
    <button
      type="button"
      onClick={onCreate}
      className="mt-4 rounded-xl border-[3px] border-black bg-[#00E676] px-4 py-2 text-sm font-black text-black shadow-[3px_3px_0_#0F172A] hover:bg-[#FFD600]"
    >
      New monitor
    </button>
  </div>
);

const LoadingMonitors = ({ colSpan }) => (
  <div className="mx-auto max-w-sm rounded-2xl border-[3px] border-dashed border-slate-300 bg-[#FDFBF7] p-6 text-center">
    <p className="text-lg font-black text-slate-950">Loading monitors</p>
    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
      Fetching live monitor data from the backend.
    </p>
    {colSpan ? null : null}
  </div>
);

const MonitorActions = ({ deletingMonitorId, isSavingMonitor, monitor, onDelete, onEdit, onToggle, size = 'desktop' }) => {
  const buttonClass = size === 'mobile' ? 'grid h-10 place-items-center' : 'grid h-9 w-9 place-items-center';

  return (
    <>
      <PressableIconButton
        className={`${buttonClass} rounded-xl border-[3px] border-black bg-white text-slate-950 hover:bg-[#FFD600]`}
        onClick={() => onEdit(monitor)}
        disabled={isSavingMonitor}
        aria-label={`Edit ${monitor.name}`}
      >
        <Edit3 size={16} strokeWidth={3} />
      </PressableIconButton>
      <PressableIconButton
        className={`${buttonClass} rounded-xl border-[3px] border-black ${monitor.active ? 'bg-[#00E676]' : 'bg-slate-200'} text-slate-950 hover:bg-[#FFD600]`}
        onClick={() => onToggle(monitor.id)}
        disabled={isSavingMonitor}
        aria-label={`${monitor.active ? 'Pause' : 'Resume'} ${monitor.name}`}
      >
        <Power size={16} strokeWidth={3} />
      </PressableIconButton>
      <PressableIconButton
        className={`${buttonClass} rounded-xl border-[3px] border-black bg-white text-red-600 hover:bg-red-50`}
        onClick={() => onDelete(monitor.id)}
        disabled={deletingMonitorId === monitor.id}
        aria-label={`Delete ${monitor.name}`}
      >
        <Trash2 size={16} strokeWidth={3} />
      </PressableIconButton>
    </>
  );
};

const MobileMonitorCards = (props) => {
  const { deletingMonitorId, filteredMonitors, isLoadingMonitors, isSavingMonitor, onCreate, onDelete, onEdit, onToggle } = props;

  return (
    <div className="grid gap-3 p-4 lg:hidden">
      {isLoadingMonitors ? (
        <LoadingMonitors />
      ) : filteredMonitors.length > 0 ? (
        filteredMonitors.map((monitor) => (
          <article key={monitor.id} className="min-w-0 rounded-2xl border-[3px] border-black bg-[#FDFBF7] p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-3 w-3 shrink-0 rounded-full border-2 border-black ${monitor.active ? 'bg-[#00E676]' : 'bg-slate-300'}`} />
                  <p className="truncate font-black text-slate-950">{monitor.name}</p>
                </div>
                <p className="mt-2 break-all text-sm font-bold leading-5 text-slate-500">{monitor.method} {monitor.url}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusStyles[monitor.status]}`}>
                {monitor.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border-2 border-black bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Method</p>
                <p className="mt-1 text-sm font-black text-slate-950">{monitor.method}</p>
              </div>
              <div className="rounded-xl border-2 border-black bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Every</p>
                <p className="mt-1 text-sm font-black text-slate-950">{formatInterval(monitor.interval)}</p>
              </div>
              <div className="rounded-xl border-2 border-black bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Updated</p>
                <p className="mt-1 truncate text-sm font-black text-slate-950">{formatMonitorDate(monitor.updatedAt)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MonitorActions
                deletingMonitorId={deletingMonitorId}
                isSavingMonitor={isSavingMonitor}
                monitor={monitor}
                onDelete={onDelete}
                onEdit={onEdit}
                onToggle={onToggle}
                size="mobile"
              />
            </div>
          </article>
        ))
      ) : (
        <EmptyMonitors onCreate={onCreate} />
      )}
    </div>
  );
};

const DesktopMonitorTable = (props) => {
  const { deletingMonitorId, filteredMonitors, isLoadingMonitors, isSavingMonitor, onCreate, onDelete, onEdit, onToggle } = props;

  return (
    <div className="hidden w-full max-w-full overflow-x-auto lg:block 2xl:overflow-x-visible">
      <table className="w-full min-w-[760px] text-left 2xl:min-w-0">
        <thead className="bg-[#FDFBF7] text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="border-b-2 border-slate-200 px-4 py-3 font-black">Monitor</th>
            <th className="border-b-2 border-slate-200 px-4 py-3 font-black">Status</th>
            <th className="border-b-2 border-slate-200 px-4 py-3 font-black">Method</th>
            <th className="border-b-2 border-slate-200 px-4 py-3 font-black">Interval</th>
            <th className="hidden border-b-2 border-slate-200 px-4 py-3 font-black xl:table-cell">Updated</th>
            <th className="border-b-2 border-slate-200 px-4 py-3 font-black">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoadingMonitors ? (
            <tr>
              <td colSpan={6} className="px-4 py-14 text-center">
                <LoadingMonitors colSpan={6} />
              </td>
            </tr>
          ) : filteredMonitors.length > 0 ? (
            filteredMonitors.map((monitor) => (
              <tr key={monitor.id} className="align-top hover:bg-blue-50">
                <td className="border-b border-slate-100 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-3 w-3 rounded-full border-2 border-black ${monitor.active ? 'bg-[#00E676]' : 'bg-slate-300'}`} />
                    <div>
                      <p className="font-black text-slate-950">{monitor.name}</p>
                      <p className="mt-1 max-w-[220px] truncate text-sm font-bold text-slate-500 xl:max-w-[260px]">{monitor.method} {monitor.url}</p>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">Created {formatMonitorDate(monitor.createdAt)}</p>
                    </div>
                  </div>
                </td>
                <td className="border-b border-slate-100 px-4 py-4">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black uppercase ${statusStyles[monitor.status]}`}>
                    {monitor.status}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 font-black text-slate-950">{monitor.method}</td>
                <td className="border-b border-slate-100 px-4 py-4 text-sm font-black text-slate-500">{formatInterval(monitor.interval)}</td>
                <td className="hidden border-b border-slate-100 px-4 py-4 text-sm font-black text-slate-500 xl:table-cell">{formatMonitorDate(monitor.updatedAt)}</td>
                <td className="border-b border-slate-100 px-4 py-4">
                  <div className="flex items-center gap-2">
                    <MonitorActions
                      deletingMonitorId={deletingMonitorId}
                      isSavingMonitor={isSavingMonitor}
                      monitor={monitor}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onToggle={onToggle}
                    />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-14 text-center">
                <div className="mx-auto max-w-sm">
                  <EmptyMonitors onCreate={onCreate} />
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const MonitorsSection = ({
  deletingMonitorId,
  filteredMonitors,
  isLoadingMonitors,
  isSavingMonitor,
  onCreate,
  onDelete,
  onEdit,
  onQueryChange,
  onStatusFilterChange,
  onToggle,
  query,
  statusFilter,
}) => (
  <section className="grid min-w-0 gap-5">
    <div className="min-w-0 rounded-2xl border-[3px] border-black bg-white shadow-[6px_6px_0_#0F172A]">
      <div className="grid gap-4 border-b-[3px] border-black p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <h2 className="text-lg font-black text-slate-950">Monitors</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Create, update, pause and delete backend monitor records.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'paused'].map((status) => (
            <button
              key={status}
              onClick={() => onStatusFilterChange(status)}
              className={`rounded-xl border-[3px] border-black px-3 py-2 text-xs font-black uppercase ${
                statusFilter === status ? 'bg-[#1E6BFF] text-white' : 'bg-white text-slate-600 hover:bg-[#FFD600] hover:text-black'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b-[3px] border-black p-4">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} strokeWidth={3} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search monitors, URLs or methods"
            className="h-11 w-full rounded-xl border-[3px] border-black bg-[#FDFBF7] pl-10 pr-3 text-sm font-bold outline-none placeholder:text-slate-400 focus:bg-white"
          />
        </label>
      </div>

      <MobileMonitorCards
        deletingMonitorId={deletingMonitorId}
        filteredMonitors={filteredMonitors}
        isLoadingMonitors={isLoadingMonitors}
        isSavingMonitor={isSavingMonitor}
        onCreate={onCreate}
        onDelete={onDelete}
        onEdit={onEdit}
        onToggle={onToggle}
      />
      <DesktopMonitorTable
        deletingMonitorId={deletingMonitorId}
        filteredMonitors={filteredMonitors}
        isLoadingMonitors={isLoadingMonitors}
        isSavingMonitor={isSavingMonitor}
        onCreate={onCreate}
        onDelete={onDelete}
        onEdit={onEdit}
        onToggle={onToggle}
      />
    </div>
  </section>
);

export default MonitorsSection;
