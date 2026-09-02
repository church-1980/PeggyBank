/**
 * THE REAL-PHONE FAILURES, TURNED INTO TESTS.
 *
 * Every case here was observed on an actual Android build with an actual
 * receipt or bill. The company names are deliberately invented — the point is
 * that the RULES generalise, so hardcoding "Bell" or "Cornwall Electric" would
 * make these pass while teaching the parser nothing.
 *
 * The shape that matters most is the SPLIT COLUMN. OCR does not hand back a
 * receipt as tidy "LABEL  12.34" rows: it groups text into blocks, and the
 * label column and the amount column are frequently separate blocks. When the
 * geometry pass cannot rebuild the rows, the parser sees every label and then
 * every number, with nothing joining them — and that is when a subtotal wins.
 */

import { chooseAmount, chooseMerchant, namePlausibility } from '../core/documentFields';

const amount = (rows: string[]) => chooseAmount(rows);
const merchant = (rows: string[]) => chooseMerchant(rows);

describe('A labelled total beats an unlabelled number', () => {
  it('CASE C: a printed Total beats the Subtotal above it', () => {
    const r = amount(['Subtotal   59.00', 'GST   2.95', 'Total   61.95']);
    expect(r.value).toBe(61.95);
    expect(r.confidence).toBe('high');
  });

  it('CASE C in split columns: the labels and the numbers arrive apart', () => {
    // This is the shape that actually failed on the phone.
    const r = amount(['Subtotal', 'GST', 'Total', '59.00', '2.95', '61.95']);
    expect(r.value).toBe(61.95);
  });

  it('pairs a label with the amount on the FOLLOWING row', () => {
    const r = amount(['Amount due', '$582.25', 'Due date Sep 12, 2026']);
    expect(r.value).toBe(582.25);
    expect(r.confidence).toBe('high');
  });

  it('does not pair a label with an amount pages away', () => {
    // A distant number may still be offered as a starting point, but it must
    // not inherit the label's confidence.
    const r = amount(['Amount due', 'Account 12345', 'Thank you', 'Notes', '99.99']);
    expect(r.confidence).toBe('low');
  });

  it('a tax line never becomes the total', () => {
    const r = amount(['Subtotal   40.00', 'GST 5%   2.00', 'QST 9.975%   3.99', 'Total   45.99']);
    expect(r.value).toBe(45.99);
  });

  it('a line item never beats the total, however large', () => {
    const r = amount(['4 STEAK   240.00', '2 LOBSTER   180.00', 'Total   61.95']);
    expect(r.value).toBe(61.95);
  });

  it('French: sous-total loses to total', () => {
    const r = amount(['SOUS-TOTAL   41,60', 'TPS   2,08', 'TVQ   4,15', 'TOTAL   47,83']);
    expect(r.value).toBe(47.83);
  });

  it('French: TOTAL DES TAXES is not the total', () => {
    const r = amount(['SOUS-TOTAL   41,60', 'TOTAL DES TAXES   6,23', 'TOTAL   47,83']);
    expect(r.value).toBe(47.83);
  });

  it('French: montant dû is read as the final figure', () => {
    const r = amount(['Solde précédent   150,00', 'Montant dû   310,63']);
    expect(r.value).toBe(310.63);
    expect(r.confidence).toBe('high');
  });
});

describe('The biggest number is not the answer', () => {
  it('CASE A: cash tendered and change do not beat the printed total', () => {
    const r = amount([
      '4 STEAK FRITES   240.00', '2 LOBSTER   180.00', '6 WINE   150.00',
      'Subtotal   570.00', 'GST   28.50', 'QST   56.50',
      'TOTAL   655.00',
      'Cash   700.00', 'Change   45.00',
    ]);
    expect(r.value).toBe(655.00);
  });

  it('a suggested gratuity is not the total', () => {
    const r = amount(['Total   655.00', 'Gratuity 15%   98.25', 'Gratuity 20%   131.00']);
    expect(r.value).toBe(655.00);
  });

  it('previous balance and payment lose to the new amount due', () => {
    const r = amount([
      'Previous balance   1,500.00',
      'Payment received   -1,000.00',
      'New amount due   500.00',
    ]);
    expect(r.value).toBe(500.00);
    expect(r.confidence).toBe('high');
  });

  it('a credit is never offered as the amount owed', () => {
    const r = amount(['Credit   -45.00', 'Amount due   12.00']);
    expect(r.value).toBe(12.00);
  });

  it('an account number is not money', () => {
    const r = amount(['Account number 55-1234-9930', 'Amount due   310.63']);
    expect(r.value).toBe(310.63);
  });

  it('a phone number is not money', () => {
    const r = amount(['Tel: 450-555-0142', 'Total   11.60']);
    expect(r.value).toBe(11.60);
  });

  it('a per-unit price is not the total', () => {
    const r = amount(['Price per litre   1.65', 'Litres   42.10', 'Total   69.47']);
    expect(r.value).toBe(69.47);
  });
});

