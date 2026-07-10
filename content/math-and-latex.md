---
title: "Math and LaTeX"
description: "KaTeX-powered math support — inline equations, block formulas, matrices, and sums. The garden speaks equations."
draft: false
date: 2024-08-19
tags: [reference, math]
aliases: ["Math", "LaTeX", "KaTeX"]
---

Notes here render math with [KaTeX](https://katex.org), which means you can drop equations into prose the same way you'd drop in a wikilink. Inline math uses single dollar signs; block math uses doubled. Nothing else to configure.

## Inline math

Energy equals mass times the speed of light squared: $E = mc^2$. The Pythagorean theorem sits comfortably mid-sentence as $a^2 + b^2 = c^2$.

## Block math

The quadratic formula, for when you need both roots:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

A matrix, because some thoughts are two-dimensional:

$$
\begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{bmatrix}
\begin{bmatrix}
x \\ y \\ z
\end{bmatrix}
=
\begin{bmatrix}
x + 2y + 3z \\
4x + 5y + 6z \\
7x + 8y + 9z
\end{bmatrix}
$$

And a sum paired with an integral — the two workhorses of continuous and discrete math:

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}, \qquad
\int_{0}^{\infty} e^{-x^2}\, dx = \frac{\sqrt{\pi}}{2}
$$

## Why KaTeX

KaTeX renders synchronously at build time, so equations appear instantly with the page rather than popping in after a JavaScript round-trip. The trade-off is that the most exotic LaTeX packages aren't supported, but everything you'd reasonably want in a note — fractions, matrices, align environments, Greek letters, limits — works fine.

## A note on escaping

If you actually *want* a literal dollar sign in prose (prices, say), escape it with a backslash: `\$5`. Otherwise the renderer will try to parse it as math and get confused. For diagrams that aren't equations, [[Mermaid Diagrams]] is the better tool.
