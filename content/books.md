---
title: "Manuscripts & Notebooks"
description: "A personal collection of handwritten notebooks, lecture notes, scanned manuscripts, and digital study materials — all shared via cloud storage and accessible through the interactive gallery."
tags: [manuscripts, notebooks, notes, reference, library]
author: "Ridoy"
date: 2026-08-27
visibility: public
books:
  - title: "Budapest Architecture & City Notes"
    author: "Ridoy"
    category: "Architecture"
    cover: "https://images.unsplash.com/photo-1541888946425-d0fbb18f15f8?q=80&w=800&auto=format&fit=crop"
    link: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view?usp=sharing"
    pages: "128 pages"
    color: "#86bfa8"
    description: "Illustrated eco-design notebook featuring architectural line sketches, urban perspectives, and historical monuments of Budapest."
    tags: [architecture, design, sketches]

  - title: "Hello Copenhagen — Contemporary Urban Design"
    author: "Ridoy"
    category: "Urban Design"
    cover: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?q=80&w=800&auto=format&fit=crop"
    link: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view?usp=sharing"
    pages: "96 pages"
    color: "#363a3e"
    description: "Illustrated notebook with contemporary architectural sights of Copenhagen, waterfront studies, and Nordic minimalism."
    tags: [copenhagen, nordic, design]

  - title: "Quantum Field Theory & Particle Derivations"
    author: "Ridoy"
    category: "Physics"
    cover: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop"
    link: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view?usp=sharing"
    pages: "142 pages"
    color: "#e65c36"
    description: "Handwritten derivations covering the Dirac equation, Feynman diagrams, and path integral formulation of Quantum Field Theory."
    tags: [physics, qft, quantum-mechanics]

  - title: "Data Communication & Computer Networks (CSE0612223)"
    author: "Ridoy"
    category: "Computer Science"
    cover: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop"
    link: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view?usp=sharing"
    pages: "110 pages"
    color: "#2d4a53"
    description: "Comprehensive lecture notes on signal encoding, transmission media, data link layer protocols, and modern network architectures."
    tags: [networking, computer-science, cse]

  - title: "Numerical Methods & Mathematical Analysis"
    author: "Ridoy"
    category: "Mathematics"
    cover: "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=800&auto=format&fit=crop"
    link: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view?usp=sharing"
    pages: "135 pages"
    color: "#7e5265"
    description: "Root-finding algorithms, polynomial interpolation, numerical integration, ODE solving, and error analysis with worked proofs."
    tags: [mathematics, numerical-analysis, algorithms]
---

# Manuscripts & Notebooks

This is my personal library of handwritten study notes, lecture manuscripts, and digital notebooks — all shared directly via cloud storage and displayed as an interactive 3D gallery above.

Each notebook represents real notes I've taken — lecture derivations, design sketches, study guides, and personal research. Click any notebook to open it and read the full document.

## How to Add Your Own Notebooks

To add a new notebook or manuscript, edit the `books:` section in the YAML frontmatter at the top of this file (`content/books.md`):

```yaml
books:
  - title: "Your Notebook Title"
    author: "Your Name"
    category: "Physics"          # used for filtering (e.g. Mathematics, Architecture)
    cover: "https://..."         # direct image URL for the book cover
    link: "https://drive.google.com/file/d/YOUR_ID/view"  # cloud PDF link
    pages: "120 pages"           # optional — shown on the card
    color: "#86bfa8"             # optional — fallback hardcover accent color
    description: "Brief synopsis or overview of what this notebook contains."
    tags: [notes, derivations, reference]
```

Then run `bun run deploy` to publish the changes.

## Supported Cloud Storage Providers

Upload your PDF to any of these and paste the share link:

| Provider | Example Link Format |
|---|---|
| **Google Drive** | `https://drive.google.com/file/d/ID/view` |
| **OneDrive** | `https://onedrive.live.com/...` or `https://1drv.ms/...` |
| **Dropbox** | `https://www.dropbox.com/s/...` |
| **MEGA** | `https://mega.nz/file/...` |
| **Box** | `https://app.box.com/s/...` |
| **Direct PDF** | Any `.pdf` URL |

## Updating a Document Without Changing the Link

If you need to update the content of a notebook without breaking the existing link:

1. Right-click the file in **Google Drive**
2. Select **File information → Manage versions → Upload new version**
3. The share link stays the same — your garden instantly reflects the updated PDF
