import { useState } from "react";
import Dashboard from "./components/Dashboard.jsx";
import GraphView from "./components/GraphView.jsx";

/**
 * Dashboard -> Select Case -> Graph
 * (Timeline / Bottleneck screens are later phases, out of scope here.)
 */
export default function App() {
  const [view, setView] = useState("dashboard");
  const [caseId, setCaseId] = useState(null);

  function handleSelectCase(id) {
    if (!id) return;

    setCaseId(id);
    setView("graph");
  }

  if (view === "graph" && caseId) {
    return <GraphView caseId={caseId} onBack={() => setView("dashboard")} />;
  }

  return <Dashboard onSelectCase={handleSelectCase} />;
}
