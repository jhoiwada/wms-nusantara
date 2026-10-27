'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarcodeLabelPrinter } from '@/components/features/barcode-label-printer';
import type { LabelItem } from '@/types/label';

interface ProductItem {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  uom: string;
  costPrice: number | string;
  trackExpiry: boolean;
  category: {
    name: string;
  };
}

interface LocationItem {
  id: string;
  code: string;
  zone: string;
  rack: string;
  level: string;
  warehouse: {
    code: string;
    name: string;
  };
}

export default function BarcodeLabelsPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'locations' | 'custom'>('products');

  // Products data
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // Locations data
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());

  // Custom label form
  const [customTitle, setCustomTitle] = useState('');
  const [customSubtitle, setCustomSubtitle] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');
  const [customDisplay, setCustomDisplay] = useState('');
  const [customSecondary, setCustomSecondary] = useState('');
  const [customCopies, setCustomCopies] = useState(1);

  // Print Queue
  const [queue, setQueue] = useState<LabelItem[]>([]);

  // Fetch products
  useEffect(() => {
    fetch('/api/v1/products?pageSize=100&activeOnly=true')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setProducts(json.data);
      })
      .catch(() => {});
  }, []);

  // Fetch locations
  useEffect(() => {
    fetch('/api/v1/stock-opnames/locations')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setLocations(json.data);
      })
      .catch(() => {});
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        p.category.name.toLowerCase().includes(q),
    );
  }, [products, productSearch]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    const q = locationSearch.toLowerCase().trim();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        l.code.toLowerCase().includes(q) ||
        l.warehouse.name.toLowerCase().includes(q) ||
        l.zone.toLowerCase().includes(q),
    );
  }, [locations, locationSearch]);

  // Toggle product selection
  const handleToggleProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle location selection
  const handleToggleLocation = (id: string) => {
    setSelectedLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Add selected products to queue
  const handleAddProductsToQueue = () => {
    const selected = products.filter((p) => selectedProductIds.has(p.id));
    const newItems: LabelItem[] = selected.map((p) => ({
      id: `prod-${p.id}-${Date.now()}`,
      type: 'PRODUCT',
      title: p.name,
      subtitle: `Kategori: ${p.category.name}`,
      barcodeValue: p.barcode || p.sku,
      displayCode: p.barcode ? `${p.sku} | ${p.barcode}` : p.sku,
      secondaryInfo: `Rp ${Number(p.costPrice).toLocaleString('id-ID')} / ${p.uom}`,
      badgeText: p.trackExpiry ? 'FEFO' : undefined,
      copies: 1,
    }));

    setQueue((prev) => [...prev, ...newItems]);
    setSelectedProductIds(new Set());
  };

  // Add selected locations to queue
  const handleAddLocationsToQueue = () => {
    const selected = locations.filter((l) => selectedLocationIds.has(l.id));
    const newItems: LabelItem[] = selected.map((l) => ({
      id: `loc-${l.id}-${Date.now()}`,
      type: 'LOCATION',
      title: l.code,
      subtitle: `${l.warehouse.name} (${l.warehouse.code})`,
      barcodeValue: l.code,
      displayCode: l.code,
      secondaryInfo: `Zona ${l.zone} • Rak ${l.rack} • Tkt ${l.level}`,
      copies: 1,
    }));

    setQueue((prev) => [...prev, ...newItems]);
    setSelectedLocationIds(new Set());
  };

  // Add custom label to queue
  const handleAddCustomToQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBarcode.trim() || !customTitle.trim()) return;

    const newItem: LabelItem[] = [
      {
        id: `custom-${Date.now()}`,
        type: 'CUSTOM',
        title: customTitle.trim(),
        subtitle: customSubtitle.trim() || undefined,
        barcodeValue: customBarcode.trim().toUpperCase(),
        displayCode: customDisplay.trim() || customBarcode.trim().toUpperCase(),
        secondaryInfo: customSecondary.trim() || undefined,
        copies: Math.max(1, customCopies),
      },
    ];

    setQueue((prev) => [...prev, ...newItem]);
    setCustomTitle('');
    setCustomSubtitle('');
    setCustomBarcode('');
    setCustomDisplay('');
    setCustomSecondary('');
    setCustomCopies(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Title (Hidden in print) */}
      <div className="no-print flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Cetak Label Barcode
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Pusat pencetakan stiker label barcode untuk produk, rak lokasi gudang, dan identifikasi
            batch (T3.3).
          </p>
        </div>
      </div>

      {/* Tabs & Source Selection (Hidden in print) */}
      <div className="no-print rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'products'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Pilih dari Produk ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('locations')}
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'locations'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Pilih dari Lokasi / Rak ({locations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'custom'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Label Bebas / Kustom
          </button>
        </div>

        {/* Tab 1: Products */}
        {activeTab === 'products' && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Input
                placeholder="Cari SKU, nama produk, barcode, atau kategori..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="max-w-md text-xs"
              />
              <Button
                size="sm"
                onClick={handleAddProductsToQueue}
                disabled={selectedProductIds.size === 0}
                className="bg-indigo-600 text-xs text-white shadow-xs hover:bg-indigo-700"
              >
                + Tambah {selectedProductIds.size} Produk ke Antrean Cetak
              </Button>
            </div>

            <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
              {filteredProducts.map((p) => {
                const isSelected = selectedProductIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => handleToggleProduct(p.id)}
                    className={`flex cursor-pointer items-center justify-between p-2.5 text-xs transition-colors hover:bg-slate-50 ${
                      isSelected ? 'bg-indigo-50/70' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by row click
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-500">
                          SKU: <span className="font-mono font-bold text-slate-700">{p.sku}</span>
                          {p.barcode && (
                            <span className="ml-2">
                              • Barcode:{' '}
                              <span className="font-mono text-slate-700">{p.barcode}</span>
                            </span>
                          )}
                          <span className="ml-2 text-indigo-600">• {p.category.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-medium text-emerald-700">
                      Rp {Number(p.costPrice).toLocaleString('id-ID')} / {p.uom}
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  Tidak ada produk yang cocok dengan pencarian.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Locations */}
        {activeTab === 'locations' && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Input
                placeholder="Cari kode lokasi (misal: WH1-A-01-01), gudang, atau zona..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="max-w-md text-xs"
              />
              <Button
                size="sm"
                onClick={handleAddLocationsToQueue}
                disabled={selectedLocationIds.size === 0}
                className="bg-indigo-600 text-xs text-white shadow-xs hover:bg-indigo-700"
              >
                + Tambah {selectedLocationIds.size} Lokasi ke Antrean Cetak
              </Button>
            </div>

            <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
              {filteredLocations.map((l) => {
                const isSelected = selectedLocationIds.has(l.id);
                return (
                  <div
                    key={l.id}
                    onClick={() => handleToggleLocation(l.id)}
                    className={`flex cursor-pointer items-center justify-between p-2.5 text-xs transition-colors hover:bg-slate-50 ${
                      isSelected ? 'bg-indigo-50/70' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-900">
                          {l.code}
                        </span>
                        <span className="ml-2 text-[11px] text-slate-500">
                          {l.warehouse.name} ({l.warehouse.code})
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      Zona {l.zone} • Rak {l.rack} • Tkt {l.level}
                    </div>
                  </div>
                );
              })}
              {filteredLocations.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  Tidak ada lokasi yang cocok dengan pencarian.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Custom Label Form */}
        {activeTab === 'custom' && (
          <form
            onSubmit={handleAddCustomToQueue}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Judul Label <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                placeholder="misal: PALLET-001 atau DOKUMEN MASUK"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Isi Barcode (Code 128) <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                placeholder="misal: PLT-202610-099"
                value={customBarcode}
                onChange={(e) => setCustomBarcode(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Subjudul / Keterangan
              </label>
              <Input
                placeholder="misal: Gudang Distribusi Utama"
                value={customSubtitle}
                onChange={(e) => setCustomSubtitle(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Teks Bawah / Sekunder
              </label>
              <Input
                placeholder="misal: Berat: 250 KG"
                value={customSecondary}
                onChange={(e) => setCustomSecondary(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Jumlah Copies</label>
              <input
                type="number"
                min={1}
                max={500}
                value={customCopies}
                onChange={(e) => setCustomCopies(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                size="sm"
                className="w-full bg-indigo-600 text-xs text-white hover:bg-indigo-700"
              >
                + Tambahkan Label Kustom ke Antrean
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Printer Preview & Actions */}
      <BarcodeLabelPrinter initialItems={queue} key={queue.length} />
    </div>
  );
}
