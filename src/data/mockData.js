/**
 * MOCK DATA — Phase 1 only.
 * Everything below is hardcoded / synthetic (dataset "B").
 * No Neo4j, no FastAPI, no LLM, no real case data.
 *
 * Schema is locked to: FIR --LEADS_TO--> CASE --HAS--> HEARING --PRODUCES--> ORDER
 * Do not add new node types (Person, Judge, Evidence, Law, etc).
 */

export const DASHBOARD_DATA = {
  // Drives the "DEMO DATA" stamp. The badge should always read this field
  // rather than being hardcoded per case.
  dataset: "B",

  attention: [
    {
      id: "CR-204/26",
      issue: "Hearing Scheduling Bottleneck",
      detail: "Case registered 62 days ago — no hearing has been scheduled.",
      days: "62 DAYS SINCE REGISTRATION"
    },
    {
      id: "CR-319/26",
      issue: "Stalled Proceedings",
      detail: "Last hearing was adjourned 41 days ago — no next hearing scheduled.",
      days: "41 DAYS SINCE LAST HEARING"
    },
    {
      id: "CR-421/26",
      issue: "Chargesheet Deadline Exceeded",
      detail: "Statutory chargesheet-filing window has lapsed with no filing on record.",
      days: "DEADLINE EXCEEDED"
    }
  ],

  healthy: [
    { id: "CR-101/26" },
    { id: "CR-150/26" }
  ]
};

// Per-case fake graph data: FIR -> CASE -> HEARING -> ORDER.
// Some cases stop early on purpose, so the graph visually mirrors
// the bottleneck flagged on the dashboard.
export const CASE_GRAPHS = {
  "CR-101/26": {
    fir:     { id: "FIR-101/2026", station: "Sector-24 PS", date: "02-Jan-2026" },
    case:    { id: "CR-101/26", court: "District Court, Gautam Buddh Nagar", status: "Ongoing" },
    hearing: { id: "H-001", date: "18-Feb-2026", type: "Framing of Charges" },
    order:   { id: "O-001", date: "18-Feb-2026", type: "Charges Framed" }
  },
  "CR-150/26": {
    fir:     { id: "FIR-150/2026", station: "Dadri PS", date: "10-Jan-2026" },
    case:    { id: "CR-150/26", court: "District Court, Gautam Buddh Nagar", status: "Ongoing" },
    hearing: { id: "H-010", date: "02-Mar-2026", type: "Evidence Recording" },
    order:   { id: "O-010", date: "02-Mar-2026", type: "Adjournment Order" }
  },
  "CR-204/26": {
    fir:     { id: "FIR-204/2026", station: "Bisrakh PS", date: "22-May-2026" },
    case:    { id: "CR-204/26", court: "District Court, Gautam Buddh Nagar", status: "Registered — awaiting listing" },
    hearing: null,
    order:   null
  },
  "CR-319/26": {
    fir:     { id: "FIR-319/2026", station: "Jarcha PS", date: "03-Apr-2026" },
    case:    { id: "CR-319/26", court: "District Court, Gautam Buddh Nagar", status: "Stalled" },
    hearing: { id: "H-045", date: "12-Jul-2026", type: "Adjourned — no date fixed" },
    order:   null
  },
  "CR-421/26": {
    fir:     { id: "FIR-421/2026", station: "Surajpur PS", date: "15-Feb-2026" },
    case:    { id: "CR-421/26", court: "District Court, Gautam Buddh Nagar", status: "Chargesheet overdue" },
    hearing: null,
    order:   null
  }
};

export const NODE_COLORS = {
  FIR: "#6B5A2E",
  CASE: "#17181A",
  HEARING: "#3E3560",
  ORDER: "#1F4D34"
};
