---
title: "Books & Manuscripts Library"
description: "A personal collection of handwritten notebooks, lecture slides, scanned papers, and digital books — all accessible via Google Drive or cloud PDF links."
tags: [library, books, reference, manuscripts]
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
    description: "Illustrated eco-design notebook with contemporary architectural sights of Copenhagen, waterfront studies, and Nordic minimalism."
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
    description: "Root-finding algorithms, polynomial interpolation, numerical integration, ODE solving, and error analysis with step-by-step worked proofs."
    tags: [mathematics, numerical-analysis, algorithms]
---

# Books & Manuscripts Library

Welcome to my personal digital library of handwritten notebooks, physical scans, lecture series, and digital textbooks — all stored in **Google Drive** or cloud storage and accessible directly via the interactive 3D notebook gallery above.

## How to Manage Your Books from this Markdown File

To add, edit, or remove books, simply update the `books:` YAML frontmatter at the top of this file (`content/books.md`):

```yaml
books:
  - title: "Your Book Title"
    author: "Author Name"
    category: "Physics"
    cover: "https://example.com/cover.jpg" # URL or local asset path
    link: "https://drive.google.com/file/d/YOUR_DRIVE_ID/view" # Cloud PDF link
    pages: "120 pages" # optional
    color: "#86bfa8" # optional hardcover accent color
    description: "Short description or synopsis of the notebook."
    tags: [notes, derivations, reference]
```

### Supported Cloud Storage Providers
- **Google Drive**: Shareable links (`/view`, `/preview`, `/file/d/...`) automatically open in the embedded reader.
- **OneDrive / 1drv.ms**: Shareable links with direct preview support.
- **Dropbox**: Direct link with preview and download support.
- **MEGA / Box / iCloud**: Direct cloud link integration.
- **Direct PDF URLs**: Any `.pdf` URL will render natively in the browser reader.

### Updating a Document Without Changing the Link
1. Right-click the file in **Google Drive**.
2. Select **File information → Manage versions → Upload new version**.
3. The link remains unchanged, and your digital garden displays the updated PDF instantly.
