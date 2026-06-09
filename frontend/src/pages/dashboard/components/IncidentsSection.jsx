import { useState, useMemo } from 'react';
import {
  Activity, AlertTriangle, BarChart3, BrainCircuit, CheckCircle2,
  Clock3, Gauge, Lightbulb, RefreshCcw, TrendingUp, ArrowLeft, Signal, Timer
} from 'lucide-react';
import UplotLineChart from '../../../components/charts/UplotLineChart';

// --- HELPERS ---
const getHealthStyle = (analytics) => {
  if (!analytics || analytics.totalChecks === 0) return { badge: 'border-slate-300 bg-slate-100 text-slate-600', dot: 'bg-slate-300', label: 'NO LOGS' };
  if (analytics.status === 'DOWN' || analytics.failures > 0) return { badge: 'border-red-300 bg-red-50 text-red-700', dot: 'bg-red-500', label: analytics.status };
  return { badge: 'border-emerald-300 bg-emerald-50 text-emerald-700', dot: 'bg-[#00E676]', label: analytics.status };
};

const MetricTile = ({ label, value, tone = 'bg-[#FDFBF7]' }) => (
  <div className={`rounded-xl border-2 border-black px-4 py-3 ${tone}`}>
    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
    <p className="mt-1 text-base font-black text-slate-950">{value}</p>
  </div>
);

const formatDateTime = (v) => v ? new Date(v).toLocaleString([], { day: '2-digit', hour: '2-digit', minute: '2-digit', month: 'short' }) : '-';

// --- DETAILED COMPONENTS (BACK TO FULL POWER) ---

