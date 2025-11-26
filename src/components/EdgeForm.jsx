// src/components/EdgeForm.jsx
import React, { useState, useEffect, useRef } from "react";

/*
 EdgeForm
 Props:
  - processes: array of process ids (strings)
  - resources: array of resource ids (strings)
  - onCreateEdge: function({ from, to, type })  // required
*/
export default function EdgeForm({ processes = [], resources = [], onCreateEdge }) {
  const [proc, setProc] = useState("");
  const [res, setRes] = useState("");
  const [edgeType, setEdgeType] = useState("request");
  const [error, setError] = useState("");

  // unique name for radio group so multiple forms won't interfere
  const radioName = useRef("etype_" + Math.random().toString(36).slice(2, 9));

  // Initialize or repair selections when the lists change.
  useEffect(() => {
    // if current selected proc no longer exists, pick first or empty
    if (!proc || !processes.includes(proc)) {
      setProc(processes.length ? processes[0] : "");
    }
    // if current selected res no longer exists, pick first or empty
    if (!res || !resources.includes(res)) {
      setRes(resources.length ? resources[0] : "");
    }
  // only re-run when the lists themselves change
  }, [processes, resources]);

  function submit(e) {
    e.preventDefault();
    setError("");

    // basic validation
    if (!proc) {
      setError("Please choose a process.");
      return;
    }
    if (!res) {
      setError("Please choose a resource.");
      return;
    }
    if (typeof onCreateEdge !== "function") {
      setError("Create handler is not available.");
      return;
    }

    // build payload
    const payload = {
      from: edgeType === "request" ? proc : res,
      to: edgeType === "request" ? res : proc,
      type: edgeType
    };

    // call the callback (caller can handle duplicates)
    try {
      onCreateEdge(payload);
    } catch (err) {
      // safety: if handler throws, show message
      setError(err?.message || "Unable to create edge.");
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13 }}>Process</span>
        <select value={proc} onChange={(e) => setProc(e.target.value)}>
          <option value="">{processes.length ? "— select —" : "(no processes)"}</option>
          {processes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13 }}>Resource</span>
        <select value={res} onChange={(e) => setRes(e.target.value)}>
          <option value="">{resources.length ? "— select —" : "(no resources)"}</option>
          {resources.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="radio"
            name={radioName.current}
            value="request"
            checked={edgeType === "request"}
            onChange={() => setEdgeType("request")}
          />
          <small>Request (P → R)</small>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="radio"
            name={radioName.current}
            value="allocation"
            checked={edgeType === "allocation"}
            onChange={() => setEdgeType("allocation")}
          />
          <small>Allocation (R → P)</small>
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="submit" disabled={!proc || !res} style={{ padding: "8px 12px" }}>
          Create Edge
        </button>
        {error && <div style={{ color: "#ffb3b3", fontSize: 13 }}>{error}</div>}
      </div>
    </form>
  );
}
