<%*
const rawTitle = tp.file.title;
const isUntitled = !rawTitle || rawTitle === "Untitled";

const cleanTitle = !isUntitled
  ? rawTitle
      .replace(/-and-/gi, " & ")
      .replace(/-/g, " ")
      .replace(/\b(ai|ml|dsa|os|cse|ui|ux|api|pdf|html|css|js|ts)\b/gi, m => m.toUpperCase())
      .replace(/\b[a-z]/g, c => c.toUpperCase())
  : "";

const files = app.vault.getMarkdownFiles()
  .filter(f => !f.path.includes("Templates") && f.path !== tp.file.path(true))
  .sort((a, b) => b.stat.ctime - a.stat.ctime);

const lastFile = files.length > 0 ? files[0] : null;

// Series: default = series of the last created note (Enter to continue it).
// Leave empty for a standalone note. seriesOrder auto-increments by scanning
// the vault for the highest existing order in that series.
const lastFm = lastFile ? app.metadataCache.getFileCache(lastFile)?.frontmatter : null;
const lastSeries = (lastFm && typeof lastFm.series === "string" && lastFm.series.trim()) ? lastFm.series.trim() : "";
const seriesName = await tp.system.prompt("Series (empty = standalone note)", lastSeries);

let seriesOrder = "";
if (seriesName && seriesName.trim()) {
  let max = 0;
  for (const f of app.vault.getMarkdownFiles()) {
    if (f.path.includes("Templates")) continue;
    const fm = app.metadataCache.getFileCache(f)?.frontmatter;
    if (fm && fm.series === seriesName.trim()) {
      const order = typeof fm.seriesOrder === "number" ? fm.seriesOrder : (typeof fm.seriesNumber === "number" ? fm.seriesNumber : 0);
      max = Math.max(max, order);
    }
  }
  seriesOrder = max + 1;
}

-%>
---
title: "<% cleanTitle %>"
description: ""
author: Ridoy
visibility: public
date: <% tp.file.creation_date("YYYY-MM-DD") %>
updatedAt: <% tp.file.last_modified_date("YYYY-MM-DD") %>
tags: []
series: "<% seriesName %>"
seriesOrder: <% seriesOrder %>
---

