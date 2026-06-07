// Beginner training system — lesson data and curated learning paths.
// All content must pass the Grandparent Test.
// Lesson cards: one idea per card. Max 2 sentences per body. No jargon.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LessonCard {
  id:            string;
  imageKey:      string;      // asset key — placeholder until images are produced
  imageCaption:  string;      // brief text describing what the image shows
  headline:      string;      // THE one idea — max 8 words, large bold display
  body:          string;      // 1–2 plain-language sentences supporting the idea
  safetyNote?:   string;      // shown in amber — appears above the image
  tip?:          string;      // shown in blue — appears below the body
}

export interface BeginnerLesson {
  key:                 string;
  title:               string;
  subtitle:            string;
  iconName:            string;
  estimatedMinutes:    number;
  accentKey:           'primary' | 'warning' | 'info' | 'healthy';
  cards:               LessonCard[];
  completionHeadline:  string;
  completionBody:      string;
}

export interface DoNotTouchEntry {
  key:        string;
  partName:   string;
  simpleName: string;     // what it is, one sentence
  whyNotYet:  string;     // the specific danger, one sentence
  whenReady:  string;     // the path forward, one sentence
}

// ─── Curated Part Keys ────────────────────────────────────────────────────────
// The 6 parts every new owner should learn first.
// These link directly to existing anatomy data in printerAnatomy.ts.

export const LEARN_FIRST_PART_KEYS: string[] = [
  'nozzle',
  'build_plate',
  'filament_path',
  'ams',
  'wiper',
  'lead_screws',
];

// ─── Do Not Touch Yet ────────────────────────────────────────────────────────
// Parts beginners should know about but never touch without a guide.
// Shown with a warning style to set expectations, not to scare.

export const DO_NOT_TOUCH_YET: DoNotTouchEntry[] = [
  {
    key:        'heater_cartridge',
    partName:   'Heater Cartridge',
    simpleName: 'The small plug inside the hotend that heats it to printing temperature',
    whyNotYet:  'Replacing this requires working with live wiring close to very high heat.',
    whenReady:  'Follow a specific guided repair only after completing several basic maintenance sessions.',
  },
  {
    key:        'wiring',
    partName:   'Wiring and Cables',
    simpleName: 'The electrical wires running from the mainboard to every moving part',
    whyNotYet:  'A loose or incorrect connection can damage the printer or create a fire risk.',
    whenReady:  'Only touch wiring when following a specific repair guide — never improvise.',
  },
  {
    key:        'lidar_internals',
    partName:   'LiDAR Sensor Lens',
    simpleName: 'The laser scanning window that automatically levels your first layer',
    whyNotYet:  'A scratch permanently damages the sensor and cannot be repaired.',
    whenReady:  'Use a dry cotton swab only, and only when the LiDAR cleaning guide says to.',
  },
  {
    key:        'mainboard',
    partName:   'Mainboard',
    simpleName: 'The circuit board that controls everything in the printer',
    whyNotYet:  'Static electricity from your hands can destroy this board in a single touch.',
    whenReady:  'Only open the electronics compartment when following a manufacturer repair guide.',
  },
  {
    key:        'extruder_tension',
    partName:   'Extruder Tension Arm',
    simpleName: 'The spring-loaded mechanism that grips your filament and feeds it forward',
    whyNotYet:  'Adjusting this incorrectly causes filament grinding on every print — often without obvious warning signs.',
    whenReady:  'Follow the extruder maintenance guide only when you hear clicking or grinding during a print.',
  },
];

// ─── Lessons ─────────────────────────────────────────────────────────────────

