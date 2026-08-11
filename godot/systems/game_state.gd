class_name BunkerGameState
extends RefCounted

const SAVE_PATH := "user://bunker-save-v3.json"

var health := 100.0
var hunger := 82.0
var thirst := 74.0
var stamina := 100.0
var game_minutes := 8 * 60
var knife_sharpness := 15.0
var knife_location := "armed"
var knife_world_position := Vector2.ZERO
var pistol_armed := false
var inserted_magazine := ""
var chambered_round := false
var gun_health := 200
var magazine_health := {"makarov-mag-1": 100, "makarov-mag-2": 100}
var current_mode := "bunker"
var player_position := Vector2(352, 388)
var maze_seed := 0
var current_room_id := ""
var maze_return_position := Vector2.ZERO
var room_states: Dictionary = {}
var inventory: Dictionary = {}
var equipped_pouches: Array[String] = ["", "", "", ""]
var maintenance: Dictionary = {}
var passive_clock := 0.0

func _init() -> void:
	inventory = _default_inventory()
	load_save()

func _default_inventory() -> Dictionary:
	return {
		"cigarettes": _item("cigarettes", "PACKET OF CIGARETTES", "comfort", "storage", 1, 6),
		"knife": _item("knife", "UTILITY KNIFE", "knife", "armed", 2, 1),
		"food-jerky": _food("food-jerky", "BEEF JERKY", "storage", 3, 1.0, 20, -5, 3),
		"flask": _liquid("flask", "WATER FLASK", "storage", 0, 1.0, 35.0, 100),
		"cola": _liquid("cola", "CAN OF COLA", "storage", 4, 2.0, 100.0, 24),
		"orange-pop": _liquid("orange-pop", "CAN OF ORANGE POP", "storage", 5, 1.0, 100.0, 22),
		"beans": _food("beans", "TIN OF BEANS", "storage", 6, 1.0, 34, 4, 2),
		"makarov": _weapon("makarov", "MAKAROV PM", "pistol", "storage", 7, 0),
		"makarov-mag-1": _weapon("makarov-mag-1", "MAKAROV MAGAZINE A", "magazine", "storage", 8, 0),
		"makarov-mag-2": _weapon("makarov-mag-2", "MAKAROV MAGAZINE B", "magazine", "storage", 9, 2),
		"ammo-box-1": _weapon("ammo-box-1", "9x18MM AMMO BOX", "ammo", "storage", 10, 16),
		"ammo-box-2": _weapon("ammo-box-2", "9x18MM AMMO PACKET", "ammo", "storage", 11, 6),
		"loose-9mm": _weapon("loose-9mm", "LOOSE 9x18MM ROUNDS", "ammo", "backpack", 12, 0),
		"energy-bar": _food("energy-bar", "ENERGY BAR", "storage", 13, 2.0, 18, -2, 1),
		"crisps": _food("crisps", "PACKET OF CRISPS", "storage", 14, 1.0, 12, -3, 1),
		"chocolate": _food("chocolate", "CHOCOLATE", "storage", 15, 1.0, 16, 0, 4),
		"tinned-peaches": _food("tinned-peaches", "TINNED PEACHES", "storage", 16, 1.0, 24, 10, 2),
		"tinned-soup": _food("tinned-soup", "TIN OF SOUP", "storage", 17, 1.0, 28, 8, 2),
		"apple": _food("apple", "APPLE", "hidden", -1, 1.0, 10, 6, 2),
		"ration-pack": _food("ration-pack", "MILITARY RATION PACK", "hidden", -1, 1.0, 55, 2, 4),
		"crackers": _food("crackers", "RATION CRACKERS", "hidden", -1, 1.0, 14, -4, 2),
	}

func _item(id: String, name: String, kind: String, location: String, slot: int, quantity: float) -> Dictionary:
	return {"id": id, "name": name, "kind": kind, "location": location, "slot": slot, "quantity": quantity}

func _food(id: String, name: String, location: String, slot: int, quantity: float, hunger_value: float, hydration: float, servings: int) -> Dictionary:
	var item := _item(id, name, "food", location, slot, quantity)
	item["hunger"] = hunger_value
	item["hydration"] = hydration
	item["servings"] = servings
	return item

func _liquid(id: String, name: String, location: String, slot: int, quantity: float, fill: float, hydration: float) -> Dictionary:
	var item := _item(id, name, "liquid", location, slot, quantity)
	item["fill"] = fill
	item["hydration"] = hydration
	return item

