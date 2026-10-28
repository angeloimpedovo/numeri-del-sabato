// Logica pura: statistiche e generazione. Nessuna di queste funzioni prevede il futuro:
// le estrazioni sono indipendenti, le statistiche sono solo descrittive.
export const WHEELS = ['Bari', 'Cagliari', 'Firenze', 'Genova', 'Milano', 'Napoli', 'Palermo', 'Roma', 'Torino', 'Venezia', 'Nazionale']

const rand = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n

// draws: array di array di numeri (1..90), dal più vecchio al più recente
export function stats(draws, recentN = 100) {
  const freq = Array(91).fill(0)
  const recent = Array(91).fill(0)
  draws.slice(-recentN).forEach((nums) => nums.forEach((n) => recent[n]++))
  const delay = Array(91).fill(draws.length)
  draws.forEach((nums, i) => nums.forEach((n) => { freq[n]++; delay[n] = draws.length - 1 - i }))
  return Array.from({ length: 90 }, (_, k) => ({ n: k + 1, freq: freq[k + 1], delay: delay[k + 1], recent: recent[k + 1] }))
}

// Combinazioni che la gente gioca spesso: date (<=31), sequenze, stessa decina, progressioni.
// Evitarle non aumenta le probabilità, ma riduce il rischio di dividere il premio (SuperEnalotto).
export function isPopular(c) {
  const s = [...c].sort((a, b) => a - b)
  if (s.filter((n) => n <= 31).length > Math.ceil(s.length / 2)) return true
  for (let i = 2; i < s.length; i++) if (s[i] - s[i - 1] === 1 && s[i - 1] - s[i - 2] === 1) return true
  const decades = new Set(s.map((n) => Math.floor((n - 1) / 10)))
  if (decades.size <= Math.ceil(s.length / 3)) return true
  const step = s[1] - s[0]
  if (s.length > 2 && s.every((n, i) => i === 0 || n - s[i - 1] === step)) return true
  if (s.length > 2 && new Set(s.map((n) => n % 10)).size === 1) return true
  return false
}

// mode: 'casuale' | 'fortunati' (più usciti nelle ultime 100) | 'frequenti' | 'ritardatari'
export function generate(k, st, mode = 'casuale', exclude = new Set()) {
  const w = st.map((x) => (mode === 'frequenti' ? x.freq + 1 : mode === 'fortunati' ? (x.recent + 1) ** 2 : mode === 'ritardatari' ? x.delay + 1 : 1))
  for (let tries = 0; tries < 5000; tries++) {
    const pick = new Set()
    while (pick.size < k) {
      const tot = w.reduce((a, b, i) => a + (pick.has(i + 1) ? 0 : b), 0)
      let r = rand(tot)
      for (let i = 0; i < 90; i++) { if (pick.has(i + 1)) continue; r -= w[i]; if (r < 0) { pick.add(i + 1); break } }
    }
    const c = [...pick].sort((a, b) => a - b)
    if (!isPopular(c) && !exclude.has(c.join('-'))) return c
  }
  throw new Error('nessuna combinazione valida trovata')
}

export function nextSaturday(from = new Date()) {
  const d = new Date(from); d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Confronta una giocata con l'estrazione: quanti numeri presi
export const hits = (play, drawn) => play.filter((n) => drawn.includes(n)).length

// Probabilità reale di vincere con una giocata (1 su N): identica per qualsiasi combinazione.
export function odds(game, k) {
  if (game === 'superenalotto') return 622614630
  return [0, 18, 400.5, 11748, 511038, 43949268][k]
}

// --- Verifica schedine e calcolo vincite ---

// Estrae da testo (OCR o digitato) una combinazione per riga: numeri 1..90 distinti, almeno `min`.
export function parseLines(text, min = 1) {
  return text.split('\n')
    .map((l) => [...new Set((l.match(/\d{1,2}/g) || []).map(Number).filter((n) => n >= 1 && n <= 90))])
    .filter((c) => c.length >= min)
}

const C = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r }

// Lotto: quote lorde fisse per 1 € su una sola ruota
export const LOTTO_QUOTE = { 1: 11.23, 2: 250, 3: 4500, 4: 120000, 5: 6000000 }
export const LOTTO_SORTI = { 1: 'Estratto', 2: 'Ambo', 3: 'Terno', 4: 'Quaterna', 5: 'Cinquina' }

// nums giocati, wheelsDrawn: estrazioni (5 numeri) delle ruote giocate, bets: { sorte: importo € }
// La puntata di ogni sorte si divide tra le combinazioni possibili e tra le ruote.
export function lottoWin(nums, wheelsDrawn, bets) {
  let gross = 0
  for (const [t, amount] of Object.entries(bets)) {
    const k = +t, combos = C(nums.length, k)
    if (!amount || !combos) continue
    const unit = amount / combos / wheelsDrawn.length
    for (const w of wheelsDrawn) gross += C(hits(nums, w), k) * unit * LOTTO_QUOTE[k]
  }
  gross = Math.round(gross * 100) / 100
  return { gross, net: Math.round(gross * 0.92 * 100) / 100 } // ritenuta 8% sulle vincite del Lotto
}

// SuperEnalotto: una sestina, draw = [data, numeri, jolly, superstar], quote del concorso
export function seWin(nums, draw, quote, superstar = null) {
  const m = hits(nums, draw[1])
  const cat = m === 6 ? '6' : m === 5 && nums.includes(draw[2]) ? '5+1' : m >= 2 ? String(m) : null
  const ssHit = superstar != null && superstar === draw[3]
  const ssCat = ssHit ? (m === 6 ? null : `${m === 5 && cat === '5+1' ? 5 : m}S`) : null
  // quota 0 = nessun vincitore in quella categoria: il valore reale non è noto
  const base = cat ? quote?.[cat] || null : 0
  const ss = ssCat ? quote?.[ssCat] || null : 0
  if (base === null || ss === null) return { m, cat, ssHit, gross: null, net: null }
  const net = (v) => (v > 500 ? v - (v - 500) * 0.2 : v) // 20% sulla parte oltre 500 €
  return { m, cat, ssHit, gross: base + ss, net: Math.round((net(base) + net(ss)) * 100) / 100 }
}