export const BEGINNER_LESSONS: BeginnerLesson[] = [

  // ── Lesson 1: First Day ──────────────────────────────────────────────────

  {
    key:              'first_day',
    title:            'First Day With Your Printer',
    subtitle:         'What every new owner needs to know',
    iconName:         'sparkles-outline',
    estimatedMinutes: 3,
    accentKey:        'primary',
    completionHeadline: 'You understand the basics',
    completionBody:     'You now know how your printer works and what to expect. Next, learn the parts so you know what everything is called.',
    cards: [
      {
        id:           'fd_1',
        imageKey:     'lesson_printer_working',
        imageCaption: 'A 3D printer building an object layer by layer',
        headline:     'Your printer builds objects one layer at a time',
        body:         'Think of it like a hot glue gun on a robot arm. It places tiny amounts of plastic down in thin layers — each one no thicker than a human hair — until your object is complete.',
      },
      {
        id:           'fd_2',
        imageKey:     'lesson_filament_spool',
        imageCaption: 'A spool of PLA filament — the plastic wire your printer uses',
        headline:     'The plastic wire is called filament',
        body:         'Filament comes on a spool — like thread on a bobbin. The most common type is called PLA. It is safe, easy to use, and comes in almost every color.',
        tip:          'Store open filament in a sealed bag with silica gel packets. Moisture from the air will ruin it.',
      },
      {
        id:           'fd_3',
        imageKey:     'lesson_three_things',
        imageCaption: 'Power cable, filament spool, and a print file on screen',
        headline:     'Your printer needs three things to work',
        body:         'Power to run. Filament to print with. And a print file from your computer that tells it the exact shape to build.',
      },
      {
        id:           'fd_4',
        imageKey:     'lesson_failed_first_layer',
        imageCaption: 'A print that did not stick — the most common beginner problem',
        headline:     'Your first print might not be perfect — that is normal',
        body:         'The most common beginner problem is the first layer not sticking to the build plate. It is easy to fix once you know how, and this app will walk you through it.',
        tip:          'Wiping the build plate with isopropyl alcohol before every print fixes most sticking problems.',
      },
      {
        id:           'fd_5',
        imageKey:     'lesson_first_successful_print',
        imageCaption: 'A finished print sitting on the build plate',
        headline:     'You are ready to start learning the parts',
        body:         'You now understand how printing works. In the next section, you will learn the names of the parts and what each one does.',
      },
    ],
  },

  // ── Lesson 2: Safety First ───────────────────────────────────────────────

  {
    key:              'safety_first',
    title:            'Safety First',
    subtitle:         'Know this before you touch anything',
    iconName:         'shield-checkmark-outline',
    estimatedMinutes: 3,
    accentKey:        'warning',
    completionHeadline: 'You know how to stay safe',
    completionBody:     'These habits will protect you every time you use your printer. The most important one: always unplug before touching any part.',
    cards: [
      {
        id:           'sf_1',
        imageKey:     'lesson_printer_safe',
        imageCaption: 'A 3D printer running unattended — safe when used correctly',
        headline:     'Your printer is safe — it just needs respect',
        body:         'Most of the time your printer runs completely on its own without any risk. But there are five things every owner must know before getting started.',
      },
      {
        id:           'sf_2',
        imageKey:     'lesson_nozzle_hot',
        imageCaption: 'Close-up of a nozzle at printing temperature',
        headline:     'The nozzle is hotter than boiling water',
        body:         'During a print the nozzle tip reaches over 200°C — more than twice the temperature of boiling water. Never touch it while the printer is on.',
        safetyNote:   'Wait at least 10 minutes after the printer finishes before touching any part of the print head.',
      },
      {
        id:           'sf_3',
        imageKey:     'lesson_print_head_moving',
        imageCaption: 'The print head moving fast during a print',
        headline:     'Keep your hands out while it is printing',
        body:         'The print head moves very fast and without warning. Moving parts can pinch or cut fingers instantly. Keep your hands away from inside the printer while it is running.',
        safetyNote:   'If you need to adjust something, pause the print first and wait for the head to stop completely.',
      },
      {
        id:           'sf_4',
        imageKey:     'lesson_unplug',
        imageCaption: 'Unplugging the printer before maintenance',
        headline:     'Always unplug before touching any part',
        body:         'Before you clean, adjust, or replace anything on your printer, turn it off and unplug it from the wall. Turning it off with the button alone is not enough.',
        safetyNote:   'This single habit prevents the most serious printer injuries.',
      },
      {
        id:           'sf_5',
        imageKey:     'lesson_open_window',
        imageCaption: 'An open window near a 3D printer',
        headline:     'Open a window when printing',
        body:         'When plastic melts it releases small amounts of fumes. Common filaments like PLA have very low levels, but it is always a good habit to have ventilation nearby.',
        tip:          'For ABS, PETG, and Nylon filaments, ventilation is especially important. Never print these in a small closed room.',
      },
      {
        id:           'sf_6',
        imageKey:     'lesson_safety_complete',
        imageCaption: 'A safe and confident printer owner',
        headline:     'You now know how to stay safe',
        body:         'Keep these five habits and you will never have a safety problem. Remember: unplug first, hands out while running, and wait for it to cool before touching.',
      },
    ],
  },
];

// ─── Path Definition ─────────────────────────────────────────────────────────
// The ordered "Start Here" learning path for brand new owners.

export interface LearningPathStep {
  type:      'lesson' | 'parts';
  lessonKey?: string;
  label:     string;
  subtitle:  string;
  iconName:  string;
}

export const BEGINNER_PATH: LearningPathStep[] = [
  {
    type:      'lesson',
    lessonKey: 'first_day',
    label:     'First Day With Your Printer',
    subtitle:  '3 min · How your printer works',
    iconName:  'sparkles-outline',
  },
  {
    type:      'lesson',
    lessonKey: 'safety_first',
    label:     'Safety First',
    subtitle:  '3 min · Know this before you touch anything',
    iconName:  'shield-checkmark-outline',
  },
  {
    type:      'parts',
    label:     'Parts You Should Know First',
    subtitle:  '6 parts · The essentials',
    iconName:  'layers-outline',
  },
];