const LatencyBarChart = ({ trend }) => {
  const points = trend?.slice(-10) || [];
  const maxLatency = Math.max(...points.map((p) => p.latency), 1);
  if (points.length === 0) return <div className="h-44 grid place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-[10px] font-black text-slate-400">NO LATENCY BARS</div>;

  return (
    <div className="rounded-xl border-2 border-black bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase text-slate-600">Latency Bars</p>
        <p className="text-xs font-black text-slate-400">{maxLatency}ms max</p>
      </div>
      <div className="grid h-32 grid-flow-col items-end gap-2">
        {points.map((p, i) => (
          <div key={i} className="flex h-full flex-col justify-end gap-1">
            <div 
              className={`w-full rounded-md border border-black ${p.latency >= maxLatency * 0.7 ? 'bg-[#FF3B30]' : 'bg-[#1E6BFF]'}`}
              style={{ height: `${Math.max(10, (p.latency / maxLatency) * 100)}%` }}
            />
            <span className="text-[8px] font-black text-slate-400 text-center truncate w-full">{p.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AIInsightPanel = ({ insight, incident }) => {
  if (!insight && !incident) return <div className="rounded-xl border-2 border-dashed border-slate-300 bg-[#FDFBF7] p-6 text-sm font-bold text-slate-500">AI analysis is waiting for failure context.</div>;

  const suggestions = insight?.suggestions || [];
  const resolutionSteps = insight?.resolutionSteps || [];
  const predictedIssues = insight?.predictedIssues || [];

  return (
    <div className="grid gap-5">
      <div className="rounded-xl border-2 border-black bg-[#FDFBF7] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-black bg-[#BFE8FF]"><BrainCircuit size={20} strokeWidth={3} /></span>
            <h3 className="text-sm font-black uppercase italic">AI Incident Summary</h3>
          </div>
          <span className="text-[10px] font-black bg-white border-2 border-black px-2 py-1 rounded-lg">{formatDateTime(insight?.createdAt || incident?.startedAt)}</span>
        </div>

        <p className="text-sm font-bold leading-7 text-slate-700 mb-4">{insight?.headline || insight?.reason || 'System is analyzing the failure patterns...'}</p>

        
        {resolutionSteps.length > 0 && (
          <div className="mt-4 rounded-lg border-2 border-black bg-white p-4">
            <p className="text-[11px] font-black uppercase text-slate-500 mb-3">How to Solve (Resolution Steps)</p>
            <div className="grid gap-3">
              {resolutionSteps.map((step, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-[#FDFBF7] p-3">
                  <p className="text-sm font-black text-slate-950">{i + 1}. {step.step}</p>
                  <p className="mt-1 text-sm font-bold text-slate-600 leading-relaxed">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-4 grid gap-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border-2 border-black bg-[#FFD600] p-3">
                <Lightbulb size={16} strokeWidth={3} className="mt-1" />
                <p className="text-sm font-black leading-tight text-black">{s}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Predicted Issues Section */}
      {predictedIssues.length > 0 && (
        <div className="rounded-xl border-2 border-black bg-[#E3F6FF] p-5">
          <p className="text-[11px] font-black uppercase text-slate-500 mb-4">Predictive Analysis</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {predictedIssues.map((p, i) => (
              <div key={i} className="rounded-xl border-2 border-black bg-white p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-black">{p.issue}</p>
                  <span className="text-[10px] font-black bg-[#BFE8FF] px-2 py-1 rounded border border-black">{Math.round(p.probability * 100)}%</span>
                </div>
                <p className="text-xs font-bold text-slate-600 mb-2">{p.why}</p>
                <p className="text-[10px] font-black uppercase text-slate-400">{p.timeframe}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN INCIDENTS SECTION ---
const IncidentsSection = ({
  aiInsightsByMonitorId = {},
  analyticsByMonitorId = {},
  incidentsByMonitorId = {},
  isLoadingAnalytics,
  monitors = [],
  onRefresh
}) => {
  const [selectedId, setSelectedId] = useState(null);
  const selectedMonitor = monitors.find(m => m.id === selectedId);

  // --- DETAIL VIEW ---
  if (selectedId && selectedMonitor) {
    const analytics = analyticsByMonitorId[selectedMonitor.id];
    const insight = aiInsightsByMonitorId[selectedMonitor.id]?.[0];
    const incident = incidentsByMonitorId[selectedMonitor.id]?.[0];
    const health = getHealthStyle(analytics);

    return (
      <section className="grid gap-6">
        {/* Detail Header */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedId(null)} className="grid h-10 w-10 place-items-center rounded-xl border-[3px] border-black bg-white hover:bg-slate-50 shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none transition-all">
              <ArrowLeft size={20} strokeWidth={3} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full border-2 border-black ${health.dot}`} />
                <h2 className="text-lg font-black uppercase italic truncate">{selectedMonitor.name}</h2>
              </div>
              <p className="text-[10px] font-bold text-slate-400 truncate max-w-[200px] sm:max-w-md">{selectedMonitor.url}</p>
            </div>
          </div>
          <span className={`rounded-full border-[3px] border-black px-3 py-1 text-[10px] font-black ${health.badge}`}>{health.label}</span>
        </div>

        {/* Main Analytics Grid */}
        <div className="grid gap-5 lg:grid-cols-[1fr_350px] ">
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
               <MetricTile label="Total" value={analytics?.totalChecks || 0} />
               <MetricTile label="Success" value={analytics?.success || 0} tone="bg-emerald-50" />
               <MetricTile label="Failures" value={analytics?.failures || 0} tone="bg-red-50" />
               <MetricTile label="Latency" value={`${analytics?.avgLatency || 0}ms`} tone="bg-blue-50" />
            </div>
            <div className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
               <div className="mb-4 flex items-center gap-2">
                 <TrendingUp size={18} strokeWidth={3} className="text-[#1E6BFF]" />
                 <h3 className="text-sm font-black uppercase italic">Performance Pulse</h3>
               </div>
               <UplotLineChart height={180} points={analytics?.trend?.map(p => ({ label: p.time, value: p.latency })) || []} color="#1E6BFF" />
            </div>
          </div>
          
          <div className="space-y-5">
            <LatencyBarChart trend={analytics?.trend} />
            <div className="rounded-xl border-2 border-black bg-[#FDFBF7] p-4">
              <p className="text-[11px] font-black uppercase text-slate-500 mb-2">Uptime Context</p>
              <div className="text-2xl font-black text-slate-950">{analytics?.uptime || 0}%</div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden border border-black">
                <div className="h-full bg-[#00E676]" style={{ width: `${analytics?.uptime || 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Deep AI Analysis (Full Detail) */}
        <AIInsightPanel insight={insight} incident={incident} />
      </section>
    );
  }

  // --- LIST VIEW ---
  return (
    <section className="grid gap-5">
      {/* Header remain same as list... */}
      <div className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-black uppercase italic">Fleet Health</h2>
          <button onClick={onRefresh} className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-[#FFD600] px-4 py-2 text-xs font-black shadow-[3px_3px_0_#000]">
            <RefreshCcw size={14} strokeWidth={3} /> REFRESH
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MetricTile label="Total Sites" value={monitors.length} />
          <MetricTile label="Reporting" value={monitors.filter(m => analyticsByMonitorId[m.id]).length} />
          <MetricTile label="Issues" value={monitors.filter(m => analyticsByMonitorId[m.id]?.status === 'DOWN').length} tone="bg-red-50" />
        </div>
      </div>

      <div className="grid gap-4 ">
        {monitors.map(m => {
          const a = analyticsByMonitorId[m.id];
          const h = getHealthStyle(a);
          return (
            <div key={m.id} onClick={() => setSelectedId(m.id)} className="group cursor-pointer rounded-2xl border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_#0F172A] hover:shadow-[8px_8px_0_#0F172A] hover:-translate-y-1 transition-all">
               <div className="flex justify-between items-start mb-3">
                 <div className="flex items-center gap-2">
                   <span className={`h-2 w-2 rounded-full border border-black ${h.dot}`} />
                   <h3 className="font-black uppercase text-sm truncate">{m.name}</h3>
                 </div>
                 <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border border-black ${h.badge}`}>{h.label}</span>
               </div>
               <div className="flex items-center justify-between mt-4 border-t-2 border-dashed pt-3 text-[10px] font-black text-slate-500 uppercase">
                  <span>Success: {a?.uptime || 0}%</span>
                  <span className="text-blue-600 group-hover:underline">Deep Analysis →</span>
               </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default IncidentsSection;