// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BrandLogo, BrandMark } from '../brand-logo';

afterEach(() => {
  cleanup();
});

describe('BrandLogo Component (Anti-Slop Corporate Identity)', () => {
  it('renders BrandMark SVG correctly with given size', () => {
    const { container } = render(<BrandMark size={32} className="test-mark" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');
  });

  it('renders mark-only BrandLogo by default', () => {
    const { container } = render(<BrandLogo size="md" />);
    const box = container.querySelector('.bg-\\[\\#09090b\\]');
    expect(box).toBeDefined();
    expect(screen.queryByText('PT NUSANTARA LOGISTIK')).toBeNull();
  });

  it('renders full brand text when showText is true', () => {
    render(<BrandLogo size="lg" showText subtitle="DC Pulogadung & MM2100" />);
    expect(screen.getByText('PT NUSANTARA LOGISTIK')).toBeDefined();
    expect(screen.getByText('DC Pulogadung & MM2100')).toBeDefined();
  });
});
