// The Plastic Surgeon — Domain Types

export type PrinterType = 'FDM' | 'Resin';

export type FilamentType =
  | 'PLA'
  | 'PETG'
  | 'ABS'
  | 'ASA'
  | 'TPU'
  | 'Nylon'
  | 'Carbon Fiber'
  | 'Resin'
  | 'Other';

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

export type InspectionType = 'quick' | 'full';
export type InspectionStatus = 'in_progress' | 'completed' | 'issues_found';
export type CheckPointStatus = 'pass' | 'warn' | 'fail' | 'skip';

export type GuideDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type GuideCategory =
  | 'cleaning'
  | 'lubrication'
  | 'calibration'
  | 'repair'
  | 'inspection'
  | 'troubleshooting';

// ─────────────────────────────────────────────
// PRINTER
// ─────────────────────────────────────────────
export interface Printer {
  id?: number;
  name: string;
  brand: string;
  model: string;
  printer_type: PrinterType;
  serial_number?: string;
  purchase_date?: string;
  notes?: string;
  photo_uri?: string;
  total_print_hours: number;
  is_active: number;        // SQLite stores booleans as 0/1
  created_at?: string;
}

// ─────────────────────────────────────────────
// MAINTENANCE TASKS (SCHEDULE)
// ─────────────────────────────────────────────
export interface MaintenanceTask {
  id?: number;
  printer_id: number;
  task_key: string;         // e.g. "clean_nozzle" — links to task templates
  title: string;
  description?: string;
  interval_hours?: number;  // trigger every N print hours
  interval_days?: number;   // trigger every N calendar days
  last_done_at?: string;    // ISO date
  last_done_hours?: number; // print hours when last done
  next_due_at?: string;     // computed next due date
  next_due_hours?: number;  // computed next due hours
  priority: TaskPriority;
  is_active: number;
  created_at?: string;
}

// ─────────────────────────────────────────────
// MAINTENANCE HISTORY (LOG)
// ─────────────────────────────────────────────
export interface MaintenanceHistoryEntry {
  id?: number;
  printer_id: number;
  task_key: string;
  title: string;
  notes?: string;
  print_hours_at_service?: number;
  cost?: number;
  parts_replaced_json?: string;  // JSON array of part names
  photos_json?: string;          // JSON array of local photo URIs
  completed_at: string;
}

// ─────────────────────────────────────────────
// INSPECTIONS (CAMERA-BASED VISUAL INSPECTION)
// Camera inspection is a core feature — not a future addition.
// Every checkpoint result has a photo_uri slot built in from the start.
// ─────────────────────────────────────────────
export interface Inspection {
  id?: number;
  printer_id: number;
  inspection_type: InspectionType;
  status: InspectionStatus;
  notes?: string;
  overall_score?: number;   // 0–100 health score
  completed_at?: string;
  created_at?: string;
}

export interface InspectionResult {
  id?: number;
  inspection_id: number;
  check_point: string;      // e.g. "nozzle_condition"
  title: string;
  status: CheckPointStatus;
  notes?: string;
  photo_uri?: string;       // local path to camera photo — stored on device
  created_at?: string;
}

// ─────────────────────────────────────────────
// PRINT JOBS (USAGE TRACKING)
// ─────────────────────────────────────────────
export interface PrintJob {
  id?: number;
  printer_id: number;
  name?: string;
  filament_type?: FilamentType;
  filament_color?: string;
  print_hours: number;
  success: number;           // 0/1
  failure_reason?: string;
  failure_photo_uri?: string;
  notes?: string;
  completed_at: string;
}

// ─────────────────────────────────────────────
// GUIDES (OFFLINE MAINTENANCE MANUALS)
// Guides are seeded into SQLite at first launch — always available offline.
// ─────────────────────────────────────────────
export interface Guide {
  id?: number;
  guide_key: string;         // unique identifier, e.g. "clean_nozzle_fdm"
  title: string;
  description?: string;
  category: GuideCategory;
  difficulty: GuideDifficulty;
  estimated_minutes?: number;
  printer_types_json?: string;    // JSON: ['FDM'] or ['FDM','Resin']
  tools_needed_json?: string;     // JSON array
  parts_needed_json?: string;     // JSON array
  safety_warnings_json?: string;  // JSON array — displayed before first step
  is_premium: number;             // 0=free, 1=premium
  created_at?: string;
}

