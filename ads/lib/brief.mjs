/* An ad brief: ads/creatives/<id>.md, written by the daily agent (ads/AGENT.md, rules in ads/PLAN.md); the hourly check takes the next one
   from the queue when an ad has to be replaced.

   ---
   id: dnp-001
   tag: dnp                       (campaign tag from ads/config.json)
   kind: video                    (video: Veo 3.1 Fast, 8 s, 9:16 · image: Imagen 4 Fast, 9:16)
   hook: питання                  (opening type — ads/PLAN.md)
   angle: компанія                (what the ad sells — ads/PLAN.md)
   title: Хто з друзів — мафія?   (Ukrainian text on screen, ≤ 34 characters)
   voice: …                       (video: Ukrainian voice-over ≤ 140 characters, or "none")
   refs: don, sheriff             (video, optional: up to 3 role ids — their card art goes to Veo)
   headline: Мафія в Telegram     (≤ 40 characters, under the ad)
   cta: PLAY_GAME                 (optional: PLAY_GAME | LEARN_MORE | SIGN_UP)
   ---
   ## prompt
   <English prompt: one 8-second vertical scene (video) or one vertical picture (image); no text, no speech, no weapons>
   ## text
   <primary text in Ukrainian, ≤ 400 characters; the first ~125 are visible without "more">

   Ukrainian only: in Ukraine the language of advertising is the state language (the law on the language, art. 32). */
import fs from 'node:fs';
import path from 'node:path';

export const KINDS = ['video', 'image'];
export const CTAS = ['PLAY_GAME', 'LEARN_MORE', 'SIGN_UP'];
export const MAX = { title: 34, voice: 140, headline: 40, text: 400 };
const CYR = /[А-Яа-яІіЇїЄєҐґ]/;
const RU_ONLY = /[ЫыЭэЪъЁё]/;   // letters Ukrainian does not have: the text slipped into Russian
const BANNED = /\b(guns?|pistols?|rifles?|weapons?|shoot\w*|blood\w*|kill\w*|murder\w*|corpses?|dead body|knife|knives|explosi\w*|bomb\w*|wound\w*|gore|drugs?|cigarette\w*|alcohol|whisk(?:e)?y|vodka|casino|gambl\w*)\b/i;

export function parseBrief(file) {
  const src = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const errors = [], warnings = [];
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(src);
  if (!m) return { file, id: path.basename(file, '.md'), errors: ['no front matter (--- … ---)'], warnings };
  const meta = {}; for (const line of m[1].split('\n')) { const kv = /^(\w+):\s*(.*?)\s*$/.exec(line); if (kv) meta[kv[1]] = kv[2].replace(/\s+#.*$/, '').trim(); }
  const sec = {}; let cur = null;
  for (const line of m[2].split('\n')) { const h = /^##\s+(\w+)\s*$/.exec(line); if (h) { cur = h[1].toLowerCase(); sec[cur] = []; continue; } if (cur) sec[cur].push(line); }
  const get = k => (sec[k] || []).join('\n').trim();
  const voiceRaw = String(meta.voice || '').trim();
  const b = { file, id: meta.id || path.basename(file, '.md'), tag: meta.tag || '', kind: (meta.kind || '').toLowerCase(), hook: meta.hook || '', angle: meta.angle || '',
    title: meta.title || '', voice: /^(none|no|-)$/i.test(voiceRaw) ? '' : voiceRaw, refs: String(meta.refs || '').split(/[,\s]+/).filter(Boolean),
    headline: meta.headline || '', cta: (meta.cta || 'PLAY_GAME').toUpperCase(), prompt: get('prompt').replace(/\s+/g, ' '), text: get('text'), errors, warnings };
  if (!/^[a-z]{2,4}-\d{3}[a-z]?$/.test(b.id)) errors.push(`id "${b.id}": like dnp-001`);
  if (b.id !== path.basename(file, '.md')) errors.push(`id "${b.id}" ≠ file name ${path.basename(file)}`);
  if (!/^[a-z]{2,4}$/.test(b.tag)) errors.push('tag: the campaign tag (dnp)');
  if (!KINDS.includes(b.kind)) errors.push(`kind: ${KINDS.join(' | ')}`);
  if (!b.hook) errors.push('hook: the opening type (ads/PLAN.md)');
  if (!b.angle) warnings.push('angle: missing (what the ad sells)');
  for (const [k, n] of Object.entries(MAX)) if (b[k] && b[k].length > n) errors.push(`${k}: ${b[k].length} characters — ${n} at most`);
  for (const k of ['title', 'headline', 'text']) { if (!b[k]) errors.push(`${k}: missing`); else { if (!CYR.test(b[k])) errors.push(`${k}: must be Ukrainian`); if (RU_ONLY.test(b[k])) errors.push(`${k}: Russian letters (ы э ъ ё) — ads in Ukraine are in Ukrainian`); } }
  if (b.kind === 'video') {
    if (!voiceRaw) errors.push('voice: Ukrainian voice-over text (or "voice: none")');
    if (b.voice && (!CYR.test(b.voice) || RU_ONLY.test(b.voice))) errors.push('voice: must be Ukrainian');
    if (b.refs.length > 3) errors.push('refs: 3 at most');
    for (const r of b.refs) if (!/^[a-z][a-z0-9_]{1,31}$/.test(r)) errors.push(`refs: "${r}" is not a role id`);
  } else if (b.voice || b.refs.length) warnings.push('voice / refs are for videos only — ignored');
  if (!CTAS.includes(b.cta)) errors.push(`cta: ${CTAS.join(' | ')}`);
  if (!b.prompt) errors.push('prompt: missing'); else { if (CYR.test(b.prompt)) errors.push('prompt: write it in English'); const w = BANNED.exec(b.prompt); if (w) errors.push(`prompt: "${w[0]}" — no weapons, blood, violence, alcohol or gambling (Meta rejects such ads)`); }
  if (b.text && b.text.length > 125) warnings.push(`text: ${b.text.length} characters — only the first ~125 show without "more"`);
  return b;
}
export function loadBriefs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /\.md$/.test(f) && !/^README/i.test(f)).sort().map(f => parseBrief(path.join(dir, f)));
}
