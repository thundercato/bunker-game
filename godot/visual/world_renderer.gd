class_name BunkerPixelWorldRenderer
extends RefCounted

const INK := Color("080b0c")
const VOID := Color("070b0f")
const CONCRETE_DARK := Color("172024")
const CONCRETE := Color("354248")
const CONCRETE_LIGHT := Color("536168")
const FLOOR_DARK := Color("101719")
const GREEN := Color("58705a")
const RUST := Color("8a4a2c")
const AMBER := Color("d1a14e")
const CREAM := Color("ead9a4")
const RED := Color("a74436")

var assets: BunkerPixelAssets

func _init(pixel_assets: BunkerPixelAssets) -> void:
	assets = pixel_assets

func draw_bunker(
	canvas: CanvasItem,
	zones: Array,
	tile_size: float,
	is_wall: Callable,
	props: Array,
	targets: Array,
	animation_time: float
) -> void:
	canvas.draw_rect(Rect2(0, 0, 1920, 1088), VOID)
	for tile_y in 34:
		for tile_x in 60:
			var point := Vector2(tile_x * tile_size + 1, tile_y * tile_size + 1)
			var in_zone := false
			for zone in zones:
				if zone.rect.has_point(point):
					in_zone = true
					break
			if not in_zone:
				continue
			var destination := Rect2(Vector2(tile_x, tile_y) * tile_size, Vector2.ONE * tile_size)
			var variant: int = abs(tile_x * 17 + tile_y * 31) % 4
			var tile_index: int = 8 + variant if is_wall.call(tile_x, tile_y) else variant
			canvas.draw_texture_rect_region(assets.bunker_tiles, destination, assets.bunker_tile_region(tile_index))
			if not is_wall.call(tile_x, tile_y) and (tile_x + tile_y) % 13 == 0:
				canvas.draw_rect(Rect2(destination.position + Vector2(5, 24), Vector2(11, 2)), Color("313b3c"))

	_draw_bunker_lighting(canvas)
	for index in props.size():
		_draw_crate(canvas, props[index], index)
	_draw_bunker_furniture(canvas)
	for target in targets:
		if target.alive:
			_draw_target(canvas, target.position, animation_time)

func draw_maze(
	canvas: CanvasItem,
	maze: Dictionary,
	origin: Vector2,
	tile_size: float,
	enemies: Array,
	animation_time: float
) -> void:
	var size := Vector2(int(maze.width), int(maze.height)) * tile_size
	canvas.draw_rect(Rect2(origin - Vector2.ONE * tile_size, size + Vector2.ONE * tile_size * 2.0), VOID)
	for y in int(maze.height):
		for x in int(maze.width):
			var destination := Rect2(origin + Vector2(x, y) * tile_size, Vector2.ONE * tile_size)
			var variant: int = abs(x * 17 + y * 31 + int(maze.seed)) % 4
			var wall := bool(maze.walls[y][x])
			var tile_index: int = 8 + variant if wall else variant
			canvas.draw_texture_rect_region(assets.maze_tiles, destination, assets.maze_tile_region(tile_index))
			if wall:
				_draw_maze_wall_edges(canvas, maze, x, y, destination)

	draw_door(canvas, _maze_world(maze.entrance, origin, tile_size), "entrance", "south", tile_size)
	for door in maze.doors:
		draw_door(canvas, _maze_world(door.tile, origin, tile_size), "room", str(door.side), tile_size)
	for enemy in enemies:
		if enemy.alive:
			draw_enemy(canvas, enemy, animation_time)

func draw_room(canvas: CanvasItem, room: Dictionary, origin: Vector2, tile_size: float, animation_time: float) -> void:
	if room.is_empty():
		return
	var width := int(room.width)
	var height := int(room.height)
	canvas.draw_rect(Rect2(origin - Vector2.ONE * tile_size, Vector2(width + 2, height + 2) * tile_size), VOID)
	for y in height:
		for x in width:
			var destination := Rect2(origin + Vector2(x, y) * tile_size, Vector2.ONE * tile_size)
			var exit_tile := y == height - 1 and x == width / 2
			var wall := (x == 0 or y == 0 or x == width - 1 or y == height - 1) and not exit_tile
			var variant: int = abs(x * 19 + y * 29 + hash(room.id)) % 4
			canvas.draw_texture_rect_region(assets.maze_tiles, destination, assets.maze_tile_region(8 + variant if wall else variant))
			if wall:
				_draw_room_wall_edges(canvas, x, y, width, height, destination)

	var exit_position := origin + Vector2(width / 2.0 * tile_size + tile_size / 2.0, (height - 1) * tile_size + tile_size / 2.0)
	draw_door(canvas, exit_position, "room", "south", tile_size)
	for furniture in room.furniture:
		var position := origin + Vector2(furniture.tile) * tile_size + Vector2.ONE * tile_size / 2.0
		draw_furniture(canvas, position, str(furniture.kind), tile_size * 1.24, bool(furniture.get("opened", false)), bool(furniture.get("locked", false)))
	_draw_room_dust(canvas, origin, Vector2(width, height) * tile_size, animation_time)

