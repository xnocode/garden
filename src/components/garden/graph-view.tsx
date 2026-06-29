"use client";

/**
 * GraphView — an interactive, self-contained force-directed knowledge graph
 * for a Quartz / Obsidian-style digital garden.
 *
 * Renders notes as nodes and wikilinks as edges on an HTML <canvas>. Implements
 * a tiny custom force simulation (no d3, no graph libs): Coulomb-like repulsion
 * between every pair of nodes, Hookean spring attraction along edges, and a
 * soft centering force. Supports pan, zoom-toward-cursor, node drag, hover
 * highlighting, click-to-open, and double-click-to-reset.
 *
 * The component is intentionally framework-light: all per-frame state lives in
 * refs so React never re-renders during animation. Only ephemeral UI (the hint
 * overlay) uses React state.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GraphViewProps {
  nodes: { id: string; title: string; tags: string[]; folder: string | null }[];
  edges: { source: string; target: string }[];
  currentSlug?: string | null; // highlight this node (matches a node's `id`)
  height?: number; // default 520
  className?: string;
  onSelect?: (slug: string) => void; // navigate on click
}

interface SimNode {
  id: string;
  title: string;
  tags: string[];
  folder: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Pinned position (set while dragging a node); null = free. */
  fx: number | null;
  fy: number | null;
  degree: number;
}

/**
 * Hardcoded darkest-theme palette (matches globals.css tokens). Typed as a
 * string map so palette values can be freely reassigned to fill variables.
 */
const PALETTE: Record<string, string> = {
  node: "#84a59d", // sage green — default node
  nodeDim: "#5a6b66", // dimmer for orphan (zero-degree) nodes
  current: "#e8b86d", // warm amber — the current note
  edge: "rgba(132,165,157,0.18)",
  edgeBright: "rgba(132,165,157,0.5)",
  label: "#d8d8db",
  hoverRing: "rgba(232,184,109,0.75)",
  currentRing: "rgba(232,184,109,0.45)",
  labelBg: "rgba(10,10,12,0.78)",
};

// ---- Simulation tuning ----
const REST_LENGTH = 90; // preferred edge length (world px)
const REPULSION = 2200; // Coulomb-like constant (k / d^2)
const SPRING_K = 0.022; // spring stiffness along edges
const CENTERING = 0.012; // pull toward canvas center
const DAMPING = 0.85; // velocity damping per frame (per spec)
const MAX_VELOCITY = 18; // guard against explosions on overlap
const SETTLE_FRAMES = 300; // ~5s @ 60fps, then sim idles
const WAKE_FRAMES = 60; // brief re-settle window after an interaction

// ---- Interaction tuning ----
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;
const HIT_PADDING = 6; // extra px around a node for hit-testing
const CLICK_THRESHOLD_PX = 4; // movement below this counts as a click

// ---- Rendering tuning ----
const MAX_LABEL_CHARS = 18;
const LABEL_FONT =
  "11px ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

