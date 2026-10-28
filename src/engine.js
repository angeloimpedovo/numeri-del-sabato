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
