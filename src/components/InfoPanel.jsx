import { NODE_COLORS } from "../data/mockData.js";

function fieldsFor(selected, caseGraph) {
  switch (selected.ntype) {
    case "FIR":
      return [
        ["FIR Number", caseGraph.fir.id],
        ["Police Station", caseGraph.fir.station],
        ["Date Registered", caseGraph.fir.date]
      ];
    case "CASE":
      return [
        ["Case Number", caseGraph.case.id],
        ["Court", caseGraph.case.court],
        ["Status", caseGraph.case.status]
      ];
    case "HEARING":
      return [
        ["Hearing ID", caseGraph.hearing.id],
        ["Date", caseGraph.hearing.date],
        ["Type", caseGraph.hearing.type]
      ];
    case "ORDER":
      return [
        ["Order ID", caseGraph.order.id],
        ["Date", caseGraph.order.date],
        ["Type", caseGraph.order.type]
      ];
    default:
      return [];
  }
}

export default function InfoPanel({ selected, caseGraph }) {
  if (!selected) {
    return (
      <div className="placeholder">
        &gt; SELECT A NODE TO VIEW ITS FILE ENTRY.
        <div className="legend">
          <span>
            <i style={{ background: NODE_COLORS.FIR }}></i>FIR
          </span>
          <span>
            <i style={{ background: NODE_COLORS.CASE }}></i>Case
          </span>
          <span>
            <i style={{ background: NODE_COLORS.HEARING }}></i>Hearing
          </span>
          <span>
            <i style={{ background: NODE_COLORS.ORDER }}></i>Order
          </span>
          <span>
            <i style={{ background: "#8C8875", border: "1px dashed #17181A" }}></i>Pending Entry
          </span>
        </div>
      </div>
    );
  }

  if (selected.ntype === "MISSING") {
    return (
      <div>
        <div className="type-tag" style={{ background: "#8C8875" }}>
          {selected.label}
        </div>
        <h3>{selected.sublabel}</h3>
        <p className="placeholder">
          &gt; NO ENTRY ON FILE. This is the missing link driving the bottleneck flagged on the dashboard.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="type-tag" style={{ background: NODE_COLORS[selected.ntype] }}>
        {selected.label}
      </div>
      <h3>{selected.sublabel}</h3>
      {fieldsFor(selected, caseGraph).map(([k, v]) => (
        <div className="info-row" key={k}>
          <span className="k">{k}</span>
          <span className="v">{v}</span>
        </div>
      ))}
    </div>
  );
}
