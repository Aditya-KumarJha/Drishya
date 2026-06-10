import { CheckCircle2, CreditCard, IndianRupee, ShieldCheck, Sparkles } from 'lucide-react';

const cardTints = {
  starter: 'bg-[#E8F6FF]',
  growth: 'bg-[#F4FFF8]',
  scale: 'bg-[#FFF7BF]',
};

const fallbackIncludes = {
  starter: ['Active check billing', 'Email alerts', 'Raw logs'],
  growth: ['API assertions', 'AI chat memory', 'SLA reports'],
  scale: ['SSL/DNS checks', 'Incident exports', 'Project status pages'],
};

const PricingSection = ({ billing, isPurchasing, onPurchase }) => {
  const plans = billing?.plans || [];

  return (
    <section className="grid min-w-0 gap-5">
      <div className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#0F172A]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1E6BFF]">Credits and upgrades</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Top up credits to keep monitoring active.</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-500">
              Active monitors spend credits once per hour. Paused or deleted monitors do not charge, and exhausted balances pause active monitors automatically.
            </p>
          </div>
          <div className="rounded-2xl border-[3px] border-black bg-[#FFD600] p-4 text-right shadow-[4px_4px_0_#0F172A]">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">Current balance</p>
            <p className="mt-1 text-3xl font-black text-slate-950">{billing?.credits ?? 0}</p>
            <p className="text-xs font-bold text-slate-600">Used {billing?.creditsUsed ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={`relative flex min-h-[500px] flex-col overflow-hidden rounded-2xl border-[3px] border-black p-5 shadow-[6px_6px_0_#0F172A] ${cardTints[plan.id] || 'bg-white'}`}
          >
            {plan.id === 'growth' && (
              <span className="absolute right-5 top-5 rounded-full border-2 border-black bg-[#00E676] px-3 py-1 text-[10px] font-black uppercase">
                Best value
              </span>
            )}

            <div className="border-b-2 border-[#1E6BFF]/30 pb-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl border-[3px] border-black bg-white shadow-[3px_3px_0_#0F172A]">
                {plan.id === 'scale' ? <ShieldCheck size={22} strokeWidth={3} /> : <CreditCard size={22} strokeWidth={3} />}
              </div>
              <h3 className="mt-5 text-3xl font-black uppercase italic text-[#08256B]">{plan.name}</h3>
              <p className="mt-2 min-h-12 text-sm font-black uppercase leading-6 text-[#08256B]/60">{plan.note}</p>
            </div>

            <div className="py-7">
              <div className="flex items-start gap-1 text-[#08256B]">
                <IndianRupee className="mt-2" size={38} strokeWidth={3} />
                <span className="text-6xl font-black italic leading-none">{plan.priceInr}</span>
              </div>
              <p className="mt-3 text-sm font-black uppercase tracking-[0.12em] text-[#08256B]/55">
                {Number(plan.credits).toLocaleString('en-IN')} credits
              </p>
            </div>

            <ul className="grid gap-3 border-t-2 border-[#1E6BFF]/30 pt-5">
              {(plan.includes || fallbackIncludes[plan.id] || []).map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm font-black uppercase text-[#08256B]">
                  <CheckCircle2 size={17} strokeWidth={3} className="text-[#1E6BFF]" />
                  {item}
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={isPurchasing === plan.id}
              onClick={() => onPurchase(plan.id)}
              className="mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-[#1E6BFF] px-4 text-sm font-black uppercase italic tracking-[0.12em] text-white shadow-[4px_4px_0_#0F172A] hover:bg-[#08256B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles size={18} strokeWidth={3} />
              {isPurchasing === plan.id ? 'Opening...' : 'Select plan'}
            </button>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border-[3px] border-black bg-white p-4 text-center text-sm font-bold text-slate-500 shadow-[6px_6px_0_#0F172A]">
        Payments are processed by Razorpay. Credits are added only after backend signature verification succeeds.
      </div>
    </section>
  );
};

export default PricingSection;
