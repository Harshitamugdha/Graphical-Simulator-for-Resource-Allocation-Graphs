// src/App.jsx
import React, { useState, useMemo, useCallback, useRef } from "react";
import GraphCanvas from "./components/GraphCanvas";
import "./styles/global.css";
import detectDirectedCycle from "./utils/rag"; // rag.js exports default (and named) - accept either

export default function App() {
  const [graph, setGraph] = useState({
    processes: [],
    resources: [],
    edges: []
  });

  const [positions, setPositions] = useState({});
  const [edgeType, setEdgeType] = useState("request");

  // stable edge id counter (keeps IDs unique across deletes)
  const edgeCounter = useRef(1);

  // -------------------------------
  // Add Process / Resource
  // -------------------------------
  const addProcess = () => {
    const p = "P" + (graph.processes.length + 1);
    setGraph(prev => ({
      ...prev,
      processes: [...prev.processes, p]
    }));
  };

  const addResource = () => {
    const r = "R" + (graph.resources.length + 1);
    setGraph(prev => ({
      ...prev,
      resources: [...prev.resources, r]
    }));
  };

  // -------------------------------
  // Create Edge (prevents duplicates)
  // -------------------------------
  const createEdge = () => {
    const procSel = document.getElementById("processSel");
    const resSel = document.getElementById("resourceSel");
    if (!procSel || !resSel) return;

    const proc = procSel.value;
    const res = resSel.value;
    if (!proc || !res) return;

    let from, to;
    if (edgeType === "request") {
      from = proc;
      to = res;
    } else {
      from = res;
      to = proc;
    }

    // prevent exact duplicate (same from,to,type)
    const exists = graph.edges.some(e => e.from === from && e.to === to && e.type === edgeType);
    if (exists) {
      // you could show a toast instead — for now just ignore
      return;
    }

    const id = "e" + edgeCounter.current++;
    const newEdge = { id, from, to, type: edgeType };

    setGraph(prev => ({
      ...prev,
      edges: [...prev.edges, newEdge]
    }));
  };

  // -------------------------------
  // Delete Edge
  // -------------------------------
  const deleteEdge = id => {
    setGraph(prev => ({
      ...prev,
      edges: prev.edges.filter(e => e.id !== id)
    }));
  };

  // -------------------------------
  // Drag Position Update
  // -------------------------------
  const onPositionChange = useCallback((id, x, y) => {
    setPositions(p => ({
      ...p,
      [id]: { x, y }
    }));
  }, []);

  // -------------------------------
  // Reset Graph
  // -------------------------------
  const resetGraph = () => {
    setGraph({
      processes: [],
      resources: [],
      edges: []
    });
    setPositions({});
    edgeCounter.current = 1;
  };

  // -------------------------------
  // Reset Layout (smart)
  // -------------------------------
  const resetLayoutSmart = () => {
    const canvasW = 1200;
    const pCount = graph.processes.length;
    const rCount = graph.resources.length;
    const newPos = {};

    graph.processes.forEach((p, i) => {
      const x = Math.round((canvasW / (pCount + 1)) * (i + 1));
      newPos[p] = { x, y: 120 };
    });

    graph.resources.forEach((r, i) => {
      const x = Math.round((canvasW / (rCount + 1)) * (i + 1));
      newPos[r] = { x, y: 320 };
    });

    setPositions(newPos);
  };

  // -------------------------------
  // Reset Layout (grid)
  // -------------------------------
  const resetLayoutGrid = () => {
    const spacing = 140;
    const newPos = {};

    graph.processes.forEach((p, i) => {
      newPos[p] = { x: 100 + i * spacing, y: 120 };
    });

    graph.resources.forEach((r, i) => {
      newPos[r] = { x: 100 + i * spacing, y: 320 };
    });

    setPositions(newPos);
  };

  // -------------------------------
  // DEADLOCK RESOLUTION (uses cyclesEdges if available)
  // -------------------------------
  function resolveDeadlock() {
    const nodesAll = [...graph.processes, ...graph.resources];
    const result = detectDirectedCycle(graph.edges, nodesAll);

    if (!result || !result.deadlocked) return;

    // If rag.js produced cyclesEdges (ids), prefer removing by id
    if (Array.isArray(result.cyclesEdges) && result.cyclesEdges.length > 0) {
      const firstCycleEdgeIds = result.cyclesEdges[0]; // array of ids/keys
      // prefer to remove an edge id that is present in graph.edges
      let chosenId = null;
      for (const idOrKey of firstCycleEdgeIds) {
        // if id is actual id present, remove it
        if (graph.edges.some(e => String(e.id) === String(idOrKey))) {
          chosenId = idOrKey;
          break;
        }
      }
      // fallback to first available idOrKey
      if (!chosenId && firstCycleEdgeIds.length) chosenId = firstCycleEdgeIds[0];

      if (chosenId) {
        // if chosenId is a string like "from->to" that isn't an edge id, attempt match
        const isIdPresent = graph.edges.some(e => String(e.id) === String(chosenId));
        if (isIdPresent) {
          deleteEdge(chosenId);
          return;
        } else {
          // attempt fallback removal by matching from->to key
          const key = String(chosenId);
          const [from, to] = key.split("->");
          if (from && to) {
            const match = graph.edges.find(e => String(e.from) === from && String(e.to) === to);
            if (match) deleteEdge(match.id);
            return;
          }
        }
      }
    }

    // If cyclesEdges not available, fall back to removing a request edge in the first cycle (old behavior)
    if (Array.isArray(result.cycles) && result.cycles.length > 0) {
      const cycle = result.cycles[0];
      const pairs = [];
      for (let i = 0; i < cycle.length - 1; i++) pairs.push({ from: cycle[i], to: cycle[i + 1] });

      // prefer removing request
      for (const pair of pairs) {
        const match = graph.edges.find(e => e.from === pair.from && e.to === pair.to && e.type === "request");
        if (match) {
          deleteEdge(match.id);
          return;
        }
      }
      // else allocation
      for (const pair of pairs) {
        const match = graph.edges.find(e => e.from === pair.from && e.to === pair.to && e.type === "allocation");
        if (match) {
          deleteEdge(match.id);
          return;
        }
      }
      // fallback: remove any matching edge
      for (const pair of pairs) {
        const match = graph.edges.find(e => e.from === pair.from && e.to === pair.to);
        if (match) {
          deleteEdge(match.id);
          return;
        }
      }
    }
  }

  // -------------------------------
  // Deadlock Detection
  // -------------------------------
  const nodesAll = useMemo(() => [...graph.processes, ...graph.resources], [graph.processes, graph.resources]);

  const deadlockResult = useMemo(() => detectDirectedCycle(graph.edges, nodesAll), [graph.edges, nodesAll]);

  const hasAnyEdges = graph.edges.length > 0;
  const hasAnyAllocation = graph.edges.some(e => e.type === "allocation");

  // show "No deadlock detected" only when allocations exist (meaningful)
  const showNoDeadlock = !deadlockResult.deadlocked && hasAnyAllocation;

  // -------------------------------
  // RENDER
  // -------------------------------
  return (
    <div className="app-shell">
      <div className="container">
        <h1>Resource Allocation Graph Simulator</h1>

        {/* --- Controls --- */}
        <div className="controls" style={{ marginBottom: 12 }}>
          <button onClick={addProcess}>Add Process</button>
          <button onClick={addResource}>Add Resource</button>
          <button onClick={resetLayoutSmart}>Reset Layout</button>
          <button onClick={resetGraph}>Reset Graph</button>

          {/* NEW BUTTON: Resolve Deadlock */}
          <button
            onClick={resolveDeadlock}
            style={{
              background:
                "linear-gradient(90deg, rgba(255,75,110,0.15), rgba(255,45,90,0.10))",
              borderImage:
                "linear-gradient(90deg, #ff4b6e, #ff1a4d) 1",
              color: "#ff4b6e",
              fontWeight: "700"
            }}
          >
            Resolve Deadlock
          </button>
        </div>

        {/* --- Selections --- */}
        <div style={{ marginBottom: 8, color: "var(--muted)", fontSize: 14 }}>
          Select a process and resource, then choose edge type and click Create Edge.
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          <div className="group">
            <label>Process&nbsp;</label>
            <select id="processSel" style={{ minWidth: 80 }}>
              {graph.processes.length === 0 ? (
                <option value="">—</option>
              ) : (
                graph.processes.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))
              )}
            </select>
          </div>

          <div className="group">
            <label>Resource&nbsp;</label>
            <select id="resourceSel" style={{ minWidth: 80 }}>
              {graph.resources.length === 0 ? (
                <option value="">—</option>
              ) : (
                graph.resources.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))
              )}
            </select>
          </div>

          <div className="group">
            <label>
              <input
                type="radio"
                name="etype"
                value="request"
                checked={edgeType === "request"}
                onChange={() => setEdgeType("request")}
              />{" "}
              Request (P → R)
            </label>

            <label style={{ marginLeft: 8 }}>
              <input
                type="radio"
                name="etype"
                value="allocation"
                checked={edgeType === "allocation"}
                onChange={() => setEdgeType("allocation")}
              />{" "}
              Allocation (R → P)
            </label>
          </div>

          <button className="btn-primary" onClick={createEdge}>
            Create Edge
          </button>
        </div>

        {/* --- Current State --- */}
        <div style={{ marginTop: 6, marginBottom: 6, fontSize: 14 }}>
          <strong>Current System State</strong>
          <div style={{ marginTop: 8, color: "var(--muted)" }}>
            <div>
              Processes:{" "}
              {graph.processes.length
                ? graph.processes.join(", ")
                : <em>(none)</em>}
            </div>
            <div>
              Resources:{" "}
              {graph.resources.length
                ? graph.resources.join(", ")
                : <em>(none)</em>}
            </div>
          </div>
        </div>

        {/* --- Graph Canvas --- */}
        <div className="canvas-wrap">
          <div className="canvas-inner">
            <GraphCanvas
              graph={graph}
              positions={positions}
              onPositionChange={onPositionChange}
              cycles={deadlockResult.cycles}
            />
          </div>
        </div>

        {/* --- Deadlock Alerts --- */}
        <div style={{ marginTop: 12 }}>
          {deadlockResult.deadlocked ? (
            <div className="alert alert-danger">
              <strong>⚠ Deadlock detected</strong>
              {deadlockResult.cycles.map((c, i) => (
                <div key={i} style={{ fontSize: 13, marginTop: 6 }}>
                  Cycle {i + 1}: {c.join(" → ")}
                </div>
              ))}
            </div>
          ) : (
            showNoDeadlock && (
              <div className="alert alert-success">
                <strong>✓ No deadlock detected</strong>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.6)"
                  }}
                >
                  There are no cycles involving two or more processes.
                </div>
              </div>
            )
          )}
        </div>

        {/* --- Edge List --- */}
        <div style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 10 }}>Edges</h3>

          {graph.edges.length === 0 ? (
            <div style={{ color: "var(--muted)" }}>No edges</div>
          ) : (
            <ul>
              {graph.edges.map(e => (
                <li key={e.id}>
                  <strong>{e.id}</strong>: {e.from} → {e.to} ({e.type})
                  <button
                    onClick={() => deleteEdge(e.id)}
                    style={{ marginLeft: 10 }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
            <button onClick={resetLayoutSmart}>Reset Layout (smart)</button>
            <button onClick={resetLayoutGrid}>Reset Layout (grid)</button>
          </div>
        </div>
      </div>
    </div>
  );
}
