import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutopilotPage } from '../dashboard/AutopilotPage';

let container: HTMLDivElement;
let root: Root;

function renderPage() {
  act(() => root.render(<AutopilotPage />));
}

function edit(id: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`#${id}`)!;
  act(() => { input.value = value; Simulate.change(input); });
}

function save() {
  act(() => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}

function button(label: string) {
  return [...container.querySelectorAll('button')].find((item) => item.textContent?.trim() === label)!;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Autopilot setup interactions', () => {
  it('saves normalized service shortcuts and restores them on the next visit', () => {
    renderPage();
    edit('autopilot-sheet', 'https://docs.google.com/spreadsheets/d/example-sheet/edit?usp=sharing#gid=42');
    edit('autopilot-repository', 'https://github.com/example/pincraft.git?token=not-for-storage');
    save();
    const saved = localStorage.getItem('pincraft:autopilot:shortcuts')!;
    expect(JSON.parse(saved)).toEqual({
      sheet: 'https://docs.google.com/spreadsheets/d/example-sheet/edit',
      repository: 'https://github.com/example/pincraft',
    });
    expect(saved).not.toContain('token');
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Connection status has not been checked');

    act(() => root.unmount());
    root = createRoot(container);
    renderPage();
    expect(container.querySelector<HTMLInputElement>('#autopilot-sheet')?.value).toBe('https://docs.google.com/spreadsheets/d/example-sheet/edit');
    const workflow = [...container.querySelectorAll('a')].find((link) => link.textContent?.includes('Open workflow'))!;
    expect(workflow.href).toBe('https://github.com/example/pincraft/actions/workflows/pinterest-autopilot.yml');
    expect(workflow.rel).toContain('noopener');
  });

  it.each([
    'javascript:alert(1)',
    'https://github.com.evil.example/owner/repo',
    'https://password@github.com/owner/repo',
  ])('rejects unsafe repository shortcut %s with an associated field error', (repository) => {
    renderPage();
    edit('autopilot-repository', repository);
    save();
    const input = container.querySelector<HTMLInputElement>('#autopilot-repository')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const error = document.getElementById(input.getAttribute('aria-describedby')!)!;
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent?.length).toBeGreaterThan(0);
    expect(localStorage.getItem('pincraft:autopilot:shortcuts')).toBeNull();
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });

  it('keeps downloads usable when browser storage rejects saving', () => {
    renderPage();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Storage unavailable', 'QuotaExceededError'); });
    edit('autopilot-repository', 'https://github.com/example/pincraft');
    save();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('could not save shortcuts');
    expect(button('Download full guide').disabled).toBe(false);
    expect(button('Download Apps Script').disabled).toBe(false);
  });

  it('downloads an empty eight-column queue, without an example article that might be published', async () => {
    const captures: Blob[] = [];
    const NativeURL = URL;
    class DownloadURL extends NativeURL {
      static createObjectURL(blob: Blob) { captures.push(blob); return 'blob:queue-test'; }
      static revokeObjectURL = vi.fn();
    }
    vi.stubGlobal('URL', DownloadURL);
    let filename = '';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { filename = this.download; });
    vi.useFakeTimers();
    renderPage();
    act(() => button('Queue CSV headers').click());
    expect(click).toHaveBeenCalledOnce();
    expect(filename).toBe('pincraft-autopilot-queue.csv');
    expect(captures[0].type).toBe('text/csv;charset=utf-8');
    vi.runAllTimers();
    expect(DownloadURL.revokeObjectURL).toHaveBeenCalledWith('blob:queue-test');
    vi.useRealTimers();
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsText(captures[0]);
    });
    expect(text).toBe('Article URL,Board ID,Status,Pin URL,Error,Job ID,Lease,Updated At\r\n');
  });
});
