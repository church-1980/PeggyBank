import { CheckpointDefinition } from '../types';

// Visual inspection checkpoints — Required 6-section structure per CLAUDE.md:
// 1. partIdentification  (What am I looking at?)
// 2. whatGoodLooksLike   (Good example caption)
// 3. whatBadLooksLike    (Bad example caption)
// 4. cameraGuidance      (5-step camera positioning)
// 5. diagnosis           (Diagnosis cards for pass/warn/fail)
// 6. Repair links        (guideKey inside each diagnosis card)
//
// GRANDPARENT TEST: Every word must be understandable by someone who has
// never touched a 3D printer. No jargon without an immediate plain-language
// explanation in brackets. No assumed knowledge of any kind.

export const FDM_CHECKPOINTS: CheckpointDefinition[] = [
  {
    key: 'nozzle_condition',
    title: 'Nozzle Tip',
    description:
      'Look at the very tip of the small metal part at the bottom of your printer. It should be mostly clean metal.',
    partIdentification: {
      partName: 'Nozzle',
      simpleName: 'The small metal tip at the very bottom of the printer',
      purpose:
        'The nozzle melts your plastic filament and squeezes it out in a thin line to build your print — like a very precise hot glue gun tip.',
      whyItMatters:
        'A dirty or damaged nozzle is one of the most common causes of failed prints. It can cause gaps, blobs, clogs, and poor print quality.',
      commonProblems: [
        'Burnt plastic buildup on the outside of the tip',
        'Clog inside the nozzle — plastic won\'t come out',
        'Worn or damaged tip from printing abrasive materials',
      ],
      maintenanceInterval: 'Check monthly. Clean every 100 print hours or when print quality drops.',
      imageKey: 'part_nozzle',
    },
    whatGoodLooksLike:
      'Clean or mostly clean metal tip. Shiny brass or silver colour. A tiny bit of dark residue on the outside is normal.',
    whatBadLooksLike:
      'Thick black or brown crusty buildup on the tip. Cracks or visible damage. The tip looks squashed, chewed, or has plastic oozing out while sitting still.',
    cameraGuidance: {
      step1_find: 'Find the small metal tip at the very bottom of the print head — the moving part that travels across your printer.',
      step2_match: 'It is the lowest point of the printer. It should look small, metallic, and slightly pointy.',
      step3_distance: 'Move your camera about 10 cm (4 inches) away from the tip.',
      step4_center: 'Center the tip of the nozzle in the middle of your screen so you can see it clearly.',
      step5_action: 'Tap "Inspect" when the nozzle tip is clearly visible and in focus.',
    },
    printer_types: ['FDM'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your nozzle tip looks good!',
        risk: 'none',
        whatThisMeans: 'The nozzle is clean and in good condition. Your printer should be laying down plastic smoothly.',
        recommendedAction: 'No action needed. Check again at your next scheduled inspection.',
      },
      warn: {
        headline: 'Your nozzle has some buildup.',
        risk: 'low',
        whatThisMeans: 'There is some burnt plastic stuck to the outside of the nozzle. This is common and usually doesn\'t stop the printer from working — but if it keeps building up, it can drip onto your prints.',
        recommendedAction: 'Clean the nozzle soon using the "Clean the Nozzle" guide. No tools needed, takes about 15 minutes.',
        estimatedTime: '15 minutes',
        difficulty: 'easy',
        guideKey: 'clean_nozzle_fdm',
      },
      fail: {
        headline: 'Your nozzle needs attention.',
        risk: 'medium',
        whatThisMeans: 'The nozzle has heavy buildup, visible damage, or is leaking plastic. This will likely cause print failures — poor quality, clogs, or the print not sticking.',
        recommendedAction: 'Try cleaning the nozzle first. If it still looks damaged, it needs to be replaced. The "Replace the Nozzle" guide walks you through it step by step.',
        estimatedTime: '15–20 minutes',
        difficulty: 'moderate',
        guideKey: 'clean_nozzle_fdm',
      },
    },
  },

  {
    key: 'bed_surface',
    title: 'Print Surface',
    description:
      'Run a clean fingertip across the flat print surface. It should feel smooth. Look for scratches, stuck filament, or damage.',
    partIdentification: {
      partName: 'Print Surface (Build Plate)',
      simpleName: 'The flat surface your prints are built on',
      purpose:
        'Every print starts here. The first layer of your print sticks to this surface as it\'s being made. A good surface means good prints.',
      whyItMatters:
        'A dirty or damaged print surface causes prints to not stick (they fall off during printing) or to stick too well (they crack the surface when removed).',
      commonProblems: [
        'Fingerprint oil reducing adhesion — prints won\'t stick',
        'Old filament residue making the surface uneven',
        'Scratches or gouges causing rough first layers',
      ],
      maintenanceInterval: 'Clean with rubbing alcohol before every print. Inspect for scratches monthly.',
      imageKey: 'part_build_plate',
    },
    whatGoodLooksLike:
      'Smooth, clean, evenly textured surface. No scratches you can feel with a fingernail. No stuck pieces of old filament.',
    whatBadLooksLike:
      'Deep scratches or gouges. Large patches of filament permanently stuck down. Bubbles, cracks, or peeling coating.',
    cameraGuidance: {
      step1_find: 'Look at the flat plate that your printer builds on — the surface the print head moves over.',
      step2_match: 'It is usually a flat square or rectangular plate, often black or silver in colour.',
      step3_distance: 'Hold your camera about 20 cm (8 inches) directly above the surface.',
      step4_center: 'Angle the camera slightly so that any scratches or marks catch the light and are visible.',
      step5_action: 'Tap "Inspect" when you can see the full surface clearly.',
    },
    printer_types: ['FDM'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your print surface looks great!',
        risk: 'none',
        whatThisMeans: 'The surface is in good condition. Your first layers should stick reliably.',
        recommendedAction: 'Wipe with rubbing alcohol before each print. Avoid touching the surface with bare hands — your skin oils reduce adhesion.',
      },
      warn: {
        headline: 'Your print surface has some wear.',
        risk: 'low',
        whatThisMeans: 'There are light scratches or small patches of old filament. This may cause occasional prints to not stick properly in those areas.',
        recommendedAction: 'Clean the surface thoroughly with rubbing alcohol. For stubborn stuck filament, warm the surface slightly and try again.',
        estimatedTime: '5 minutes',
        difficulty: 'easy',
        guideKey: 'clean_bed_fdm',
      },
      fail: {
        headline: 'Your print surface needs replacing.',
        risk: 'medium',
        whatThisMeans: 'The surface is too scratched or damaged for reliable printing. Prints may not stick, or may have an uneven first layer.',
        recommendedAction: 'Replace the print surface. Most printers use inexpensive removable plates that are easy to swap. Check your printer model for compatible replacements.',
        estimatedTime: '5 minutes to replace',
        difficulty: 'easy',
      },
    },
  },

  {
    key: 'belt_tension',
    title: 'Drive Belts',
    description:
      'Your printer has rubber belts that pull the print head left and right. Pluck each belt like a guitar string and listen to the sound.',
    partIdentification: {
      partName: 'Drive Belts',
      simpleName: 'The rubber bands that move the print head',
      purpose:
        'The drive belts pull the print head left and right (X-axis) and the print bed forward and backward (Y-axis) with precise timing. They work like the rubber belt in a car engine.',
      whyItMatters:
        'Loose or worn belts cause a wavy pattern on the sides of your prints called "ringing." A snapped belt means the printer cannot move at all.',
      commonProblems: [
        'Belt too loose — causes wavy patterns on print surfaces',
        'Belt too tight — puts stress on motors and bearings',
        'Frayed edges — belt is wearing out and will snap soon',
      ],
      maintenanceInterval: 'Check tension every 3 months. Inspect for wear every 6 months.',
      imageKey: 'part_belt',
    },
    whatGoodLooksLike:
      'Belt makes a clear "twang" sound when plucked — like a low guitar string. Belt surface is smooth black rubber. Edges are clean with no fraying.',
    whatBadLooksLike:
      'Belt makes a dull thud or no sound — feels floppy or loose. Visible fraying along the edges. Small chunks missing from the belt.',
    cameraGuidance: {
      step1_find: 'Find the black rubber belt — it runs in a loop along the side of the print head rail, like a flat rubber band.',
      step2_match: 'Look for a flat black strap about 6–8 mm (¼ inch) wide running horizontally.',
      step3_distance: 'Get your camera about 15 cm (6 inches) from the belt so you can see its surface and edges clearly.',
      step4_center: 'Frame the belt so you can see the teeth on one side and the smooth surface on the other.',
      step5_action: 'Tap "Inspect" when the belt\'s surface and edges are clearly visible.',
    },
    printer_types: ['FDM'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your belts feel and sound correct.',
        risk: 'none',
        whatThisMeans: 'The belts are properly tensioned. Your prints should have clean, sharp edges.',
        recommendedAction: 'No action needed. Check tension again in 3 months.',
      },
      warn: {
        headline: 'Your belts might need tightening.',
        risk: 'low',
        whatThisMeans: 'The belts feel slightly loose. Loose belts cause a wavy or rippled pattern on the sides of your prints.',
        recommendedAction: 'Tighten the belts using the "Check and Tension Drive Belts" guide. Takes about 10 minutes, no tools needed.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'check_belts_fdm',
      },
      fail: {
        headline: 'Your belts need immediate attention.',
        risk: 'high',
        whatThisMeans: 'A belt is too loose, has slipped off, or is visibly damaged. The printer will produce poor quality prints or may not be able to print at all.',
        recommendedAction: 'Stop printing and use the "Check and Tension Drive Belts" guide. If the belt is frayed or damaged, it needs to be replaced.',
        estimatedTime: '10–30 minutes',
        difficulty: 'easy',
        guideKey: 'check_belts_fdm',
      },
    },
  },

  {
    key: 'linear_rods',
    title: 'Sliding Rods',
    description:
      'Push the print head gently by hand. It should glide smoothly with no grinding or sticking. Look at the rods it slides on.',
    partIdentification: {
      partName: 'Linear Rods (Sliding Rods)',
      simpleName: 'The smooth steel rods the print head slides along',
      purpose:
        'Your printer has smooth steel rods — like thick knitting needles — that guide the print head in perfectly straight lines. The print head slides along these rods on small bearing wheels or blocks.',
      whyItMatters:
        'Dry or dirty rods cause grinding, increased wear, and slight inaccuracies in print positioning. Very dry rods can cause the print head to judder, creating visible bands across your print.',
      commonProblems: [
        'Dry rods — lubrication has evaporated or been wiped off',
        'Dust and filament particles building up on the rod surface',
        'Rust spots on rods left in humid environments',
      ],
      maintenanceInterval: 'Lubricate every 3 months or when movement feels rough.',
      imageKey: 'part_linear_rod',
    },
    whatGoodLooksLike:
      'Rods look shiny or slightly oily. Print head glides smoothly with light pressure. No noise.',
    whatBadLooksLike:
      'Rods look dry, dusty, or have reddish-brown rust spots. You feel a grinding or rough sensation when pushing the head. You hear squeaking or scraping.',
    cameraGuidance: {
      step1_find: 'Find one of the smooth cylindrical steel rods your print head slides along. They look like shiny metal tubes running horizontally.',
      step2_match: 'Look for a rod about as thick as a pencil, running parallel to the direction the print head travels.',
      step3_distance: 'Hold your camera about 15 cm (6 inches) from the rod surface.',
      step4_center: 'Try to capture a section of the rod where you can clearly see whether it looks shiny and oily, or dry and dull.',
      step5_action: 'Tap "Inspect" when the rod surface is clearly visible.',
    },
    printer_types: ['FDM'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your sliding rods look well lubricated.',
        risk: 'none',
        whatThisMeans: 'The rods have enough lubrication. The print head moves freely and accurately.',
        recommendedAction: 'No action needed. Lubricate every 3 months as routine maintenance.',
      },
      warn: {
        headline: 'Your sliding rods look a bit dry.',
        risk: 'low',
        whatThisMeans: 'The lubrication is wearing off. Dry rods cause extra wear and can create slight inaccuracies in your prints over time.',
        recommendedAction: 'Apply lubricant using the "Lubricate Linear Rods" guide. Takes about 10 minutes.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'lubricate_rods_fdm',
      },
      fail: {
        headline: 'Your sliding rods need lubrication now.',
        risk: 'medium',
        whatThisMeans: 'The rods are dry, dirty, or rusted. Printing on dry rods causes rapid wear and inconsistent print quality.',
        recommendedAction: 'Clean and lubricate the rods right away using the "Lubricate Linear Rods" guide.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'lubricate_rods_fdm',
      },
    },
  },

  {
    key: 'extruder_gears',
    title: 'Filament Grip Wheel',
    description:
      'Look inside the opening where your filament enters the printer. You should see a small toothed wheel. Check for powdery buildup in the teeth.',
    partIdentification: {
      partName: 'Extruder (Filament Grip Wheel)',
      simpleName: 'The toothed wheel that grips and pushes your filament',
      purpose:
        'The extruder is the part that grips your filament and pushes it forward — like a little motor-powered set of teeth. It controls exactly how much plastic flows to the hot tip.',
      whyItMatters:
        'If the grip wheel is clogged with filament dust, it can\'t grip the filament reliably. This causes gaps, thin spots, and "grinding" sounds as the wheel slips on the filament.',
      commonProblems: [
        'Filament dust (fine powder) packed into the wheel teeth',
        'Worn or smooth teeth that can no longer grip',
        'Loose spring tension that reduces grip force',
      ],
      maintenanceInterval: 'Clean every 2 months or when you hear grinding during printing.',
      imageKey: 'part_extruder',
    },
    whatGoodLooksLike:
      'Clean wheel with sharp, well-defined ridges/teeth. No powder or debris in the grooves.',
    whatBadLooksLike:
      'Gray, white, or coloured powder packed into the grooves. The teeth look worn smooth instead of sharp.',
    cameraGuidance: {
      step1_find: 'Find the opening where your filament goes into the printer. This is usually near the top or side of the print head, or at a separate feeder box.',
      step2_match: 'Look inside the opening for a small toothed wheel — it looks like a tiny gear.',
      step3_distance: 'Get as close as possible while keeping the wheel in focus — about 5–8 cm (2–3 inches) away.',
      step4_center: 'Try to capture the teeth of the wheel clearly so you can see if they are clean or coated in powder.',
      step5_action: 'Tap "Inspect" when you can see the wheel teeth clearly.',
    },
    printer_types: ['FDM'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your filament grip wheel looks clean.',
        risk: 'none',
        whatThisMeans: 'The wheel is clean and can grip filament reliably. Good grip means consistent plastic flow and better print quality.',
        recommendedAction: 'No action needed. Check monthly.',
      },
      warn: {
        headline: 'Your filament grip wheel has some dust.',
        risk: 'low',
        whatThisMeans: 'Filament dust is collecting in the wheel\'s grooves. It can still grip, but heavy buildup can cause the filament to slip.',
        recommendedAction: 'Clean the wheel using the "Clean Extruder Gears" guide. An old toothbrush and 10 minutes is all you need.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'clean_extruder_fdm',
      },
      fail: {
        headline: 'Your filament grip wheel is clogged.',
        risk: 'medium',
        whatThisMeans: 'The wheel is packed with filament dust and can no longer grip the filament reliably. This causes gaps, blobs, and grinding sounds during printing.',
        recommendedAction: 'Clean the wheel right away using the "Clean Extruder Gears" guide.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'clean_extruder_fdm',
      },
    },
  },

  {
    key: 'bowden_tube',
    title: 'White Plastic Tube',
    description:
      'Trace the white plastic tube from the feeder down to the hot tip. Check that both ends are firmly attached and the tube has no kinks or cracks.',
    partIdentification: {
      partName: 'White Plastic Tube (Bowden Tube)',
      simpleName: 'The white hollow tube that guides filament to the melting tip',
      purpose:
        'This tube is like a straw that guides your filament from the grip wheel down to the hot melting tip. It keeps the filament on track and prevents it from wandering off course.',
      whyItMatters:
        'A loose, kinked, or cracked tube allows melted plastic to leak into the gap, causing a clog that can be very difficult to fix. A cracked tube near the hot tip also releases fumes.',
      commonProblems: [
        'Tube loose at one end — pulls out with light force',
        'A kink (sharp bend) in the tube that blocks filament',
        'Yellow or brown discoloration near the hot end from heat damage',
      ],
      maintenanceInterval: 'Inspect every 6 months or if you notice stringing, clogs, or poor quality.',
      imageKey: 'part_bowden_tube',
    },
    whatGoodLooksLike:
      'Clear or very slightly off-white tube. Both ends firmly connected. No kinks or sharp bends. No yellow or brown discolouration near the hot end.',
    whatBadLooksLike:
      'Tube pulls free with light hand pressure. Visible gap between tube end and hot tip when cold. Yellow or brown discolouration. A sharp kink anywhere along the tube.',
    cameraGuidance: {
      step1_find: 'Find the white plastic tube — it runs from the feeder wheel (where filament enters) down to the hot melting tip at the bottom of the print head.',
      step2_match: 'It looks like a white hollow straw, about 4 mm (less than ¼ inch) in diameter.',
      step3_distance: 'Focus on the connection point at the bottom where it meets the hot tip. Get about 10 cm (4 inches) away.',
      step4_center: 'Center the bottom connection of the white tube in your frame — you want to see if there is a gap between the tube and the metal part.',
      step5_action: 'Tap "Inspect" when you can clearly see the tube connection.',
    },
    printer_types: ['FDM'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your white plastic tube looks good.',
        risk: 'none',
        whatThisMeans: 'The tube is securely connected and undamaged. Filament should flow through it smoothly.',
        recommendedAction: 'No action needed. Check every 6 months or if you notice stringing or clogs.',
      },
      warn: {
        headline: 'Your white plastic tube has some discolouration.',
        risk: 'low',
        whatThisMeans: 'Slight yellowing near the hot end is normal over time, but heavy yellowing means the tube may be degrading.',
        recommendedAction: 'Note the condition and monitor it. If it gets worse or you notice an unusual smell when printing, replace the tube.',
        estimatedTime: '15 minutes',
        difficulty: 'easy',
        guideKey: 'inspect_bowden_fdm',
      },
      fail: {
        headline: 'Your white plastic tube needs attention.',
        risk: 'high',
        whatThisMeans: 'The tube is loose, kinked, cracked, or heavily discoloured. A loose tube allows melted plastic to leak into the gap and cause a severe clog. Do not ignore this.',
        recommendedAction: 'Stop printing until the tube is reseated or replaced. Use the "Inspect Bowden Tube" guide.',
        estimatedTime: '15 minutes',
        difficulty: 'easy',
        guideKey: 'inspect_bowden_fdm',
      },
    },
  },

  {
    key: 'hotend_fan',
    title: 'Cooling Fan (Hot Part)',
    description:
      'Power on the printer and watch the small fan mounted near the hot tip. It should spin up within a few seconds and run quietly.',
    partIdentification: {
      partName: 'Hotend Cooling Fan',
      simpleName: 'The small fan that keeps the upper part of the melting assembly cool',
      purpose:
        'This fan blows cool air over the metal block that holds the melting tip. It keeps heat from travelling upward into the plastic tube above, which would cause a clog inside the tube.',
      whyItMatters:
        'If this fan stops working, heat creeps up into the tube and melts the filament before it should — causing a severe internal clog. This type of clog can take an hour to fix.',
      commonProblems: [
        'Dust buildup reducing airflow',
        'Bearing failure causing clicking or rattling sounds',
        'Fan stopped running entirely',
      ],
      maintenanceInterval: 'Clean every 3 months. Listen for clicking or grinding during every print.',
      imageKey: 'part_hotend_fan',
    },
    whatGoodLooksLike:
      'Fan spins up quickly when the printer powers on. Blades are clean. Runs quietly without clicking or rattling.',
    whatBadLooksLike:
      'Fan doesn\'t spin or spins slowly. Dust clogging the blades. Makes a clicking, rattling, or grinding sound.',
    cameraGuidance: {
      step1_find: 'Find the small fan mounted on the print head assembly — it is usually directly above the hot metal block and sits against a flat metal plate (the heatsink).',
      step2_match: 'It looks like a small electric fan, about 4 cm (1.5 inches) square, with visible fan blades behind a grill.',
      step3_distance: 'Hold your camera about 15 cm (6 inches) from the fan so you can see the blades.',
      step4_center: 'With the printer on, watch whether the blades are spinning and whether they look clean.',
      step5_action: 'Tap "Inspect" while you can see the fan clearly — ideally while it is running.',
    },
    printer_types: ['FDM'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your cooling fan is running well.',
        risk: 'none',
        whatThisMeans: 'The fan is keeping the hot section cool. This prevents the plastic from melting too high up and causing a clog.',
        recommendedAction: 'No action needed. Clean dust off the blades every 3 months.',
      },
      warn: {
        headline: 'Your cooling fan has some dust buildup.',
        risk: 'low',
        whatThisMeans: 'Dust on the fan blades reduces airflow slightly. It is not an emergency, but too much dust can make the fan work harder and eventually fail.',
        recommendedAction: 'Clean the fan using the "Clean Cooling Fans" guide. About 10 minutes with a soft brush.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'clean_fans_fdm',
      },
      fail: {
        headline: 'Your cooling fan needs immediate attention.',
        risk: 'high',
        whatThisMeans: 'Without this fan, heat travels up into the white plastic tube and causes a severe internal clog. Do not print until this is fixed.',
        recommendedAction: 'Clean the fan first. If it still does not spin properly, it needs to be replaced.',
        estimatedTime: '10–30 minutes',
        difficulty: 'moderate',
        guideKey: 'clean_fans_fdm',
      },
    },
  },

  {
    key: 'part_cooling_fan',
    title: 'Blower Fan (Cools the Print)',
    description:
      'Look for the fan that directs air at the surface being printed. It should have a visible duct or shroud that points downward.',
    partIdentification: {
      partName: 'Part Cooling Fan',
      simpleName: 'The fan that blows cool air directly onto each layer of your print',
      purpose:
        'This fan cools each layer of your print immediately after it is placed. This prevents the layers from sagging or smearing before they solidify.',
      whyItMatters:
        'Without cooling, overhanging parts droop, bridges (sections printed in mid-air) fall, and fine details become blurry. This fan makes the difference between a clean print and a droopy mess.',
      commonProblems: [
        'Dust or filament clogging the blades',
        'Cracked plastic duct that lets air escape in the wrong direction',
        'Fan not spinning during prints',
      ],
      maintenanceInterval: 'Check for dust buildup monthly. Inspect the plastic duct for cracks every 3 months.',
      imageKey: 'part_cooling_fan',
    },
    whatGoodLooksLike:
      'Fan blades are clean. The plastic duct that channels the air is not cracked. Fan spins when printing.',
    whatBadLooksLike:
      'Plastic dust or filament threads clogging the blades. Cracks in the plastic duct. Fan does not spin during a print.',
    cameraGuidance: {
      step1_find: 'Find the fan or duct that faces downward toward the printing surface — usually on the front or side of the print head assembly.',
      step2_match: 'Look for a plastic shroud or tunnel that directs air downward toward the nozzle tip.',
      step3_distance: 'Get your camera about 15 cm (6 inches) from the fan assembly.',
      step4_center: 'Capture the fan blades and the plastic duct clearly so you can see both their condition.',
      step5_action: 'Tap "Inspect" when both the fan and the duct are visible.',
    },
    printer_types: ['FDM'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your print cooling fan looks good.',
        risk: 'none',
        whatThisMeans: 'The fan is clean and working. Each layer is being cooled properly.',
        recommendedAction: 'No action needed. Clean dust off the blades monthly.',
      },
      warn: {
        headline: 'Your print cooling fan has some dust.',
        risk: 'low',
        whatThisMeans: 'Dust on the fan blades reduces cooling. You might notice slightly worse quality on overhanging parts of your prints.',
        recommendedAction: 'Clean the fan using the "Clean Cooling Fans" guide.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'clean_fans_fdm',
      },
      fail: {
        headline: 'Your print cooling fan needs attention.',
        risk: 'medium',
        whatThisMeans: 'Without proper cooling, overhanging parts of your prints will droop and sag, bridges will fail, and fine details will be blurry.',
        recommendedAction: 'Clean or replace the fan using the "Clean Cooling Fans" guide.',
        estimatedTime: '10–30 minutes',
        difficulty: 'moderate',
        guideKey: 'clean_fans_fdm',
      },
    },
  },

  {
    key: 'z_axis',
    title: 'Vertical Threaded Rod',
    description:
      'Look at the tall threaded rod that runs vertically through your printer. It should look slightly shiny. Turn it gently by hand — it should feel smooth.',
    partIdentification: {
      partName: 'Lead Screw (Vertical Threaded Rod)',
      simpleName: 'The tall threaded rod that moves the printer up and down between layers',
      purpose:
        'After each layer of your print is complete, this threaded rod rotates to move the print head (or the bed) up or down by a very precise amount — usually less than half a millimetre.',
      whyItMatters:
        'A dry or dirty threaded rod causes inconsistent layer heights, which shows up as horizontal banding across the sides of your print. Severe wear can cause the rod to wobble and ruin print accuracy.',
      commonProblems: [
        'Lubrication drying out or being contaminated with dust',
        'Gritty grey powder building up between threads',
        'Wobble in the rod from a worn nut or damaged coupling',
      ],
      maintenanceInterval: 'Lubricate every 3 months.',
      imageKey: 'part_lead_screw',
    },
    whatGoodLooksLike:
      'Rod has a slight sheen from lubrication. No grey or brown powder on the threads. Turns smoothly by hand with no grinding.',
    whatBadLooksLike:
      'Rod looks completely dry. Grey or brown gritty powder packed into the threads. Reddish-brown rust spots. A grinding sensation when turning by hand.',
    cameraGuidance: {
      step1_find: 'Find the tall vertical rod with screw-like threads — it looks like a very long bolt running from top to bottom of your printer.',
      step2_match: 'It is a metallic rod about 8–10 mm thick with a spiral thread pattern on its surface, like a giant screw.',
      step3_distance: 'Hold your camera about 15 cm (6 inches) from the rod surface.',
      step4_center: 'Try to capture a section of the thread clearly so you can see whether it looks shiny with grease, or dry and grey.',
      step5_action: 'Tap "Inspect" when you can see the rod surface and thread condition clearly.',
    },
    printer_types: ['FDM'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your vertical rod looks well lubricated.',
        risk: 'none',
        whatThisMeans: 'The rod is lubricated and will move the print head smoothly between layers.',
        recommendedAction: 'No action needed. Lubricate every 3 months.',
      },
      warn: {
        headline: 'Your vertical rod looks dry.',
        risk: 'low',
        whatThisMeans: 'The lubrication is wearing off. Dry threads cause extra wear and can create a repeating horizontal line pattern on the sides of your prints.',
        recommendedAction: 'Lubricate the rod using the "Lubricate Z-Axis Lead Screw" guide. Takes about 10 minutes.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'lubricate_z_fdm',
      },
      fail: {
        headline: 'Your vertical rod needs lubrication now.',
        risk: 'medium',
        whatThisMeans: 'The rod is dry or has debris packed into the threads. This causes inconsistent layer heights, loud grinding noises, and premature wear.',
        recommendedAction: 'Clean and lubricate the rod right away using the guide.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'lubricate_z_fdm',
      },
    },
  },

  {
    key: 'wiring_cables',
    title: 'Wires and Cables',
    description:
      'Power off the printer and unplug it from the wall first. Then trace all visible wires and check the outer coating for any damage.',
    partIdentification: {
      partName: 'Wiring and Cable Harness',
      simpleName: 'The bundles of wires that carry electricity to every part of the printer',
      purpose:
        'These wires carry electricity to the motors, heaters, sensors, and fans. Some of these wires flex back and forth thousands of times as the print head moves — like bending a paperclip repeatedly.',
      whyItMatters:
        'Worn or damaged wires can cause electrical faults, unexpected printer shutdowns, or — in serious cases — a fire. This is a safety check that should be taken seriously.',
      commonProblems: [
        'Outer wire coating worn through from constant flexing',
        'Wires pinched or trapped under a moving part',
        'Connectors partially unplugged',
      ],
      maintenanceInterval: 'Inspect every 6 months. This is a safety check.',
      imageKey: 'part_wiring',
    },
    whatGoodLooksLike:
      'All wires have smooth, unbroken outer coating. All connectors are fully seated with no metal visible outside the plug body.',
    whatBadLooksLike:
      'Bare copper wire visible through a worn spot. Coating that looks melted, burned, or cracked. A connector that is only halfway plugged in. Any wire pinched under a moving part.',
    cameraGuidance: {
      step1_find: 'Find the cable bundle that follows the print head as it moves. It is usually a group of wires tied together, often running through a plastic chain or cable sleeve.',
      step2_match: 'Look for a bundle of coloured wires — red, black, white, and others — that runs from the printer body to the moving print head.',
      step3_distance: 'Move slowly along the cable length from one end to the other, holding your camera about 15 cm (6 inches) away at each point.',
      step4_center: 'Focus especially on any areas where the cable bends repeatedly, and where the cables connect to the heated print bed.',
      step5_action: 'Tap "Inspect" when you have found any worn or damaged section — or when you have checked the full length and found nothing.',
    },
    printer_types: ['FDM'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your wiring looks safe.',
        risk: 'none',
        whatThisMeans: 'All cables appear intact and safely routed. No exposed wire or damaged coating found.',
        recommendedAction: 'No action needed. Check again every 6 months.',
      },
      warn: {
        headline: 'Your wiring shows some wear.',
        risk: 'medium',
        whatThisMeans: 'There are signs of wear beginning — minor kinks, slight discoloration, or a connector that is not fully seated. Not an emergency, but worth monitoring closely.',
        recommendedAction: 'Reseat any loose connectors. Note the location of any kinks and check again next month. See the "Inspect Wiring and Cables" guide.',
        estimatedTime: '15 minutes',
        difficulty: 'easy',
        guideKey: 'check_wiring_fdm',
      },
      fail: {
        headline: 'Your wiring needs attention before you print again.',
        risk: 'high',
        whatThisMeans: 'Exposed copper wire or severely damaged insulation is a fire and electrical hazard. The printer should not be used until the damaged wiring is repaired.',
        recommendedAction: 'Do not print. Contact your printer\'s manufacturer support or a qualified technician. See the "Inspect Wiring and Cables" guide for more detail.',
        estimatedTime: '15 minutes to diagnose',
        difficulty: 'advanced',
        guideKey: 'check_wiring_fdm',
      },
    },
  },
];

