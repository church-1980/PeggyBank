# PeggyBank — Master Icon List (LEAN CORE)
**Status:** Source of truth for icon generation. Supersedes the earlier 25-key set for *what to generate*.
**Decision:** 15 broad-bucket icons. Each goal/category picks one icon; the user types their own name for it. No custom photo uploads (protects the premium, consistent look). "other" is the catch-all.

---

## The 15 icons

| # | icon key | picture | covers (buckets it replaces) |
|--|--|--|--|
| 1 | travel | airplane or suitcase | vacation, flight, cruise, Disney/theme-park trip |
| 2 | vehicle | car | new car, motorcycle |
| 3 | home | house | home, new home, down payment, renovation |
| 4 | family | parent + child / family | wedding, baby, kids |
| 5 | education | graduation cap | school, tuition |
| 6 | emergency-fund | shield + checkmark | rainy-day savings |
| 7 | investing | money plant | investing, business, retirement |
| 8 | debt | broken chain | pay off debt |
| 9 | gifts | gift box | gifts, holidays, Christmas |
| 10 | health | medical cross | medical, health |
| 11 | pet | paw print | pet, pets |
| 12 | food | grocery basket / plate | groceries, eating out, restaurant |
| 13 | shopping | shopping bag | shopping, everyday buys |
| 14 | fun | game controller | fun, gaming, tech, hobbies, entertainment |
| 15 | other | plus in a dotted circle | anything else (fully customizable name) |

**Total: 15 icons.**

## How "modify to what they want" works
- When adding a goal or expense, the user **names it freely** (any text) and **picks one of the 15 icons**.
- The icon is the visual bucket; the name is personal (e.g. icon = `travel`, name = "Italy 2027").
- Nothing else to build for personalization — no uploads, no extra art. `other` covers edge cases.

## Visual style (unchanged from Icon System v1.0)
Premium 3D, soft depth, subtle gradients, polished highlights, rounded geometry, consistent top-left lighting, soft shadow, transparent background, 1024×1024 PNG, single centered object. Reference: `design/PeggyBank-Icon-System-v1.png`.

## Generation filenames (drop into assets/peggy-icons/)
travel.png · vehicle.png · home.png · family.png · education.png · emergency-fund.png · investing.png · debt.png · gifts.png · health.png · pet.png · food.png · shopping.png · fun.png · other.png
