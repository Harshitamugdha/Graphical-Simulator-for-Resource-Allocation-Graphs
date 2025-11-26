// src/components/DeadlockAlert.jsx
import React from "react";

/*
 Props:
  result: { deadlocked: boolean, cycles: [...] }
  graph: { processes, resources, edges }
  onResetGraph: function
*/
export default function DeadlockAlert({ result, graph = { edges: [] }, onResetGraph }) {
  if (!result) return null;

  const hasAllocation = (graph.edges || []).some(e => e.type === "allocation");

  if (result.deadlocked) {
    return (
      <div className="alert alert-danger" role="alert" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <strong>⚠️ Deadlock detected</strong>
            <div style={{ marginTop: 8 }}>
              {(result.cycles || []).map((c, idx) => (
                <div key={idx} style={{ fontFamily: "monospace", marginTop: 6 }}>
                  Cycle {idx + 1}: {c.join(" → ")}
                </div>
              ))}
              <div style={{ marginTop: 10, color: "#6b1a1a" }}>
                The system currently has processes waiting on each other. Break the cycle by deleting or reassigning edges.
              </div>
            </div>
          </div>

          <div style={{ marginLeft: 12 }}>
            {typeof onResetGraph === "function" ? (
              <button onClick={onResetGraph}>Reset Graph</button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // only display the "No deadlock" success if allocations exist (so it's meaningful)
  if (!hasAllocation) return null;

  return (
    <div className="alert alert-success" role="status" style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <strong>✅ No deadlock detected</strong>
        <div style={{ marginTop: 8, color: "#1b5e20" }}>
          There are no cycles involving two or more processes. Allocations exist and no circular waits were found.
        </div>
      </div>

      {typeof onResetGraph === "function" && (
        <div>
          <button onClick={onResetGraph}>Reset Graph</button>
        </div>
      )}
    </div>
  );
}
