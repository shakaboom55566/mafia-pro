/* Finishing with ffmpeg: the Veo clip in 1080×1920, then a 2.2-second end card (logo, "Play in Telegram", the bot) —
   H.264 High + AAC 48 kHz, moov atom first: what Instagram Reels, Facebook Reels and TikTok accept. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const FONTS = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'];
export const fontFile = () => FONTS.find(f => fs.existsSync(f)) || null;
export const CARD = { seconds: 2.2, bg: '0x0d0c14', gold: '0xf0cd7a', light: '0xefe7d6', lines: ['Грай у Telegram', 'Play in Telegram', '@mafiaprof_bot'] };

export function hasFfmpeg() { try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch (e) { return false; } }
export function probe(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', file], { encoding: 'utf8' });
  const j = JSON.parse(out); const v = (j.streams || []).find(s => s.codec_type === 'video') || {}; const a = (j.streams || []).find(s => s.codec_type === 'audio');
  return { duration: Number(j.format && j.format.duration) || 0, width: v.width, height: v.height, vcodec: v.codec_name, fps: v.r_frame_rate, audio: !!a, acodec: a ? a.codec_name : null };
}

/* raw Veo bytes → finished mp4 bytes */
export function finishVideo(raw, { logo, card = CARD, workDir } = {}) {
  const dir = workDir || fs.mkdtempSync(path.join(os.tmpdir(), 'social-'));
  const inFile = path.join(dir, 'raw.mp4'), outFile = path.join(dir, 'final.mp4'); fs.writeFileSync(inFile, raw);
  const p = probe(inFile); const D = Math.max(1, p.duration || 8); const C = card.seconds;
  const font = fontFile();
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', inFile];
  let idx = 1; const logoIdx = logo && fs.existsSync(logo) ? idx++ : -1; if (logoIdx > 0) args.push('-loop', '1', '-t', String(C), '-i', logo);
  const silIdx = idx++; args.push('-f', 'lavfi', '-t', String(C), '-i', 'anullsrc=r=48000:cl=stereo');
  const rawSil = p.audio ? -1 : idx++; if (rawSil > 0) args.push('-f', 'lavfi', '-t', String(D), '-i', 'anullsrc=r=48000:cl=stereo');
  const f = [];
  f.push('[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=24,format=yuv420p[v0]');
  f.push(`[${p.audio ? '0:a' : rawSil + ':a'}]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,afade=t=out:st=${Math.max(0, D - 0.6).toFixed(2)}:d=0.6[a0]`);
  f.push(`color=c=${card.bg}:s=1080x1920:r=24:d=${C}[bg]`);
  let last = 'bg';
  if (logoIdx > 0) { f.push(`[${logoIdx}:v]scale=600:600,format=rgba[lg]`); f.push(`[bg][lg]overlay=(W-w)/2:420:shortest=1[c0]`); last = 'c0'; }
  const draw = [];
  if (font) {
    const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "’");
    const txt = (s, i) => { const tf = path.join(dir, `t${i}.txt`); fs.writeFileSync(tf, s); return tf.replace(/\\/g, '/').replace(/:/g, '\\:'); };
    const y = [1130, 1215, 1340], size = [68, 54, 60], color = [card.gold, card.light, card.gold];
    card.lines.forEach((s, i) => { if (s) draw.push(`drawtext=fontfile='${esc(font)}':textfile='${txt(s, i)}':fontcolor=${color[i]}:fontsize=${size[i]}:x=(w-text_w)/2:y=${y[i]}`); });
  }
  f.push(`[${last}]${draw.length ? draw.join(',') + ',' : ''}fade=t=in:st=0:d=0.35,setsar=1,format=yuv420p[v1]`);
  f.push(`[v0][a0][v1][${silIdx}:a]concat=n=2:v=1:a=1[v][a]`);
  args.push('-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-preset', process.env.FFMPEG_PRESET || 'medium', '-crf', '20',
    '-maxrate', '12M', '-bufsize', '24M', '-g', '48', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', outFile);
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const bytes = fs.readFileSync(outFile); const info = probe(outFile);
  return { bytes, info, file: outFile, dir, font: !!font };
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
