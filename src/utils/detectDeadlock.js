// src/utils/detectDeadlock.js
/**
 * detectDirectedCycle(edges, nodes)
 * - edges: array of { id?, from: string, to: string, type? }
 * - nodes: array of node ids (strings) to ensure deterministic DFS order
 *
 * Returns: { deadlocked: boolean, cycles: Array<closedCycleArray> }
 * Each closedCycleArray is like ['P1','R1','P2','R2','P1'] (first === last).
 *
 * Behavior:
 *  - ignores trivial PRP cycles that involve only a single distinct process
 *  - normalizes cycles (lexicographically smallest rotation) and deduplicates
 */

export function detectDirectedCycle(edges = [], nodes = []) {
  // defensive: ensure inputs are arrays
  if (!Array.isArray(edges)) edges = [];
  if (!Array.isArray(nodes)) nodes = [];

  // build adjacency list
  const adj = Object.create(null);
  for (const e of edges) {
    if (!e || typeof e.from === "undefined") continue;
    const from = String(e.from);
    const to = String(e.to);
    if (!adj[from]) adj[from] = [];
    adj[from].push(to);
  }

  const visited = new Set();
  const onStack = new Set();
  const path = [];
  const cycles = [];

  function addCycleIfValid(rawClosedCycle) {
    // rawClosedCycle is closed (first === last)
    if (!Array.isArray(rawClosedCycle) || rawClosedCycle.length < 2) return;

    // collect distinct processes in the cycle (strings starting with 'P')
    const core = rawClosedCycle.slice(0, rawClosedCycle.length - 1);
    const procSet = new Set(core.filter(n => String(n).startsWith("P")));
    if (procSet.size <= 1) return; // ignore trivial PRP cycles

    const normalized = normalizeCycle(rawClosedCycle);
    // dedupe
    if (!cycles.some(c => cyclesEqual(c, normalized))) cycles.push(normalized);
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

  // run DFS in order of provided nodes for determinism
  for (const n of nodes) {
    if (!visited.has(n)) dfs(n);
  }

  return { deadlocked: cycles.length > 0, cycles };
}


// ---------- helpers ----------

function normalizeCycle(closedCycle) {
  // closedCycle: first === last
  const core = closedCycle.slice(0, closedCycle.length - 1);
  if (core.length === 0) return closedCycle.slice(); // degenerate

  // find lexicographically smallest rotation (canonical)
  let best = null;
  for (let i = 0; i < core.length; i++) {
    const rot = core.slice(i).concat(core.slice(0, i));
    const key = rot.join(",");
    if (!best || key < best.key) best = { key, rot };
  }
  // return closed canonical cycle
  return best.rot.concat(best.rot[0]);
}

function cyclesEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// default export for convenience
export default detectDirectedCycle;
