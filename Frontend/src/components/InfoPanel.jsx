import { NODE_COLORS } from "../data/mockData.js";


function getSelectedData(selected, caseGraph) {
  if (!caseGraph?.apiGraph?.nodes) {
    return null;
  }

  const nodes = caseGraph.apiGraph.nodes;

  const node = nodes.find((n) => {
    if (n.type !== selected.ntype) {
      return false;
    }

    if (selected.ntype === "FIR") {
      return n.data.fir_number === selected.sublabel;
    }

    if (selected.ntype === "CASE") {
      return n.data.case_number === selected.sublabel;
    }

    if (selected.ntype === "HEARING") {
      return n.data.hearing_id === selected.sublabel;
    }

    if (selected.ntype === "ORDER") {
      return n.data.order_id === selected.sublabel;
    }

    return false;
  });

  if (!node) {
    return null;
  }

  const data = { ...node.data };

  /*
   * If this is a hearing and next_hearing_date
   * is not explicitly stored, find the next
   * chronological hearing in the graph.
   */
  if (
    selected.ntype === "HEARING" &&
    !data.next_hearing_date &&
    data.hearing_date
  ) {
    const currentDate = new Date(data.hearing_date);

    const nextHearings = nodes
      .filter(
        (n) =>
          n.type === "HEARING" &&
          n.data?.hearing_id !== data.hearing_id &&
          n.data?.hearing_date
      )
      .map((n) => ({
        ...n.data,
        parsedDate: new Date(n.data.hearing_date)
      }))
      .filter(
        (hearing) =>
          !Number.isNaN(hearing.parsedDate.getTime()) &&
          hearing.parsedDate > currentDate
      )
      .sort(
        (a, b) =>
          a.parsedDate.getTime() -
          b.parsedDate.getTime()
      );

    if (nextHearings.length > 0) {
      data.next_hearing_date =
        nextHearings[0].hearing_date;
    }
  }

  return data;
}

function formatValue(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not recorded";
  }

  if (Array.isArray(value)) {

    if (value.length === 0) {
      return "Not recorded";
    }

    return value.join(", ");
  }

  return String(value);
}


function fieldsFor(selected, caseGraph) {

  const data = getSelectedData(
    selected,
    caseGraph
  );

  if (!data) {
    return [];
  }


  switch (selected.ntype) {

    case "FIR":

      return [

        ["FIR Number", data.fir_number],

        ["Police Station", data.police_station],

        ["Date Registered", data.filed_date],

        ["Lodged By", data.complainant],

        ["Against", data.accused],

        ["Sections", data.sections]

      ];


    case "CASE":

      return [

        ["Case Number", data.case_number],

        ["Registration Date", data.registration_date],

        ["Court", data.court_name],

        ["Status", data.status],

        ["Chargesheet Filed", data.chargesheet_filed],

        ["Chargesheet Deadline", data.chargesheet_deadline]

      ];


    case "HEARING":

      return [

        ["Hearing ID", data.hearing_id],

        ["Date", data.hearing_date],

        ["Type", data.hearing_type],

        ["Outcome", data.outcome],

        ["Next Hearing Date", data.next_hearing_date]

      ];


    case "ORDER":

      return [

        ["Order ID", data.order_id],

        ["Date", data.order_date],

        ["Type", data.order_type],

        ["Judge / Court", data.judge_or_court],

        ["Summary", data.summary]

      ];


    default:

      return [];
  }
}


export default function InfoPanel({
  selected,
  caseGraph
}) {

  if (!selected) {

    return (

      <div className="placeholder">

        &gt; SELECT A NODE TO VIEW ITS FILE ENTRY.

        <div className="legend">

          <span>
            <i
              style={{
                background: NODE_COLORS.FIR
              }}
            ></i>
            FIR
          </span>

          <span>
            <i
              style={{
                background: NODE_COLORS.CASE
              }}
            ></i>
            Case
          </span>

          <span>
            <i
              style={{
                background: NODE_COLORS.HEARING
              }}
            ></i>
            Hearing
          </span>

          <span>
            <i
              style={{
                background: NODE_COLORS.ORDER
              }}
            ></i>
            Order
          </span>

          <span>

            <i
              style={{
                background: "#8C8875",
                border: "1px dashed #17181A"
              }}
            ></i>

            Pending Entry

          </span>

        </div>

      </div>
    );
  }


  if (selected.ntype === "MISSING") {

    return (

      <div>

        <div
          className="type-tag"
          style={{
            background: "#8C8875"
          }}
        >
          {selected.label}
        </div>

        <h3>
          {selected.sublabel}
        </h3>

        <p className="placeholder">

          &gt; NO ENTRY ON FILE.
          This is the missing link driving
          the bottleneck flagged on the dashboard.

        </p>

      </div>
    );
  }


  return (

    <div>

      <div
        className="type-tag"
        style={{
          background:
            NODE_COLORS[selected.ntype]
        }}
      >
        {selected.label}
      </div>


      <h3>
        {selected.sublabel}
      </h3>


      {fieldsFor(
        selected,
        caseGraph
      ).map(([key, value]) => (

        <div
          className="info-row"
          key={key}
        >

          <span className="k">
            {key}
          </span>

          <span className="v">
            {formatValue(value)}
          </span>

        </div>

      ))}

    </div>
  );
} 