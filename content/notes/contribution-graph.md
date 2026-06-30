---
title: "Contribution Graph"
description: "A GitHub-style heatmap showing your garden activity over time, rendered from the Obsidian Contribution Graph plugin."
draft: false
date: 2024-09-03
tags: [reference, graph, visualization]
---

This note tests the **Obsidian Contribution Graph** plugin integration. The code blocks below use the exact same format as the plugin.

> [!info] Real data
> The graph uses **real data** from your notes — it counts notes by their `date` field, filtered by the tag in `dataSource.value`. Make sure the date range covers when your notes were published.

## About tag (August 2024)

This graph shows notes tagged `#about`. There's 1 note with this tag, published Aug 15, 2024.

```contributionGraph
title: Contributions
graphType: default
dateRangeType: FIXED_DATE_RANGE
startOfWeek: 0
showCellRuleIndicators: true
titleStyle:
  textAlign: left
  fontSize: 15px
  fontWeight: normal
dataSource:
  type: PAGE
  value: "#about"
  dateField: {}
fromDate: 2024-08-01
toDate: 2024-09-30
cellStyleRules: []
```

## Garden tag (full year 2024)

This graph shows notes tagged `#garden` — there are 7 notes with this tag.

```contributionGraph
title: Garden Activity 2024
graphType: default
dateRangeType: FIXED_DATE_RANGE
startOfWeek: 0
showCellRuleIndicators: true
fromDate: 2024-07-01
toDate: 2024-12-31
titleStyle:
  textAlign: center
  fontSize: 18px
  fontWeight: bold
dataSource:
  type: PAGE
  value: "#garden"
  dateField: {}
cellStyleRules:
  - color: '#1a3a2a', min: 1, max: 2
  - color: '#2d5f3f', min: 2, max: 3
  - color: '#4a8c5f', min: 3, max: 4
  - color: '#84a59d', min: 4, max: 999
```

## Essay tag (amber theme, August 2024)

This graph shows notes tagged `#essay` — there are 14 notes with this tag.

```contributionGraph
title: Writing Streak
graphType: default
dateRangeType: FIXED_DATE_RANGE
startOfWeek: 1
showCellRuleIndicators: true
titleStyle:
  textAlign: left
  fontSize: 14px
  fontWeight: normal
dataSource:
  type: PAGE
  value: "#essay"
  dateField: {}
fromDate: 2024-07-01
toDate: 2024-09-30
cellStyleRules:
  - color: '#3d2e1a', min: 1, max: 2
  - color: '#7a5c2e', min: 2, max: 3
  - color: '#b8860b', min: 3, max: 4
  - color: '#e8b86d', min: 4, max: 999
```

> [!tip] How it works
> The graph counts notes by their `date` frontmatter field, filtered by the tag in `dataSource.value`. Make sure your graph's date range (`fromDate`/`toDate` or `dateRangeValue`) covers the dates your notes were published.
>
> **Example:** If your notes are dated August 2024, set `fromDate: 2024-08-01` and `toDate: 2024-08-31` — or use `dateRangeValue: 700` for the last 700 days (which would cover back to August 2024).

See [[Code Execution Playground]], [[Media Embeds Reference]], [[Setup Guide]].
