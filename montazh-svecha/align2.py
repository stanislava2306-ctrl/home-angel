#!/usr/bin/env python3
"""Пословное выравнивание известного сценария по звуку (whisper недоступен в этой сессии).

Три шага:
 1. Паузы ≥0.2 с -> динамикой расставляем границы ПРЕДЛОЖЕНИЙ по настоящим паузам
    (цена — отклонение длительности фразы от её слоговой нормы).
 2. В речевой полосе 300–3400 Гц ищем СЛОГОВЫЕ ЯДРА — локальные максимумы огибающей
    (это гласные: один пик ≈ один слог).
 3. Внутри каждой фразы динамикой сопоставляем ожидаемые слоги слов с найденными
    ядрами (пропуски с обеих сторон разрешены). Начало слова = его первое ядро
    минус подъём согласной.

Выход: words.json формата transcribe.py + таблица сверки.
"""
import json, re, subprocess, sys
import numpy as np

SRC, SCRIPT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
HOP = 0.010
VOW = 'аеёиоуыэюя'
LEAD = 0.055          # согласная перед гласной: слово начинается чуть раньше ядра

def pcm(path, filt=None):
    cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', '16000']
    if filt:
        cmd += ['-af', filt]
    cmd += ['-f', 's16le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').astype(np.float32) / 32768.0

def envelope(x, hop=160):
    n = len(x) // hop
    return 20 * np.log10(np.maximum(1e-9, np.sqrt(np.array([(x[i*hop:(i+1)*hop]**2).mean() for i in range(n)]))))

full = envelope(pcm(SRC))
voice = envelope(pcm(SRC, 'highpass=f=300,lowpass=f=3400'))
N = min(len(full), len(voice)); full, voice = full[:N], voice[:N]
DUR = N * HOP

