"""Build the motionsites-prompts catalog from a local clone of the upstream repo."""
import json, glob, os, re, csv, collections

SRC = os.environ.get('MOTIONSITES_SRC', '/tmp/msp')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'references')

# label -> regex, matched case-insensitively against the whole prompt body.
# Prose specs name their stack ("Animation: GSAP ScrollTrigger"), so the same
# markers work for text prompts and for shipped code alike.
MARKERS = [
    ('three',         r'three\.js|three\.min\.js|three\.module|THREE\.|[\'"]three[\'"]'),
    ('shader',        r'gl_FragColor|precision\s+(?:highp|mediump)\s+float|ShaderMaterial|fragmentShader|\bGLSL\b'),
    ('webgl',         r"getContext\(\s*['\"]webgl|\bWebGL\b"),
    ('canvas',        r"getContext\(\s*['\"]2d|<canvas"),
    ('particles',     r'particle'),
    ('gsap',          r'\bgsap\b|GreenSock'),
    ('scrolltrigger', r'ScrollTrigger'),
    ('framer-motion', r'framer-motion|motion/react|motion\.div'),
    ('lenis',         r'\blenis\b|locomotive|smooth-?scroll'),
    ('scroll-video',  r'(?s)scroll.{0,80}currentTime|currentTime.{0,80}scroll|scroll-?video|scrub.{0,40}video'),
    ('video-bg',      r'<video[^>]*(?:autoplay|muted)|background video|video background|\.m3u8|hls\.js'),
    ('io-reveal',     r'IntersectionObserver|scroll.{0,15}reveal|reveal on scroll'),
    ('sticky-pin',    r'position:\s*sticky|pin:\s*true|sticky section'),
    ('h-scroll',      r'horizontal.{0,20}scroll|scroll.{0,20}horizontal|translateX\(-\d+%'),
    ('mask',          r'mask-image|webkitMaskImage|clip-path'),
    ('glass',         r'backdrop-filter|backdropFilter|glassmorph'),
    ('3d-transform',  r'perspective\(|preserve-3d|rotateY\('),
    ('split-text',    r'SplitText|splitText|typewriter|char-?by-?char|word.{0,10}stagger'),
    ('marquee',       r'marquee|infinite.{0,15}(?:scroll|loop).{0,15}(?:text|logo)'),
    ('bento',         r'\bbento\b|grid-template-areas'),
    ('cursor',        r'custom.{0,10}cursor|cursor-follow|cursorX|magnetic'),
    ('svg-filter',    r'feTurbulence|feDisplacementMap|feGaussianBlur'),
    ('keyframes',     r'@keyframes'),
    ('tailwind',      r'cdn\.tailwindcss\.com|tailwind'),
    ('react',         r'\breact\b|useState\(|createRoot'),
    ('vue',           r'\bvue(?:\.js|@3)?\b|<script setup'),
    ('nextjs',        r'next\.js|nextjs|app/router'),
    ('spline',        r'\bspline\b'),
    ('dark',          r'dark[- ]mode|background:\s*#0[0-9a-f]{0,5}\b|bg-black|pure black'),
]
COMPILED = [(lab, re.compile(rx, re.I)) for lab, rx in MARKERS]
EXT_ASSET = re.compile(r'https?://[^\s"\')]*(?:cloudfront|amazonaws|digitalocean|supabase|mux\.com|\.mp4|\.webm|\.m3u8|\.hdr|\.glb|\.gltf)', re.I)
FRONTMATTER = re.compile(r'^\s*---\r?\n(.*?)\r?\n---', re.S)


def classify(body):
    """Which form does this prompt take: a spec to hand an LLM, or shipped code?"""
    head = body.lstrip()[:200].lower()
    if head.startswith(('<!doctype', '<html')):
        return 'full-html'
    if re.search(r'```(?:html|jsx|tsx|js|svelte|vue)', body[:3000], re.I):
        return 'fenced-code'
    if re.search(r'<(div|section|nav|body)\b', body[:2000], re.I):
        return 'html-fragment'
    return 'prose'


