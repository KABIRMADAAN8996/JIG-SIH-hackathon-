import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { CASE_GRAPHS, DASHBOARD_DATA } from "../data/mockData.js";
import { buildGraphElements } from "./graphElements.js";
import { cytoscapeStyle } from "./cytoscapeStyle.js";
import DemoStamp from "./DemoStamp.jsx";
import InfoPanel from "./InfoPanel.jsx";
import "../styles/graph.css";

function todayStr() {
  return new Date()
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

export default function GraphView({ caseId, onBack }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [selected, setSelected] = useState(null);

  const caseGraph = CASE_GRAPHS[caseId];

  useEffect(() => {
    if (!containerRef.current || !caseGraph) return;

    const { elements, positions } = buildGraphElements(caseGraph);

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: { name: "preset", positions: (node) => positions[node.id()] },
      style: cytoscapeStyle,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false
    });

    cy.fit(undefined, 40);

    cy.on("tap", "node", (evt) => setSelected(evt.target.data()));
    cy.on("tap", (evt) => {
      if (evt.target === cy) setSelected(null);
    });

    cyRef.current = cy;
    return () => cy.destroy();
  }, [caseId, caseGraph]);

  return (
    <div className="app-shell">
      <div className="masthead">
        <div className="masthead-top">
          <div>
            <div className="reg-no">CASE FILE VIEW &nbsp;·&nbsp; RETRIEVED {todayStr()}</div>
            <div className="masthead-title">
              <div className="masthead-mark">JIG</div>
              <div>
                <h1>Judicial Intelligence Graph</h1>
                <div className="kicker">— Case Graph —</div>
              </div>
            </div>
          </div>
          <button className="view-btn ghost" onClick={onBack}>
            &larr; Back to Register
          </button>
        </div>
        <DemoStamp dataset={DASHBOARD_DATA.dataset} />
      </div>

      <div className="graph-header">
        <div>
          <h2>{caseId}</h2>
          <div className="graph-sub">FIR &rarr; CASE &rarr; HEARING &rarr; ORDER</div>
        </div>
      </div>

      <div className="graph-panel">
        <div className="cy-container" ref={containerRef}></div>
        <div className="info-panel">
          <InfoPanel selected={selected} caseGraph={caseGraph} />
        </div>
      </div>
    </div>
  );
}