export interface GuideStep {
  id?: number;
  guide_id: number;
  step_number: number;
  title: string;
  instruction: string;       // plain language, beginner-friendly
  safety_note?: string;      // shown in amber before this step
  image_key?: string;        // bundled asset key for offline images
  tip?: string;              // optional pro tip shown separately
  requires_camera: number;   // 1 = prompt user to take a photo here
}

// ─────────────────────────────────────────────
// UI HELPER TYPES
// ─────────────────────────────────────────────

// Diagnosis card shown after each inspection checkpoint — Grandparent Test compliant.
// Every status (pass/warn/fail) produces plain-language feedback in the standard format.
export type RiskLevel = 'none' | 'low' | 'medium' | 'high';
export type RepairDifficulty = 'easy' | 'moderate' | 'advanced';

export interface DiagnosisCard {
  headline: string;           // "Your nozzle looks clean" / "Your nozzle looks dirty"
  risk: RiskLevel;
  whatThisMeans: string;      // plain language explanation, no jargon
  recommendedAction: string;  // what to do next, plain language
  estimatedTime?: string;     // "3 minutes", "20 minutes"
  difficulty?: RepairDifficulty;
  guideKey?: string;          // links to the step-by-step repair guide
}

// Part identification data — required on every checkpoint and guide.
// Answers "What am I looking at?" before asking "What should I do?"
// No jargon. No assumed knowledge.
export interface PartIdentification {
  partName: string;           // "Nozzle" — the common name
  simpleName: string;         // "The small metal tip at the bottom of the printer"
  purpose: string;            // "It melts your plastic and places it on the print."
  whyItMatters: string;       // "A dirty nozzle causes failed prints and poor quality."
  commonProblems: string[];   // plain-language list: ["Burnt plastic buildup", "Damage"]
  maintenanceInterval: string; // "Check monthly. Clean every 100 print hours."
  imageKey?: string;          // bundled asset key for the part photo (for future images)
}

// 5-step camera guidance — required for every checkpoint camera prompt.
// Replaces all "Take Photo" buttons with guided positioning instructions.
export interface CameraGuidance {
  step1_find: string;         // "Find the small metal tip at the very bottom of the printer"
  step2_match: string;        // "It should look like the picture above — small and metallic"
  step3_distance: string;     // "Move your camera about 10 cm (4 inches) away from the tip"
  step4_center: string;       // "Center the tip of the nozzle in the middle of the frame"
  step5_action: string;       // "Tap 'Inspect' below when the tip is clearly visible"
}

// Inspection checkpoint definition — Visual Structure compliant.
// Required 6-section format: Part ID → Good → Bad → Camera → Diagnosis → Repair
// Every field must pass the Grandparent Test — no unexplained jargon.
export interface CheckpointDefinition {
  key: string;
  title: string;                   // plain-language name shown to user
  partIdentification: PartIdentification;
  description: string;             // brief "what to do" — no assumed knowledge
  whatGoodLooksLike: string;       // good example caption
  whatBadLooksLike: string;        // bad example caption
  cameraGuidance: CameraGuidance;  // 5-step camera positioning
  printer_types: PrinterType[];
  includeInQuick: boolean;         // true = part of the 5-minute quick check
  diagnosis: {
    pass: DiagnosisCard;
    warn: DiagnosisCard;
    fail: DiagnosisCard;
  };
}

// Maintenance task template (from src/data/maintenanceTasks.ts)
export interface TaskTemplate {
  task_key: string;
  title: string;
  description: string;
  interval_hours?: number;
  interval_days?: number;
  priority: TaskPriority;
  printer_types: PrinterType[];
  guide_key?: string;      // links to the guide that shows how to do this task
}

// Printer brand + model catalog (from src/data/printerBrands.ts)
export interface PrinterModel {
  brand: string;
  model: string;
  printer_type: PrinterType;
}
