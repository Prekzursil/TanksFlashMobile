extends Node2D

const VIEWPORT_WIDTH := 1280
const VIEWPORT_HEIGHT := 720

const TERRAIN_STEP := 4
const TERRAIN_BASE_Y := 470.0
const TERRAIN_AMPLITUDE := 140.0
const TERRAIN_MIN_Y := 220.0
const TERRAIN_MAX_Y := VIEWPORT_HEIGHT - 60.0

const GRAVITY := 900.0

const MOVE_SPEED_PX_PER_SEC := 210.0
const TURN_FUEL_MAX := 180.0
const FUEL_COST_PER_PX := 1.0
const TURN_TIME_SEC := 20.0

const WIND_ACCEL_MIN := -240.0
const WIND_ACCEL_MAX := 240.0

const TANK_RADIUS := 18.0

const DEFAULT_PROJECTILE_RADIUS := 4.0
const DEFAULT_BLAST_RADIUS := 72.0
const DEFAULT_CRATER_RADIUS := 56.0

const ANGLE_MIN_DEG := 5.0
const ANGLE_MAX_DEG := 85.0
const ANGLE_SPEED_DEG_PER_SEC := 70.0

const POWER_MIN := 180.0
const POWER_MAX := 900.0
const POWER_SPEED_PER_SEC := 360.0

const EXPLOSION_COOLDOWN_SEC := 0.65

class Weapon:
	var name: String
	var blast_radius: float
	var crater_radius: float
	var max_damage: float
	var speed_multiplier: float
	var projectile_radius: float
	var projectile_color: Color

	func _init(
		weapon_name: String,
		blast_radius_value: float,
		crater_radius_value: float,
		max_damage_value: float,
		speed_multiplier_value: float,
		projectile_radius_value: float,
		projectile_color_value: Color
	) -> void:
		name = weapon_name
		blast_radius = blast_radius_value
		crater_radius = crater_radius_value
		max_damage = max_damage_value
		speed_multiplier = speed_multiplier_value
		projectile_radius = projectile_radius_value
		projectile_color = projectile_color_value

class Tank:
	var id: int
	var pos: Vector2
	var vel := Vector2.ZERO
	var hp := 100.0
	var aim_angle_deg := 45.0
	var power := 520.0
	var weapon_idx := 0
	var color: Color

	func _init(id_value: int, start_pos: Vector2, color_value: Color) -> void:
		id = id_value
		pos = start_pos
		color = color_value

	func facing_sign() -> float:
		return 1.0 if id == 0 else -1.0

enum Phase { AIM, FIRING, EXPLODING, GAMEOVER }

enum UiScreen { MAIN_MENU, PLAYING, PAUSED, SETTINGS }

const ACTION_MOVE_LEFT := "move_left"
const ACTION_MOVE_RIGHT := "move_right"
const ACTION_AIM_LEFT := "aim_left"
const ACTION_AIM_RIGHT := "aim_right"
const ACTION_POWER_UP := "power_up"
const ACTION_POWER_DOWN := "power_down"
const ACTION_FIRE := "fire"
const ACTION_WEAPON_1 := "weapon_1"
const ACTION_WEAPON_2 := "weapon_2"
const ACTION_WEAPON_3 := "weapon_3"
const ACTION_RESET_MATCH := "reset_match"
const ACTION_PAUSE := "pause"

const SETTINGS_FILE := "user://tanks_remake_settings.cfg"
const TOUCH_LAYOUT_RIGHT_HANDED := 0
const TOUCH_LAYOUT_LEFT_HANDED := 1

const ORIGINAL_BG_IMAGE_PATH := "res://assets/original/images/char_318.png"
const ORIGINAL_P1_IMAGE_PATH := "res://assets/original/images/char_230.png"
const ORIGINAL_P2_IMAGE_PATH := "res://assets/original/images/char_237.png"

const ORIGINAL_SFX_UI_CLICK_PATH := "res://assets/original/sounds/sound_121.mp3"
const ORIGINAL_SFX_FIRE_PATH := "res://assets/original/sounds/sound_35.mp3"
const ORIGINAL_SFX_IMPACT_PATH := "res://assets/original/sounds/sound_12.mp3"

var _phase := Phase.AIM
var _message := ""
var _cooldown := 0.0

var _ui_screen := UiScreen.MAIN_MENU
var _screen_before_settings := UiScreen.MAIN_MENU
var _game_active := false

var _bg_texture: Texture2D = null
var _p1_texture: Texture2D = null
var _p2_texture: Texture2D = null

var _touch_overlay_enabled := false
var _touch_layout := TOUCH_LAYOUT_RIGHT_HANDED

var _weapons: Array[Weapon] = []
var _wind_accel := 0.0
var _turn_fuel_left := TURN_FUEL_MAX
var _turn_time_left := TURN_TIME_SEC

var _terrain_y := PackedFloat32Array()
var _terrain_polyline := PackedVector2Array()
var _terrain_fill := PackedVector2Array()

var _tanks: Array[Tank] = []
var _current_tank_idx := 0

var _projectile_active := false
var _projectile_pos := Vector2.ZERO
var _projectile_vel := Vector2.ZERO
var _projectile_weapon_idx := 0
var _projectile_radius := DEFAULT_PROJECTILE_RADIUS
var _projectile_color := Color(1.0, 0.9, 0.4)

