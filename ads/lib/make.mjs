/* Ad media from a brief with Gemini: a video (Veo 3.1 Fast, 8 s, 9:16 + Ukrainian voice-over by Gemini TTS + title + end card, finished by
   ffmpeg — the same pipeline as the daily Reels, social/lib) or a picture (Imagen 4 Fast, 9:16 + title + bottom band drawn by ffmpeg,
   so the Ukrainian is always spelled right). Texts sit between y≈300 and y≈1620: the feed crops 9:16 to 4:5. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { veoGenerate, VeoBlocked } from '../../social/lib/veo.mjs';
import { finishVideo, cardArt, fontFile, wrap, CARD } from '../../social/lib/video.mjs';
import { ttsWav } from '../../social/lib/tts.mjs';
import { binary, http, log, short } from '../../social/lib/util.mjs';

export const AD_CARD = Object.assign({}, CARD, { lines: ['Грай у Telegram', 'Безкоштовно · mafiapro.app', '@mafiaprof_bot'] });
export const SAFE = ' Keep it family-friendly: no weapons, no violence, no blood, no alcohol, no real people or brands, no text, letters or logos anywhere in the frame.';
const NO_SPEECH = ' No spoken words or dialogue in the clip: ambient sound and music only.';
export const MODELS = { video: 'veo-3.1-fast-generate-preview', image: 'imagen-4.0-fast-generate-001' };
export const COST = { video: 0.12 * 8 + 0.02, image: 0.02 };   // USD: Veo 3.1 Fast 1080p $0.12/s + TTS; Imagen 4 Fast $0.02 a picture

export class Blocked extends Error {}

export async function makeVideo(b, { apiKey, base, appBase = 'https://mafiapro.app/', logo, resolution = '1080p', pollMs, take = 1 }) {
  const refs = [];
  for (const id of b.refs) { try { refs.push(cardArt(await binary(`${appBase.replace(/\/?$/, '/')}cards/uk/${id}.png`))); } catch (e) { log(`::warning::reference ${id}: ${e.message} — skipped`); } }
  let voice = null;
  if (b.voice) { try { voice = await ttsWav({ apiKey, base, text: b.voice }); } catch (e) { log(`::warning::voice-over: ${e.message} — the video goes without the voice`); } }
  const variant = take > 1 ? ` A fresh take: a different camera angle and staging than before (take ${take}).` : '';
  let raw = null, tries = 0;
  for (const prompt of [b.prompt + variant + NO_SPEECH, b.prompt + variant + NO_SPEECH + SAFE]) {
    tries++;
    try { raw = await veoGenerate({ apiKey, base, model: MODELS.video, prompt, refs, resolution, pollMs }); break; }
    catch (e) { if (e instanceof VeoBlocked && tries === 1) { log(`  ${e.message} — retrying with a softer prompt (a blocked video is not charged)`); continue; } if (e instanceof VeoBlocked) throw new Blocked(e.message); throw e; }
  }
  const fin = finishVideo(raw, { logo, card: AD_CARD, voice, title: b.title, subtitles: voice ? b.voice.split(/(?<=[.!?…])\s+/).filter(Boolean) : [], titleY: 330 });
  const thumbFile = path.join(fin.dir, 'thumb.jpg');
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', '1.6', '-i', fin.file, '-frames:v', '1', '-q:v', '3', thumbFile], { stdio: ['ignore', 'ignore', 'pipe'] });
  log(`  video: ${fin.info.width}×${fin.info.height}, ${fin.info.duration.toFixed(1)} s, ${(fin.bytes.length / 1e6).toFixed(1)} MB${fin.voice ? `, voice ${fin.voice.seconds} s` : ', no voice'}`);
  return { bytes: fin.bytes, thumb: fs.readFileSync(thumbFile), info: fin.info, costUsd: COST.video };
}

async function imagen({ apiKey, base = 'https://generativelanguage.googleapis.com/v1beta', prompt }) {
  base = base.replace(/\/$/, '');
  const r = await http(`${base}/models/${MODELS.image}:predict`, { method: 'POST', headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: '9:16', personGeneration: 'allow_adult' } }) }, { tries: 3, wait: 8000, label: 'imagen' });
  if (!r.json || r.status >= 300) throw new Error(`Imagen: HTTP ${r.status} ${short(r.json && r.json.error ? r.json.error.message : r.text, 200)}`);
  const p = (r.json.predictions || []).find(x => x.bytesBase64Encoded);
  if (!p) throw new Blocked('Imagen returned no picture (safety filters): ' + short(r.json.predictions || r.json, 200));
  return Buffer.from(p.bytesBase64Encoded, 'base64');
}
export async function makeImage(b, { apiKey, base, take = 1 }) {
  const variant = take > 1 ? ` A fresh composition, different from the previous one (take ${take}).` : '';
  let raw = null;
  try { raw = await imagen({ apiKey, base, prompt: b.prompt + variant }); }
  catch (e) { if (!(e instanceof Blocked)) throw e; log(`  ${e.message} — retrying with a softer prompt`); raw = await imagen({ apiKey, base, prompt: b.prompt + variant + SAFE }); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ads-img-')); const inF = path.join(dir, 'in.png'), out = path.join(dir, 'ad.jpg'); fs.writeFileSync(inF, raw);
  const font = fontFile(); const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, '’');
  const tf = (n, s) => { const f = path.join(dir, n); fs.writeFileSync(f, s); return f.replace(/\\/g, '/').replace(/:/g, '\\:'); };
  const draw = font ? [
    `drawtext=fontfile='${esc(font)}':textfile='${tf('t.txt', wrap(b.title, 18))}':fontcolor=${AD_CARD.gold}:fontsize=74:line_spacing=12:x=(w-text_w)/2:y=360:box=1:boxcolor=0x0d0c14@0.62:boxborderw=26`,
    `drawbox=x=0:y=1440:w=iw:h=170:color=0x0d0c14@0.78:t=fill`,
    `drawtext=fontfile='${esc(font)}':textfile='${tf('b.txt', 'Грай у Telegram')}':fontcolor=${AD_CARD.gold}:fontsize=60:x=(w-text_w)/2:y=1468`,
    `drawtext=fontfile='${esc(font)}':textfile='${tf('c.txt', '@mafiaprof_bot · безкоштовно')}':fontcolor=${AD_CARD.light}:fontsize=42:x=(w-text_w)/2:y=1546`] : [];
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', inF, '-vf', ['scale=1080:1920:force_original_aspect_ratio=increase', 'crop=1080:1920', ...draw].join(','), '-frames:v', '1', '-q:v', '2', out], { stdio: ['ignore', 'ignore', 'pipe'] });
  const bytes = fs.readFileSync(out); log(`  image: 1080×1920, ${(bytes.length / 1024).toFixed(0)} KB${font ? '' : ', no font: text not drawn'}`);
  return { bytes, costUsd: COST.image };
}