export const RESIN_CHECKPOINTS: CheckpointDefinition[] = [
  {
    key: 'fep_film',
    title: 'Clear Film in the Tank',
    description:
      'Hold the empty tank up to a light and look through the clear film at the bottom. It should be perfectly transparent.',
    partIdentification: {
      partName: 'FEP Film (Clear Tank Film)',
      simpleName: 'The clear flexible film at the bottom of the resin tank',
      purpose:
        'This film works like a non-stick surface between the UV light source below and the resin above. Each layer of your print is cured (hardened) against this film, then peeled away as the build plate rises.',
      whyItMatters:
        'A cloudy or scratched film blocks UV light unevenly, causing failed prints. A hole in the film lets liquid resin drip onto the UV screen below, which can permanently damage the most expensive part of your printer.',
      commonProblems: [
        'Cloudiness or scratches from repeated printing',
        'Cured resin chunks stuck to the film',
        'Holes or tears from using metal scrapers',
      ],
      maintenanceInterval: 'Inspect after every print session. Replace every 2–3 months or when cloudy.',
      imageKey: 'part_fep_film',
    },
    whatGoodLooksLike:
      'Crystal clear film with no visible scratches. Light passes through it evenly, like clean glass.',
    whatBadLooksLike:
      'Cloudy, frosted, or hazy patches. Visible scratches that catch the light. Tiny holes or tears. Cured resin chunks stuck to the surface.',
    cameraGuidance: {
      step1_find: 'Empty your resin tank and hold it up to a bright light source — a lamp or window works well.',
      step2_match: 'Look at the clear film at the bottom of the tank from below, with the light shining through it.',
      step3_distance: 'Hold your camera about 20 cm (8 inches) from the underside of the film.',
      step4_center: 'The light should shine through the film clearly. Frame the entire film area so you can see all of it.',
      step5_action: 'Tap "Inspect" when you can see the whole film area clearly with light behind it.',
    },
    printer_types: ['Resin'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your clear film looks good.',
        risk: 'none',
        whatThisMeans: 'The film is clear and undamaged. UV light can pass through it evenly, curing your resin properly.',
        recommendedAction: 'No action needed. Clean gently with a plastic scraper and rubbing alcohol after each use.',
      },
      warn: {
        headline: 'Your clear film has some wear.',
        risk: 'low',
        whatThisMeans: 'Minor scratches or slight cloudiness are reducing UV light transmission slightly. This can lead to softer details in your prints.',
        recommendedAction: 'Clean carefully with the "Inspect and Clean FEP Film" guide. If cleaning doesn\'t restore clarity, plan to replace it soon.',
        estimatedTime: '15 minutes',
        difficulty: 'easy',
        guideKey: 'clean_fep_resin',
      },
      fail: {
        headline: 'Your clear film needs replacing.',
        risk: 'high',
        whatThisMeans: 'A cloudy, scratched, or torn film causes print failures and risks resin leaking onto the UV screen below — which can permanently damage your printer.',
        recommendedAction: 'Do not print until this film is replaced. Use the "Replace FEP Film" guide — takes about 30 minutes.',
        estimatedTime: '30 minutes',
        difficulty: 'moderate',
        guideKey: 'replace_fep_resin',
      },
    },
  },

  {
    key: 'build_plate',
    title: 'Metal Print Plate',
    description:
      'Look at the flat metal plate your prints build on. It should have a consistent surface with no large chunks of old resin.',
    partIdentification: {
      partName: 'Build Plate',
      simpleName: 'The metal plate your resin prints stick to as they are pulled up',
      purpose:
        'Your prints grow downward — each new layer is cured at the bottom of the tank and sticks to the plate above. The plate then rises to pull the print away from the film and make room for the next layer.',
      whyItMatters:
        'A dirty or damaged plate causes prints to not stick (print falls off mid-print) or to stick too aggressively (print is impossible to remove without cracking).',
      commonProblems: [
        'Resin residue reducing the bonding surface area',
        'Scratches from metal scrapers breaking the surface coating',
        'Uneven surface causing poor first-layer adhesion',
      ],
      maintenanceInterval: 'Clean with rubbing alcohol before every print.',
      imageKey: 'part_build_plate_resin',
    },
    whatGoodLooksLike:
      'Consistent matte or satin surface texture. Clean with no chunks of resin stuck to it.',
    whatBadLooksLike:
      'Large chunks of cured resin stuck to the surface. Deep gouges or scratches. The surface coating is peeling or flaking off.',
    cameraGuidance: {
      step1_find: 'Find the flat metal plate that hangs down from the arm above the resin tank — this is the plate your prints attach to.',
      step2_match: 'It is a flat square or rectangular metal plate, usually silver or dark grey in colour.',
      step3_distance: 'Hold your camera about 15 cm (6 inches) directly in front of the plate surface.',
      step4_center: 'Capture the full surface so you can see the texture and check for stuck resin.',
      step5_action: 'Tap "Inspect" when you can see the full plate surface clearly.',
    },
    printer_types: ['Resin'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your metal print plate looks clean.',
        risk: 'none',
        whatThisMeans: 'The plate is clean and ready for your next print.',
        recommendedAction: 'Wipe with rubbing alcohol before each print for best adhesion.',
      },
      warn: {
        headline: 'Your metal print plate needs cleaning.',
        risk: 'low',
        whatThisMeans: 'Resin residue on the plate can affect how well your next print sticks.',
        recommendedAction: 'Clean the plate using the "Clean the Build Plate" guide.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'clean_build_plate_resin',
      },
      fail: {
        headline: 'Your metal print plate has damage.',
        risk: 'medium',
        whatThisMeans: 'Deep gouges or a damaged surface coating means prints may not adhere reliably.',
        recommendedAction: 'Replace the plate. Check your printer manufacturer\'s website for compatible replacement plates.',
        estimatedTime: '5 minutes to replace',
        difficulty: 'easy',
      },
    },
  },

  {
    key: 'resin_vat',
    title: 'Resin Tank Interior',
    description:
      'Look inside the empty tank for any solid pieces of hardened resin sitting on the clear film. Even small pieces cause print failures.',
    partIdentification: {
      partName: 'Resin Vat (Tank)',
      simpleName: 'The container that holds the liquid resin during printing',
      purpose:
        'The resin vat holds the liquid resin. The UV light shines up through the clear film at the bottom, curing each layer of your print against it.',
      whyItMatters:
        'Any hardened resin left inside the vat blocks the UV light for the layer above it, causing holes or weak spots in your print. Hard pieces can also scratch or puncture the clear film.',
      commonProblems: [
        'Cured resin chunks from a previous failed print',
        'Cloudy or separated resin that has been sitting too long',
        'Resin residue stuck to the vat walls',
      ],
      maintenanceInterval: 'Inspect and filter resin before every print session.',
      imageKey: 'part_resin_vat',
    },
    whatGoodLooksLike:
      'Empty tank with a clear, clean film at the bottom. No solid pieces anywhere inside.',
    whatBadLooksLike:
      'Any solid chunks — even pea-sized — sitting on the clear film. Cloudy or separated resin that does not mix back evenly when stirred.',
    cameraGuidance: {
      step1_find: 'After pouring the resin out, look straight down into the empty tank.',
      step2_match: 'You are looking for the clear film at the bottom of the tank. It should be flat and clear.',
      step3_distance: 'Hold your camera about 20 cm (8 inches) above the tank, pointing straight down.',
      step4_center: 'Try to capture the entire floor of the tank so you can see the full film area.',
      step5_action: 'Tap "Inspect" when you can see the full floor of the empty tank clearly.',
    },
    printer_types: ['Resin'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your resin tank looks clean.',
        risk: 'none',
        whatThisMeans: 'No cured resin pieces found. Your next print should start cleanly.',
        recommendedAction: 'Filter your resin through a paint strainer before each use to catch any small particles.',
      },
      warn: {
        headline: 'Your resin tank has some residue.',
        risk: 'low',
        whatThisMeans: 'Small amounts of resin residue may be present. This usually happens after a partial print failure.',
        recommendedAction: 'Use the "Filter the Resin Vat" guide to strain the resin and clean the tank.',
        estimatedTime: '20 minutes',
        difficulty: 'easy',
        guideKey: 'filter_resin_vat',
      },
      fail: {
        headline: 'Your resin tank has cured chunks inside.',
        risk: 'high',
        whatThisMeans: 'Solid pieces of hardened resin will block UV light and prevent your print from forming. They can also scratch the clear film at the bottom.',
        recommendedAction: 'Remove all cured pieces using a plastic scraper (never metal) and filter the resin. See the "Filter the Resin Vat" guide.',
        estimatedTime: '20 minutes',
        difficulty: 'easy',
        guideKey: 'filter_resin_vat',
      },
    },
  },

  {
    key: 'z_rail_resin',
    title: 'Vertical Sliding Rail',
    description:
      'Push the metal print plate gently up and down by hand (printer off). It should glide with no grinding. Look at the rail it slides on.',
    partIdentification: {
      partName: 'Z-Axis Rail (Vertical Sliding Rail)',
      simpleName: 'The vertical rail that moves the print plate up and down',
      purpose:
        'After each layer is cured, this rail moves the build plate upward by a precise fraction of a millimetre to make room for the next layer. Smooth movement means consistent layer heights.',
      whyItMatters:
        'A dry or sticky rail causes layer shifting — where each layer is slightly misaligned — making your prints look stepped or twisted.',
      commonProblems: [
        'Lubrication drying out, causing friction and grinding',
        'Side-to-side wobble from a worn rail or carriage',
      ],
      maintenanceInterval: 'Lubricate every 3 months.',
      imageKey: 'part_z_rail_resin',
    },
    whatGoodLooksLike:
      'Rail has a thin coat of grease. Plate slides up and down smoothly with no wobble.',
    whatBadLooksLike:
      'Rail looks completely dry. You feel grinding or sticking when sliding the plate. The plate wobbles side-to-side.',
    cameraGuidance: {
      step1_find: 'Find the single vertical rail running up and down on the back of the printer — the build plate arm slides along this rail.',
      step2_match: 'It is a smooth or lightly textured metal column, usually running behind or beside the resin tank.',
      step3_distance: 'Hold your camera about 15 cm (6 inches) from the rail surface.',
      step4_center: 'Capture the rail surface so you can see whether it has a sheen of grease or looks dry.',
      step5_action: 'Tap "Inspect" when the rail surface is clearly visible.',
    },
    printer_types: ['Resin'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your sliding rail is well lubricated.',
        risk: 'none',
        whatThisMeans: 'The rail allows the build plate to move consistently between layers.',
        recommendedAction: 'No action needed. Lubricate every 3 months.',
      },
      warn: {
        headline: 'Your sliding rail looks a bit dry.',
        risk: 'low',
        whatThisMeans: 'Reduced lubrication will cause extra wear and may lead to slightly inconsistent layer heights.',
        recommendedAction: 'Apply a small amount of grease using the "Lubricate Z-Axis Rail" guide.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'lubricate_z_resin',
      },
      fail: {
        headline: 'Your sliding rail needs lubrication.',
        risk: 'medium',
        whatThisMeans: 'Severe dryness or wobble will cause layer shifting — prints that look stepped or twisted.',
        recommendedAction: 'Lubricate the rail using the guide, then check if wobble is reduced. If it persists, contact your printer\'s support team.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'lubricate_z_resin',
      },
    },
  },

  {
    key: 'uv_screen',
    title: 'Screen Under the Tank',
    description:
      'Remove the resin tank and look at the screen beneath it. It should look uniformly dark with no cracks, bright spots, or discolouration.',
    partIdentification: {
      partName: 'UV LCD Screen',
      simpleName: 'The screen under the resin tank that shines UV light to harden resin',
      purpose:
        'This LCD screen works like a projector — it displays the shape of each layer, and UV light shines through those shapes to harden only the resin in the correct places.',
      whyItMatters:
        'A cracked or degraded screen produces prints with missing sections, uneven hardness, or completely failed layers. Screens do wear out over time — this is a normal service item.',
      commonProblems: [
        'Cracks from dropping something on the screen',
        'Gradual degradation reducing light output over hundreds of hours',
        'Dead zones (dark patches) that cause incomplete curing',
      ],
      maintenanceInterval: 'Inspect every 3 months. Run a UV exposure test every 6 months.',
      imageKey: 'part_uv_screen',
    },
    whatGoodLooksLike:
      'Uniformly dark surface with no cracks. No bright or discoloured patches.',
    whatBadLooksLike:
      'Visible cracks across the screen. Greenish or yellowish tint on part of the screen. Spots that look brighter than the rest.',
    cameraGuidance: {
      step1_find: 'Remove the resin tank. The screen is the flat surface underneath it — the surface your tank rests on.',
      step2_match: 'It looks like the screen of a phone or tablet, but usually black when off. Keep your face away from the screen.',
      step3_distance: 'Hold your camera about 20 cm (8 inches) above the screen, pointing straight down.',
      step4_center: 'Capture the entire screen surface so you can see the full area clearly.',
      step5_action: 'Tap "Inspect" when you can see the whole screen surface.',
    },
    printer_types: ['Resin'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your UV screen looks undamaged.',
        risk: 'none',
        whatThisMeans: 'The screen is curing resin evenly across its surface.',
        recommendedAction: 'No action needed. Keep resin off the screen by maintaining the clear film above it.',
      },
      warn: {
        headline: 'Your UV screen has some discolouration.',
        risk: 'low',
        whatThisMeans: 'Slight yellowing or uneven appearance can indicate early screen ageing. Screens gradually lose power over time.',
        recommendedAction: 'Run a UV exposure test (most printers have this built in) to check if exposure times need adjusting.',
        estimatedTime: '5 minutes',
        difficulty: 'easy',
      },
      fail: {
        headline: 'Your UV screen has visible damage.',
        risk: 'high',
        whatThisMeans: 'A cracked or heavily degraded screen will produce failed prints with missing sections or uneven curing. The screen needs replacing.',
        recommendedAction: 'Search for "[your printer model] LCD screen replacement." This is a moderate repair — contact your printer manufacturer for guidance.',
        estimatedTime: '30–60 minutes',
        difficulty: 'moderate',
      },
    },
  },
];

export function getCheckpointsForType(
  printerType: 'FDM' | 'Resin',
  quickOnly: boolean
): CheckpointDefinition[] {
  const all = printerType === 'FDM' ? FDM_CHECKPOINTS : RESIN_CHECKPOINTS;
  return quickOnly ? all.filter(c => c.includeInQuick) : all;
}