@onready var _hud: Control = $"UI/Hud"
@onready var _hud_stats_label: Label = $"UI/Hud/TopPanel/VBox/StatsLabel"
@onready var _hud_message_label: Label = $"UI/Hud/TopPanel/VBox/MessageLabel"
@onready var _hud_help_label: Label = $"UI/Hud/TopPanel/VBox/HelpLabel"
@onready var _hud_pause_button: Button = $"UI/Hud/TopPanel/VBox/Toolbar/PauseButton"
@onready var _hud_settings_button: Button = $"UI/Hud/TopPanel/VBox/Toolbar/SettingsButton"
@onready var _hud_restart_button: Button = $"UI/Hud/TopPanel/VBox/Toolbar/RestartButton"

@onready var _touch_controls: Control = $"UI/TouchControls"
@onready var _touch_move_cluster: Control = $"UI/TouchControls/MoveCluster"
@onready var _touch_aim_cluster: Control = $"UI/TouchControls/AimCluster"
@onready var _touch_move_left_button: Button = $"UI/TouchControls/MoveCluster/MoveBox/MoveLeftButton"
@onready var _touch_move_right_button: Button = $"UI/TouchControls/MoveCluster/MoveBox/MoveRightButton"
@onready var _touch_aim_left_button: Button = $"UI/TouchControls/AimCluster/AimBox/AimRow/AimLeftButton"
@onready var _touch_aim_right_button: Button = $"UI/TouchControls/AimCluster/AimBox/AimRow/AimRightButton"
@onready var _touch_power_down_button: Button = $"UI/TouchControls/AimCluster/AimBox/PowerRow/PowerDownButton"
@onready var _touch_power_up_button: Button = $"UI/TouchControls/AimCluster/AimBox/PowerRow/PowerUpButton"
@onready var _touch_fire_button: Button = $"UI/TouchControls/AimCluster/AimBox/FireButton"
@onready var _touch_weapon1_button: Button = $"UI/TouchControls/AimCluster/AimBox/WeaponRow/Weapon1Button"
@onready var _touch_weapon2_button: Button = $"UI/TouchControls/AimCluster/AimBox/WeaponRow/Weapon2Button"
@onready var _touch_weapon3_button: Button = $"UI/TouchControls/AimCluster/AimBox/WeaponRow/Weapon3Button"

@onready var _main_menu: Control = $"UI/MainMenu"
@onready var _main_menu_bg: TextureRect = $"UI/MainMenu/BgImage"
@onready var _main_menu_p1_portrait: TextureRect = $"UI/MainMenu/Center/Panel/VBox/PortraitRow/P1Portrait"
@onready var _main_menu_p2_portrait: TextureRect = $"UI/MainMenu/Center/Panel/VBox/PortraitRow/P2Portrait"
@onready var _main_menu_start_button: Button = $"UI/MainMenu/Center/Panel/VBox/StartButton"
@onready var _main_menu_settings_button: Button = $"UI/MainMenu/Center/Panel/VBox/SettingsButton"
@onready var _main_menu_quit_button: Button = $"UI/MainMenu/Center/Panel/VBox/QuitButton"

@onready var _pause_menu: Control = $"UI/PauseMenu"
@onready var _pause_menu_bg: TextureRect = $"UI/PauseMenu/BgImage"
@onready var _pause_resume_button: Button = $"UI/PauseMenu/Center/Panel/VBox/ResumeButton"
@onready var _pause_restart_button: Button = $"UI/PauseMenu/Center/Panel/VBox/RestartButton"
@onready var _pause_settings_button: Button = $"UI/PauseMenu/Center/Panel/VBox/SettingsButton"
@onready var _pause_main_menu_button: Button = $"UI/PauseMenu/Center/Panel/VBox/MainMenuButton"

@onready var _settings_menu: Control = $"UI/SettingsMenu"
@onready var _settings_menu_bg: TextureRect = $"UI/SettingsMenu/BgImage"
@onready var _settings_touch_enabled: CheckBox = $"UI/SettingsMenu/Center/Panel/VBox/TouchEnabled"
@onready var _settings_touch_layout_option: OptionButton = $"UI/SettingsMenu/Center/Panel/VBox/TouchLayoutRow/TouchLayoutOption"
@onready var _settings_back_button: Button = $"UI/SettingsMenu/Center/Panel/VBox/BackButton"

@onready var _ui_click_sfx: AudioStreamPlayer = $"Audio/UiClick"
@onready var _fire_sfx: AudioStreamPlayer = $"Audio/Fire"
@onready var _impact_sfx: AudioStreamPlayer = $"Audio/Impact"

func _ready() -> void:
	randomize()
	_ensure_input_map()
	_load_settings()
	_load_original_assets()
	_init_weapons()
	_wire_ui()
	_apply_settings_to_ui()
	_show_screen(UiScreen.MAIN_MENU)
	_update_ui()
	queue_redraw()

