# PeggyBank Smart Quick Capture — Technical Plan
**Status:** Phase A deliverable. **Research + recommendation only. No OCR implemented, no service chosen, no code written.** Awaiting approval.

Quick Capture = photograph a receipt/bill → store image → read it → extract merchant/amount/dates → suggest Expense vs Bill + category → **user reviews and confirms** before anything saves.

---

## 1. Current technical constraints
- **Expo SDK 55.0.27, React Native 0.83.6, `newArchEnabled: true`.** The New Architecture is the single biggest constraint — many community native modules lag New-Arch/SDK-55 support, so any native OCR package must be **validated by a build spike** before we rely on it.
- **Distribution is EAS "preview" APKs (not Expo Go).** Good news: this means **native modules / config plugins / prebuild are available** to us. (Expo Go could not do on-device OCR at all.)
- Already installed and usable: `expo-camera`, `expo-image-picker`, `expo-file-system` (legacy API).
- `expenses` already has a `photo_uri` column; `bills` does **not** (migration required — approved).
- Local/offline app, no backend, no accounts → strong bias toward **on-device** recognition for privacy and zero cost.
- Users are Canadian (en/fr), Latin-script documents → Latin OCR is sufficient.

## 2. OCR / recognition options examined
| Option | Type | Offline | Cost | Structured receipt fields? | New-Arch/SDK55 risk |
|---|---|---|---|---|---|
| **Google ML Kit Text Recognition v2** (via `@react-native-ml-kit/text-recognition` or Infinite Red `react-native-mlkit`) | On-device native | ✅ Yes | ✅ Free | ❌ Raw text + layout only (we parse) | ⚠️ Must verify New-Arch build |
| Tesseract (`tesseract.js` / RN tesseract wrappers) | On-device (JS or native) | ✅ | ✅ Free | ❌ Raw text, lower receipt accuracy | JS build is slow/heavy; native wrappers often unmaintained |
| VisionCamera v4 + OCR frame processor | On-device native | ✅ | ✅ Free | ❌ Raw text | Adds a large camera dependency; New-Arch OK but heavier |
| Google Cloud Vision / AWS Textract / Azure | Cloud | ❌ | 💲 Paid | Partial (Textract forms) | Needs network + **backend to hide keys** |
| **Veryfi / Mindee / Taggun** (receipt-specialized) | Cloud | ❌ | 💲 Paid | ✅ Excellent (merchant/total/date/line-items) | Needs network + backend; best accuracy |

**Key distinction:** on-device engines return **text + word/line positions**, not structured fields. Extracting merchant/amount/date/category is then **PeggyBank's own parsing layer**. Cloud receipt APIs (Veryfi/Mindee) return structured fields directly but are **paid + online + need a backend** — which you have not authorized.

## 3. Recommended approach
**On-device Google ML Kit Text Recognition + a PeggyBank heuristic extraction layer, behind a swappable recognition-provider interface.**
1. **Capture** with `expo-image-picker` `launchCameraAsync` (native retake/use) — or `expo-camera` for a custom in-app shutter.
2. **OCR** the captured image with ML Kit on-device → raw text + line boxes.
3. **Extract** fields with PeggyBank heuristics (regex + keyword dictionaries) → merchant/payee, amount, date, due date, type (Expense/Bill), category, recurrence.
4. **Review** screen shows suggestions with confidence; user corrects and confirms; then it prefills the existing Add Expense / Add Bill flow and saves via existing DB functions.
- The engine sits behind `interface ReceiptRecognizer { recognize(uri): Promise<RecognitionResult> }` with two implementations at first: `MLKitRecognizer` and `ManualRecognizer` (no-op fallback). A cloud provider (Veryfi/Mindee) can later drop in behind the same interface **if** you approve paid/online.

## 4. Why it is recommended
- **Private** (nothing leaves the device — ideal for financial documents), **free**, **offline**, **Android-native**, and **good enough** for Latin receipts/invoices. It fits every stated preference (private, reliable, simple, compatible, low/no cost).
- Cloud receipt APIs are more accurate on structured fields but violate "no paid service / no backend (yet)" and send financial documents off-device. Kept as a **future optional provider**, not the default.
- Raw-OCR + our own parsing keeps us **provider-independent** and lets us tune category logic against our existing `CATEGORIES`.

## 5. Offline?
**Yes — fully offline.** ML Kit text recognition runs on-device with a bundled model. No network needed at capture time. (Only a future cloud provider would need connectivity.)

## 6. Backend or paid API?
**No** for the recommended approach — no backend, no API keys, no cost. A backend/paid API is required **only** if you later choose a cloud receipt provider, which is explicitly out of scope now.

## 7. Privacy & security
- Images and OCR text **never leave the device**. Raw OCR text is used transiently for extraction and **not persisted** (only the final user-confirmed fields + the image file are stored).
- Images stored in the app's private sandbox (`documentDirectory/receipts/`), not the shared gallery.
- Camera permission requested with a clear rationale; denial handled gracefully (manual entry, no crash).
- "Delete all PeggyBank data from this device" (Profile) must also delete the `receipts/` folder.

## 8. Required packages & native-build implications
- **Add:** an ML Kit text-recognition package — candidate `@react-native-ml-kit/text-recognition` (or Infinite Red `@infinitered/react-native-mlkit-ocr`). **Requires a prebuild/config-plugin + a fresh EAS build** (we already build via EAS, so this is in-workflow).
- **Reuse:** `expo-image-picker` (or `expo-camera`) for capture; `expo-file-system/legacy` for image storage.
- **Native-build implication:** first task of the recognition phase is a **compatibility spike** — a throwaway EAS dev build that only links the OCR package and OCRs one image, to prove it builds and runs under **New Architecture + SDK 55** before we build any UI on it. If it fails to link, fall back candidates are VisionCamera+OCR or (with your approval) a cloud provider.
- App size: ML Kit text model adds a few MB to the APK.

