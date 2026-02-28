export const AUDIO_KEYS = {
  MUSIC: {
    MENU_AMBIENT: 'music_menu_ambient',
    DARK_SHOT_TENSION: 'music_dark_shot_tension',
    FLUX_ARENA_HYPE: 'music_flux_arena_hype',
    MIRROR_RACE_PULSE: 'music_mirror_race_pulse',
    NEXARI_WIN: 'music_nexari_win',
    PLAYER_WIN: 'music_player_win',
    RULE_MUTATION: 'music_rule_mutation',
  },
  SFX: {
    ORB_SHOOT: 'sfx_orb_shoot',
    ORB_COLLISION: 'sfx_orb_collision',
    ORB_PORTAL: 'sfx_orb_portal',
    SCRATCH: 'sfx_scratch',
    PUSH_LAND: 'sfx_push_land',
    KNOCKOFF: 'sfx_knockoff',
    FLUX_EVENT_TRIGGER: 'sfx_flux_event_trigger',
    RACE_ENGINE: 'sfx_race_engine',
    CRASH: 'sfx_crash',
    FINISH_LINE: 'sfx_finish_line',
    UI_HOVER: 'sfx_ui_hover',
    UI_SELECT: 'sfx_ui_select',
    TRANSITION_WHOOSH: 'sfx_transition_whoosh',
  },
} as const;

export const AUDIO_VOLUMES = {
  MUSIC: 0.4,
  SFX: 0.7,
  MASTER: 1.0,
} as const;
