extends SceneTree

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var packed: PackedScene = load("res://main.tscn")
	var game = packed.instantiate()
	root.add_child(game)
	await process_frame

	_check(game.pixel_assets.character.get_width() == 128, "character atlas did not import")
	_check(game.pixel_assets.maze_tiles.get_height() == 96, "maze atlas did not import")
	_check(game.version_label.text == "v0.0.0.4", "visible Godot version is stale")

	game._begin_game()
	await process_frame
	_check(game.entered and game.controls.visible, "game did not leave the start screen")
	_check(not game.start_backdrop.visible, "start backdrop stayed over gameplay")

	game._open_storage()
	await process_frame
	_check(game.ui_open and not game.controls.visible, "storage did not block gameplay controls")
	_check(game.joystick.value == Vector2.ZERO, "modal did not release the touch joystick")
	game._close_modal()
	for device_size in [Vector2i(1194, 552), Vector2i(1024, 768)]:
		root.size = device_size
		await process_frame
		game._layout_ui()
		var viewport_size: Vector2 = game.get_viewport_rect().size
		for button in game.action_buttons.values():
			_check(button.position.x >= 0.0 and button.position.y >= 0.0, "touch action left the landscape viewport")
			_check(button.position.x + button.size.x <= viewport_size.x, "touch action crossed the landscape safe edge")
			_check(button.position.y + button.size.y <= viewport_size.y, "touch action crossed the landscape bottom edge")
	root.size = Vector2i(1280, 720)
	await process_frame
	game._layout_ui()

	game.maze = game.maze_generator.generate(0xB04)
	game.mode = "maze"
	game.player = game._maze_world(game.maze.spawn)
	game._update_camera(true)
	for direction in [Vector2.UP, Vector2.RIGHT, Vector2.DOWN, Vector2.LEFT]:
		game.facing = direction
		game._update_lighting()
		_check(game.lighting_controller.overlay.visible, "maze light was not visible")
	await process_frame

	game.active_room = game.maze.rooms["room-0"]
	game.mode = "room"
	game.player = game._room_exit_position() + Vector2.UP * 64.0
	game._update_camera(true)
	game._update_lighting()
	await process_frame
	_check(game.lighting_controller.overlay.visible, "room lighting was not visible")

	game.state.health = 73.0
	game.state.save()
	var restored := BunkerGameState.new()
	_check(is_equal_approx(restored.health, 73.0), "browser-compatible save state did not reload")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(BunkerGameState.SAVE_PATH))
	print("Godot headless visual/runtime smoke passed")
	quit(0)

func _check(condition: bool, message: String) -> void:
	if condition:
		return
	push_error(message)
	quit(1)
