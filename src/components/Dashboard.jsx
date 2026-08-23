import { DASHBOARD_DATA } from "../data/mockData.js";
import DemoStamp from "./DemoStamp.jsx";
import CaseRow from "./CaseRow.jsx";
import HealthyRow from "./HealthyRow.jsx";
import "../styles/dashboard.css";

function todayStr() {
  return new Date()
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

export default function Dashboard({ onSelectCase }) {
  return (
    <div className="app-shell">
      <div className="masthead">
        <div className="masthead-top">
          <div>
            <div className="reg-no">REGISTER VIEW &nbsp;·&nbsp; SESSION {todayStr()}</div>
            <div className="masthead-title">
              <div className="masthead-mark">JIG</div>
              <div>
                <h1>Judicial Intelligence Graph</h1>
                <div className="kicker">— Judge Dashboard —</div>
              </div>
            </div>
          </div>
          <div className="masthead-right">
            PRESIDING OFFICER VIEW
            <br />
            DISTRICT COURT, G.B. NAGAR
            <br />
            CAUSE LIST: TODAY
          </div>
        </div>
        <DemoStamp dataset={DASHBOARD_DATA.dataset} />
      </div>

      <div className="section-label">
        Cases Requiring Attention
        <span className="count">
          {DASHBOARD_DATA.attention.length} ENTR{DASHBOARD_DATA.attention.length === 1 ? "Y" : "IES"}
        </span>
      </div>
      <hr className="section-rule" />
      <div className="ledger">
        {DASHBOARD_DATA.attention.map((c, i) => (
          <CaseRow key={c.id} index={i} caseItem={c} onSelect={onSelectCase} />
        ))}
      </div>

      <div className="section-label">
        Healthy Cases
        <span className="count">
          {DASHBOARD_DATA.healthy.length} ENTR{DASHBOARD_DATA.healthy.length === 1 ? "Y" : "IES"}
        </span>
      </div>
      <hr className="section-rule" />
      <div className="ledger">
        {DASHBOARD_DATA.healthy.map((c, i) => (
          <HealthyRow key={c.id} index={i} caseItem={c} onSelect={onSelectCase} />
        ))}
      </div>
    </div>
  );
}
