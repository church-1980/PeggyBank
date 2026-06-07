# THE PLASTIC SURGEON — VISUAL LEARNING & BEGINNER-FIRST DEVELOPMENT DIRECTIVE

Created by Jester's Workshop

---

## THIS OVERRIDES ALL PREVIOUS ASSUMPTIONS

The Plastic Surgeon is NOT a maintenance tracker.
The Plastic Surgeon is NOT a technical manual.
The Plastic Surgeon is NOT built for experienced makers.

**The Plastic Surgeon is a visual teaching system** that helps complete beginners safely inspect, clean, maintain, diagnose, repair, and understand their 3D printers.

The user should feel like an experienced technician is standing beside them, guiding them one step at a time.

---

## THE GRANDPARENT TEST

Every feature must pass the Grandparent Test.

> If a grandparent who has never touched a 3D printer can successfully complete the task using only The Plastic Surgeon, the feature passes.

If they become confused, scared, overwhelmed, or unsure what to do next — the feature fails. Redesign it.

---

## THE VISUAL FIRST RULE

**Pictures teach. Text supports. Never rely on text alone.**

Every inspection point, every guide, every repair, every maintenance task must include visual learning.

The app must answer **"What am I looking at?"** before asking **"What should I do?"**

---

## REQUIRED VISUAL STRUCTURE

Every maintenance guide, repair guide, inspection checkpoint, and educational screen must contain these six sections — **always in this order:**

1. **Part Identification** — Show the part, name it, explain what it does and why it matters
2. **Good Example** — Photo + "This part is clean and working normally"
3. **Bad Example** — Photo + "This part needs maintenance"
4. **Camera Inspection** — 5-step guided camera positioning
5. **Diagnosis** — Headline / Risk / What This Means / Recommended Action / Time / Difficulty
6. **Repair Procedure** — Step-by-step guide link

---

## PART IDENTIFICATION SECTION

Before asking the user to inspect anything, show:

- Large photo
- Arrow pointing to the part
- Highlighted area
- Part name (plain language)
- What it does
- Why it matters

**Example:**

```
PART NAME:
Nozzle

WHAT IT DOES:
The nozzle melts plastic and places it onto the print.

WHY IT MATTERS:
A dirty nozzle can cause failed prints.
```

Never assume the user knows where the nozzle is.
Never assume they know what it does.

---

## GOOD VS BAD EXAMPLES

Every inspection point must include:

**GOOD EXAMPLE**
- Photo
- Caption: "This part is clean and working normally."

**BAD EXAMPLE**
- Photo
- Caption: "This part needs maintenance."

Users should be able to learn from pictures before touching the machine.

---

## CAMERA INSPECTION SYSTEM

The camera should behave like a mechanic guiding the user.

**Never display:** "Take Photo"

**Instead display:**

```
Step 1: Find the part shown below.
Step 2: Match your printer to the picture.
Step 3: Move your camera 10–15 cm (4–6 inches) away.
Step 4: Center the highlighted area in the frame.
Step 5: Tap Inspect.
```

The user should always know exactly where to point the camera.

---

## FUTURE AI INSPECTION SYSTEM

Architecture must support future AI image analysis. When AI ships:

- User takes photo
- AI draws circles, arrows, and highlights directly onto the image
- Red Circle: damaged component
- Yellow Arrow: buildup or residue
- Blue Highlight: area requiring lubrication

The user should never have to guess what the AI found.
The app should literally point at the problem.

**All photo storage must preserve originals at full resolution for future AI processing.**

---

## DIAGNOSIS SCREEN STANDARD

Every inspection result must contain:

```
DIAGNOSIS:     Dirty Nozzle
RISK:          Low
WHAT THIS MEANS: Melted plastic has built up around the nozzle.
RECOMMENDED ACTION: Clean the nozzle using the guided cleaning procedure.
ESTIMATED TIME: 3 Minutes
DIFFICULTY:    🟢 Beginner
```

---

## WHAT IS THIS PART BUTTON

Every major component must have a **"What Is This?"** button.

Pressing it opens:
- Part photo
- Part name (plain language)
- Purpose (one sentence, plain language)
- Common problems (bulleted list, plain language)
- Maintenance interval

**No engineering terminology. No technical jargon. Plain language only.**

---

## DIFFICULTY SYSTEM

Every task and guide must be labeled:

| Badge | Level | Meaning |
|-------|-------|---------|
| 🟢 Beginner | No experience needed | Example: Clean the print surface |
| 🟡 Intermediate | Careful attention required | Example: Replace the white plastic tube |
| 🔴 Advanced | Partial disassembly required | Example: Extruder teardown |

Users must know what they are getting into before starting.

---

## GUIDE WRITING RULES

**Never write:** "Inspect the PTFE tube."
**Write:** "Look at the white plastic tube shown by the red arrow."

**Never write:** "Verify extruder operation."
**Write:** "Make sure the printer pulls filament smoothly without clicking noises."

Use normal human language. Avoid technical terms whenever possible.

When technical terms are required, **explain them immediately:**

```
Lead Screw
(The tall threaded rod that moves the printer up and down)

PTFE Tube
(The white plastic tube that guides filament)

Nozzle
(The small metal tip that melts plastic)
```

---

## SAFETY SYSTEM

Assume the user has no technical experience.

Before every potentially dangerous step, explain:
1. What is dangerous
2. Why it is dangerous
3. How to avoid injury

**Example:**
```
⚠️ WARNING
The nozzle may be hotter than boiling water.
Touching it can cause serious burns instantly.
Allow it to cool before continuing.
```

---

## SCREEN DESIGN RULES

- Mobile first — phone-first, one-handed use
- Large buttons — minimum 48×48dp, prefer 56×56dp for primary actions
- Large touch targets
- Large images — never small thumbnails for inspection photos
- Large text — body minimum 16pt, instructions minimum 18pt
- High contrast
- **One primary action per screen**
- No information overload
- No hidden actions

The user should never wonder what button to press next.

---

## VOICE ASSISTANT RULE

Every guide step must eventually support **"Read Step Aloud"**.

This enables:
- Hands-free maintenance (dirty hands can't touch the phone)
- Accessibility support
- Dyslexia support

Architecture: use `expo-speech` for TTS. The "Read Step" button should be present in the UI now, even if wired to a stub. When TTS ships, remove the stub.

---

## CAMERA IS A CORE FEATURE

The camera system is not optional.
It is one of the primary reasons this application exists.
All architecture decisions must support future AI image analysis.

Target inspection components:
- Nozzle, Build Plate, Carbon Rods, Lead Screws, Belts
- AMS, PTFE Tubes, Fans, Extruder, Wiper, Cutter Blade

---

## ULTIMATE GOAL

A person who has never touched a 3D printer should be able to:

Identify parts → Understand parts → Inspect parts → Maintain parts → Repair parts → Replace parts → Diagnose problems → Complete maintenance safely.

**Using only The Plastic Surgeon. No YouTube. No forums. No Discord. No outside help.**

Everything must be understandable directly from the app.

---

## MISSION STATEMENT

> The Plastic Surgeon exists to reduce fear, confusion, failed prints, and expensive mistakes. The app should teach, guide, diagnose, and build confidence. Every feature should help ordinary people take care of their printers.

**Created by Jester's Workshop.**
*Saving printers one layer at a time.*
