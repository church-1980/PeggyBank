/**
 * Putting a receipt back into rows.
 *
 * OCR does not hand back a receipt the way a person reads it. ML Kit groups
 * text into BLOCKS, and on a receipt the label column and the amount column are
 * frequently separate blocks. Flattening the result to its plain `text` can
 * therefore produce this:
 *
 *     SUBTOTAL          instead of      SUBTOTAL   10.09
 *     GST 5%                            GST 5%      0.50
 *     TOTAL                             TOTAL      11.60
 *     10.09
 *     0.50
 *     11.60
 *
 * A parser looking for a total on the same line as the word "TOTAL" then finds
 * nothing at all, and every field comes back as "please review" even though the
 * numbers are plainly there.
 *
 * ML Kit does give each line a bounding box. This uses those boxes to rebuild
 * visual rows: lines whose vertical centres sit close together belong to the
 * same row, ordered left to right. Geometry that was being thrown away.
 */

export interface OcrFrame { top: number; left: number; width: number; height: number }
export interface OcrLine { text: string; frame?: OcrFrame }
export interface OcrBlock { text: string; lines?: OcrLine[]; frame?: OcrFrame }

/** Every line from every block, with whatever geometry each one carries. */
export function flattenLines(blocks: OcrBlock[] | undefined): OcrLine[] {
  if (!blocks?.length) return [];
  const out: OcrLine[] = [];
  for (const b of blocks) {
    if (b.lines?.length) {
      for (const l of b.lines) if (l?.text?.trim()) out.push({ text: l.text, frame: l.frame ?? b.frame });
    } else if (b.text?.trim()) {
      out.push({ text: b.text, frame: b.frame });
    }
  }
  return out;
}

/**
 * Rebuild the receipt as visual rows, top to bottom, each read left to right.
 *
 * Two lines share a row when their vertical centres are within `tolerance` of
 * the typical line height. That is deliberately forgiving: a phone photo is
 * never perfectly square to the page, so a label and its amount rarely have
 * identical `top` values.
 *
 * Falls back to plain document order when there is no geometry to work with.
 */
export function rowsFromLines(lines: OcrLine[], tolerance = 0.6): string[] {
  const withGeometry = lines.filter(l => l.frame && Number.isFinite(l.frame.top));
  if (withGeometry.length < 2) return lines.map(l => l.text.trim()).filter(Boolean);

  const heights = withGeometry.map(l => l.frame!.height).filter(h => h > 0).sort((a, b) => a - b);
  const typicalHeight = heights.length ? heights[Math.floor(heights.length / 2)] : 1;
  const band = Math.max(1, typicalHeight * tolerance);

  const centre = (l: OcrLine) => l.frame!.top + l.frame!.height / 2;
  const sorted = [...withGeometry].sort((a, b) => centre(a) - centre(b));

  const rows: OcrLine[][] = [];
  for (const line of sorted) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(centre(line) - centre(row[0])) <= band) row.push(line);
    else rows.push([line]);
  }

  const built = rows.map(row =>
    row.sort((a, b) => a.frame!.left - b.frame!.left)
       .map(l => l.text.trim())
       .filter(Boolean)
       .join('   ')
  ).filter(Boolean);

  // Anything without geometry still deserves to be read; append it rather than
  // dropping text on the floor.
  const withoutGeometry = lines.filter(l => !l.frame).map(l => l.text.trim()).filter(Boolean);
  return built.concat(withoutGeometry);
}

/**
 * The text a parser should read: rows rebuilt from geometry when it exists,
 * otherwise the flat text the engine gave us.
 */
export function readableText(blocks: OcrBlock[] | undefined, fallbackText: string): string {
  const rows = rowsFromLines(flattenLines(blocks));
  if (rows.length >= 2) return rows.join('\n');
  return fallbackText;
}
