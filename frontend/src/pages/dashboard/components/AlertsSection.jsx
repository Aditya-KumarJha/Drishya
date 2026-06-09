import { useMemo, useState } from 'react';
import { BellRing, RefreshCcw } from 'lucide-react';

/**
 * Normalizes different backend response structures into a flat array
 */
const normalizeAlerts = (payload) => {
  const rawData = Array.isArray(payload?.data) ? payload.data : 
                  Array.isArray(payload) ? payload : 
                  Array.isArray(payload?.alerts) ? payload.alerts : [];
  return rawData.filter(Boolean); // Removes any null/undefined entries
};

const AlertsSection = ({ alertsPayload, isLoading, error, monitors = [], onRefresh }) => {
  const [query, setQuery] = useState('');

  // 1. Normalize the alerts data
  const alerts = useMemo(() => normalizeAlerts(alertsPayload), [alertsPayload]);

  // 2. Create a Map for fast monitor name lookups
  const monitorMap = useMemo(() => {
    const map = new Map();
    monitors.forEach((m) => {
      const id = m._id || m.id;
      if (id) map.set(id.toString(), m.name);
    });
    return map;
  }, [monitors]);

  // 3. Filter alerts based on search query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return alerts;

    return alerts.filter((a) => {
      // Extract monitor ID safely for name lookup in search
      const mid = typeof a.monitorId === 'object' ? a.monitorId?._id : a.monitorId;
      const mName = monitorMap.get(mid?.toString()) || '';
      
      const content = `${a.type || ''} ${a.message || ''} ${mName} ${a.monitorId?._id || ''}`;
      return content.toLowerCase().includes(q);
    });
  }, [alerts, query, monitorMap]);

  return (
    <section className="grid min-w-0 gap-5">
      {/* Header & Search Control Panel */}
      <div className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <h2 className="text-xl font-black text-slate-950 italic uppercase">Alert History</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              Backend alert history emitted by monitor checks and incident pipelines.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-[#FFD600] px-4 text-sm font-black text-black shadow-[3px_3px_0_#0F172A] transition-all hover:bg-[#00E676] active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className={isLoading ? 'animate-spin' : ''} size={17} strokeWidth={3} />
            REFRESH_FEED
          </button>
        </div>

        <div className="mt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search alerts by message, type, or monitor..."
            className="h-11 w-full rounded-xl border-[3px] border-black bg-[#FDFBF7] px-4 text-sm font-bold outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#00E676]/20"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-xl border-[3px] border-black bg-red-50 p-3 text-sm font-black text-red-700">
            SYSTEM_ERROR: {error}
          </div>
        )}
      </div>

      {/* Alerts List Container */}
      <div className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
        {filtered.length === 0 ? (
          <div className="grid place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-[#FDFBF7] p-12 text-center">
            <div className="rounded-full bg-slate-100 p-4">
               <BellRing size={32} strokeWidth={2.5} className="text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-black uppercase tracking-[0.15em] text-slate-500">
              No active alerts in buffer
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.slice(0, 60).map((a, idx) => {
              // PREVENT OBJECT CHILD ERROR: Always extract a string ID
              const midObj = a.monitorId;
              const actualMonitorId = typeof midObj === 'object' ? midObj?._id : midObj;
              const monitorDisplayName = monitorMap.get(actualMonitorId?.toString()) || 'Unknown Monitor';

              return (
                <div
                  key={a?._id || a?.id || `alert-${idx}`}
                  className="group rounded-xl border-2 border-black bg-[#FDFBF7] p-4 transition-all hover:bg-white hover:shadow-[4px_4px_0_#000]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-slate-950 text-base">
                        {a.message || a.title || 'System Notification'}
                      </p>
                      
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#00E676]" />
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                            Monitor: <span className="text-black">{monitorDisplayName}</span>
                          </p>
                        </span>
                        
                        <span className="rounded border border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                          Type: {a.type || 'Generic'}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="inline-block rounded-lg border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase text-slate-950 shadow-[2px_2px_0_#000]">
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default AlertsSection;