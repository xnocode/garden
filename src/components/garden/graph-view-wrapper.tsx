"use client";

import { navigate } from "./garden-link";

import { GraphView, type GraphViewProps } from "./graph-view";

/**
 * Client wrapper around GraphView that provides SPA navigation,
 * so server components can render the graph without passing function props.
 */
export function GraphViewWrapper(
  props: Omit<GraphViewProps, "onSelect">
) {
  return (
    <GraphView
      {...props}
      onSelect={(slug) => navigate(`/?p=${encodeURIComponent(slug)}`)}
    />
  );
}
