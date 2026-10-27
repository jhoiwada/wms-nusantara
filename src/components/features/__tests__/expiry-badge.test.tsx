// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ExpiryBadge } from '../expiry-badge';

afterEach(() => {
  cleanup();
});

describe('ExpiryBadge Component (BR-10)', () => {
  it('renders neutral badge for non-expiring product (null expiry)', () => {
    render(<ExpiryBadge expiryDate={null} />);
    expect(screen.getByText('Tanpa Kedaluwarsa')).toBeDefined();
  });

  it('renders expired badge with danger style when daysRemaining < 0', () => {
    render(<ExpiryBadge daysRemaining={-5} expiryDate="2020-01-01" />);
    expect(screen.getByText(/Kedaluwarsa/)).toBeDefined();
    expect(screen.getByText(/5h lalu/)).toBeDefined();
  });

  it('renders critical badge when daysRemaining <= 7', () => {
    render(<ExpiryBadge daysRemaining={3} expiryDate="2026-10-30" />);
    expect(screen.getByText(/Kritis/)).toBeDefined();
    expect(screen.getByText(/3 hari/)).toBeDefined();
  });

  it('renders critical badge with special label when expiring today (0 days)', () => {
    render(<ExpiryBadge daysRemaining={0} expiryDate="2026-10-27" />);
    expect(screen.getByText(/Hari Ini!/)).toBeDefined();
  });

  it('renders warning badge when daysRemaining is between 8 and 30 days (BR-10)', () => {
    render(<ExpiryBadge daysRemaining={20} expiryDate="2026-11-16" />);
    expect(screen.getByText(/Hampir Expired/)).toBeDefined();
    expect(screen.getByText(/20 hari/)).toBeDefined();
  });

  it('renders safe badge when daysRemaining > 30 days', () => {
    render(<ExpiryBadge daysRemaining={90} expiryDate="2027-01-25" />);
    expect(screen.getByText(/Aman/)).toBeDefined();
    expect(screen.getByText(/90 hari/)).toBeDefined();
  });
});
