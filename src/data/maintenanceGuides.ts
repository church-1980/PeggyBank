import { GuideDifficulty, GuideCategory } from '../types';

// Seed data for offline maintenance guides.
// These are inserted into SQLite at first launch — all guides work without internet.
//
// Beginner-friendly principle: instructions use plain language, no jargon.
// Safety notes are shown in amber before steps that involve heat or sharp tools.

interface GuideSeed {
  guide_key: string;
  title: string;
  description: string;
  category: GuideCategory;
  difficulty: GuideDifficulty;
  estimated_minutes: number;
  printer_types: string[];
  tools_needed: string[];
  parts_needed: string[];
  safety_warnings: string[];
  is_premium: boolean;
}

interface StepSeed {
  step_number: number;
  title: string;
  instruction: string;
  safety_note?: string;
  image_key?: string;
  tip?: string;
  requires_camera: boolean;
}

export const MAINTENANCE_GUIDES: GuideSeed[] = [
  {
    guide_key: 'clean_nozzle_fdm',
    title: 'Clean the Nozzle (Cold Pull)',
    description: 'Remove burnt filament buildup inside the nozzle using the cold pull method. No tools needed.',
    category: 'cleaning',
    difficulty: 'beginner',
    estimated_minutes: 15,
    printer_types: ['FDM'],
    tools_needed: [],
    parts_needed: ['PLA or PETG filament (light color works best)'],
    safety_warnings: [
      'The nozzle reaches 220°C — that is hotter than boiling water. It can cause serious burns instantly. Never touch the metal tip or the block it sits in with bare hands.',
      'Wait for the printer to cool before handling anything near the hot tip. The temperature display on your printer will show when it is safe.',
    ],
    is_premium: false,
  },
  {
    guide_key: 'clean_bed_fdm',
    title: 'Clean the Print Bed',
    description: 'Restore first-layer adhesion by cleaning oil and residue off the print surface.',
    category: 'cleaning',
    difficulty: 'beginner',
    estimated_minutes: 5,
    printer_types: ['FDM'],
    tools_needed: ['Lint-free cloth or paper towel'],
    parts_needed: ['Isopropyl alcohol (90% or higher)'],
    safety_warnings: [
      'Make sure the bed is cool before touching it.',
      'Work in a ventilated area when using isopropyl alcohol.',
    ],
    is_premium: false,
  },
  {
    guide_key: 'level_bed_fdm',
    title: 'Calibrate Bed Level',
    description: 'Set the correct gap between the nozzle and bed so your first layer sticks perfectly.',
    category: 'calibration',
    difficulty: 'beginner',
    estimated_minutes: 20,
    printer_types: ['FDM'],
    tools_needed: ['A sheet of standard printer paper', 'Bed leveling knobs (already on your printer)'],
    parts_needed: [],
    safety_warnings: [
      'The nozzle is hot during this process. Do not touch it.',
      'Move the print head slowly by hand to avoid crashing the nozzle into the bed.',
    ],
    is_premium: false,
  },
  {
    guide_key: 'lubricate_z_fdm',
    title: 'Lubricate Z-Axis Lead Screw',
    description: 'Keep the vertical screw that moves your print head up and down running smoothly.',
    category: 'lubrication',
    difficulty: 'beginner',
    estimated_minutes: 10,
    printer_types: ['FDM'],
    tools_needed: ['Small brush or cotton swab'],
    parts_needed: ['PTFE-based lubricant (SuperLube or similar)'],
    safety_warnings: [
      'Power off the printer before touching the threaded rod. Moving parts can pinch fingers.',
      'Use only a small amount of lubricant — a little goes a long way. Too much attracts dust and grit, which causes grinding instead of smooth movement.',
    ],
    is_premium: false,
  },
  {
    guide_key: 'lubricate_rods_fdm',
    title: 'Lubricate Linear Rods',
    description: 'Oil the smooth steel rods so your print head glides without friction or grinding.',
    category: 'lubrication',
    difficulty: 'beginner',
    estimated_minutes: 10,
    printer_types: ['FDM'],
    tools_needed: ['Lint-free cloth'],
    parts_needed: ['Light machine oil or PTFE grease'],
    safety_warnings: [
      'Power off the printer before lubricating.',
      'Avoid getting oil on the drive belts — it degrades the rubber.',
    ],
    is_premium: false,
  },
  {
    guide_key: 'check_belts_fdm',
    title: 'Check and Tension Drive Belts',
    description: 'Ensure your X and Y axis belts are tight enough for accurate prints without ringing artifacts.',
    category: 'calibration',
    difficulty: 'beginner',
    estimated_minutes: 10,
    printer_types: ['FDM'],
    tools_needed: [],
    parts_needed: [],
    safety_warnings: [
      'Power off the printer before moving the print head by hand.',
      'Do not over-tighten belts — it puts unnecessary stress on the motor.',
    ],
    is_premium: false,
  },
  {
    guide_key: 'clean_extruder_fdm',
    title: 'Clean Extruder Gears',
    description: 'Remove filament dust from the drive gears to keep your extruder gripping filament reliably.',
    category: 'cleaning',
    difficulty: 'beginner',
    estimated_minutes: 10,
    printer_types: ['FDM'],
    tools_needed: ['Small stiff brush (old toothbrush works great)', 'Compressed air (optional)'],
    parts_needed: [],
    safety_warnings: [
      'Power off the printer before working on the extruder.',
    ],
    is_premium: false,
  },
  {
    guide_key: 'inspect_bowden_fdm',
    title: 'Inspect Bowden Tube',
    description: 'Check the PTFE tube that guides filament from the extruder to the hotend for wear and damage.',
    category: 'inspection',
    difficulty: 'beginner',
    estimated_minutes: 15,
    printer_types: ['FDM'],
    tools_needed: ['Tube couplers (in case you need to reseat the tube)'],
    parts_needed: ['Replacement PTFE tube (optional, only if damaged)'],
    safety_warnings: [
      'Let the hotend cool completely before touching the tube at the hotend end.',
      'Damaged PTFE at high temperatures releases fumes. Replace if cracked or melted.',
    ],
    is_premium: false,
  },
  {
    guide_key: 'clean_fans_fdm',
    title: 'Clean Cooling Fans',
    description: 'Blow dust out of the hotend fan and part cooling fan to prevent thermal shutdowns.',
    category: 'cleaning',
    difficulty: 'beginner',
    estimated_minutes: 10,
    printer_types: ['FDM'],
    tools_needed: ['Compressed air can or soft brush'],
    parts_needed: [],
    safety_warnings: [
      'Power off and unplug the printer before cleaning fans.',
      'Hold fan blades still when using compressed air — spinning them too fast can damage the bearings.',
    ],
    is_premium: false,
  },
  {
    guide_key: 'replace_nozzle_fdm',
    title: 'Replace the Nozzle',
    description: 'Swap out a worn or clogged nozzle for a fresh one. Restores print quality and flow.',
    category: 'repair',
    difficulty: 'intermediate',
    estimated_minutes: 20,
    printer_types: ['FDM'],
    tools_needed: ['Adjustable wrench or nozzle wrench', 'Needle-nose pliers'],
    parts_needed: ['Replacement nozzle (matching size — usually 0.4mm)'],
    safety_warnings: [
      'The hotend must be at printing temperature to remove the nozzle safely. 200°C for PLA.',
      'Never grip a heated nozzle with bare hands — always use tools.',
      'The hotend block is also hot — be careful not to touch it.',
    ],
    is_premium: false,
  },
  {
    guide_key: 'tighten_screws_fdm',
    title: 'Check and Tighten Frame Screws',
    description: 'Vibration loosens screws over time. A quick check keeps your printer frame rigid and prints accurate.',
    category: 'repair',
    difficulty: 'beginner',
    estimated_minutes: 15,
    printer_types: ['FDM'],
    tools_needed: ['Allen key set (hex keys)', 'Screwdriver set'],
    parts_needed: [],
    safety_warnings: [
      'Power off the printer before inspecting.',
      'Don\'t overtighten — strip threads means a much bigger repair.',
    ],
    is_premium: false,
  },
  {
    guide_key: 'check_wiring_fdm',
    title: 'Inspect Wiring and Cables',
    description: 'Moving cables can wear through insulation over time. Catching this early prevents electrical failures and fire risk.',
    category: 'inspection',
    difficulty: 'beginner',
    estimated_minutes: 15,
    printer_types: ['FDM'],
    tools_needed: [],
    parts_needed: [],
    safety_warnings: [
      'Power off AND unplug from the wall before inspecting wiring.',
      'If you find exposed copper wire or burned insulation, do not use the printer until it is repaired.',
      'Damaged wiring is a fire hazard. When in doubt, contact the manufacturer or a qualified technician.',
    ],
    is_premium: false,
  },
  // Resin guides
  {
    guide_key: 'clean_fep_resin',
    title: 'Inspect and Clean FEP Film',
    description: 'Check the clear film at the bottom of the resin vat for damage and clean off any residue.',
    category: 'cleaning',
    difficulty: 'beginner',
    estimated_minutes: 15,
    printer_types: ['Resin'],
    tools_needed: ['Plastic scraper (never metal)', 'Lint-free cloth'],
    parts_needed: ['Isopropyl alcohol (90% or higher)'],
    safety_warnings: [
      'Uncured resin is a skin and eye irritant. Wear nitrile gloves and safety glasses.',
      'Work in a ventilated area.',
      'Dispose of resin-contaminated items according to local regulations — do not pour down the drain.',
    ],
    is_premium: false,
  },
  {
    guide_key: 'filter_resin_vat',
    title: 'Filter the Resin Vat',
    description: 'Remove cured chunks from your resin before they cause the next print to fail.',
    category: 'cleaning',
    difficulty: 'beginner',
    estimated_minutes: 20,
    printer_types: ['Resin'],
    tools_needed: ['Paint strainer or old nylon stocking', 'Container for filtered resin'],
    parts_needed: [],
    safety_warnings: [
      'Wear nitrile gloves — uncured resin causes skin sensitization over time.',
      'Wear safety glasses — resin splash is a serious eye hazard.',
      'Work outdoors or with excellent ventilation.',
    ],
    is_premium: false,
  },
  {
    guide_key: 'replace_fep_resin',
    title: 'Replace FEP Film',
    description: 'A scratched or cloudy FEP film causes print failures. This guide walks you through replacing it step by step.',
    category: 'repair',
    difficulty: 'intermediate',
    estimated_minutes: 30,
    printer_types: ['Resin'],
    tools_needed: ['Screwdriver set', 'Allen key set', 'Scissors'],
    parts_needed: ['Replacement FEP film sheet (check your vat size)'],
    safety_warnings: [
      'Wear nitrile gloves throughout — resin residue will be present.',
      'Make sure all resin is cleaned from the vat frame before installing new FEP.',
    ],
    is_premium: false,
  },
];

