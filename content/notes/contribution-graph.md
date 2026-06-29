---
title: "Contribution Graph"
description: "A GitHub-style heatmap showing your garden activity over time, rendered from the Obsidian Contribution Graph plugin."
draft: false
date: 2024-09-03
tags: [reference, graph, visualization]
---

This note tests the **Obsidian Contribution Graph** plugin integration. In Obsidian, you use a `contributionGraph` code block with YAML config. On the website, it renders as a GitHub-style heatmap.

## Default graph (140 days, sage theme)

```contributionGraph
title: 'Garden Activity — Last 140 Days'
days: 140
query: '#garden'
graphType: 'default'
cellStyleRules:
  - color: '#1a3a2a', min: 1, max: 2
  - color: '#2d5f3f', min: 2, max: 3
  - color: '#4a8c5f', min: 3, max: 4
  - color: '#84a59d', min: 4, max: 999
```

## Full year (365 days)

```contributionGraph
title: 'Garden Activity — Full Year'
days: 365
query: '#garden'
graphType: 'default'
cellStyleRules:
  - color: '#1a3a2a', min: 1, max: 2
  - color: '#2d5f3f', min: 2, max: 3
  - color: '#4a8c5f', min: 3, max: 4
  - color: '#84a59d', min: 4, max: 999
```

## Amber theme

```contributionGraph
title: 'Writing Streak'
days: 90
query: '#essay'
graphType: 'default'
cellStyleRules:
  - color: '#3d2e1a', min: 1, max: 2
  - color: '#7a5c2e', min: 2, max: 3
  - color: '#b8860b', min: 3, max: 4
  - color: '#e8b86d', min: 4, max: 999
```

> [!info] How it works
> In Obsidian, the plugin runs a Dataview query to count notes per day. On the website, since Dataview isn't available, the graph shows sample data distributed across the date range. To show real data, add a `data` array to the YAML:
>
> ```yaml
> data:
>   - date: '2024-08-15', value: 3
>   - date: '2024-08-16', value: 1
> ```

See [[Code Execution Playground]], [[Media Embeds Reference]], [[Setup Guide]].
