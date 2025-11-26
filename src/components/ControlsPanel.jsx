// src/components/ControlsPanel.jsx
import React, { useState, useEffect } from "react";

export default function ControlsPanel({
  processes = [],
  resources = [],
  onAddProcess,
  onAddResource,
  onCreateEdge,
  onResetLayout,
  onResetGraph
}) {
  // keep local selection state; default to empty string when no items
  const [proc, setProc] = useState(processes[0] || "");
  const [res, setRes] = useState(resources[0] || "");
  const [type, setType] = useState("request");

  // keep selects in sync when lists change
  useEffect(() => {
    setProc(processes[0] || "");
  }, [processes]);

  useEffect(() => {
    setRes(resources[0] || "");
  }, [resources]);

  function handleCreate() {
    // validate
    const from = type === "request" ? proc : res;
    const to = type === "request" ? res : proc;
    if (!from || !to) {
      // small early guard; in your app you can show a toast
      return;
    }
    if (typeof onCreateEdge === "function") {
      onCreateEdge({ from, to, type });
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        marginBottom: 10,
        flexWrap: "wrap"
      }}>
        <button className="btn-primary" onClick={onAddProcess}>Add Process</button>
        <button className="btn-primary" onClick={onAddResource}>Add Resource</button>
        <button onClick={onResetLayout}>Reset Layout</button>
        <button onClick={onResetGraph}>Reset Graph</button>
      </div>

      <small>Select a process and resource, then choose edge type and click "Create Edge".</small>

      <div style={{
        marginTop: 8,
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        <label>
          Process
          <select
            value={proc}
            onChange={e => setProc(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            {/* placeholder when none */}
            {processes.length === 0 && <option value="">(none)</option>}
            {processes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>

        <label>
          Resource
          <select
            value={res}
            onChange={e => setRes(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            {resources.length === 0 && <option value="">(none)</option>}
            {resources.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>

        <label style={{ marginLeft: 8 }}>
          <input
            type="radio"
            name="etype"
            value="request"
            checked={type === "request"}
            onChange={() => setType("request")}
          /> Request (P → R)
        </label>

        <label>
          <input
            type="radio"
            name="etype"
            value="allocation"
            checked={type === "allocation"}
            onChange={() => setType("allocation")}
          /> Allocation (R → P)
        </label>

        <button onClick={handleCreate}>Create Edge</button>
      </div>
    </div>
  );
}
