---
title: "Callouts Reference"
description: "A complete reference for every Obsidian callout type — note, tip, warning, quote, and the collapsible variants."
draft: false
date: 2024-08-18
tags: [reference, callouts]
aliases: ["Callouts"]
---

Callouts are the little colored boxes you've been seeing throughout this garden. They pull a piece of text out of the flow and give it a flavor — a tip, a warning, a question. They render from a simple blockquote-with-a-tag syntax:

```
> [!note] Optional Title
> Body text here.
> More body if you need it.
```

Below is one of every type the renderer supports. Use them sparingly — a note that's nothing but callouts loses the signal.

## Standard callouts

> [!note] Note
> For general asides that don't fit the categories below.

> [!abstract] Abstract
> A summary or overview. Good for tldr-style framing at the top of a long note.

> [!info] Info
> Contextual background that's helpful but not essential.

> [!tip] Tip
> A piece of advice that will save the reader time.

> [!success] Success
> When something has been verified to work, or a goal has been reached.

> [!question] Question
> An open thread — something worth sitting with rather than answering.

> [!warning] Warning
> A common pitfall. Pay attention here.

> [!failure] Failure
> Documenting what *didn't* work, which is often more instructive than what did.

> [!danger] Danger
> Higher stakes than a warning — data loss, irreversible actions.

> [!bug] Bug
> A known issue or gotcha in a tool or system.

> [!example] Example
> A concrete illustration of the surrounding concept.

> [!quote] Quote
> A quotation, attributed in the body or title.

## Collapsible callouts

Add a `-` after the type to start collapsed, or a `+` to start expanded but still toggleable.

> [!info]- Collapsed by default
> You have to click to reveal this. Useful for long reference material you don't want to spam the page with.

> [!tip]+ Expanded by default
> This one is open on load, but readers can still fold it away if they want.

## A note on taste

Callouts are seasoning, not the meal. I try to use them only when the *kind* of the aside genuinely matters — a warning is meaningfully different from a note, and reserving the visual treatment for that difference is what makes it land. If you're just starting out, [[Welcome to the Garden]] is a friendlier entry point than this reference.