describe('Positive cases that already worked must keep working', () => {
  it('CASE E: total amount due on a phone bill', () => {
    const r = amount(['Your bill', 'Account 519-555-1234', 'Total amount due   $582.25']);
    expect(r.value).toBe(582.25);
    expect(r.confidence).toBe('high');
  });

  it('CASE B: Grand Total and Amount Due agreeing', () => {
    const r = amount(['Grand Total   $49.52', 'Amount Due   $49.52']);
    expect(r.value).toBe(49.52);
    expect(r.confidence).toBe('high');
  });

  it('CASE G: a large utility total with a thousands separator', () => {
    const r = amount(['Total amount due   $1,209.89', 'Due date 15 Sep 2026']);
    expect(r.value).toBe(1209.89);
  });

  it('says nothing rather than inventing a number', () => {
    const r = amount(['THANK YOU', 'PLEASE CALL AGAIN']);
    expect(r.value).toBeUndefined();
    expect(r.confidence).toBe('none');
  });
});

describe('OCR garbage is never a company', () => {
  it('CASE G: a QR payload cannot be the issuer', () => {
    expect(namePlausibility('ql=11tzk9dmupMga MJHN2kd93ndkw')).toBe(0);
  });

  it('rejects the whole family of machine strings', () => {
    for (const junk of [
      'ql=11tzk9dmupMga', 'X7f9d2Kd83ndkw01', '||||| |||| ||||',
      'https://pay.example.com/x', 'www.example.com', 'billing@example.com',
      '4021118899301234', '*******1234', 'a1b2c3d4e5f6g7',
    ]) {
      expect(`${junk} => ${namePlausibility(junk)}`).toBe(`${junk} => 0`);
    }
  });

  it('still believes in ordinary company names', () => {
    for (const name of [
      'CORNWALL ELECTRIC', 'EnergyAustralia', 'Hydro-Québec', 'The Keg Steakhouse',
      'Boulangerie St-Denis', 'A&W', 'Fortis Inc.', 'Shell',
    ]) {
      expect(`${name} => ${namePlausibility(name) > 0}`).toBe(`${name} => true`);
    }
  });

  it('a garbage line loses to the real company above it', () => {
    const r = merchant([
      'CORNWALL ELECTRIC',
      'ql=11tzk9dmupMga MJHN2kd93ndkw',
      'Account number 55-1234-9',
    ]);
    expect(r.name).toBe('CORNWALL ELECTRIC');
  });

  it('a page of nothing but garbage names nobody', () => {
    const r = merchant(['ql=11tzk9dmupMga', 'X7f9d2Kd83ndkw01', '4021118899301234']);
    expect(r.name).toBeUndefined();
    expect(r.confidence).toBe('none');
  });
});

describe('The customer is not the issuer', () => {
  it('CASE D: a customer name does not become the payee', () => {
    const r = merchant([
      'CORNWALL ELECTRIC',
      'Customer: JOHN SMITH',
      '123 Water Street',
    ]);
    expect(r.name).toBe('CORNWALL ELECTRIC');
  });

  it('"Bill to" marks the reader, not the writer', () => {
    const r = merchant(['NORTHERN GAS CO', 'Bill to: Mary Tremblay', '88 King St']);
    expect(r.name).toBe('NORTHERN GAS CO');
  });

  it('an address is never the company', () => {
    const r = merchant(['450 Boul Taschereau', 'BRIGHTVALE MARKET', 'Brossard QC']);
    expect(r.name).toBe('BRIGHTVALE MARKET');
  });

  it('a generic document heading is not the company', () => {
    const r = merchant(['Your electricity account', 'NORTHWIND POWER LTD', 'Account 991']);
    expect(r.name).toBe('NORTHWIND POWER LTD');
  });

  it('"Your phone bill" is not a company', () => {
    const r = merchant(['Your phone bill', 'CLEARLINE COMMUNICATIONS INC', 'Page 1']);
    expect(r.name).toBe('CLEARLINE COMMUNICATIONS INC');
  });

  it('an invoice number is not a company', () => {
    const r = merchant(['Invoice number 99120', 'RIVERSIDE PLUMBING LTD']);
    expect(r.name).toBe('RIVERSIDE PLUMBING LTD');
  });

  it('a URL is not a company', () => {
    const r = merchant(['www.northwindpower.example', 'NORTHWIND POWER LTD']);
    expect(r.name).toBe('NORTHWIND POWER LTD');
  });
});

describe('Evidence raises confidence; position alone does not', () => {
  it('a company suffix reads as confident', () => {
    const r = merchant(['NORTHWIND POWER LTD', 'Account 991']);
    expect(r.confidence).toBe('high');
  });

  it('a name repeated on the page reads as confident', () => {
    const r = merchant(['BRIGHTVALE MARKET', 'Brossard', 'Total 12.00', 'BRIGHTVALE MARKET']);
    expect(r.confidence).toBe('high');
  });

  it('a bare unremarkable line is offered, but only as a guess', () => {
    const r = merchant(['Corner Shop', 'Total 4.00']);
    expect(r.name).toBe('Corner Shop');
    expect(r.confidence).toBe('low');
  });
});

