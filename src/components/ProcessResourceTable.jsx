// src/components/ProcessResourceTable.jsx
import React from "react";

export default function ProcessResourceTable({ processes = [], resources = [] }) {
  return (
    <div
      style={{
        marginTop: 20,
        padding: "14px 16px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        backdropFilter: "blur(6px)",
        color: "#dfe7f1",
        fontSize: 15,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8, color: "#fff" }}>
        Current System State
      </div>

      <div style={{ lineHeight: "1.7" }}>
        <div>
          <strong>Processes:</strong>{" "}
          {processes.length ? (
            <span style={{ color: "#9cebff" }}>
              {processes.map((p, i) => (
                <code
                  key={p}
                  style={{
                    background: "rgba(0, 255, 255, 0.08)",
                    padding: "2px 6px",
                    marginRight: 6,
                    borderRadius: 6,
                    border: "1px solid rgba(126,239,255,0.4)",
                  }}
                >
                  {p}
                </code>
              ))}
            </span>
          ) : (
            <em>(none)</em>
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          <strong>Resources:</strong>{" "}
          {resources.length ? (
            <span style={{ color: "#ffadef" }}>
              {resources.map((r) => (
                <code
                  key={r}
                  style={{
                    background: "rgba(255, 77, 230, 0.08)",
                    padding: "2px 6px",
                    marginRight: 6,
                    borderRadius: 6,
                    border: "1px solid rgba(255,77,230,0.4)",
                  }}
                >
                  {r}
                </code>
              ))}
            </span>
          ) : (
            <em>(none)</em>
          )}
        </div>
      </div>
    </div>
  );
}
