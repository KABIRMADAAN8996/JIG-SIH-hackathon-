import { useEffect, useState } from "react";

import { getCases, extractDocument } from "../api.js";

import DemoStamp from "./DemoStamp.jsx";
import CaseRow from "./CaseRow.jsx";
import HealthyRow from "./HealthyRow.jsx";

import "../styles/dashboard.css";


function todayStr() {
  return new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
    .toUpperCase();
}


function toCaseItem(c) {
  const triggered = [];

  if (c.rules.rule_1 === "TRIGGERED") triggered.push("RULE 1");
  if (c.rules.rule_2 === "TRIGGERED") triggered.push("RULE 2");
  if (c.rules.rule_3 === "TRIGGERED") triggered.push("RULE 3");
  if (c.rules.rule_4 === "TRIGGERED") triggered.push("RULE 4");

  return {
    id: c.case_number,
    case_number: c.case_number,
    fir_number: c.fir_number,
    court: c.court_name,
    status: c.status,
    accused: c.accused,
    complainant: c.complainant,
    overall_result: c.overall_result,
    bottlenecks: triggered,
    rules: c.rules
  };
}


export default function Dashboard({ onSelectCase }) {

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Document extraction states
  const [documentText, setDocumentText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractMessage, setExtractMessage] = useState("");
  const [extractError, setExtractError] = useState("");


  function loadCases() {
    setLoading(true);

    return getCases()
      .then((data) => {
        setCases(data.cases.map(toCaseItem));
        setError("");
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }


  useEffect(() => {
    loadCases();
  }, []);


  async function handleFileChange(event) {

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setExtractMessage("");
    setExtractError("");

    try {
      const text = await file.text();
      setDocumentText(text);
    } catch (err) {
      setExtractError("Unable to read the selected document.");
    }
  }


  async function handleExtract() {

    if (!documentText.trim()) {
      setExtractError("Please select a document or enter document text.");
      return;
    }

    setExtracting(true);
    setExtractMessage("");
    setExtractError("");

    try {

      const result = await extractDocument(documentText);

      if (result.status === "success") {

        setExtractMessage(
          "Document extracted, validated, and imported successfully."
        );

        setDocumentText("");
        setSelectedFile(null);

        // Refresh dashboard so the newly imported case appears.
        await loadCases();

      } else {

        setExtractError(
          result.message || "Document extraction failed."
        );
      }

    } catch (err) {

      let message = err.message;

      // Try to display the backend JSON error cleanly.
      try {
        const parsed = JSON.parse(message);

        if (parsed.error) {
          message = parsed.error;
        }

        if (parsed.details) {
          message += ` ${parsed.details}`;
        }
      } catch {
        // Keep original error message.
      }

      setExtractError(message);

    } finally {
      setExtracting(false);
    }
  }

  const filteredCases = cases.filter((c) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      (c.case_number || "").toLowerCase().includes(query) ||
      (c.fir_number || "").toLowerCase().includes(query) ||
      (c.accused || "").toLowerCase().includes(query) ||
      (c.complainant || "").toLowerCase().includes(query) ||
      (c.court || "").toLowerCase().includes(query) ||
      (c.status || "").toLowerCase().includes(query)
    );
  });

  const attention = filteredCases.filter(
    (c) => c.bottlenecks.length > 0
  );

  const healthy = filteredCases.filter(
    (c) => c.bottlenecks.length === 0
  );


  return (
    <div className="app-shell">

      <div className="masthead">

        <div className="masthead-top">

          <div>

            <div className="reg-no">
              REGISTER VIEW &nbsp;·&nbsp; SESSION {todayStr()}
            </div>

            <div className="masthead-title">

              <div className="masthead-mark">
                JIG
              </div>

              <div>
                <h1>Judicial Intelligence Graph</h1>

                <div className="kicker">
                  — Judge Dashboard —
                </div>
              </div>

            </div>

          </div>


          <div className="masthead-right">
            PRESIDING OFFICER
            <br />
            DISTRICT COURT, G.B. NAGAR
            <br />
            CAUSE LIST: TODAY
          </div>

        </div>


        <DemoStamp dataset="Synthetic Case Lifecycle" />

      </div>


      {/* =====================================================
          DOCUMENT INTAKE
          ===================================================== */}

      <div
        style={{
          marginTop: "28px",
          marginBottom: "32px",
          padding: "24px",
          border: "1px solid #c9c5ba",
          background: "#f7f5ee"
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px"
          }}
        >

          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "22px",
              fontWeight: "bold"
            }}
          >
            DOCUMENT INTAKE
          </div>

          <div
            style={{
              fontSize: "12px",
              letterSpacing: "1px"
            }}
          >
            EXTRACT → VALIDATE → IMPORT
          </div>

        </div>


        <div
          style={{
            fontSize: "14px",
            marginBottom: "16px",
            color: "#555"
          }}
        >
          Upload a .txt case document. JIG will extract the case data,
          validate it, and import valid cases into the judicial graph.

          Required FIR fields:
          FIR Number, Filed Date, Police Station, Complainant, Accused.

          You may also include Case, Hearing, and Order details.
          Missing required fields will cause the document to be rejected.
        </div>


        <input
          type="file"
          accept=".txt,.text"
          onChange={handleFileChange}
          disabled={extracting}
          style={{
            marginBottom: "14px"
          }}
        />


        {selectedFile && (
          <div
            style={{
              fontSize: "13px",
              marginBottom: "12px"
            }}
          >
            Selected: <strong>{selectedFile.name}</strong>
          </div>
        )}


        <textarea
          value={documentText}
          onChange={(e) => setDocumentText(e.target.value)}
          disabled={extracting}
          placeholder={
            "Paste case document text here, or select a .txt file above..."
          }
          rows={8}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            border: "1px solid #aaa",
            background: "#fff",
            fontFamily: "monospace",
            fontSize: "13px",
            resize: "vertical",
            marginBottom: "14px"
          }}
        />


        <button
          onClick={handleExtract}
          disabled={extracting || !documentText.trim()}
          style={{
            padding: "12px 22px",
            background: extracting ? "#777" : "#171717",
            color: "#fff",
            border: "none",
            cursor: extracting ? "wait" : "pointer",
            fontFamily: "inherit",
            fontWeight: "bold",
            letterSpacing: "1px"
          }}
        >
          {extracting
            ? "PROCESSING..."
            : "EXTRACT & IMPORT →"}
        </button>


        {extractMessage && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              border: "1px solid #275c43",
              background: "#edf5ef",
              color: "#275c43",
              fontWeight: "bold"
            }}
          >
            ✓ {extractMessage}
          </div>
        )}


        {extractError && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              border: "1px solid #8a2720",
              background: "#f8eeee",
              color: "#8a2720"
            }}
          >
            ✕ {extractError}
          </div>
        )}

      </div>


      {/* =====================================================
          EXISTING DASHBOARD
          ===================================================== */}

      {loading && (
        <div>Loading cases...</div>
      )}


      {error && (
        <div>
          Unable to load cases: {error}
        </div>
      )}


      {!loading && !error && (
        <>
          <div
            style={{
              marginBottom: "24px",
              padding: "16px",
              border: "1px solid #c9c5ba",
              background: "#f7f5ee"
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Case Number, FIR Number, Court, or Status..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px",
                border: "1px solid #aaa",
                background: "#fff",
                fontSize: "14px"
              }}
            />
          </div>

          <div className="section-label">

            Cases Requiring Attention

            <span className="count">
              {attention.length} ENTR
              {attention.length === 1 ? "Y" : "IES"}
            </span>

          </div>


          <hr className="section-rule" />


          <div className="ledger">

            {attention.map((c, i) => (

              <CaseRow
                key={c.id}
                index={i}
                caseItem={c}
                onSelect={onSelectCase}
              />

            ))}

          </div>


          <div className="section-label">

            Healthy Cases

            <span className="count">
              {healthy.length} ENTR
              {healthy.length === 1 ? "Y" : "IES"}
            </span>

          </div>


          <hr className="section-rule" />


          <div className="ledger">

            {healthy.map((c, i) => (

              <HealthyRow
                key={c.id}
                index={i}
                caseItem={c}
                onSelect={onSelectCase}
              />

            ))}

          </div>

        </>
      )}

    </div>
  );
}