func draw_player(
	canvas: CanvasItem,
	position: Vector2,
	facing: Vector2,
	frame: int,
	weapon: String,
	damaged: bool
) -> void:
	var direction := _direction_index(facing)
	var destination := Rect2(position.round() - Vector2(16, 43), Vector2(32, 48))
	var tint := Color("ffb2a9") if damaged else Color.WHITE
	canvas.draw_texture_rect_region(assets.character, destination, assets.character_region(direction, frame), tint)
	if weapon == "knife":
		_draw_equipped_item(canvas, position, facing, 0, 15.0)
	elif weapon == "pistol":
		_draw_equipped_item(canvas, position, facing, 1, 18.0)

func draw_world_item(canvas: CanvasItem, position: Vector2, id: String, item: Dictionary, rotation_direction: Vector2) -> void:
	var destination := Rect2(position.round() - Vector2.ONE * 16.0, Vector2.ONE * 32.0)
	canvas.draw_texture_rect_region(assets.items, destination, assets.item_region(id, item))
	if rotation_direction != Vector2.ZERO:
		canvas.draw_line(position - rotation_direction * 9.0, position + rotation_direction * 9.0, Color("d6dedc"), 2.0)

func draw_enemy(canvas: CanvasItem, enemy: Dictionary, animation_time: float) -> void:
	var frame := int(animation_time * 5.0 + abs(hash(enemy.kind)) % 2) % 4
	var destination := Rect2(Vector2(enemy.position).round() - Vector2(16, 23), Vector2.ONE * 32.0)
	canvas.draw_texture_rect_region(assets.enemies, destination, assets.enemy_region(str(enemy.kind), frame))

func draw_furniture(
	canvas: CanvasItem,
	position: Vector2,
	kind: String,
	size: float,
	opened := false,
	locked := false
) -> void:
	var destination := Rect2(position.round() - Vector2(size / 2.0, size * 0.72), Vector2.ONE * size)
	canvas.draw_texture_rect_region(assets.furniture, destination, assets.furniture_region(kind))
	if kind == "chest" and opened:
		canvas.draw_rect(Rect2(position + Vector2(-size * 0.35, -size * 0.52), Vector2(size * 0.7, 5)), FLOOR_DARK)
	if kind == "chest" and locked:
		canvas.draw_rect(Rect2(position + Vector2(-3, -8), Vector2(7, 9)), AMBER, true)

func draw_door(canvas: CanvasItem, position: Vector2, kind: String, side: String, tile_size: float) -> void:
	var index := 12 if kind == "entrance" else 14
	var destination := Rect2(position.round() - Vector2.ONE * tile_size / 2.0, Vector2.ONE * tile_size)
	canvas.draw_texture_rect_region(assets.maze_tiles, destination, assets.maze_tile_region(index))
	var edge := Color("a0b0ac") if kind == "entrance" else RUST
	if side in ["east", "west"]:
		canvas.draw_line(position + Vector2(0, -tile_size * 0.38), position + Vector2(0, tile_size * 0.38), edge, 3.0)
	else:
		canvas.draw_line(position + Vector2(-tile_size * 0.38, 0), position + Vector2(tile_size * 0.38, 0), edge, 3.0)

func draw_effect(canvas: CanvasItem, position: Vector2, row: int, progress: float) -> void:
	var frame := clampi(int(progress * 4.0), 0, 3)
	var destination := Rect2(position.round() - Vector2.ONE * 24.0, Vector2.ONE * 48.0)
	canvas.draw_texture_rect_region(assets.effects, destination, assets.effect_region(row, frame))

func _draw_bunker_furniture(canvas: CanvasItem) -> void:
	draw_furniture(canvas, Vector2(224, 307), "bunk", 154.0)
	draw_furniture(canvas, Vector2(224, 475), "storage", 118.0)
	draw_furniture(canvas, Vector2(512, 275), "weapons", 148.0)
	draw_furniture(canvas, Vector2(560, 191), "faucet", 70.0)

	# Heavy maze hatch at the south of the living quarters.
	var hatch := Rect2(323, 425, 58, 28)
	canvas.draw_rect(hatch, Color("202a2e"))
	canvas.draw_rect(hatch, CONCRETE_LIGHT, false, 3.0)
	canvas.draw_line(Vector2(331, 439), Vector2(373, 439), INK, 3.0)
	canvas.draw_circle(Vector2(368, 439), 4.0, AMBER)

	# Restrained industrial detail, kept away from interaction silhouettes.
	canvas.draw_line(Vector2(82, 118), Vector2(82, 507), Color("384449"), 5.0)
	canvas.draw_line(Vector2(86, 140), Vector2(156, 140), RUST, 3.0)
	for y in [176, 368, 515]:
		canvas.draw_rect(Rect2(104, y, 48, 18), Color("202a2d"))
		for slit in 5:
			canvas.draw_line(Vector2(111, y + 5 + slit * 2), Vector2(145, y + 5 + slit * 2), INK)

