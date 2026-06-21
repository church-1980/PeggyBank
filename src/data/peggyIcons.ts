// PeggyBank Icon System v1.0 — asset registry
// Visual source of truth: /design/PeggyBank-Icon-System-v1.png
// Docs: /docs/PEGGYBANK_ICON_SYSTEM.md
//
// These require() paths point at the premium 3D PNG assets in
// /assets/peggy-icons/. The PNGs must exist before PeggyIcon is used in any
// screen — until then, do not import this file from rendered code or the
// Metro bundle will fail to resolve the missing assets.

export type PeggyIconKey =
  | 'vacation'
  | 'cruise'
  | 'flight'
  | 'wedding'
  | 'new-car'
  | 'new-home'
  | 'down-payment'
  | 'emergency-fund'
  | 'education'
  | 'baby'
  | 'renovation'
  | 'medical'
  | 'retirement'
  | 'investing'
  | 'business'
  | 'pay-off-debt'
  | 'gifts'
  | 'pet'
  | 'technology'
  | 'christmas'
  | 'disney-trip'
  | 'motorcycle'
  | 'gaming'
  | 'memories'
  | 'other';

export const PEGGY_ICONS: Record<PeggyIconKey, any> = {
  vacation: require('../../assets/peggy-icons/vacation.png'),
  cruise: require('../../assets/peggy-icons/cruise.png'),
  flight: require('../../assets/peggy-icons/flight.png'),
  wedding: require('../../assets/peggy-icons/wedding.png'),
  'new-car': require('../../assets/peggy-icons/new-car.png'),
  'new-home': require('../../assets/peggy-icons/new-home.png'),
  'down-payment': require('../../assets/peggy-icons/down-payment.png'),
  'emergency-fund': require('../../assets/peggy-icons/emergency-fund.png'),
  education: require('../../assets/peggy-icons/education.png'),
  baby: require('../../assets/peggy-icons/baby.png'),
  renovation: require('../../assets/peggy-icons/renovation.png'),
  medical: require('../../assets/peggy-icons/medical.png'),
  retirement: require('../../assets/peggy-icons/retirement.png'),
  investing: require('../../assets/peggy-icons/investing.png'),
  business: require('../../assets/peggy-icons/business.png'),
  'pay-off-debt': require('../../assets/peggy-icons/pay-off-debt.png'),
  gifts: require('../../assets/peggy-icons/gifts.png'),
  pet: require('../../assets/peggy-icons/pet.png'),
  technology: require('../../assets/peggy-icons/technology.png'),
  christmas: require('../../assets/peggy-icons/christmas.png'),
  'disney-trip': require('../../assets/peggy-icons/disney-trip.png'),
  motorcycle: require('../../assets/peggy-icons/motorcycle.png'),
  gaming: require('../../assets/peggy-icons/gaming.png'),
  memories: require('../../assets/peggy-icons/memories.png'),
  other: require('../../assets/peggy-icons/other.png'),
};
