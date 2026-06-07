# THE PLASTIC SURGEON — CORE DEVELOPMENT RULES

STOP.

Before writing a single line of code, designing a screen, creating a guide, writing a maintenance procedure, building a camera inspection system, or adding a feature, follow this rule:

**The Plastic Surgeon is designed for people who have NEVER worked on a 3D printer before.**

Assume the user:

- Has never owned a printer.
- Has never changed a nozzle.
- Has never lubricated a machine.
- Has never cleaned an AMS.
- Has never seen a lead screw.
- Does not know what a PTFE tube is.
- Does not know printer terminology.
- May be nervous about damaging their printer.
- May be dyslexic.
- May be using only a phone.
- May not be technically inclined.

The app should feel like a **friendly mechanic standing beside the user.**

If a feature, screen, guide, warning, workflow, or design would confuse a complete beginner, redesign it until it becomes simple.

---

## USER EXPERIENCE PHILOSOPHY

The user should never ask: **"What do I do next?"**

The app should always tell them.

Every screen should have a clear next step.

**Avoid:**
- Technical jargon
- Long paragraphs
- Complex menus
- Hidden actions
- Assumed knowledge

**Prefer:**
- Large buttons
- Large photos
- Large diagrams
- One task at a time
- Plain language
- Simple explanations
- Voice read-aloud support

---

## THE GRANDPARENT TEST

Every feature must pass this test:

> If a grandparent who has never used a 3D printer can successfully complete the task using only The Plastic Surgeon, the feature passes.

If they would become confused, frustrated, or afraid of breaking something, the feature fails and must be redesigned.

---

## GUIDE WRITING RULES

**Never write:**
> "Inspect the PTFE tube for excessive wear."

**Instead write:**
> "Look at the white tube shown in the picture below."

**Good example:**

```
Step 1:
Open the printer door.
[Large Photo]

Step 2:
Find the white tube shown by the red arrow.
[Large Photo]

Step 3:
Look for scratches, grooves, or flattened areas.

Good Tube: [Photo]
Bad Tube:  [Photo]
```

---

## VISUAL FIRST DESIGN

Every maintenance procedure should include:
- Real photos
- Diagrams
- Arrows
- Highlights
- Before and after examples

Whenever possible: **show instead of explain.**

The user should be able to understand the task from pictures alone.

---

## CAMERA INSPECTION RULES

The camera system should guide the user like a mechanic.

**Never say:**
> "Take a picture of the extruder."

**Instead say:**
> "Point your camera at the part shown in the picture."

Display:
- Reference image
- Arrow
- Highlighted target area

Then perform inspection.

**Results must use plain language:**

```
Diagnosis:
Your nozzle looks dirty.

Risk:
Low

What this means:
Small amounts of melted plastic are stuck to the nozzle.
This is normal and won't stop you from printing right now,
but should be cleaned soon.

Recommended treatment:
Clean the nozzle using the steps below.

Estimated repair time:
3 minutes

Difficulty:
Easy
```

---

## JARGON RULE

Every technical term used anywhere in the app must either:

1. Be replaced with plain language, OR
2. Be immediately followed by a simple explanation in plain language

**Examples:**

| ❌ Don't use bare jargon | ✅ Use this instead |
|--------------------------|---------------------|
| PTFE tube | white plastic tube |
| Lead screw | the threaded metal rod that moves the printer up and down |
| Extruder | the part that grips and pushes your filament |
| FEP film | the clear film at the bottom of the resin tank |
| Hotend | the part that melts your filament |
| Bowden tube | the hollow tube that guides filament to the hot part |
| AMS | the automatic filament changer (the box on the side) |

---

## SAFETY RULES

Assume the user does not know:
- What gets hot
- What moves
- What can pinch fingers
- What can damage the printer

**Always provide warnings before relevant steps.**

**Example:**
```
⚠️ Warning
The nozzle may be over 200°C (392°F) — that's hotter than boiling water.

Do not touch the metal tip.

Allow it to cool before continuing unless the guide tells you otherwise.
```

---

## SCREEN DESIGN RULES

- Large touch targets (minimum 48×48dp, prefer 56×56dp for primary actions)
- Large text (body minimum 16pt, instructions minimum 18pt)
- High contrast
- Minimal clutter
- **One primary action per screen**
- No information overload
- No tiny buttons
- No nested menus unless absolutely necessary

The app should feel **calm and welcoming.**

---

## CAMERA MODE IS A CORE FEATURE

The camera is not a bonus feature.

The camera should eventually inspect:
- Nozzles
- Build plates
- AMS systems
- Belts
- Lead screws
- Carbon rods
- PTFE tubes
- Fans
- Extruders
- Wipers
- Cutter blades

Every inspection should produce:
- Diagnosis
- Explanation
- Risk level
- Repair recommendation
- Step-by-step repair guide

---

## THE PLASTIC SURGEON MISSION

> The Plastic Surgeon exists to help ordinary people maintain, repair, inspect, and understand their 3D printers with confidence.

The app should reduce fear.
The app should reduce confusion.
The app should reduce failed prints.
The app should help users learn while protecting their equipment.

Every decision should support that mission.

---

**Created by Jester's Workshop.**
*Saving printers one layer at a time.*
