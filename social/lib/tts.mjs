/* Ukrainian voice-over with Gemini TTS (Interactions API): text → WAV (24 kHz, mono, 16-bit). A few cents per clip. */
import { http, short, log } from './util.mjs';

export const TTS_MODEL = 'gemini-3.8-flash-tts';
export const TTS_VOICE = 'Orus';            // firm, low — a noir narrator; others: Charon (informative), Algenib (gravelly), Kore (firm, female)
const STYLE = 'low, calm, intriguing film-noir narrator; natural Ukrainian pronunciation; unhurried';

export async function ttsWav({ apiKey, base = 'https://generativelanguage.googleapis.com/v1beta', text, voice = TTS_VOICE, model = TTS_MODEL, style = STYLE }) {
  base = base.replace(/\/$/, '');
  const body = { model, input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] }] }],
    response_format: { type: 'audio', mime_type: 'audio/wav', sample_rate: 24000 }, generation_config: { speech_config: [{ voice }] } };
  const r = await http(`${base}/interactions`, { method: 'POST', headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, { tries: 3, wait: 8000, label: 'tts' });
  if (!r.json || r.status >= 300) throw new Error(`TTS: HTTP ${r.status} ${short(r.json && r.json.error ? r.json.error.message : r.text, 200)}`);
  const steps = (r.json.steps || []).filter(s => s.type === 'model_output');
  let data = null;
  for (const s of steps) for (const c of s.content || []) if (c.type === 'audio' && c.data) data = c.data;
  if (!data && r.json.output_audio && r.json.output_audio.data) data = r.json.output_audio.data;
  if (!data) throw new Error('TTS: no audio in the answer ' + short(r.json, 200));
  const bytes = Buffer.from(data, 'base64');
  log(`  tts: ${model} / ${voice}, ${(bytes.length / 1024).toFixed(0)} KB`);
  return bytes.subarray(0, 4).toString() === 'RIFF' ? bytes : pcmToWav(bytes, 24000);
}
/* raw 16-bit mono PCM → WAV */
export function pcmToWav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
