---
title: "Wikilinks and Backlinks"
description: "How wikilinks work in Obsidian-style markdown — aliases, headings, and the backlinks that make notes talk to each other."
draft: false
author: Ridoy
date: 2024-08-17
tags: [reference, wikilinks]
aliases: ["Wikilinks", "Backlinks"]
---

Wikilinks are the connective tissue of a digital garden. Instead of pointing at a URL, you point at the *name* of another note, and the system resolves it for you. It sounds small, but it changes how you write: you stop worrying about where things "live" and start linking the way you think.

## Basic syntax

The simplest form wraps a note's title in double brackets:

```
I was reading about [[Digital Gardens]] and it changed how I think.
```

The target matches the note's `title` in frontmatter, or any of its `aliases`. So if a note is titled "On Thinking" but aliased as "Thinking", both `[[On Thinking]]` and `[[Thinking]]` resolve to the same place.

## Aliases — link with different text

You can show different text than the target's title using a pipe:

```
The garden metaphor [[Digital Gardens|is older than you think]].
```

This renders as "is older than you think" but points to the Digital Gardens note. Useful for prose flow.

## Heading and block links

Link to a specific section with a hash:

```
See [[Digital Gardens#The stream vs. the garden]] for the contrast.
```

Block references (`[[Note#^abc123]]`) point at an individual paragraph, but I use them sparingly — headings are usually enough.

## Backlinks

Every link is bidirectional in practice. If note A links to note B, then B's page shows A in its **backlinks** section automatically. You don't author backlinks; they emerge from the graph. This is what turns a collection of files into a conversation — see [[Embeds and Transclusions]] for how to pull content *into* a note rather than just linking out.

> [!example] Try it
> This very note is linked from [[Digital Gardens]], [[Welcome to the Garden]], and [[Tags and Organization]]. Scroll to the bottom of those pages and you'll find me in their backlinks.

## When links break

If you rename a note, ideally every link to it updates too. In practice, I keep titles stable and lean on `aliases` for variants. A broken wikilink is a useful signal — it means a thought is dangling, waiting for the note it wants to become.
