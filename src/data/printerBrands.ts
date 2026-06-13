import { PrinterModel } from '../types';

// Common 3D printer brands and models shown in the AddPrinter picker.
// Ordered by popularity. "Other" always appears last.
export const PRINTER_MODELS: PrinterModel[] = [
  // Bambu Lab — FDM
  { brand: 'Bambu Lab', model: 'X1 Carbon', printer_type: 'FDM' },
  { brand: 'Bambu Lab', model: 'X1E', printer_type: 'FDM' },
  { brand: 'Bambu Lab', model: 'P1S', printer_type: 'FDM' },
  { brand: 'Bambu Lab', model: 'P1P', printer_type: 'FDM' },
  { brand: 'Bambu Lab', model: 'A1', printer_type: 'FDM' },
  { brand: 'Bambu Lab', model: 'A1 Mini', printer_type: 'FDM' },
  // Creality — FDM
  { brand: 'Creality', model: 'Ender 3', printer_type: 'FDM' },
  { brand: 'Creality', model: 'Ender 3 V2', printer_type: 'FDM' },
  { brand: 'Creality', model: 'Ender 3 S1', printer_type: 'FDM' },
  { brand: 'Creality', model: 'Ender 3 S1 Pro', printer_type: 'FDM' },
  { brand: 'Creality', model: 'K1', printer_type: 'FDM' },
  { brand: 'Creality', model: 'K1 Max', printer_type: 'FDM' },
  { brand: 'Creality', model: 'K1C', printer_type: 'FDM' },
  { brand: 'Creality', model: 'CR-10', printer_type: 'FDM' },
  // Prusa Research — FDM
  { brand: 'Prusa', model: 'MK4', printer_type: 'FDM' },
  { brand: 'Prusa', model: 'MK3.9', printer_type: 'FDM' },
  { brand: 'Prusa', model: 'MK3S+', printer_type: 'FDM' },
  { brand: 'Prusa', model: 'Mini+', printer_type: 'FDM' },
  { brand: 'Prusa', model: 'XL', printer_type: 'FDM' },
  // Anycubic — FDM
  { brand: 'Anycubic', model: 'Kobra 2', printer_type: 'FDM' },
  { brand: 'Anycubic', model: 'Kobra 2 Max', printer_type: 'FDM' },
  { brand: 'Anycubic', model: 'Kobra 2 Neo', printer_type: 'FDM' },
  { brand: 'Anycubic', model: 'Kobra Neo', printer_type: 'FDM' },
  // Anycubic — Resin
  { brand: 'Anycubic', model: 'Photon Mono M5s', printer_type: 'Resin' },
  { brand: 'Anycubic', model: 'Photon Mono X 6Ks', printer_type: 'Resin' },
  // Elegoo — FDM
  { brand: 'Elegoo', model: 'Neptune 4', printer_type: 'FDM' },
  { brand: 'Elegoo', model: 'Neptune 4 Pro', printer_type: 'FDM' },
  { brand: 'Elegoo', model: 'Neptune 4 Max', printer_type: 'FDM' },
  // Elegoo — Resin
  { brand: 'Elegoo', model: 'Saturn 4 Ultra', printer_type: 'Resin' },
  { brand: 'Elegoo', model: 'Saturn 3 Ultra', printer_type: 'Resin' },
  { brand: 'Elegoo', model: 'Mars 5 Ultra', printer_type: 'Resin' },
  { brand: 'Elegoo', model: 'Mars 4 Ultra', printer_type: 'Resin' },
  // Flashforge — FDM
  { brand: 'Flashforge', model: 'Adventurer 5M', printer_type: 'FDM' },
  { brand: 'Flashforge', model: 'Adventurer 5M Pro', printer_type: 'FDM' },
  { brand: 'Flashforge', model: 'Creator 4', printer_type: 'FDM' },
  // Voron Design — FDM (DIY community)
  { brand: 'Voron', model: 'Trident', printer_type: 'FDM' },
  { brand: 'Voron', model: 'V2.4', printer_type: 'FDM' },
  { brand: 'Voron', model: 'V0.2', printer_type: 'FDM' },
  { brand: 'Voron', model: 'Switchwire', printer_type: 'FDM' },
  // Other
  { brand: 'Other', model: 'Custom / Unknown', printer_type: 'FDM' },
  { brand: 'Other', model: 'Custom / Unknown', printer_type: 'Resin' },
];

export const PRINTER_BRANDS = [...new Set(PRINTER_MODELS.map(p => p.brand))];

export function getModelsForBrand(brand: string): PrinterModel[] {
  return PRINTER_MODELS.filter(p => p.brand === brand);
}
