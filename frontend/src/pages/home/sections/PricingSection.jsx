import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const plans = [
  {
    name: 'Signal Desk',
    price: '$29',
    cadence: 'monitor / month',
    note: 'For small surfaces that need clean signal.',
    tint: 'bg-[#E8F6FF]',
    accent: 'bg-[#BFE8FF]',
    includes: ['Uptime checks', 'Latency alerts', '7 day history'],
  },
  {
    name: 'War Room',
    price: '$99',
    cadence: 'service / month',
    note: 'For teams that need context before the call starts.',
    tint: 'bg-[#EFFFF5]',
    accent: 'bg-[#00E676]',
    includes: ['Trace map', 'RCA timeline', 'Noise scoring'],
  },
  {
    name: 'Autopilot RCA',
    price: 'Custom',
    cadence: 'production scale',
    note: 'For high-traffic systems with private workflows.',
    tint: 'bg-[#FFF7BF]',
    accent: 'bg-[#FFD600]',
    includes: ['Runbook actions', 'Private integrations', 'Priority support'],
  },
];

const PricingSection = ({ className = '' }) => {
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);

  useLayoutEffect(() => {
    const cards = cardRefs.current.filter(Boolean);

    const ctx = gsap.context(() => {
      gsap.set(cards, { autoAlpha: 0, y: 32 });

      gsap.to(cards, {
        autoAlpha: 1,
        y: 0,
        stagger: 0.1,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 74%',
          end: 'center 45%',
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className={`relative w-screen max-w-full overflow-hidden bg-[#00E676] px-3 py-16 font-mono text-[#08256B] sm:px-5 sm:py-20 lg:py-24 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-15">
        <svg className="h-full w-full" viewBox="0 0 1200 520" preserveAspectRatio="none">
          <g fill="none" stroke="#1E6BFF" strokeWidth="2">
            <path d="M0 90h230v120h310v-80h660" />
            <path d="M120 520V370h280v80h800" />
            <path d="M950 0v160H690v170H260" />
          </g>
        </svg>
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
        {plans.map((plan, index) => (
          <article
            key={plan.name}
            ref={(el) => (cardRefs.current[index] = el)}
            className={`relative flex min-h-[360px] flex-col overflow-hidden border border-[#1E6BFF]/70 ${plan.tint} p-4 ring-1 ring-white/55 sm:p-5`}
          >
            <div className={`absolute inset-x-0 top-0 h-1.5 ${plan.accent}`} />
            <div className="border-b border-[#1E6BFF]/45 pb-4 pt-2">
              <h3 className="font-black uppercase italic leading-none text-2xl sm:text-3xl">{plan.name}</h3>
              <p className="mt-3 max-w-[24rem] font-bold uppercase leading-snug text-xs text-[#08256B]/65">{plan.note}</p>
            </div>

            <div className="py-7">
              <div className="font-black uppercase italic leading-none tracking-normal text-[clamp(3.9rem,11vw,6.3rem)]">
                {plan.price}
              </div>
              <div className="mt-2 font-black uppercase tracking-[0.12em] text-[10px] text-[#08256B]/55 sm:text-xs">
                {plan.cadence}
              </div>
            </div>

            <ul className="mt-auto grid gap-2 border-t border-[#1E6BFF]/45 pt-4">
              {plan.includes.map((item) => (
                <li key={item} className="flex items-center gap-2 font-black uppercase leading-tight text-xs">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E6BFF]" />
                  {item}
                </li>
              ))}
            </ul>

            <button className="mt-5 border border-[#1E6BFF] bg-[#1E6BFF] px-3 py-3 text-left font-black uppercase italic tracking-[0.12em] text-white transition-colors hover:bg-[#08256B]">
              Select plan
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};

export default PricingSection;