def smooth(a, k, mode='mean'):
    p = np.pad(a, (k//2, k//2), mode='edge')
    f = np.max if mode == 'max' else np.mean
    return np.array([f(p[i:i+k]) for i in range(len(a))])

sm = smooth(full, 7, 'max')                 # для пауз: межслоговые провалы не считаем
THR = -46.0

def runs(mask):
    out, i = [], 0
    while i < len(mask):
        j = i
        while j < len(mask) and mask[j] == mask[i]:
            j += 1
        out.append((mask[i], i * HOP, j * HOP))
        i = j
    return out

pauses = [(a, b) for v, a, b in runs(sm < THR) if v and b - a >= 0.20]
segs   = [(a, b) for v, a, b in runs(sm >= THR) if v]
speech_to = lambda t: sum(max(0.0, min(b, t) - a) for a, b in segs)
SPEECH = speech_to(DUR)

# ---------------------------------------------------------------- сценарий
syl = lambda w: max(1, sum(1 for c in w.lower() if c in VOW))
PH = []
for line in open(SCRIPT, encoding='utf-8'):
    line = line.strip()
    if not line:
        continue
    ws = [w for w in re.findall(r"[\w«»ёЁ-]+", line) if re.search(r'\w', w)]
    PH.append({'text': line, 'words': ws, 'syl': sum(syl(w) for w in ws)})
TOT = sum(p['syl'] for p in PH)
K = SPEECH / TOT
n = len(PH)

# ---------------------------------------------------------------- 1. границы фраз
cand = [0.0] + [(a + b) / 2 for a, b in pauses] + [DUR]
cs = [speech_to(t) for t in cand]
cum = [0]
for p in PH:
    cum.append(cum[-1] + p['syl'])
INF = float('inf')
dp = [[INF] * len(cand) for _ in range(n + 1)]
bk = [[None] * len(cand) for _ in range(n + 1)]
dp[0][0] = 0.0
for i in range(1, n + 1):
    for q2 in range(1, len(cand)):
        best, arg = INF, None
        for j in range(i):
            for q1 in range(q2):
                if dp[j][q1] == INF:
                    continue
                want = K * (cum[i] - cum[j])
                c = dp[j][q1] + (cs[q2] - cs[q1] - want) ** 2 / max(1.0, want) + 0.35 * (i - j - 1)
                if c < best:
                    best, arg = c, (j, q1)
        dp[i][q2], bk[i][q2] = best, arg
i, q = n, len(cand) - 1
anchor = {n: cand[q]}
while bk[i][q]:
    j, q1 = bk[i][q]
    anchor[j] = cand[q1]
    i, q = j, q1

def t_of_speech(sp):
    acc = 0.0
    for a, b in segs:
        d = b - a
        if sp <= acc + d:
            return a + (sp - acc)
        acc += d
    return segs[-1][1]

bounds = [None] * (n + 1)
for i, t in anchor.items():
    bounds[i] = t
i = 0
while i <= n:
    if bounds[i] is None:
        i += 1
        continue
    j = i + 1
    while j <= n and bounds[j] is None:
        j += 1
    if j <= n and j > i + 1:
        s0, s1 = speech_to(bounds[i]), speech_to(bounds[j])
        for m in range(i + 1, j):
            bounds[m] = t_of_speech(s0 + (s1 - s0) * (cum[m] - cum[i]) / (cum[j] - cum[i]))
    i = j

# ---------------------------------------------------------------- 2. слоговые ядра
vs = smooth(voice, 3)
nuclei = []
for i in range(2, N - 2):
    if vs[i] < THR - 2:
        continue
    if vs[i] < max(vs[max(0, i-5):i+6]):
        continue
    lo = min(vs[max(0, i-14):i].min() if i else vs[i], vs[i+1:i+15].min() if i + 15 < N else vs[i])
    if vs[i] - lo < 2.5:
        continue
    if nuclei and i - nuclei[-1] < 9:        # ближе 90 мс — оставляем громкий
        if vs[i] > vs[nuclei[-1]]:
            nuclei[-1] = i
        continue
    nuclei.append(i)
nuclei = np.array(nuclei) * HOP

# ---------------------------------------------------------------- 3. слоги <-> ядра
segments, stats = [], []
for idx, p in enumerate(PH):
    t0, t1 = bounds[idx], bounds[idx + 1]
    exp = []                                   # ожидаемые слоги: (номер слова)
    for wi, w in enumerate(p['words']):
        exp += [wi] * syl(w)
    s0, s1 = speech_to(t0), speech_to(t1)
    lin = [t_of_speech(s0 + (s1 - s0) * (k + 0.5) / len(exp)) for k in range(len(exp))]
    nu = [t for t in nuclei if t0 - 0.03 <= t < t1]
    M, L = len(exp), len(nu)
    if L:
        SKIP_E, SKIP_N = 0.30, 0.34            # цена пропуска слога / лишнего ядра
        D = np.full((M + 1, L + 1), INF); B = {}
        D[0][0] = 0
        for a in range(M + 1):
            for b in range(L + 1):
                if D[a][b] == INF:
                    continue
                if a < M and b < L:
                    c = D[a][b] + abs(nu[b] - lin[a])
                    if c < D[a+1][b+1]: D[a+1][b+1], B[(a+1, b+1)] = c, (a, b, 'm')
                if a < M:
                    c = D[a][b] + SKIP_E
                    if c < D[a+1][b]: D[a+1][b], B[(a+1, b)] = c, (a, b, 'e')
                if b < L:
                    c = D[a][b] + SKIP_N
                    if c < D[a][b+1]: D[a][b+1], B[(a, b+1)] = c, (a, b, 'n')
        a, b, hit = M, L, {}
        while (a, b) in B:
            pa, pb, op = B[(a, b)]
            if op == 'm':
                hit[pa] = nu[pb]
            a, b = pa, pb
    else:
        hit = {}
    times = [hit.get(k, lin[k]) for k in range(M)]
    for k in range(1, M):                      # монотонность
        times[k] = max(times[k], times[k-1] + 0.05)
    words, k = [], 0
    for wi, w in enumerate(p['words']):
        s = syl(w)
        st = max(t0, times[k] - LEAD)
        en = (times[k + s - 1] + 0.14) if k + s - 1 < M else t1
        words.append({'word': w, 'start': round(st, 3), 'end': round(min(en, t1), 3),
                      'probability': round(sum(1 for q in range(k, k+s) if q in hit) / s, 2)})
        k += s
    for i2 in range(len(words) - 1):           # слово живёт до следующего
        words[i2]['end'] = round(max(words[i2]['end'], words[i2+1]['start'] - 0.01), 3)
    segments.append({'start': round(t0, 3), 'end': round(t1, 3), 'text': p['text'], 'words': words})
    stats.append((len(exp), len(nu), sum(1 for k in range(M) if k in hit)))

json.dump(segments, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'речь {SPEECH:.1f} с из {DUR:.1f} с · пауз {len(pauses)} · ядер {len(nuclei)} · слогов в сценарии {TOT}')
print(f'{"фраза":<46} слог/ядер/совпало  время')
for s, (e, nu, h) in zip(segments, stats):
    flag = '' if h >= e * 0.75 else '  ⚠ мало ядер'
    print(f"{s['text'][:44]:<46} {e:3}/{nu:3}/{h:3}   {s['start']:6.2f}→{s['end']:6.2f}{flag}")
