import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";

import { getCase, getCaseGraph } from "../api.js";
import { cytoscapeStyle } from "./cytoscapeStyle.js";
import DemoStamp from "./DemoStamp.jsx";
import InfoPanel from "./InfoPanel.jsx";
import CaseTimeline from "./CaseTimeline.jsx";

import "../styles/graph.css";


function todayStr() {
  return new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
    .toUpperCase();
}


/* =========================================================
   CREATE SIMPLE CASE GRAPH DATA
   ========================================================= */

function makeCaseGraph(graph) {
  const fir = graph.nodes.find(
    (n) => n.type === "FIR"
  );

  const caseNode = graph.nodes.find(
    (n) => n.type === "CASE"
  );

  const hearings = graph.nodes.filter(
    (n) => n.type === "HEARING"
  );

  const orders = graph.nodes.filter(
    (n) => n.type === "ORDER"
  );


  const hearing = hearings.length
    ? hearings.sort((a, b) =>
      String(a.data.hearing_date).localeCompare(
        String(b.data.hearing_date)
      )
    )[hearings.length - 1]
    : null;


  const order = orders.length
    ? orders.sort((a, b) =>
      String(a.data.order_date).localeCompare(
        String(b.data.order_date)
      )
    )[orders.length - 1]
    : null;


  return {
    fir: fir
      ? {
        id: fir.data.fir_number,
        station: fir.data.police_station,
        date: fir.data.filed_date
      }
      : {
        id: "N/A",
        station: "N/A",
        date: "N/A"
      },


    case: caseNode
      ? {
        id: caseNode.data.case_number,
        court: caseNode.data.court_name,
        status: caseNode.data.status
      }
      : {
        id: graph.case_number,
        court: "N/A",
        status: "N/A"
      },


    hearing: hearing
      ? {
        id: hearing.data.hearing_id,
        date: hearing.data.hearing_date,
        type: hearing.data.hearing_type
      }
      : null,


    order: order
      ? {
        id: order.data.order_id,
        date: order.data.order_date,
        type: order.data.order_type
      }
      : null
  };
}


/* =========================================================
   CREATE CYTOSCAPE ELEMENTS
   ========================================================= */

function makeElements(graph) {
  const elements = [];
  const positions = {};


  const fir = graph.nodes.find(
    (n) => n.type === "FIR"
  );

  const caseNode = graph.nodes.find(
    (n) => n.type === "CASE"
  );

  const hearings = graph.nodes.filter(
    (n) => n.type === "HEARING"
  );

  const orders = graph.nodes.filter(
    (n) => n.type === "ORDER"
  );


  /* ---------------- FIR ---------------- */

  if (fir) {
    elements.push({
      data: {
        id: "FIR",
        label: "FIR",
        sublabel: fir.data.fir_number,
        ntype: "FIR"
      }
    });

    positions.FIR = {
      x: 260,
      y: 60
    };
  }


  /* ---------------- CASE ---------------- */

  if (caseNode) {
    elements.push({
      data: {
        id: "CASE",
        label: "CASE",
        sublabel: caseNode.data.case_number,
        ntype: "CASE"
      }
    });

    positions.CASE = {
      x: 260,
      y: 210
    };
  }


  /* ---------------- FIR -> CASE ---------------- */

  if (fir && caseNode) {
    elements.push({
      data: {
        id: "e1",
        source: "FIR",
        target: "CASE",
        label: "LEADS_TO"
      }
    });
  }


  /* ---------------- CASE MISSING ---------------- */

  if (fir && !caseNode) {
    elements.push({
      data: {
        id: "CASE_MISSING",
        label: "PENDING ENTRY",
        sublabel: "Case not registered",
        ntype: "MISSING"
      }
    });

    positions.CASE_MISSING = {
      x: 260,
      y: 210
    };


    elements.push({
      data: {
        id: "missing-case-edge",
        source: "FIR",
        target: "CASE_MISSING",
        label: "MISSING"
      }
    });
  }


  /* ---------------- HEARINGS ---------------- */

  if (hearings.length > 0) {

    hearings.forEach((h, index) => {

      const id = `HEARING-${index}`;


      elements.push({
        data: {
          id,
          label: "HEARING",
          sublabel: h.data.hearing_id,
          ntype: "HEARING"
        }
      });


      positions[id] = {
        x: 260,
        y: 360 + index * 130
      };


      if (caseNode) {
        elements.push({
          data: {
            id: `he-${index}`,
            source: "CASE",
            target: id,
            label: "HAS"
          }
        });
      }


      /* ---------------- MATCH ORDER TO HEARING ---------------- */

      const hearingOrder = orders.find(
        (o) =>
          o.data.order_date === h.data.hearing_date
      );


      if (hearingOrder) {

        const orderId = `ORDER-${index}`;


        elements.push({
          data: {
            id: orderId,
            label: "ORDER",
            sublabel: hearingOrder.data.order_id,
            ntype: "ORDER"
          }
        });


        positions[orderId] = {
          x: 520,
          y: 360 + index * 130
        };


        elements.push({
          data: {
            id: `order-edge-${index}`,
            source: id,
            target: orderId,
            label: "PRODUCES"
          }
        });
      }
    });


  } else if (caseNode) {

    /* ---------------- NO HEARING ---------------- */

    elements.push({
      data: {
        id: "HEARING_MISSING",
        label: "HEARING",
        sublabel: "Not yet scheduled",
        ntype: "MISSING"
      }
    });


    positions.HEARING_MISSING = {
      x: 260,
      y: 360
    };


    elements.push({
      data: {
        id: "e2m",
        source: "CASE",
        target: "HEARING_MISSING",
        label: "HAS (pending)"
      }
    });
  }


  return {
    elements,
    positions
  };
}


