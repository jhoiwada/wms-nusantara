// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BarcodeScannerModal } from '@/components/features/barcode-scanner-modal';

afterEach(() => {
  cleanup();
});

describe('BarcodeScannerModal Component', () => {
  it('does not render when isOpen is false', () => {
    const handleScan = vi.fn();
    const handleClose = vi.fn();

    const { container } = render(
      <BarcodeScannerModal isOpen={false} onClose={handleClose} onScan={handleScan} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders modal with title and controls when isOpen is true', () => {
    const handleScan = vi.fn();
    const handleClose = vi.fn();

    render(
      <BarcodeScannerModal
        isOpen={true}
        onClose={handleClose}
        onScan={handleScan}
        title="Scan Barcode Masuk"
        subtitle="Arahkan kamera ke kemasan"
      />,
    );

    expect(screen.getByText('Scan Barcode Masuk')).toBeDefined();
    expect(screen.getByText('Arahkan kamera ke kemasan')).toBeDefined();
    expect(screen.getByPlaceholderText(/Ketik SKU atau scan dengan alat barcode/i)).toBeDefined();
  });

  it('triggers onScan when manual input is submitted', () => {
    const handleScan = vi.fn().mockReturnValue(true);
    const handleClose = vi.fn();

    render(<BarcodeScannerModal isOpen={true} onClose={handleClose} onScan={handleScan} />);

    const input = screen.getByPlaceholderText(/Ketik SKU atau scan dengan alat barcode/i);
    fireEvent.change(input, { target: { value: '899123456789' } });

    const submitBtn = screen.getByRole('button', { name: 'Tambah' });
    fireEvent.click(submitBtn);

    expect(handleScan).toHaveBeenCalledWith('899123456789');
  });

  it('calls onClose when close button is clicked', () => {
    const handleScan = vi.fn();
    const handleClose = vi.fn();

    render(<BarcodeScannerModal isOpen={true} onClose={handleClose} onScan={handleScan} />);

    const finishBtn = screen.getByRole('button', { name: /Selesai & Tutup/i });
    fireEvent.click(finishBtn);

    expect(handleClose).toHaveBeenCalled();
  });

  it('shows not found feedback when onScan returns false', () => {
    const handleScan = vi.fn().mockReturnValue(false);
    const handleClose = vi.fn();

    render(<BarcodeScannerModal isOpen={true} onClose={handleClose} onScan={handleScan} />);

    const input = screen.getByPlaceholderText(/Ketik SKU atau scan dengan alat barcode/i);
    fireEvent.change(input, { target: { value: 'UNKNOWN-999' } });

    const submitBtn = screen.getByRole('button', { name: 'Tambah' });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Tidak Terdaftar: UNKNOWN-999/i)).toBeDefined();
  });
});
