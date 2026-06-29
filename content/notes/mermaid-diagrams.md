---
title: "Mermaid Diagrams"
description: "Client-side rendered Mermaid diagrams — flowcharts, sequences, and graphs living directly inside notes."
draft: false
date: 2024-08-20
tags: [reference, diagrams]
aliases: ["Mermaid", "Diagrams"]
---

Sometimes an idea is a shape, not a sentence. Mermaid lets you describe diagrams as text and have them render inline. Because the source is plain text, diagrams stay diff-able, searchable, and editable the same way the rest of a note is — no dragging boxes around in a GUI.

Diagrams render client-side, so on first paint you may see the raw source briefly before the diagram paints in. That's normal.

## A flowchart

A simple decision tree for whether a note belongs in the garden:

```mermaid
flowchart TD
    A[Have a thought] --> B{Is it a finished essay?}
    B -- yes --> C[Essays folder]
    B -- no --> D{Is it a fragment?}
    D -- yes --> E[Notes folder, seedling]
    D -- no --> F[Capture elsewhere]
    E --> G[Link it to neighbors]
    G --> H[Let it grow]
```

## A sequence diagram

How a backlink actually resolves between two notes:

```mermaid
sequenceDiagram
    participant Reader
    participant NoteA
    participant Graph
    participant NoteB
    Reader->>NoteA: Opens note A
    NoteA->>Graph: Declares a link to NoteB
    Graph->>NoteB: Registers backlink from A
    Reader->>NoteB: Opens note B
    NoteB->>Reader: Shows A in backlinks
```

## A graph

The shape of a small garden, nodes connected the way ideas are:

```mermaid
graph LR
    Garden --- DigitalGardens
    DigitalGardens --- Zettelkasten
    DigitalGardens --- SecondBrain
    Zettelkasten --- NoteTaking
    NoteTaking --- OnThinking
    OnThinking --- OnWriting
    OnWriting --- Garden
```

## When to reach for Mermaid

Mermaid shines for *structural* ideas — flows, relationships, sequences. For *quantitative* ideas, [[Math and LaTeX]] is the better fit. And for soft admonitions scattered through prose, [[Callouts Reference]] keeps things tidy. Pick the tool that matches the shape of the thought.
