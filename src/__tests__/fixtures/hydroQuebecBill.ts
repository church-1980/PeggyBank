/**
 * SMART-CAPTURE-HYDRO-01 — a real Hydro-Québec bill's amount section,
 * reconstructed from a real-phone failure report, in the shapes OCR
 * actually produces it in. Not a synthetic best-case: variants B-F exist
 * because a fixture giving the parser perfectly ordered text would prove
 * nothing about the failure that was actually reported.
 *
 * The bill carries three legitimately-labelled amounts, and they are
 * arithmetically consistent — $263.71 + $251.28 = $514.99 — the way a real
 * "due immediately" + "this bill's charges" actually sum to the total:
 *
 *   Montant dû immédiatement / Amount due immediately ........ $263.71
 *   Montant de la présente facture / Amount of this bill ...... $251.28
 *   Montant total dû / Total amount due ........................ $514.99
 *
 * The correct answer for "what is the total I owe?" is $514.99 in every
 * variant below, provided enough of the label survives OCR to be read at
 * all (variant C is deliberately degraded enough that a human would also
 * have to squint).
 */

const HEADER = [
  'HYDRO-QUÉBEC',
  'Relevé de compte',
  'Numéro de compte 1234567890',
  'Date de facturation 3 septembre 2026',
];

const DUE = "Date d'échéance 24 septembre 2026";

/** A. Clean, logically-ordered OCR — the easy case. */
export const HYDRO_A_CLEAN = [
  ...HEADER,
  '',
  'Montant dû immédiatement / Amount due immediately        263,71 $',
  'Montant de la présente facture / Amount of this bill      251,28 $',
  '',
  DUE,
  '',
  'Montant total dû / Total amount due                       514,99 $',
].join('\n');

/** B. Split columns: OCR grouped every label, then every amount. */
export const HYDRO_B_SPLIT_COLUMNS = [
  ...HEADER,
  '',
  'Montant dû immédiatement / Amount due immediately',
  'Montant de la présente facture / Amount of this bill',
  'Montant total dû / Total amount due',
  '263,71 $',
  '251,28 $',
  '514,99 $',
  '',
  DUE,
].join('\n');

/** C. Noisy OCR: stray characters, doubled spaces, a mis-scanned symbol. */
export const HYDRO_C_NOISY = [
  'HYDR0-QUEBEC',
  'Rele v é de  compte',
  'Num éro de compte  1234S67890',
  'Date de factu ration  3  septembre 2026',
  '',
  'M0ntant  dû imm édiatement / Am0unt due immediately     263,71 $',
  'Montant de la  présente facture / Amount 0f this  bill   251 ,28 $',
  '',
  "Date d' échéance  24  septembre 2026",
  '',
  'M0ntant  t0tal dû / T0tal am0unt due                    514,99 $',
].join('\n');

/** D. French and English printed as physically separate blocks (a common
 * bilingual-bill layout, not one line per amount). */
export const HYDRO_D_LANGUAGE_BLOCKS = [
  ...HEADER,
  '',
  '--- FRANÇAIS ---',
  'Montant dû immédiatement       263,71 $',
  'Montant de la présente facture  251,28 $',
  'Montant total dû                514,99 $',
  '',
  DUE,
  '',
  '--- ENGLISH ---',
  'Amount due immediately         263,71 $',
  'Amount of this bill             251,28 $',
  'Total amount due                 514,99 $',
].join('\n');

/** E. Accents dropped entirely, as a low-quality scan often reads them. */
export const HYDRO_E_NO_ACCENTS = [
  'HYDRO-QUEBEC',
  'Releve de compte',
  'Numero de compte 1234567890',
  'Date de facturation 3 septembre 2026',
  '',
  'Montant du immediatement / Amount due immediately        263,71 $',
  'Montant de la presente facture / Amount of this bill      251,28 $',
  '',
  "Date d'echeance 24 septembre 2026",
  '',
  'Montant total du / Total amount due                       514,99 $',
].join('\n');

/** F. Minor OCR corruption on the label words themselves — O/0 and L/1
 * confusion (Section 11 of SMART-CAPTURE-HYDRO-01's own predecessor,
 * SMART-CAPTURE OCR label corruption), layered onto this bill specifically. */
export const HYDRO_F_LABEL_CORRUPTION = [
  ...HEADER,
  '',
  'M0ntant dû immédiatement / Am0unt due immediately        263,71 $',
  'Montant de la présente facture / Am0unt 0f this bill      251,28 $',
  '',
  DUE,
  '',
  'M0ntant T0TA1 dû / T0TA1 am0unt due                       514,99 $',
].join('\n');

/**
 * G. THE ACTUAL PHOTOGRAPHED BILL, transcribed line-for-line from the real
 * document (page 1 of 3), not reconstructed from the failure report's
 * summary. Two things this variant has that A-F invented from the report
 * did not, both found only by testing against the real photo:
 *
 *   1. The detachable payment stub names the $251.28 figure differently
 *      from the main bill body — "Montant dû au plus tard le 24 sept.
 *      2026 / Amount due by Sep. 24, 2026", not "amount of this bill".
 *      "Amount due" alone is a top-tier phrase; without a qualifier for
 *      "due BY [a date]", this line was scoring a near-tie with the true
 *      total purely on which row happened to print first.
 *   2. A due DATE sitting on the same flattened OCR line as the real
 *      amount ("...Sep. 24, 2026   251,28 $") used to read as one long
 *      identifier-shaped digit run and get the WHOLE row — amount
 *      included — discarded as "probably an account number".
 *
 * Both are now fixed generally (a "due by" qualifier; stripping
 * recognised money before judging what's left for identifier shape), not
 * patched for this one bill's exact wording.
 */
export const HYDRO_G_REAL_PHOTOGRAPHED_BILL = [
  'Hydro Québec',
  "N° de compte / Account No. 299 054 009 590",
  "N° de facture / Bill No. 687 403 006 067",
  "N° de client / Customer No. 105 856 135",
  'Page 1/3',
  'Marie-Andrée Morissette',
  'Paul Rollin',
  '4204 boul Gareau',
  'Saint-Hubert QC J3Y 0G1',
  "Facture d'électricité du 3 septembre 2026",
  'Electricity bill of September 3, 2026',
  '',
  'SOMMAIRE DU COMPTE / ACCOUNT SUMMARY',
  'Montant de la facture précédente / Previous bill amount        263,71 $',
  'Montant dû immédiatement / Amount due immediately              263,71 $',
  '',
  'SOMMAIRE DE LA PRÉSENTE FACTURE / SUMMARY OF THIS BILL',
  "Le détail de la consommation est présenté plus bas. / Electricity use details below.",
  "Coûts de l'électricité / Electricity costs                     215,14 $",
  'TPS / GST No. 11944 9775 RT0001 - 5,0 %                          10,76 $',
  'TVQ / QST No. 1000043605 TQ0020 - 9,975%                         21,46 $',
  "Frais d'administration / Administration charges                  3,92 $",
  'Montant de la présente facture / Amount of this bill           251,28 $',
  '',
  'Services à la clientèle / Customer services',
  'Téléphone / Phone : 514 385-7252',
  '',
  "N° de compte / Account No.                    299 054 009 590",
  'Montant dû immédiatement / Amount due immediately              263,71 $',
  'Montant dû au plus tard le 24 sept. 2026 / Amount due by Sep. 24, 2026   251,28 $',
  'Montant total dû / Total amount due                            514,99 $',
  'Montant du paiement / Payment amount                            $',
].join('\n');