func _ensure_input_map() -> void:
	_ensure_action_key(ACTION_MOVE_LEFT, KEY_A)
	_ensure_action_key(ACTION_MOVE_RIGHT, KEY_D)
	_ensure_action_key(ACTION_AIM_LEFT, KEY_LEFT)
	_ensure_action_key(ACTION_AIM_RIGHT, KEY_RIGHT)
	_ensure_action_key(ACTION_POWER_UP, KEY_UP)
	_ensure_action_key(ACTION_POWER_DOWN, KEY_DOWN)
	_ensure_action_key(ACTION_FIRE, KEY_SPACE)
	_ensure_action_key(ACTION_WEAPON_1, KEY_1)
	_ensure_action_key(ACTION_WEAPON_2, KEY_2)
	_ensure_action_key(ACTION_WEAPON_3, KEY_3)
	_ensure_action_key(ACTION_RESET_MATCH, KEY_R)
	_ensure_action_key(ACTION_PAUSE, KEY_ESCAPE)
	_ensure_action_key(ACTION_PAUSE, KEY_P)

func _ensure_action_key(action: String, keycode: int) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	for ev in InputMap.action_get_events(action):
		if ev is InputEventKey and (ev as InputEventKey).keycode == keycode:
			return
	var e := InputEventKey.new()
	e.keycode = keycode
	InputMap.action_add_event(action, e)

func _load_settings() -> void:
	var cfg := ConfigFile.new()
	var err := cfg.load(SETTINGS_FILE)
	if err == OK:
		_touch_overlay_enabled = bool(cfg.get_value("ui", "touch_overlay", OS.has_feature("mobile")))
		_touch_layout = int(cfg.get_value("ui", "touch_layout", TOUCH_LAYOUT_RIGHT_HANDED))
	else:
		_touch_overlay_enabled = OS.has_feature("mobile")
		_touch_layout = TOUCH_LAYOUT_RIGHT_HANDED

	_touch_layout = clampi(_touch_layout, TOUCH_LAYOUT_RIGHT_HANDED, TOUCH_LAYOUT_LEFT_HANDED)

func _save_settings() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("ui", "touch_overlay", _touch_overlay_enabled)
	cfg.set_value("ui", "touch_layout", _touch_layout)
	cfg.save(SETTINGS_FILE)

func _load_original_assets() -> void:
	_bg_texture = _try_load_texture(ORIGINAL_BG_IMAGE_PATH)
	_p1_texture = _try_load_texture(ORIGINAL_P1_IMAGE_PATH)
	_p2_texture = _try_load_texture(ORIGINAL_P2_IMAGE_PATH)

	if _bg_texture != null:
		_apply_menu_background(_main_menu_bg, _bg_texture, 0.55)
		_apply_menu_background(_pause_menu_bg, _bg_texture, 0.45)
		_apply_menu_background(_settings_menu_bg, _bg_texture, 0.45)

	if _p1_texture != null:
		_apply_portrait(_main_menu_p1_portrait, _p1_texture)
	if _p2_texture != null:
		_apply_portrait(_main_menu_p2_portrait, _p2_texture)

	_ui_click_sfx.stream = _try_load_audio_stream(ORIGINAL_SFX_UI_CLICK_PATH)
	_fire_sfx.stream = _try_load_audio_stream(ORIGINAL_SFX_FIRE_PATH)
	_impact_sfx.stream = _try_load_audio_stream(ORIGINAL_SFX_IMPACT_PATH)

	_ui_click_sfx.volume_db = -10.0
	_fire_sfx.volume_db = -8.0
	_impact_sfx.volume_db = -6.0

func _try_load_texture(res_path: String) -> Texture2D:
	var res = load(res_path)
	return res as Texture2D if res is Texture2D else null

func _try_load_audio_stream(res_path: String) -> AudioStream:
	var res = load(res_path)
	return res as AudioStream if res is AudioStream else null

func _apply_menu_background(rect: TextureRect, tex: Texture2D, alpha: float) -> void:
	if rect == null or tex == null:
		return
	rect.texture = tex
	rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	rect.modulate = Color(1.0, 1.0, 1.0, clampf(alpha, 0.0, 1.0))

func _apply_portrait(rect: TextureRect, tex: Texture2D) -> void:
	if rect == null or tex == null:
		return
	rect.texture = tex
	rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	rect.modulate = Color(1.0, 1.0, 1.0, 1.0)

func _play_sfx(player: AudioStreamPlayer) -> void:
	if player == null:
		return
	if player.stream == null:
		return
	player.stop()
	player.play()

