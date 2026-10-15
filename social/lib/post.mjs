/* A daily post file: social/posts/YYYY-MM-DD.md

   ---
   date: 2026-10-15
   rubric: Роль дня
   hook: таємниця
   refs: sheriff, don                 (our characters: up to 3 role ids — the art of their cards (uk) goes to Veo as reference images)
   title: Шериф не спить              (Ukrainian text on screen for the first seconds, ≤ 34 characters)
   voice: Шериф не спить. Одна перевірка за ніч — і хтось за столом уже нервує.   (Ukrainian voice-over, ≤ 140 characters; "none" = no voice)
   image: og/uk.png                   (optional first frame instead of refs; not together with refs)
   model: fast                        (optional: fast | lite | standard; default fast)
   ---
   ## prompt
   <English prompt for Veo: one 8-second vertical scene with the characters of the reference images, no text, no speech>
   ## uk
   <Ukrainian caption, plain text>
   ## en
   <English caption, plain text>
   ## tags
   #мафія #mafia #настільніігри #boardgames #telegram        (5 at most: Instagram's limit)

   The voice is made by Gemini TTS and mixed over the clip; the title and the voice text (as subtitles) are drawn by ffmpeg, so the
   Ukrainian on screen is always spelled right. The published caption: 🇺🇦 uk · 🇬🇧 en · tags · AI line. Rules: social/PLAN.md. */
import fs from 'node:fs';
import path from 'node:path';

export const MAX_CAPTION = 2200;  // Instagram, TikTok
export const MAX_TAGS = 5;        // Instagram (since Dec 2025)
export const AI_LINE = '🎬 AI-відео · AI-generated video';
export const MAX_REFS = 3;        // Veo 3.1 reference images
export const MAX_VOICE = 140;     // characters of Ukrainian voice-over that fit into ~7 seconds
export const MAX_TITLE = 34;
const MODELS = { fast: 'veo-3.1-fast-generate-preview', lite: 'veo-3.1-lite-generate-preview', standard: 'veo-3.1-generate-preview' };
export const PRICE = { fast: { '720p': 0.10, '1080p': 0.12 }, lite: { '720p': 0.05, '1080p': 0.08 }, standard: { '720p': 0.40, '1080p': 0.40 } };

