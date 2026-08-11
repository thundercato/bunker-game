extends Node2D

const VERSION := "0.0.0.3"
const TILE := 32.0
const MAZE_TILE := 48.0
const WALK_SPEED := 96.0
const RUN_SPEED := 144.0
const PLAYER_RADIUS := 10.0
const INTERACT_RANGE := 86.0
const MAZE_ORIGIN := Vector2(2300, 120)
const ROOM_ORIGIN := Vector2(4300, 180)

const ZONES := [
	{"name": "LIVING QUARTERS", "rect": Rect2(64, 96, 576, 448), "framed": true},
	{"name": "CENTRAL CORRIDOR", "rect": Rect2(640, 224, 576, 192), "framed": false},
	{"name": "TRAINING ROOM", "rect": Rect2(1216, 96, 640, 480), "framed": true},
	{"name": "LOWER PASSAGE", "rect": Rect2(800, 416, 288, 576), "framed": false},
]
const PROPS := [
	Rect2(6 * TILE, 7 * TILE, 64, 32), Rect2(15 * TILE, 13 * TILE, 32, 32),
	Rect2(44 * TILE, 6 * TILE, 32, 32), Rect2(53 * TILE, 14 * TILE, 32, 32),
	Rect2(29 * TILE, 25 * TILE, 64, 32),
]

var state: BunkerGameState
var inventory: BunkerInventory
var maze_generator := BunkerLabyrinthGenerator.new()
var maze: Dictionary = {}
var active_room: Dictionary = {}
var enemies: Array[Dictionary] = []
var targets: Array[Dictionary] = []
var player := Vector2(352, 388)
var facing := Vector2.DOWN
var mode := "bunker"
var entered := false
var ui_open := false
var transition_locked := false
var running_touch := false
var use_held := false
var attack_held := false
var reload_held := false
var switch_held := false
var knife_flying := false
var knife_velocity := Vector2.ZERO
var knife_throw_start := Vector2.ZERO
var damage_lock := 0.0
var save_clock := 0.0
var clock_accumulator := 0.0
var filling := 0.0
var toast_clock := 0.0
var maintenance_id := ""
var maintenance_tool := "brush"
var maintenance_touch := false
var maintenance_last := Vector2.ZERO
var maintenance_distance := 0.0

var camera: Camera2D
var ui_layer: CanvasLayer
var lighting_layer: CanvasLayer
var lighting_rect: ColorRect
var lighting_material: ShaderMaterial
var joystick: BunkerTouchJoystick
var hud: Control
var time_label: Label
var area_label: Label
var prompt_label: Label
var health_bar: ProgressBar
var hunger_bar: ProgressBar
var thirst_bar: ProgressBar
var stamina_bar: ProgressBar
var weapon_label: Label
var toast_label: Label
var controls: Control
var modal: ColorRect
var modal_panel: PanelContainer
var modal_vbox: VBoxContainer
var fade_rect: ColorRect

func _ready() -> void:
	state = BunkerGameState.new()
	inventory = BunkerInventory.new(state)
	player = state.player_position
	mode = state.current_mode
	_build_camera()
	_build_ui()
	_build_targets()
	_restore_world()
	queue_redraw()

func _build_camera() -> void:
	camera = Camera2D.new()
	camera.position = Vector2(352, 320)
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 8.0
	add_child(camera)
	camera.make_current()

func _build_ui() -> void:
	lighting_layer = CanvasLayer.new()
	lighting_layer.layer = 5
	add_child(lighting_layer)
	lighting_rect = ColorRect.new()
	lighting_rect.position = Vector2.ZERO
	lighting_rect.size = Vector2(1280, 720)
	lighting_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	lighting_material = ShaderMaterial.new()
	lighting_material.shader = load("res://ui/lighting.gdshader")
	lighting_rect.material = lighting_material
	lighting_layer.add_child(lighting_rect)

	ui_layer = CanvasLayer.new()
	ui_layer.layer = 10
	add_child(ui_layer)
	hud = Control.new()
	hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui_layer.add_child(hud)

	area_label = _label(Vector2(20, 18), Vector2(330, 32), 16, Color("72dc89"))
	time_label = _label(Vector2(1110, 18), Vector2(145, 36), 20, Color("96f0a4"))
	time_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	weapon_label = _label(Vector2(470, 18), Vector2(340, 30), 14, Color("e5d49d"))
	weapon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt_label = _label(Vector2(430, 624), Vector2(420, 42), 16, Color("f6e6ae"))
	prompt_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt_label.visible = false
	toast_label = _label(Vector2(390, 96), Vector2(500, 44), 15, Color("dfffe5"))
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.visible = false

	health_bar = _bar(Vector2(20, 58), "HEALTH")
	hunger_bar = _bar(Vector2(20, 86), "HUNGER")
	thirst_bar = _bar(Vector2(20, 114), "THIRST")
	stamina_bar = _bar(Vector2(20, 142), "STAMINA")

	controls = Control.new()
	controls.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui_layer.add_child(controls)
	joystick = BunkerTouchJoystick.new()
	joystick.position = Vector2.ZERO
	joystick.size = Vector2(1280, 720)
	controls.add_child(joystick)
	_add_action_button("USE", Vector2(1138, 555), Vector2(116, 58), _use)
	_add_action_button("ATTACK", Vector2(1008, 620), Vector2(116, 58), _attack)
	_add_action_button("THROW", Vector2(1138, 620), Vector2(116, 58), _throw_knife)
	_add_action_button("RELOAD", Vector2(1008, 555), Vector2(116, 58), _reload)
	_add_action_button("SWITCH", Vector2(1008, 490), Vector2(116, 52), _switch_weapon)
	var run_button := _add_action_button("RUN", Vector2(1138, 490), Vector2(116, 52), Callable())
	run_button.button_down.connect(func() -> void: running_touch = true)
	run_button.button_up.connect(func() -> void: running_touch = false)
	_add_action_button("BACKPACK", Vector2(548, 660), Vector2(184, 48), _open_backpack)

	modal = ColorRect.new()
	modal.color = Color(0.0, 0.015, 0.02, 0.93)
	modal.position = Vector2.ZERO
	modal.size = Vector2(1280, 720)
	modal.visible = false
	ui_layer.add_child(modal)
	modal_panel = PanelContainer.new()
	modal_panel.position = Vector2(270, 54)
	modal_panel.size = Vector2(740, 612)
	modal.add_child(modal_panel)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 24)
	margin.add_theme_constant_override("margin_right", 24)
	margin.add_theme_constant_override("margin_top", 20)
	margin.add_theme_constant_override("margin_bottom", 20)
	modal_panel.add_child(margin)
	modal_vbox = VBoxContainer.new()
	modal_vbox.add_theme_constant_override("separation", 10)
	margin.add_child(modal_vbox)

	fade_rect = ColorRect.new()
	fade_rect.color = Color.BLACK
	fade_rect.position = Vector2.ZERO
	fade_rect.size = Vector2(1280, 720)
	fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fade_rect.modulate.a = 0.0
	ui_layer.add_child(fade_rect)

	var version := _label(Vector2(1190, 698), Vector2(82, 16), 10, Color("84978c"))
	version.text = "v%s" % VERSION
	_update_hud()
	_show_start()

