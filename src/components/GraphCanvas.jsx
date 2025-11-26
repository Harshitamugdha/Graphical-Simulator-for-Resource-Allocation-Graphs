// src/components/GraphCanvas.jsx
import React, { useRef, useEffect } from "react";

/*
  GraphCanvas - high-contrast neon edges & draggable nodes
  - Strong visible base stroke to guarantee edge visibility
  - Neon overlays (request / allocation) on top of base
  - Deadlock edges pulse in red
  - Draggable nodes (pointer events)
*/

export default function GraphCanvas({ graph = {}, cycles = [], positions = {}, onPositionChange }) {
  const { processes = [], resources = [], edges = [] } = graph;
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  
  const CANVAS_W = 1200;
  const CANVAS_H = 520;

  // tweak these constants to control visibility
  // in GraphCanvas.jsx near top of file (constants)
const BASE_EDGE_COLOR = "rgba(255,255,255,0.36)";
const BASE_EDGE_WIDTH = 20;
                 // thick base stroke
  const NEON_OVERLAY_STDDEV = 4.4;                  // glow blur for overlays

  // layout fallback positions
  const nodePositions = {};
  const spacing = 160;
  const startX = 100;
  const topY = 120;
  const bottomY = 320;

  processes.forEach((p, i) => {
    const pos = positions[p];
    nodePositions[p] = pos ? pos : { x: startX + i * spacing, y: topY };
  });
  resources.forEach((r, i) => {
    const pos = positions[r];
    nodePositions[r] = pos ? pos : { x: startX + i * spacing, y: bottomY };
  });

  // compute highlighted edges/nodes from cycles
  const highlightedEdges = new Set();
  const highlightedNodes = new Set();
  (cycles || []).forEach(cycle => {
    for (let i = 0; i < cycle.length - 1; i++) {
      highlightedEdges.add(`${cycle[i]}->${cycle[i + 1]}`);
      highlightedNodes.add(cycle[i]);
      highlightedNodes.add(cycle[i + 1]);
    }
  });

  // pointer drag behavior
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function toSVGPoint(e) {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }

    function onMove(e) {
      const d = dragRef.current;
      if (!d) return;
      const loc = toSVGPoint(e);
      const newX = loc.x - d.offsetX;
      const newY = loc.y - d.offsetY;
      const g = svg.querySelector(`[data-node='${d.node}']`);
      if (g) {
        // move visually during drag using transform (does not alter stored position)
        g.setAttribute("transform", `translate(${newX - (nodePositions[d.node]?.x || 0)}, ${newY - (nodePositions[d.node]?.y || 0)})`);
      }
    }

    function onUp(e) {
      const d = dragRef.current;
      if (!d) return;
      const loc = toSVGPoint(e);
      const finalX = Math.round(loc.x - d.offsetX);
      const finalY = Math.round(loc.y - d.offsetY);
      const g = svg.querySelector(`[data-node='${d.node}']`);
      if (g) g.removeAttribute("transform");
      if (typeof onPositionChange === "function") onPositionChange(d.node, finalX, finalY);
      dragRef.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onPositionChange, nodePositions]);

  function handlePointerDown(e, node) {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
    const nodePos = nodePositions[node] || { x: 0, y: 0 };
    dragRef.current = { node, offsetX: loc.x - nodePos.x, offsetY: loc.y - nodePos.y };
  }

  // palette
  const neonPink = "#ff4de6";
  const neonCyan = "#7eefff";
  const neonGreen = "#2ef1b8";
  const neonRed = "#ff4766";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block", borderRadius: 12 }}
    >
      <defs>
        {/* stronger glows */}
        <filter id="glowLarge" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={NEON_OVERLAY_STDDEV} result="b" />
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        <filter id="glowMedium" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.4" result="b" />
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        <linearGradient id="grad-request" x1="0%" x2="100%">
          <stop offset="0%" stopColor={neonPink} />
          <stop offset="100%" stopColor={neonCyan} />
        </linearGradient>

        <linearGradient id="grad-alloc" x1="0%" x2="100%">
          <stop offset="0%" stopColor={neonGreen} />
          <stop offset="100%" stopColor={neonCyan} />
        </linearGradient>

        <style>{`
          .dash { stroke-dasharray: 12 8; stroke-linecap: round; }
          .dash-anim { animation: dashMove 1.4s linear infinite; }
          @keyframes dashMove { from { stroke-dashoffset: 0 } to { stroke-dashoffset: -120 } }
          .pulse { animation: pulseEdge 1s infinite; }
          @keyframes pulseEdge { 0% { opacity: 0.85 } 50% { opacity: 1 } 100% { opacity: 0.85 } }
          .label { font: 700 13px system-ui; fill: #fff; pointer-events: none; }
        `}</style>
      </defs>

      {/* EDGES: base stroke (very visible), then neon overlays */}
      <g id="edges-layer" aria-hidden="true">
        {edges.map(e => {
          const a = nodePositions[e.from];
          const b = nodePositions[e.to];
          if (!a || !b) return null;
          const key = e.id || `${e.from}->${e.to}`;
          const isDead = highlightedEdges.has(`${e.from}->${e.to}`);

          // Strong base stroke to guarantee visibility across browsers/displays
          const base = (
            <line
              key={`${key}-base`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={BASE_EDGE_COLOR}
              strokeWidth={BASE_EDGE_WIDTH}
              strokeLinecap="round"
              strokeOpacity={1}
            />
          );

          if (isDead) {
            return (
              <g key={key}>
                {base}
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={neonRed}
                  strokeWidth={8}
                  strokeLinecap="round"
                  className="pulse"
                  style={{ filter: "url(#glowLarge)" }}
                />
              </g>
            );
          }

          if (e.type === "request") {
            return (
              <g key={key}>
                {base}
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="url(#grad-request)"
                  strokeWidth={6.8}
                  strokeLinecap="round"
                  style={{ filter: "url(#glowMedium)" }}
                />
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={neonPink}
                  strokeWidth={3}
                  className="dash dash-anim"
                  strokeLinecap="round"
                  style={{ filter: "url(#glowMedium)" }}
                />
              </g>
            );
          }

          // allocation edge
          return (
            <g key={key}>
              {base}
              <line
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="url(#grad-alloc)"
                strokeWidth={6.0}
                strokeLinecap="round"
                style={{ filter: "url(#glowMedium)" }}
              />
            </g>
          );
        })}
      </g>

      {/* NODES (on top) */}
      <g id="nodes-layer" aria-hidden="false">
        {processes.map(p => {
          const pos = nodePositions[p];
          if (!pos) return null;
          const hl = highlightedNodes.has(p);
          return (
            <g key={p} data-node={p} onPointerDown={(e) => handlePointerDown(e, p)} style={{ cursor: "grab" }}>
              <circle
                cx={pos.x} cy={pos.y} r={30}
                fill="rgba(255,77,230,0.12)"
                stroke={neonPink}
                strokeWidth={hl ? 4.6 : 3.6}
                style={{ filter: "url(#glowMedium)" }}
              />
              <text x={pos.x} y={pos.y + 6} textAnchor="middle" className="label">{p}</text>
            </g>
          );
        })}

        {resources.map(r => {
          const pos = nodePositions[r];
          if (!pos) return null;
          const hl = highlightedNodes.has(r);
          return (
            <g key={r} data-node={r} onPointerDown={(e) => handlePointerDown(e, r)} style={{ cursor: "grab" }}>
              <rect
                x={pos.x - 36} y={pos.y - 22} width={72} height={44} rx={10}
                fill="rgba(126,239,255,0.08)"
                stroke={neonCyan}
                strokeWidth={hl ? 4.6 : 3.4}
                style={{ filter: "url(#glowMedium)" }}
              />
              <text x={pos.x} y={pos.y + 6} textAnchor="middle" className="label">{r}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
