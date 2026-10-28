import { useEffect, useMemo, useState } from 'react'
import { WHEELS, stats, generate, nextSaturday, hits, odds } from './engine.js'

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage non disponibile */ } }
const Balls = ({ nums, hit = [] }) => (
  <span className="balls">{nums.map((n) => <span key={n} className={'ball' + (hit.includes(n) ? ' hit' : '')}>{n}</span>)}</span>
)

export default function App() {
  const [se, setSe] = useState(null)
  const [lotto, setLotto] = useState(null)
  const [err, setErr] = useState('')
  const [game, setGame] = useState('superenalotto')
  const [mode, setMode] = useState('casuale')
  const [wheel, setWheel] = useState(0)
  const [size, setSize] = useState(2)
  const [count, setCount] = useState(3)
  const [proposals, setProposals] = useState([])
  const [plays, setPlays] = useState(() => load('plays', []))
  const saturday = nextSaturday()

  useEffect(() => {
    Promise.all(['superenalotto', 'lotto'].map((f) => fetch(`data/${f}.json`).then((r) => { if (!r.ok) throw new Error(f); return r.json() })))
      .then(([a, b]) => { setSe(a); setLotto(b) })
      .catch(() => setErr('Impossibile caricare lo storico delle estrazioni.'))
  }, [])

  const draws = useMemo(() => {
    if (game === 'superenalotto') return se ? se.map((d) => d[1]) : []
    return lotto ? lotto.map((d) => d[1][wheel]).filter(Boolean) : []
  }, [game, se, lotto, wheel])
  const st = useMemo(() => stats(draws), [draws])
  const past = useMemo(() => new Set(game === 'superenalotto' ? draws.map((d) => [...d].sort((a, b) => a - b).join('-')) : []), [game, draws])

  const k = game === 'superenalotto' ? 6 : size
  const propose = () => setProposals(Array.from({ length: count }, () => generate(k, st, mode, past)))
  const keep = () => {
    const next = [...plays, ...proposals.map((nums) => ({ date: saturday, game, wheel: game === 'lotto' ? wheel : null, nums }))]
    setPlays(next); save('plays', next); setProposals([])
  }
  const remove = (i) => { const next = plays.filter((_, j) => j !== i); setPlays(next); save('plays', next) }

  const drawFor = (p) => {
    if (p.game === 'superenalotto') { const d = se?.find((x) => x[0] === p.date); return d && d[1] }
    const d = lotto?.find((x) => x[0] === p.date); return d && d[1][p.wheel]
  }

  if (err) return <main><p className="error">{err}</p></main>
  if (!se || !lotto) return <main><p>Caricamento storico…</p></main>

  const last = game === 'superenalotto' ? se.at(-1) : lotto.at(-1)
  const top = [...st].sort((a, b) => b.freq - a.freq).slice(0, 10)
  const late = [...st].sort((a, b) => b.delay - a.delay).slice(0, 10)

  return (
    <main>
      <header>
        <h1>Numeri del Sabato</h1>
        <p className="muted">Prossima estrazione di sabato: <strong>{new Date(saturday).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</strong></p>
      </header>

      <section className="card">
        <div className="tabs" role="tablist">
          {['superenalotto', 'lotto'].map((g) => (
            <button key={g} role="tab" aria-selected={game === g} className={game === g ? 'on' : ''} onClick={() => { setGame(g); setProposals([]) }}>
              {g === 'superenalotto' ? 'SuperEnalotto' : 'Lotto'}
            </button>
          ))}
        </div>

        <div className="controls">
          {game === 'lotto' && <>
            <label>Ruota <select value={wheel} onChange={(e) => setWheel(+e.target.value)}>{WHEELS.map((w, i) => <option key={w} value={i}>{w}</option>)}</select></label>
            <label>Giocata <select value={size} onChange={(e) => setSize(+e.target.value)}>{[[1, 'Estratto'], [2, 'Ambo'], [3, 'Terno'], [4, 'Quaterna'], [5, 'Cinquina']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          </>}
          <label>Criterio <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="casuale">Casuale</option><option value="fortunati">Numeri fortunati</option><option value="frequenti">Più frequenti</option><option value="ritardatari">Ritardatari</option>
          </select></label>
          <label>Quante <select value={count} onChange={(e) => setCount(+e.target.value)}>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n}>{n}</option>)}</select></label>
          <button className="primary" onClick={propose}>Genera</button>
        </div>

        {proposals.length > 0 && <div className="proposals">
          {proposals.map((p, i) => <div key={i}><Balls nums={p} /></div>)}
          <p className="muted small">
            Probabilità di vincita di ciascuna: 1 su {odds(game, k).toLocaleString('it-IT')} ({(100 / odds(game, k)).toLocaleString('it-IT', { maximumSignificantDigits: 2 })}%).
            {mode === 'fortunati' && ' I numeri fortunati sono quelli usciti più spesso nelle ultime 100 estrazioni: la probabilità resta la stessa.'}
          </p>
          <button onClick={keep}>Salva come giocate per sabato</button>
        </div>}

        <p className="note">
          Le estrazioni sono casuali e indipendenti, quindi nessun criterio aumenta le probabilità di vincita.
          {game === 'superenalotto'
            ? ' Le combinazioni escludono date, sequenze e sestine già uscite: se vinci, dividi il premio con meno persone.'
            : ' Al Lotto i premi sono fissi, quindi il criterio scelto non cambia nulla.'}
        </p>
      </section>

      {plays.length > 0 && <section className="card">
        <h2>Le tue giocate</h2>
        <ul className="plays">
          {plays.map((p, i) => {
            const d = drawFor(p)
            return <li key={i}>
              <span className="muted">{p.date} · {p.game === 'superenalotto' ? 'SE' : WHEELS[p.wheel]}</span>
              <Balls nums={p.nums} hit={d || []} />
              <span>{d ? `${hits(p.nums, d)} presi` : 'in attesa'}</span>
              <button className="link" aria-label="Elimina giocata" onClick={() => remove(i)}>×</button>
            </li>
          })}
        </ul>
      </section>}

      <section className="card">
        <h2>Ultima estrazione · {last[0]}</h2>
        {game === 'superenalotto'
          ? <p><Balls nums={last[1]} /> <span className="muted">Jolly {last[2]} · SuperStar {last[3] ?? '–'}</span></p>
          : last[1][wheel] ? <p><Balls nums={last[1][wheel]} /></p> : <p className="muted">Ruota non presente.</p>}
        <div className="grid2">
          <div><h3>Più frequenti</h3><ol>{top.map((x) => <li key={x.n}><b>{x.n}</b> <span className="muted">{x.freq} volte</span></li>)}</ol></div>
          <div><h3>Ritardatari</h3><ol>{late.map((x) => <li key={x.n}><b>{x.n}</b> <span className="muted">da {x.delay} estr.</span></li>)}</ol></div>
        </div>
        <p className="muted small">Storico: {draws.length} estrazioni{game === 'lotto' ? ` sulla ruota di ${WHEELS[wheel]}` : ''}, dal {(game === 'superenalotto' ? se : lotto).find((d) => game === 'superenalotto' || d[1][wheel])[0]}.</p>
      </section>
    </main>
  )
}
