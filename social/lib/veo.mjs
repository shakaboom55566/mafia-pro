/* Veo 3.1 through the Gemini API (AI Studio key with billing): one 8-second vertical video with sound.
   POST {base}/models/{model}:predictLongRunning → operation; GET {base}/{operation} until done; the video is downloaded with the key
   (it stays on Google's side for 2 days). A video blocked by the safety filters is not charged. */
import { http, binary, log, sleep, short } from './util.mjs';

export class VeoBlocked extends Error {}

export async function veoGenerate({ apiKey, base = 'https://generativelanguage.googleapis.com/v1beta', model, prompt, image, refs, resolution = '1080p', pollMs = 10000, timeoutMs = 12 * 60000 }) {
  base = base.replace(/\/$/, '');
  const instance = { prompt };
  if (refs && refs.length) instance.referenceImages = refs.slice(0, 3).map(b => ({ image: { inlineData: { mimeType: 'image/png', data: b.toString('base64') } }, referenceType: 'asset' })); // our characters (Veo 3.1 only)
  else if (image) instance.image = { inlineData: { mimeType: 'image/png', data: image.toString('base64') } };
  const parameters = { aspectRatio: '9:16', resolution };
  if (image || (refs && refs.length)) parameters.personGeneration = 'allow_adult'; // the only value allowed with images
  if (refs && refs.length) parameters.durationSeconds = '8';                      // required with reference images
  const headers = { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' };
  const start = await http(`${base}/models/${model}:predictLongRunning`, { method: 'POST', headers, body: JSON.stringify({ instances: [instance], parameters }) }, { tries: 4, wait: 15000, label: 'veo start' });
  if (!start.json || !start.json.name) throw new Error(`Veo did not start: HTTP ${start.status} ${short(start.json && start.json.error ? start.json.error.message : start.text)}`);
  const op = start.json.name; log(`  veo: ${model}, ${resolution}${refs && refs.length ? `, ${refs.length} reference image(s)` : image ? ', first frame' : ''}, operation started`);
  const t0 = Date.now(); let d = null;
  while (Date.now() - t0 < timeoutMs) {
    await sleep(pollMs);
    const r = await http(`${base}/${op}`, { headers: { 'x-goog-api-key': apiKey } }, { tries: 3, label: 'veo poll' });
    d = r.json || {}; if (d.done) break;
  }
  if (!d || !d.done) throw new Error(`Veo did not finish in ${Math.round(timeoutMs / 60000)} min`);
  if (d.error) {
    if (/safety|blocked|filter|policy|responsible ai/i.test(d.error.message || '')) throw new VeoBlocked('Veo blocked the prompt: ' + short(d.error.message));
    throw new Error('Veo error: ' + short(d.error.message || d.error));
  }
  const res = (d.response && d.response.generateVideoResponse) || {};
  const uri = res.generatedSamples && res.generatedSamples[0] && res.generatedSamples[0].video && res.generatedSamples[0].video.uri;
  if (!uri) throw new VeoBlocked('Veo returned no video (safety filters): ' + short(res.raiMediaFilteredReasons || res.raiFilteredReasons || res, 300));
  const bytes = await binary(uri, { headers: { 'x-goog-api-key': apiKey } });
  log(`  veo: done in ${Math.round((Date.now() - t0) / 1000)} s, ${(bytes.length / 1e6).toFixed(1)} MB`);
  return bytes;
}