def frontmatter(body):
    m = FRONTMATTER.match(body)
    if not m:
        return {}
    out = {}
    for line in m.group(1).splitlines():
        km = re.match(r'\s*(title|category|subCategory):\s*(.*)$', line)
        if km:
            out[km.group(1)] = km.group(2).strip().strip('"\'')
    return out


rows, tech_index = [], collections.defaultdict(list)

for meta_path in sorted(glob.glob(os.path.join(SRC, 'motionsites-prompts/*/metadata.json'))):
    d = os.path.dirname(meta_path)
    slug = os.path.basename(d)
    body_file = next((f for f in ('prompt.md', 'working-prompt.md')
                      if os.path.exists(os.path.join(d, f))), None)
    if body_file is None:
        continue
    body = open(os.path.join(d, body_file), encoding='utf-8', errors='replace').read()

    try:
        rec = json.load(open(meta_path)).get('record') or {}
    except Exception:
        rec = {}
    fm = frontmatter(body)

    tech = [lab for lab, rx in COMPILED if rx.search(body)]
    num = int(m.group(1)) if (m := re.match(r'^(\d+)', slug)) else 0
    title = (fm.get('title') or rec.get('title')
             or slug.split('-', 1)[-1].replace('-', ' ')).strip()

    rows.append({
        'n': num,
        'slug': slug,
        'title': title,
        'kind': classify(body),
        'category': rec.get('category') or '',
        'sub': fm.get('subCategory') or rec.get('page_type') or '',
        'kb': max(1, round(len(body.encode()) / 1024)),
        'file': body_file,
        'ext_assets': 'yes' if EXT_ASSET.search(body) else '',
        'tech': ','.join(tech),
    })
    for t in tech:
        tech_index[t].append(slug)

rows.sort(key=lambda r: (r['n'], r['slug']))

os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'catalog.tsv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0]), delimiter='\t', lineterminator='\n')
    w.writeheader()
    w.writerows(rows)

kinds = collections.Counter(r['kind'] for r in rows)
print('rows:', len(rows), '| kinds:', dict(kinds))
print('catalog.tsv:', os.path.getsize(os.path.join(OUT, 'catalog.tsv')) // 1024, 'KB')
print('\ntechniques:')
for t, s in sorted(tech_index.items(), key=lambda kv: -len(kv[1])):
    print(f'  {t:<14} {len(s):>4}')


# --- techniques.md -----------------------------------------------------------
# Code-bearing prompts teach a technique better than a prose spec that only
# names it, so rank examples by how much implementation they actually carry.
RANK = {'full-html': 0, 'fenced-code': 1, 'html-fragment': 2, 'prose': 3}
lines = ["# Technique index",
         "",
         "Every technique detected across the 813 prompts, with the examples that carry",
         "actual code for it (`full-html` and `fenced-code` first \u2014 a prose spec that merely",
         "names a library teaches you less than one that ships the implementation).",
         "",
         "| Technique | Prompts | Best examples (slug \u00b7 form) |",
         "| :--- | ---: | :--- |"]
by_tech = collections.defaultdict(list)
for r in rows:
    for t in filter(None, r['tech'].split(',')):
        by_tech[t].append(r)
for t, rs in sorted(by_tech.items(), key=lambda kv: -len(kv[1])):
    rs.sort(key=lambda r: (RANK[r['kind']], -int(r['kb'])))
    ex = " \u00b7 ".join(f"`{r['slug']}` ({r['kind']})" for r in rs[:4])
    lines.append(f"| `{t}` | {len(rs)} | {ex} |")
with open(os.path.join(OUT, 'techniques.md'), 'w', encoding='utf-8') as f:
    f.write("\n".join(lines) + "\n")
print('wrote techniques.md')