/* =========================================================
   FORMAT EVIDENCE
   ========================================================= */

function formatEvidenceValue(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not recorded";
  }


  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }


  return String(value);
}


/* =========================================================
   RULE CARD
   ========================================================= */

function RuleCard({ ruleKey, rule }) {

  const triggered =
    rule.status === "TRIGGERED";


  return (
    <div
      className={`rule-card ${triggered ? "triggered" : "clear"
        }`}
    >

      <div className="rule-card-header">

        <div>

          <div className="rule-number">
            {ruleKey
              .replace("_", " ")
              .toUpperCase()}
          </div>


          <div className="rule-title">
            {rule.title}
          </div>

        </div>


        <div
          className={`rule-status ${triggered
            ? "danger"
            : "safe"
            }`}
        >
          {triggered
            ? "TRIGGERED"
            : "N/A"}
        </div>

      </div>


      <div className="rule-description">
        {rule.description}
      </div>


      <div className="rule-reason">

        <span className="rule-label">
          WHY
        </span>

        <span>
          {rule.reason}
        </span>

      </div>


      {rule.evidence && (

        <div className="rule-evidence">

          <div className="rule-label">
            EVIDENCE
          </div>


          <div className="evidence-grid">

            {Object.entries(
              rule.evidence
            ).map(
              ([key, value]) => (

                <div
                  className="evidence-item"
                  key={key}
                >

                  <span>
                    {key
                      .replaceAll("_", " ")
                      .replace(
                        /\b\w/g,
                        (letter) =>
                          letter.toUpperCase()
                      )}
                  </span>


                  <strong>
                    {formatEvidenceValue(
                      value
                    )}
                  </strong>

                </div>

              )
            )}

          </div>

        </div>

      )}

    </div>
  );
}


/* =========================================================
   BOTTLENECK PANEL
   ========================================================= */

function BottleneckPanel({ apiCase }) {

  if (!apiCase?.rule_details) {
    return null;
  }


  const ruleEntries =
    Object.entries(
      apiCase.rule_details
    );


  const triggeredRules =
    ruleEntries.filter(
      ([, rule]) =>
        rule.status === "TRIGGERED"
    );


  const clean =
    triggeredRules.length === 0;


  return (
    <section className="bottleneck-panel">

      <div className="bottleneck-heading">

        <div>

          <div className="section-label">
            BOTTLENECK ANALYSIS
          </div>


          <h3>
            {clean
              ? "No bottlenecks detected"
              : `${triggeredRules.length} bottleneck${triggeredRules.length > 1
                ? "s"
                : ""
              } detected`}
          </h3>

        </div>


        <div
          className={`overall-badge ${clean
            ? "safe"
            : "danger"
            }`}
        >
          {apiCase.overall_result}
        </div>

      </div>


      <div className="rule-list">

        {ruleEntries.map(
          ([ruleKey, rule]) => (

            <RuleCard
              key={ruleKey}
              ruleKey={ruleKey}
              rule={rule}
            />

          )
        )}

      </div>

    </section>
  );
}


/* =========================================================
   GRAPH VIEW
   ========================================================= */

