// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { HomepageInteractivePreview } from '../homepage-interactive-preview';

afterEach(() => {
  cleanup();
});

describe('HomepageInteractivePreview Component (Taktil & Anti-Slop)', () => {
  it('renders default FEFO tab and allows quantity adjustment', () => {
    render(<HomepageInteractivePreview />);
    expect(screen.getByText(/Algoritma First-Expired, First-Out/i)).toBeDefined();

    // Find the range slider
    const slider = screen.getByLabelText(/Permintaan DO:/i) as HTMLInputElement;
    expect(slider).toBeDefined();
    expect(slider.value).toBe('45');

    // Change slider value
    fireEvent.change(slider, { target: { value: '20' } });
    expect(screen.getByText('20 karton')).toBeDefined();
  });

  it('switches to rack occupancy tab and inspects racks', () => {
    render(<HomepageInteractivePreview />);
    const rackTabButton = screen.getByRole('button', { name: /2\. Okupansi Rak/i });
    fireEvent.click(rackTabButton);

    expect(screen.getByText(/Visualisasi Okupansi Rak 2D/i)).toBeDefined();
    expect(screen.getByText('A-01-01')).toBeDefined();

    // Click on A-01-01
    const rackCell = screen.getByText('A-01-01');
    fireEvent.click(rackCell);
    expect(screen.getByText(/Susu UHT Cokelat 1L/i)).toBeDefined();
  });

  it('switches to 4-eyes opname tab and toggles manager approval', () => {
    render(<HomepageInteractivePreview />);
    const opnameTabButton = screen.getByRole('button', { name: /3\. 4-Eyes Opname/i });
    fireEvent.click(opnameTabButton);

    expect(screen.getByText(/Prinsip 4-Mata/i)).toBeDefined();
    expect(screen.getByText(/MENUNGGU APPROVAL MANAJER/i)).toBeDefined();

    // Click approve button
    const approveBtn = screen.getByRole('button', { name: /Setujui Dokumen/i });
    fireEvent.click(approveBtn);

    expect(screen.getByText(/DISETUJUI & MUTASI POSTED/i)).toBeDefined();
  });
});