export function GraphView({
  nodes,
  edges,
  currentSlug = null,
  height = 520,
  className,
  onSelect,
}: GraphViewProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Keep latest prop values reachable from inside the mount-once effect.
  const onSelectRef = React.useRef(onSelect);
  const currentSlugRef = React.useRef(currentSlug);
  React.useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  React.useEffect(() => {
    currentSlugRef.current = currentSlug;
  }, [currentSlug]);

  /**
   * All mutable per-frame state. Stored in a single ref object so the
   * animation loop and event handlers can read/write without triggering
   * React re-renders.
   */
  const S = React.useRef({
    simNodes: [] as SimNode[],
    edgeIndexes: [] as Array<[number, number]>,
    neighborMap: new Map<number, Set<number>>(),
    idToIndex: new Map<string, number>(),

    // View transform
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0,
    dpr: 1,

    // Sim lifecycle
    frame: 0,
    running: true,

    // Interaction
    hoveredIndex: -1,
    mode: "idle" as "idle" | "pan" | "drag",
    dragIndex: -1,
    downScreenX: 0,
    downScreenY: 0,
    lastScreenX: 0,
    lastScreenY: 0,
    dragMoved: false,
  });

  const [hintVisible, setHintVisible] = React.useState(true);
  // Flips true once the canvas has been measured, so the layout effect can
  // position nodes using the real dimensions (not the 0-width fallback).
  const [sized, setSized] = React.useState(false);

  /** Rebuild the simulation graph whenever the input data changes. */
  React.useEffect(() => {
    const st = S.current;
    const idToIndex = new Map<string, number>();
    const simNodes: SimNode[] = nodes.map((n, i) => {
      idToIndex.set(n.id, i);
      return {
        id: n.id,
        title: n.title,
        tags: n.tags,
        folder: n.folder,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
        degree: 0,
      };
    });

    const neighborMap = new Map<number, Set<number>>();
    for (let i = 0; i < simNodes.length; i++) neighborMap.set(i, new Set());
    const edgeIndexes: Array<[number, number]> = [];
    for (const e of edges) {
      const s = idToIndex.get(e.source);
      const t = idToIndex.get(e.target);
      if (s === undefined || t === undefined || s === t) continue;
      edgeIndexes.push([s, t]);
      neighborMap.get(s)!.add(t);
      neighborMap.get(t)!.add(s);
    }
    for (const [s, t] of edgeIndexes) {
      simNodes[s].degree++;
      simNodes[t].degree++;
    }

    // Initial layout: place nodes on a circle around the canvas center with
    // a random radial perturbation so the sim has somewhere to start.
    const cx = (st.width || 800) / 2;
    const cy = (st.height || height) / 2;
    const baseR = Math.min(cx, cy) * 0.62 || 180;
    const n = simNodes.length;
    simNodes.forEach((node, i) => {
      const angle = n > 1 ? (i / n) * Math.PI * 2 : 0;
      const r = baseR * (0.7 + Math.random() * 0.35);
      node.x = cx + Math.cos(angle) * r + (Math.random() - 0.5) * 28;
      node.y = cy + Math.sin(angle) * r + (Math.random() - 0.5) * 28;
    });

    st.simNodes = simNodes;
    st.edgeIndexes = edgeIndexes;
    st.neighborMap = neighborMap;
    st.idToIndex = idToIndex;
    st.frame = 0;
    st.running = true;
  }, [nodes, edges, height, sized]);

  /** Mount-once effect: sizing, animation loop, all canvas listeners. */
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const st = S.current;

    // ---------------- Sizing & DPR ----------------
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;
      st.width = w;
      st.height = h;
      st.dpr = dpr;
      // Only set the drawing buffer; the canvas display size is handled by
      // CSS (w-full h-full). Setting canvas.style.width in pixels would
      // create a feedback loop with the grid item's min-width:auto.
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      // Once we have real dimensions, flip `sized` so the layout effect
      // re-positions nodes around the true canvas center.
      setSized((prev) => prev || true);
    };
    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(container);

    // ---------------- Helpers ----------------
    const screenToWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return { x: (x - st.offsetX) / st.scale, y: (y - st.offsetY) / st.scale };
    };

    const nodeRadius = (node: SimNode) => {
      const base = Math.min(14, 4 + node.degree * 1.6);
      const isCurrent = currentSlugRef.current === node.id;
      return isCurrent ? base + 2 : base;
    };

    /** Return the index of the topmost node under a world point, or -1. */
    const findNodeAt = (wx: number, wy: number) => {
      let best = -1;
      let bestD2 = Infinity;
      for (let i = 0; i < st.simNodes.length; i++) {
        const node = st.simNodes[i];
        const dx = wx - node.x;
        const dy = wy - node.y;
        const d2 = dx * dx + dy * dy;
        const r = nodeRadius(node) + HIT_PADDING;
        if (d2 <= r * r && d2 < bestD2) {
          bestD2 = d2;
          best = i;
        }
      }
      return best;
    };

    // ---------------- Simulation step ----------------
    const step = () => {
      const ns = st.simNodes;
      const n = ns.length;
      if (n === 0) return;
      const cx = st.width / 2;
      const cy = st.height / 2;

      // Repulsion (O(n^2) — fine for ~50 nodes).
      for (let i = 0; i < n; i++) {
        const a = ns[i];
        for (let j = i + 1; j < n; j++) {
          const b = ns[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) {
            // Exact overlap — jitter apart deterministically.
            dx = (i - j) * 0.5 + (Math.random() - 0.5) * 0.5;
            dy = (j - i) * 0.5 + (Math.random() - 0.5) * 0.5;
            d2 = dx * dx + dy * dy + 0.01;
          }
          const d = Math.sqrt(d2);
          const force = REPULSION / d2;
          const fx = (dx / d) * force;
          const fy = (dy / d) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Spring attraction along edges.
      for (const [s, t] of st.edgeIndexes) {
        const a = ns[s];
        const b = ns[t];
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const diff = d - REST_LENGTH;
        const f = SPRING_K * diff;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Centering + damping + integrate (skip pinned nodes).
      for (let i = 0; i < n; i++) {
        const a = ns[i];
        if (a.fx !== null && a.fy !== null) {
          a.x = a.fx;
          a.y = a.fy;
          a.vx = 0;
          a.vy = 0;
          continue;
        }
        a.vx += (cx - a.x) * CENTERING;
        a.vy += (cy - a.y) * CENTERING;
        a.vx *= DAMPING;
        a.vy *= DAMPING;
        const sp = Math.hypot(a.vx, a.vy);
        if (sp > MAX_VELOCITY) {
          a.vx = (a.vx / sp) * MAX_VELOCITY;
          a.vy = (a.vy / sp) * MAX_VELOCITY;
        }
        a.x += a.vx;
        a.y += a.vy;
      }
    };

    // ---------------- Drawing ----------------
    const draw = () => {
      const w = st.width;
      const h = st.height;
      const dpr = st.dpr;
      if (w === 0 || h === 0) return;

      // Reset to screen space (DPR-scaled) and clear.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const ns = st.simNodes;
      const hovered = st.hoveredIndex;
      const curSlug = currentSlugRef.current;
      const curIdx = curSlug ? st.idToIndex.get(curSlug) ?? -1 : -1;

      // World-space viewport bounds for culling.
      const worldLeft = -st.offsetX / st.scale;
      const worldRight = (w - st.offsetX) / st.scale;
      const worldTop = -st.offsetY / st.scale;
      const worldBottom = (h - st.offsetY) / st.scale;

      // Apply pan & zoom for graph geometry.
      ctx.save();
      ctx.translate(st.offsetX, st.offsetY);
      ctx.scale(st.scale, st.scale);

      // --- Edges ---
      ctx.lineWidth = 1 / st.scale; // keep ~1px on screen
      for (const [s, t] of st.edgeIndexes) {
        const a = ns[s];
        const b = ns[t];
        if (!a || !b) continue;
        // Cull edges fully outside the viewport.
        const minX = Math.min(a.x, b.x);
        const maxX = Math.max(a.x, b.x);
        const minY = Math.min(a.y, b.y);
        const maxY = Math.max(a.y, b.y);
        if (maxX < worldLeft || minX > worldRight || maxY < worldTop || minY > worldBottom) continue;

        const bright =
          s === hovered || t === hovered || s === curIdx || t === curIdx;
        ctx.strokeStyle = bright ? PALETTE.edgeBright : PALETTE.edge;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // --- Nodes ---
      for (let i = 0; i < ns.length; i++) {
        const node = ns[i];
        const r = nodeRadius(node);
        // Cull off-screen nodes (with radius padding).
        if (
          node.x + r < worldLeft ||
          node.x - r > worldRight ||
          node.y + r < worldTop ||
          node.y - r > worldBottom
        ) {
          continue;
        }

        const isCurrent = i === curIdx;
        const isHovered = i === hovered;

        let fill = PALETTE.node;
        if (isCurrent) fill = PALETTE.current;
        else if (node.degree === 0) fill = PALETTE.nodeDim;

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();

        if (isHovered && !isCurrent) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2);
          ctx.strokeStyle = PALETTE.hoverRing;
          ctx.lineWidth = 1.5 / st.scale;
          ctx.stroke();
        }
        if (isCurrent) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = PALETTE.currentRing;
          ctx.lineWidth = 1.5 / st.scale;
          ctx.stroke();
        }
      }

      ctx.restore();

      // --- Labels (screen space, constant 11px for readability) ---
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = LABEL_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const showAll = st.scale > 0.7;
      for (let i = 0; i < ns.length; i++) {
        const node = ns[i];
        const show = showAll || i === hovered || i === curIdx;
        if (!show) continue;
        const screenX = node.x * st.scale + st.offsetX;
        const screenY = node.y * st.scale + st.offsetY;
        const r = nodeRadius(node) * st.scale;
        // Cull labels off-screen.
        if (screenX < -120 || screenX > w + 120 || screenY < -30 || screenY > h + 30) continue;

        const label = truncate(node.title, MAX_LABEL_CHARS);
        const tw = ctx.measureText(label).width;
        const th = 11;
        const padX = 4;
        const padY = 2;
        const bgY = screenY + r + 3;
        ctx.fillStyle = PALETTE.labelBg;
        ctx.fillRect(screenX - tw / 2 - padX, bgY, tw + padX * 2, th + padY * 2);
        ctx.fillStyle = i === curIdx ? PALETTE.current : PALETTE.label;
        ctx.fillText(label, screenX, bgY + padY);
      }
    };

    // ---------------- Main loop ----------------
    let rafId = 0;
    const loop = () => {
      if (st.running) {
        step();
        st.frame++;
        if (st.frame > SETTLE_FRAMES) st.running = false;
      }
      draw();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    // ---------------- Interaction handlers ----------------
    const onPointerDown = (e: PointerEvent) => {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      setHintVisible(false);
      const world = screenToWorld(e.clientX, e.clientY);
      const idx = findNodeAt(world.x, world.y);
      st.downScreenX = e.clientX;
      st.downScreenY = e.clientY;
      st.lastScreenX = e.clientX;
      st.lastScreenY = e.clientY;
      st.dragMoved = false;
      if (idx >= 0) {
        st.mode = "drag";
        st.dragIndex = idx;
        const node = st.simNodes[idx];
        node.fx = node.x;
        node.fy = node.y;
        st.running = true;
        st.frame = 0;
      } else {
        st.mode = "pan";
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - st.lastScreenX;
      const dy = e.clientY - st.lastScreenY;
      st.lastScreenX = e.clientX;
      st.lastScreenY = e.clientY;

      if (st.mode === "drag" && st.dragIndex >= 0) {
        if (
          Math.abs(e.clientX - st.downScreenX) > CLICK_THRESHOLD_PX ||
          Math.abs(e.clientY - st.downScreenY) > CLICK_THRESHOLD_PX
        ) {
          st.dragMoved = true;
        }
        const world = screenToWorld(e.clientX, e.clientY);
        const node = st.simNodes[st.dragIndex];
        node.fx = world.x;
        node.fy = world.y;
        st.running = true;
      } else if (st.mode === "pan") {
        if (
          Math.abs(e.clientX - st.downScreenX) > CLICK_THRESHOLD_PX ||
          Math.abs(e.clientY - st.downScreenY) > CLICK_THRESHOLD_PX
        ) {
          st.dragMoved = true;
        }
        st.offsetX += dx;
        st.offsetY += dy;
      } else {
        // Hover detection.
        const world = screenToWorld(e.clientX, e.clientY);
        st.hoveredIndex = findNodeAt(world.x, world.y);
        canvas.style.cursor = st.hoveredIndex >= 0 ? "pointer" : "default";
      }
    };

    const endPointer = (e: PointerEvent) => {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (st.mode === "drag" && st.dragIndex >= 0) {
        const node = st.simNodes[st.dragIndex];
        node.fx = null;
        node.fy = null;
        // Let the graph re-settle briefly around the released node.
        st.running = true;
        st.frame = Math.max(0, SETTLE_FRAMES - WAKE_FRAMES);
        // Click (no significant movement) → open the note.
        if (!st.dragMoved) {
          const slug = node.id;
          if (onSelectRef.current) {
            onSelectRef.current(slug);
          } else if (typeof window !== "undefined") {
            window.location.href = "/?p=" + encodeURIComponent(slug);
          }
        }
      }
      st.mode = "idle";
      st.dragIndex = -1;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setHintVisible(false);
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Zoom factor: smooth, sign-aware.
      const factor = Math.exp(-e.deltaY * 0.0015);
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, st.scale * factor));
      // Keep the world point under the cursor anchored.
      const wx = (mx - st.offsetX) / st.scale;
      const wy = (my - st.offsetY) / st.scale;
      st.scale = newScale;
      st.offsetX = mx - wx * newScale;
      st.offsetY = my - wy * newScale;
      // Per spec: resume sim on zoom.
      st.running = true;
      st.frame = Math.max(0, SETTLE_FRAMES - WAKE_FRAMES);
    };

    const onDblClick = (e: MouseEvent) => {
      const world = screenToWorld(e.clientX, e.clientY);
      // Only reset when double-clicking empty canvas.
      if (findNodeAt(world.x, world.y) >= 0) return;
      st.scale = 1;
      st.offsetX = 0;
      st.offsetY = 0;
      st.running = true;
      st.frame = Math.max(0, SETTLE_FRAMES - WAKE_FRAMES);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", onDblClick);

    // Auto-fade the interaction hint after a few seconds.
    const hintTimer = window.setTimeout(() => setHintVisible(false), 5000);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", endPointer);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDblClick);
      window.clearTimeout(hintTimer);
    };
  }, []);

  const nodeCount = nodes.length;
  const edgeCount = edges.length;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Knowledge graph with ${nodeCount} notes and ${edgeCount} links. Drag to pan, scroll to zoom, click a node to open it.`}
        className="block h-full w-full touch-none select-none"
      />

      {/* Legend (bottom-left) */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground backdrop-blur-sm">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: PALETTE.node }}
            aria-hidden="true"
          />
          note
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: PALETTE.current }}
            aria-hidden="true"
          />
          current
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0 w-3"
            style={{ borderTop: `1px solid ${PALETTE.node}` }}
            aria-hidden="true"
          />
          link
        </span>
      </div>

      {/* Interaction hint (top-right) — fades after a few seconds or on first interaction */}
      <div
        className={cn(
          "pointer-events-none absolute right-3 top-3 font-mono text-[10px] text-muted-foreground/80 transition-opacity duration-500",
          hintVisible ? "opacity-100" : "opacity-0",
        )}
      >
        drag to pan · scroll to zoom · click a node
      </div>

      {/* Screen-reader keyboard hint */}
      <span className="sr-only">
        Interactive knowledge graph. Use a mouse or trackpad to pan, zoom, and
        click nodes to open notes.
      </span>
    </div>
  );
}

export default GraphView;
