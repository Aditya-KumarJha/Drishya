export const CREDIT_PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceInr: 199,
    credits: 5000,
    note: "For small uptime checks and early projects.",
    includes: ["Active check billing", "Email alerts", "Raw logs"],
  },
  {
    id: "growth",
    name: "Growth",
    priceInr: 499,
    credits: 15000,
    note: "For active products and API monitoring.",
    includes: ["API assertions", "AI chat memory", "SLA reports"],
  },
  {
    id: "scale",
    name: "Scale",
    priceInr: 999,
    credits: 40000,
    note: "For production teams with many services.",
    includes: ["SSL/DNS checks", "Incident exports", "Project status pages"],
  },
];

export const CHECK_CREDIT_COST = Number(process.env.CHECK_CREDIT_COST || 1);
