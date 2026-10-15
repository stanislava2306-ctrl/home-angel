#!/usr/bin/env python3
"""Выравнивание известного сценария по реальному звуку (whisper в этой сессии недоступен).

1. RMS-огибающая 10 мс → речевые сегменты и список пауз.
2. Динамика (DP): границы предложений сценария раскладываются по НАСТОЯЩИМ паузам так,
   чтобы длительность каждого предложения была как можно ближе к его слоговой «норме».
   Граница может остаться без паузы — тогда она делится пропорционально слогам.
3. Слова внутри предложения — по речевому времени пропорционально слогам.
Выход: words.json (формат transcribe.py) + печать таблицы для сверки.
"""
import json, subprocess, sys, re
import numpy as np

SRC, SCRIPT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
HOP = 0.010
VOW = set('аеёиоуыэюя')

pcm = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', SRC, '-vn', '-ac', '1', '-ar', '16000',
                      '-f', 's16le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(pcm, '<i2').astype(np.float32) / 32768.0
sr, hop = 16000, 160
n = len(x) // hop
db = 20 * np.log10(np.maximum(1e-9, np.sqrt(np.array([(x[i*hop:(i+1)*hop]**2).mean() for i in range(n)]))))
pad = np.pad(db, (3, 3), mode='edge')
sm = np.array([pad[i:i+7].max() for i in range(n)])          # межслоговые провалы не считаем паузой
DUR = n * HOP
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
segs = [(a, b) for v, a, b in runs(sm >= THR) if v]
def speech_to(t):                                            # «чистая речь» от 0 до t
    return sum(max(0.0, min(b, t) - a) for a, b in segs)
SPEECH = speech_to(DUR)

phr = [l.strip() for l in open(SCRIPT, encoding='utf-8') if l.strip()]
def syl(w):
    return max(1, sum(1 for c in w.lower() if c in VOW))
W = []
for p in phr:
    ws = [w for w in re.findall(r"[\w«»ёЁ-]+", p) if re.search(r'\w', w)]
    W.append({'text': p, 'words': ws, 'syl': sum(syl(w) for w in ws)})
TOT = sum(p['syl'] for p in W)
K = SPEECH / TOT                                             # секунд речи на слог
N = len(W)

# ---- DP: какие границы предложений сидят на каких паузах
cand = [0.0] + [ (a + b) / 2 for a, b in pauses ] + [DUR]    # 0 и конец — жёсткие якоря
cs = [speech_to(t) for t in cand]
P = len(cand)
cum = [0]
for p in W:
    cum.append(cum[-1] + p['syl'])

INF = float('inf')
# dp[i][p] — граница после предложения i стоит в точке cand[p]
dp = [[INF] * P for _ in range(N + 1)]
bk = [[None] * P for _ in range(N + 1)]
dp[0][0] = 0.0
for i in range(1, N + 1):
    for p in range(1, P):
        best, barg = INF, None
        for j in range(0, i):
            for q in range(0, p):
                if dp[j][q] == INF:
                    continue
                got = cs[p] - cs[q]
                want = K * (cum[i] - cum[j])
                gap = i - j                                   # сколько предложений без паузы внутри
                c = dp[j][q] + (got - want) ** 2 / max(1.0, want) + 0.35 * (gap - 1)
                if c < best:
                    best, barg = c, (j, q)
        dp[i][p], bk[i][p] = best, barg
# конец обязан быть последним кандидатом
i, p = N, P - 1
anchor = {N: cand[p]}
while bk[i][p]:
    j, q = bk[i][p]
    anchor[j] = cand[q]
    i, p = j, q

# ---- времена предложений: якоря + пропорциональное деление между ними
bounds = [None] * (N + 1)
for i, t in anchor.items():
    bounds[i] = t
def t_of_speech(sp):
    acc = 0.0
    for a, b in segs:
        d = b - a
        if sp <= acc + d:
            return a + (sp - acc)
        acc += d
    return segs[-1][1]
i = 0
while i <= N:
    if bounds[i] is None:
        i += 1
        continue
    j = i + 1
    while j <= N and bounds[j] is None:
        j += 1
    if j <= N and j > i + 1:
        s0, s1 = speech_to(bounds[i]), speech_to(bounds[j])
        base = cum[i]
        span = cum[j] - cum[i]
        for m in range(i + 1, j):
            bounds[m] = t_of_speech(s0 + (s1 - s0) * (cum[m] - base) / span)
    i = j

segments = []
for i, p in enumerate(W):
    t0, t1 = bounds[i], bounds[i + 1]
    s0, s1 = speech_to(t0), speech_to(t1)
    tot = sum(syl(w) for w in p['words'])
    acc, words = 0.0, []
    for w in p['words']:
        a, acc = acc, acc + syl(w)
        words.append({'word': w,
                      'start': round(t_of_speech(s0 + (s1 - s0) * a / tot), 3),
                      'end': round(t_of_speech(s0 + (s1 - s0) * acc / tot), 3),
                      'probability': 0.5})
    segments.append({'start': round(t0, 3), 'end': round(t1, 3), 'text': p['text'], 'words': words})

json.dump(segments, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'речь {SPEECH:.1f} с из {DUR:.1f} с, пауз ≥0.2 с: {len(pauses)}, темп {1/K:.1f} слог/с')
for i, s in enumerate(segments):
    mark = '⚓' if i in anchor or (i + 1) in anchor else ' '
    print(f"{mark} {s['start']:6.2f} → {s['end']:6.2f} ({s['end']-s['start']:5.2f})  {s['text'][:62]}")
