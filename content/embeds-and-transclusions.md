---
title: "Embeds and Transclusions"
description: "How to embed one note inside another with transclusions, pull in images, and reuse content without copy-paste."
draft: false
author: Ridoy
date: 2024-08-25
tags: [reference, embeds]
aliases: ["Embeds", "Transclusions"]
---

An embed (or *transclusion*) is what happens when you don't just link to another note — you pull its contents directly into the current page. It's the difference between citing a source and quoting it in full, except the quote stays live: edit the source note, and every embed of it updates too.

## Note embeds

Prefix a wikilink with a bang to transclude the whole note:

```
![[Digital Gardens]]
```

![[Digital Gardens]]

You can also embed just a section:

```
![[Digital Gardens#The stream vs. the garden]]
```

This is wonderful for things like definitions or canonical explanations you don't want to duplicate. Write it once, embed it everywhere.

## Image embeds

Images work the same way. Drop a file into the `assets` folder and embed it:

```
![[garden-illustration.png]]
```

![[garden-illustration.png]]

You can add alt text and dimensions with a pipe:

```
![[garden-illustration.png|The garden at night, 400x400]]
```

## When to embed vs. link

Embeds are powerful but easy to overuse. A page full of embeds is just a page that won't render coherently if any source note moves. My rule of thumb:

- **Link** when the relationship is the point — "see also", "this builds on", "this disagrees with".
- **Embed** when the *content* is the point — a definition, a canonical diagram, a shared preamble.

The mechanics of linking are covered in [[Wikilinks and Backlinks]]; this note is for when linking isn't enough and you need the actual bytes inline.

## A subtle benefit

Embeds make refactoring safe. If I realize my definition of "digital garden" is slightly off in five different notes, fixing it once and letting the embeds propagate is infinitely better than five manual edits — and far better than the silent drift that happens when you copy-paste. The embed is the garden's answer to DRY, applied to prose.
