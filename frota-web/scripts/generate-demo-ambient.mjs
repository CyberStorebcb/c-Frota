/**
 * Gera loop ambiente suave para fundo da narração do demo.
 * Tom discreto (pad) — pensado para volume baixo (~7%) durante a voz.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '../public/demo-narration')
const OUT_FILE = join(OUT_DIR, 'ambient-bg.wav')

const SAMPLE_RATE = 44100
/** Duração do loop — modulação lenta completa 1 ciclo = loop sem salto audível */
const DURATION_SEC = 24

function synthSample(t) {
  const swell = 0.55 + 0.45 * Math.sin(2 * Math.PI * t / DURATION_SEC)
  const a2 = Math.sin(2 * Math.PI * 110 * t)
  const e3 = Math.sin(2 * Math.PI * 164.81 * t) * 0.55
  const a3 = Math.sin(2 * Math.PI * 220 * t) * 0.35
  const breath = Math.sin(2 * Math.PI * 0.7 * t) * 0.08
  // Amplitude aumentada para ~80% do máximo (era 0.48, resultava em -10 dBFS)
  return ((a2 + e3 + a3) / 3 + breath) * swell * 0.82
}

function encodeWav(samples, sampleRate) {
  const numSamples = samples.length
  const dataSize = numSamples * 2
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2)
  }

  return buffer
}

mkdirSync(OUT_DIR, { recursive: true })

const total = SAMPLE_RATE * DURATION_SEC
const samples = new Float64Array(total)
for (let i = 0; i < total; i++) {
  samples[i] = synthSample(i / SAMPLE_RATE)
}

writeFileSync(OUT_FILE, encodeWav(samples, SAMPLE_RATE))
console.log(`Ambiente gerado: public/demo-narration/ambient-bg.wav (${DURATION_SEC}s loop)`)
