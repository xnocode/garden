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
const prevName = lastFile ? lastFile.basename : "";

const words = cleanTitle ? cleanTitle.split(" ") : [];
const keyword = words.length > 1 ? words.slice(1).join(" ").toLowerCase() : (!isUntitled ? rawTitle.toLowerCase() : "");
-%>
---
title: "<% cleanTitle %>"
description: ""
author: Ridoy
draft: false
date: <% tp.file.creation_date("YYYY-MM-DD") %>
updatedAt: <% tp.file.last_modified_date("YYYY-MM-DD") %>
tags: []
prev: <% prevName ? '"[[' + prevName + ']]"' : '""' %>
next: ""
aliases:
  - "<% keyword %>"
---

