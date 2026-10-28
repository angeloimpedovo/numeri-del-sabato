import { useState } from 'react'
import { WHEELS, parseLines, lottoWin, seWin, hits, LOTTO_SORTI } from './engine.js'

const eur = (v) => v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

export default function Checker({ se, lotto, quote }) {
  const [game, setGame] = useState('superenalotto')
  const [date, setDate] = useState(se.at(-1)[0])
  const [text, setText] = useState('')
  const [superstar, setSuperstar] = useState('')
  const [wheels, setWheels] = useState([0])
  const [bets, setBets] = useState({ 2: 1 })
  const [ocr, setOcr] = useState('')

  const draws = game === 'superenalotto' ? se : lotto
  const draw = draws.find((d) => d[0] === date)
  const combos = parseLines(text, game === 'superenalotto' ? 6 : 1)

  const scan = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setOcr('Lettura della schedina in corso…')
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng')
      await worker.setParameters({ tessedit_char_whitelist: '0123456789 -.,/' })
      const { data } = await worker.recognize(file)
      await worker.terminate()
      const found = parseLines(data.text, game === 'superenalotto' ? 6 : 2)
      setText(found.map((c) => c.join(' ')).join('\n'))
      setOcr(found.length ? `Trovate ${found.length} righe. Controlla i numeri prima di verificare.` : 'Nessuna combinazione riconosciuta. Prova con più luce, oppure scrivi i numeri a mano.')
    } catch {
      setOcr('Lettura non riuscita. Scrivi i numeri a mano.')
    }
  }

  const switchGame = (g) => { setGame(g); setDate((g === 'superenalotto' ? se : lotto).at(-1)[0]); setText('') }
  const toggleWheel = (i) => setWheels((w) => (w.includes(i) ? w.filter((x) => x !== i) : [...w, i].sort((a, b) => a - b)))

  let total = { gross: 0, net: 0 }, unknown = false
  const rows = draw ? combos.map((c) => {
    if (game === 'superenalotto') {
      const r = seWin(c.slice(0, 6), draw, quote[date], superstar === '' ? null : +superstar)
      if (r.gross === null) unknown = true; else { total.gross += r.gross; total.net += r.net }
      return { c: c.slice(0, 6), hit: draw[1], label: `${r.m} punti${r.cat === '5+1' ? ' + Jolly' : ''}${r.ssHit ? ' + SuperStar' : ''}`, r }
    }
    const drawn = wheels.map((i) => draw[1][i]).filter(Boolean)
    const r = drawn.length ? lottoWin(c, drawn, bets) : { gross: 0, net: 0 }
    total.gross += r.gross; total.net += r.net
    return { c, hit: drawn.flat(), label: wheels.map((i) => draw[1][i] ? `${WHEELS[i]}: ${hits(c, draw[1][i])}` : `${WHEELS[i]}: –`).join(' · '), r }
  }) : []

  return (
    <section className="card">
      <h2>Verifica schedina</h2>
      <div className="tabs" role="tablist">
        {['superenalotto', 'lotto'].map((g) => (
          <button key={g} role="tab" aria-selected={game === g} className={game === g ? 'on' : ''} onClick={() => switchGame(g)}>{g === 'superenalotto' ? 'SuperEnalotto' : 'Lotto'}</button>
        ))}
      </div>

      <div className="controls">
        <label>Estrazione <select value={date} onChange={(e) => setDate(e.target.value)}>
          {draws.slice(-60).reverse().map((d) => <option key={d[0]} value={d[0]}>{new Date(d[0]).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</option>)}
        </select></label>
        {game === 'superenalotto' && <label>SuperStar giocato <input type="number" min="1" max="90" inputMode="numeric" value={superstar} onChange={(e) => setSuperstar(e.target.value)} placeholder="nessuno" /></label>}
        <label className="file">📷 Scansiona schedina<input type="file" accept="image/*" capture="environment" onChange={scan} /></label>
      </div>

      {game === 'lotto' && <>
        <fieldset className="wheels"><legend>Ruote giocate</legend>
          {WHEELS.map((w, i) => <label key={w}><input type="checkbox" checked={wheels.includes(i)} onChange={() => toggleWheel(i)} /> {w}</label>)}
        </fieldset>
        <fieldset className="wheels"><legend>Importo per sorte (€)</legend>
          {Object.entries(LOTTO_SORTI).map(([k, name]) => (
            <label key={k}>{name} <input type="number" min="0" step="0.5" inputMode="decimal" value={bets[k] ?? ''} onChange={(e) => setBets({ ...bets, [k]: +e.target.value || 0 })} /></label>
          ))}
        </fieldset>
      </>}

      {ocr && <p className="muted small" role="status">{ocr}</p>}
      <label className="block">Numeri giocati, una combinazione per riga
        <textarea rows="4" value={text} onChange={(e) => setText(e.target.value)} placeholder={game === 'superenalotto' ? '5 12 33 47 61 88' : '12 45 78'} />
      </label>

      {rows.length > 0 && <ul className="plays">
        {rows.map((x, i) => <li key={i}>
          <span className="balls">{x.c.map((n) => <span key={n} className={'ball' + (x.hit.includes(n) ? ' hit' : '')}>{n}</span>)}</span>
          <span className="muted">{x.label}</span>
          <strong>{x.r.gross === null ? 'quota non disponibile' : x.r.gross ? eur(x.r.gross) : '–'}</strong>
        </li>)}
      </ul>}
      {rows.length > 0 && <p className="total">
        Vincita lorda <strong>{eur(total.gross)}</strong> · netta stimata <strong>{eur(total.net)}</strong>{unknown && ' più le righe senza quota'}
      </p>}
      <p className="note">
        {game === 'superenalotto'
          ? 'Quote ufficiali del concorso. Netto: ritenuta del 20% sulla parte di ogni vincita oltre 500 €. Le quote sono disponibili dal 2025.'
          : 'Quote fisse per 1 € su una ruota, divise tra combinazioni e ruote giocate. Netto: ritenuta dell’8%.'}
        {' '}La verifica è indicativa: fa fede solo il controllo in ricevitoria.
      </p>
    </section>
  )
}