func _wire_ui() -> void:
	_hud_pause_button.pressed.connect(func():
		_play_sfx(_ui_click_sfx)
		_toggle_pause()
	)
	_hud_settings_button.pressed.connect(func():
		_play_sfx(_ui_click_sfx)
		_open_settings(UiScreen.PLAYING)
	)
	_hud_restart_button.pressed.connect(func():
		_play_sfx(_ui_click_sfx)
		_restart_match()
	)

	_main_menu_start_button.pressed.connect(func():
		_play_sfx(_ui_click_sfx)
		_start_game()
	)
	_main_menu_settings_button.pressed.connect(func():
		_play_sfx(_ui_click_sfx)
		_open_settings(UiScreen.MAIN_MENU)
	)
	_main_menu_quit_button.pressed.connect(func():
		_play_sfx(_ui_click_sfx)
		get_tree().quit()
	)

	_pause_resume_button.pressed.connect(func():
		_play_sfx(_ui_click_sfx)
		_resume_game()
	)
	_pause_restart_button.pressed.connect(func():
		_play_sfx(_ui_click_sfx)
		_restart_match()
	)
	_pause_settings_button.pressed.connect(func():
		_play_sfx(_ui_click_sfx)
		_open_settings(UiScreen.PAUSED)
	)
	_pause_main_menu_button.pressed.connect(func():
		_play_sfx(_ui_click_sfx)
		_go_to_main_menu()
	)

	_settings_back_button.pressed.connect(func():
		_play_sfx(_ui_click_sfx)
		_close_settings()
	)
	_settings_touch_enabled.toggled.connect(func(on: bool): _set_touch_overlay_enabled(on))
	_settings_touch_layout_option.item_selected.connect(func(idx: int): _set_touch_layout(idx))

	_settings_touch_layout_option.clear()
	_settings_touch_layout_option.add_item("Right-handed", TOUCH_LAYOUT_RIGHT_HANDED)
	_settings_touch_layout_option.add_item("Left-handed", TOUCH_LAYOUT_LEFT_HANDED)

	_bind_hold_button(_touch_move_left_button, ACTION_MOVE_LEFT)
	_bind_hold_button(_touch_move_right_button, ACTION_MOVE_RIGHT)
	_bind_hold_button(_touch_aim_left_button, ACTION_AIM_LEFT)
	_bind_hold_button(_touch_aim_right_button, ACTION_AIM_RIGHT)
	_bind_hold_button(_touch_power_down_button, ACTION_POWER_DOWN)
	_bind_hold_button(_touch_power_up_button, ACTION_POWER_UP)

	_touch_fire_button.pressed.connect(func(): _request_fire())
	_touch_weapon1_button.pressed.connect(func(): _set_weapon_for_current(0))
	_touch_weapon2_button.pressed.connect(func(): _set_weapon_for_current(1))
	_touch_weapon3_button.pressed.connect(func(): _set_weapon_for_current(2))

func _bind_hold_button(btn: BaseButton, action: String) -> void:
	btn.button_down.connect(func(): Input.action_press(action))
	btn.button_up.connect(func(): Input.action_release(action))
	btn.focus_mode = Control.FOCUS_NONE

func _apply_settings_to_ui() -> void:
	_settings_touch_enabled.set_pressed_no_signal(_touch_overlay_enabled)
	_settings_touch_layout_option.select(_touch_layout)
	_apply_touch_layout()

func _apply_touch_layout() -> void:
	# Swap clusters for left-handed mode.
	var margin := 24.0
	var move_w := 300.0
	var move_h := 124.0
	var aim_w := 340.0
	var aim_h := 332.0

	if _touch_layout == TOUCH_LAYOUT_LEFT_HANDED:
		_touch_move_cluster.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
		_touch_move_cluster.offset_left = -(margin + move_w)
		_touch_move_cluster.offset_right = -margin
		_touch_move_cluster.offset_top = -(margin + move_h)
		_touch_move_cluster.offset_bottom = -margin

		_touch_aim_cluster.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
		_touch_aim_cluster.offset_left = margin
		_touch_aim_cluster.offset_right = margin + aim_w
		_touch_aim_cluster.offset_top = -(margin + aim_h)
		_touch_aim_cluster.offset_bottom = -margin
	else:
		_touch_move_cluster.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
		_touch_move_cluster.offset_left = margin
		_touch_move_cluster.offset_right = margin + move_w
		_touch_move_cluster.offset_top = -(margin + move_h)
		_touch_move_cluster.offset_bottom = -margin

		_touch_aim_cluster.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
		_touch_aim_cluster.offset_left = -(margin + aim_w)
		_touch_aim_cluster.offset_right = -margin
		_touch_aim_cluster.offset_top = -(margin + aim_h)
		_touch_aim_cluster.offset_bottom = -margin

func _set_touch_overlay_enabled(on: bool) -> void:
	_play_sfx(_ui_click_sfx)
	_touch_overlay_enabled = on
	_save_settings()
	_show_screen(_ui_screen)

func _set_touch_layout(layout_idx: int) -> void:
	_play_sfx(_ui_click_sfx)
	_touch_layout = clampi(layout_idx, TOUCH_LAYOUT_RIGHT_HANDED, TOUCH_LAYOUT_LEFT_HANDED)
	_save_settings()
	_apply_settings_to_ui()
	_show_screen(_ui_screen)

func _show_screen(screen: UiScreen) -> void:
	if _ui_screen == UiScreen.PLAYING and screen != UiScreen.PLAYING:
		_release_input_actions()
	_ui_screen = screen

	_main_menu.visible = (screen == UiScreen.MAIN_MENU)
	_pause_menu.visible = (screen == UiScreen.PAUSED)
	_settings_menu.visible = (screen == UiScreen.SETTINGS)

	_hud.visible = _game_active and screen != UiScreen.MAIN_MENU
	_touch_controls.visible = _game_active and _touch_overlay_enabled and screen == UiScreen.PLAYING

