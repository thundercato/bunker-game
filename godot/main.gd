extends Node2D

const VERSION := "0.0.0.4"
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
const BUNKER_FURNITURE_COLLIDERS := [
	Rect2(160, 228, 128, 102),
	Rect2(174, 430, 100, 66),
	Rect2(438, 225, 148, 68),
	Rect2(535, 157, 50, 52),
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
var animation_time := 0.0
var player_walk_time := 0.0
var player_is_moving := false
var muzzle_flash_clock := 0.0
var muzzle_flash_position := Vector2.ZERO
var impact_clock := 0.0
var impact_position := Vector2.ZERO
var pickup_clock := 0.0
var pickup_position := Vector2.ZERO

var camera: Camera2D
var ui_layer: CanvasLayer
var pixel_assets: BunkerPixelAssets
var world_renderer: BunkerPixelWorldRenderer
var lighting_controller: BunkerLightingController
var scene_transition: BunkerSceneTransition
var joystick: BunkerTouchJoystick
var hud: Control
var hud_chrome: BunkerPixelHud
var start_backdrop: TextureRect
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
var version_label: Label
var action_buttons: Dictionary = {}

func _ready() -> void:
	state = BunkerGameState.new()
	inventory = BunkerInventory.new(state)
	pixel_assets = BunkerPixelAssets.new()
	world_renderer = BunkerPixelWorldRenderer.new(pixel_assets)
	lighting_controller = BunkerLightingController.new()
	scene_transition = BunkerSceneTransition.new()
	player = state.player_position
	mode = state.current_mode
	_build_camera()
	_build_ui()
	_build_targets()
	_restore_world()
	get_viewport().size_changed.connect(_layout_ui)
	queue_redraw()

func _build_camera() -> void:
	camera = Camera2D.new()
	camera.position = Vector2(352, 320)
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 9.0
	add_child(camera)
	camera.make_current()

func _build_ui() -> void:
	lighting_controller.attach(self)

	ui_layer = CanvasLayer.new()
	ui_layer.layer = 10
	add_child(ui_layer)
	start_backdrop = TextureRect.new()
	start_backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	start_backdrop.texture = preload("res://assets/backgrounds/start_bunker.png")
	start_backdrop.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	start_backdrop.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	start_backdrop.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	start_backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui_layer.add_child(start_backdrop)
	hud = Control.new()
	hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.theme = BunkerPixelTheme.create()
	ui_layer.add_child(hud)
	hud_chrome = BunkerPixelHud.new()
	hud_chrome.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.add_child(hud_chrome)

	area_label = _label(Vector2(24, 20), Vector2(260, 32), 16, Color("72dc89"))
	time_label = _label(Vector2(1110, 20), Vector2(145, 32), 18, Color("96f0a4"))
	time_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	weapon_label = _label(Vector2(470, 20), Vector2(340, 26), 14, Color("e5d49d"))
	weapon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt_label = _label(Vector2(430, 626), Vector2(420, 38), 15, Color("f6e6ae"))
	prompt_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt_label.visible = false
	toast_label = _label(Vector2(390, 78), Vector2(500, 42), 15, Color("dfffe5"))
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.visible = false

	health_bar = _bar(Vector2(40, 58), "HEALTH")
	hunger_bar = _bar(Vector2(40, 86), "HUNGER")
	thirst_bar = _bar(Vector2(40, 114), "THIRST")
	stamina_bar = _bar(Vector2(40, 142), "STAMINA")
	BunkerPixelTheme.apply_bar_colour(health_bar, Color("a74436"))
	BunkerPixelTheme.apply_bar_colour(hunger_bar, Color("d1a14e"))
	BunkerPixelTheme.apply_bar_colour(thirst_bar, Color("4c8191"))
	BunkerPixelTheme.apply_bar_colour(stamina_bar, Color("6fc77b"))

	controls = Control.new()
	controls.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	controls.theme = hud.theme
	ui_layer.add_child(controls)
	joystick = BunkerTouchJoystick.new()
	joystick.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
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
	modal.color = Color(0.0, 0.015, 0.02, 0.82)
	modal.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	modal.theme = hud.theme
	modal.mouse_filter = Control.MOUSE_FILTER_STOP
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
	fade_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fade_rect.modulate.a = 0.0
	ui_layer.add_child(fade_rect)

	version_label = _label(Vector2(1180, 696), Vector2(90, 18), 10, Color("84978c"))
	version_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	version_label.text = "v%s" % VERSION
	_layout_ui()
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
	var label := _label(position, Vector2(80, 20), 11, Color("c8d3ce"))
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
	button.name = text.to_pascal_case()
	button.position = position
	button.size = size
	button.add_theme_font_size_override("font_size", 13)
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	if action.is_valid():
		button.pressed.connect(action)
	controls.add_child(button)
	action_buttons[text] = button
	return button

func _show_start() -> void:
	_open_modal("BUNKER", "PIXEL SURVIVAL BUILD\n\nv%s\n\nTHE LIGHTS ARE FAILING. THE LABYRINTH IS WAITING.\n\nSaves persist on this device." % VERSION)
	_add_modal_button("TAP TO ENTER", _begin_game)
	controls.visible = false

func _begin_game() -> void:
	entered = true
	start_backdrop.visible = false
	_close_modal()
	_show_toast("BUNKER ONLINE")

func _layout_ui() -> void:
	if not is_instance_valid(hud):
		return
	var viewport_size := get_viewport_rect().size
	if viewport_size.x <= 0.0 or viewport_size.y <= 0.0:
		viewport_size = Vector2(1280, 720)
	area_label.position = Vector2(42, 20)
	time_label.position = Vector2(viewport_size.x - 188, 20)
	weapon_label.position = Vector2(viewport_size.x * 0.5 - 170, 20)
	prompt_label.position = Vector2(viewport_size.x * 0.5 - 210, viewport_size.y - 92)
	toast_label.position = Vector2(viewport_size.x * 0.5 - 250, 78)
	version_label.position = Vector2(viewport_size.x - 124, viewport_size.y - 22)

	var button_width := 116.0
	var right := viewport_size.x - button_width - 44.0
	var left := right - button_width - 14.0
	var bottom := viewport_size.y - 36.0
	var placements := {
		"SWITCH": Vector2(left, bottom - 184),
		"RUN": Vector2(right, bottom - 184),
		"RELOAD": Vector2(left, bottom - 122),
		"USE": Vector2(right, bottom - 122),
		"ATTACK": Vector2(left, bottom - 58),
		"THROW": Vector2(right, bottom - 58),
	}
	for id in placements:
		if action_buttons.has(id):
			action_buttons[id].position = placements[id].round()
	if action_buttons.has("BACKPACK"):
		action_buttons["BACKPACK"].position = Vector2(viewport_size.x * 0.5 - 92, viewport_size.y - 56).round()

	var panel_size := Vector2(minf(780.0, viewport_size.x - 80.0), minf(612.0, viewport_size.y - 64.0))
	modal_panel.size = panel_size
	modal_panel.position = ((viewport_size - panel_size) / 2.0).round()

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
	animation_time += delta
	damage_lock = maxf(0.0, damage_lock - delta)
	muzzle_flash_clock = maxf(0.0, muzzle_flash_clock - delta)
	impact_clock = maxf(0.0, impact_clock - delta)
	pickup_clock = maxf(0.0, pickup_clock - delta)
	toast_clock = maxf(0.0, toast_clock - delta)
	if toast_clock <= 0.0:
		toast_label.visible = false

	var move := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if joystick.value.length() > move.length():
		move = joystick.value
	var running := (Input.is_action_pressed("run") or running_touch) and state.stamina > 0.0 and move.length() > 0.05
	if transition_locked or ui_open or filling > 0.0:
		move = Vector2.ZERO
	var previous_player := player
	if move.length() > 0.05:
		move = move.limit_length(1.0)
		facing = _cardinal(move)
		_try_move(Vector2(move.x * (RUN_SPEED if running else WALK_SPEED) * delta, 0))
		_try_move(Vector2(0, move.y * (RUN_SPEED if running else WALK_SPEED) * delta))
	player_is_moving = player.distance_squared_to(previous_player) > 0.01
	if player_is_moving:
		player_walk_time += delta * (1.45 if running else 1.0)

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
	for furniture_collider in BUNKER_FURNITURE_COLLIDERS:
		if furniture_collider.grow(PLAYER_RADIUS).has_point(position):
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
	var viewport_size := get_viewport_rect().size
	if viewport_size.x <= 0.0 or viewport_size.y <= 0.0:
		viewport_size = Vector2(1280, 720)
	if mode == "bunker":
		for zone in ZONES:
			if zone.rect.has_point(player) and bool(zone.framed):
				target_position = zone.rect.get_center()
				target_zoom = minf((viewport_size.x - 90.0) / zone.rect.size.x, (viewport_size.y - 76.0) / zone.rect.size.y)
				break
	elif mode == "room" and not active_room.is_empty():
		var size := Vector2(int(active_room.width), int(active_room.height)) * MAZE_TILE
		target_position = ROOM_ORIGIN + size / 2.0
		target_zoom = clampf(minf(viewport_size.x / (size.x + 72.0), viewport_size.y / (size.y + 72.0)), 0.72, 1.35)
	else:
		target_zoom = 1.0
	if immediate:
		camera.position = target_position.snapped(Vector2.ONE * 0.25)
		camera.zoom = Vector2.ONE * target_zoom
	else:
		camera.position = camera.position.lerp(target_position, 0.12).snapped(Vector2.ONE * 0.25)
		camera.zoom = camera.zoom.lerp(Vector2.ONE * target_zoom, 0.12).snapped(Vector2.ONE * 0.001)

func _update_lighting() -> void:
	lighting_controller.update(
		mode,
		entered,
		player,
		camera,
		facing,
		maze,
		maze_generator,
		MAZE_ORIGIN,
		MAZE_TILE,
		animation_time,
		get_viewport_rect().size
	)

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
	await scene_transition.fade(self, fade_rect, out)

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
			impact_clock = 0.22
			impact_position = player + Vector2(0, -12)
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
			impact_clock = 0.18
			impact_position = target.position
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
			impact_clock = 0.18
			impact_position = target.position
			knife_flying = false

func _retrieve_knife() -> void:
	state.knife_location = "armed"
	state.inventory.knife.location = "armed"
	state.knife_world_position = Vector2.ZERO
	knife_flying = false
	state.save()
	pickup_clock = 0.32
	pickup_position = player + Vector2(0, -16)
	_show_toast("KNIFE RETRIEVED")

func _fire_pistol() -> void:
	var result := inventory.fire_pistol()
	_show_toast(result.message)
	if not result.fired:
		return
	muzzle_flash_clock = 0.12
	muzzle_flash_position = player + facing * 30.0 + Vector2(0, -13)
	if mode == "maze":
		var target := _nearest_enemy(520.0, true)
		if not target.is_empty():
			target.alive = false
			impact_clock = 0.18
			impact_position = target.position
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
			impact_clock = 0.18
			impact_position = target.position
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
			_style_item_button(button, item)
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
			_style_item_button(button, item)
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

func _style_item_button(button: Button, item: Dictionary) -> void:
	button.icon = pixel_assets.item_icon(str(item.id), item)
	button.icon_alignment = HORIZONTAL_ALIGNMENT_LEFT
	button.expand_icon = false
	button.add_theme_constant_override("icon_max_width", 32)
	button.add_theme_font_size_override("font_size", 11)

func _open_item(id: String, source: String) -> void:
	if not state.inventory.has(id):
		return
	var item: Dictionary = state.inventory[id]
	_open_modal(str(item.name), inventory.describe(item))
	var preview := TextureRect.new()
	preview.texture = pixel_assets.item_icon(id, item)
	preview.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	preview.custom_minimum_size = Vector2(80, 80)
	preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
	modal_vbox.add_child(preview)
	if source == "storage":
		_add_modal_button("TAKE", _take_item.bind(id))
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

func _take_item(id: String) -> void:
	_show_toast(inventory.take(id))
	pickup_clock = 0.32
	pickup_position = player + Vector2(0, -18)
	_open_storage()

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
	var equipment := TextureRect.new()
	equipment.texture = pixel_assets.item_icon(id, state.inventory[id])
	equipment.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	equipment.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	equipment.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	equipment.position = Vector2(240, 54)
	equipment.size = Vector2(160, 150)
	equipment.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pad.add_child(equipment)
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
	running_touch = false
	joystick.release()
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
		world_renderer.draw_bunker(self, ZONES, TILE, _is_bunker_wall, PROPS, targets, animation_time)
	elif mode == "maze":
		world_renderer.draw_maze(self, maze, MAZE_ORIGIN, MAZE_TILE, enemies, animation_time)
	else:
		world_renderer.draw_room(self, active_room, ROOM_ORIGIN, MAZE_TILE, animation_time)
	var player_frame := int(player_walk_time * 8.0) % 4 if player_is_moving else 0
	var equipped := "pistol" if state.pistol_armed else ("knife" if state.knife_location == "armed" else "")
	world_renderer.draw_player(self, player, facing, player_frame, equipped, damage_lock > 0.62)
	if state.knife_location == "world":
		world_renderer.draw_world_item(self, state.knife_world_position, "knife", state.inventory.knife, knife_velocity.normalized() if knife_flying else facing)
	if muzzle_flash_clock > 0.0:
		world_renderer.draw_effect(self, muzzle_flash_position, 0, 1.0 - muzzle_flash_clock / 0.12)
	if impact_clock > 0.0:
		world_renderer.draw_effect(self, impact_position, 1, 1.0 - impact_clock / 0.22)
	if pickup_clock > 0.0:
		world_renderer.draw_effect(self, pickup_position, 2, 1.0 - pickup_clock / 0.32)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED:
		if state:
			_store_world_state()