func _draw_bunker_lighting(canvas: CanvasItem) -> void:
	for lamp in [Vector2(208, 125), Vector2(512, 125), Vector2(896, 125), Vector2(1024, 452)]:
		canvas.draw_circle(lamp, 34.0, Color(0.58, 0.38, 0.14, 0.08))
		canvas.draw_rect(Rect2(lamp - Vector2(13, 3), Vector2(26, 6)), AMBER)
		canvas.draw_rect(Rect2(lamp - Vector2(8, 2), Vector2(16, 3)), CREAM)

func _draw_crate(canvas: CanvasItem, bounds: Rect2, index: int) -> void:
	canvas.draw_rect(bounds, Color("2d2018"))
	canvas.draw_rect(bounds.grow(-3), Color("6a472a"))
	canvas.draw_rect(bounds, INK, false, 2.0)
	canvas.draw_line(bounds.position + Vector2(4, 4), bounds.end - Vector2(4, 4), Color("93613a"), 2.0)
	if index % 2 == 0:
		canvas.draw_rect(Rect2(bounds.position + Vector2(7, 7), Vector2(10, 4)), Color("b99b66"))

func _draw_target(canvas: CanvasItem, position: Vector2, animation_time: float) -> void:
	var bob := sin(animation_time * 3.0 + position.x) * 1.5
	position.y += bob
	canvas.draw_rect(Rect2(position + Vector2(-12, 10), Vector2(24, 5)), Color("00000066"))
	canvas.draw_rect(Rect2(position + Vector2(-10, -21), Vector2(20, 38)), Color("5b412e"), true)
	canvas.draw_rect(Rect2(position + Vector2(-10, -21), Vector2(20, 38)), INK, false, 2.0)
	canvas.draw_circle(position + Vector2(0, -24), 9.0, Color("9c7955"))
	canvas.draw_circle(position + Vector2(0, -7), 6.0, RED, false, 2.0)

func _draw_maze_wall_edges(canvas: CanvasItem, maze: Dictionary, x: int, y: int, destination: Rect2) -> void:
	var width := int(maze.width)
	var height := int(maze.height)
	if y + 1 < height and not bool(maze.walls[y + 1][x]):
		canvas.draw_line(destination.position + Vector2(2, 46), destination.end - Vector2(2, 2), CONCRETE_LIGHT, 2.0)
	if y > 0 and not bool(maze.walls[y - 1][x]):
		canvas.draw_line(destination.position + Vector2(2, 2), destination.position + Vector2(46, 2), CONCRETE_LIGHT, 2.0)
	if x + 1 < width and not bool(maze.walls[y][x + 1]):
		canvas.draw_line(destination.position + Vector2(46, 2), destination.end - Vector2(2, 2), CONCRETE_LIGHT, 2.0)
	if x > 0 and not bool(maze.walls[y][x - 1]):
		canvas.draw_line(destination.position + Vector2(2, 2), destination.position + Vector2(2, 46), CONCRETE_LIGHT, 2.0)

func _draw_room_wall_edges(canvas: CanvasItem, x: int, y: int, width: int, height: int, destination: Rect2) -> void:
	if y == 0:
		canvas.draw_line(destination.position + Vector2(2, 46), destination.end - Vector2(2, 2), CONCRETE_LIGHT, 2.0)
	if y == height - 1:
		canvas.draw_line(destination.position + Vector2(2, 2), destination.position + Vector2(46, 2), CONCRETE_LIGHT, 2.0)
	if x == 0:
		canvas.draw_line(destination.position + Vector2(46, 2), destination.end - Vector2(2, 2), CONCRETE_LIGHT, 2.0)
	if x == width - 1:
		canvas.draw_line(destination.position + Vector2(2, 2), destination.position + Vector2(2, 46), CONCRETE_LIGHT, 2.0)

func _draw_room_dust(canvas: CanvasItem, origin: Vector2, size: Vector2, animation_time: float) -> void:
	for index in 6:
		var phase := animation_time * (0.12 + index * 0.01) + index * 17.0
		var position := origin + Vector2(fmod(phase * 31.0, maxf(1.0, size.x - 24.0)) + 12.0, fmod(phase * 19.0, maxf(1.0, size.y - 24.0)) + 12.0)
		canvas.draw_rect(Rect2(position.round(), Vector2.ONE * 2.0), Color(0.52, 0.58, 0.54, 0.18))

func _draw_equipped_item(canvas: CanvasItem, position: Vector2, facing: Vector2, item_index: int, reach: float) -> void:
	var centre := position + facing * reach + Vector2(0, -13)
	var destination := Rect2(centre.round() - Vector2.ONE * 10.0, Vector2.ONE * 20.0)
	canvas.draw_texture_rect_region(assets.items, destination, assets.item_region("knife" if item_index == 0 else "makarov"))

func _direction_index(facing: Vector2) -> int:
	if absf(facing.x) > absf(facing.y):
		return 2 if facing.x > 0 else 1
	return 0 if facing.y > 0 else 3

func _maze_world(tile: Vector2i, origin: Vector2, tile_size: float) -> Vector2:
	return origin + Vector2(tile) * tile_size + Vector2.ONE * tile_size / 2.0
