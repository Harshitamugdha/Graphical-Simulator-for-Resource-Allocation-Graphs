// src/utils/rag.js
// detectDirectedCycle(edges, nodes)
// Returns:
//   { deadlocked: boolean,
//     cycles: [closedNodeArray],             // same as before (e.g. ['P1','R1','P2','R2','P1'])
//     cyclesEdges: [ [edgeIdOrKey,...] ]    // parallel array with edge identifiers for each cycle
//   }
//
// Notes:
//  - ignores trivial PRP cycles that involve only a single distinct process
//  - cycles are normalized (canonical rotation) and deduplicated
//  - edges may include an `id` property; when present cyclesEdges contains those ids,
//    otherwise it contains a fallback string "from->to" for that edge.

export function detectDirectedCycle(edges = [], nodes = []) {
  if (!Array.isArray(edges)) edges = [];
  if (!Array.isArray(nodes)) nodes = [];

  // build adjacency and also quick lookup of edges by from->to
  const adj = Object.create(null);
  const edgeMap = Object.create(null); // key -> array of edge objects (preserve duplicates)
  for (const e of edges) {
    if (!e || typeof e.from === "undefined") continue;
    const from = String(e.from);
    const to = String(e.to);
    if (!adj[from]) adj[from] = [];
    adj[from].push(to);

    const key = `${from}->${to}`;
    if (!edgeMap[key]) edgeMap[key] = [];
    edgeMap[key].push(e);
  }

  const visited = new Set();
  const onStack = new Set();
  const path = [];
  const cycles = [];       // array of normalized closed node arrays
  const cyclesEdges = [];  // array of arrays of edge identifiers corresponding to nodes in cycles

  function addCycleIfValid(rawClosedCycle) {
    // rawClosedCycle is closed (first === last)
    if (!Array.isArray(rawClosedCycle) || rawClosedCycle.length < 2) return;

    // collect distinct processes in core (strings starting with 'P')
    const core = rawClosedCycle.slice(0, rawClosedCycle.length - 1).map(x => String(x));
    const procSet = new Set(core.filter(n => n.startsWith("P")));
    if (procSet.size <= 1) return; // ignore trivial PRP cycles

    const normalized = normalizeCycle(rawClosedCycle);

    // dedupe: if normalized already present, skip
    if (cycles.some(c => cyclesEqual(c, normalized))) return;

    // find corresponding edge ids/keys for the normalized cycle
    const edgeIds = [];
    for (let i = 0; i < normalized.length - 1; i++) {
      const a = String(normalized[i]);
      const b = String(normalized[i + 1]);
      const key = `${a}->${b}`;
      const matches = edgeMap[key] || [];
      if (matches.length > 0) {
        // pick first match's id if exists else fallback to key
        const id = typeof matches[0].id !== "undefined" ? matches[0].id : key;
        edgeIds.push(id);
      } else {
        // no exact edge object (shouldn't happen normally) -> fallback to key
        edgeIds.push(key);
      }
    }

    cycles.push(normalized);
    cyclesEdges.push(edgeIds);
  }

  function dfs(u) {
    visited.add(u);
    onStack.add(u);
    path.push(u);

    const nbrs = adj[u] || [];
    for (const v of nbrs) {
      if (!visited.has(v)) {
        dfs(v);
      } else if (onStack.has(v)) {
        const start = path.indexOf(v);
        if (start !== -1) {
          const raw = path.slice(start).concat(v); // closed cycle
          addCycleIfValid(raw);
        }
      }
    }

    path.pop();
    onStack.delete(u);
  }

  // deterministic traversal order: use provided nodes list
  for (const n of nodes) {
    const key = String(n);
    if (!visited.has(key)) dfs(key);
  }

  return { deadlocked: cycles.length > 0, cycles, cyclesEdges };
}


// ---------- helpers ----------

function normalizeCycle(closedCycle) {
  // closedCycle: first === last
  const core = closedCycle.slice(0, closedCycle.length - 1).map(x => String(x));
  if (core.length === 0) return closedCycle.slice();

  let best = null;
  for (let i = 0; i < core.length; i++) {
    const rot = core.slice(i).concat(core.slice(0, i));
    const key = rot.join(",");
    if (!best || key < best.key) best = { key, rot };
  }
  return best.rot.concat(best.rot[0]);
}

function cyclesEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (String(a[i]) !== String(b[i])) return false;
  return true;
}

// default export
export default detectDirectedCycle;
