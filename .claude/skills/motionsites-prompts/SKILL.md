---
name: motionsites-prompts
description: Search 813 curated web-design prompts (MotionSites collection) for landing pages, hero sections, scroll narratives, WebGL/Three.js canvases, bento grids and UI components — then pull the full prompt text on demand. Use when the user wants a reference, technique or starting point for animated / motion-heavy web design: "промпт под hero", "как сделать scroll-video", "найди референс для секции", "motionsites", "нужен промпт под лендинг", or when implementing scroll-driven animation, GSAP/ScrollTrigger, particle canvases, shaders, marquees, horizontal scroll or glassmorphism and you want a proven spec to work from.
---

# MotionSites prompt collection

An index over [`nomaan5541/motionsites-prompt-collection`](https://github.com/nomaan5541/motionsites-prompt-collection)
(MIT) — 813 prompts for AI-generated web design. This skill carries the **catalog**;
prompt bodies are fetched on demand, so nothing large lives in the repo.

## What a "prompt" actually is here

Four different forms, and the difference decides how you use one. The `kind`
column in the catalog tells you which you are looking at:

| `kind` | Count | What you get |
| :--- | ---: | :--- |
| `prose` | 662 | A detailed spec — stack, palette, type scale, section-by-section behaviour. Hand it to a model, or mine it for design decisions. |
| `fenced-code` | 86 | A spec wrapped around real code blocks. |
| `html-fragment` | 49 | Markup for one section. |
| `full-html` | 16 | A complete, runnable single-file page. Read these for technique. |

Only 151 of 813 carry actual code. The rest are specifications — excellent for
*what to build*, silent on *how*. When you need a working implementation of a
technique, filter to the code-bearing kinds first.

## Finding a prompt

`references/catalog.tsv` is tab-separated, one row per prompt:

`n · slug · title · kind · category · sub · kb · file · ext_assets · tech`

Search it with plain grep — it is 102 KB, do not read it whole:

```bash
cd .claude/skills/motionsites-prompts

# by technique
grep -P '\tfull-html\t' references/catalog.tsv | grep scroll-video
grep three references/catalog.tsv | grep -P '\t(full-html|fenced-code)\t'

# by subject
grep -i -P '\t[^\t]*(hero|pricing|footer)[^\t]*\t' references/catalog.tsv

# columns, readably
awk -F'\t' '$4=="full-html" {printf "%-34s %-30s %s\n", $2, $3, $10}' references/catalog.tsv
```

`references/techniques.md` inverts this: every detected technique with its count
and the best code-bearing examples. Start there when the request is a technique
("scroll-driven video", "custom cursor") rather than a page type.

**Categories** are upstream buckets, not descriptions: `Premium` (431),
`Superdesign Canvas` (144, curated UI + shaders), `21st.dev Registry` (93,
components), `HorizonX Library` (93, 3D/WebGL, and the only ones with a real
`sub` taxonomy). Filter by `tech` and `kind` instead — they are derived from the
prompt bodies and are far more discriminating.

## Reading a prompt

```bash
./scripts/get_prompt.sh 004-3d-story            # to stdout
./scripts/get_prompt.sh 004-3d-story /tmp/x.md  # to a file
```

Fetches from `raw.githubusercontent.com` and caches under `scripts/.cache/`
(gitignored). Median prompt is 5 KB, p95 is 18 KB — cheap to read, but pull the
two or three that matter, not a dozen.

## Using one well

- **Mine the technique, don't paste the file.** These prompts describe real
  commercial sites the upstream author reverse-engineered (the repo ships a
  `FAIR_USE_NOTICE.md` and a `DMCA.md`). Take the mechanism — how the scroll
  progress maps to video frames, how the mask reveal is driven — not the copy,
  the brand names, or the visual identity.
- **Mind the stack gap.** 631 prompts assume Tailwind and 615 assume React. On a
  vanilla-HTML project the spec still transfers; the implementation does not.
  Translate deliberately rather than dragging in a build step.
- **`ext_assets=yes` (352 prompts) means dead links.** They point at the original
  author's CloudFront / DigitalOcean / Mux buckets for video and 3D models. Those
  URLs are not yours to hotlink and will rot — substitute your own assets.
- **Cross-check against the project's own design direction.** This collection has
  a strong house style (dark, glassy, gradient-heavy: 322 prompts use
  `backdrop-filter`, 294 are dark-mode). That is a starting point, not a target —
  if the project has its own typography and palette, keep them.

## Refreshing the catalog

`scripts/build_catalog.py` regenerates `references/` from a local clone:

```bash
git clone --depth 1 https://github.com/nomaan5541/motionsites-prompt-collection /tmp/msp
MOTIONSITES_SRC=/tmp/msp python3 scripts/build_catalog.py
```

The clone is ~3.5 GB (preview images and video dominate); only
`motionsites-prompts/` is read. Catalog built from upstream `d4974f4`, 2026-08-31.