// Steps for each guide, keyed by guide_key
export const GUIDE_STEPS: Record<string, StepSeed[]> = {

  clean_nozzle_fdm: [
    {
      step_number: 1,
      title: 'Heat the nozzle',
      instruction:
        'Go to your printer\'s temperature controls and set the nozzle to your filament\'s printing temperature (200°C for PLA, 230°C for PETG). Wait for it to reach that temperature.',
      safety_note: 'The nozzle is now dangerously hot. Do not touch it.',
      requires_camera: false,
    },
    {
      step_number: 2,
      title: 'Purge old filament',
      instruction:
        'Using the manual extrude function on your printer, push out about 5cm of filament. This brings fresh material through and pushes burnt residue ahead of it.',
      tip: 'If the filament won\'t move, the nozzle may be clogged. Try bumping the temperature up by 10°C.',
      requires_camera: false,
    },
    {
      step_number: 3,
      title: 'Cool down to the "pull" temperature',
      instruction:
        'Set the nozzle temperature down to 90°C for PLA (or 120°C for PETG). Wait for it to reach that temperature. The filament will start to solidify but stay slightly soft — this is exactly what you want.',
      requires_camera: false,
    },
    {
      step_number: 4,
      title: 'Pull the filament out sharply',
      instruction:
        'Grab the filament with your fingers above the extruder and pull it out in one firm, steady motion. You want a quick, confident pull — not slow and gentle.',
      tip: 'The end of the pulled filament should come out in a clean plug shape and look dark/dirty. That\'s the burnt residue you just removed.',
      requires_camera: true,
    },
    {
      step_number: 5,
      title: 'Inspect the pulled plug',
      instruction:
        'Look at the tip of the filament you just pulled out. A clean nozzle produces a pointy plug. A dirty one produces a blunt, discolored plug. If the plug looks very dirty, repeat steps 1–4 with fresh filament.',
      requires_camera: true,
    },
    {
      step_number: 6,
      title: 'Reload filament and test',
      instruction:
        'Heat back up to printing temperature, reload your filament, and do a test extrusion. The filament should flow smoothly in a consistent line without curling or sputtering.',
      requires_camera: false,
    },
  ],

  clean_bed_fdm: [
    {
      step_number: 1,
      title: 'Let the bed cool completely',
      instruction:
        'If you just finished a print, let the bed cool to room temperature. This usually takes 5–10 minutes. Cleaning a warm bed can warp flexible PEI sheets.',
      requires_camera: false,
    },
    {
      step_number: 2,
      title: 'Remove any stuck prints',
      instruction:
        'If there\'s leftover filament on the bed, flex a spring steel sheet or gently use a plastic scraper to pop it off. Never use metal scrapers on PEI or glass beds.',
      requires_camera: false,
    },
    {
      step_number: 3,
      title: 'Wipe with isopropyl alcohol',
      instruction:
        'Put some isopropyl alcohol on a lint-free cloth and wipe the entire print surface. Use circular motions and flip the cloth to a clean section as it picks up grease.',
      tip: 'Your skin oils reduce adhesion even through gloves. After cleaning, avoid touching the print surface.',
      requires_camera: false,
    },
    {
      step_number: 4,
      title: 'Check the result',
      instruction:
        'Let the alcohol evaporate (30 seconds). The surface should look clean and uniform. If there are still greasy patches, repeat the wipe with a fresh cloth.',
      requires_camera: true,
    },
  ],

  level_bed_fdm: [
    {
      step_number: 1,
      title: 'Home the printer',
      instruction:
        'Use the "Home All" function on your printer. This moves the nozzle to the starting position so we can measure the gap correctly.',
      safety_note: 'The printer will move automatically. Keep hands clear of moving parts.',
      requires_camera: false,
    },
    {
      step_number: 2,
      title: 'Disable the steppers',
      instruction:
        'Use the "Disable Steppers" option in your printer menu. This lets you move the print head and bed by hand without fighting the motors.',
      requires_camera: false,
    },
    {
      step_number: 3,
      title: 'Check the front-left corner',
      instruction:
        'Move the print head to the front-left corner of the bed. Slide a sheet of regular printer paper between the nozzle and bed. You should feel a slight drag — not free movement, not stuck solid.',
      tip: 'This "paper gap" is about 0.1mm — roughly the thickness of a standard sheet of paper.',
      requires_camera: false,
    },
    {
      step_number: 4,
      title: 'Adjust the corner knob',
      instruction:
        'Turn the knob under the bed corner to raise or lower it. Clockwise usually lowers the bed (more gap). Counter-clockwise raises it (less gap). Adjust until you feel the right drag on the paper.',
      requires_camera: false,
    },
    {
      step_number: 5,
      title: 'Repeat for all four corners',
      instruction:
        'Move to each corner in turn and repeat the paper test and adjustment. After doing all four, go back around once more — adjusting one corner affects the others slightly.',
      requires_camera: false,
    },
    {
      step_number: 6,
      title: 'Check the center',
      instruction:
        'Move the print head to the center of the bed and check the paper gap there too. If it\'s very different from the corners, your bed may be warped — consider using bed mesh leveling in your slicer.',
      requires_camera: false,
    },
    {
      step_number: 7,
      title: 'Print a test first layer',
      instruction:
        'Print a first-layer test square (your slicer should have one, or search "first layer calibration" for a free file). The lines should look squished slightly flat, not round on top.',
      requires_camera: true,
    },
  ],

  lubricate_z_fdm: [
    {
      step_number: 1,
      title: 'Power off the printer',
      instruction: 'Turn the printer completely off and unplug it. You\'ll be working near the lead screw and it\'s safer with no power.',
      requires_camera: false,
    },
    {
      step_number: 2,
      title: 'Clean the existing lubricant',
      instruction:
        'Use a dry cloth to wipe off any old grease or accumulated dust from the lead screw. It might look gray or brown from collecting particles. Get it as clean as you can.',
      requires_camera: true,
    },
    {
      step_number: 3,
      title: 'Apply fresh lubricant',
      instruction:
        'Put a small pea-sized amount of PTFE-based grease (SuperLube works great) on your fingertip and spread it thinly along the threads of the lead screw. A thin coat is better than a thick one.',
      tip: 'Do not use WD-40 or cooking oil. They attract dust and make things worse over time. SuperLube (a white greasy paste, available online for a few dollars) is what most 3D printer owners use.',
      requires_camera: false,
    },
    {
      step_number: 4,
      title: 'Work the lubricant in',
      instruction:
        'Power on the printer and use the Z-axis jog function to move the bed or print head up and down several times. This spreads the lubricant evenly across the entire screw length.',
      requires_camera: false,
    },
  ],

  check_belts_fdm: [
    {
      step_number: 1,
      title: 'Power off the printer',
      instruction: 'Turn off the printer. Moving the print head by hand with the motors off is much easier.',
      requires_camera: false,
    },
    {
      step_number: 2,
      title: 'Pluck the X-axis belt',
      instruction:
        'Find the belt that runs along the X-axis (usually behind the print head). Pluck it like a guitar string. It should make a low "twang" sound. If it sounds dull or flops around, it needs tightening.',
      requires_camera: false,
    },
    {
      step_number: 3,
      title: 'Check the X-belt for wear',
      instruction:
        'Look along the belt\'s length. The teeth on the inside should be sharp. Check the edges for fraying. A healthy belt looks uniform and black throughout.',
      requires_camera: true,
    },
    {
      step_number: 4,
      title: 'Repeat for the Y-axis belt',
      instruction:
        'Find the Y-axis belt (usually under the print bed). Repeat the pluck test and visual inspection. The two belts should feel similar in tension.',
      requires_camera: true,
    },
    {
      step_number: 5,
      title: 'Tighten if needed',
      instruction:
        'Most printers have a tensioner screw or sliding idler that you can adjust. Tighten until the belt resists a sideways push with your finger but isn\'t stretched drum-tight. Consult your printer\'s manual for the specific tensioner location.',
      requires_camera: false,
    },
  ],

  clean_extruder_fdm: [
    {
      step_number: 1,
      title: 'Power off and unload filament',
      instruction: 'Turn off the printer. If filament is loaded, heat the nozzle and remove it before working on the extruder.',
      requires_camera: false,
    },
    {
      step_number: 2,
      title: 'Locate the extruder gears',
      instruction:
        'The extruder is the motor assembly that grips and pushes filament. It\'s usually near where the filament enters from the spool. You should be able to see the toothed drive gear.',
      requires_camera: false,
    },
    {
      step_number: 3,
      title: 'Brush out the gear teeth',
      instruction:
        'Use an old toothbrush or small stiff brush to sweep filament dust out of the gear teeth. The dust looks like a colored or gray powder packed into the grooves. A few passes is usually enough.',
      tip: 'A puff of compressed air blows the dust away cleanly — but wear eye protection.',
      requires_camera: true,
    },
    {
      step_number: 4,
      title: 'Check gear tension',
      instruction:
        'On some extruders there\'s a spring-loaded arm that holds the filament against the drive gear. Make sure it springs back when you push it. If it feels loose or the spring is weak, the extruder won\'t grip filament reliably.',
      requires_camera: false,
    },
  ],

  clean_fans_fdm: [
    {
      step_number: 1,
      title: 'Power off and unplug',
      instruction: 'Always unplug the printer before cleaning fans. Spinning the fan blades manually can generate a small current and could damage electronics.',
      requires_camera: false,
    },
    {
      step_number: 2,
      title: 'Hold the blades still',
      instruction:
        'Use a finger to gently hold the fan blades in place. This protects the bearings from spinning too fast when you blow air through them.',
      requires_camera: false,
    },
    {
      step_number: 3,
      title: 'Blow out dust from the hotend fan',
      instruction:
        'Use a can of compressed air or a soft brush to remove dust from the small fan mounted on the heatsink of the hotend. Direct air through from the back side to blow dust out the front.',
      requires_camera: true,
    },
    {
      step_number: 4,
      title: 'Clean the part cooling fan',
      instruction:
        'Find the fan that blows air at the printed part (usually under the print head assembly, with a duct pointing at the nozzle tip). Clean it the same way.',
      requires_camera: true,
    },
    {
      step_number: 5,
      title: 'Power on and verify both fans spin',
      instruction:
        'Power the printer on. Both fans should spin up within a few seconds. Watch and listen — a clean fan runs quietly. A fan that clicks or whirs has bearing wear and should be replaced soon.',
      requires_camera: false,
    },
  ],

  replace_nozzle_fdm: [
    {
      step_number: 1,
      title: 'Heat the nozzle to printing temperature',
      instruction:
        'Set the nozzle to your usual printing temperature (200°C for PLA). Never remove a nozzle cold — the brass threads can seize and strip.',
      safety_note: 'The nozzle and hotend block will be at 200°C or more. Only touch the tools, never the metal.',
      requires_camera: false,
    },
    {
      step_number: 2,
      title: 'Hold the heater block steady',
      instruction:
        'Use a wrench to grip the heater block and hold it completely still. This is important — if the block rotates, you can tear the wiring or loosen the heater cartridge.',
      safety_note: 'Use pliers or a wrench, never your hands. Both parts are at 200°C.',
      requires_camera: false,
    },
    {
      step_number: 3,
      title: 'Unscrew the old nozzle',
      instruction:
        'With the block held still, use your nozzle wrench (or adjustable wrench) to unscrew the nozzle counter-clockwise. It should come off after 4–6 turns.',
      tip: 'Have a heat-resistant surface ready to set the old nozzle on.',
      requires_camera: false,
    },
    {
      step_number: 4,
      title: 'Thread on the new nozzle',
      instruction:
        'Screw the new nozzle in by hand first. Once it\'s threaded in all the way, snug it down with the wrench — firm but not gorilla-tight. About a quarter turn past hand-tight.',
      requires_camera: false,
    },
    {
      step_number: 5,
      title: 'Cool down and test',
      instruction:
        'Let the printer cool completely, then heat it back up for a test print. Watch the first few layers carefully for any leaking from around the nozzle threads.',
      requires_camera: true,
    },
  ],

  check_wiring_fdm: [
    {
      step_number: 1,
      title: 'Power off and unplug from the wall',
      instruction: 'Turn the printer off and unplug the power cable from the wall outlet. This is not optional — you\'re inspecting electrical wiring.',
      safety_note: 'Do not skip this step. Inspecting live wiring risks electric shock and fire.',
      requires_camera: false,
    },
    {
      step_number: 2,
      title: 'Trace the print head cable bundle',
      instruction:
        'Follow the bundle of cables from the print head (it usually runs through a cable chain or sleeve) back to the electronics enclosure. Look at every centimeter.',
      requires_camera: false,
    },
    {
      step_number: 3,
      title: 'Check for chafed insulation',
      instruction:
        'Look for spots where the cable insulation looks rubbed through, cracked, or melted. Bends in the cable chain that are too sharp cause this over time.',
      requires_camera: true,
    },
    {
      step_number: 4,
      title: 'Check connectors',
      instruction:
        'Look at each connector (the plastic plugs where wires join). They should be fully seated, with no visible copper wire showing outside the connector body.',
      requires_camera: true,
    },
    {
      step_number: 5,
      title: 'Check the heated bed wiring',
      instruction:
        'The heated bed has two heavy wires (usually red and black or red and white) that flex every time the bed moves. These are high-stress — inspect them carefully near where they attach to the bed.',
      safety_note: 'If you find any exposed copper, burned insulation, or partially-seated connectors, do not use the printer until they are repaired.',
      requires_camera: true,
    },
  ],

  clean_fep_resin: [
    {
      step_number: 1,
      title: 'Empty and drain the vat',
      instruction:
        'Pour the resin out of the vat through a paint strainer into a sealed container. Tip the vat slowly and use a rubber scraper to get as much resin out as possible.',
      safety_note: 'Wear nitrile gloves and safety glasses. Uncured resin is a skin and eye irritant.',
      requires_camera: false,
    },
    {
      step_number: 2,
      title: 'Look for cured chunks',
      instruction:
        'Hold the empty vat up to a light source and look through the FEP film for any solid pieces stuck to it. They will look darker than the clear film.',
      requires_camera: true,
    },
    {
      step_number: 3,
      title: 'Remove cured pieces gently',
      instruction:
        'If you see cured resin, use a PLASTIC scraper to gently slide under the edge and pop it free. Never use metal — even a single scratch can cause print failures.',
      safety_note: 'Be gentle. You\'re cleaning a film that\'s similar in thickness to cling wrap.',
      requires_camera: false,
    },
    {
      step_number: 4,
      title: 'Wipe with IPA',
      instruction:
        'Dampen a lint-free cloth with isopropyl alcohol and gently wipe the FEP film in circular motions. This removes residue that makes the film tacky.',
      requires_camera: false,
    },
    {
      step_number: 5,
      title: 'Check film condition',
      instruction:
        'Hold the vat up to light again. The FEP should look clear and transparent. If it looks cloudy, scratched, or has opaque patches, it needs to be replaced — cleaning won\'t restore a damaged film.',
      requires_camera: true,
    },
  ],

  filter_resin_vat: [
    {
      step_number: 1,
      title: 'Set up your filtering station',
      instruction:
        'Set a clean container on your work surface and place a paint strainer or folded piece of nylon stocking over the opening. This is where you\'ll pour the resin.',
      safety_note: 'Work in a ventilated area. Wear nitrile gloves and safety glasses throughout.',
      requires_camera: false,
    },
    {
      step_number: 2,
      title: 'Gently stir the resin',
      instruction:
        'Use a silicone spatula to gently stir the resin in the vat. This loosens any settled pigment and floats small cured bits to the top where the strainer will catch them.',
      requires_camera: false,
    },
    {
      step_number: 3,
      title: 'Pour through the strainer',
      instruction:
        'Slowly pour the resin through the strainer into the clean container. Pour slowly so the strainer doesn\'t overflow.',
      requires_camera: false,
    },
    {
      step_number: 4,
      title: 'Inspect what the strainer caught',
      instruction:
        'Look at the cured bits in the strainer. Many small pieces mean your last print had adhesion issues. A few is normal. Many large pieces means the FEP may be damaged.',
      requires_camera: true,
    },
    {
      step_number: 5,
      title: 'Store or return the filtered resin',
      instruction:
        'You can pour the filtered resin back into your vat for the next print, or seal it in its original bottle in a cool, dark place. Label it with the date.',
      requires_camera: false,
    },
  ],

  replace_fep_resin: [
    {
      step_number: 1,
      title: 'Empty and clean the vat completely',
      instruction:
        'Pour out all resin and clean the vat with IPA until no residue remains. You need a fully dry, clean vat frame to seat the new FEP properly.',
      safety_note: 'Wear nitrile gloves and safety glasses throughout this entire guide.',
      requires_camera: false,
    },
    {
      step_number: 2,
      title: 'Remove the vat frame screws',
      instruction:
        'Find the screws around the perimeter of the vat bottom that clamp the FEP film in place. Remove them all and keep them in a small container — losing one makes reassembly very difficult.',
      requires_camera: false,
    },
    {
      step_number: 3,
      title: 'Remove the old FEP',
      instruction:
        'Lift the old FEP away from the frame. Dispose of it in a sealed bag since it has resin residue. Clean the groove in the frame with IPA to remove any old sealant or debris.',
      requires_camera: false,
    },
    {
      step_number: 4,
      title: 'Cut the new FEP to size',
      instruction:
        'If your replacement film is larger than the vat, cut it to match. Leave a small border (about 1cm) beyond the screw holes so the clamp frame has material to grip.',
      requires_camera: false,
    },
    {
      step_number: 5,
      title: 'Position and clamp the new FEP',
      instruction:
        'Lay the new FEP flat over the vat opening and place the clamping frame on top. Start screws in opposite corners first, then work around evenly — like tightening lug nuts on a car wheel. This keeps tension even.',
      tip: 'The FEP should look tight and wrinkle-free when clamped, like a drum skin.',
      requires_camera: true,
    },
    {
      step_number: 6,
      title: 'Test before adding resin',
      instruction:
        'Run the Z-axis down until it touches the FEP. It should deflect slightly then spring back. If it punches through, the film is too loose. If there\'s no deflection at all, it may be too tight.',
      requires_camera: false,
    },
  ],
};