func _release_input_actions() -> void:
	Input.action_release(ACTION_MOVE_LEFT)
	Input.action_release(ACTION_MOVE_RIGHT)
	Input.action_release(ACTION_AIM_LEFT)
	Input.action_release(ACTION_AIM_RIGHT)
	Input.action_release(ACTION_POWER_UP)
	Input.action_release(ACTION_POWER_DOWN)

func _start_game() -> void:
	_game_active = true
	_init_match()
	_show_screen(UiScreen.PLAYING)

func _restart_match() -> void:
	_game_active = true
	_message = ""
	_init_match()
	_show_screen(UiScreen.PLAYING)

func _go_to_main_menu() -> void:
	_game_active = false
	_show_screen(UiScreen.MAIN_MENU)

func _toggle_pause() -> void:
	if not _game_active:
		return
	if _ui_screen == UiScreen.PLAYING:
		_show_screen(UiScreen.PAUSED)
	elif _ui_screen == UiScreen.PAUSED:
		_show_screen(UiScreen.PLAYING)

func _resume_game() -> void:
	if _ui_screen == UiScreen.PAUSED:
		_show_screen(UiScreen.PLAYING)

func _open_settings(from_screen: UiScreen) -> void:
	_screen_before_settings = from_screen
	_show_screen(UiScreen.SETTINGS)

func _close_settings() -> void:
	_show_screen(_screen_before_settings)

func _handle_global_actions() -> void:
	if Input.is_action_just_pressed(ACTION_PAUSE):
		if _ui_screen == UiScreen.SETTINGS:
			_close_settings()
		else:
			_toggle_pause()

	if Input.is_action_just_pressed(ACTION_RESET_MATCH) and _game_active:
		_restart_match()

func _request_fire() -> void:
	if not _game_active:
		return
	if _ui_screen != UiScreen.PLAYING:
		return
	if _phase != Phase.AIM or _projectile_active or _cooldown > 0.0:
		return
	if _tanks.is_empty():
		return
	var tank := _tanks[_current_tank_idx]
	if tank.hp <= 0.0:
		return
	_fire(tank)

func _init_match() -> void:
	_phase = Phase.AIM
	_message = ""
	_cooldown = 0.0
	_projectile_active = false
	_projectile_pos = Vector2.ZERO
	_projectile_vel = Vector2.ZERO
	_current_tank_idx = 0
	_init_terrain()
	_init_tanks()
	_start_turn(_current_tank_idx)
	_update_ui()
	queue_redraw()

func _init_weapons() -> void:
	_weapons.clear()
	_weapons.append(Weapon.new(
		"Cannon",
		DEFAULT_BLAST_RADIUS,
		DEFAULT_CRATER_RADIUS,
		70.0,
		1.0,
		DEFAULT_PROJECTILE_RADIUS,
		Color(1.0, 0.9, 0.4)
	))
	_weapons.append(Weapon.new(
		"Heavy",
		92.0,
		72.0,
		90.0,
		0.85,
		5.0,
		Color(1.0, 0.75, 0.35)
	))
	_weapons.append(Weapon.new(
		"Sniper",
		56.0,
		36.0,
		60.0,
		1.25,
		3.0,
		Color(0.75, 0.9, 1.0)
	))

func _start_turn(player_idx: int) -> void:
	_current_tank_idx = clampi(player_idx, 0, _tanks.size() - 1)
	_turn_fuel_left = TURN_FUEL_MAX
	_turn_time_left = TURN_TIME_SEC
	_wind_accel = randf_range(WIND_ACCEL_MIN, WIND_ACCEL_MAX)
	if absf(_wind_accel) < 25.0:
		_wind_accel = 0.0

func _process(delta: float) -> void:
	_handle_global_actions()

	if not _game_active:
		_update_ui()
		queue_redraw()
		return

	if _ui_screen != UiScreen.PLAYING:
		_update_ui()
		queue_redraw()
		return

	if Input.is_action_just_pressed(ACTION_WEAPON_1):
		_set_weapon_for_current(0)
	if Input.is_action_just_pressed(ACTION_WEAPON_2):
		_set_weapon_for_current(1)
	if Input.is_action_just_pressed(ACTION_WEAPON_3):
		_set_weapon_for_current(2)

	if Input.is_action_just_pressed(ACTION_FIRE):
		_request_fire()

	if _phase == Phase.GAMEOVER:
		_update_ui()
		queue_redraw()
		return

	_tick_tanks(delta)

	if _projectile_active:
		_tick_projectile(delta)
	else:
		_tick_aim(delta)

	if _cooldown > 0.0:
		_cooldown = maxf(0.0, _cooldown - delta)
		if _cooldown == 0.0 and _phase == Phase.EXPLODING:
			_end_turn_or_game()

	_update_ui()
	queue_redraw()

