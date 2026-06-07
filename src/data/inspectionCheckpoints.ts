import { CheckpointDefinition } from '../types';

// Visual inspection checkpoints used in the InspectionScreen wizard.
//
// GRANDPARENT TEST: Every description, camera target, and diagnosis must be
// understandable by someone who has never touched a 3D printer. No jargon
// without an immediate plain-language explanation. No assumed knowledge.
//
// Camera target format: "Point your camera at [exactly where to aim]"
// Diagnosis format: headline / risk / what this means / recommended action

export const FDM_CHECKPOINTS: CheckpointDefinition[] = [
  {
    key: 'nozzle_condition',
    title: 'The Nozzle Tip',
    description:
      'The nozzle is the small metal part at the very bottom of your printer — it\'s the part that melts and pushes out the filament (plastic). Look at its tip. It should be mostly clean silver or brass-coloured metal. A small amount of dark residue on the outside is normal.',
    cameraTarget:
      'Point your camera at the very tip of the small metal part at the bottom of the print head. Get about 10–15 cm (4–6 inches) away so the tip fills most of the screen.',
    whatGoodLooksLike:
      'Clean or mostly clean metal tip. Maybe a tiny bit of dark plastic on the outside — that\'s fine.',
    whatBadLooksLike:
      'Thick black or brown crust built up around the tip. Visible cracks or damage. The tip looks squashed, chewed, or has a hole in the wrong place. Plastic oozing out while the printer is sitting still.',
    printer_types: ['FDM'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your nozzle tip looks good!',
        risk: 'none',
        whatThisMeans: 'The nozzle is clean and doesn\'t show signs of damage or heavy buildup. Your printer should be laying down plastic normally.',
        recommendedAction: 'No action needed. Check again at your next scheduled inspection.',
      },
      warn: {
        headline: 'Your nozzle has some buildup.',
        risk: 'low',
        whatThisMeans: 'There\'s some burnt plastic stuck to the outside of the nozzle. This is common and doesn\'t usually stop the printer from working, but if it gets worse it can drip onto your prints.',
        recommendedAction: 'Clean the nozzle soon using the "Clean the Nozzle" guide. It only takes about 15 minutes and no tools are needed.',
        estimatedTime: '15 minutes',
        difficulty: 'easy',
        guideKey: 'clean_nozzle_fdm',
      },
      fail: {
        headline: 'Your nozzle needs attention.',
        risk: 'medium',
        whatThisMeans: 'The nozzle has heavy buildup, visible damage, or is leaking plastic. This will likely cause print failures — poor quality, clogs, or the print not sticking to the bed.',
        recommendedAction: 'Try cleaning the nozzle first. If it still looks bad or is cracked, you\'ll need to replace it. The "Replace the Nozzle" guide walks you through it step by step.',
        estimatedTime: '15–20 minutes',
        difficulty: 'moderate',
        guideKey: 'clean_nozzle_fdm',
      },
    },
  },

  {
    key: 'bed_surface',
    title: 'The Print Surface',
    description:
      'The print surface is the flat plate your printer builds on — it\'s where the first layer of your print sticks down. Run a clean finger lightly across it. It should feel smooth and slightly grippy. Look for scratches, gouges, or stuck-on plastic you can\'t remove.',
    cameraTarget:
      'Point your camera straight down at the flat printing surface from about 20 cm (8 inches) above. Angle the light so you can see any scratches or marks.',
    whatGoodLooksLike:
      'Smooth, evenly textured surface. No deep scratches. Clean with no old filament stuck to it.',
    whatBadLooksLike:
      'Deep gouges or scratches you can feel with your fingernail. Large patches of filament permanently stuck down. Bubbles, cracks, or peeling coating.',
    printer_types: ['FDM'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your print surface looks great!',
        risk: 'none',
        whatThisMeans: 'The surface is in good condition. Your first layers should stick well.',
        recommendedAction: 'Keep it clean by wiping with rubbing alcohol before each print. Your skin\'s natural oils can stop prints from sticking.',
      },
      warn: {
        headline: 'Your print surface has some wear.',
        risk: 'low',
        whatThisMeans: 'There are light scratches or small patches of stuck filament. This might cause occasional adhesion problems — where the first layer doesn\'t stick properly.',
        recommendedAction: 'Clean the surface thoroughly with rubbing alcohol. For stubborn stuck filament, try gently flexing a spring steel sheet if you have one, or warm the bed slightly (50°C) to help it release.',
        estimatedTime: '5 minutes',
        difficulty: 'easy',
        guideKey: 'clean_bed_fdm',
      },
      fail: {
        headline: 'Your print surface needs replacing.',
        risk: 'medium',
        whatThisMeans: 'The surface is too scratched or damaged for reliable printing. Prints may not stick, or may have rough or uneven first layers.',
        recommendedAction: 'Replace the print surface. Most printers use inexpensive removable plates (PEI sheets or glass beds) that are easy to swap. Check your printer model for compatible replacements.',
        estimatedTime: '5 minutes',
        difficulty: 'easy',
      },
    },
  },

  {
    key: 'belt_tension',
    title: 'The Drive Belts',
    description:
      'Your printer has rubber belts (like very thin bicycle chains, but smooth) that pull the print head left and right, and the print bed forward and backward. These need to be properly tight — not too loose, not too tight. Pluck each belt like a guitar string and listen to the sound it makes.',
    cameraTarget:
      'Point your camera at the black rubber belt that runs along the side of the print head rail. Get close enough that you can see the belt\'s surface texture.',
    whatGoodLooksLike:
      'Belt makes a clear "twang" sound when plucked. Feels firm. Belt surface is smooth black rubber with no frayed edges.',
    whatBadLooksLike:
      'Belt makes a dull, flat "thud" or no sound — it feels floppy or loose. Visible fraying along the edges of the belt. Small chunks missing from the belt. Belt has slipped off a pulley wheel.',
    printer_types: ['FDM'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your belts feel and sound correct.',
        risk: 'none',
        whatThisMeans: 'The belts are properly tensioned. Your prints should have clean, sharp edges without a "ringing" or wavy pattern on the sides.',
        recommendedAction: 'No action needed. Check again every few months.',
      },
      warn: {
        headline: 'Your belts might need tightening.',
        risk: 'low',
        whatThisMeans: 'The belts feel slightly loose or sound duller than they should. Loose belts cause a pattern called "ringing" — wavy lines on the sides of your prints.',
        recommendedAction: 'Use the "Check and Tension Drive Belts" guide to tighten them. It takes about 10 minutes and needs no tools.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'check_belts_fdm',
      },
      fail: {
        headline: 'Your belts need immediate attention.',
        risk: 'high',
        whatThisMeans: 'A belt is too loose, has slipped off, or is visibly damaged. The printer will make poor quality prints or may not be able to print at all. A snapped belt means the print head can\'t move properly.',
        recommendedAction: 'Stop printing and use the "Check and Tension Drive Belts" guide. If the belt is frayed or damaged, it will need to be replaced — this is a spare part that usually costs a few dollars.',
        estimatedTime: '10–30 minutes',
        difficulty: 'easy',
        guideKey: 'check_belts_fdm',
      },
    },
  },

  {
    key: 'linear_rods',
    title: 'The Sliding Rods',
    description:
      'Your printer has smooth steel rods (like thick knitting needles) that the print head slides along. Gently push the print head left and right, and the bed forward and backward, by hand. They should glide smoothly with no grinding, scraping, or sticking. The rods should look clean and slightly shiny.',
    cameraTarget:
      'Point your camera at one of the smooth steel rods your print head slides on. Try to capture the rod\'s surface so you can see whether it\'s clean or dirty.',
    whatGoodLooksLike:
      'Rods look shiny or slightly oily. Print head slides smoothly with gentle pressure. No noise.',
    whatBadLooksLike:
      'Rods look dry, dusty, or have reddish-brown rust spots. You feel a grinding or rough sensation when pushing the head. You hear a squeaking or scraping sound.',
    printer_types: ['FDM'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your sliding rods look well lubricated.',
        risk: 'none',
        whatThisMeans: 'The rods have enough lubrication. The print head moves freely, which means your printer can place plastic exactly where it\'s supposed to.',
        recommendedAction: 'No action needed. Lubricate every 3 months as a routine maintenance step.',
      },
      warn: {
        headline: 'Your sliding rods look a bit dry.',
        risk: 'low',
        whatThisMeans: 'The rods have lost some of their lubrication. Dry rods cause extra wear over time and can cause slight inaccuracies in your prints.',
        recommendedAction: 'Apply a small amount of lubricant to the rods — this takes about 10 minutes. Use the "Lubricate Linear Rods" guide.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'lubricate_rods_fdm',
      },
      fail: {
        headline: 'Your sliding rods need lubrication or cleaning now.',
        risk: 'medium',
        whatThisMeans: 'The rods are dry, dirty, or rusted. Continuing to print on dry rods causes rapid wear on the metal bearings. Rust spots will permanently damage the rods.',
        recommendedAction: 'Clean and lubricate the rods right away using the "Lubricate Linear Rods" guide. If you see rust, wipe it gently with a dry cloth before applying lubricant. Severe rust means the rod may need replacing.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'lubricate_rods_fdm',
      },
    },
  },

  {
    key: 'extruder_gears',
    title: 'The Filament Grip Wheel',
    description:
      'Inside your printer there\'s a toothed wheel (like a tiny gear) that grips your filament and pushes it toward the hot end. Look inside the extruder body — the part where your filament enters the printer. You should see the ridged surface of this wheel. Check whether there\'s a powdery buildup in the teeth.',
    cameraTarget:
      'Point your camera into the gap where your filament goes into the printer. You\'re looking for a small toothed metal wheel. Get as close as you can while keeping it in focus.',
    whatGoodLooksLike:
      'Clean wheel with sharp, defined ridges/teeth. No powder or debris packed into the grooves.',
    whatBadLooksLike:
      'Gray, white, or colored powder packed into the grooves of the wheel. The teeth look worn smooth instead of sharp. The wheel wobbles when you turn it by hand.',
    printer_types: ['FDM'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your filament grip wheel looks clean.',
        risk: 'none',
        whatThisMeans: 'The wheel is clean and can grip filament reliably. Good grip means consistent plastic flow and better print quality.',
        recommendedAction: 'No action needed. Check again monthly.',
      },
      warn: {
        headline: 'Your filament grip wheel has some dust.',
        risk: 'low',
        whatThisMeans: 'Filament dust is collecting in the wheel\'s grooves. The wheel can still grip, but heavy buildup can eventually cause the filament to slip — which creates gaps or thin spots in your prints.',
        recommendedAction: 'Clean the wheel using the "Clean Extruder Gears" guide. An old toothbrush and 10 minutes is all you need.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'clean_extruder_fdm',
      },
      fail: {
        headline: 'Your filament grip wheel is clogged.',
        risk: 'medium',
        whatThisMeans: 'The wheel is packed with filament dust and can no longer grip the filament reliably. This causes your printer to grind away at the filament instead of pushing it, creating gaps and blobs in your prints.',
        recommendedAction: 'Clean the wheel right away using the "Clean Extruder Gears" guide. If the wheel\'s teeth look worn smooth, the extruder may need to be replaced.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'clean_extruder_fdm',
      },
    },
  },

  {
    key: 'bowden_tube',
    title: 'The White Plastic Tube',
    description:
      'Many printers have a white plastic tube that guides the filament from the feeder wheel to the hot tip (where it melts). Trace this white tube from top to bottom. Check that both ends are firmly connected — they should not pull out with light hand pressure. Look for any kinks (sharp bends), cracks, or discoloration near the hot end.',
    cameraTarget:
      'Point your camera at the white plastic tube where it connects at the bottom — near the hot metal tip. Get close so you can see the connection point clearly.',
    whatGoodLooksLike:
      'Clear or very slightly off-white tube. Both ends firmly seated. No kinks. No yellow or brown discoloration near the hot end.',
    whatBadLooksLike:
      'Tube pulls out of its fitting without tools. You can see a gap between the tube and the hot tip when the printer is cold. Yellow or brown color near the hot end. A sharp bend (kink) anywhere along the tube.',
    printer_types: ['FDM'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your white plastic tube looks good.',
        risk: 'none',
        whatThisMeans: 'The tube is securely connected and undamaged. Filament should flow through it smoothly without getting caught.',
        recommendedAction: 'No action needed. Check every 6 months or if you notice stringing or clogs.',
      },
      warn: {
        headline: 'Your white plastic tube has some discoloration.',
        risk: 'low',
        whatThisMeans: 'Slight yellowing near the hot end is normal over time, but heavy yellowing or browning means the tube may be degrading. A degraded tube can release fumes and may affect print quality.',
        recommendedAction: 'Note the condition and monitor it. If it gets worse or if you notice a smell when printing, replace the tube using the "Inspect Bowden Tube" guide.',
        estimatedTime: '15 minutes',
        difficulty: 'easy',
        guideKey: 'inspect_bowden_fdm',
      },
      fail: {
        headline: 'Your white plastic tube needs attention.',
        risk: 'high',
        whatThisMeans: 'The tube is loose, kinked, cracked, or heavily discolored. A loose tube allows melted plastic to leak into the gap, causing clogs that are very difficult to fix. A degraded tube at high temperatures can release harmful fumes.',
        recommendedAction: 'Stop using the printer until the tube is reseated or replaced. Use the "Inspect Bowden Tube" guide. Replacement tubes cost very little and the swap takes about 15 minutes.',
        estimatedTime: '15 minutes',
        difficulty: 'easy',
        guideKey: 'inspect_bowden_fdm',
      },
    },
  },

  {
    key: 'hotend_fan',
    title: 'The Cooling Fan (near the hot part)',
    description:
      'Your printer has a small fan that blows air over the metal block that holds the hot tip. This fan is critical — without it, heat creeps up into the cold section of the printer and causes clogs. Power on the printer and watch this fan. It should spin up within a few seconds and run quietly the whole time the printer is on.',
    cameraTarget:
      'Point your camera at the small fan mounted on the assembly near the nozzle (usually directly above the heating block). Try to capture the blades so you can see if they\'re spinning.',
    whatGoodLooksLike:
      'Fan spins up quickly when the printer powers on. Blades are clean. Runs quietly without clicking or rattling.',
    whatBadLooksLike:
      'Fan doesn\'t spin at all, or spins slowly. You can see dust clogging the blades. Makes a clicking, rattling, or grinding sound.',
    printer_types: ['FDM'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your cooling fan is running well.',
        risk: 'none',
        whatThisMeans: 'The fan is keeping the hot section cool. This prevents the plastic from melting too high up in the tube, which would cause a clog.',
        recommendedAction: 'No action needed. Clean dust off the blades every few months.',
      },
      warn: {
        headline: 'Your cooling fan has some dust buildup.',
        risk: 'low',
        whatThisMeans: 'Dust on the fan blades reduces airflow slightly. It\'s not an emergency, but too much dust can make the fan work harder and eventually fail.',
        recommendedAction: 'Clean the fan using the "Clean Cooling Fans" guide. A soft brush or puff of air takes about 10 minutes.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'clean_fans_fdm',
      },
      fail: {
        headline: 'Your cooling fan needs immediate attention.',
        risk: 'high',
        whatThisMeans: 'If this fan stops working, heat will travel up into the plastic tube above the hot tip and cause a severe clog — sometimes called a "heat creep" clog — that can be very difficult to clear.',
        recommendedAction: 'Do not print until this fan is fixed. Clean it first using the "Clean Cooling Fans" guide. If cleaning doesn\'t fix it, the fan needs to be replaced.',
        estimatedTime: '10–30 minutes',
        difficulty: 'moderate',
        guideKey: 'clean_fans_fdm',
      },
    },
  },

  {
    key: 'part_cooling_fan',
    title: 'The Blower Fan (cools your print)',
    description:
      'There is a second fan on your printer that blows air directly at your print as it\'s being made. This fan cools each layer quickly so the next layer can be placed on top without smearing. It\'s usually mounted under the print head with a duct that points down at the nozzle tip.',
    cameraTarget:
      'Point your camera at the fan or duct that faces downward toward the printing surface. It\'s usually on the front or side of the print head assembly.',
    whatGoodLooksLike:
      'Fan blades are clean. The plastic duct that directs the air is not cracked. Fan spins when printing.',
    whatBadLooksLike:
      'Plastic dust or filament threads clogging the fan blades. Cracks in the plastic air duct. Fan doesn\'t spin during a print.',
    printer_types: ['FDM'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your print cooling fan looks good.',
        risk: 'none',
        whatThisMeans: 'The fan is clean and working. Each layer of your print is being cooled properly, which helps with overhangs (angled parts) and sharp details.',
        recommendedAction: 'No action needed. Clean dust off the blades monthly.',
      },
      warn: {
        headline: 'Your print cooling fan has some dust.',
        risk: 'low',
        whatThisMeans: 'A dusty fan doesn\'t cool as efficiently. You might notice slightly worse quality on overhanging parts of your prints.',
        recommendedAction: 'Clean the fan using the "Clean Cooling Fans" guide.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'clean_fans_fdm',
      },
      fail: {
        headline: 'Your print cooling fan needs attention.',
        risk: 'medium',
        whatThisMeans: 'Without proper cooling, overhanging parts of your prints will droop and sag. Fine details will be blurry. Bridges (horizontal sections with nothing under them) will fail.',
        recommendedAction: 'Clean or replace the fan using the "Clean Cooling Fans" guide.',
        estimatedTime: '10–30 minutes',
        difficulty: 'moderate',
        guideKey: 'clean_fans_fdm',
      },
    },
  },

  {
    key: 'z_axis',
    title: 'The Vertical Threaded Rod',
    description:
      'Your printer has a tall threaded rod — like a very long bolt — that moves the print head or the bed up and down between layers. Look at this rod from top to bottom. It should look slightly shiny or have a thin coat of grease on it. Gently turn it by hand (with the printer off). It should feel smooth, not gritty.',
    cameraTarget:
      'Point your camera at the tall threaded rod — it runs vertically and has screw-like threads along its length. Capture as much of its length as possible so you can see the whole surface.',
    whatGoodLooksLike:
      'Rod has a slight sheen from lubrication. No gray or brown powder on the threads. Turns smoothly by hand.',
    whatBadLooksLike:
      'Rod looks completely dry. Gray or brown gritty powder packed into the threads. Reddish-brown rust spots. You feel a grinding sensation when turning it by hand.',
    printer_types: ['FDM'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your vertical threaded rod looks well lubricated.',
        risk: 'none',
        whatThisMeans: 'The rod is lubricated and will move the print head smoothly between layers. This gives you consistent layer heights and flat top surfaces.',
        recommendedAction: 'No action needed. Lubricate every 3 months.',
      },
      warn: {
        headline: 'Your vertical threaded rod looks dry.',
        risk: 'low',
        whatThisMeans: 'The lubrication is wearing off. Dry threads cause extra wear and can create a slight "banding" pattern — repeating horizontal lines — on the sides of your prints.',
        recommendedAction: 'Lubricate the rod using the "Lubricate Z-Axis Lead Screw" guide. It takes about 10 minutes.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'lubricate_z_fdm',
      },
      fail: {
        headline: 'Your vertical threaded rod needs lubrication now.',
        risk: 'medium',
        whatThisMeans: 'The rod is dry or has debris packed into the threads. This will cause inconsistent layer heights, loud grinding noises, and premature wear on the motor that drives the rod.',
        recommendedAction: 'Clean and lubricate the rod right away using the "Lubricate Z-Axis Lead Screw" guide.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'lubricate_z_fdm',
      },
    },
  },

  {
    key: 'wiring_cables',
    title: 'The Wires and Cables',
    description:
      'Your printer has bundles of wires that move with the print head every time it moves. Over time, these wires flex back and forth and the outer coating can wear through. This is a safety check. Power off the printer and unplug it from the wall first. Then trace all the visible wires and look for any damage to the outer coating.',
    cameraTarget:
      'Point your camera at the cable bundle that follows the print head. Move slowly along its length. Also check where the wires connect to the heated print bed.',
    whatGoodLooksLike:
      'All wires have smooth, unbroken outer coating (the colored rubber or plastic sleeve). All connectors (the plastic plugs) are fully seated with no metal visible outside the plug.',
    whatBadLooksLike:
      'You can see bare copper wire (shiny metal) through a worn spot. The coating looks melted, burned, or cracked. A connector is only halfway plugged in. Any wire looks pinched or trapped under a moving part.',
    printer_types: ['FDM'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your wiring looks safe.',
        risk: 'none',
        whatThisMeans: 'All cables appear intact and safely routed. No exposed copper or damaged insulation.',
        recommendedAction: 'No action needed. Check again every 6 months.',
      },
      warn: {
        headline: 'Your wiring shows some wear.',
        risk: 'medium',
        whatThisMeans: 'There are signs that cables are beginning to wear — minor kinks, slight discoloration, or a connector that\'s not fully seated. This is not an emergency, but worn wiring can fail suddenly.',
        recommendedAction: 'Reseat any loose connectors. Note the location of any kinks and check them again next month. Use the "Inspect Wiring and Cables" guide.',
        estimatedTime: '15 minutes',
        difficulty: 'easy',
        guideKey: 'check_wiring_fdm',
      },
      fail: {
        headline: 'Your wiring needs attention before you print again.',
        risk: 'high',
        whatThisMeans: 'Exposed copper wire or severely damaged insulation is a fire and electrical hazard. This is serious. The printer should not be used until the damaged wiring is repaired or replaced.',
        recommendedAction: 'Do not print. Contact your printer\'s manufacturer support or a qualified repair technician. If you are comfortable with electronics, the "Inspect Wiring and Cables" guide has more information.',
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
    title: 'The Clear Film in the Tank',
    description:
      'At the bottom of your resin tank there is a clear, flexible film — it works like a non-stick surface that separates the UV light from the resin. Hold the empty tank up to a light and look through it. It should look transparent and clear, like clean plastic wrap.',
    cameraTarget:
      'Hold the empty resin tank up to a bright light source and point your camera through the bottom, aiming at the clear film from below. You want to capture the film\'s transparency (or cloudiness).',
    whatGoodLooksLike:
      'Crystal clear film with no visible scratches. Light passes through evenly.',
    whatBadLooksLike:
      'Cloudy, frosted, or hazy patches anywhere on the film. Visible scratches that catch the light. Tiny holes or tears. Cured resin chunks stuck to the film.',
    printer_types: ['Resin'],
    includeInQuick: true,
    diagnosis: {
      pass: {
        headline: 'Your clear film looks good.',
        risk: 'none',
        whatThisMeans: 'The film is clear and undamaged. UV light can pass through it evenly, which is what cures your resin properly.',
        recommendedAction: 'No action needed. Clean gently with a plastic scraper and rubbing alcohol after each use.',
      },
      warn: {
        headline: 'Your clear film has some wear.',
        risk: 'low',
        whatThisMeans: 'Minor scratches or slight cloudiness are reducing how clearly UV light passes through the film. This can lead to slightly softer details in your prints.',
        recommendedAction: 'Clean the film carefully using the "Inspect and Clean FEP Film" guide. If cleaning doesn\'t restore clarity, plan to replace it soon.',
        estimatedTime: '15 minutes',
        difficulty: 'easy',
        guideKey: 'clean_fep_resin',
      },
      fail: {
        headline: 'Your clear film needs replacing.',
        risk: 'high',
        whatThisMeans: 'A cloudy, scratched, or torn film will cause print failures. UV light can\'t pass through damaged film evenly, so your resin won\'t cure correctly. Holes in the film will cause resin to leak onto the UV screen below, which can permanently damage your printer.',
        recommendedAction: 'Do not print until this film is replaced. Use the "Replace FEP Film" guide — it takes about 30 minutes and replacement film is inexpensive.',
        estimatedTime: '30 minutes',
        difficulty: 'moderate',
        guideKey: 'replace_fep_resin',
      },
    },
  },

  {
    key: 'build_plate',
    title: 'The Metal Print Plate',
    description:
      'The metal plate that your resin prints stick to as they are pulled up out of the tank. Look at its surface — it should have a consistent, slightly rough texture that helps prints bond to it.',
    cameraTarget:
      'Point your camera directly at the flat metal plate surface from about 15 cm (6 inches) away. Angle it slightly so any surface texture is visible.',
    whatGoodLooksLike:
      'Consistent matte or satin surface texture. Clean with no large chunks of resin stuck to it.',
    whatBadLooksLike:
      'Large chunks of cured resin stuck to the surface. Deep gouges or scratches from a metal scraper. The surface coating is peeling or flaking off.',
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
        whatThisMeans: 'Resin residue on the plate can affect how well your next print sticks. The first layer may not attach properly.',
        recommendedAction: 'Clean the plate using the "Clean the Build Plate" guide before your next print.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'clean_build_plate_resin',
      },
      fail: {
        headline: 'Your metal print plate has damage.',
        risk: 'medium',
        whatThisMeans: 'Deep gouges or a damaged surface coating means prints may not adhere reliably, or may stick too well and be difficult to remove.',
        recommendedAction: 'A plate with deep gouges or peeling coating should be replaced. Check your printer manufacturer\'s website for replacement plates.',
        estimatedTime: '5 minutes to replace',
        difficulty: 'easy',
      },
    },
  },

  {
    key: 'resin_vat',
    title: 'The Resin Tank',
    description:
      'Look inside the empty resin tank (after you\'ve poured the resin out). You\'re checking the clear film at the bottom for any solid chunks of cured (hardened) resin sitting on it. Even a tiny cured chunk can cause your print to fail.',
    cameraTarget:
      'Point your camera straight down into the empty resin tank from above. You want to see the clear film at the bottom clearly.',
    whatGoodLooksLike:
      'Empty tank with a clear, clean film visible at the bottom. No solid pieces anywhere.',
    whatBadLooksLike:
      'Any solid chunks — even tiny pea-sized ones — sitting on the clear film. Cloudy or discoloured resin residue that doesn\'t wipe off.',
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
        whatThisMeans: 'Small amounts of resin residue may be present. This usually happens after a print that didn\'t fully cure or after a partial print failure.',
        recommendedAction: 'Use the "Filter the Resin Vat" guide to strain the resin and clean the tank before your next print.',
        estimatedTime: '20 minutes',
        difficulty: 'easy',
        guideKey: 'filter_resin_vat',
      },
      fail: {
        headline: 'Your resin tank has cured chunks inside.',
        risk: 'high',
        whatThisMeans: 'Solid pieces of hardened resin in the tank will block UV light and prevent your next print from forming correctly. They can also scratch or puncture the clear film at the bottom.',
        recommendedAction: 'Remove all cured pieces using a PLASTIC scraper (never metal) before printing. Then filter the resin. Use the "Filter the Resin Vat" guide.',
        estimatedTime: '20 minutes',
        difficulty: 'easy',
        guideKey: 'filter_resin_vat',
      },
    },
  },

  {
    key: 'z_rail_resin',
    title: 'The Vertical Sliding Rail',
    description:
      'Your resin printer moves the metal print plate up and down on a single vertical rail (a smooth or slightly textured metal rod). Push the plate gently up and down by hand (with the printer off). It should glide smoothly with very little resistance.',
    cameraTarget:
      'Point your camera at the vertical rail that the print plate slides along. Capture the rail surface from top to bottom.',
    whatGoodLooksLike:
      'Rail has a thin coat of grease. Plate slides up and down smoothly with no wobble.',
    whatBadLooksLike:
      'Rail looks completely dry. You feel grinding or sticking when sliding the plate by hand. The plate wobbles side-to-side.',
    printer_types: ['Resin'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your sliding rail is well lubricated.',
        risk: 'none',
        whatThisMeans: 'The rail allows the print plate to move consistently between layers, giving you accurate layer heights.',
        recommendedAction: 'No action needed. Lubricate every 3 months.',
      },
      warn: {
        headline: 'Your sliding rail looks a bit dry.',
        risk: 'low',
        whatThisMeans: 'Reduced lubrication will cause extra wear and may lead to slightly inconsistent layer heights over time.',
        recommendedAction: 'Apply a small amount of PTFE grease (a type of white grease safe for plastic and metal) using the "Lubricate Z-Axis Rail" guide.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'lubricate_z_resin',
      },
      fail: {
        headline: 'Your sliding rail needs lubrication.',
        risk: 'medium',
        whatThisMeans: 'Severe dryness or wobble will cause layer shifting — where each layer is slightly misaligned from the one below it, making your prints look stepped or twisted.',
        recommendedAction: 'Lubricate the rail using the guide, then check if the wobble is reduced. If the plate still wobbles after lubrication, contact your printer\'s support team.',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
        guideKey: 'lubricate_z_resin',
      },
    },
  },

  {
    key: 'uv_screen',
    title: 'The Screen Under the Tank',
    description:
      'Under the resin tank there is an LCD screen that shines UV light (ultraviolet — invisible to your eye but it hardens the resin). Remove the tank and look at the screen carefully. It should look uniformly dark with no cracks or bright patches.',
    cameraTarget:
      'With the resin tank removed, point your camera straight down at the screen surface beneath. Keep your face away from the screen — this prevents potential UV exposure.',
    whatGoodLooksLike:
      'Uniformly dark surface when off. No visible cracks. No bright or lit spots when the printer is off.',
    whatBadLooksLike:
      'Visible cracks across the screen surface. Greenish or yellowish tint on part of the screen. Spots that look brighter than the rest when the printer is in use.',
    printer_types: ['Resin'],
    includeInQuick: false,
    diagnosis: {
      pass: {
        headline: 'Your UV screen looks undamaged.',
        risk: 'none',
        whatThisMeans: 'The screen is curing resin evenly across its surface. You should get consistent results across the full print area.',
        recommendedAction: 'No action needed. Keep resin off the screen by maintaining the clear film above it.',
      },
      warn: {
        headline: 'Your UV screen has some discoloration.',
        risk: 'low',
        whatThisMeans: 'Slight yellowing or uneven appearance can indicate early screen degradation. LCD screens do wear out over time and print power gradually decreases as they age.',
        recommendedAction: 'Run a UV exposure test (most resin printers have this built in) to check if exposure times need adjusting. Monitor print quality closely.',
        estimatedTime: '5 minutes',
        difficulty: 'easy',
      },
      fail: {
        headline: 'Your UV screen has visible damage.',
        risk: 'high',
        whatThisMeans: 'A cracked or heavily degraded screen will produce failed prints with missing sections, weak layers, or uneven curing. The screen needs replacing — this is a common service item for resin printers.',
        recommendedAction: 'Search for "[your printer model] LCD screen replacement" to find a compatible screen. This is a moderate repair. Contact your printer manufacturer for guidance.',
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