export default function GraphView({
  caseId,
  onBack
}) {

  const containerRef =
    useRef(null);

  const cyRef =
    useRef(null);


  const [selected, setSelected] =
    useState(null);

  const [caseGraph, setCaseGraph] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  /* =======================================================
     LOAD CASE + GRAPH
     ======================================================= */

  useEffect(() => {

    if (!caseId) {
      return;
    }


    setLoading(true);
    setError("");
    setSelected(null);


    Promise.all([
      getCase(caseId),
      getCaseGraph(caseId)
    ])

      .then(
        ([
          caseData,
          graphData
        ]) => {

          setCaseGraph({

            ...makeCaseGraph(
              graphData
            ),

            apiCase:
              caseData,

            apiGraph:
              graphData

          });

        }
      )

      .catch((err) => {

        setError(
          err.message
        );

      })

      .finally(() => {

        setLoading(false);

      });

  }, [caseId]);


  /* =======================================================
     CREATE CYTOSCAPE GRAPH
     ======================================================= */

  useEffect(() => {

    if (
      !containerRef.current ||
      !caseGraph
    ) {
      return;
    }


    const {
      elements,
      positions
    } = makeElements(
      caseGraph.apiGraph || {}
    );


    const cy = cytoscape({

      container:
        containerRef.current,

      elements,


      layout: {

        name: "preset",

        positions: (node) =>
          positions[node.id()]

      },


      style:
        cytoscapeStyle,


      userZoomingEnabled:
        true,

      userPanningEnabled:
        true,

      boxSelectionEnabled:
        false

    });


    requestAnimationFrame(() => {
      cy.resize();
      cy.fit(undefined, 40);
    });


    /* -----------------------------------------------------
       NODE CLICK
       ----------------------------------------------------- */

    cy.on(
      "tap",
      "node",
      (evt) => {

        setSelected(
          evt.target.data()
        );

      }
    );


    /* -----------------------------------------------------
       CLICK EMPTY GRAPH AREA
       ----------------------------------------------------- */

    cy.on(
      "tap",
      (evt) => {

        if (evt.target === cy) {

          setSelected(null);

        }

      }
    );


    cyRef.current = cy;


    /* -----------------------------------------------------
       CLEANUP
       ----------------------------------------------------- */

    return () => {

      cy.destroy();

      cyRef.current = null;

    };

  }, [caseGraph]);


  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {

    return (
      <div>
        Loading case...
      </div>
    );

  }


  /* =======================================================
     ERROR
     ======================================================= */

  if (error) {

    return (

      <div className="app-shell">

        <button
          className="view-btn ghost"
          onClick={onBack}
        >
          &larr; Back to Register
        </button>


        <div className="section-label">
          Unable to load case
        </div>


        <p>
          {error}
        </p>

      </div>

    );

  }


  if (!caseGraph) {
    return null;
  }


  /* =======================================================
     PAGE
     ======================================================= */

  return (

    <div className="app-shell">

      {/* =================================================
          HEADER
          ================================================= */}

      <div className="masthead">

        <div className="masthead-top">

          <div>

            <div className="reg-no">
              CASE FILE VIEW
              &nbsp;·&nbsp;
              RETRIEVED {todayStr()}
            </div>


            <div className="masthead-title">

              <div className="masthead-mark">
                JIG
              </div>


              <div>

                <h1>
                  Judicial Intelligence Graph
                </h1>


                <div className="kicker">
                  — Case Graph —
                </div>

              </div>

            </div>

          </div>


          <button
            className="view-btn ghost"
            onClick={onBack}
          >
            &larr; Back to Register
          </button>

        </div>


        <DemoStamp dataset="B" />

      </div>


      {/* =================================================
          CASE HEADER
          ================================================= */}

      <div className="graph-header">

        <div>

          <h2>
            {caseId}
          </h2>


          <div className="graph-sub">
            FIR &rarr; CASE &rarr; HEARING &rarr; ORDER
          </div>

        </div>

      </div>


      {/* =================================================
          BOTTLENECK ANALYSIS
          ================================================= */}

      <BottleneckPanel
        apiCase={
          caseGraph.apiCase
        }
      />


      {/* =================================================
          CASE TIMELINE
          ================================================= */}

      <CaseTimeline
        caseGraph={caseGraph}
      />


      {/* =================================================
          GRAPH + INFO PANEL
          ================================================= */}

      <div className="graph-panel">

        <div
          className="cy-container"
          ref={containerRef}
        />


        <div className="info-panel">

          <InfoPanel
            selected={selected}
            caseGraph={caseGraph}
          />

        </div>

      </div>

    </div>

  );
}