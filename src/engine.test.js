import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stats, isPopular, generate, nextSaturday, hits, odds } from './engine.js'

test('stats conta frequenza e ritardo', () => {
  const st = stats([[1, 2], [2, 3]])
  assert.equal(st[1].freq, 2); assert.equal(st[1].delay, 0)
  assert.equal(st[0].delay, 1); assert.equal(st[89].delay, 2)
})

test('isPopular riconosce schemi comuni', () => {
  assert.ok(isPopular([1, 2, 3, 40, 60, 80]))      // sequenza
  assert.ok(isPopular([3, 7, 12, 18, 25, 70]))     // date
  assert.ok(isPopular([10, 20, 30, 40, 50, 60]))   // progressione
  assert.ok(!isPopular([4, 23, 38, 51, 67, 89]))
})

test('generate rispetta i vincoli', () => {
  const st = stats([[1, 2, 3, 4, 5, 6]])
  for (const mode of ['casuale', 'fortunati', 'frequenti', 'ritardatari']) for (let i = 0; i < 200; i++) {
    const c = generate(6, st, mode)
    assert.equal(new Set(c).size, 6)
    assert.ok(c.every((n) => n >= 1 && n <= 90))
    assert.ok(!isPopular(c))
  }
  const ambo = generate(2, st); assert.equal(ambo.length, 2)
})

test('nextSaturday e hits', () => {
  assert.equal(nextSaturday(new Date('2026-10-28T12:00:00')), '2026-10-31')
  assert.equal(nextSaturday(new Date('2026-10-31T12:00:00')), '2026-10-31')
  assert.equal(hits([1, 2, 3], [3, 2, 9]), 2)
})

test('odds', () => {
  assert.equal(odds('superenalotto', 6), 622614630)
  assert.equal(odds('lotto', 2), 400.5)
})

import { parseLines, lottoWin, seWin } from './engine.js'

test('parseLines', () => {
  assert.deepEqual(parseLines('A 05 12 33 47 61 88\nTOT 2,00\n7-7-91', 6), [[5, 12, 33, 47, 61, 88]])
  assert.deepEqual(parseLines('12 45\n'), [[12, 45]])
})

test('lottoWin', () => {
  // ambo secco 1 € su una ruota, preso: 250 lordi
  assert.deepEqual(lottoWin([10, 20], [[10, 20, 1, 2, 3]], { 2: 1 }), { gross: 250, net: 230 })
  // 3 numeri, ambo 3 €, su 2 ruote, preso 1 ambo su una ruota: 3/3/2*250 = 125
  assert.equal(lottoWin([1, 2, 3], [[1, 2, 50, 60, 70], [80, 81, 82, 83, 84]], { 2: 3 }).gross, 125)
  assert.equal(lottoWin([1, 2], [[5, 6, 7, 8, 9]], { 2: 1 }).gross, 0)
})

test('seWin', () => {
  const draw = ['2026-10-27', [23, 34, 44, 48, 64, 70], 29, 28]
  const q = { 6: 4e7, '5+1': 0, 5: 33240.22, 4: 437.05, 3: 32.38, 2: 6.14, '3S': 3238, '0S': 5 }
  assert.equal(seWin([23, 34, 44, 1, 2, 3], draw, q).gross, 32.38)
  assert.equal(seWin([23, 34, 44, 1, 2, 3], draw, q, 28).gross, 32.38 + 3238)
  assert.equal(seWin([1, 2, 3, 4, 5, 6], draw, q).gross, 0)
  assert.equal(seWin([1, 2, 3, 4, 5, 6], draw, q, 28).gross, 5)
  assert.equal(seWin([23, 34, 44, 48, 64, 1], draw, q).net, 26692.18) // 33240.22 - 20% oltre 500 €
  assert.equal(seWin([23, 34, 44, 48, 64, 1], draw, null).gross, null)
  assert.equal(seWin([23, 34, 44, 48, 64, 29], draw, q).gross, null) // 5+1 senza vincitori
})