## 9. Data model changes
- `bills`: **add nullable `photo_uri TEXT`** via the safe migrations array (old rows → `NULL`). Approved.
- `expenses`: already has `photo_uri` — no change.
- **No new tables.** Extraction results are ephemeral; only user-confirmed fields persist in `expenses`/`bills`.
- `backup.ts` restore already enumerates columns; add `photo_uri` to the bills insert so it round-trips. **Caveat (§10):** the image *file* is device-local; a backup restored on another device will have a `photo_uri` path with no file — the UI must render "image unavailable" gracefully. (Embedding images as base64 in backups is heavy — deferred.)

## 10. Image lifecycle & cleanup
- **Capture** → temp cache URI → on **Use Photo**, downscale (for OCR speed) and **copy** into `documentDirectory/receipts/<uuid>.jpg`; store that path in `photo_uri`.
- **Delete a bill/expense** → delete **only** that row's image file if it lives under `receipts/` (never touch gallery/unrelated files).
- **Wipe-all-data** → remove the entire `receipts/` folder.
- **Orphan sweep** (later maintenance task) → delete `receipts/` files not referenced by any row.
- **Retake/Cancel** → discard the temp capture; never leave stray files.

## 11. Classification logic (Expense vs Bill + category)
Heuristics over the OCR text (no fabricated values — only what's found):
- **Bill signals:** "amount due", "due date", "account number", "statement", "billing period", "invoice", known payee dictionary (Bell, Rogers, Hydro, Telus, utilities/telecom). Recurrence only if "monthly"/billing-cycle wording is present.
- **Receipt/Expense signals:** "total", "subtotal", "tax/GST/HST/PST", "cash/change/visa/debit", merchant name at top, dated transaction, item lines.
- **Amount:** currency regex; prefer the value adjacent to "total"/"amount due"; fallback to the largest plausible total.
- **Dates:** date regex; a date near "due" → due date; otherwise transaction date.
- **Merchant/payee:** top lines and/or payee dictionary.
- **Category:** keyword → existing `CATEGORIES` map (grocery/market→groceries, restaurant/cafe→restaurant, gas/fuel/petro→gas, etc.).

## 12. Confidence & fallback behavior
- Each field carries a confidence derived from signal strength + ML Kit element confidence.
- **High confidence:** prefill and phrase as a suggestion ("Walmart receipt detected for $45.95 — add under Groceries?").
- **Low confidence:** show a **"Please review"** state, highlight uncertain fields, do **not** guess aggressively, allow manual completion.
- **OCR total failure:** keep the image, tell the user it couldn't be read, let them pick Expense/Bill, prefill only trustworthy values, **never lose the photo**.

## 13. Exact implementation phases
- **Phase A (now):** this plan → your approval. *(no code)*
- **Phase B (Safe foundation, after approval):** bills `photo_uri` migration; Profile screen + avatar link; 3-item bottom nav (Home · Camera · More); add Spending/Income/Profile to More; **QuickAdd kept dormant** (nothing links to it); capture→preview→retake→cancel + image storage; define the `ReceiptRecognizer` interface with a working **ManualRecognizer** (choose Expense/Bill, attach image) so Camera is fully usable **before** OCR exists.
- **Phase C (Recognition):** New-Arch compatibility spike → integrate `MLKitRecognizer`; extract fields; classify; confidence-aware review.
- **Phase D (Save integration):** prefill Add Expense / Add Bill, attach image, require confirm, save via existing DB functions.
- **Phase E (Verification):** run the full acceptance-test matrix (§15) on a real device.

## 14. Risks
- **New-Arch/SDK-55 native compatibility of the OCR package** — the top risk; gated by the Phase-C spike; fallbacks identified.
- **Receipt variability** → misreads; mitigated by mandatory human review (nothing saves silently).
- **Backup portability of images** (paths are device-local) — flagged; graceful "image unavailable" handling.
- **Storage growth** from stored images — mitigated by downscaling + orphan sweep.
- **Permission denial / blurry / rotated / partial images** — handled as explicit fallback states.
- **Performance** on large photos — downscale before OCR.

## 15. Acceptance tests
Store receipt · restaurant receipt · gas receipt · utility bill · telephone/internet bill · credit-card statement · invoice · blurry photo · partial document · rotated image · permission denied · OCR failure · user correction · cancellation · duplicate capture · old-database migration · backup/restore impact · delete-all-data cleanup · small-Android-screen layout. Each must end in a correct, non-crashing, user-confirmed outcome (or an honest failure state that preserves the image).

---

## Open approvals needed before Phase B/C
1. **OCR engine:** proceed with **on-device ML Kit** (free/offline/private) as recommended? (A cloud receipt API would be more accurate but paid + online + needs a backend — not now.)
2. **Capture UI:** `expo-image-picker` (native retake/use, simplest) vs `expo-camera` (custom in-app shutter). Recommend `expo-image-picker` first.
3. Confirm the **Phase B foundation may ship with the ManualRecognizer** (Camera works, OCR added in Phase C) so navigation/Profile can be verified on-device without waiting for OCR.

**Sources:**
- [@react-native-ml-kit/text-recognition — npm](https://www.npmjs.com/package/@react-native-ml-kit/text-recognition)
- [Infinite Red react-native-mlkit — GitHub](https://github.com/infinitered/react-native-mlkit)
- [React Native MLKit docs — Infinite Red](https://docs.infinite.red/react-native-mlkit/)
- [rn-mlkit-ocr — GitHub](https://github.com/ahmeterenodaci/rn-mlkit-ocr)
