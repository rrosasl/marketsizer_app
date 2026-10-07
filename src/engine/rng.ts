/** A function returning uniform numbers in [0, 1). */
export type Rng = () => number

function splitmix32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x9e3779b9) | 0
    let t = a ^ (a >>> 16)
    t = Math.imul(t, 0x21f0aaad)
    t ^= t >>> 15
    t = Math.imul(t, 0x735a2d97)
    return (t ^ (t >>> 15)) >>> 0
  }
}

/**
 * Seeded sfc32 PRNG (Small Fast Counter, from PractRand). The 32-bit seed is expanded into the
 * 128-bit state with splitmix32. Same seed → same sequence, on every platform.
 */
export function createRng(seed: number): Rng {
  const init = splitmix32(seed)
  let a = init()
  let b = init()
  let c = init()
  let d = init()
  const next = (): number => {
    const t = (((a + b) | 0) + d) | 0
    d = (d + 1) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    c = (c + t) | 0
    return (t >>> 0) / 4294967296
  }
  for (let i = 0; i < 15; i++) next()
  return next
}

/** A random 32-bit seed for new scenarios (UI only; never used inside the engine). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0
}