export function parsePost(file) {
  const src = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const errors = [], warnings = [];
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(src);
  if (!m) return { errors: ['no front matter (--- … ---)'], warnings };
  const meta = {}; for (const line of m[1].split('\n')) { const kv = /^(\w+):\s*(.*?)\s*$/.exec(line); if (kv) meta[kv[1]] = kv[2].replace(/\s+#.*$/, ''); }
  const sec = {}; let cur = null;
  for (const line of m[2].split('\n')) { const h = /^##\s+(\w+)\s*$/.exec(line); if (h) { cur = h[1].toLowerCase(); sec[cur] = []; continue; } if (cur) sec[cur].push(line); }
  const get = k => (sec[k] || []).join('\n').trim();
  const id = path.basename(file).replace(/\.md$/, '');
  const refs = String(meta.refs || meta.role || '').split(/[,\s]+/).map(x => x.trim()).filter(Boolean);
  const voiceRaw = String(meta.voice || '').trim();
  const p = { file, id, date: meta.date || id.slice(0, 10), rubric: meta.rubric || '', hook: meta.hook || '', image: meta.image || '', modelKey: (meta.model || 'fast').toLowerCase(),
    refs, title: String(meta.title || '').trim(), voice: /^(none|no|-)$/i.test(voiceRaw) ? '' : voiceRaw, voiceName: String(meta.voice_name || '').trim(),
    prompt: get('prompt').replace(/\s+/g, ' '), uk: get('uk'), en: get('en'), tags: get('tags').split(/\s+/).filter(Boolean) };
  const CYR = /[А-Яа-яЁёІіЇїЄєҐґ]/;
  if (refs.length > MAX_REFS) errors.push(`refs: ${refs.length} characters — ${MAX_REFS} at most`);
  for (const r of refs) if (!/^[a-z][a-z0-9_]{1,31}$/.test(r)) errors.push(`refs: "${r}" is not a role id (like sheriff, mafia_doctor)`);
  if (refs.length && p.image) warnings.push('image is ignored when refs are given (Veo takes either reference images or a first frame)');
  if (!voiceRaw) errors.push('voice: is missing — Ukrainian voice-over text (or "voice: none")');
  if (p.voice && !CYR.test(p.voice)) errors.push('voice: must be Ukrainian');
  if (p.voice && /[A-Za-z]{3,}/.test(p.voice)) warnings.push('voice: Latin words in the voice-over may be read with an accent');
  if (p.voice.length > MAX_VOICE) errors.push(`voice: ${p.voice.length} characters — ${MAX_VOICE} at most (it must fit into 8 seconds)`);
  if (p.title && !CYR.test(p.title)) errors.push('title: must be Ukrainian');
  if (p.title.length > MAX_TITLE) errors.push(`title: ${p.title.length} characters — ${MAX_TITLE} at most`);
  if (/[А-Яа-яЁёІіЇїЄєҐґ]/.test(p.prompt) === false && /\b(text|caption|subtitle|words? on screen|sign reading|says|speaks|dialogue)\b/i.test(p.prompt)) warnings.push('## prompt: text or speech inside the clip — Veo misspells Ukrainian; the title and voice come from the front matter instead');
  p.subtitles = splitSubtitles(p.voice);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) errors.push(`bad date "${p.date}"`);
  if (!/^[0-9A-Za-z_-]{4,40}$/.test(id)) errors.push(`bad file name "${id}"`);
  if (!MODELS[p.modelKey]) errors.push(`model must be one of ${Object.keys(MODELS).join(', ')}`);
  p.model = MODELS[p.modelKey] || MODELS.fast;
  if (p.prompt.length < 60) errors.push('## prompt is missing or too short (60+ characters)');
  if (p.prompt.length > 2500) errors.push('## prompt is too long (2500 characters at most)');
  if (/[А-Яа-яЁёІіЇїЄєҐґ]/.test(p.prompt)) errors.push('## prompt must be English (Veo); Ukrainian goes to voice:, title: and ## uk');
  if (!p.uk) errors.push('## uk caption is missing'); if (!p.en) errors.push('## en caption is missing');
  if (p.tags.some(t => !/^#[\p{L}\p{N}_]{2,40}$/u.test(t))) errors.push('## tags: each tag is #word (letters, digits, _)');
  if (p.tags.length > MAX_TAGS) errors.push(`## tags: ${p.tags.length} tags — Instagram allows ${MAX_TAGS}`);
  if (p.image && !/^[A-Za-z0-9_][A-Za-z0-9_./-]{2,200}\.(png|jpe?g|webp)$/.test(p.image)) errors.push('image: a path on mafiapro.app like cards/uk/sheriff.png');
  if (/<\/?[a-z][^>]*>|\*\*/i.test(p.uk + p.en)) errors.push('captions are plain text (no HTML or markdown) — Instagram, Facebook and TikTok show it as is');
  if (/https?:\/\//.test(p.uk + p.en)) warnings.push('a link in the caption is not clickable on Instagram and TikTok — say "посилання в профілі"');
  p.caption = buildCaption(p);
  if (p.caption.length > MAX_CAPTION) errors.push(`caption is ${p.caption.length} characters — ${MAX_CAPTION} at most`);
  return Object.assign(p, { errors, warnings });
}
export function buildCaption(p) {
  return [`🇺🇦 ${p.uk}`, `🇬🇧 ${p.en}`, p.tags.join(' '), AI_LINE].filter(s => s && s.trim()).join('\n\n');
}

/* the voice text → 1–3 subtitle pieces by sentence; timing is spread by length over the voice when the video is made */
export function splitSubtitles(voice) {
  const parts = String(voice || '').split(/(?<=[.!?…])\s+/).map(x => x.trim()).filter(Boolean);
  const out = []; for (const x of parts) { if (out.length && (out[out.length - 1] + ' ' + x).length <= 48) out[out.length - 1] += ' ' + x; else out.push(x); }
  return out.slice(0, 3);
}
