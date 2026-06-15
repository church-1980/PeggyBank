// Interactive Printer Anatomy System — Type Definitions
// Phase 1: Static visual learning (images + education).
// Architecture supports Phases 2–7 without schema changes.
// DO NOT implement Phase 2+ logic until each phase ships.

import { PrinterType, CameraGuidance } from './index';

// ─── Phase Markers ────────────────────────────────────────────────────────────

// Phase 1  — Static images + educational content       ← IMPLEMENTED
// Phase 2  — Animated education (pan/zoom/highlight)   ← future
// Phase 3  — Interactive 3D explorer                   ← future
// Phase 4  — Guided maintenance animations             ← future
// Phase 5  — X-Ray filament path mode                  ← future
// Phase 6  — AI visual inspection markup               ← future
// Phase 7  — Augmented reality overlay                 ← future
export type AnatomyPhase = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// ─── Categories ───────────────────────────────────────────────────────────────

export type AnatomyCategory =
  | 'hotend_system'          // Where plastic melts and exits
  | 'filament_system'        // How plastic travels to the nozzle
  | 'motion_system'          // How the printer moves
  | 'print_surface'          // Where your print sticks
  | 'maintenance_components' // Parts that need regular cleaning
  | 'cooling'                // Temperature control
  | 'sensors_cameras';       // How the printer watches itself

export interface AnatomyCategoryMeta {
  key: AnatomyCategory;
  label: string;
  description: string;
  iconName: string;
  order: number;
}

export const ANATOMY_CATEGORIES: AnatomyCategoryMeta[] = [
  { order: 1, key: 'hotend_system',          label: 'Hotend System',          description: 'Where plastic melts and exits',                   iconName: 'flame-outline' },
  { order: 2, key: 'filament_system',        label: 'Filament System',        description: 'How plastic travels to the nozzle',               iconName: 'git-branch-outline' },
  { order: 3, key: 'motion_system',          label: 'Motion System',          description: 'How the print head moves around',                  iconName: 'move-outline' },
  { order: 4, key: 'print_surface',          label: 'Print Surface',          description: 'Where your print sticks down',                    iconName: 'grid-outline' },
  { order: 5, key: 'maintenance_components', label: 'Maintenance Parts',      description: 'Parts that need regular cleaning or replacement',  iconName: 'construct-outline' },
  { order: 6, key: 'cooling',                label: 'Cooling System',         description: 'How the printer manages temperature',              iconName: 'snow-outline' },
  { order: 7, key: 'sensors_cameras',        label: 'Sensors & Cameras',      description: 'How the printer monitors itself',                  iconName: 'eye-outline' },
];

// ─── Asset System ─────────────────────────────────────────────────────────────

// Phase 1: Bundled asset image keys ('' = placeholder, real image not yet available).
// Phase 2+: Additional optional fields populated when each phase ships.
// NEVER remove Phase 1 fields — they remain as fallbacks when animations/3D are loading.
export interface PartAsset {
  // Phase 1 — static images
  referenceImageKey:    string;   // neutral photo of the part by itself
  highlightedImageKey:  string;   // same photo with part circled or arrowed
  goodExampleKey:       string;   // part in healthy/clean condition
  badExampleKey:        string;   // part with visible problem or wear

  // Phase 2 — education animation (future: pan → zoom → highlight → pulse → callout)
  // Lottie or Rive animation that guides the eye to the part
  animationKey?: string;

  // Phase 3 — interactive 3D model (future: GLB/glTF asset key)
  modelKey?: string;
  modelFocusPoint?: readonly [number, number, number];  // camera target in model space

  // Phase 5 — X-Ray filament path overlay (future: SVG path or model overlay key)
  xrayOverlayKey?: string;

  // Phase 6 — AI inspection (future: vision model config)
  aiInspectionConfig?: {
    defectClasses: string[];     // what the AI will look for on this part
    minConfidence: number;       // 0–1 threshold for flagging a finding
  };

  // Phase 7 — AR overlay (future: ARKit/ARCore marker)
  arConfig?: {
    markerKey: string;
    overlayAnchor: readonly [number, number, number];
  };
}

// Animation step — Phase 2 architecture placeholder.
// Defined now so Phase 2 data can be added to existing parts
// without a schema change. NOT rendered in Phase 1.
export interface AnimationStep {
  action: 'pan' | 'zoom' | 'highlight' | 'pulse' | 'callout' | 'darken_others' | 'x_ray';
  targetKey?: string;       // which part key to target
  duration:   number;       // milliseconds
  label?:     string;       // text to display in callout
  color?:     string;       // highlight color override
}

// ─── Part Definition ──────────────────────────────────────────────────────────

export interface AnatomyPart {
  key:           string;
  displayName:   string;
  simpleName:    string;          // "The small metal tip at the very bottom of the print head"
  category:      AnatomyCategory;
  printer_types: PrinterType[];

  // Educational content — every field must pass the Grandparent Test.
  // Plain language only. No jargon without immediate explanation.
  what_it_is:           string;   // 1 sentence: "The nozzle is..."
  what_it_does:         string;   // what happens during printing
  why_it_matters:       string;   // consequences if neglected
  location_tip:         string;   // plain-language "where to look"
  common_problems:      string[]; // 3–5 plain-language problems
  maintenance_interval: string;   // "Check monthly. Clean every 100 hours."

  // Visual reference captions (Phase 1 — text until images are ready)
  what_good_looks_like: string;
  what_bad_looks_like:  string;

  // Phase 1 assets
  asset: PartAsset;

  // Camera guidance (reused from inspection system — same 5-step format)
  camera_guidance: CameraGuidance;

  // Phase 2 animation (empty array in Phase 1)
  education_animation?: AnimationStep[];

  // Links into other app systems
  related_checkpoint_keys: string[];  // inspection checkpoint keys
  related_guide_keys:      string[];  // maintenance guide keys
}
