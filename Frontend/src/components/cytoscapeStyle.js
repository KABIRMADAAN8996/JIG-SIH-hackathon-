import { NODE_COLORS } from "../data/mockData.js";

/**
 * Cytoscape stylesheet — rectangular double-bordered nodes and
 * right-angle "taxi" connectors, to read like a flowchart in a
 * government file rather than a smooth SaaS graph.
 */
export const cytoscapeStyle = [
  {
    selector: "node",
    style: {
      shape: "rectangle",
      width: 154,
      height: 58,
      "background-color": (ele) => {
        const t = ele.data("ntype");
        return t === "MISSING" ? "#EDEAE0" : NODE_COLORS[t];
      },
      "border-width": 4,
      "border-color": "#17181A",
      "border-opacity": 1,
      label: (ele) => ele.data("label") + "\n" + ele.data("sublabel"),
      "text-wrap": "wrap",
      "text-valign": "center",
      "text-halign": "center",
      color: "#fff",
      "font-family": "Courier Prime, Courier New, monospace",
      "font-size": 12,
      "font-weight": 700,
      "text-outline-width": 0,
      "line-height": 1.5
    }
  },
  {
    selector: 'node[ntype = "MISSING"]',
    style: {
      "background-color": "#EDEAE0",
      color: "#6B6858",
      "border-width": 2,
      "border-color": "#8C8875",
      "border-style": "dashed"
    }
  },
  {
    selector: "node:selected",
    style: {
      "border-width": 5,
      "border-color": "#7A2018"
    }
  },
  {
    selector: "edge",
    style: {
      width: 2,
      "line-color": "#17181A",
      "target-arrow-color": "#17181A",
      "target-arrow-shape": "triangle",
      "arrow-scale": 1.1,
      "curve-style": "taxi",
      "taxi-direction": "vertical",
      "taxi-turn": 20,
      "taxi-turn-min-distance": 10,
      label: "data(label)",
      "font-family": "Courier Prime, Courier New, monospace",
      "font-size": 10,
      "font-weight": 700,
      color: "#17181A",
      "text-background-color": "#F3F2EA",
      "text-background-opacity": 1,
      "text-background-padding": 4,
      "text-border-width": 1,
      "text-border-color": "#17181A",
      "text-border-opacity": 1
    }
  }
];
