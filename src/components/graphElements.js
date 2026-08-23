/**
 * Turns one case's mock graph data (from CASE_GRAPHS) into Cytoscape
 * elements + preset positions. Kept separate from the component so
 * the FIR -> CASE -> HEARING -> ORDER schema logic can be read and
 * tested on its own.
 */
export function buildGraphElements(caseGraph) {
  const elements = [];
  const positions = {};

  // FIR (always present)
  elements.push({ data: { id: "FIR", label: "FIR", sublabel: caseGraph.fir.id, ntype: "FIR" } });
  positions["FIR"] = { x: 260, y: 60 };

  // CASE (always present)
  elements.push({ data: { id: "CASE", label: "CASE", sublabel: caseGraph.case.id, ntype: "CASE" } });
  positions["CASE"] = { x: 260, y: 210 };
  elements.push({ data: { id: "e1", source: "FIR", target: "CASE", label: "LEADS_TO" } });

  // HEARING (may be missing -> visualizes a bottleneck)
  if (caseGraph.hearing) {
    elements.push({
      data: { id: "HEARING", label: "HEARING", sublabel: caseGraph.hearing.id, ntype: "HEARING" }
    });
    positions["HEARING"] = { x: 260, y: 360 };
    elements.push({ data: { id: "e2", source: "CASE", target: "HEARING", label: "HAS" } });
  } else {
    elements.push({
      data: { id: "HEARING_MISSING", label: "HEARING", sublabel: "Not yet scheduled", ntype: "MISSING" }
    });
    positions["HEARING_MISSING"] = { x: 260, y: 360 };
    elements.push({ data: { id: "e2m", source: "CASE", target: "HEARING_MISSING", label: "HAS (pending)" } });
  }

  // ORDER (may be missing)
  if (caseGraph.hearing && caseGraph.order) {
    elements.push({
      data: { id: "ORDER", label: "ORDER", sublabel: caseGraph.order.id, ntype: "ORDER" }
    });
    positions["ORDER"] = { x: 260, y: 510 };
    elements.push({ data: { id: "e3", source: "HEARING", target: "ORDER", label: "PRODUCES" } });
  } else if (caseGraph.hearing && !caseGraph.order) {
    elements.push({
      data: { id: "ORDER_MISSING", label: "ORDER", sublabel: "Not yet produced", ntype: "MISSING" }
    });
    positions["ORDER_MISSING"] = { x: 260, y: 510 };
    elements.push({ data: { id: "e3m", source: "HEARING", target: "ORDER_MISSING", label: "PRODUCES (pending)" } });
  }

  return { elements, positions };
}
