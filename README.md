# JIG — Judicial Intelligence Graph (Phase 1)


## Run it

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually http://localhost:5173).

## Project structure

```
jig-app/
├─ index.html                     Vite HTML entry
├─ package.json
├─ vite.config.js
└─ src/
   ├─ main.jsx                    React root
   ├─ App.jsx                     Dashboard <-> Graph routing (useState)
   ├─ data/
   │  └─ mockData.js              All fake data: dashboard cases,
   │                              per-case graphs, node colors
   ├─ components/
   │  ├─ Dashboard.jsx            Judge Dashboard screen
   │  ├─ CaseRow.jsx              One "requires attention" row
   │  ├─ HealthyRow.jsx           One "healthy case" row
   │  ├─ DemoStamp.jsx            Synthetic-data stamp (reads dataset field)
   │  ├─ GraphView.jsx            Case graph screen (Cytoscape.js)
   │  ├─ graphElements.js         Builds Cytoscape nodes/edges from mock data
   │  ├─ cytoscapeStyle.js        Cytoscape stylesheet
   │  └─ InfoPanel.jsx            Node detail panel / legend
   └─ styles/
      ├─ index.css                Design tokens + shared masthead styles
      ├─ dashboard.css            Dashboard-only styles
      └─ graph.css                Graph-view-only styles
```

## Locked schema

```
FIR --LEADS_TO--> CASE --HAS--> HEARING --PRODUCES--> ORDER
```

Only these four node types and three relationships are used anywhere
in the app. No Person, Judge, Evidence, or Law nodes.

## Notes

- `src/data/mockData.js` is the only file you need to touch to change
  which cases appear, or to give a case a different graph shape.
- The `DEMO DATA` stamp is controlled by `DASHBOARD_DATA.dataset` —
  set it to `"B"` to show it, anything else to hide it.
- Clicking a case on the dashboard navigates to its graph. Clicking a
  node in the graph shows its details in the right-hand panel.
