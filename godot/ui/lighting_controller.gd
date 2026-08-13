class_name BunkerLightingController
extends RefCounted

var layer: CanvasLayer
var overlay: ColorRect
var material: ShaderMaterial

func attach(host: Node) -> void:
	layer = CanvasLayer.new()
	layer.layer = 5
	host.add_child(layer)
	overlay = ColorRect.new()
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	material = ShaderMaterial.new()
	material.shader = preload("res://ui/lighting.gdshader")
	overlay.material = material
	layer.add_child(overlay)

func update(
	mode: String,
	entered: bool,
	player: Vector2,
	camera: Camera2D,
	facing: Vector2,
	maze: Dictionary,
	maze_generator: BunkerLabyrinthGenerator,
	maze_origin: Vector2,
	maze_tile: float,
	animation_time: float,
	viewport_size: Vector2
) -> void:
	overlay.visible = mode in ["maze", "room"] and entered
	if not overlay.visible:
		return
	if viewport_size.x <= 0.0 or viewport_size.y <= 0.0:
		viewport_size = Vector2(1280, 720)
	var screen := (player - camera.position) * camera.zoom.x + viewport_size / 2.0
	material.set_shader_parameter("player_uv", screen / viewport_size)
	material.set_shader_parameter("viewport_size", viewport_size)
	material.set_shader_parameter("facing", facing)
	material.set_shader_parameter("room_mode", mode == "room")
	material.set_shader_parameter("ambient_radius", 0.7 if mode == "room" else 0.19)
	material.set_shader_parameter("flicker", 0.989 + sin(animation_time * 17.0) * 0.004 + sin(animation_time * 7.0) * 0.003)

	var beam := 0.0
	var limits := Vector4(0.08, 0.08, 0.08, 0.08)
	if mode == "maze" and not maze.is_empty():
		var tile := Vector2i(floori((player.x - maze_origin.x) / maze_tile), floori((player.y - maze_origin.y) / maze_tile))
		beam = maze_generator.beam_cells(maze, tile, Vector2i(facing), 12) * maze_tile + maze_tile * 0.5
		limits = Vector4(
			_corridor_distance(maze, maze_generator, tile, Vector2i.LEFT, maze_tile),
			_corridor_distance(maze, maze_generator, tile, Vector2i.RIGHT, maze_tile),
			_corridor_distance(maze, maze_generator, tile, Vector2i.UP, maze_tile),
			_corridor_distance(maze, maze_generator, tile, Vector2i.DOWN, maze_tile)
		)
		limits *= camera.zoom.x / viewport_size.y
	material.set_shader_parameter("corridor_limits", limits)
	material.set_shader_parameter("beam_length", maxf(0.08, beam * camera.zoom.x / viewport_size.y))

func _corridor_distance(
	maze: Dictionary,
	maze_generator: BunkerLabyrinthGenerator,
	tile: Vector2i,
	direction: Vector2i,
	tile_size: float
) -> float:
	return (maze_generator.beam_cells(maze, tile, direction, 4) + 0.48) * tile_size