func _tick_aim(delta: float) -> void:
	if _cooldown > 0.0:
		return
	_phase = Phase.AIM

	var tank := _tanks[_current_tank_idx]
	if tank.hp <= 0.0:
		_end_turn_or_game()
		return

	_turn_time_left = maxf(0.0, _turn_time_left - delta)
	if _turn_time_left == 0.0 and not _projectile_active:
		_message = "Timer expired!"
		_fire(tank)
		return

	_try_move_tank(tank, delta)

	var angle_delta := ANGLE_SPEED_DEG_PER_SEC * delta
	var aim_axis := Input.get_action_strength(ACTION_AIM_RIGHT) - Input.get_action_strength(ACTION_AIM_LEFT)
	if absf(aim_axis) > 0.01:
		tank.aim_angle_deg = clampf(
			tank.aim_angle_deg + aim_axis * angle_delta,
			ANGLE_MIN_DEG,
			ANGLE_MAX_DEG
		)

	var power_delta := POWER_SPEED_PER_SEC * delta
	var power_axis := Input.get_action_strength(ACTION_POWER_UP) - Input.get_action_strength(ACTION_POWER_DOWN)
	if absf(power_axis) > 0.01:
		tank.power = clampf(tank.power + power_axis * power_delta, POWER_MIN, POWER_MAX)

func _try_move_tank(tank: Tank, delta: float) -> void:
	if _turn_fuel_left <= 0.0:
		return
	if tank.vel.length_squared() > 0.0001:
		return

	var ground_y := _terrain_surface_y(tank.pos.x) - TANK_RADIUS
	if absf(tank.pos.y - ground_y) > 0.75:
		return

	var move_dir := 0
	if Input.is_action_pressed(ACTION_MOVE_LEFT):
		move_dir -= 1
	if Input.is_action_pressed(ACTION_MOVE_RIGHT):
		move_dir += 1
	if move_dir == 0:
		return

	var desired_x := tank.pos.x + float(move_dir) * MOVE_SPEED_PX_PER_SEC * delta
	desired_x = clampf(desired_x, TANK_RADIUS, float(VIEWPORT_WIDTH) - TANK_RADIUS)
	desired_x = _avoid_tank_overlap(tank, desired_x)
	desired_x = clampf(desired_x, TANK_RADIUS, float(VIEWPORT_WIDTH) - TANK_RADIUS)

	var dist := absf(desired_x - tank.pos.x)
	var fuel_cost := dist * FUEL_COST_PER_PX
	if fuel_cost > _turn_fuel_left:
		var allowed_dist := _turn_fuel_left / FUEL_COST_PER_PX
		desired_x = tank.pos.x + float(move_dir) * allowed_dist
		desired_x = clampf(desired_x, TANK_RADIUS, float(VIEWPORT_WIDTH) - TANK_RADIUS)
		desired_x = _avoid_tank_overlap(tank, desired_x)
		desired_x = clampf(desired_x, TANK_RADIUS, float(VIEWPORT_WIDTH) - TANK_RADIUS)

		dist = absf(desired_x - tank.pos.x)
		fuel_cost = dist * FUEL_COST_PER_PX

	tank.pos.x = desired_x
	_turn_fuel_left = maxf(0.0, _turn_fuel_left - fuel_cost)

func _avoid_tank_overlap(moving_tank: Tank, desired_x: float) -> float:
	var min_sep := TANK_RADIUS * 2.0 + 10.0
	for tank in _tanks:
		if tank == moving_tank:
			continue
		if tank.hp <= 0.0:
			continue
		var dx := desired_x - tank.pos.x
		if absf(dx) < min_sep:
			desired_x = tank.pos.x + (min_sep if dx >= 0.0 else -min_sep)
	return desired_x

func _tick_tanks(delta: float) -> void:
	for tank in _tanks:
		if tank.hp <= 0.0:
			continue
		var ground_y := _terrain_surface_y(tank.pos.x) - TANK_RADIUS
		if tank.pos.y < ground_y:
			tank.vel.y += GRAVITY * delta
			tank.pos.y += tank.vel.y * delta
			if tank.pos.y >= ground_y:
				tank.pos.y = ground_y
				tank.vel = Vector2.ZERO
		else:
			tank.pos.y = ground_y
			tank.vel = Vector2.ZERO

func _tick_projectile(delta: float) -> void:
	_phase = Phase.FIRING
	_projectile_vel.x += _wind_accel * delta
	_projectile_vel.y += GRAVITY * delta
	_projectile_pos += _projectile_vel * delta

	if _projectile_pos.x < -50.0 or _projectile_pos.x > float(VIEWPORT_WIDTH) + 50.0:
		_explode_at(Vector2(clampf(_projectile_pos.x, 0.0, float(VIEWPORT_WIDTH)), clampf(_projectile_pos.y, 0.0, float(VIEWPORT_HEIGHT))))
		return
	if _projectile_pos.y > float(VIEWPORT_HEIGHT) + 50.0:
		_explode_at(Vector2(clampf(_projectile_pos.x, 0.0, float(VIEWPORT_WIDTH)), float(VIEWPORT_HEIGHT)))
		return

	# Tank collision (cheap circle test)
	for tank in _tanks:
		if tank.hp <= 0.0:
			continue
		if tank.pos.distance_to(_projectile_pos) <= (TANK_RADIUS + _projectile_radius):
			_explode_at(_projectile_pos)
			return

	# Terrain collision (heightmap)
	if _projectile_pos.y >= _terrain_surface_y(_projectile_pos.x):
		_explode_at(Vector2(_projectile_pos.x, _terrain_surface_y(_projectile_pos.x)))

