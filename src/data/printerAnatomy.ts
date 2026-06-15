// Interactive Printer Anatomy System — Part Data
// Phase 1: Static educational content for all 17 supported parts.
// Image keys are placeholders — real images slot in as assets are produced.
// All content must pass the Grandparent Test: a person who has never touched
// a 3D printer should understand every field without outside help.

import { AnatomyPart, ANATOMY_CATEGORIES } from '../types/anatomy';

export { ANATOMY_CATEGORIES };

// ─── Part Definitions ────────────────────────────────────────────────────────

export const PRINTER_ANATOMY: AnatomyPart[] = [

  // ── HOTEND SYSTEM ───────────────────────────────────────────────────────────

  {
    key:         'nozzle',
    displayName: 'Nozzle',
    simpleName:  'The small metal tip at the very bottom of the print head',
    category:    'hotend_system',
    printer_types: ['FDM'],

    what_it_is:     'The nozzle is the tiny metal tip that melts your plastic and places it onto the print.',
    what_it_does:   'Filament (plastic wire) enters the top of the nozzle. A heater block heats the nozzle to over 200°C. The plastic melts and is pushed out through a tiny hole at the tip, building your print one layer at a time.',
    why_it_matters: 'A dirty or worn nozzle causes blobs, gaps, and failed prints. A clogged nozzle means nothing comes out at all. Regular inspection prevents most common print problems.',
    location_tip:   'Look underneath the print head (the part that moves around). The nozzle is the small metal cone or cylinder pointing straight down.',
    common_problems: [
      'Burnt plastic buildup on the outside of the tip',
      'Partial or full clog — plastic stops flowing or comes out thin',
      'Worn tip — the hole gets larger over time, affecting print quality',
      'Stripped thread — nozzle becomes loose and leaks plastic',
    ],
    maintenance_interval: 'Visually inspect before every print. Clean burnt plastic buildup monthly or every 100 print hours. Replace if worn or damaged.',

    what_good_looks_like: 'The metal tip is clean and shiny or lightly discolored from heat. No plastic buildup around the outside. The hole at the tip is round and clear.',
    what_bad_looks_like:  'Burnt dark plastic crusted around the outside of the tip. Plastic oozing from the sides. Tip looks rough, damaged, or heavily discolored.',

    asset: {
      referenceImageKey:   'anatomy_nozzle_reference',
      highlightedImageKey: 'anatomy_nozzle_highlighted',
      goodExampleKey:      'anatomy_nozzle_good',
      badExampleKey:       'anatomy_nozzle_bad',
    },

    camera_guidance: {
      step1_find:    'Look underneath the moving part that travels side to side. Find the small metal cone pointing straight down.',
      step2_match:   'The nozzle looks like a tiny metal bullet or cone. It should be the lowest point of the print head.',
      step3_distance:'Move your camera about 8 cm (3 inches) away from the nozzle tip.',
      step4_center:  'Center the tip of the nozzle in the middle of the camera frame so you can see the very end of it.',
      step5_action:  'Tap Inspect when the metal tip is clearly visible and in focus.',
    },

    education_animation: [],

    related_checkpoint_keys: ['nozzle_condition'],
    related_guide_keys:      ['clean_nozzle_fdm', 'replace_nozzle_fdm'],
  },

  {
    key:         'hotend',
    displayName: 'Hotend',
    simpleName:  'The heating unit that the nozzle screws into — the silver or copper block on the print head',
    category:    'hotend_system',
    printer_types: ['FDM'],

    what_it_is:     'The hotend is the heating assembly that melts your plastic. The nozzle screws into the bottom of it.',
    what_it_does:   'Inside the hotend is a small electric heater (called a heater cartridge) and a temperature sensor. The heater warms the metal block to the temperature you choose, and the sensor tells the printer if it reached that temperature. Plastic flows through the center of the hotend and melts before reaching the nozzle.',
    why_it_matters: 'If the hotend leaks, plastic will ooze everywhere and can burn. If the heater or sensor fails, the printer cannot reach printing temperature and will stop with an error.',
    location_tip:   'Look at the print head (the part that moves). The hotend is the metallic block in the lower section of the print head, directly above the nozzle.',
    common_problems: [
      'Plastic leak between the nozzle and hotend block',
      'Heater cartridge failure — printer cannot reach temperature',
      'Temperature sensor failure — printer shows temperature errors',
      'Heat creep — plastic melts too early, causing soft clogs higher up',
    ],
    maintenance_interval: 'Visually inspect for leaks and burnt plastic monthly. Do not attempt to disassemble unless following a repair guide.',

    what_good_looks_like: 'Metal block looks clean or lightly discolored from heat. No plastic oozing from around the nozzle joint. Wires connected to it look intact.',
    what_bad_looks_like:  'Plastic leak visible around the nozzle. Dark burned plastic coating the block. Wires look damaged or pulled loose.',

    asset: {
      referenceImageKey:   'anatomy_hotend_reference',
      highlightedImageKey: 'anatomy_hotend_highlighted',
      goodExampleKey:      'anatomy_hotend_good',
      badExampleKey:       'anatomy_hotend_bad',
    },

    camera_guidance: {
      step1_find:    'Find the metallic block directly above the nozzle on the print head. It is usually silver, copper-colored, or wrapped in a silicone sock.',
      step2_match:   'The hotend block is a small square or rectangular piece of metal with wires going into it. The nozzle screws into its bottom.',
      step3_distance:'Move your camera about 10 cm (4 inches) away from the hotend block.',
      step4_center:  'Center the hotend block in the frame so you can see the joint where the nozzle meets the block.',
      step5_action:  'Tap Inspect when the nozzle-to-block connection is clearly visible.',
    },

    education_animation: [],

    related_checkpoint_keys: ['nozzle_condition'],
    related_guide_keys:      ['clean_nozzle_fdm'],
  },

  // ── FILAMENT SYSTEM ─────────────────────────────────────────────────────────

  {
    key:         'extruder',
    displayName: 'Extruder',
    simpleName:  'The motor and gear assembly that pushes plastic wire (filament) into the printer',
    category:    'filament_system',
    printer_types: ['FDM'],

    what_it_is:     'The extruder is the motor-driven gear system that grips and pushes your plastic filament toward the nozzle.',
    what_it_does:   'A small motor turns a toothed gear that grips the filament and pushes it forward. A second gear (the idler) holds the filament against the drive gear so it cannot slip. The speed of the motor controls how much plastic is pushed to the nozzle.',
    why_it_matters: 'If the extruder cannot grip the filament, your printer will make a clicking noise and stop printing. A dirty or worn extruder gear causes inconsistent plastic flow and poor print quality.',
    location_tip:   'On a direct-drive printer, the extruder is on the print head itself — look for a small motor with a gear visible through a gap or window. On a Bowden printer, the extruder is mounted to the frame, separate from the print head.',
    common_problems: [
      'Clicking noise during printing — filament is slipping through the gears',
      'Ground-up filament particles around the extruder — teeth are chewing through the plastic',
      'Filament not advancing — worn gear teeth can no longer grip',
      'Idler arm not holding filament firmly — spring tension too low',
    ],
    maintenance_interval: 'Check for clicking noises during every print. Inspect the gear teeth and clean debris monthly. Replace worn gears annually or when clicking becomes frequent.',

    what_good_looks_like: 'Gear teeth are sharp and clear. No plastic shavings around the mechanism. Filament feeds smoothly without clicking.',
    what_bad_looks_like:  'Ground plastic dust or shavings under the extruder. Worn-down gear teeth. Filament with bite marks or grinding marks on it.',

    asset: {
      referenceImageKey:   'anatomy_extruder_reference',
      highlightedImageKey: 'anatomy_extruder_highlighted',
      goodExampleKey:      'anatomy_extruder_good',
      badExampleKey:       'anatomy_extruder_bad',
    },

    camera_guidance: {
      step1_find:    'Find the small motor on the print head (direct drive) or on the side of the printer frame (Bowden). Look for a toothed gear visible near the filament path.',
      step2_match:   'The extruder has a gear that the filament passes through. You may see a spring-loaded arm pressing the filament against the gear.',
      step3_distance:'Move your camera 8–10 cm (3–4 inches) from the extruder gear.',
      step4_center:  'Center the toothed gear in the frame so you can see the teeth clearly.',
      step5_action:  'Tap Inspect when the gear teeth are clearly visible.',
    },

    education_animation: [],

    related_checkpoint_keys: ['extruder_gears'],
    related_guide_keys:      ['clean_extruder_gears'],
  },

  {
    key:         'ptfe_tube',
    displayName: 'PTFE Tube',
    simpleName:  'The white plastic tube that guides the filament from the extruder to the nozzle',
    category:    'filament_system',
    printer_types: ['FDM'],

    what_it_is:     'The PTFE tube is a white or transparent flexible plastic tube that filament slides through on its way to the nozzle.',
    what_it_does:   'PTFE (Teflon) is extremely slippery, which allows filament to glide through it with very little resistance. On Bowden printers, this tube connects the extruder (mounted on the frame) to the hotend. On direct-drive printers, it is a short tube inside the hotend itself. PTFE is also heat-resistant, making it safe to use near the hot parts of the printer.',
    why_it_matters: 'A damaged PTFE tube causes filament jams and failed prints. At temperatures above 240°C the tube can degrade and release harmful fumes. A cracked or contaminated tube cannot be cleaned — it must be replaced.',
    location_tip:   'Follow the filament path from the extruder toward the print head. The PTFE tube is the white plastic tube the filament runs through. On Bowden printers it is clearly visible as a long white tube. On direct-drive printers, it may be hidden inside the hotend.',
    common_problems: [
      'Cracked or kinked tube — filament cannot pass smoothly',
      'Discolored or yellowed tube — sign of heat damage or age',
      'Gap between tube and nozzle — plastic fills the gap and causes blockages',
      'Burned or melted tip where it meets the hotend',
    ],
    maintenance_interval: 'Inspect the tube when you have a filament jam. Replace annually or whenever you see discoloration, cracking, or gaps at the nozzle connection.',

    what_good_looks_like: 'Tube is white or very light translucent color. Straight with no kinks or cracks. Seated firmly at both ends with no gaps.',
    what_bad_looks_like:  'Tube is yellowed or brown from heat. Visible crack, kink, or squashed section. Gap visible at the end where it meets the hotend.',

    asset: {
      referenceImageKey:   'anatomy_ptfe_tube_reference',
      highlightedImageKey: 'anatomy_ptfe_tube_highlighted',
      goodExampleKey:      'anatomy_ptfe_tube_good',
      badExampleKey:       'anatomy_ptfe_tube_bad',
    },

    camera_guidance: {
      step1_find:    'Follow the filament path from the extruder. Find the white flexible tube the filament runs through.',
      step2_match:   'The PTFE tube looks like a flexible white or clear straw. It connects the extruder to the print head.',
      step3_distance:'Move your camera 15 cm (6 inches) back so you can see a good section of the tube.',
      step4_center:  'Center the tube in the frame, focusing on the area closest to the hotend where heat damage occurs first.',
      step5_action:  'Tap Inspect when the tube is clearly visible, especially the end nearest the hotend.',
    },

    education_animation: [],

    related_checkpoint_keys: ['bowden_tube'],
    related_guide_keys:      ['replace_ptfe_tube'],
  },

  {
    key:         'ams',
    displayName: 'AMS',
    simpleName:  'The box that holds up to 4 spools of filament and automatically switches between them',
    category:    'filament_system',
    printer_types: ['FDM'],

    what_it_is:     'The AMS (Automatic Material System) is an accessory unit that holds up to 4 spools of filament and feeds them to the printer automatically.',
    what_it_does:   'The AMS has motors and rollers inside that pull filament off spools and push it through tubes to the printer. When you want to switch colors, the printer retracts the current filament back into the AMS and loads the next one. The AMS also dries your filament slightly, which helps with moisture-sensitive materials.',
    why_it_matters: 'A dirty AMS with worn rollers causes feeding errors. Moisture in the AMS can ruin your filament over time. If the PTFE tubes inside the AMS are cracked, filament jams at the worst possible time — mid-print.',
    location_tip:   'The AMS sits next to or on top of the printer. It is a rectangular box with slots for 4 spools of filament visible through a clear panel on the front.',
    common_problems: [
      'Filament feed error — AMS cannot push filament to the printer',
      'Tangled filament inside — spool has come loose',
      'Dirty rollers — debris on rollers causes filament to slip',
      'Cracked or blocked internal PTFE tubes',
      'Moisture damage — filament absorbs humidity inside the AMS',
    ],
    maintenance_interval: 'Clean rollers every 3 months or whenever you see feed errors. Inspect PTFE tubes every 6 months. Keep the lid closed when not loading filament.',

    what_good_looks_like: 'Spools sit flat on the rollers. Filament path through the AMS looks clear. Rollers are clean with no visible debris.',
    what_bad_looks_like:  'Filament bunched up inside. Rollers coated in plastic dust. Tubes look kinked or have visible cracks.',

    asset: {
      referenceImageKey:   'anatomy_ams_reference',
      highlightedImageKey: 'anatomy_ams_highlighted',
      goodExampleKey:      'anatomy_ams_good',
      badExampleKey:       'anatomy_ams_bad',
    },

    camera_guidance: {
      step1_find:    'Find the rectangular box next to or on top of your printer. It has clear windows showing your filament spools.',
      step2_match:   'The AMS has 4 bays for spools, usually visible through a transparent panel. Tubes run out of it toward the printer.',
      step3_distance:'Move your camera 30 cm (12 inches) away to capture the whole unit.',
      step4_center:  'Center the AMS in the frame so you can see all 4 spool bays.',
      step5_action:  'Tap Inspect when the whole AMS front panel is visible.',
    },

    education_animation: [],

    related_checkpoint_keys: [],
    related_guide_keys:      ['clean_ams'],
  },

  {
    key:         'ams_rollers',
    displayName: 'AMS Rollers',
    simpleName:  'The rubber wheels inside the AMS that grip and feed your filament',
    category:    'filament_system',
    printer_types: ['FDM'],

    what_it_is:     'AMS rollers are the rubber wheels inside the AMS unit that grab the filament and push it forward.',
    what_it_does:   'When the printer needs to feed filament, a motor spins the rollers. The rubber surface grips the filament and moves it toward the printer. When the printer retracts filament to switch colors, the rollers spin the other way to pull it back.',
    why_it_matters: 'Dirty rollers covered in plastic dust cannot grip the filament reliably. This causes feed errors, where the AMS tries to move filament but it slips. Regular cleaning prevents these errors.',
    location_tip:   'Open the AMS lid. Look inside each bay. The rollers are the rubber wheels at the bottom of each bay. Each spool rests on top of them.',
    common_problems: [
      'Plastic dust coating the rubber surface — filament slips',
      'Rubber hardened or cracked from age',
      'Foreign debris wrapped around a roller',
    ],
    maintenance_interval: 'Clean with a dry cloth every 3 months. Check for wear every 6 months.',

    what_good_looks_like: 'Rubber is soft, black, and slightly tacky. Surface looks clean with no dust or debris buildup.',
    what_bad_looks_like:  'Rubber coated in white or grey plastic dust. Surface looks shiny, hardened, or cracked.',

    asset: {
      referenceImageKey:   'anatomy_ams_rollers_reference',
      highlightedImageKey: 'anatomy_ams_rollers_highlighted',
      goodExampleKey:      'anatomy_ams_rollers_good',
      badExampleKey:       'anatomy_ams_rollers_bad',
    },

    camera_guidance: {
      step1_find:    'Open the AMS lid. Look at the bottom of any spool bay. The rollers are the two rubber wheels the spool rests on.',
      step2_match:   'The rollers look like small rubber cylinders, usually black. There are two per spool bay.',
      step3_distance:'Move your camera 10 cm (4 inches) away from the rollers.',
      step4_center:  'Center one of the rollers in the frame so you can see the rubber surface clearly.',
      step5_action:  'Tap Inspect when the roller surface is clearly in focus.',
    },

    education_animation: [],

    related_checkpoint_keys: [],
    related_guide_keys:      ['clean_ams'],
  },

  {
    key:         'ams_ptfe_tubes',
    displayName: 'AMS PTFE Tubes',
    simpleName:  'The white tubes that carry filament from the AMS to the printer',
    category:    'filament_system',
    printer_types: ['FDM'],

    what_it_is:     'These are the white flexible PTFE tubes that connect the AMS to the printer and route filament from the spool to the print head.',
    what_it_does:   'When the AMS pushes filament toward the printer, it travels through these tubes. The slippery PTFE surface reduces friction so the filament moves smoothly. The tubes are color-coded (one per AMS bay) to help you track which filament is which.',
    why_it_matters: 'Cracked or clogged AMS tubes cause filament jams mid-print. Debris inside a tube creates extra resistance, making the AMS motors work harder and eventually fail to feed.',
    location_tip:   'Find the tubes coming out of the front of the AMS unit. Follow them to where they enter the printer. Each tube is usually colored or numbered.',
    common_problems: [
      'Cracked tube — filament catches on the crack edges',
      'Blockage inside the tube from a previous jam',
      'Tube not fully seated in its connector — creates a gap',
      'Kinked tube that restricts filament movement',
    ],
    maintenance_interval: 'Inspect tubes when loading filament or if you experience feed errors. Replace any tube that shows cracks, kinks, or blockages.',

    what_good_looks_like: 'Tubes are white or lightly colored, smooth, and seated firmly at both ends. No visible kinks or cracks.',
    what_bad_looks_like:  'Tube has a visible crack, kink, or dark blockage inside. One end is not fully connected or is sitting at an angle.',

    asset: {
      referenceImageKey:   'anatomy_ams_ptfe_reference',
      highlightedImageKey: 'anatomy_ams_ptfe_highlighted',
      goodExampleKey:      'anatomy_ams_ptfe_good',
      badExampleKey:       'anatomy_ams_ptfe_bad',
    },

    camera_guidance: {
      step1_find:    'Find the tubes coming out of the AMS front panel. Follow them to where they connect to the printer.',
      step2_match:   'These are small white or colored flexible tubes, about 4mm wide. They run from the AMS to the printer in a bundle.',
      step3_distance:'Move your camera 15 cm (6 inches) away from the tube you want to inspect.',
      step4_center:  'Center the tube connection point (where it meets the AMS or printer) in the frame.',
      step5_action:  'Tap Inspect when the tube and its connection are clearly visible.',
    },

    education_animation: [],

    related_checkpoint_keys: [],
    related_guide_keys:      ['clean_ams'],
  },

  {
    key:         'filament_path',
    displayName: 'Filament Path',
    simpleName:  'The complete route your plastic travels from the spool all the way to the nozzle',
    category:    'filament_system',
    printer_types: ['FDM'],

    what_it_is:     'The filament path is not a single part — it is the entire route your plastic travels from the spool, through the AMS, along the tubes, through the extruder, down through the hotend, and out through the nozzle.',
    what_it_does:   'Understanding the filament path helps you find the cause of a jam. When a blockage occurs somewhere along this route, printing stops. Knowing where each step is lets you narrow down where to look.',
    why_it_matters: 'Filament jams are one of the most common printer problems. A clear understanding of the full path means you can diagnose and fix problems yourself instead of guessing.',
    location_tip:   'Start at the filament spool. Follow the filament by eye: spool → AMS rollers → AMS PTFE tubes → printer input → extruder → short tube inside hotend → nozzle. That is the complete path.',
    common_problems: [
      'Jam anywhere along the path — filament stops moving',
      'Tangle at the spool — filament cannot unreel',
      'Blockage inside an AMS tube',
      'Clog at the extruder or nozzle',
    ],
    maintenance_interval: 'Understand the full path. When a jam occurs, start at the spool and work your way toward the nozzle to find the blockage.',

    what_good_looks_like: 'Filament moves freely through every stage. You can manually push filament through each step without resistance.',
    what_bad_looks_like:  'Filament stops moving or becomes hard to push at some point in the path. This pinpoints the jam location.',

    asset: {
      referenceImageKey:   'anatomy_filament_path_reference',
      highlightedImageKey: 'anatomy_filament_path_highlighted',
      goodExampleKey:      'anatomy_filament_path_good',
      badExampleKey:       'anatomy_filament_path_bad',
    },

    camera_guidance: {
      step1_find:    'Start at the filament spool and find where the filament enters the AMS.',
      step2_match:   'Follow the filament with your eye from the spool all the way to the print head.',
      step3_distance:'Step back about 60 cm (2 feet) to capture the entire printer in frame.',
      step4_center:  'Frame the printer so you can see as much of the filament path as possible.',
      step5_action:  'Tap Inspect to document the overall filament routing.',
    },

    education_animation: [],

    related_checkpoint_keys: ['bowden_tube', 'extruder_gears'],
    related_guide_keys:      ['clean_nozzle_fdm'],
  },

  // ── MOTION SYSTEM ────────────────────────────────────────────────────────────

  {
    key:         'carbon_rods',
    displayName: 'Carbon Rods',
    simpleName:  'The long black rods that the print head slides along to move side to side and front to back',
    category:    'motion_system',
    printer_types: ['FDM'],

    what_it_is:     'Carbon rods are the smooth, rigid rods that guide the print head as it moves in the X and Y directions (side to side and front to back).',
    what_it_does:   'The print head slides along these rods using low-friction bearings. When the printer wants to move the nozzle to a specific position, motors pull belts that are attached to the print head carriage. The rods ensure the movement is straight and precise.',
    why_it_matters: 'Dirty or damaged rods cause the print head to move unevenly. This shows up in your prints as lines, wobbles, or shifted layers. Clean, well-maintained rods are essential for print quality.',
    location_tip:   'Look for the long, dark (carbon fiber) or shiny (steel) rods that run horizontally across the printer. The print head slides along them. There are usually two rods per axis.',
    common_problems: [
      'Dust and debris buildup — causes rough, jerky movement',
      'Scratches or marks on the rod surface',
      'Bearing wear — head wobbles slightly side to side',
      'Rod contamination from lubricant applied incorrectly',
    ],
    maintenance_interval: 'Clean with a dry cloth monthly. Lightly lubricate with appropriate lubricant every 3 months. Do not use WD-40.',

    what_good_looks_like: 'Rods are smooth and clean. Print head slides along them freely with almost no resistance.',
    what_bad_looks_like:  'Visible dust, grime, or grease buildup on the rod surface. Print head requires effort to slide or feels rough.',

    asset: {
      referenceImageKey:   'anatomy_carbon_rods_reference',
      highlightedImageKey: 'anatomy_carbon_rods_highlighted',
      goodExampleKey:      'anatomy_carbon_rods_good',
      badExampleKey:       'anatomy_carbon_rods_bad',
    },

    camera_guidance: {
      step1_find:    'Look for the long straight rods that the print head slides along. They run left-right and front-back inside the printer.',
      step2_match:   'Carbon rods look dark black/grey. Steel rods look shiny. They are smooth and perfectly straight.',
      step3_distance:'Move your camera 20 cm (8 inches) from the rod you want to inspect.',
      step4_center:  'Position the rod horizontally in the frame so you can see a section of the rod surface clearly.',
      step5_action:  'Tap Inspect when a section of the rod surface is clearly in focus.',
    },

    education_animation: [],

    related_checkpoint_keys: ['linear_rods'],
    related_guide_keys:      ['lubricate_linear_rods'],
  },

  {
    key:         'lead_screws',
    displayName: 'Lead Screws',
    simpleName:  'The tall threaded metal rods that move the print bed or print head up and down',
    category:    'motion_system',
    printer_types: ['FDM'],

    what_it_is:     'Lead screws are the tall, threaded metal rods that move the printer up and down (the Z axis).',
    what_it_does:   'Each completed layer of a print moves the Z axis up or down by a fraction of a millimeter. The lead screw converts motor rotation into this precise vertical movement. A brass nut threaded onto the screw rides up and down as the screw spins.',
    why_it_matters: 'Dirty or dry lead screws cause inconsistent layer heights, visible lines across prints, and that distinctive grinding noise during Z movements. Proper lubrication is one of the most important maintenance tasks on any printer.',
    location_tip:   'Look for the tall, threaded vertical rods near the corners or back of the printer. They are usually 4–8mm in diameter with a visible spiral thread. On CoreXY printers, they move the print bed. On bed-slingers, they move the frame.',
    common_problems: [
      'Dry lead screw — grinding noise during Z movement',
      'Old or wrong lubricant — viscous, dark buildup slowing movement',
      'Z banding — visible horizontal lines caused by inconsistent screw movement',
      'Bent lead screw — wobble visible during printing',
    ],
    maintenance_interval: 'Clean and re-lubricate every 3 months or every 200 print hours. Use only a suitable grease (such as SuperLube or printer-specific grease). Never use WD-40.',

    what_good_looks_like: 'Screw has a light, even coating of grease. Screw is straight with no wobble. Z movement is smooth and quiet.',
    what_bad_looks_like:  'Screw is dry with no lubricant visible. Old black or gummy lubricant buildup in the threads. Screw appears bent when spinning.',

    asset: {
      referenceImageKey:   'anatomy_lead_screws_reference',
      highlightedImageKey: 'anatomy_lead_screws_highlighted',
      goodExampleKey:      'anatomy_lead_screws_good',
      badExampleKey:       'anatomy_lead_screws_bad',
    },

    camera_guidance: {
      step1_find:    'Find the tall threaded vertical rods near the back or corners of the printer. They run straight up and down.',
      step2_match:   'Lead screws have a visible spiral thread wrapping around them, like a large screw. They are shiny or lightly greased.',
      step3_distance:'Move your camera 15 cm (6 inches) from the lead screw.',
      step4_center:  'Center a section of the threaded area in the frame so the spiral grooves are clearly visible.',
      step5_action:  'Tap Inspect when the thread and lubricant condition are clearly visible.',
    },

    education_animation: [],

    related_checkpoint_keys: ['z_axis'],
    related_guide_keys:      ['lubricate_lead_screw'],
  },

  // ── PRINT SURFACE ───────────────────────────────────────────────────────────

  {
    key:         'build_plate',
    displayName: 'Build Plate',
    simpleName:  'The flat surface at the bottom of the printer where your print sticks down and grows upward',
    category:    'print_surface',
    printer_types: ['FDM'],

    what_it_is:     'The build plate (also called the print bed or print surface) is the flat surface your print is built on, layer by layer.',
    what_it_does:   'During printing, hot plastic is placed directly onto the build plate. The plastic must stick to the surface well enough to stay put throughout the entire print, but not so strongly that you cannot remove it afterward. Most modern printers use a flexible magnetic plate that you can remove and bend slightly to pop prints off.',
    why_it_matters: 'A dirty or damaged build plate causes prints to fail by not sticking. Scratches, gouges, or a greasy surface all prevent proper adhesion. Keeping it clean is one of the most important daily maintenance tasks.',
    location_tip:   'The build plate is the flat horizontal surface the printer prints on. It is the large flat area that moves or stays still depending on your printer type.',
    common_problems: [
      'Fingerprints and skin oils — prevent filament from sticking',
      'Scratches and gouges — affect adhesion on textured surfaces',
      'Old filament residue — creates uneven surface',
      'First layer not sticking — plate needs cleaning or calibration',
      'Print stuck too hard — surface may be damaged',
    ],
    maintenance_interval: 'Clean with isopropyl alcohol (IPA) before each print. Deep clean weekly. Inspect for damage monthly.',

    what_good_looks_like: 'Surface is clean and free of fingerprints, residue, and dust. Textured plates look uniform with no shiny worn spots.',
    what_bad_looks_like:  'Surface has fingerprint smears, leftover filament residue, or visible scratches. Worn shiny spots on a textured plate.',

    asset: {
      referenceImageKey:   'anatomy_build_plate_reference',
      highlightedImageKey: 'anatomy_build_plate_highlighted',
      goodExampleKey:      'anatomy_build_plate_good',
      badExampleKey:       'anatomy_build_plate_bad',
    },

    camera_guidance: {
      step1_find:    'Look at the flat horizontal surface inside the printer where prints are made. This is the build plate.',
      step2_match:   'The build plate is a flat surface, usually dark or textured. It may sit on a magnetic surface you can remove.',
      step3_distance:'Move your camera 20 cm (8 inches) above the plate, pointing straight down.',
      step4_center:  'Frame the center of the build plate. Look for any residue, scratches, or marks.',
      step5_action:  'Tap Inspect when the plate surface is clearly in frame and in focus.',
    },

    education_animation: [],

    related_checkpoint_keys: ['bed_surface'],
    related_guide_keys:      ['clean_build_plate'],
  },

  // ── MAINTENANCE COMPONENTS ───────────────────────────────────────────────────

  {
    key:         'cutter',
    displayName: 'Filament Cutter',
    simpleName:  'The small blade that cuts filament during automatic color changes',
    category:    'maintenance_components',
    printer_types: ['FDM'],

    what_it_is:     'The filament cutter is a small blade inside the print head that automatically cuts the filament when the printer switches colors.',
    what_it_does:   'During a color change, the printer retracts the old filament, the cutter makes a clean cut, and then the new color is loaded. A clean cut ensures the new filament tip feeds correctly. Without a functioning cutter, color changes cannot happen automatically.',
    why_it_matters: 'A dirty cutter or dull blade causes incomplete cuts, which leave a messy filament tip. This can jam the new filament as it loads or cause the color change to fail.',
    location_tip:   'The cutter is inside the print head, usually near the top where the filament enters. You may need to look carefully or consult your printer manual to find the exact location.',
    common_problems: [
      'Burnt plastic clogging the cutter blade',
      'Dull blade after thousands of cuts',
      'Filament residue interfering with blade movement',
    ],
    maintenance_interval: 'Clean cutter mechanism every month or if color changes start failing. Inspect blade annually.',

    what_good_looks_like: 'Cutter area is clean with no plastic residue around the blade. Color changes complete without errors.',
    what_bad_looks_like:  'Burnt plastic buildup around the cutter area. Color changes frequently fail or produce messy filament tips.',

    asset: {
      referenceImageKey:   'anatomy_cutter_reference',
      highlightedImageKey: 'anatomy_cutter_highlighted',
      goodExampleKey:      'anatomy_cutter_good',
      badExampleKey:       'anatomy_cutter_bad',
    },

    camera_guidance: {
      step1_find:    'Look at the top of the print head where the filament enters from the tube. The cutter is in this area.',
      step2_match:   'The cutter may look like a small slot or gap with a blade inside. Consult your printer manual for exact location.',
      step3_distance:'Move your camera 8 cm (3 inches) from the cutter area.',
      step4_center:  'Center the cutter area in the frame.',
      step5_action:  'Tap Inspect when the cutter area is clearly visible.',
    },

    education_animation: [],

    related_checkpoint_keys: [],
    related_guide_keys:      [],
  },

  {
    key:         'wiper',
    displayName: 'Wiper',
    simpleName:  'The silicone brush that cleans the nozzle tip between color changes',
    category:    'maintenance_components',
    printer_types: ['FDM'],

    what_it_is:     'The wiper is a small silicone brush or pad that the printer automatically moves the nozzle across to clean off excess plastic before and after color changes.',
    what_it_does:   'When the printer finishes using one filament color and switches to another, it moves the nozzle to the wiper and drags it across the silicone surface. This removes the old plastic from the nozzle tip so it does not contaminate the next color.',
    why_it_matters: 'A clogged wiper full of hardened plastic cannot clean the nozzle effectively. This causes color contamination in multi-color prints and affects print quality.',
    location_tip:   'The wiper is at the back or side of the printer, near the purge chute. It is usually a small silicone brush or pad inside a slot or bracket.',
    common_problems: [
      'Burnt plastic buildup clogging the silicone fingers',
      'Silicone hardened or damaged from repeated heat exposure',
      'Wiper position misaligned — nozzle misses the wiper',
    ],
    maintenance_interval: 'Clean the wiper after every 10 hours of multi-color printing. Replace the silicone wiper pad when it becomes hard or damaged.',

    what_good_looks_like: 'Silicone looks soft and flexible. Most plastic residue has been wiped clean. Fingers are not matted down or clumped together.',
    what_bad_looks_like:  'Silicone loaded with dark burnt plastic. Fingers clumped together or hardened. Wiper looks more like a solid block than a brush.',

    asset: {
      referenceImageKey:   'anatomy_wiper_reference',
      highlightedImageKey: 'anatomy_wiper_highlighted',
      goodExampleKey:      'anatomy_wiper_good',
      badExampleKey:       'anatomy_wiper_bad',
    },

    camera_guidance: {
      step1_find:    'Look at the back or side corner of the printer for a small silicone brush or pad inside a bracket or slot.',
      step2_match:   'The wiper looks like a small dark silicone brush, similar to a tiny broom. It may have ridged fingers.',
      step3_distance:'Move your camera 8 cm (3 inches) from the wiper.',
      step4_center:  'Center the silicone brush portion in the frame so you can see the condition of the silicone.',
      step5_action:  'Tap Inspect when the wiper brush is clearly visible.',
    },

    education_animation: [],

    related_checkpoint_keys: [],
    related_guide_keys:      ['clean_wiper_blade'],
  },

  // ── COOLING SYSTEM ───────────────────────────────────────────────────────────

  {
    key:         'cooling_fans',
    displayName: 'Cooling Fans',
    simpleName:  'The fans that blow air onto your print to cool it down as it comes out of the nozzle',
    category:    'cooling',
    printer_types: ['FDM'],

    what_it_is:     'There are two types of fans on most FDM print heads: the part cooling fan (cools your print as it is laid down) and the hotend cooling fan (keeps the upper part of the hotend from overheating).',
    what_it_does:   'The part cooling fan blows air directly onto the freshly printed plastic, making it solidify quickly and hold its shape. Without this, plastic sags and details are lost. The hotend cooling fan keeps the heatbreak (the transition zone) cold so plastic does not melt too early.',
    why_it_matters: 'A blocked or failed part cooling fan causes sagging, stringing, and poor overhangs. A failed hotend cooling fan causes heat creep — plastic melting where it should be solid — which leads to nasty clogs that require a full hotend disassembly to fix.',
    location_tip:   'Look at the front or sides of the print head. You will see one or two fan grilles. One points at the printed model (part cooling). One faces the hotend from the side (hotend cooling).',
    common_problems: [
      'Fan blocked with filament debris, dust, or hair',
      'Fan not spinning — failed motor or wiring',
      'Fan spinning slowly — bearing wear',
      'Fan grill bent, blocking airflow',
    ],
    maintenance_interval: 'Check fans are spinning freely during every print. Clean debris from fan grilles monthly. Test fan operation every 3 months.',

    what_good_looks_like: 'Fan spins freely and quietly when active. Grille is clean with no visible obstruction. Fan housing has no cracks.',
    what_bad_looks_like:  'Fan does not spin or spins slowly. Visible filament threads, hair, or dust inside the fan. Grille bent or blocked.',

    asset: {
      referenceImageKey:   'anatomy_cooling_fans_reference',
      highlightedImageKey: 'anatomy_cooling_fans_highlighted',
      goodExampleKey:      'anatomy_cooling_fans_good',
      badExampleKey:       'anatomy_cooling_fans_bad',
    },

    camera_guidance: {
      step1_find:    'Look at the front and sides of the print head. Find the grilles or vents that cover the fans.',
      step2_match:   'Fan grilles look like a grid pattern over a circular opening. You may be able to see the fan blades behind the grille.',
      step3_distance:'Move your camera 8 cm (3 inches) from the fan grille.',
      step4_center:  'Center the fan grille in the frame so you can see whether anything is blocking it.',
      step5_action:  'Tap Inspect when the fan grille is clearly visible.',
    },

    education_animation: [],

    related_checkpoint_keys: ['hotend_fan', 'part_cooling_fan'],
    related_guide_keys:      ['clean_cooling_fans'],
  },

  {
    key:         'chamber_fan',
    displayName: 'Chamber Fan',
    simpleName:  'The fan that circulates air inside the printer enclosure to control temperature',
    category:    'cooling',
    printer_types: ['FDM'],

    what_it_is:     'The chamber fan circulates air inside the enclosed printer to create a consistent temperature throughout the print area.',
    what_it_does:   'For materials like ABS and ASA, the chamber needs to be warm (40–60°C) to prevent warping. The chamber fan moves this warm air evenly throughout the enclosure. It can also be used to cool the chamber down after printing. Some chamber fans have filters to capture any fine particles produced during printing.',
    why_it_matters: 'A blocked chamber fan reduces air circulation, causing uneven temperatures. This leads to warping, layer separation, and poor print quality with temperature-sensitive materials.',
    location_tip:   'The chamber fan is usually on the back wall or inside the top of the printer enclosure. Look for a larger fan behind a grille, often with a filter element in front of it.',
    common_problems: [
      'Filter clogged with dust — blocks airflow through the fan',
      'Fan motor failure — no circulation inside chamber',
      'Debris caught in the blades',
    ],
    maintenance_interval: 'Replace or clean the filter every 3 months. Check fan operation every month. Clean the fan blades annually.',

    what_good_looks_like: 'Fan spins freely. Filter looks clean and light can pass through it. Fan is quiet during operation.',
    what_bad_looks_like:  'Filter appears dark, grey, or completely clogged. Fan makes unusual noise or vibrates.',

    asset: {
      referenceImageKey:   'anatomy_chamber_fan_reference',
      highlightedImageKey: 'anatomy_chamber_fan_highlighted',
      goodExampleKey:      'anatomy_chamber_fan_good',
      badExampleKey:       'anatomy_chamber_fan_bad',
    },

    camera_guidance: {
      step1_find:    'Look at the back wall or top interior of the printer enclosure. Find the larger fan with a filter or grille cover.',
      step2_match:   'The chamber fan is larger than the print head fans. It usually has a rectangular filter element in front of it.',
      step3_distance:'Move your camera 20 cm (8 inches) from the chamber fan.',
      step4_center:  'Center the fan and filter in the frame so you can see the filter condition clearly.',
      step5_action:  'Tap Inspect when the fan and filter are clearly visible.',
    },

    education_animation: [],

    related_checkpoint_keys: [],
    related_guide_keys:      ['clean_cooling_fans'],
  },

  // ── SENSORS & CAMERAS ────────────────────────────────────────────────────────

  {
    key:         'printer_camera',
    displayName: 'Printer Camera',
    simpleName:  'The small camera built into the printer that lets you watch your print from your phone',
    category:    'sensors_cameras',
    printer_types: ['FDM'],

    what_it_is:     'The printer camera is a small built-in camera that records and streams video of your print in progress.',
    what_it_does:   'The camera lets you monitor your print from anywhere using the printer\'s app. Some printers also use the camera for automatic print failure detection — if the camera sees that something has gone wrong (like spaghetti or a detached print), it can stop the printer automatically.',
    why_it_matters: 'A dirty camera lens cannot see your print clearly, which reduces the quality of time-lapse videos and makes automatic failure detection less reliable.',
    location_tip:   'Look on the front or side of the printer enclosure for a small dark circular lens, usually mounted on a bracket. It faces into the build area.',
    common_problems: [
      'Lens covered in dust or plastic particles — blurry image',
      'Lens fogged from moisture inside enclosure',
      'Camera bracket bumped — now pointing at wrong area',
    ],
    maintenance_interval: 'Clean the lens with a soft microfiber cloth monthly. Check camera position when you notice blurry or dark images.',

    what_good_looks_like: 'Lens is clear and clean. Camera image is sharp and correctly framing the build plate.',
    what_bad_looks_like:  'Lens has visible dust, smears, or a hazy film. Camera image is blurry or incorrectly framed.',

    asset: {
      referenceImageKey:   'anatomy_camera_reference',
      highlightedImageKey: 'anatomy_camera_highlighted',
      goodExampleKey:      'anatomy_camera_good',
      badExampleKey:       'anatomy_camera_bad',
    },

    camera_guidance: {
      step1_find:    'Look at the front or inside wall of the printer enclosure for a small dark circular lens on a bracket.',
      step2_match:   'The printer camera lens looks like a small dark circle, usually 5–10mm in diameter, mounted on a small bracket or body.',
      step3_distance:'Move your camera 10 cm (4 inches) from the printer camera lens.',
      step4_center:  'Center the printer camera lens in your frame.',
      step5_action:  'Tap Inspect when the lens is clearly visible and in focus.',
    },

    education_animation: [],

    related_checkpoint_keys: [],
    related_guide_keys:      [],
  },

  {
    key:         'lidar',
    displayName: 'LiDAR Sensor',
    simpleName:  'The laser scanner that checks your first layer and calibrates nozzle height automatically',
    category:    'sensors_cameras',
    printer_types: ['FDM'],

    what_it_is:     'The LiDAR sensor is a laser-based scanning system that measures the exact distance from the nozzle to the build plate.',
    what_it_does:   'Before a print starts, the LiDAR scans the entire build plate surface, measuring thousands of points. It uses this data to automatically adjust the nozzle height across the whole plate, so the first layer is perfectly even everywhere. During printing, it also inspects the first layer to check if it is adhering correctly.',
    why_it_matters: 'A dirty or blocked LiDAR lens gives inaccurate measurements, which leads to nozzle crashes (too close) or poor first layer adhesion (too far). A dirty lens is one of the most common reasons for first-layer problems on printers equipped with LiDAR.',
    location_tip:   'Look on the print head or a fixed position above the build plate for a small lens or window, often with a distinctive shape. On Bambu Lab printers, it is on the side of the toolhead.',
    common_problems: [
      'Lens dirty or covered in plastic — inaccurate readings',
      'Lens scratched — permanent damage to accuracy',
      'First layer offset errors — often caused by LiDAR lens contamination',
    ],
    maintenance_interval: 'Clean the LiDAR lens with a dry cotton swab monthly. Never use liquids on the lens. If first layer problems appear, clean the lens first.',

    what_good_looks_like: 'Lens is clear with no visible dust, smears, or plastic residue on it.',
    what_bad_looks_ike:  'Lens has visible dust, plastic residue, or a cloudy film.',

    asset: {
      referenceImageKey:   'anatomy_lidar_reference',
      highlightedImageKey: 'anatomy_lidar_highlighted',
      goodExampleKey:      'anatomy_lidar_good',
      badExampleKey:       'anatomy_lidar_bad',
    },

    camera_guidance: {
      step1_find:    'Look at the side of the print head for a small window or lens that points downward. Consult your printer manual if unsure.',
      step2_match:   'The LiDAR lens is a small, flat transparent window, usually rectangular or circular, often recessed into the toolhead body.',
      step3_distance:'Move your camera 8 cm (3 inches) from the LiDAR lens.',
      step4_center:  'Center the lens in the frame.',
      step5_action:  'Tap Inspect when the lens is clearly visible and in focus.',
    },

    education_animation: [],

    related_checkpoint_keys: [],
    related_guide_keys:      ['clean_lidar_lens'],
  },
];

// ─── Query Helpers ────────────────────────────────────────────────────────────

export function getAnatomyPartsForType(
  printerType: 'FDM' | 'Resin',
): AnatomyPart[] {
  return PRINTER_ANATOMY.filter(p => p.printer_types.includes(printerType));
}

export function getAnatomyPartsByCategory(
  printerType: 'FDM' | 'Resin',
): Map<string, AnatomyPart[]> {
  const parts = getAnatomyPartsForType(printerType);
  const map = new Map<string, AnatomyPart[]>();
  for (const part of parts) {
    const existing = map.get(part.category) ?? [];
    map.set(part.category, [...existing, part]);
  }
  return map;
}

export function getAnatomyPartByKey(key: string): AnatomyPart | undefined {
  return PRINTER_ANATOMY.find(p => p.key === key);
}

export function searchAnatomyParts(query: string): AnatomyPart[] {
  const q = query.toLowerCase().trim();
  if (!q) return PRINTER_ANATOMY;
  return PRINTER_ANATOMY.filter(p =>
    p.displayName.toLowerCase().includes(q) ||
    p.simpleName.toLowerCase().includes(q) ||
    p.what_it_is.toLowerCase().includes(q) ||
    p.what_it_does.toLowerCase().includes(q)
  );
}
