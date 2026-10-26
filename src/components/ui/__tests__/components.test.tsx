// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Badge } from '../badge';
import { Button } from '../button';
import { EmptyState } from '../empty-state';
import { DataTable, type Column } from '../data-table';

afterEach(() => {
  cleanup();
});

describe('UI Base Components', () => {
  describe('Badge', () => {
    it('renders with correct variant styles', () => {
      const { rerender } = render(<Badge variant="RECEIVED">RECEIVED</Badge>);
      expect(screen.getByText('RECEIVED')).toBeDefined();

      rerender(<Badge variant="ADMIN">ADMIN</Badge>);
      expect(screen.getByText('ADMIN')).toBeDefined();

      rerender(<Badge variant="CANCELLED">CANCELLED</Badge>);
      expect(screen.getByText('CANCELLED')).toBeDefined();
    });
  });

  describe('Button', () => {
    it('renders children and handles click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Simpan Data</Button>);

      const button = screen.getByRole('button', { name: 'Simpan Data' });
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('disables button when isLoading is true', () => {
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Proses
        </Button>,
      );

      const button = screen.getByRole('button');
      expect((button as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('EmptyState', () => {
    it('renders title, description and triggers action button', () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="Tidak ada barang"
          description="Tambahkan barang baru ke gudang"
          actionLabel="Tambah Barang"
          onAction={onAction}
        />,
      );

      expect(screen.getByText('Tidak ada barang')).toBeDefined();
      expect(screen.getByText('Tambahkan barang baru ke gudang')).toBeDefined();

      const btn = screen.getByRole('button', { name: 'Tambah Barang' });
      fireEvent.click(btn);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('DataTable', () => {
    interface Item {
      id: string;
      name: string;
      qty: number;
    }

    const testColumns: Column<Item>[] = [
      { key: 'name', header: 'Nama Barang', sortable: true },
      { key: 'qty', header: 'Stok', sortable: true, align: 'right' },
    ];

    const testData: Item[] = [
      { id: '1', name: 'Kopi Arabika', qty: 50 },
      { id: '2', name: 'Minyak Goreng', qty: 20 },
      { id: '3', name: 'Beras Premium', qty: 100 },
    ];

    it('renders table headers and rows', () => {
      render(<DataTable columns={testColumns} data={testData} />);

      expect(screen.getByText('Nama Barang')).toBeDefined();
      expect(screen.getByText('Stok')).toBeDefined();
      expect(screen.getByText('Kopi Arabika')).toBeDefined();
      expect(screen.getByText('Minyak Goreng')).toBeDefined();
    });

    it('filters rows based on search input', () => {
      render(<DataTable columns={testColumns} data={testData} searchPlaceholder="Cari..." />);

      const searchInput = screen.getByPlaceholderText('Cari...');
      fireEvent.change(searchInput, { target: { value: 'Minyak' } });

      expect(screen.getByText('Minyak Goreng')).toBeDefined();
      expect(screen.queryByText('Kopi Arabika')).toBeNull();
    });

    it('renders empty state when data is empty', () => {
      render(
        <DataTable
          columns={testColumns}
          data={[]}
          emptyTitle="Kosong"
          emptyDescription="Data tidak ada"
        />,
      );

      expect(screen.getByText('Kosong')).toBeDefined();
      expect(screen.getByText('Data tidak ada')).toBeDefined();
    });
  });
});
