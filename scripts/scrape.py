"""Scarica lo storico Lotto e SuperEnalotto da estrazionedellotto.it in public/data/*.json."""
import json, re, sys, time, urllib.request
from datetime import date
from pathlib import Path

BASE = "https://www.estrazionedellotto.it"
OUT = Path(__file__).resolve().parent.parent / "public" / "data"
WHEELS = ["Bari", "Cagliari", "Firenze", "Genova", "Milano", "Napoli", "Palermo", "Roma", "Torino", "Venezia", "Nazionale"]

def get(url):
    for i in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (lotto-app archive)"})
            return urllib.request.urlopen(req, timeout=30).read().decode("utf8", "ignore")
        except Exception as e:
            if i == 3: raise
            time.sleep(2 + i * 3)

def iso(d):  # dd/mm/yyyy -> yyyy-mm-dd
    dd, mm, yy = d.split("/"); return f"{yy}-{mm}-{dd}"

def parse_lotto(html):
    out = []
    for block in html.split('class="lottoDraws"')[1:]:
        m = re.search(r"del (\d\d/\d\d/\d{4})", block)
        if not m: continue
        wheels = [None] * len(WHEELS)
        for name, balls in re.findall(r'wheelTitle[^>]*>([^<]+)</li>(.*?)</ul>', block, re.S):
            name = name.strip()
            nums = [int(x) for x in re.findall(r'class="ball">(\d+)<', balls)]
            if name in WHEELS and len(nums) == 5:
                wheels[WHEELS.index(name)] = nums
        if any(wheels): out.append([iso(m.group(1)), wheels])
    return out

def parse_se(html):
    out = []
    for block in html.split('class="lottoDraws"')[1:]:
        m = re.search(r"<strong>(\d\d/\d\d/\d{4})</strong>", block)
        nums = [int(x) for x in re.findall(r'class="ball ball">(\d+)<', block)]
        j = re.search(r'class="ball jolly">(\d+)<', block)
        s = re.search(r'class="ball superstar">(\d+)<', block)
        if m and len(nums) == 6:
            out.append([iso(m.group(1)), nums, int(j.group(1)) if j else None, int(s.group(1)) if s else None])
    return out

def scrape(kind, first_year):
    path = OUT / f"{kind}.json"
    old = json.loads(path.read_text()) if path.exists() else []
    # incrementale: riscarica solo dall'anno dell'ultima estrazione salvata
    start = int(old[-1][0][:4]) if old else first_year
    keep = [d for d in old if int(d[0][:4]) < start]
    new = []
    for y in range(start, date.today().year + 1):
        url = f"{BASE}/risultati/archivio-lotto-{y}" if kind == "lotto" else f"{BASE}/superenalotto/risultati/archivio-superenalotto-{y}"
        rows = (parse_lotto if kind == "lotto" else parse_se)(get(url))
        print(kind, y, len(rows), file=sys.stderr)
        new += rows
        time.sleep(0.5)
    data = sorted({d[0]: d for d in keep + new}.values(), key=lambda d: d[0])
    assert len(data) >= len(old), "lo scrape ha perso estrazioni, non sovrascrivo"
    path.write_text(json.dumps(data, separators=(",", ":")))
    print(kind, "totale", len(data), file=sys.stderr)

QKEYS = {"Punti 6": "6", "Punti 5 + Jolly": "5+1", "Punti 5": "5", "Punti 4": "4", "Punti 3": "3", "Punti 2": "2",
         "Punti 5 + Superstar": "5S", "Punti 4 + Superstar": "4S", "Punti 3 + Superstar": "3S",
         "Punti 2 + Superstar": "2S", "Punti 1 + Superstar": "1S", "Punti 0 + Superstar": "0S"}

def parse_quote(html):
    q = {}
    for name, val in re.findall(r'<td class="lottoBG colorWH">([^<]+)</td>\s*<td>([\d.,]+) &euro;', html):
        if name.strip() in QKEYS: q[QKEYS[name.strip()]] = float(val.replace(".", "").replace(",", "."))
    return q

def scrape_quote(since="2025-01-01"):
    # quote premi SuperEnalotto: una pagina per concorso, quindi solo quelli recenti
    path = OUT / "superenalotto_quote.json"
    q = json.loads(path.read_text()) if path.exists() else {}
    for d in json.loads((OUT / "superenalotto.json").read_text()):
        if d[0] < since or d[0] in q: continue
        y, m, dd = d[0].split("-")
        got = parse_quote(get(f"{BASE}/superenalotto/risultati/superenalotto-estrazione-del-{dd}-{m}-{y}"))
        if "2" in got: q[d[0]] = got
        time.sleep(0.3)
    path.write_text(json.dumps(q, separators=(",", ":"), sort_keys=True))
    print("quote", len(q), file=sys.stderr)

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    scrape("lotto", 1871)
    scrape("superenalotto", 1997)
    scrape_quote()