/**
 * ROWS THAT CARRY A POSITIVE LABEL AND STILL ARE NOT THE TOTAL.
 *
 * These isolate the negative rule. Everywhere else, "Total" simply outscores a
 * word like "Subtotal" that carries no positive label at all — so the negative
 * signal could be deleted without a single test noticing. Here it is the only
 * thing separating the right answer from the wrong one, because the losing row
 * contains the word "total" too AND comes last.
 */
describe('A row can say "total" and still not be the total', () => {
  it('TOTAL DES TAXES does not beat the TOTAL above it', () => {
    expect(amount(['TOTAL   47.83', 'TOTAL DES TAXES   6.23']).value).toBe(47.83);
  });

  it('"Total tax" printed after the total does not win', () => {
    expect(amount(['Total   61.95', 'Total tax   2.95']).value).toBe(61.95);
  });

  it('"Total payments received" is not what you owe', () => {
    expect(amount(['Amount due   500.00', 'Total payments received   1,000.00']).value).toBe(500.00);
  });

  it('"Total savings" on a grocery bill is not the total', () => {
    expect(amount(['TOTAL   84.10', 'TOTAL SAVINGS   12.40']).value).toBe(84.10);
  });

  it('"Total discount" is not the total', () => {
    expect(amount(['Total   84.10', 'Total discount   12.40']).value).toBe(84.10);
  });

  it('a subtotal printed BELOW the total still loses', () => {
    expect(amount(['Total   61.95', 'Subtotal   59.00']).value).toBe(61.95);
  });

  it('"Montant des taxes" does not beat "Montant dû"', () => {
    expect(amount(['Montant dû   310,63', 'Montant des taxes   40,10']).value).toBe(310.63);
  });
});

/**
 * RULES PINNED WHERE THEY ARE THE ONLY THING WORKING.
 *
 * Falsification found four rules that could be deleted with every test still
 * green — not because the tests were weak about the OUTCOME, but because each
 * rule was standing behind another that happened to catch the same input
 * first. These cases are chosen so that exactly one rule decides.
 */
describe('Each guard is load-bearing somewhere', () => {
  it('when every candidate is excluded, it says so rather than picking the last one', () => {
    // Isolates the negative penalty: with nothing labelled, position would
    // otherwise hand the answer to whichever excluded row came last.
    const r = amount(['Cash   700.00', 'Change   45.00']);
    expect(r.why).toBe('every candidate was excluded');
    expect(r.confidence).toBe('low');
  });

  it('a tendered-cash line is never confidently the total', () => {
    expect(amount(['Cash tendered   700.00']).confidence).not.toBe('high');
  });

  it('letters braided with a few digits is machine output, not a name', () => {
    // Few enough digits to pass the digit-ratio rule, so only the braiding
    // rule can reject it.
    expect(namePlausibility('Kd83ndkwqmzp')).toBe(0);
    expect(namePlausibility('Qw7ertyuiop')).toBe(0);
  });

  it('a customer line with no punctuation is still the customer', () => {
    // No colon, so the symbol rule does not catch it first.
    const r = merchant(['NORTHERN GAS CO', 'Bill to Mary Tremblay']);
    expect(r.name).toBe('NORTHERN GAS CO');
  });

  it('"Sold to" names the reader even without punctuation', () => {
    const r = merchant(['RIVERSIDE SUPPLY CO', 'Sold to Acme Widgets']);
    expect(r.name).toBe('RIVERSIDE SUPPLY CO');
  });

  it('a generic heading loses even when it is the only tidy line', () => {
    // The company line here carries no suffix and is not shouted, so the
    // heading would win on position alone if it were not excluded.
    const r = merchant(['Your electricity account', 'Northwind Power']);
    expect(r.name).toBe('Northwind Power');
  });
});

describe('The customer wins on position, and must still lose', () => {
  it('a "Bill to" line ABOVE the issuer does not become the payee', () => {
    // When the company logo is a picture rather than text, the customer block
    // can be the first thing OCR reads. Position alone would hand it the name.
    const r = merchant(['Bill to Mary Tremblay', 'Northwind Power']);
    expect(r.name).toBe('Northwind Power');
  });

  it('a "Customer" line first still loses to the company below it', () => {
    const r = merchant(['Customer Mary Tremblay', 'Northwind Power']);
    expect(r.name).toBe('Northwind Power');
  });

  it('a service address block does not become the payee', () => {
    const r = merchant(['Service address 88 King St', 'Northwind Power']);
    expect(r.name).toBe('Northwind Power');
  });
});
