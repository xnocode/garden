---
title: "Composing with Transclusions"
description: "Transclusions let you compose notes from other notes — pulling in a section here, an image there, without copy-paste. A demonstration of building on what you've already written."
draft: false
date: 2024-08-03
tags: [reference, embeds, composition, garden]
aliases: ["Transclusion Composition"]
---

Transclusion is the idea that you don't have to copy content to reuse it. You just point at it. When the source changes, every place that transcludes it updates too. Ted Nelson coined the term in 1980 — it's older than the web.

In a digital garden, transclusion means: instead of quoting a paragraph from another note, you embed it. The reader sees the content inline, but it lives in one place. ==Single source of truth, many presentations.==

Here's the "Standard callouts" section from the [[Callouts Reference]], inlined directly:

![[Callouts Reference#Standard callouts]]

And here's the opening of the [[Digital Gardens]] note, to set context:

![[Digital Gardens]]

You can also transclude a specific block by its `^blockid`. Here's the "atomicity" principle from the [[Zettelkasten Method]]:

![[Zettelkasten Method#^atomicity]]

Notice how each transclusion gets its own framed container with a link back to the source. That link is the contract — it says "this content came from there, and if you want the full context, go look."

> [!tip] When to transclude vs. link
> - **Link** when the reader needs to navigate — "for more, see X."
> - **Transclude** when the reader needs the content *here*, in this context, but it belongs to another note.
> - **Copy** almost never. If you're copying, you're creating a maintenance burden.

The [[Embeds and Transclusions]] reference covers the full syntax. The key forms:
- `![[Note]]` — embed the whole note
- `![[Note#heading]]` — embed just a section (shown above)
- `![[image.png]]` — embed an image asset

Composition is the payoff. Once you have a few dozen notes, new notes become assemblies of existing ones — you write the connective tissue, and transclusions provide the substance. It's how [[Compounding Knowledge|knowledge compounds]]: the same idea serves many arguments.

See [[Embeds and Transclusions]], [[Links Are Thoughts]], [[The Map Is Not the Territory]].
