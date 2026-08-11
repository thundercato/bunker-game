class_name BunkerLabyrinthGenerator
extends RefCounted

const WIDTH := 31
const HEIGHT := 25

var _rng := RandomNumberGenerator.new()

func generate(seed: int) -> Dictionary:
	_rng.seed = seed
	var walls: Array = []
	for y in HEIGHT:
		var row: Array[bool] = []
		for x in WIDTH:
			row.append(true)
		walls.append(row)

	var stack: Array[Vector2i] = [Vector2i(1, 1)]
	walls[1][1] = false
	while not stack.is_empty():
		var current: Vector2i = stack.back()
		var candidates: Array[Vector2i] = []
		for direction in [Vector2i(2, 0), Vector2i(-2, 0), Vector2i(0, 2), Vector2i(0, -2)]:
			var next: Vector2i = current + direction
			if next.x > 0 and next.y > 0 and next.x < WIDTH - 1 and next.y < HEIGHT - 1 and walls[next.y][next.x]:
				candidates.append(next)
		if candidates.is_empty():
			stack.pop_back()
			continue
		var next: Vector2i = candidates[_rng.randi_range(0, candidates.size() - 1)]
		var between := Vector2i((current.x + next.x) / 2, (current.y + next.y) / 2)
		walls[between.y][between.x] = false
		walls[next.y][next.x] = false
		stack.append(next)

	var entrance := Vector2i(15, HEIGHT - 1)
	var spawn := Vector2i(15, HEIGHT - 2)
	walls[entrance.y][entrance.x] = false
	walls[spawn.y][spawn.x] = false

	var doors := [
		_door("north", Vector2i(3, 0), Vector2i(3, 1), 0),
		_door("east", Vector2i(WIDTH - 1, 3), Vector2i(WIDTH - 2, 3), 1),
		_door("south", Vector2i(WIDTH - 4, HEIGHT - 1), Vector2i(WIDTH - 4, HEIGHT - 2), 2),
		_door("west", Vector2i(0, HEIGHT - 4), Vector2i(1, HEIGHT - 4), 3),
	]
	for door in doors:
		var tile: Vector2i = door.tile
		var approach: Vector2i = door.approach
		walls[tile.y][tile.x] = false
		walls[approach.y][approach.x] = false

	return {
		"seed": seed,
		"width": WIDTH,
		"height": HEIGHT,
		"walls": walls,
		"entrance": entrance,
		"spawn": spawn,
		"doors": doors,
		"rooms": _rooms(seed),
	}

func _door(side: String, tile: Vector2i, approach: Vector2i, index: int) -> Dictionary:
	return {"id": "door-%s" % side, "side": side, "tile": tile, "approach": approach, "room_id": "room-%d" % index}

func _rooms(seed: int) -> Dictionary:
	var result := {}
	for index in 4:
		var room_id := "room-%d" % index
		var room_seed := seed ^ ((index + 1) * 0x45d9f3b)
		var room_rng := RandomNumberGenerator.new()
		room_rng.seed = room_seed
		var width := room_rng.randi_range(9, 13)
		var height := room_rng.randi_range(7, 10)
		var occupied := {Vector2i(width / 2, height - 2): true}
		var furniture: Array[Dictionary] = []
		var kinds := ["desk", "drawers", "cupboard", "chest"]
		for furniture_index in room_rng.randi_range(4, 7):
			var tile := Vector2i(room_rng.randi_range(1, width - 2), room_rng.randi_range(1, height - 3))
			var guard := 0
			while occupied.has(tile) and guard < 30:
				tile = Vector2i(room_rng.randi_range(1, width - 2), room_rng.randi_range(1, height - 3))
				guard += 1
			occupied[tile] = true
			var kind: String = kinds[furniture_index % kinds.size()]
			furniture.append({
				"id": "%s-furniture-%d" % [room_id, furniture_index],
				"kind": kind,
				"tile": tile,
				"locked": kind == "chest" and room_rng.randf() >= 0.1,
				"opened": false,
			})
		result[room_id] = {"id": room_id, "width": width, "height": height, "visited": false, "furniture": furniture}
	return result

func is_walkable(maze: Dictionary, tile: Vector2i) -> bool:
	if tile.x < 0 or tile.y < 0 or tile.x >= int(maze.width) or tile.y >= int(maze.height):
		return false
	return not bool(maze.walls[tile.y][tile.x])

func beam_cells(maze: Dictionary, tile: Vector2i, facing: Vector2i, maximum := 12) -> int:
	var distance := 0
	for step in range(1, maximum + 1):
		if not is_walkable(maze, tile + facing * step):
			break
		distance = step
	return distance

func open_tiles(maze: Dictionary, minimum_distance_from: Vector2i, minimum_distance := 6) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for y in range(1, int(maze.height) - 1):
		for x in range(1, int(maze.width) - 1):
			var tile := Vector2i(x, y)
			if is_walkable(maze, tile) and tile.distance_to(minimum_distance_from) > minimum_distance:
				result.append(tile)
	result.shuffle()
	return result
