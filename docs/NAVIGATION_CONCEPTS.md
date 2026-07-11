# PeggyBank — Navigation Architecture: Three Concepts
**Status:** Analysis + recommendation. **No implementation.** Awaiting approval.
**Principle:** Every control has one purpose. Navigation navigates; the Action Hub acts. No duplicated responsibility.

---

## Current state (objective, from the code)
- Bottom bar = **Home · [ + ] · Spending** (only 3 tabs; `AppNavigator.tsx`).
- The center **+** opens the **QuickAdd Action Hub** modal — an action control docked in the nav bar.
- **The "Spending" tab does not open Spending** — a `tabPress` listener routes it to **Add Expense** (`AppNavigator.tsx:129-134`). A navigation tab is performing an action.
- **Two ways to add an expense** already exist: the Spending tab and the + hub → the exact clutter/duplication described.
- The **Action Hub mixes actions with navigation**: it contains Add Expense/Income/Bill/Goal + Check-In (actions) **and** Currency/Calendar/Breakdown/Payday/More (navigation).
- No `Reports` screen exists; `MonthlyBreakdown` and `WeeklyCheckIn` are the insight screens.

**Two conflations to resolve:** (a) nav tabs triggering actions; (b) the Action Hub containing navigation.

---

## Concept 1 — Refined Bottom Nav + Floating Button
**Layout:** A 5-destination bottom bar (Home · Spending · Bills · Insights · More), all pure navigation. The **+** is removed from the bar and becomes a **separate circular FAB floating above the bar** (bottom-right or centered above), opening the Action Hub.

- **Visual hierarchy:** the bar is a calm, even row of five equal nav icons; the FAB is the single purple accent floating clearly *above* the plane of the bar — unmistakably "the do button."
- **Interaction flow:** tap a tab → switch area; tap the floating FAB → Action Hub sheet of actions.
- **Why it's better:** physically separates navigation (in the bar) from action (floating above it). No tab ever performs an action.
- **Pros:** clean five-way navigation; FAB reads as premium/signature; surfaces Insights directly in the bar.
- **Cons:** a floating FAB can overlap scrolling content; five tabs *plus* a floating button is a lot of bottom-edge furniture; **diverges from the Design Bible**, which shows the + docked in the bar.

---

## Concept 2 — Minimal Bottom Nav + Floating Action Hub
**Layout:** Reduce the bar to **four** pure nav items (Home · Spending · Bills · More), no center slot. The **Action Hub becomes the signature independent floating control** (a prominent FAB, bottom-right or center-floating) that is clearly the star of the interface.

- **Visual hierarchy:** minimal four-icon bar recedes; the Action Hub floats as the boldest element near the thumb.
- **Interaction flow:** tabs navigate; the floating Hub is the one place to *create* anything.
- **Why it's better:** maximally calm navigation; the Action Hub is unambiguously PeggyBank's signature gesture; zero duplication.
- **Pros:** the least cluttered bar; strongest "actions live in one place" story; very thumb-friendly.
- **Cons:** Insights/Reports demoted under "More" (less discoverable); a bottom-right FAB is less conventional than a centered one for some users; **also diverges from the Bible**, which shows five slots with a centered +.

---

## Concept 3 — Best professional solution *(recommended)*
**Layout:** Match the **Design Bible exactly** — a five-slot bottom bar **Home · Spending · [ + ] · Bills · More** with the **+ docked in the center** — but enforce the one-purpose principle by fixing the two conflations:

1. **Nav tabs become navigation-only.** Remove the `tabPress` action listeners. "Spending" opens the Spending screen; every tab just navigates.
2. **The center + is action-only.** It is not a navigation destination; its sole job is opening the Action Hub. (It is a docked FAB, not a tab.)
3. **The Action Hub becomes actions-only.** It contains **Add Expense, Add Income, Add Bill, Add Goal, Scan Receipt, Weekly Check-In** — nothing else. The navigation currently inside it (Currency, Calendar, Breakdown, Payday, More) **relocates** to the `More` screen / relevant areas.
4. **Insights:** since no `Reports` screen exists and the Bible's bar is Home/Spending/+/Bills/More, Insights/Reports lives inside **More** (or later promoted), rather than inventing a sixth slot the Bible doesn't show.

- **Visual hierarchy:** the calm four nav icons flank one centered purple + — the exact silhouette in the Design Bible. The + is the brand's focal action gesture.
- **Interaction flow:** four tabs navigate; center + opens the Action Hub; the Hub creates. Each control has exactly one job.
- **Why it's better:** it is the only concept that is **faithful to the approved Design Bible** *and* resolves the conflation. It doesn't invent a new nav style; it corrects the responsibilities behind the Bible's existing layout.
- **Pros:** matches the source of truth pixel-for-pixel; removes all duplication; the signature + is preserved and given a single clear purpose; smallest conceptual change for the user.
- **Cons:** a centered docked + is visually "in" the bar, so the action/navigation split is conceptual rather than spatial (mitigated by it being the only colored, raised element); Insights is one tap deeper (under More).

---

## Recommendation: **Concept 3**
The Design Bible is the source of truth, and it unambiguously shows **Home · Spending · + · Bills · More** with a centered +. Concepts 1 and 2 are legitimate premium patterns, but both **redesign the bar away from the Bible** — which this phase forbids. Concept 3 keeps the Bible's exact bar and instead fixes the *behavior*: nav tabs navigate, the + only opens the Hub, and the Hub holds only actions. This delivers the calm, one-purpose-per-control result you asked for **without redesigning PeggyBank's approved look.**

**If** you decide the + should become a spatially-separate floating control (Concept 1/2), that is a deliberate departure from the Bible and I'd want you to approve that departure explicitly first.

---

## Remaining Dashboard issues — classified
Per the rule, every open item is exactly one of CODE / ASSET / PRODUCT DECISION.

### CODE (I own it — will fix as identified or on your review notes)
- Awaiting your review notes from the latest APK; any spacing/size/position mismatch you call out is CODE I fix on the Dashboard.
- Quick-action labels can wrap to two lines on narrow devices — CODE (can tighten if you dislike it).
- (Nav conflation fixes above are CODE, but gated behind concept approval — not applied yet.)

### ASSET (footprint reserved, waiting on approved artwork — not blocking)
- Hero **piggy** illustration.
- **Goal thumbnails** (beach / car / house circles).
- **Quick Action** icons (currently filled-Ionicon placeholders).
- **Coming Up** bill brand icons (Hydro / Wi-Fi / Netflix).

### PRODUCT DECISION (changes how PeggyBank works — your call)
- **Greeting name** — is there a stored user name, or stay "Good morning!"?
- **Notification badge** — real unread source, or omit the count?
- **"budgeted" figure** — keep mapping to monthly income, or add a real budget feature?
- **Suggestion nudge** — keep it (not in the Bible) or remove it?

---

## Deliverables status
1. ✅ Three navigation concepts (above).
2. ✅ Recommendation with reasoning → **Concept 3**.
3. ✅ Dashboard issues classified (CODE / ASSET / PRODUCT DECISION).
4. ⏸ **Stopped, waiting for approval.** No screen or navigation code changed. No other screen touched.
