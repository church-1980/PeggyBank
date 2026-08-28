/**
 * Real-shaped receipt text, as OCR returns it.
 *
 * These are deliberately messy: OCR does not produce tidy tables. It drops
 * accents, splits columns oddly, mangles the odd character and keeps the store
 * furniture nobody reads. A parser that only works on clean input is not a
 * receipt parser.
 *
 * The Tim Hortons one is modelled on the receipt that exposed the failure: the
 * merchant was reported as "Please review" and the total as "Please review",
 * while the true total was $11.60.
 */

/** English coffee-shop receipt. Total 11.60, subtotal 10.09. */
export const TIM_HORTONS = [
  'TIM HORTONS #4021',
  '1234 BOUL TASCHEREAU',
  'BROSSARD QC',
  'TEL: 450-555-0142',
  '',
  'ORDER 0142',
  '2 LARGE COFFEE        4.58',
  '1 BOSTON CREAM        1.99',
  '1 SANDWICH            3.52',
  '',
  'SUBTOTAL             10.09',
  'GST 5%                0.50',
  'QST 9.975%            1.01',
  'TOTAL                11.60',
  'DEBIT                11.60',
  'CHANGE                0.00',
  '',
  'AUG 28, 2026  10:42',
  'MERCI / THANK YOU',
].join('\n');

/** Quebec French grocery receipt. Total 47.83, sous-total 41.60. */
export const MAXI_FRENCH = [
  'MAXI',
  '7500 BOUL NEWMAN',
  'LASALLE QC',
  '',
  'LAIT 2L               4.29',
  'PAIN                  3.49',
  'POULET               12.40',
  'LEGUMES              21.42',
  '',
  'SOUS-TOTAL           41.60',
  'TPS 5%                2.08',
  'TVQ 9,975%            4.15',
  'TOTAL DES TAXES       6.23',
  'TOTAL                47.83',
  'INTERAC              47.83',
  '',
  '2026-08-28',
].join('\n');

/** French receipt using a decimal COMMA throughout. Total 23,45. */
export const COMMA_DECIMALS = [
  'BOULANGERIE ST-DENIS',
  'MONTREAL QC',
  '',
  'CROISSANT             3,50',
  'BAGUETTE              4,25',
  'CAFE                  2,70',
  '',
  'SOUS-TOTAL           20,39',
  'TPS                   1,02',
  'TVQ                   2,04',
  'TOTAL                23,45',
  '',
  '28/08/2026',
].join('\n');

/** Gas station. The pump number and litres must not be mistaken for money. */
export const SHELL_GAS = [
  'SHELL',
  '890 RUE PRINCIPALE',
  '',
  'PUMP 04',
  'REGULAR',
  'LITRES            42.150',
  'PRICE/L            1.549',
  '',
  'SUBTOTAL             56.79',
  'GST                   2.84',
  'QST                   5.66',
  'TOTAL                65.29',
  'CREDIT               65.29',
  '',
  'AUG 28 2026',
].join('\n');

/** A bill, not a shop receipt. Amount due 117.43. */
export const BELL_BILL = [
  'Bell Canada',
  'Account number 512-445-9981',
  'Billing period Aug 1 - Aug 31 2026',
  '',
  'Previous balance        112.10',
  'Payment received       -112.10',
  'Current charges         117.43',
  '',
  'Amount due              117.43',
  'Due date Sep 15, 2026',
].join('\n');

/** Cash payment: tendered and change must not be mistaken for the total. */
export const CASH_WITH_CHANGE = [
  'DEPANNEUR DU COIN',
  '',
  'CHIPS                 2.49',
  'BOISSON               1.99',
  '',
  'SUBTOTAL              4.48',
  'TOTAL                 5.15',
  'CASH                 20.00',
  'CHANGE               14.85',
  '',
  'AUG 28, 2026',
].join('\n');

/** Nothing usable. The parser must admit it rather than invent something. */
export const UNREADABLE = [
  '  ~~~~  ',
  '   ??   ',
  '',
].join('\n');
