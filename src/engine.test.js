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
