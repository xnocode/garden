"use client";

import { useRouter } from "next/navigation";
import { GraphView, type GraphViewProps } from "./graph-view";

/**
 * Client wrapper around GraphView that provides SPA navigation via useRouter,
 * so server components can render the graph without passing function props.
 */
export function GraphViewWrapper(
  props: Omit<GraphViewProps, "onSelect">
) {
  const router = useRouter();
  return (
    <GraphView
      {...props}
      onSelect={(slug) => router.push(`/?p=${encodeURIComponent(slug)}`)}
    />
  );
}
