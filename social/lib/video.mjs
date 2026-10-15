/* Finishing with ffmpeg: the Veo clip in 1080×1920 with the Ukrainian title and subtitles drawn on it and the voice-over mixed in,
   then a 2.2-second end card (logo, "Грай у Telegram", the bot) — H.264 High + AAC 48 kHz, moov atom first: what Instagram Reels,
   Facebook Reels and TikTok accept. Text is drawn here, not by Veo, so Ukrainian is always spelled right. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const FONTS = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'];
export const fontFile = () => FONTS.find(f => fs.existsSync(f)) || null;
export const CARD = { seconds: 2.2, bg: '0x0d0c14', gold: '0xf0cd7a', light: '0xefe7d6', lines: ['Грай у Telegram', 'Play in Telegram', '@mafiaprof_bot'] };
const TITLE = { size: 66, maxChars: 19, y: 230, from: 0.3, to: 4.2 };          // the hook on screen while the scene opens
const SUB = { size: 50, maxChars: 26, y: 1480 };                              // subtitles of the voice-over
const VOICE = { start: 0.5, bed: 0.4, maxTempo: 1.25 };                        // voice starts after 0.6 s; the clip's own sound drops to 40 % under it

export function hasFfmpeg() { try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch (e) { return false; } }
export function probe(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', file], { encoding: 'utf8' });
  const j = JSON.parse(out); const v = (j.streams || []).find(s => s.codec_type === 'video') || {}; const a = (j.streams || []).find(s => s.codec_type === 'audio');
  return { duration: Number(j.format && j.format.duration) || 0, width: v.width, height: v.height, vcodec: v.codec_name, fps: v.r_frame_rate, audio: !!a, acodec: a ? a.codec_name : null };
}
/* greedy word wrap for drawtext (no auto wrap there) */
export function wrap(text, maxChars) {
  const words = String(text || '').trim().split(/\s+/); const lines = []; let cur = '';
  for (const w of words) { if (cur && (cur + ' ' + w).length > maxChars) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
  if (cur) lines.push(cur); return lines.join('\n');
}
/* subtitle pieces spread over the voice by their length */
export function subtitleTimes(pieces, start, duration) {
  const total = pieces.reduce((n, s) => n + s.length, 0) || 1; let t = start; const out = [];
  for (const s of pieces) { const d = duration * s.length / total; out.push({ text: s, start: t, end: t + d }); t += d; }
  return out;
}

/* raw Veo bytes → finished mp4 bytes. voice: WAV bytes (Ukrainian voice-over); title: text on screen; subtitles: pieces of the voice text */
export function finishVideo(raw, { logo, card = CARD, workDir, voice, title, subtitles } = {}) {
  const dir = workDir || fs.mkdtempSync(path.join(os.tmpdir(), 'social-'));
  const inFile = path.join(dir, 'raw.mp4'), outFile = path.join(dir, 'final.mp4'); fs.writeFileSync(inFile, raw);
  const p = probe(inFile); const D = Math.max(1, p.duration || 8); const C = card.seconds;
  const font = fontFile();
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', inFile];
  let idx = 1; const logoIdx = logo && fs.existsSync(logo) ? idx++ : -1; if (logoIdx > 0) args.push('-loop', '1', '-t', String(C), '-i', logo);
  const silIdx = idx++; args.push('-f', 'lavfi', '-t', String(C), '-i', 'anullsrc=r=48000:cl=stereo');
  const rawSil = p.audio ? -1 : idx++; if (rawSil > 0) args.push('-f', 'lavfi', '-t', String(D), '-i', 'anullsrc=r=48000:cl=stereo');
  let voiceIdx = -1, voiceDur = 0, tempo = 1;
  if (voice && voice.length > 100) {
    const vf = path.join(dir, 'voice.wav'); fs.writeFileSync(vf, voice); voiceDur = probe(vf).duration || 0;
    const room = D - VOICE.start - 0.3; tempo = voiceDur > room ? Math.min(VOICE.maxTempo, voiceDur / room) : 1;
    voiceIdx = idx++; args.push('-i', vf);
  }
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, '’');
  let tn = 0; const txt = s => { const tf = path.join(dir, `t${tn++}.txt`); fs.writeFileSync(tf, s); return tf.replace(/\\/g, '/').replace(/:/g, '\\:'); };
  const f = [];
  const overlays = [];
  if (font && title) overlays.push(`drawtext=fontfile='${esc(font)}':textfile='${txt(wrap(title, TITLE.maxChars))}':fontcolor=${card.gold}:fontsize=${TITLE.size}:line_spacing=10:x=(w-text_w)/2:y=${TITLE.y}:box=1:boxcolor=0x0d0c14@0.55:boxborderw=22:shadowcolor=black@0.6:shadowx=2:shadowy=2:enable='between(t,${TITLE.from},${TITLE.to})'`);
  const subs = [];
  if (font && subtitles && subtitles.length && voiceIdx > 0) {
    const spoken = Math.min(voiceDur / tempo, D - VOICE.start - 0.2);
    for (const s of subtitleTimes(subtitles, VOICE.start, spoken)) subs.push(s);
    for (const s of subs) overlays.push(`drawtext=fontfile='${esc(font)}':textfile='${txt(wrap(s.text, SUB.maxChars))}':fontcolor=${card.light}:fontsize=${SUB.size}:line_spacing=8:x=(w-text_w)/2:y=${SUB.y}-text_h/2:box=1:boxcolor=0x0d0c14@0.6:boxborderw=18:enable='between(t,${s.start.toFixed(2)},${s.end.toFixed(2)})'`);
  }
  f.push(`[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=24,format=yuv420p${overlays.length ? ',' + overlays.join(',') : ''}[v0]`);
  const bed = voiceIdx > 0 ? `,volume=${VOICE.bed}` : '';
  f.push(`[${p.audio ? '0:a' : rawSil + ':a'}]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo${bed},afade=t=out:st=${Math.max(0, D - 0.6).toFixed(2)}:d=0.6[bed]`);
  if (voiceIdx > 0) {
    f.push(`[${voiceIdx}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo${tempo > 1 ? `,atempo=${tempo.toFixed(3)}` : ''},adelay=${Math.round(VOICE.start * 1000)}|${Math.round(VOICE.start * 1000)},apad,atrim=0:${D.toFixed(2)},afade=t=out:st=${Math.max(0, D - 0.4).toFixed(2)}:d=0.4[vo]`);
    f.push('[bed][vo]amix=inputs=2:duration=first:normalize=0[a0]');
  } else f.push('[bed]acopy[a0]');
  f.push(`color=c=${card.bg}:s=1080x1920:r=24:d=${C}[bg]`);
  let last = 'bg';
  if (logoIdx > 0) { f.push(`[${logoIdx}:v]scale=600:600,format=rgba[lg]`); f.push(`[bg][lg]overlay=(W-w)/2:420:shortest=1[c0]`); last = 'c0'; }
  const draw = [];
  if (font) {
    const y = [1130, 1215, 1340], size = [68, 54, 60], color = [card.gold, card.light, card.gold];
    card.lines.forEach((s, i) => { if (s) draw.push(`drawtext=fontfile='${esc(font)}':textfile='${txt(s)}':fontcolor=${color[i]}:fontsize=${size[i]}:x=(w-text_w)/2:y=${y[i]}`); });
  }
  f.push(`[${last}]${draw.length ? draw.join(',') + ',' : ''}fade=t=in:st=0:d=0.35,setsar=1,format=yuv420p[v1]`);
  f.push(`[v0][a0][v1][${silIdx}:a]concat=n=2:v=1:a=1[v][a]`);
  args.push('-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-preset', process.env.FFMPEG_PRESET || 'medium', '-crf', '20',
    '-maxrate', '12M', '-bufsize', '24M', '-g', '48', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', outFile);
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const bytes = fs.readFileSync(outFile); const info = probe(outFile);
  return { bytes, info, file: outFile, dir, font: !!font, voice: voiceIdx > 0 ? { seconds: Number(voiceDur.toFixed(1)), tempo: Number(tempo.toFixed(2)) } : null, subtitles: subs };
}

/* a picture (e.g. a role card) → 1080×1920 PNG for Veo's first frame: the picture in the middle on its own blurred copy */
export function firstFrame(img, workDir) {
  const dir = workDir || fs.mkdtempSync(path.join(os.tmpdir(), 'social-'));
  const inFile = path.join(dir, 'frame-in'), out = path.join(dir, 'frame.png'); fs.writeFileSync(inFile, img);
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', inFile, '-filter_complex',
    '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:3,eq=brightness=-0.25[b];[0:v]scale=960:1600:force_original_aspect_ratio=decrease[f];[b][f]overlay=(W-w)/2:(H-h)/2,format=rgb24',
    '-frames:v', '1', out], { stdio: ['ignore', 'ignore', 'pipe'] });
  return fs.readFileSync(out);
}
/* a role card (cards/<lang>/<id>.png from the site) → its illustration only, for Veo's reference images */
export function cardArt(png, workDir) {
  const dir = workDir || fs.mkdtempSync(path.join(os.tmpdir(), 'social-'));
  const inFile = path.join(dir, 'card-in.png'), out = path.join(dir, `art-${Date.now()}-${Math.floor(Math.random() * 1e6)}.png`); fs.writeFileSync(inFile, png);
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', inFile, '-vf', 'crop=iw*0.88:ih*0.352:iw*0.06:ih*0.1,scale=1024:-2:flags=lanczos,format=rgb24', '-frames:v', '1', out], { stdio: ['ignore', 'ignore', 'pipe'] });
  return fs.readFileSync(out);
}
