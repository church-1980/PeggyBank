import { CheckpointDefinition } from '../types';

// Visual inspection checkpoints used in the InspectionScreen wizard.
// Each checkpoint shows what to look for and prompts for a photo.
//
// Beginner-friendly principle: descriptions use plain language and describe
// what a problem LOOKS like, not what it technically means.

export const FDM_CHECKPOINTS: CheckpointDefinition[] = [
  {
    key: 'nozzle_condition',
    title: 'Nozzle Condition',
    description:
      'Look at the tip of the nozzle. It should be mostly clean metal. Small amounts of burnt plastic on the outside are normal, but heavy buildup or damage means it needs cleaning or replacement.',
    whatBadLooksLike:
      'Black crusty buildup around the nozzle tip, visible cracks, or the tip looks squashed or chewed. Stringing from the nozzle while it sits idle.',
    printer_types: ['FDM'],
    includeInQuick: true,
  },
  {
    key: 'bed_surface',
    title: 'Print Bed Surface',
    description:
      'Run your finger across the print surface. It should feel smooth and clean. Check for scratches, gouges, or spots where filament is permanently stuck.',
    whatBadLooksLike:
      'Deep scratches, bubbles in a PEI sheet, visible cracks in a glass bed, or large areas of stuck filament that won\'t come off with cleaning.',
    printer_types: ['FDM'],
    includeInQuick: true,
  },
  {
    key: 'belt_tension',
    title: 'Drive Belt Tension',
    description:
      'Pluck the X-axis belt like a guitar string — it should make a low, firm sound. Do the same for the Y-axis. A loose belt sounds dull or feels floppy.',
    whatBadLooksLike:
      'Belt feels loose and floppy, visible fraying along the edges, teeth on the belt look worn smooth, or the belt has jumped off a pulley.',
    printer_types: ['FDM'],
    includeInQuick: true,
  },
  {
    key: 'linear_rods',
    title: 'Linear Rods / Rails',
    description:
      'Push the print head along the X and Y axes by hand. It should glide smoothly with no grinding or catching. The rods should look clean and slightly shiny from lubrication.',
    whatBadLooksLike:
      'Rods look dry, dusty, or have rust spots. Movement feels rough or you hear grinding. Rods look bent when viewed from the end.',
    printer_types: ['FDM'],
    includeInQuick: true,
  },
  {
    key: 'extruder_gears',
    title: 'Extruder Gears',
    description:
      'Look into the extruder body — you should see drive gear teeth. Check for filament dust (a white or colored powder that builds up in the teeth). Clean teeth grip filament well.',
    whatBadLooksLike:
      'Gray or colored powder packed into the gear teeth, visible wear on the teeth (they look smooth instead of sharp), or the gear wobbles when you turn it.',
    printer_types: ['FDM'],
    includeInQuick: true,
  },
  {
    key: 'bowden_tube',
    title: 'Bowden Tube (if equipped)',
    description:
      'Trace the white PTFE tube from the extruder to the hotend. Check both ends for a tight fit and look for any kinks, cracks, or discoloration near the hot end.',
    whatBadLooksLike:
      'Tube pulls out of the fitting with light force, visible gaps between the tube and nozzle when cold, yellow or brown discoloration, or a visible kink in the tube.',
    printer_types: ['FDM'],
    includeInQuick: false,
  },
  {
    key: 'hotend_fan',
    title: 'Hotend Cooling Fan',
    description:
      'Power on the printer and watch the small fan mounted on the hotend assembly. It should spin up quickly and run without any strange clicking or whirring sounds.',
    whatBadLooksLike:
      'Fan doesn\'t spin, spins slowly, makes a rattling or clicking sound, or the fan blades have visible dust buildup that isn\'t cleared by running.',
    printer_types: ['FDM'],
    includeInQuick: false,
  },
  {
    key: 'part_cooling_fan',
    title: 'Part Cooling Fan',
    description:
      'The part cooling fan (usually under the print head, facing the nozzle tip) should spin freely. Check for dust buildup on the blades and that the fan duct isn\'t cracked.',
    whatBadLooksLike:
      'Fan blades clogged with filament or dust, cracked fan duct that lets air escape upward instead of at the print, or fan that clicks when spinning.',
    printer_types: ['FDM'],
    includeInQuick: false,
  },
  {
    key: 'z_axis',
    title: 'Z-Axis Lead Screw',
    description:
      'Look at the vertical threaded rod (lead screw). It should look clean and have a slight sheen from lubrication. Turn the screw by hand — it should feel smooth, not gritty.',
    whatBadLooksLike:
      'Lead screw looks dry or has gritty gray powder on the threads, visible wobble when it turns, rust spots, or the screw is visibly bent.',
    printer_types: ['FDM'],
    includeInQuick: false,
  },
  {
    key: 'wiring_cables',
    title: 'Wiring and Cables',
    description:
      'Follow the cable bundle from the print head back to the electronics box. Look for any spots where the insulation looks chafed, melted, or kinked.',
    whatBadLooksLike:
      'Exposed copper wire, melted or discolored insulation, a cable that\'s too tightly bent, or a connector that looks partially unplugged.',
    printer_types: ['FDM'],
    includeInQuick: false,
  },
];