func _weapon(id: String, name: String, kind: String, location: String, slot: int, rounds: int) -> Dictionary:
	var item := _item(id, name, kind, location, slot, 1)
	item["rounds"] = rounds
	return item

func format_time() -> String:
	return "%02d:%02d" % [int(game_minutes / 60), game_minutes % 60]

func advance(delta: float, running: bool, ui_open: bool) -> void:
	if ui_open:
		return
	hunger = maxf(0.0, hunger - 0.0003 * delta)
	thirst = maxf(0.0, thirst - 0.0006 * delta * (2.0 if hunger <= 0.0 else 1.0))
	if thirst <= 0.0:
		health = maxf(0.0, health - 0.02 * delta)
	if running:
		stamina = maxf(0.0, stamina - 20.0 * delta)
	else:
		stamina = minf(100.0, stamina + 4.0 * delta)

func sleep_hours(hours: int) -> Dictionary:
	var requested := clampi(hours, 1, 24) * 60
	var slept := 0
	for minute in requested:
		game_minutes = (game_minutes + 1) % (24 * 60)
		hunger = maxf(0.0, hunger - 1.5 / 60.0)
		thirst = maxf(0.0, thirst - 2.0 / 60.0)
		slept += 1
		if hunger <= 5.0 or thirst <= 5.0:
			break
	stamina = 100.0
	save()
	return {"requested": requested, "slept": slept, "woke_early": slept < requested}

func save() -> void:
	var data := {
		"version": 3,
		"health": health,
		"hunger": hunger,
		"thirst": thirst,
		"stamina": stamina,
		"game_minutes": game_minutes,
		"knife_sharpness": knife_sharpness,
		"knife_location": knife_location,
		"knife_world_position": _vector_to_array(knife_world_position),
		"pistol_armed": pistol_armed,
		"inserted_magazine": inserted_magazine,
		"chambered_round": chambered_round,
		"gun_health": gun_health,
		"magazine_health": magazine_health,
		"current_mode": current_mode,
		"player_position": _vector_to_array(player_position),
		"maze_seed": maze_seed,
		"current_room_id": current_room_id,
		"maze_return_position": _vector_to_array(maze_return_position),
		"room_states": room_states,
		"inventory": inventory,
		"equipped_pouches": equipped_pouches,
		"maintenance": maintenance,
	}
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(data))

func load_save() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if not file:
		return
	var parsed = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary:
		return
	var data: Dictionary = parsed
	health = float(data.get("health", health))
	hunger = float(data.get("hunger", hunger))
	thirst = float(data.get("thirst", thirst))
	stamina = float(data.get("stamina", stamina))
	game_minutes = int(data.get("game_minutes", game_minutes))
	knife_sharpness = float(data.get("knife_sharpness", knife_sharpness))
	knife_location = str(data.get("knife_location", knife_location))
	knife_world_position = _array_to_vector(data.get("knife_world_position", [0, 0]))
	pistol_armed = bool(data.get("pistol_armed", pistol_armed))
	inserted_magazine = str(data.get("inserted_magazine", inserted_magazine))
	chambered_round = bool(data.get("chambered_round", chambered_round))
	gun_health = int(data.get("gun_health", gun_health))
	magazine_health.merge(data.get("magazine_health", {}), true)
	current_mode = str(data.get("current_mode", current_mode))
	player_position = _array_to_vector(data.get("player_position", [352, 388]))
	maze_seed = int(data.get("maze_seed", 0))
	current_room_id = str(data.get("current_room_id", ""))
	maze_return_position = _array_to_vector(data.get("maze_return_position", [0, 0]))
	room_states = data.get("room_states", {})
	var saved_inventory: Dictionary = data.get("inventory", {})
	for id in saved_inventory:
		if inventory.has(id):
			inventory[id].merge(saved_inventory[id], true)
	equipped_pouches.assign(data.get("equipped_pouches", equipped_pouches))
	maintenance = data.get("maintenance", {})

func _vector_to_array(value: Vector2) -> Array:
	return [value.x, value.y]

func _array_to_vector(value: Variant) -> Vector2:
	if value is Array and value.size() >= 2:
		return Vector2(float(value[0]), float(value[1]))
	return Vector2.ZERO
