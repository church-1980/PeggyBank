// Visual Content Registry — content specifications for every image in the app.
//
// PURPOSE:
//   - Drives the AssetImage placeholder label (replaces "Photo coming soon"
//     with a description of what the image will actually show)
//   - Serves as a content brief for photographers and illustrators
//   - Tracks priority order so Tier 1 content ships first
//
// TEACHING PHILOSOPHY:
//   Every image must pass the Grandparent Test.
//   A person who has never touched a 3D printer should look at the image and
//   immediately understand what they are seeing. Visual clarity over technical
//   accuracy when there is a conflict. Teach, do not impress.
//
// PRINTER: Bambu Lab X1 Carbon (prioritised). Anatomy images must match the
// X1C's physical appearance exactly — wrong printer confuses beginners.
//
// IMAGE TYPES:
//   reference   — plain, well-lit photo of the part in its normal state
//   highlighted — reference photo with an overlay circle/arrow identifying the part
//   good        — part in healthy, clean, working condition; reassures the user
//   bad         — part showing the most common maintenance-needed condition
//   lesson      — concept illustration or real-world scene for a lesson card

export type ImagePriority = 1 | 2 | 3 | 4;
export type ImageType = 'reference' | 'highlighted' | 'good' | 'bad' | 'lesson';

export interface ImageSpec {
  type:             ImageType;
  priority:         ImagePriority;
  printerModel:     string;
  placeholderLabel: string;   // shown in the app UI while the real image is pending
  subject:          string;   // what to photograph / illustrate
  framing:          string;   // camera distance, angle, and orientation
  lighting:         string;   // lighting setup
  teachingGoal:     string;   // what a beginner learns from seeing this image
  overlayNotes?:    string;   // highlighted images: where to draw circle/arrow and in what colour
}