export const RESIN_CHECKPOINTS: CheckpointDefinition[] = [
  {
    key: 'fep_film',
    title: 'FEP Film Condition',
    description:
      'Look at the clear film at the bottom of the resin vat. Shine a light through it — it should be transparent and clear. Cloudiness or scratches reduce UV transmission and cause failed prints.',
    whatBadLooksLike:
      'Film looks cloudy, has visible scratches, has a hole or tear, or has cured resin stuck to the inside that won\'t wipe off.',
    printer_types: ['Resin'],
    includeInQuick: true,
  },
  {
    key: 'build_plate',
    title: 'Build Plate Surface',
    description:
      'The build plate surface should have a consistent, slightly textured finish. Check for cured resin residue or damage to the surface coating.',
    whatBadLooksLike:
      'Cured resin chunks stuck to the plate, large gouges from scraping, or the surface coating is peeling off.',
    printer_types: ['Resin'],
    includeInQuick: true,
  },
  {
    key: 'resin_vat',
    title: 'Resin Vat',
    description:
      'Look inside the empty vat for chunks of cured resin sitting on the FEP. Even small cured pieces can cause prints to fail and damage the FEP.',
    whatBadLooksLike:
      'Any solid chunks on the FEP, cloudy or separated resin that doesn\'t mix back when stirred, or a sticky resin residue that won\'t wipe clean.',
    printer_types: ['Resin'],
    includeInQuick: true,
  },
  {
    key: 'z_rail_resin',
    title: 'Z-Axis Rail',
    description:
      'The single vertical rail should look clean. Push the build platform up and down by hand — it should glide smoothly without any wobble.',
    whatBadLooksLike:
      'Rail looks dry without any grease, visible wobble side-to-side when moving the platform, or a grinding feeling when moving.',
    printer_types: ['Resin'],
    includeInQuick: false,
  },
  {
    key: 'uv_screen',
    title: 'UV LCD Screen',
    description:
      'Look through the FEP at the LCD screen below. It should appear uniformly dark. Visible cracks, dead zones (bright spots), or yellowing indicate screen damage.',
    whatBadLooksLike:
      'Visible cracks on the screen surface, areas that look brighter than the rest when displaying a test pattern, or a yellow/green tint across part of the screen.',
    printer_types: ['Resin'],
    includeInQuick: false,
  },
];

export function getCheckpointsForType(
  printerType: 'FDM' | 'Resin',
  quickOnly: boolean
): CheckpointDefinition[] {
  const all = printerType === 'FDM' ? FDM_CHECKPOINTS : RESIN_CHECKPOINTS;
  return quickOnly ? all.filter(c => c.includeInQuick) : all;
}