func _label(position: Vector2, size: Vector2, font_size: int, colour: Color) -> Label:
	var label := Label.new()
	label.position = position
	label.size = size
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", colour)
	hud.add_child(label)
	return label

func _bar(position: Vector2, title: String) -> ProgressBar:
	var label := _label(position, Vector2(82, 20), 11, Color("c8d3ce"))
	label.text = title
	var bar := ProgressBar.new()
	bar.position = position + Vector2(78, 1)
	bar.size = Vector2(170, 16)
	bar.min_value = 0
	bar.max_value = 100
	bar.show_percentage = false
	hud.add_child(bar)
	return bar

func _add_action_button(text: String, position: Vector2, size: Vector2, action: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.position = position
	button.size = size
	button.add_theme_font_size_override("font_size", 13)
	if action.is_valid():
		button.pressed.connect(action)
	controls.add_child(button)
	return button

func _show_start() -> void:
	_open_modal("BUNKER", "GODOT SURVIVAL BUILD\n\nv%s\n\nAll current systems migrated. Saves persist on this device." % VERSION)
	_add_modal_button("TAP TO ENTER", _begin_game)
	controls.visible = false

func _begin_game() -> void:
	entered = true
	_close_modal()
	_show_toast("BUNKER ONLINE")

func _restore_world() -> void:
	if mode == "maze" or mode == "room":
		var seed := state.maze_seed if state.maze_seed != 0 else randi()
		maze = maze_generator.generate(seed)
		_merge_room_state()
		_spawn_enemies()
		if mode == "room" and maze.rooms.has(state.current_room_id):
			active_room = maze.rooms[state.current_room_id]
		else:
			mode = "maze"
	else:
		mode = "bunker"
		player = state.player_position if _bunker_walkable(state.player_position) else Vector2(352, 388)
	_update_camera(true)

func _physics_process(delta: float) -> void:
	if not entered:
		return
	damage_lock = maxf(0.0, damage_lock - delta)
	toast_clock = maxf(0.0, toast_clock - delta)
	if toast_clock <= 0.0:
		toast_label.visible = false

	var move := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if joystick.value.length() > move.length():
		move = joystick.value
	var running := (Input.is_action_pressed("run") or running_touch) and state.stamina > 0.0 and move.length() > 0.05
	if transition_locked or ui_open or filling > 0.0:
		move = Vector2.ZERO
	if move.length() > 0.05:
		move = move.limit_length(1.0)
		facing = _cardinal(move)
		_try_move(Vector2(move.x * (RUN_SPEED if running else WALK_SPEED) * delta, 0))
		_try_move(Vector2(0, move.y * (RUN_SPEED if running else WALK_SPEED) * delta))

	state.advance(delta, running, ui_open)
	clock_accumulator += delta
	if clock_accumulator >= 60.0:
		state.game_minutes = (state.game_minutes + int(clock_accumulator / 60.0)) % (24 * 60)
		clock_accumulator = fmod(clock_accumulator, 60.0)
	if filling > 0.0:
		filling -= delta
		_show_toast("FILLING FLASK  %d%%" % int(clampf(1.0 - filling / 2.0, 0.0, 1.0) * 100.0), 0.2)
		if filling <= 0.0:
			_show_toast(inventory.fill_flask())

	_handle_action_edges()
	_update_knife(delta)
	_update_enemies(delta)
	_update_targets(delta)
	_update_camera(false)
	_update_lighting()
	_update_prompt()
	_update_hud()
	save_clock += delta
	if save_clock >= 5.0:
		save_clock = 0.0
		_store_world_state()
	queue_redraw()

func _handle_action_edges() -> void:
	var use_pressed := Input.is_action_pressed("use")
	if use_pressed and not use_held:
		_use()
	use_held = use_pressed
	var attack_pressed := Input.is_action_pressed("attack")
	if attack_pressed and not attack_held:
		_attack()
	attack_held = attack_pressed
	var reload_pressed := Input.is_action_pressed("reload")
	if reload_pressed and not reload_held:
		_reload()
	reload_held = reload_pressed
	var switch_pressed := Input.is_action_pressed("switch_weapon")
	if switch_pressed and not switch_held:
		_switch_weapon()
	switch_held = switch_pressed
	if Input.is_action_just_pressed("backpack"):
		_open_backpack()
	if Input.is_action_just_pressed("back") and ui_open:
		_close_modal()

func _cardinal(value: Vector2) -> Vector2:
	if absf(value.x) > absf(value.y):
		return Vector2.RIGHT if value.x > 0 else Vector2.LEFT
	return Vector2.DOWN if value.y > 0 else Vector2.UP

func _try_move(amount: Vector2) -> void:
	if amount == Vector2.ZERO:
		return
	var candidate := player + amount
	if _walkable(candidate):
		player = candidate

func _walkable(position: Vector2) -> bool:
	if mode == "bunker":
		return _bunker_walkable(position)
	if mode == "maze":
		var tile := Vector2i(floori((position.x - MAZE_ORIGIN.x) / MAZE_TILE), floori((position.y - MAZE_ORIGIN.y) / MAZE_TILE))
		return maze_generator.is_walkable(maze, tile)
	if mode == "room":
		return _room_walkable(position)
	return false

func _bunker_walkable(position: Vector2) -> bool:
	var inside := false
	for zone in ZONES:
		var rect: Rect2 = zone.rect
		if rect.grow(-TILE - PLAYER_RADIUS).has_point(position):
			inside = true
			break
		if rect.has_point(position):
			var tile := Vector2i(floori(position.x / TILE), floori(position.y / TILE))
			if not _is_bunker_wall(tile.x, tile.y):
				inside = true
				break
	if not inside:
		return false
	for prop in PROPS:
		if prop.grow(PLAYER_RADIUS).has_point(position):
			return false
	return true

func _room_walkable(position: Vector2) -> bool:
	if active_room.is_empty():
		return false
	var bounds := Rect2(ROOM_ORIGIN + Vector2(MAZE_TILE, MAZE_TILE), Vector2((int(active_room.width) - 2) * MAZE_TILE, (int(active_room.height) - 2) * MAZE_TILE))
	if not bounds.has_point(position):
		return false
	for furniture in active_room.furniture:
		var tile: Vector2i = furniture.tile
		var rect := Rect2(ROOM_ORIGIN + Vector2(tile) * MAZE_TILE + Vector2(5, 7), Vector2(MAZE_TILE - 10, MAZE_TILE - 14))
		if rect.grow(PLAYER_RADIUS).has_point(position):
			return false
	return true

func _is_bunker_wall(tile_x: int, tile_y: int) -> bool:
	var point := Vector2(tile_x * TILE + 1, tile_y * TILE + 1)
	for zone in ZONES:
		var rect: Rect2 = zone.rect
		if not rect.has_point(point):
			continue
		var local := point - rect.position
		var edge := local.x < TILE or local.y < TILE or local.x >= rect.size.x - TILE or local.y >= rect.size.y - TILE
		if not edge:
			return false
		var open := false
		match zone.name:
			"LIVING QUARTERS": open = local.x >= rect.size.x - TILE and local.y >= 5 * TILE and local.y <= 8 * TILE
			"CENTRAL CORRIDOR": open = (local.x < TILE and local.y >= TILE and local.y <= 4 * TILE) or (local.x >= rect.size.x - TILE and local.y >= TILE and local.y <= 4 * TILE) or (local.y >= rect.size.y - TILE and local.x >= 4 * TILE and local.x <= 12 * TILE)
			"TRAINING ROOM": open = local.x < TILE and local.y >= 5 * TILE and local.y <= 8 * TILE
			"LOWER PASSAGE": open = local.y < TILE and local.x >= 2 * TILE and local.x <= 6 * TILE
		return not open
	return true

func _update_camera(immediate: bool) -> void:
	var target_position := player
	var target_zoom := 1.4
	if mode == "bunker":
		for zone in ZONES:
			if zone.rect.has_point(player) and bool(zone.framed):
				target_position = zone.rect.get_center()
				target_zoom = minf((1280.0 - 70.0) / zone.rect.size.x, (720.0 - 70.0) / zone.rect.size.y)
				break
	elif mode == "room" and not active_room.is_empty():
		var size := Vector2(int(active_room.width), int(active_room.height)) * MAZE_TILE
		target_position = ROOM_ORIGIN + size / 2.0
		target_zoom = clampf(minf(1280.0 / (size.x + 72.0), 720.0 / (size.y + 72.0)), 0.72, 1.35)
	else:
		target_zoom = 1.0
	if immediate:
		camera.position = target_position
		camera.zoom = Vector2.ONE * target_zoom
	else:
		camera.position = camera.position.lerp(target_position, 0.12)
		camera.zoom = camera.zoom.lerp(Vector2.ONE * target_zoom, 0.12)

func _update_lighting() -> void:
	lighting_rect.visible = mode in ["maze", "room"] and entered
	if not lighting_rect.visible:
		return
	var screen := (player - camera.position) * camera.zoom.x + Vector2(640, 360)
	lighting_material.set_shader_parameter("player_uv", screen / Vector2(1280, 720))
	lighting_material.set_shader_parameter("facing", facing)
	lighting_material.set_shader_parameter("room_mode", mode == "room")
	lighting_material.set_shader_parameter("ambient_radius", 0.72 if mode == "room" else 0.18)
	var beam := 0.0
	if mode == "maze":
		var tile := Vector2i(floori((player.x - MAZE_ORIGIN.x) / MAZE_TILE), floori((player.y - MAZE_ORIGIN.y) / MAZE_TILE))
		beam = maze_generator.beam_cells(maze, tile, Vector2i(facing), 12) * MAZE_TILE * camera.zoom.x / 720.0
	lighting_material.set_shader_parameter("beam_length", maxf(0.08, beam))

func _use() -> void:
	if ui_open or transition_locked or not entered:
		return
	var nearby := _nearby()
	match nearby:
		"storage": _open_storage()
		"bunk": _open_sleep()
		"weapons": _open_weapon_station()
		"faucet":
			filling = 2.0
			_show_toast("FILLING FLASK")
		"maze-entrance": _enter_maze()
		"maze-exit": _leave_maze()
		"knife": _retrieve_knife()
		"room-exit": _exit_room()
		_:
			if nearby.begins_with("door:"):
				_enter_room(nearby.trim_prefix("door:"))
			elif nearby.begins_with("furniture:"):
				_interact_furniture(nearby.trim_prefix("furniture:"))

func _nearby() -> String:
	if mode == "bunker":
		var points := {
			"bunk": Vector2(7 * TILE, 9 * TILE),
			"storage": Vector2(7 * TILE, 14 * TILE),
			"weapons": Vector2(16 * TILE, 8 * TILE),
			"faucet": Vector2(560, 176),
			"maze-entrance": Vector2(352, 442),
		}
		for id in points:
			if player.distance_to(points[id]) <= INTERACT_RANGE:
				return id
	elif mode == "maze":
		var entrance: Vector2i = maze.entrance
		if player.distance_to(_maze_world(entrance)) <= INTERACT_RANGE:
			return "maze-exit"
		for door in maze.doors:
			if player.distance_to(_maze_world(door.tile)) <= INTERACT_RANGE:
				return "door:%s" % door.room_id
		if state.knife_location == "world" and player.distance_to(state.knife_world_position) <= 64:
			return "knife"
	elif mode == "room":
		var exit := _room_exit_position()
		if player.distance_to(exit) <= INTERACT_RANGE:
			return "room-exit"
		for furniture in active_room.furniture:
			var position := ROOM_ORIGIN + Vector2(furniture.tile) * MAZE_TILE + Vector2.ONE * MAZE_TILE / 2.0
			if player.distance_to(position) <= INTERACT_RANGE:
				return "furniture:%s" % furniture.id
	return ""

func _update_prompt() -> void:
	var nearby := "" if ui_open else _nearby()
	prompt_label.visible = nearby != ""
	if nearby == "":
		return
	var text := "USE - INTERACT"
	match nearby:
		"storage": text = "USE - STORAGE TRUNK"
		"bunk": text = "USE - SLEEP"
		"weapons": text = "USE - WEAPON STATION"
		"faucet": text = "USE - FILL FLASK"
		"maze-entrance": text = "USE - ENTER LABYRINTH"
		"maze-exit": text = "USE - RETURN TO BUNKER"
		"room-exit": text = "USE - RETURN TO LABYRINTH"
		"knife": text = "USE - RETRIEVE KNIFE"
		_:
			if nearby.begins_with("door:"): text = "USE - ENTER EXPLORATION ROOM"
			elif nearby.begins_with("furniture:"): text = "USE - INSPECT"
	prompt_label.text = text

func _enter_maze() -> void:
	if transition_locked:
		return
	transition_locked = true
	await _fade(true)
	state.maze_seed = randi()
	maze = maze_generator.generate(state.maze_seed)
	_merge_room_state()
	_spawn_enemies()
	mode = "maze"
	state.current_mode = mode
	player = _maze_world(maze.spawn)
	await _fade(false)
	transition_locked = false
	_store_world_state()

func _leave_maze() -> void:
	if transition_locked:
		return
	transition_locked = true
	await _fade(true)
	mode = "bunker"
	state.current_mode = mode
	player = Vector2(352, 388)
	active_room = {}
	await _fade(false)
	transition_locked = false
	_store_world_state()

func _enter_room(room_id: String) -> void:
	if transition_locked or not maze.rooms.has(room_id):
		return
	transition_locked = true
	state.maze_return_position = player
	await _fade(true)
	active_room = maze.rooms[room_id]
	active_room.visited = true
	mode = "room"
	state.current_room_id = room_id
	state.current_mode = mode
	player = _room_exit_position() + Vector2.UP * MAZE_TILE * 1.35
	await _fade(false)
	transition_locked = false
	_store_world_state()

func _exit_room() -> void:
	if transition_locked:
		return
	transition_locked = true
	await _fade(true)
	_persist_active_room()
	mode = "maze"
	state.current_mode = mode
	player = state.maze_return_position
	active_room = {}
	await _fade(false)
	transition_locked = false
	_store_world_state()

func _fade(out: bool) -> void:
	var tween := create_tween()
	tween.tween_property(fade_rect, "modulate:a", 1.0 if out else 0.0, 0.42)
	await tween.finished

func _maze_world(tile: Vector2i) -> Vector2:
	return MAZE_ORIGIN + Vector2(tile) * MAZE_TILE + Vector2.ONE * MAZE_TILE / 2.0

func _room_exit_position() -> Vector2:
	if active_room.is_empty():
		return ROOM_ORIGIN
	return ROOM_ORIGIN + Vector2(int(active_room.width) / 2.0 * MAZE_TILE + MAZE_TILE / 2.0, (int(active_room.height) - 1) * MAZE_TILE + MAZE_TILE / 2.0)

func _merge_room_state() -> void:
	for room_id in maze.rooms:
		if state.room_states.has(room_id):
			maze.rooms[room_id].merge(state.room_states[room_id], true)

func _persist_active_room() -> void:
	if not active_room.is_empty():
		state.room_states[active_room.id] = active_room.duplicate(true)

func _interact_furniture(id: String) -> void:
	for furniture in active_room.furniture:
		if furniture.id != id:
			continue
		if furniture.kind == "chest":
			if furniture.locked:
				_show_toast("CHEST LOCKED")
			elif not furniture.opened:
				furniture.opened = true
				var loot_ids := ["apple", "ration-pack", "crackers"]
				var loot_id: String = loot_ids[abs(hash(id)) % loot_ids.size()]
				state.inventory[loot_id]["location"] = "backpack"
				_show_toast("CHEST OPENED - %s FOUND" % state.inventory[loot_id]["name"])
			else:
				_show_toast("CHEST EMPTY")
		else:
			_show_toast("%s - NOTHING USEFUL" % str(furniture.kind).to_upper())
		_persist_active_room()
		state.save()
		return

func _spawn_enemies() -> void:
	enemies.clear()
	var tiles := maze_generator.open_tiles(maze, maze.spawn, 6)
	var rng := RandomNumberGenerator.new()
	rng.seed = int(maze.seed) ^ 0x74a1
	for index in mini(34, tiles.size()):
		var kind := "spider" if rng.randf() < 0.55 else "rat"
		enemies.append({
			"position": _maze_world(tiles[index]),
			"health": 1 if kind == "spider" else 2,
			"kind": kind,
			"direction": Vector2.from_angle(rng.randf_range(0, TAU)),
			"turn": rng.randf_range(0.5, 1.4),
			"alive": true,
		})

func _update_enemies(delta: float) -> void:
	if mode != "maze" or ui_open:
		return
	for enemy in enemies:
		if not enemy.alive:
			continue
		enemy.turn = float(enemy.turn) - delta
		if enemy.turn <= 0.0:
			enemy.turn = randf_range(0.65, 1.35)
			enemy.direction = Vector2.from_angle(randf_range(0, TAU))
		var candidate: Vector2 = enemy.position + enemy.direction * 34.0 * delta
		var tile := Vector2i(floori((candidate.x - MAZE_ORIGIN.x) / MAZE_TILE), floori((candidate.y - MAZE_ORIGIN.y) / MAZE_TILE))
		if maze_generator.is_walkable(maze, tile):
			enemy.position = candidate
		else:
			enemy.turn = 0.0
		if damage_lock <= 0.0 and player.distance_to(enemy.position) < 30.0:
			damage_lock = 0.9
			state.health = maxf(0.0, state.health - 12.0)
			_show_toast("%s ATTACK - HEALTH %d" % [str(enemy.kind).to_upper(), int(state.health)])
			if state.health <= 0.0:
				_open_death()

func _attack() -> void:
	if ui_open or transition_locked:
		return
	if state.pistol_armed:
		_fire_pistol()
		return
	if state.knife_location != "armed":
		_show_toast("NO WEAPON ARMED")
		return
	state.knife_sharpness = maxf(0.0, state.knife_sharpness - 0.15)
	if mode == "maze":
		var target := _nearest_enemy(64.0, false)
		if not target.is_empty():
			target.health = int(target.health) - 1
			if target.health <= 0: target.alive = false
			_show_toast("KNIFE HIT")
		else:
			_show_toast("KNIFE SWING")
	else:
		_show_toast("KNIFE SWING")

func _throw_knife() -> void:
	if ui_open or state.knife_location != "armed" or transition_locked:
		return
	state.knife_location = "world"
	state.inventory.knife.location = "world"
	state.knife_world_position = player + facing * 28.0
	knife_throw_start = state.knife_world_position
	knife_velocity = facing * 360.0
	knife_flying = true
	state.save()
	_show_toast("KNIFE THROWN")

func _update_knife(delta: float) -> void:
	if state.knife_location != "world" or not knife_flying:
		return
	var candidate := state.knife_world_position + knife_velocity * delta
	var can_move := false
	if mode == "maze":
		var tile := Vector2i(floori((candidate.x - MAZE_ORIGIN.x) / MAZE_TILE), floori((candidate.y - MAZE_ORIGIN.y) / MAZE_TILE))
		can_move = maze_generator.is_walkable(maze, tile)
	else:
		can_move = _walkable(candidate)
	if not can_move or candidate.distance_to(knife_throw_start) >= 820.0:
		knife_flying = false
		return
	state.knife_world_position = candidate
	if mode == "maze":
		var target := _nearest_enemy_to(candidate, 25.0)
		if not target.is_empty():
			target.health = int(target.health) - 1
			if target.health <= 0: target.alive = false
			knife_flying = false

func _retrieve_knife() -> void:
	state.knife_location = "armed"
	state.inventory.knife.location = "armed"
	state.knife_world_position = Vector2.ZERO
	knife_flying = false
	state.save()
	_show_toast("KNIFE RETRIEVED")

func _fire_pistol() -> void:
	var result := inventory.fire_pistol()
	_show_toast(result.message)
	if not result.fired:
		return
	if mode == "maze":
		var target := _nearest_enemy(520.0, true)
		if not target.is_empty():
			target.alive = false
	elif mode == "bunker":
		_resolve_target_hit()

func _nearest_enemy(distance: float, directional: bool) -> Dictionary:
	var best: Dictionary = {}
	var best_distance := distance
	for enemy in enemies:
		if not enemy.alive:
			continue
		var offset: Vector2 = enemy.position - player
		var candidate_distance := offset.length()
		if candidate_distance >= best_distance:
			continue
		if directional and offset.normalized().dot(facing) < 0.78:
			continue
		best = enemy
		best_distance = candidate_distance
	return best

func _nearest_enemy_to(position: Vector2, distance: float) -> Dictionary:
	var best: Dictionary = {}
	for enemy in enemies:
		if enemy.alive and position.distance_to(enemy.position) < distance:
			return enemy
	return best

func _reload() -> void:
	if ui_open:
		return
	_show_toast(inventory.reload_from_pouch())

func _switch_weapon() -> void:
	if ui_open:
		return
	_show_toast(inventory.switch_weapon())

func _build_targets() -> void:
	for index in 4:
		targets.append({"position": Vector2(1380 + index * 125, 260 + (index % 2) * 120), "base": Vector2(1380 + index * 125, 260 + (index % 2) * 120), "phase": float(index), "alive": true})

func _update_targets(delta: float) -> void:
	for target in targets:
		target.phase = float(target.phase) + delta * 0.9
		target.position = target.base + Vector2(sin(float(target.phase)) * 55.0, 0)

func _resolve_target_hit() -> void:
	for target in targets:
		if target.alive and player.distance_to(target.position) < 620 and (target.position - player).normalized().dot(facing) > 0.83:
			target.alive = false
			_show_toast("TARGET DOWN")
			return

func _open_storage() -> void:
	_open_modal("STORAGE TRUNK", "6 x 3 physical storage")
	var grid := GridContainer.new()
	grid.columns = 6
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	modal_vbox.add_child(grid)
	var slots := inventory.storage_slots()
	for index in 18:
		var button := Button.new()
		button.custom_minimum_size = Vector2(108, 72)
		var item = slots[index]
		button.text = "EMPTY" if item == null else _short_item(item)
		button.disabled = item == null
		if item != null:
			button.pressed.connect(_open_item.bind(str(item.id), "storage"))
		grid.add_child(button)
	_add_modal_button("BACK", _close_modal)

func _open_backpack() -> void:
	if ui_open or not entered:
		return
	_open_modal("BACKPACK", "Carried items and equipped kit")
	var equipped := Label.new()
	equipped.text = "EQUIPPED: %s\nPOUCHES: %s" % [_weapon_status(), ", ".join(state.equipped_pouches)]
	equipped.add_theme_font_size_override("font_size", 14)
	modal_vbox.add_child(equipped)
	var grid := GridContainer.new()
	grid.columns = 4
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	modal_vbox.add_child(grid)
	var carried := inventory.items_at("backpack")
	for index in 12:
		var button := Button.new()
		button.custom_minimum_size = Vector2(158, 70)
		var item: Variant = carried[index] if index < carried.size() else null
		button.text = "EMPTY" if item == null else _short_item(item)
		button.disabled = item == null
		if item != null:
			button.pressed.connect(_open_item.bind(str(item.id), "backpack"))
		grid.add_child(button)
	_add_modal_button("BACK", _close_modal)

func _short_item(item: Dictionary) -> String:
	var kind := str(item.get("kind", ""))
	if kind in ["magazine", "ammo"]:
		return "%s\n%d RDS" % [item.name, int(item.get("rounds", 0))]
	if item.id == "flask":
		return "WATER FLASK\n%d%%" % int(item.get("fill", 0))
	return str(item.name)

func _open_item(id: String, source: String) -> void:
	if not state.inventory.has(id):
		return
	var item: Dictionary = state.inventory[id]
	_open_modal(str(item.name), inventory.describe(item))
	if source == "storage":
		_add_modal_button("TAKE", func() -> void: _show_toast(inventory.take(id)); _open_storage())
	if source == "backpack":
		if item.kind == "knife":
			_add_modal_button("ARM", func() -> void: _show_toast(inventory.arm(id)); _close_modal())
		elif item.kind == "pistol":
			_add_modal_button("ARM" if not state.pistol_armed else "UNARM", func() -> void: _show_toast(inventory.unarm(id) if state.pistol_armed else inventory.arm(id)); _open_backpack())
			_add_modal_button("LOAD MAGAZINE", _load_first_magazine)
			_add_modal_button("REMOVE MAGAZINE", func() -> void: _show_toast(inventory.remove_magazine()); _open_item(id, source))
			_add_modal_button("RACK SLIDE", func() -> void: _show_toast(inventory.rack_slide()); _open_item(id, source))
		elif item.kind == "magazine":
			_add_modal_button("LOAD ROUNDS", func() -> void: _show_toast(inventory.load_magazine(id)); _open_item(id, source))
			_add_modal_button("UNLOAD ROUNDS", func() -> void: _show_toast(inventory.unload_magazine_rounds(id)); _open_item(id, source))
			_add_modal_button("MOVE TO POUCH", func() -> void: _show_toast(inventory.move_to_pouch(id)); _open_backpack())
		elif item.kind in ["food", "liquid"]:
			_add_modal_button("EAT" if item.kind == "food" else "DRINK", func() -> void: _show_toast(inventory.consume(id)); _open_backpack())
	_add_modal_button("BACK", _open_storage if source == "storage" else _open_backpack)

func _load_first_magazine() -> void:
	var magazines := inventory.items_at("backpack").filter(func(item: Dictionary) -> bool: return item.kind == "magazine")
	if magazines.is_empty():
		_show_toast("NO MAGAZINE IN BACKPACK")
	else:
		_show_toast(inventory.insert_magazine(str(magazines[0].id)))
	_open_item("makarov", "backpack")

func _open_sleep() -> void:
	_open_modal("YOUR BUNK", "Choose how long to sleep. Hunger and thirst continue to fall.")
	for hours in [1, 4, 8, 12]:
		_add_modal_button("SLEEP %d HOURS" % hours, _sleep.bind(hours))
	_add_modal_button("BACK", _close_modal)

func _sleep(hours: int) -> void:
	var result := state.sleep_hours(hours)
	_close_modal()
	if result.woke_early:
		_show_toast("YOU WOKE EARLY - HUNGER OR THIRST TOO LOW")
	else:
		_show_toast("SLEPT %d HOURS" % hours)

func _open_weapon_station() -> void:
	_open_modal("WEAPON-CLEANING TABLE", "Maintain each physical weapon and magazine. Select a tool, then rub across the maintenance surface.")
	_add_modal_button("UTILITY KNIFE", _open_maintenance.bind("knife"))
	_add_modal_button("MAKAROV PM", _open_maintenance.bind("makarov"))
	for id in ["makarov-mag-1", "makarov-mag-2"]:
		_add_modal_button(str(state.inventory[id].name), _open_maintenance.bind(id))
	_add_modal_button("BACK", _close_modal)

func _open_maintenance(id: String) -> void:
	maintenance_id = id
	maintenance_tool = "stone" if id == "knife" else "spray"
	_open_modal("MAINTENANCE - %s" % state.inventory[id].name, _maintenance_readout())
	var tools := HBoxContainer.new()
	tools.alignment = BoxContainer.ALIGNMENT_CENTER
	modal_vbox.add_child(tools)
	for tool in (["STONE", "BRUSH"] if id == "knife" else ["SPRAY", "BRUSH", "ROD"]):
		var button := Button.new()
		button.text = tool
		button.custom_minimum_size = Vector2(140, 44)
		button.pressed.connect(func() -> void: maintenance_tool = tool.to_lower(); _show_toast("%s SELECTED" % tool))
		tools.add_child(button)
	var pad := ColorRect.new()
	pad.color = Color("25332f")
	pad.custom_minimum_size = Vector2(640, 260)
	pad.mouse_filter = Control.MOUSE_FILTER_STOP
	pad.gui_input.connect(_maintenance_input)
	modal_vbox.add_child(pad)
	var instruction := Label.new()
	instruction.text = "DRAG BACK AND FORTH ACROSS THE EQUIPMENT"
	instruction.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	modal_vbox.add_child(instruction)
	_add_modal_button("DONE", _open_weapon_station)

func _maintenance_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch or event is InputEventMouseButton:
		maintenance_touch = event.pressed
		maintenance_last = event.position
		if maintenance_tool == "spray" and event.pressed:
			state.maintenance[maintenance_id] = float(state.maintenance.get(maintenance_id, 0.0)) + 5.0
			_show_toast("CLEANER APPLIED")
	elif (event is InputEventScreenDrag or event is InputEventMouseMotion) and maintenance_touch:
		maintenance_distance += event.position.distance_to(maintenance_last)
		maintenance_last = event.position
		if maintenance_distance >= 36.0:
			maintenance_distance = 0.0
			if maintenance_id == "knife":
				state.knife_sharpness = minf(100.0, state.knife_sharpness + (1.4 if maintenance_tool == "stone" else 0.45))
			elif maintenance_id == "makarov":
				state.gun_health = mini(200, state.gun_health + 1)
			else:
				state.magazine_health[maintenance_id] = mini(100, int(state.magazine_health.get(maintenance_id, 100)) + 1)
			state.maintenance[maintenance_id] = minf(100.0, float(state.maintenance.get(maintenance_id, 0.0)) + 1.0)
			state.save()
			if modal_vbox.get_child_count() > 1 and modal_vbox.get_child(1) is Label:
				modal_vbox.get_child(1).text = _maintenance_readout()

func _maintenance_readout() -> String:
	if maintenance_id == "knife":
		return "Sharpness %d%%\nCondition %d%%" % [int(state.knife_sharpness), int(state.maintenance.get(maintenance_id, 0))]
	if maintenance_id == "makarov":
		return "Health %d/200\nCleanliness %d%%" % [state.gun_health, int(state.maintenance.get(maintenance_id, 0))]
	return "Health %d/100\nCleanliness %d%%" % [int(state.magazine_health.get(maintenance_id, 100)), int(state.maintenance.get(maintenance_id, 0))]

func _open_death() -> void:
	_open_modal("YOU DIED", "The bunker goes quiet.")
	_add_modal_button("RESTART", func() -> void: DirAccess.remove_absolute(ProjectSettings.globalize_path(BunkerGameState.SAVE_PATH)); get_tree().reload_current_scene())

func _open_modal(title: String, body: String) -> void:
	ui_open = true
	modal.visible = true
	controls.visible = false
	for child in modal_vbox.get_children():
		child.queue_free()
	var heading := Label.new()
	heading.text = title
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	heading.add_theme_font_size_override("font_size", 24)
	heading.add_theme_color_override("font_color", Color("7bea90"))
	modal_vbox.add_child(heading)
	var copy := Label.new()
	copy.text = body
	copy.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	copy.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	copy.add_theme_font_size_override("font_size", 15)
	copy.custom_minimum_size = Vector2(650, 54)
	modal_vbox.add_child(copy)

func _add_modal_button(text: String, action: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(0, 44)
	button.add_theme_font_size_override("font_size", 15)
	button.pressed.connect(action)
	modal_vbox.add_child(button)
	return button

func _close_modal() -> void:
	ui_open = false
	modal.visible = false
	controls.visible = entered
	maintenance_touch = false

func _show_toast(message: String, duration := 1.8) -> void:
	toast_label.text = message
	toast_label.visible = true
	toast_clock = duration

func _update_hud() -> void:
	time_label.text = state.format_time()
	health_bar.value = state.health
	hunger_bar.value = state.hunger
	thirst_bar.value = state.thirst
	stamina_bar.value = state.stamina
	area_label.text = mode.to_upper() if mode != "bunker" else _bunker_area()
	weapon_label.text = _weapon_status()

func _bunker_area() -> String:
	for zone in ZONES:
		if zone.rect.has_point(player):
			return zone.name
	return "BUNKER"

func _weapon_status() -> String:
	if state.pistol_armed:
		var magazine: Dictionary = state.inventory.get(state.inserted_magazine, {})
		return "MAKAROV  %s+%d" % ["1" if state.chambered_round else "0", int(magazine.get("rounds", 0))]
	if state.knife_location == "armed":
		return "UTILITY KNIFE  %d%%" % int(state.knife_sharpness)
	return "UNARMED"

func _store_world_state() -> void:
	state.current_mode = mode
	state.player_position = player
	_persist_active_room()
	state.save()

func _draw() -> void:
	if mode == "bunker":
		_draw_bunker()
	elif mode == "maze":
		_draw_maze()
	else:
		_draw_room()
	_draw_player()
	if state.knife_location == "world":
		_draw_knife(state.knife_world_position)

func _draw_bunker() -> void:
	draw_rect(Rect2(0, 0, 1920, 1088), Color("070c0f"))
	for tile_y in 34:
		for tile_x in 60:
			var point := Vector2(tile_x * TILE + 1, tile_y * TILE + 1)
			var in_zone := false
			for zone in ZONES:
				if zone.rect.has_point(point): in_zone = true
			if not in_zone: continue
			var rect := Rect2(tile_x * TILE, tile_y * TILE, TILE, TILE)
			if _is_bunker_wall(tile_x, tile_y):
				draw_rect(rect, Color("1b272d"))
				draw_line(rect.position + Vector2(0, 22), rect.position + Vector2(32, 22), Color("617078"), 2)
			else:
				var floor_colour := Color("293034") if tile_x < 20 or tile_x >= 38 else Color("202a30")
				draw_rect(rect, floor_colour)
				draw_rect(rect.grow(-2), Color(floor_colour, 0.75), false, 1)
	for prop in PROPS:
		draw_rect(prop, Color("5b4128"))
		draw_rect(prop.grow(-4), Color("946f43"), false, 3)
	_draw_furniture()
	for target in targets:
		if target.alive:
			draw_rect(Rect2(target.position - Vector2(13, 28), Vector2(26, 56)), Color("76523a"))
			draw_circle(target.position - Vector2(0, 23), 10, Color("b0875e"))

func _draw_furniture() -> void:
	draw_rect(Rect2(7 * TILE - 80, 9 * TILE - 40, 160, 80), Color("324a36"))
	draw_rect(Rect2(16 * TILE - 80, 8 * TILE - 32, 160, 64), Color("594027"))
	draw_rect(Rect2(7 * TILE - 64, 14 * TILE - 24, 128, 48), Color("304833"))
	draw_rect(Rect2(534, 146, 52, 60), Color("263f46"))
	draw_line(Vector2(560, 150), Vector2(560, 176), Color("99bcc2"), 5)
	draw_rect(Rect2(323, 431, 58, 18), Color("43545b"))
	draw_circle(Vector2(369, 440), 3, Color("c6ad79"))

func _draw_maze() -> void:
	draw_rect(Rect2(MAZE_ORIGIN, Vector2(int(maze.width), int(maze.height)) * MAZE_TILE), Color("091012"))
	for y in int(maze.height):
		for x in int(maze.width):
			var rect := Rect2(MAZE_ORIGIN + Vector2(x, y) * MAZE_TILE, Vector2.ONE * MAZE_TILE)
			if maze.walls[y][x]:
				draw_rect(rect, Color("20282b"))
				draw_rect(rect.grow(-5), Color("384348"), false, 2)
			else:
				draw_rect(rect, Color("101719") if (x * 17 + y * 31 + int(maze.seed)) % 7 else Color("172326"))
	_draw_door(_maze_world(maze.entrance), Color("39535c"))
	for door in maze.doors:
		_draw_door(_maze_world(door.tile), Color("4b3930"))
	for enemy in enemies:
		if enemy.alive:
			if enemy.kind == "spider":
				draw_circle(enemy.position, 10, Color("2c1714"))
				for angle in 8: draw_line(enemy.position, enemy.position + Vector2.from_angle(angle * TAU / 8.0) * 16, Color("5c3930"), 2)
			else:
				draw_ellipse(enemy.position, Vector2(14, 8), Color("75695f"))

func _draw_room() -> void:
	if active_room.is_empty(): return
	var width := int(active_room.width)
	var height := int(active_room.height)
	for y in height:
		for x in width:
			var rect := Rect2(ROOM_ORIGIN + Vector2(x, y) * MAZE_TILE, Vector2.ONE * MAZE_TILE)
			var is_exit := y == height - 1 and x == width / 2
			if (x == 0 or y == 0 or x == width - 1 or y == height - 1) and not is_exit:
				draw_rect(rect, Color("303235"))
				draw_rect(rect.grow(-4), Color("50545a"), false, 2)
			else:
				draw_rect(rect, Color("17181a"))
	_draw_door(_room_exit_position(), Color("4b3930"))
	for furniture in active_room.furniture:
		var position := ROOM_ORIGIN + Vector2(furniture.tile) * MAZE_TILE + Vector2.ONE * MAZE_TILE / 2.0
		var colour := Color("58483d")
		match furniture.kind:
			"drawers": colour = Color("4d443d")
			"cupboard": colour = Color("3d4a46")
			"chest": colour = Color("4b3b2d")
		draw_rect(Rect2(position - Vector2(20, 16), Vector2(40, 32)), colour)
		draw_rect(Rect2(position - Vector2(20, 16), Vector2(40, 32)), Color("8b7562"), false, 2)
		if furniture.kind == "chest": draw_circle(position, 3, Color("c69a4a"))

func _draw_door(position: Vector2, colour: Color) -> void:
	draw_rect(Rect2(position - Vector2(29, 9), Vector2(58, 18)), colour)
	draw_rect(Rect2(position - Vector2(29, 9), Vector2(58, 18)), Color("a7c5cf"), false, 2)
	draw_circle(position + Vector2(18, 0), 3, Color("c6ad79"))

func _draw_player() -> void:
	draw_ellipse(player + Vector2(0, 12), Vector2(13, 5), Color(0, 0, 0, 0.4))
	draw_circle(player - Vector2(0, 12), 7, Color("2b3135"))
	draw_rect(Rect2(player - Vector2(9, 5), Vector2(18, 22)), Color("45664c"))
	draw_rect(Rect2(player - Vector2(7, -16), Vector2(5, 11)), Color("20262a"))
	draw_rect(Rect2(player + Vector2(2, 5), Vector2(5, 11)), Color("20262a"))
	draw_circle(player + facing * 13.0, 3.5, Color("d8c79e"))

func _draw_knife(position: Vector2) -> void:
	draw_line(position - facing * 12, position + facing * 12, Color("d2d8d5"), 5)
	draw_line(position - facing * 16, position - facing * 8, Color("6e482d"), 6)

func draw_ellipse(centre: Vector2, radius: Vector2, colour: Color) -> void:
	var points := PackedVector2Array()
	for index in 24:
		var angle := index * TAU / 24.0
		points.append(centre + Vector2(cos(angle) * radius.x, sin(angle) * radius.y))
	draw_colored_polygon(points, colour)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED:
		if state:
			_store_world_state()
