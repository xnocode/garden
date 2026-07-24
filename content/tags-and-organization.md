---
title: "Tags and Organization"
description: "How tags, nested tags, and folders work together to keep a digital garden findable without over-structuring it."
draft: false
author: Ridoy
date: 2024-08-24
tags: [reference, organization]
aliases: ["Tags", "Organization"]
---

Tags and folders solve the same problem — *findability* — from opposite directions. Folders put a note in exactly one place; tags let a note live in many. A digital garden leans heavily on tags because ideas rarely belong to a single bucket, and over-foldering is the fastest way to make a garden feel like a bureaucracy.

## Inline tags

You can drop tags directly into prose with a hash:

```
This note is really about #thinking and a little about #knowledge/notes.
```

The renderer picks them up the same way it picks up tags in frontmatter, and they all flow into the unified tag index. I tend to use frontmatter tags for the *primary* shape of a note and inline tags for the softer secondary themes — that way the tag list at the top stays scannable.

## Nested tags

Tags can be hierarchical, separated by slashes. `#reference/organization` lives *under* `#reference`, so browsing `#reference` shows everything tagged with it or any child. This is how I avoid tag explosion: instead of `reference`, `reference-org`, `reference-links`, I use `#reference/organization`, `#reference/wikilinks`, and the hierarchy does the grouping.

## Folders, sparingly

Folders in this garden are mostly for the publish pipeline and for keeping essays visually separate from reference notes. They are *not* a primary navigation surface. Once a note is in a folder, the links and tags do the rest. See [[Wikilinks and Backlinks]] for why linking beats filing.

> [!question] When is a tag better than a link?
> Tags group notes that share a *property* (essay, reference, draft). Links connect notes that share a *relationship* (agreement, example, source). If two notes are about the same theme but don't speak to each other, a tag is the right tool. If they actually argue, link them.

## A loose convention

My own tagging is deliberately messy in a structured way: `#essay` for personal writing, `#reference` for evergreen how-to notes, `#thinking/*` for thematic clusters, and `#garden` for meta-notes about the site itself. The convention matters less than *consistency* — once you pick a vocabulary, resist the urge to mint a new tag every time you feel clever. Tags are cheap to add and expensive to consolidate.
