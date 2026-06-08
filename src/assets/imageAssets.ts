// Image asset require() map — the single file to edit when a new image arrives.
//
// WORKFLOW (three steps per image):
//   1. Place the file in:  assets/images/<key>.jpg
//   2. Uncomment the line: key: require('../../assets/images/<key>.jpg')
//   3. Done — AssetImage component picks it up everywhere automatically.
//
// Nothing else in the codebase needs to change.
// React Native requires static require() calls — do not use dynamic paths.
//
// PRIORITY ORDER (shoot Tier 1 first):
//   Tier 1 — nozzle, build_plate, wiper, ams        (highest beginner impact)
//   Tier 2 — extruder, ptfe_tube, lead_screws, carbon_rods
//   Tier 3 — cutter, lidar, camera, cooling_fans, chamber_fan
//   Tier 4 — ams_rollers, ams_ptfe, hotend, filament_path
//   Lessons — shoot alongside Tier 1 parts

export const IMAGE_ASSETS: Record<string, any> = {

  // ── TIER 1: Nozzle ───────────────────────────────────────────────────────────
  // anatomy_nozzle_reference:   require('../../assets/images/anatomy_nozzle_reference.jpg'),
  // anatomy_nozzle_highlighted: require('../../assets/images/anatomy_nozzle_highlighted.jpg'),
  // anatomy_nozzle_good:        require('../../assets/images/anatomy_nozzle_good.jpg'),
  // anatomy_nozzle_bad:         require('../../assets/images/anatomy_nozzle_bad.jpg'),

  // ── TIER 1: Build Plate ──────────────────────────────────────────────────────
  // anatomy_build_plate_reference:   require('../../assets/images/anatomy_build_plate_reference.jpg'),
  // anatomy_build_plate_highlighted: require('../../assets/images/anatomy_build_plate_highlighted.jpg'),
  // anatomy_build_plate_good:        require('../../assets/images/anatomy_build_plate_good.jpg'),
  // anatomy_build_plate_bad:         require('../../assets/images/anatomy_build_plate_bad.jpg'),

  // ── TIER 1: Wiper ───────────────────────────────────────────────────────────
  // anatomy_wiper_reference:   require('../../assets/images/anatomy_wiper_reference.jpg'),
  // anatomy_wiper_highlighted: require('../../assets/images/anatomy_wiper_highlighted.jpg'),
  // anatomy_wiper_good:        require('../../assets/images/anatomy_wiper_good.jpg'),
  // anatomy_wiper_bad:         require('../../assets/images/anatomy_wiper_bad.jpg'),

  // ── TIER 1: AMS ─────────────────────────────────────────────────────────────
  // anatomy_ams_reference:   require('../../assets/images/anatomy_ams_reference.jpg'),
  // anatomy_ams_highlighted: require('../../assets/images/anatomy_ams_highlighted.jpg'),
  // anatomy_ams_good:        require('../../assets/images/anatomy_ams_good.jpg'),
  // anatomy_ams_bad:         require('../../assets/images/anatomy_ams_bad.jpg'),

  // ── TIER 2: Extruder ────────────────────────────────────────────────────────
  // anatomy_extruder_reference:   require('../../assets/images/anatomy_extruder_reference.jpg'),
  // anatomy_extruder_highlighted: require('../../assets/images/anatomy_extruder_highlighted.jpg'),
  // anatomy_extruder_good:        require('../../assets/images/anatomy_extruder_good.jpg'),
  // anatomy_extruder_bad:         require('../../assets/images/anatomy_extruder_bad.jpg'),

  // ── TIER 2: PTFE Tube ───────────────────────────────────────────────────────
  // anatomy_ptfe_tube_reference:   require('../../assets/images/anatomy_ptfe_tube_reference.jpg'),
  // anatomy_ptfe_tube_highlighted: require('../../assets/images/anatomy_ptfe_tube_highlighted.jpg'),
  // anatomy_ptfe_tube_good:        require('../../assets/images/anatomy_ptfe_tube_good.jpg'),
  // anatomy_ptfe_tube_bad:         require('../../assets/images/anatomy_ptfe_tube_bad.jpg'),

  // ── TIER 2: Lead Screws ─────────────────────────────────────────────────────
  // anatomy_lead_screws_reference:   require('../../assets/images/anatomy_lead_screws_reference.jpg'),
  // anatomy_lead_screws_highlighted: require('../../assets/images/anatomy_lead_screws_highlighted.jpg'),
  // anatomy_lead_screws_good:        require('../../assets/images/anatomy_lead_screws_good.jpg'),
  // anatomy_lead_screws_bad:         require('../../assets/images/anatomy_lead_screws_bad.jpg'),

  // ── TIER 2: Carbon Rods ─────────────────────────────────────────────────────
  // anatomy_carbon_rods_reference:   require('../../assets/images/anatomy_carbon_rods_reference.jpg'),
  // anatomy_carbon_rods_highlighted: require('../../assets/images/anatomy_carbon_rods_highlighted.jpg'),
  // anatomy_carbon_rods_good:        require('../../assets/images/anatomy_carbon_rods_good.jpg'),
  // anatomy_carbon_rods_bad:         require('../../assets/images/anatomy_carbon_rods_bad.jpg'),

  // ── TIER 3: Filament Cutter ─────────────────────────────────────────────────
  // anatomy_cutter_reference:   require('../../assets/images/anatomy_cutter_reference.jpg'),
  // anatomy_cutter_highlighted: require('../../assets/images/anatomy_cutter_highlighted.jpg'),
  // anatomy_cutter_good:        require('../../assets/images/anatomy_cutter_good.jpg'),
  // anatomy_cutter_bad:         require('../../assets/images/anatomy_cutter_bad.jpg'),

  // ── TIER 3: LiDAR Sensor ────────────────────────────────────────────────────
  // anatomy_lidar_reference:   require('../../assets/images/anatomy_lidar_reference.jpg'),
  // anatomy_lidar_highlighted: require('../../assets/images/anatomy_lidar_highlighted.jpg'),
  // anatomy_lidar_good:        require('../../assets/images/anatomy_lidar_good.jpg'),
  // anatomy_lidar_bad:         require('../../assets/images/anatomy_lidar_bad.jpg'),

  // ── TIER 3: Printer Camera ──────────────────────────────────────────────────
  // anatomy_camera_reference:   require('../../assets/images/anatomy_camera_reference.jpg'),
  // anatomy_camera_highlighted: require('../../assets/images/anatomy_camera_highlighted.jpg'),
  // anatomy_camera_good:        require('../../assets/images/anatomy_camera_good.jpg'),
  // anatomy_camera_bad:         require('../../assets/images/anatomy_camera_bad.jpg'),

  // ── TIER 3: Part Cooling Fans ───────────────────────────────────────────────
  // anatomy_cooling_fans_reference:   require('../../assets/images/anatomy_cooling_fans_reference.jpg'),
  // anatomy_cooling_fans_highlighted: require('../../assets/images/anatomy_cooling_fans_highlighted.jpg'),
  // anatomy_cooling_fans_good:        require('../../assets/images/anatomy_cooling_fans_good.jpg'),
  // anatomy_cooling_fans_bad:         require('../../assets/images/anatomy_cooling_fans_bad.jpg'),

  // ── TIER 3: Chamber Fan ─────────────────────────────────────────────────────
  // anatomy_chamber_fan_reference:   require('../../assets/images/anatomy_chamber_fan_reference.jpg'),
  // anatomy_chamber_fan_highlighted: require('../../assets/images/anatomy_chamber_fan_highlighted.jpg'),
  // anatomy_chamber_fan_good:        require('../../assets/images/anatomy_chamber_fan_good.jpg'),
  // anatomy_chamber_fan_bad:         require('../../assets/images/anatomy_chamber_fan_bad.jpg'),

  // ── TIER 4: AMS Rollers ─────────────────────────────────────────────────────
  // anatomy_ams_rollers_reference:   require('../../assets/images/anatomy_ams_rollers_reference.jpg'),
  // anatomy_ams_rollers_highlighted: require('../../assets/images/anatomy_ams_rollers_highlighted.jpg'),
  // anatomy_ams_rollers_good:        require('../../assets/images/anatomy_ams_rollers_good.jpg'),
  // anatomy_ams_rollers_bad:         require('../../assets/images/anatomy_ams_rollers_bad.jpg'),

  // ── TIER 4: AMS PTFE Tubes ──────────────────────────────────────────────────
  // anatomy_ams_ptfe_reference:   require('../../assets/images/anatomy_ams_ptfe_reference.jpg'),
  // anatomy_ams_ptfe_highlighted: require('../../assets/images/anatomy_ams_ptfe_highlighted.jpg'),
  // anatomy_ams_ptfe_good:        require('../../assets/images/anatomy_ams_ptfe_good.jpg'),
  // anatomy_ams_ptfe_bad:         require('../../assets/images/anatomy_ams_ptfe_bad.jpg'),

  // ── TIER 4: Hotend ──────────────────────────────────────────────────────────
  // anatomy_hotend_reference:   require('../../assets/images/anatomy_hotend_reference.jpg'),
  // anatomy_hotend_highlighted: require('../../assets/images/anatomy_hotend_highlighted.jpg'),
  // anatomy_hotend_good:        require('../../assets/images/anatomy_hotend_good.jpg'),
  // anatomy_hotend_bad:         require('../../assets/images/anatomy_hotend_bad.jpg'),

  // ── TIER 4: Filament Path ───────────────────────────────────────────────────
  // anatomy_filament_path_reference:   require('../../assets/images/anatomy_filament_path_reference.jpg'),
  // anatomy_filament_path_highlighted: require('../../assets/images/anatomy_filament_path_highlighted.jpg'),
  // anatomy_filament_path_good:        require('../../assets/images/anatomy_filament_path_good.jpg'),
  // anatomy_filament_path_bad:         require('../../assets/images/anatomy_filament_path_bad.jpg'),

  // ── LESSONS ─────────────────────────────────────────────────────────────────
  // lesson_printer_working:        require('../../assets/images/lesson_printer_working.jpg'),
  // lesson_filament_spool:         require('../../assets/images/lesson_filament_spool.jpg'),
  // lesson_three_things:           require('../../assets/images/lesson_three_things.jpg'),
  // lesson_failed_first_layer:     require('../../assets/images/lesson_failed_first_layer.jpg'),
  // lesson_first_successful_print: require('../../assets/images/lesson_first_successful_print.jpg'),
  // lesson_printer_safe:           require('../../assets/images/lesson_printer_safe.jpg'),
  // lesson_nozzle_hot:             require('../../assets/images/lesson_nozzle_hot.jpg'),
  // lesson_print_head_moving:      require('../../assets/images/lesson_print_head_moving.jpg'),
  // lesson_unplug:                 require('../../assets/images/lesson_unplug.jpg'),
  // lesson_open_window:            require('../../assets/images/lesson_open_window.jpg'),
  // lesson_safety_complete:        require('../../assets/images/lesson_safety_complete.jpg'),
};
