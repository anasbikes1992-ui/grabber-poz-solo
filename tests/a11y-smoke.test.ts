/**
 * Lightweight a11y smoke (A11Y-10) — structural checks without full browser axe.
 * Full axe-core E2E can be added when Playwright is wired.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('a11y smoke — critical pages', () => {
  it('POS has live region, search/barcode labels, tender radios', () => {
    const src = read('src/app/pos/page.tsx');
    expect(src).toMatch(/aria-live=["']polite["']/);
    expect(src).toMatch(/htmlFor=["']pos-search["']/);
    expect(src).toMatch(/htmlFor=["']pos-barcode["']/);
    expect(src).toMatch(/role=["']radio["']/);
  });

  it('Login has labeled PIN field and role radios', () => {
    const src = read('src/app/login/login-client.tsx');
    expect(src).toMatch(/htmlFor=["']staff-pin["']/);
    expect(src).toMatch(/role=["']radio["']/);
  });

  it('Shared Modal exposes aria-modal', () => {
    const modalPath = ['src/components/ui/modal.tsx', 'src/components/ui/Modal.tsx'].find((p) =>
      fs.existsSync(path.join(root, p))
    );
    expect(modalPath).toBeTruthy();
    const src = read(modalPath!);
    expect(src).toMatch(/aria-modal/);
  });
});