func _fire(tank: Tank) -> void:
	if _weapons.is_empty():
		return
	var weapon_idx := clampi(tank.weapon_idx, 0, _weapons.size() - 1)
	var weapon := _weapons[weapon_idx]
	var angle_rad := deg_to_rad(tank.aim_angle_deg)
	var dir := Vector2(cos(angle_rad) * tank.facing_sign(), -sin(angle_rad)).normalized()

	_projectile_weapon_idx = weapon_idx
	_projectile_radius = weapon.projectile_radius
	_projectile_color = weapon.projectile_color
	_projectile_active = true
	_projectile_pos = tank.pos + dir * (TANK_RADIUS + _projectile_radius + 2.0)
	_projectile_vel = dir * tank.power * weapon.speed_multiplier
	_message = ""
	_play_sfx(_fire_sfx)

func _explode_at(center: Vector2) -> void:
	_projectile_active = false
	_projectile_vel = Vector2.ZERO
	_phase = Phase.EXPLODING
	_cooldown = EXPLOSION_COOLDOWN_SEC
	_play_sfx(_impact_sfx)

	var weapon := _weapons[_projectile_weapon_idx] if not _weapons.is_empty() else null
	if weapon != null:
		_carve_crater(center, weapon.crater_radius)
		_apply_explosion_damage(center, weapon.blast_radius, weapon.max_damage)
		_message = "%s impact!" % weapon.name
	else:
		_carve_crater(center, DEFAULT_CRATER_RADIUS)
		_apply_explosion_damage(center, DEFAULT_BLAST_RADIUS, 70.0)
		_message = "Boom!"

func _apply_explosion_damage(center: Vector2, radius: float, max_damage: float) -> void:
	for tank in _tanks:
		if tank.hp <= 0.0:
			continue
		var dist := tank.pos.distance_to(center)
		if dist > radius:
			continue
		var t := clampf(dist / radius, 0.0, 1.0)
		var damage := lerpf(max_damage, 0.0, t)
		tank.hp = maxf(0.0, tank.hp - damage)

func _end_turn_or_game() -> void:
	var alive := []
	for i in range(_tanks.size()):
		if _tanks[i].hp > 0.0:
			alive.append(i)

	if alive.size() <= 1:
		_phase = Phase.GAMEOVER
		if alive.size() == 1:
			_message = "Player %d wins! Press R to reset." % int(alive[0] + 1)
		else:
			_message = "Draw! Press R to reset."
		return

	# Next living player
	var next_idx := (_current_tank_idx + 1) % _tanks.size()
	while _tanks[next_idx].hp <= 0.0:
		next_idx = (next_idx + 1) % _tanks.size()
	_start_turn(next_idx)
	_phase = Phase.AIM
	_message = ""

func _set_weapon_for_current(weapon_idx: int) -> void:
	if _cooldown > 0.0 or _projectile_active or _phase != Phase.AIM:
		return
	if _weapons.is_empty():
		return
	var tank := _tanks[_current_tank_idx]
	if tank.hp <= 0.0:
		return
	tank.weapon_idx = clampi(weapon_idx, 0, _weapons.size() - 1)

func _init_tanks() -> void:
	_tanks.clear()
	var p1x := 240.0
	var p2x := 1040.0
	var p1y := _terrain_surface_y(p1x) - TANK_RADIUS
	var p2y := _terrain_surface_y(p2x) - TANK_RADIUS

	var tank1 := Tank.new(0, Vector2(p1x, p1y), Color(0.2, 0.9, 0.5))
	var tank2 := Tank.new(1, Vector2(p2x, p2y), Color(0.9, 0.3, 0.2))
	tank2.aim_angle_deg = 45.0
	tank2.power = 520.0

	_tanks.append(tank1)
	_tanks.append(tank2)

func _init_terrain() -> void:
	var noise := FastNoiseLite.new()
	noise.seed = 1337
	noise.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	noise.frequency = 0.003

	var sample_count := int(VIEWPORT_WIDTH / TERRAIN_STEP) + 1
	_terrain_y.resize(sample_count)

	for i in range(sample_count):
		var x := float(i) * TERRAIN_STEP
		var n := noise.get_noise_1d(x)
		var y := TERRAIN_BASE_Y + n * TERRAIN_AMPLITUDE
		_terrain_y[i] = clampf(y, TERRAIN_MIN_Y, TERRAIN_MAX_Y)

	# A couple smoothing passes to avoid extreme spikes
	for _pass in range(2):
		for i in range(1, sample_count - 1):
			_terrain_y[i] = (_terrain_y[i - 1] + _terrain_y[i] + _terrain_y[i + 1]) / 3.0

	_rebuild_terrain_geometry()

func _terrain_surface_y(x: float) -> float:
	var clamped_x := clampf(x, 0.0, float(VIEWPORT_WIDTH))
	var fx := clamped_x / float(TERRAIN_STEP)
	var i0 := clampi(int(floor(fx)), 0, _terrain_y.size() - 1)
	var i1: int = mini(i0 + 1, _terrain_y.size() - 1)
	var t := fx - float(i0)
	return lerpf(_terrain_y[i0], _terrain_y[i1], t)

