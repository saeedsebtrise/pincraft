// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
// @ts-expect-error The worker runs as native Node ESM.
import { runAutopilot } from '../../autopilot/run.mjs';
// @ts-expect-error The renderer runs as native Node ESM.
import { designPin, fittedText } from '../../autopilot/design.mjs';

const boards = JSON.stringify([{ id: '123456789012345678', name: 'Ideas' }]);
const metadata = { title: '12 Room Ideas', cta: 'See the ideas', image_base64: 'cG5n' };

describe('Autopilot runner isolation', () => {
  it('previews without any Sheet or Make credentials, requests, or queue writes', async () => {
    const fetch = vi.fn();
    const prepare = vi.fn().mockResolvedValue(metadata);
    const savePreview = vi.fn();
    const result = await runAutopilot({ AUTOPILOT_BOARDS_JSON: boards, AUTOPILOT_PREVIEW_URL: 'https://example.com/article' }, { fetch, prepare, savePreview });
    expect(result.status).toBe('preview');
    expect(fetch).not.toHaveBeenCalled();
    expect(prepare).toHaveBeenCalledWith('https://example.com/article');
    expect(savePreview).toHaveBeenCalledWith(metadata);
  });

  it('refuses publishing before contacting anything when the switch is disabled', async () => {
    const fetch = vi.fn();
    await expect(runAutopilot({ AUTOPILOT_BOARDS_JSON: boards, AUTOPILOT_MODE: 'publish' }, { fetch })).rejects.toThrow('Publishing disabled');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects invalid modes and preview without a URL without preparing content', async () => {
    const prepare = vi.fn();
    await expect(runAutopilot({ AUTOPILOT_MODE: 'publsih' }, { prepare })).rejects.toThrow('must be preview or publish');
    await expect(runAutopilot({ AUTOPILOT_BOARDS_JSON: boards }, { prepare })).rejects.toThrow('PREVIEW_URL');
    expect(prepare).not.toHaveBeenCalled();
  });

  it('rejects lookalike Sheet endpoints before sending its shared secret', async () => {
    const fetch = vi.fn();
    await expect(runAutopilot({ AUTOPILOT_BOARDS_JSON: boards, AUTOPILOT_MODE: 'publish', AUTOPILOT_ENABLED: 'true', AUTOPILOT_SHEET_URL: 'https://script.google.com.evil.example/macros/s/id/exec' }, { fetch })).rejects.toThrow('Apps Script');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not generate or publish when the Sheet has no due work', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, job: null }) });
    const prepare = vi.fn();
    const result = await runAutopilot({ AUTOPILOT_BOARDS_JSON: boards, AUTOPILOT_MODE: 'publish', AUTOPILOT_ENABLED: 'true', AUTOPILOT_SHEET_URL: 'https://script.google.com/macros/s/deployment-id/exec', AUTOPILOT_SHEET_SECRET: 'x'.repeat(32), MAKE_WEBHOOK_URL: 'https://hook.eu1.make.com/test' }, { fetch, prepare });
    expect(result.status).toBe('idle');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(prepare).not.toHaveBeenCalled();
  });
});

describe('Autopilot real image renderer', () => {
  it.each(['W'.repeat(100), 'A title with <markup> & "quotes"', '25 Beautiful Ideas for Your Next Weekend Project'])('fits the complete headline within the text panel: %s', async title => {
    const result = await fittedText(title, { width: 840, height: 285, size: 66, color: '#241c20', bold: true });
    expect(result.info.width).toBeLessThanOrEqual(840);
    expect(result.info.height).toBeLessThanOrEqual(285);
    expect(result.info.width).toBeGreaterThan(0);
  });

  it('produces a decodable exact-size PNG and skips a corrupt photo', async () => {
    const photo = await sharp({ create: { width: 80, height: 100, channels: 3, background: '#327c64' } }).png().toBuffer();
    const rendered = await designPin([Buffer.from('invalid'), photo], metadata, 'https://example.com/article');
    const info = await sharp(rendered).metadata();
    expect(info).toMatchObject({ format: 'png', width: 1000, height: 1500 });
    expect(rendered.length).toBeGreaterThan(1000);
  });

  it('fails before publishing when no photo is decodable', async () => {
    await expect(designPin([Buffer.from('invalid')], metadata, 'https://example.com/article')).rejects.toThrow('No decodable photos');
  });
});
