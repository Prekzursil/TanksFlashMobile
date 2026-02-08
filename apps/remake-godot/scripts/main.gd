extends Node2D

const VIEWPORT_WIDTH := 1280
const VIEWPORT_HEIGHT := 720

const TERRAIN_STEP := 4
const TERRAIN_BASE_Y := 470.0
const TERRAIN_AMPLITUDE := 140.0
const TERRAIN_MIN_Y := 220.0
const TERRAIN_MAX_Y := VIEWPORT_HEIGHT - 60.0

const GRAVITY := 900.0

const TANK_RADIUS := 18.0
const PROJECTILE_RADIUS := 4.0
const BLAST_RADIUS := 72.0
const CRATER_RADIUS := 56.0

const ANGLE_MIN_DEG := 5.0
const ANGLE_MAX_DEG := 85.0
const ANGLE_SPEED_DEG_PER_SEC := 70.0

const POWER_MIN := 180.0
const POWER_MAX := 900.0
const POWER_SPEED_PER_SEC := 360.0

const EXPLOSION_COOLDOWN_SEC := 0.65

class Tank:
	var id: int
	var pos: Vector2
	var vel := Vector2.ZERO
	var hp := 100.0
	var aim_angle_deg := 45.0
	var power := 520.0
	var color: Color

	func _init(id_value: int, start_pos: Vector2, color_value: Color) -> void:
		id = id_value
		pos = start_pos
		color = color_value

	func facing_sign() -> float:
		return 1.0 if id == 0 else -1.0

enum Phase { AIM, FIRING, EXPLODING, GAMEOVER }

var _phase := Phase.AIM
var _message := ""
var _cooldown := 0.0

var _terrain_y := PackedFloat32Array()
var _terrain_polyline := PackedVector2Array()
var _terrain_fill := PackedVector2Array()

var _tanks: Array[Tank] = []
var _current_tank_idx := 0

var _projectile_active := false
var _projectile_pos := Vector2.ZERO
var _projectile_vel := Vector2.ZERO

@onready var _status_label: Label = $"UI/Hud/Panel/VBox/StatusLabel"
@onready var _help_label: Label = $"UI/Hud/Panel/VBox/HelpLabel"

func _ready() -> void:
	randomize()
	_init_match()

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
	_update_ui()
	queue_redraw()

func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventKey):
		return
	var key_event := event as InputEventKey
	if not key_event.pressed or key_event.echo:
		return

	match key_event.keycode:
		KEY_R:
			_init_match()
		KEY_SPACE:
			if _phase == Phase.AIM and not _projectile_active and _cooldown <= 0.0:
				_fire(_tanks[_current_tank_idx])

func _process(delta: float) -> void:
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

	var angle_delta := ANGLE_SPEED_DEG_PER_SEC * delta
	if Input.is_key_pressed(KEY_LEFT):
		tank.aim_angle_deg = clampf(tank.aim_angle_deg - angle_delta, ANGLE_MIN_DEG, ANGLE_MAX_DEG)
	if Input.is_key_pressed(KEY_RIGHT):
		tank.aim_angle_deg = clampf(tank.aim_angle_deg + angle_delta, ANGLE_MIN_DEG, ANGLE_MAX_DEG)

	var power_delta := POWER_SPEED_PER_SEC * delta
	if Input.is_key_pressed(KEY_DOWN):
		tank.power = clampf(tank.power - power_delta, POWER_MIN, POWER_MAX)
	if Input.is_key_pressed(KEY_UP):
		tank.power = clampf(tank.power + power_delta, POWER_MIN, POWER_MAX)

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
		if tank.pos.distance_to(_projectile_pos) <= (TANK_RADIUS + PROJECTILE_RADIUS):
			_explode_at(_projectile_pos)
			return

	# Terrain collision (heightmap)
	if _projectile_pos.y >= _terrain_surface_y(_projectile_pos.x):
		_explode_at(Vector2(_projectile_pos.x, _terrain_surface_y(_projectile_pos.x)))

func _fire(tank: Tank) -> void:
	var angle_rad := deg_to_rad(tank.aim_angle_deg)
	var dir := Vector2(cos(angle_rad) * tank.facing_sign(), -sin(angle_rad)).normalized()

	_projectile_active = true
	_projectile_pos = tank.pos + dir * (TANK_RADIUS + PROJECTILE_RADIUS + 2.0)
	_projectile_vel = dir * tank.power
	_message = ""

func _explode_at(center: Vector2) -> void:
	_projectile_active = false
	_projectile_vel = Vector2.ZERO
	_phase = Phase.EXPLODING
	_cooldown = EXPLOSION_COOLDOWN_SEC

	_carve_crater(center, CRATER_RADIUS)
	_apply_explosion_damage(center, BLAST_RADIUS)
	_message = "Boom!"

func _apply_explosion_damage(center: Vector2, radius: float) -> void:
	var max_damage := 70.0
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
	_current_tank_idx = next_idx
	_phase = Phase.AIM
	_message = ""

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
	var i1 := min(i0 + 1, _terrain_y.size() - 1)
	var t := fx - float(i0)
	return lerpf(_terrain_y[i0], _terrain_y[i1], t)

func _carve_crater(center: Vector2, radius: float) -> void:
	var radius2 := radius * radius
	var i_center := int(round(center.x / float(TERRAIN_STEP)))
	var i_radius := int(ceil(radius / float(TERRAIN_STEP)))
	var start_i := max(0, i_center - i_radius)
	var end_i := min(_terrain_y.size() - 1, i_center + i_radius)

	for i in range(start_i, end_i + 1):
		var x := float(i) * TERRAIN_STEP
		var dx := x - center.x
		var dx2 := dx * dx
		if dx2 > radius2:
			continue
		var dy := sqrt(radius2 - dx2)
		var circle_bottom := center.y + dy
		if circle_bottom > _terrain_y[i]:
			_terrain_y[i] = min(circle_bottom, float(VIEWPORT_HEIGHT))

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
	if _status_label == null or _help_label == null:
		return

	var current := _tanks[_current_tank_idx] if _tanks.size() > 0 else null
	var p1hp := int(round(_tanks[0].hp)) if _tanks.size() > 0 else 0
	var p2hp := int(round(_tanks[1].hp)) if _tanks.size() > 1 else 0

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
	lines.append("Turn: Player %d" % current_player)
	lines.append("Angle: %d deg   Power: %d" % [int(round(angle)), int(round(power))])
	lines.append("HP: P1 %d   P2 %d" % [p1hp, p2hp])
	if _message != "":
		lines.append(_message)

	_status_label.text = "\n".join(lines)
	_help_label.text = "Left/Right: angle   Up/Down: power   Space: fire   R: reset"

func _draw() -> void:
	# Background
	draw_rect(Rect2(Vector2.ZERO, Vector2(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)), Color(0.05, 0.06, 0.08), true)

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
		draw_circle(_projectile_pos, PROJECTILE_RADIUS, Color(1.0, 0.9, 0.4))