func _carve_crater(center: Vector2, radius: float) -> void:
	var radius2 := radius * radius
	var i_center := int(round(center.x / float(TERRAIN_STEP)))
	var i_radius := int(ceil(radius / float(TERRAIN_STEP)))
	var start_i: int = maxi(0, i_center - i_radius)
	var end_i: int = mini(_terrain_y.size() - 1, i_center + i_radius)

	for i in range(start_i, end_i + 1):
		var x := float(i) * TERRAIN_STEP
		var dx := x - center.x
		var dx2 := dx * dx
		if dx2 > radius2:
			continue
		var dy := sqrt(radius2 - dx2)
		var circle_bottom := center.y + dy
		if circle_bottom > _terrain_y[i]:
			_terrain_y[i] = minf(circle_bottom, float(VIEWPORT_HEIGHT))

	_rebuild_terrain_geometry()

func _rebuild_terrain_geometry() -> void:
	_terrain_polyline.clear()
	var sample_count := _terrain_y.size()
	_terrain_polyline.resize(sample_count)
	for i in range(sample_count):
		_terrain_polyline[i] = Vector2(float(i) * TERRAIN_STEP, _terrain_y[i])

	_terrain_fill = _terrain_polyline.duplicate()
	_terrain_fill.append(Vector2(float(VIEWPORT_WIDTH), float(VIEWPORT_HEIGHT)))
	_terrain_fill.append(Vector2(0.0, float(VIEWPORT_HEIGHT)))

func _update_ui() -> void:
	if _hud_stats_label == null or _hud_message_label == null or _hud_help_label == null:
		return
	if not _game_active:
		_hud_stats_label.text = ""
		_hud_message_label.text = ""
		_hud_help_label.text = ""
		return

	var current := _tanks[_current_tank_idx] if _tanks.size() > 0 else null
	var p1hp := int(round(_tanks[0].hp)) if _tanks.size() > 0 else 0
	var p2hp := int(round(_tanks[1].hp)) if _tanks.size() > 1 else 0

	var weapon_name := "?"
	if current != null and not _weapons.is_empty():
		var idx := clampi(current.weapon_idx, 0, _weapons.size() - 1)
		weapon_name = _weapons[idx].name

	var phase_text := "Aim"
	match _phase:
		Phase.AIM:
			phase_text = "Aim"
		Phase.FIRING:
			phase_text = "Firing"
		Phase.EXPLODING:
			phase_text = "Impact"
		Phase.GAMEOVER:
			phase_text = "Game Over"

	var current_player := 0
	var angle := 0.0
	var power := 0.0
	if current != null:
		current_player = current.id + 1
		angle = current.aim_angle_deg
		power = current.power

	var lines := PackedStringArray()
	lines.append("Phase: %s" % phase_text)
	lines.append("Turn: Player %d    Weapon: %s" % [current_player, weapon_name])
	lines.append("Angle: %d deg    Power: %d" % [int(round(angle)), int(round(power))])
	lines.append(
		"Wind: %s    Fuel: %d    Timer: %d"
		% [_format_wind(), int(round(_turn_fuel_left)), int(ceil(_turn_time_left))]
	)
	lines.append("HP: P1 %d    P2 %d" % [p1hp, p2hp])

	_hud_stats_label.text = "\n".join(lines)
	_hud_message_label.text = _message
	_hud_help_label.text = (
		"Touch: use on-screen controls (Settings). Keyboard still works. Esc: pause. R: restart."
		if _touch_overlay_enabled
		else "Keyboard: A/D move, Arrows aim/power, Space fire, 1-3 weapons, Esc pause, R restart."
	)

func _format_wind() -> String:
	if absf(_wind_accel) < 0.001:
		return "calm"
	var arrow := "->" if _wind_accel > 0.0 else "<-"
	return "%s %d" % [arrow, int(round(absf(_wind_accel)))]

func _draw() -> void:
	# Background
	draw_rect(Rect2(Vector2.ZERO, Vector2(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)), Color(0.05, 0.06, 0.08), true)
	if _bg_texture != null:
		draw_texture_rect(_bg_texture, Rect2(Vector2.ZERO, Vector2(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)), false, Color(1.0, 1.0, 1.0, 0.24))

	# Terrain
	if _terrain_fill.size() >= 3:
		draw_colored_polygon(_terrain_fill, Color(0.12, 0.16, 0.18))
	if _terrain_polyline.size() >= 2:
		draw_polyline(_terrain_polyline, Color(0.25, 0.35, 0.4), 2.0)

	# Tanks
	for tank in _tanks:
		if tank.hp <= 0.0:
			continue
		draw_circle(tank.pos, TANK_RADIUS, tank.color)
		draw_circle(tank.pos, TANK_RADIUS - 6.0, Color(0.02, 0.02, 0.03, 0.35))

		# Turret / aim indicator (only for current player)
		if tank.id == _tanks[_current_tank_idx].id and _phase != Phase.GAMEOVER:
			var angle_rad := deg_to_rad(tank.aim_angle_deg)
			var dir := Vector2(cos(angle_rad) * tank.facing_sign(), -sin(angle_rad)).normalized()
			draw_line(tank.pos, tank.pos + dir * 48.0, Color(1.0, 1.0, 1.0, 0.9), 2.0)

	# Projectile
	if _projectile_active:
		draw_circle(_projectile_pos, _projectile_radius, _projectile_color)