export const IMAGE_REGISTRY: Record<string, ImageSpec> = {

  // ════════════════════════════════════════════════════════════════════════════
  // TIER 1 — Highest beginner impact. Shoot these first.
  // ════════════════════════════════════════════════════════════════════════════

  // ── Nozzle ──────────────────────────────────────────────────────────────────
  // The part beginners ask about most. Must be unmistakably clear.

  'anatomy_nozzle_reference': {
    type:         'reference',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Nozzle — bottom of the print head',
    subject:      'The full hotend assembly viewed from the front-right with the X1C door open. Nozzle tip visible at the very bottom. Silicone sock in place.',
    framing:      'Portrait. Camera 10–12 cm from the nozzle tip. Angle slightly upward so the tip faces camera. Fill at least 60% of frame with the hotend assembly.',
    lighting:     'Soft natural light or a ring light aimed through the open door. Avoid harsh side shadows that hide the nozzle shape.',
    teachingGoal: 'Beginner sees the full hotend and can immediately identify the metal tip at the bottom — the nozzle.',
  },

  'anatomy_nozzle_highlighted': {
    type:         'highlighted',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Nozzle — highlighted with a red circle',
    subject:      'Same shot as anatomy_nozzle_reference with post-processing overlay.',
    framing:      'Same as reference.',
    lighting:     'Same as reference.',
    teachingGoal: 'Beginner can point to the exact nozzle tip with no ambiguity.',
    overlayNotes: 'Red circle, 25–30 px radius at 1080p, centred on the brass nozzle tip at the bottom of the assembly. Circle should include the full nozzle body but not the hotend block above it. Add a short red arrow from outside the circle pointing inward. Label "Nozzle" in white on a semi-transparent red pill badge, placed to the right of the circle.',
  },

  'anatomy_nozzle_good': {
    type:         'good',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Healthy nozzle — clean and ready to print',
    subject:      'Extreme close-up of a clean nozzle tip. Brass or hardened steel, uniform colour, no residue or buildup.',
    framing:      'Portrait macro. Camera 4–6 cm from the tip. Tip fills 80% of the frame. Background blurred.',
    lighting:     'Bright, even, diffused light. No glare on the metal. Illuminate from two sides to show the shape clearly.',
    teachingGoal: 'Beginner recognises what "clean and healthy" looks like before they ever touch the printer.',
  },

  'anatomy_nozzle_bad': {
    type:         'bad',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Dirty nozzle — needs cleaning',
    subject:      'Close-up of a nozzle tip with carbonised dark-brown or black filament residue built up around the outside. Typical result of 50–100 print hours without cleaning.',
    framing:      'Same macro framing as anatomy_nozzle_good for easy visual comparison.',
    lighting:     'Same as good example so the contrast between clean and dirty is the only difference visible.',
    teachingGoal: 'Beginner immediately recognises this as a problem without needing to read any text.',
  },

  // ── Build Plate ─────────────────────────────────────────────────────────────
  // Most beginners interact with this every single print.

  'anatomy_build_plate_reference': {
    type:         'reference',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Build plate — the printing surface',
    subject:      'X1C build plate sitting on the heated bed inside the printer, viewed from slightly above and in front. Textured PEI surface visible. Full plate in frame.',
    framing:      'Landscape. Camera 30–35 cm directly above and tilted 30° down. Plate fills the frame edge to edge.',
    lighting:     'Even overhead light. The textured surface should be visible — not washed out by direct flash.',
    teachingGoal: 'Beginner sees the full surface they will be removing finished prints from.',
  },

  'anatomy_build_plate_highlighted': {
    type:         'highlighted',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Build plate — highlighted green',
    subject:      'Same as reference with overlay.',
    framing:      'Same as reference.',
    lighting:     'Same as reference.',
    teachingGoal: 'Beginner knows exactly what surface they are looking at.',
    overlayNotes: 'Green semi-transparent fill over the entire plate surface (opacity ~20%). Green border outline around the plate edge. Label "Build Plate" in white on a green pill badge at the top-centre of the plate.',
  },

  'anatomy_build_plate_good': {
    type:         'good',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Clean build plate — ready to print',
    subject:      'Build plate surface freshly cleaned with isopropyl alcohol. Matte, uniform texture visible. No fingerprints, grease marks, or residue.',
    framing:      'Macro. Camera 15 cm above the plate surface. Shoot at a shallow angle (10°–15° off horizontal) so the texture is visible in raking light.',
    lighting:     'Raking side light to reveal the texture and show cleanliness. A torch or adjustable desk lamp works well.',
    teachingGoal: 'Beginner sees what "clean and ready" looks like so they can match it before printing.',
  },

  'anatomy_build_plate_bad': {
    type:         'bad',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Dirty build plate — fingerprints and residue',
    subject:      'Build plate surface with clearly visible fingerprint smudges, grease marks, and filament residue. The kind that causes first-layer adhesion problems.',
    framing:      'Same raking-light macro as the good example for direct comparison.',
    lighting:     'Same raking side light as good example.',
    teachingGoal: 'Beginner immediately understands why their prints are not sticking — they can see the contamination.',
  },

  // ── Wiper ───────────────────────────────────────────────────────────────────

  'anatomy_wiper_reference': {
    type:         'reference',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Wiper pad — front-left corner of the printer',
    subject:      'The rubber wiper assembly in the front-left corner of the X1C\'s print area. Dark rubber pad mounted on a small bracket. Viewed from the front with the door open.',
    framing:      'Portrait. Camera 20–25 cm from the wiper. Wiper and its bracket visible. Include a small amount of the surrounding frame for context.',
    lighting:     'Even front lighting. The wiper is dark rubber — use brighter light to show its shape clearly.',
    teachingGoal: 'Beginner can locate the wiper before ever opening the printer.',
  },

  'anatomy_wiper_highlighted': {
    type:         'highlighted',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Wiper pad — highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same as reference.',
    lighting:     'Same as reference.',
    teachingGoal: 'Beginner cannot mistake any other part for the wiper.',
    overlayNotes: 'Red circle around the rubber wiper pad (not the bracket). Arrow pointing from outside the frame toward the wiper. Label "Wiper" in white on a red pill badge above the arrow.',
  },

  'anatomy_wiper_good': {
    type:         'good',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Healthy wiper — lightly oiled, no buildup',
    subject:      'Close-up of a wiper pad that has been used but is in good condition. Slightly glossy from nozzle oil transfers. Rubber still has its original rectangular shape. No carbonised buildup.',
    framing:      'Macro. Camera 8–10 cm from the wiper surface.',
    lighting:     'Side lighting to show the rubber texture and any light oil sheen.',
    teachingGoal: 'Beginner understands that a slightly oily wiper is normal and healthy.',
  },

  'anatomy_wiper_bad': {
    type:         'bad',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Clogged wiper — carbonised filament buildup',
    subject:      'Wiper pad with a thick crust of dark carbonised filament residue built up in the centre. The rubber shape is deformed. This is what 200+ print hours of buildup looks like.',
    framing:      'Same macro framing as good example.',
    lighting:     'Same as good example for direct comparison.',
    teachingGoal: 'Beginner immediately recognises this as something that needs to be cleaned.',
  },

  // ── AMS ─────────────────────────────────────────────────────────────────────

  'anatomy_ams_reference': {
    type:         'reference',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'AMS unit — the four-filament feeder on top of the printer',
    subject:      'The AMS (Automatic Material System) unit sitting on top of the X1C. All four spool slots visible from the front at a slight angle. Filaments loaded or empty slots — either works.',
    framing:      'Landscape. Camera 45–50 cm from the AMS, slightly above eye level looking down at about 15°. The full front face of the AMS fills the frame.',
    lighting:     'Even, bright light from the front. The AMS has a translucent cover — avoid backlighting that makes it glow.',
    teachingGoal: 'Beginner understands that the box on top of the printer is the AMS and it holds the plastic spools.',
  },

  'anatomy_ams_highlighted': {
    type:         'highlighted',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'AMS unit — highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same as reference.',
    lighting:     'Same as reference.',
    teachingGoal: 'Beginner cannot confuse the AMS with the main printer body.',
    overlayNotes: 'Blue semi-transparent fill over the entire AMS unit (opacity ~15%). Solid blue border outline. Label "AMS" in white on a blue pill badge centred on the unit. Add four small yellow arrows, one per spool slot, pointing inward with the label "Filament Slots".',
  },

  'anatomy_ams_good': {
    type:         'good',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Healthy AMS — filaments loaded and feeding cleanly',
    subject:      'AMS with four filament spools loaded. All hub connectors seated. No tangled filament visible. Tubes running cleanly from AMS to the printer.',
    framing:      'Same as reference.',
    lighting:     'Same as reference.',
    teachingGoal: 'Beginner sees what a correctly loaded, healthy AMS looks like.',
  },

  'anatomy_ams_bad': {
    type:         'bad',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'AMS problem — tangled filament or disconnected tube',
    subject:      'AMS showing a tangled filament loop or a PTFE tube that has pulled out of its connector. These are the two most common AMS problems beginners encounter.',
    framing:      'Close-up on the problem area. If tangled: show the spool slot with visible tangle. If disconnected tube: show the hub area with the tube hanging loose.',
    lighting:     'Bright, even.',
    teachingGoal: 'Beginner recognises the two most common AMS failure states before they happen to them.',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TIER 2 — Important maintenance parts. Shoot after Tier 1 is complete.
  // ════════════════════════════════════════════════════════════════════════════

  // ── Extruder ─────────────────────────────────────────────────────────────────

  'anatomy_extruder_reference': {
    type:         'reference',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Extruder — the motor that pushes filament',
    subject:      'Left-side view of the X1C print head showing the extruder motor and drive gear assembly. The door should be open.',
    framing:      'Portrait. Camera 15–18 cm from the extruder. Show the gear and the point where filament enters.',
    lighting:     'Side lighting from the right to illuminate the gear teeth.',
    teachingGoal: 'Beginner can identify the mechanism that grips and pushes the filament.',
  },

  'anatomy_extruder_highlighted': {
    type:         'highlighted',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Extruder — highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same as reference.',
    lighting:     'Same as reference.',
    teachingGoal: 'Beginner can point to the extruder without hesitation.',
    overlayNotes: 'Orange circle centred on the drive gear teeth. Label "Extruder" in white on an orange pill badge. Arrow pointing to the filament entry point with label "Filament enters here".',
  },

  'anatomy_extruder_good': {
    type:         'good',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Healthy extruder — clean drive gears',
    subject:      'Close-up of clean extruder drive gears with no filament dust or residue. Gear teeth clearly defined.',
    framing:      'Macro, 6–8 cm from the gears.',
    lighting:     'Raking light from the side to show gear tooth definition.',
    teachingGoal: 'Beginner sees what the gears look like when they are working correctly.',
  },

  'anatomy_extruder_bad': {
    type:         'bad',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Dirty extruder — filament dust in gears',
    subject:      'Extruder drive gears packed with grey or brown filament dust. This is the classic symptom of grinding or slipping extruder.',
    framing:      'Same macro framing as good example.',
    lighting:     'Same raking light.',
    teachingGoal: 'Beginner connects the clicking sound they hear with the visual of dusty gears.',
  },

  // ── PTFE Tube ────────────────────────────────────────────────────────────────

  'anatomy_ptfe_tube_reference': {
    type:         'reference',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'PTFE tube — the white plastic tube inside the print head',
    subject:      'The white PTFE liner at the top entry point of the X1C hotend, where the filament feeds in from above. Visible when the door is open and viewed from slightly above.',
    framing:      'Portrait. Camera 12–15 cm. Show the tube entry point and 5–8 cm of tube visible.',
    lighting:     'Even overhead or front light. The tube is white — avoid overexposure.',
    teachingGoal: 'Beginner identifies the white tube as the filament guide into the hotend.',
  },

  'anatomy_ptfe_tube_highlighted': {
    type:         'highlighted',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'PTFE tube — highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same as reference.',
    lighting:     'Same as reference.',
    teachingGoal: 'Beginner can find the PTFE tube without confusion.',
    overlayNotes: 'Blue arrow along the length of the tube pointing downward. Label "PTFE Tube (white plastic tube)" in white on a blue pill badge beside the arrow.',
  },

  'anatomy_ptfe_tube_good': {
    type:         'good',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Healthy PTFE tube — clear white, no discolouration',
    subject:      'PTFE tube that is clear or pure white. Translucent walls showing clean interior. No yellowing, cracking, or brittleness.',
    framing:      'Macro side view, 6–8 cm, showing the tube clearly.',
    lighting:     'Backlight slightly to show the tube\'s translucency and clean interior.',
    teachingGoal: 'Beginner knows what a healthy PTFE tube looks like.',
  },

  'anatomy_ptfe_tube_bad': {
    type:         'bad',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Damaged PTFE tube — yellowed from heat',
    subject:      'PTFE tube that has yellowed or browned from prolonged high-temperature printing. The discolouration is visible along the section closest to the hotend.',
    framing:      'Same framing as good example, showing the colour difference clearly.',
    lighting:     'Same backlighting for comparison.',
    teachingGoal: 'Beginner can visually identify a heat-damaged tube that needs replacement.',
  },

  // ── Lead Screws ──────────────────────────────────────────────────────────────

  'anatomy_lead_screws_reference': {
    type:         'reference',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Lead screws — the tall threaded rods on each side',
    subject:      'Both lead screws (left and right) visible inside the X1C with the door open. Show a good length of both screws from top to bottom.',
    framing:      'Landscape wide shot from the front. Camera 40–50 cm back. Both screws in frame simultaneously.',
    lighting:     'Even ambient light inside the printer. A torch aimed from the side helps the threads catch light.',
    teachingGoal: 'Beginner sees both lead screws and understands they run the full height of the printer.',
  },

  'anatomy_lead_screws_highlighted': {
    type:         'highlighted',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Lead screws — both rods highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same as reference.',
    lighting:     'Same as reference.',
    teachingGoal: 'Beginner cannot confuse the lead screws with any other vertical rods.',
    overlayNotes: 'Two yellow vertical highlight bands, one over each lead screw, full height. Semi-transparent yellow fill. Label "Lead Screw (Left)" and "Lead Screw (Right)" in white on yellow pill badges at the top of each screw.',
  },

  'anatomy_lead_screws_good': {
    type:         'good',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Healthy lead screws — evenly lubricated',
    subject:      'Close-up of a lead screw thread in good condition. Light, even coating of lubricant in the threads. Shiny, not gunky. No debris.',
    framing:      'Macro, 8–10 cm from the thread. Show 10–15 cm of screw length.',
    lighting:     'Raking side light to show the thread depth and lubricant sheen.',
    teachingGoal: 'Beginner knows what properly lubricated lead screws look like.',
  },

  'anatomy_lead_screws_bad': {
    type:         'bad',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Dry lead screws — debris in threads',
    subject:      'Lead screw thread that is dry, with visible grey or white debris (old dried lubricant, dust, or filament particles) packed into the threads.',
    framing:      'Same macro framing as good example.',
    lighting:     'Same raking light.',
    teachingGoal: 'Beginner recognises when lead screws need cleaning and lubrication.',
  },

  // ── Carbon Rods ──────────────────────────────────────────────────────────────

  'anatomy_carbon_rods_reference': {
    type:         'reference',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Carbon rods — the black rods the print head slides on',
    subject:      'The two black carbon fibre rods (X-axis linear rails) that the print head slides along. View from the front with door open. Both rods visible with the print head resting on them.',
    framing:      'Landscape. Camera 25–30 cm from the rods. Show full rod length left to right with the print head in the centre.',
    lighting:     'Even front light. Carbon rods are very dark — bright light is needed to show them clearly.',
    teachingGoal: 'Beginner sees the two smooth rods and understands the print head glides on them.',
  },

  'anatomy_carbon_rods_highlighted': {
    type:         'highlighted',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Carbon rods — both rods highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same as reference.',
    lighting:     'Same as reference.',
    teachingGoal: 'Beginner can identify both rods without confusing them with wiring or tubes.',
    overlayNotes: 'Two blue horizontal highlight bands, one over each carbon rod, spanning the full width. Label "Carbon Rod (Front)" and "Carbon Rod (Rear)" in white on blue pill badges at the right end of each rod.',
  },

  'anatomy_carbon_rods_good': {
    type:         'good',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Healthy carbon rods — clean and smooth',
    subject:      'Carbon rod surface that is clean, slightly lustrous. A very thin film of lubricant is visible as a subtle sheen. No white residue, rust, or debris.',
    framing:      'Macro, 6–8 cm from rod surface. Show 15–20 cm of rod.',
    lighting:     'Bright, slightly angled to catch the surface sheen.',
    teachingGoal: 'Beginner knows what a correctly maintained carbon rod looks like.',
  },

  'anatomy_carbon_rods_bad': {
    type:         'bad',
    priority:     2,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Dirty carbon rods — residue buildup',
    subject:      'Carbon rod with visible white or grey residue buildup — old dried lubricant or filament dust collected along the rod surface.',
    framing:      'Same macro framing as good example.',
    lighting:     'Same lighting.',
    teachingGoal: 'Beginner can identify when the rods need cleaning.',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TIER 3 — Sensors and precision components. Shoot after Tier 2.
  // ════════════════════════════════════════════════════════════════════════════

  // ── Filament Cutter ──────────────────────────────────────────────────────────

  'anatomy_cutter_reference': {
    type:         'reference',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Filament cutter — the small blade on the print head',
    subject:      'The filament cutter blade assembly on the right side of the X1C print head. Small blade mechanism visible from the right side with door open.',
    framing:      'Portrait. Camera 10–12 cm from the blade. Blade and its housing fill most of the frame.',
    lighting:     'Bright side light from the right. Small blade — needs good illumination to be seen clearly.',
    teachingGoal: 'Beginner identifies the cutter blade so they know where the cutting happens during filament changes.',
  },

  'anatomy_cutter_highlighted': {
    type:         'highlighted',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Filament cutter — highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same as reference.',
    lighting:     'Same as reference.',
    teachingGoal: 'Beginner knows exactly where the blade is.',
    overlayNotes: 'Red circle around the blade edge. Label "Cutter Blade" in white on a red pill badge. Small warning triangle below: "Sharp".',
  },

  'anatomy_cutter_good': {
    type:         'good',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Healthy cutter — clean blade edge',
    subject:      'Cutter blade that is clean with a straight, sharp edge. No filament stringing or residue stuck to the blade.',
    framing:      'Macro, 5–6 cm from blade.',
    lighting:     'Bright, angled to show the blade edge.',
    teachingGoal: 'Beginner knows what a clean, functional cutter blade looks like.',
  },

  'anatomy_cutter_bad': {
    type:         'bad',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Dirty cutter — filament stuck to blade',
    subject:      'Cutter blade with stringy filament residue stuck to it or a visibly dulled edge.',
    framing:      'Same macro framing.',
    lighting:     'Same.',
    teachingGoal: 'Beginner can recognise when the cutter is causing mis-cuts during filament changes.',
  },

  // ── LiDAR Sensor ────────────────────────────────────────────────────────────

  'anatomy_lidar_reference': {
    type:         'reference',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'LiDAR sensor — the laser scanner on the print head',
    subject:      'The LiDAR sensor module on the left side of the X1C print head, viewed from the left with the door open. The small scanning window is the key detail.',
    framing:      'Portrait. Camera 12–15 cm from the sensor. Sensor unit fills the frame with context visible.',
    lighting:     'Even, diffused. No reflections on the sensor window.',
    teachingGoal: 'Beginner identifies the sensor and understands it scans the print surface automatically.',
  },

  'anatomy_lidar_highlighted': {
    type:         'highlighted',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'LiDAR sensor — highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same.',
    lighting:     'Same.',
    teachingGoal: 'Beginner knows precisely which component is the LiDAR.',
    overlayNotes: 'Blue circle around the scanning window (NOT the whole sensor housing). Label "LiDAR Scanner" on a blue badge. Secondary label with small warning icon: "Do not scratch this window".',
  },

  'anatomy_lidar_good': {
    type:         'good',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Clean LiDAR window — no residue',
    subject:      'Close-up of a clean LiDAR scanning window. Clear, no smudges, no residue. You can see through it cleanly.',
    framing:      'Macro, 5–6 cm.',
    lighting:     'Diffused — no reflections.',
    teachingGoal: 'Beginner knows what a clean, functional LiDAR window looks like.',
  },

  'anatomy_lidar_bad': {
    type:         'bad',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Dirty LiDAR window — hazy with residue',
    subject:      'LiDAR scanning window covered in a hazy milky film of plastic vapour residue. This is what the window looks like after many hours of enclosed printing without cleaning.',
    framing:      'Same macro framing.',
    lighting:     'Same diffused light.',
    teachingGoal: 'Beginner immediately understands why first-layer calibration errors happen.',
  },

  // ── Printer Camera ───────────────────────────────────────────────────────────

  'anatomy_camera_reference': {
    type:         'reference',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Printer camera — the small lens on the front frame',
    subject:      'The wide-angle camera lens recessed into the front frame of the X1C. Viewed from the front at camera level.',
    framing:      'Portrait. Camera 20–25 cm from the lens. Lens visible in the centre with surrounding frame context.',
    lighting:     'Even ambient. Avoid reflections on the lens.',
    teachingGoal: 'Beginner identifies the built-in camera so they understand remote monitoring.',
  },

  'anatomy_camera_highlighted': {
    type:         'highlighted',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Printer camera — highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same.',
    lighting:     'Same.',
    teachingGoal: 'No ambiguity about which lens is the printer camera.',
    overlayNotes: 'Blue circle around the lens. Label "Printer Camera" in white on a blue badge.',
  },

  'anatomy_camera_good': {
    type:         'good',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Clean camera lens — clear and unsmudged',
    subject:      'Camera lens that is clean and clear. No smudges, fingerprints, or residue on the glass.',
    framing:      'Macro, 5 cm.',
    lighting:     'Angled, no direct reflection.',
    teachingGoal: 'Beginner knows what a clean camera looks like.',
  },

  'anatomy_camera_bad': {
    type:         'bad',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Dirty camera lens — fingerprint smudge',
    subject:      'Camera lens with a visible fingerprint smudge in the centre causing blurry edges.',
    framing:      'Same macro framing.',
    lighting:     'Same.',
    teachingGoal: 'Beginner understands why their remote monitoring image looks blurry.',
  },

  // ── Part Cooling Fans ────────────────────────────────────────────────────────

  'anatomy_cooling_fans_reference': {
    type:         'reference',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Cooling fans — fan vents on the print head',
    subject:      'Front-facing view of the X1C print head showing the part cooling fan outlet vents. The grilled openings are the key detail.',
    framing:      'Portrait. Camera 15–18 cm. Fan grills fill 50% of the frame.',
    lighting:     'Even front light. The grill openings should be clearly visible.',
    teachingGoal: 'Beginner identifies the cooling fan vents and understands they blow cool air on prints.',
  },

  'anatomy_cooling_fans_highlighted': {
    type:         'highlighted',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Cooling fans — highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same.',
    lighting:     'Same.',
    teachingGoal: 'Beginner can locate the cooling fan vents immediately.',
    overlayNotes: 'Blue arrows pointing inward toward each fan vent opening. Label "Part Cooling Fans" on a blue badge.',
  },

  'anatomy_cooling_fans_good': {
    type:         'good',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Clean cooling fans — no dust blockage',
    subject:      'Fan grill openings that are clear with no visible dust or filament blocking the vents.',
    framing:      'Macro, 6–8 cm.',
    lighting:     'Front light to see inside the grill openings.',
    teachingGoal: 'Beginner knows what open, unblocked vents look like.',
  },

  'anatomy_cooling_fans_bad': {
    type:         'bad',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Blocked cooling fans — dust clogging the vents',
    subject:      'Fan grill vents with visible lint or dust bunny accumulation blocking the openings.',
    framing:      'Same macro framing.',
    lighting:     'Same.',
    teachingGoal: 'Beginner recognises blocked vents and connects them with overheating issues.',
  },

  // ── Chamber Fan ──────────────────────────────────────────────────────────────

  'anatomy_chamber_fan_reference': {
    type:         'reference',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Chamber fan — air circulation fan in the enclosure',
    subject:      'The X1C chamber fan, visible at the rear or side of the enclosed print area. A circular fan grille.',
    framing:      'Portrait. Camera 25–30 cm. Full fan grille in frame.',
    lighting:     'Bright ambient. Fan is inside the enclosure — may need a torch.',
    teachingGoal: 'Beginner identifies the chamber fan and understands it circulates heated air.',
  },

  'anatomy_chamber_fan_highlighted': {
    type:         'highlighted',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Chamber fan — highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same.',
    lighting:     'Same.',
    teachingGoal: 'Beginner can identify the chamber fan.',
    overlayNotes: 'Blue circle around the full fan grille. Label "Chamber Fan" on a blue badge.',
  },

  'anatomy_chamber_fan_good': {
    type:         'good',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Clean chamber fan — blades visible and clear',
    subject:      'Fan grille with clean, visible blades. No dust accumulation.',
    framing:      'Macro, 10 cm.',
    lighting:     'Bright torch aimed through grille.',
    teachingGoal: 'Beginner sees what a clean fan looks like.',
  },

  'anatomy_chamber_fan_bad': {
    type:         'bad',
    priority:     3,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Dirty chamber fan — dust coating the blades',
    subject:      'Fan with grey dust coating on the blade edges and visible through the grille.',
    framing:      'Same macro framing.',
    lighting:     'Same.',
    teachingGoal: 'Beginner knows when to clean the chamber fan.',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TIER 4 — AMS internals, hotend assembly, full filament path.
  // ════════════════════════════════════════════════════════════════════════════

  // ── AMS Rollers ──────────────────────────────────────────────────────────────

  'anatomy_ams_rollers_reference': {
    type:         'reference',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'AMS rollers — rubber gripping wheels inside the AMS',
    subject:      'Inside one AMS spool slot with the cover open. The rubber pinch rollers visible at the base of the slot where filament is gripped and driven.',
    framing:      'Portrait macro. Camera 8–10 cm from the rollers.',
    lighting:     'Bright torch aimed directly at the rollers — the inside of the AMS is dark.',
    teachingGoal: 'Beginner sees the rubber wheels that grip and push their filament.',
  },

  'anatomy_ams_rollers_highlighted': {
    type:         'highlighted',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'AMS rollers — highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same.',
    lighting:     'Same.',
    teachingGoal: 'Beginner cannot confuse the rollers with the spool axle.',
    overlayNotes: 'Orange circles around each drive roller. Label "Drive Rollers" on an orange badge.',
  },

  'anatomy_ams_rollers_good': {
    type:         'good',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Healthy AMS rollers — clean rubber surface',
    subject:      'AMS drive rollers with clean, grippy rubber surface. No coloured residue or dust.',
    framing:      'Macro, 5–6 cm.',
    lighting:     'Bright torch.',
    teachingGoal: 'Beginner knows what clean, functional rollers look like.',
  },

  'anatomy_ams_rollers_bad': {
    type:         'bad',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Dirty AMS rollers — filament residue on rubber',
    subject:      'AMS rollers with coloured filament residue ground into the rubber surface — a mix of colours if multi-colour printing was done.',
    framing:      'Same macro framing.',
    lighting:     'Same.',
    teachingGoal: 'Beginner recognises contaminated rollers as the cause of filament slipping.',
  },

  // ── AMS PTFE Tubes ────────────────────────────────────────────────────────────

  'anatomy_ams_ptfe_reference': {
    type:         'reference',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'AMS PTFE tubes — four white tubes from AMS to hub',
    subject:      'The four white PTFE tubes running from the AMS hub connectors along the cable chain toward the printer. All four tubes visible.',
    framing:      'Landscape. Camera 35–40 cm back. All four tubes visible from their AMS exit point.',
    lighting:     'Even ambient.',
    teachingGoal: 'Beginner understands that each filament travels through its own dedicated tube.',
  },

  'anatomy_ams_ptfe_highlighted': {
    type:         'highlighted',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'AMS PTFE tubes — highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same.',
    lighting:     'Same.',
    teachingGoal: 'Each tube clearly identified.',
    overlayNotes: 'Number each tube 1–4 with a small white badge on a coloured dot (match the AMS slot colours if possible). Label group "PTFE Tubes" on a blue badge.',
  },

  'anatomy_ams_ptfe_good': {
    type:         'good',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Healthy AMS tubes — clear and straight',
    subject:      'All four PTFE tubes running cleanly without kinks. Filament visible threading through one or more tubes.',
    framing:      'Same as reference.',
    lighting:     'Same.',
    teachingGoal: 'Beginner sees what properly routed, healthy tubes look like.',
  },

  'anatomy_ams_ptfe_bad': {
    type:         'bad',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Kinked AMS tube — bent tube causing jams',
    subject:      'One or more PTFE tubes with a visible tight kink or bend. This is the most common cause of AMS feed failures.',
    framing:      'Close-up on the kinked area.',
    lighting:     'Good even light.',
    teachingGoal: 'Beginner immediately recognises a kink as a problem.',
  },

  // ── Hotend ────────────────────────────────────────────────────────────────────

  'anatomy_hotend_reference': {
    type:         'reference',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Hotend — the heating block above the nozzle',
    subject:      'Full hotend assembly from the front with the silicone sock in place. Heat block, heatsink fins, and wiring visible. Nozzle visible at the bottom.',
    framing:      'Portrait. Camera 10–12 cm. Full assembly in frame.',
    lighting:     'Soft front light. Show the assembly depth.',
    teachingGoal: 'Beginner understands the hotend is the larger heating assembly the nozzle screws into.',
  },

  'anatomy_hotend_highlighted': {
    type:         'highlighted',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Hotend — heating block highlighted',
    subject:      'Same as reference with overlay.',
    framing:      'Same.',
    lighting:     'Same.',
    teachingGoal: 'Beginner can distinguish the hotend block from the nozzle below.',
    overlayNotes: 'Orange rectangle around the heat block (not the silicone sock, not the nozzle). Label "Hotend (heating block)" on an orange badge. Separate label "Nozzle" with arrow to nozzle tip below.',
  },

  'anatomy_hotend_good': {
    type:         'good',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Healthy hotend — silicone sock in place, no leaks',
    subject:      'Hotend with clean silicone sock in good condition. No plastic ooze around the nozzle joint. Wires intact.',
    framing:      'Macro, 8–10 cm.',
    lighting:     'Even, diffused.',
    teachingGoal: 'Beginner knows what a properly sealed hotend looks like.',
  },

  'anatomy_hotend_bad': {
    type:         'bad',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Leaking hotend — plastic ooze around the nozzle',
    subject:      'Hotend with visible plastic ooze around the nozzle-to-block joint, hardened into a rough crust. This is what a nozzle leak looks like.',
    framing:      'Same macro framing.',
    lighting:     'Same.',
    teachingGoal: 'Beginner immediately recognises a hotend leak as something serious.',
  },

  // ── Filament Path ────────────────────────────────────────────────────────────

  'anatomy_filament_path_reference': {
    type:         'reference',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Full filament path — AMS to nozzle',
    subject:      'Wide shot of the X1C showing the complete filament journey: from the AMS on top, through the PTFE tubes, along the cable chain, into the print head, and down to the nozzle. A single filament colour loaded for clarity.',
    framing:      'Landscape. Camera 60–70 cm back from the printer at a slight angle to show depth. The full printer visible in frame.',
    lighting:     'Bright ambient — every part of the path must be visible.',
    teachingGoal: 'Beginner understands the complete journey the filament takes from spool to nozzle.',
  },

  'anatomy_filament_path_highlighted': {
    type:         'highlighted',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Filament path — traced with arrows',
    subject:      'Same wide shot with the full path traced.',
    framing:      'Same.',
    lighting:     'Same.',
    teachingGoal: 'Beginner can trace the exact filament path from start to finish.',
    overlayNotes: 'Yellow dashed line following the filament path from AMS exit → PTFE tubes → cable chain → print head → nozzle. Animated arrow heads along the path (or static if animation not possible). Number waypoints 1–5 with labels: 1 "AMS", 2 "PTFE Tubes", 3 "Cable Chain", 4 "Extruder", 5 "Nozzle". Accent colour: amber/yellow.',
  },

  'anatomy_filament_path_good': {
    type:         'good',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Clean filament path — no kinks or tangles',
    subject:      'Same wide shot with filament loaded cleanly through every section of the path. All tubes straight, no tangles, filament threading smoothly.',
    framing:      'Same.',
    lighting:     'Same.',
    teachingGoal: 'Beginner knows what a clean, correctly loaded filament path looks like.',
  },

  'anatomy_filament_path_bad': {
    type:         'bad',
    priority:     4,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Filament path problem — kinked tube or tangle',
    subject:      'Same wide shot but with a visible problem in the path — a kinked PTFE tube at the cable chain entry, or a tangle where the filament loops back on itself.',
    framing:      'Same wide shot, close-up inset on the problem area.',
    lighting:     'Same.',
    teachingGoal: 'Beginner can spot a filament path problem before it causes a failed print.',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // LESSONS — Concept images for "First Day" and "Safety First" lesson cards.
  // Shoot alongside Tier 1 parts.
  // ════════════════════════════════════════════════════════════════════════════

  'lesson_printer_working': {
    type:         'lesson',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Printer building an object layer by layer',
    subject:      'X1C mid-print with a partially completed object clearly visible on the build plate. A simple object like a cube or cylinder works best — the layers must be clearly visible.',
    framing:      'Landscape. Front door open or shoot through the glass. Camera 30–40 cm. Object and a section of print head in frame.',
    lighting:     'Chamber ambient plus a small amount of front fill to show the layers on the object clearly.',
    teachingGoal: 'Beginner immediately understands "layer by layer" by seeing it happening.',
  },

  'lesson_filament_spool': {
    type:         'lesson',
    priority:     1,
    printerModel: 'Generic',
    placeholderLabel: 'A spool of PLA filament',
    subject:      'A single PLA filament spool in a bright colour (orange or green for visibility) on a white or neutral background. The wound filament wire is clearly visible.',
    framing:      'Landscape. Camera 30–35 cm. Spool fills 70% of frame. Show the filament wire texture clearly.',
    lighting:     'Bright, even, white background preferred. Product-photography style.',
    teachingGoal: 'Beginner connects the word "filament" with the physical object they see at a shop or online.',
  },

  'lesson_three_things': {
    type:         'lesson',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'The three things a printer needs: power, filament, print file',
    subject:      'Three objects arranged together on a flat surface: a power cable, a filament spool, and a laptop or phone screen showing a 3D model. Clean, simple, white background.',
    framing:      'Landscape. Camera 40 cm directly overhead. All three objects in frame, evenly spaced.',
    lighting:     'Even overhead. No harsh shadows between objects.',
    teachingGoal: 'Beginner remembers the three requirements visually — it is a simple, memorable image.',
  },

  'lesson_failed_first_layer': {
    type:         'lesson',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Failed first layer — print did not stick',
    subject:      'A build plate with a failed first layer visible — either a "spaghetti" mess of tangled plastic, or a print with the edges peeling up off the plate. The failure must be immediately obvious.',
    framing:      'Landscape. Camera 25–30 cm above plate at 20° tilt. The failure fills the frame.',
    lighting:     'Raking side light to make the texture and failure detail visible.',
    teachingGoal: 'Beginner recognises "first layer not sticking" as something that happens to everyone — and learns they can fix it.',
  },

  'lesson_first_successful_print': {
    type:         'lesson',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'First successful print on the build plate',
    subject:      'A clean, completed print sitting on the build plate. A simple object — small cube, Benchy, or calibration shape. The print looks good and the achievement is visually satisfying.',
    framing:      'Landscape. Camera 25–30 cm. Print in centre of build plate, plate visible around it.',
    lighting:     'Good even light. The print should look appealing — this is a motivating image.',
    teachingGoal: 'Beginner feels the satisfaction of a completed print before they have done one — builds anticipation.',
  },

  'lesson_printer_safe': {
    type:         'lesson',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Printer running safely — calm normal operation',
    subject:      'X1C running a print in a clean, tidy workspace. The printer is closed. Everything is organised. A safe, calm scene. No clutter, cables tidy, no flammable materials nearby.',
    framing:      'Landscape wide shot showing the full printer and some workspace context. Camera 80–100 cm back.',
    lighting:     'Warm ambient. Room in background ideally blurred. Printer well-lit.',
    teachingGoal: 'Beginner sees that a running printer looks calm and normal — not scary. Sets the right tone for the safety lesson.',
  },

  'lesson_nozzle_hot': {
    type:         'lesson',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Nozzle at 200°C — dangerously hot',
    subject:      'Extreme close-up of a nozzle during a print with a small strand of melted filament hanging from the tip (proof it is at temperature). If possible, show heat shimmer. Alternatively, a graphic illustration showing the nozzle with a "200°C" callout and a flame icon is acceptable.',
    framing:      'Portrait macro. Camera 6–8 cm from tip. Tip fills 60% of frame.',
    lighting:     'Dark background preferred so any heat shimmer is visible.',
    teachingGoal: 'Beginner viscerally understands the danger. The image must be uncomfortable to look at — a nozzle that looks like it will burn.',
  },

  'lesson_print_head_moving': {
    type:         'lesson',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Print head moving fast during a print',
    subject:      'The print head in motion with motion blur visible — shot at 1/60s or slower shutter speed to capture blur. The speed must be obvious. Shoot through the glass door or with it open.',
    framing:      'Landscape. Camera 30–40 cm. Print head centre-frame, blur showing direction of movement.',
    lighting:     'Chamber ambient. No flash — flash will freeze the motion blur.',
    teachingGoal: 'Beginner understands "very fast" in a visceral way — the blur communicates danger better than text.',
  },

  'lesson_unplug': {
    type:         'lesson',
    priority:     1,
    printerModel: 'Bambu Lab X1 Carbon',
    placeholderLabel: 'Unplugging the power cable before maintenance',
    subject:      'A hand reaching to unplug the X1C power cable from the back of the printer. The cable and socket clearly visible. The action is clear and obvious.',
    framing:      'Landscape. Camera 30 cm, slightly elevated. Hand, cable, and printer back in frame.',
    lighting:     'Even, clear. The cable socket must be clearly visible.',
    teachingGoal: 'Beginner memorises "unplug first" as a physical action they can visualise.',
  },

  'lesson_open_window': {
    type:         'lesson',
    priority:     1,
    printerModel: 'Generic',
    placeholderLabel: 'Open window near a running printer',
    subject:      'A window open in a room where the printer is running. Natural light coming in. The window and the printer do not both need to be in frame — either a window from inside a printing room, or a printer near an open window.',
    framing:      'Landscape. Wide enough to show context.',
    lighting:     'Natural window light. The openness should feel fresh and airy.',
    teachingGoal: 'Beginner has a visual anchor for "open a window when printing" — a concrete action, not an abstract rule.',
  },

  'lesson_safety_complete': {
    type:         'lesson',
    priority:     1,
    printerModel: 'Generic',
    placeholderLabel: 'Confident printer owner — safety complete',
    subject:      'A person standing confidently beside their printer. They look calm and happy. The printer is in the background. The mood is: "I understand my printer. I am safe."',
    framing:      'Portrait or landscape. Person and printer both partially visible.',
    lighting:     'Warm, positive. This is a motivating closing image.',
    teachingGoal: 'Beginner finishes the safety lesson feeling capable and confident, not scared.',
  },

};

// ── Lookup helper ────────────────────────────────────────────────────────────

export function getImageSpec(imageKey: string): ImageSpec | undefined {
  return IMAGE_REGISTRY[imageKey];
}

export function getImagesByPriority(priority: ImagePriority): [string, ImageSpec][] {
  return Object.entries(IMAGE_REGISTRY).filter(([, spec]) => spec.priority === priority);
}
