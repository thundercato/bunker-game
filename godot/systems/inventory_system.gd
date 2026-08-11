class_name BunkerInventory
extends RefCounted

const MAGAZINE_CAPACITY := 8

var state: BunkerGameState

func _init(game_state: BunkerGameState) -> void:
	state = game_state

func items_at(location: String) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for id in state.inventory:
		var item: Dictionary = state.inventory[id]
		if item.get("location", "") == location and float(item.get("quantity", 0)) > 0:
			if item.get("kind", "") != "ammo" or int(item.get("rounds", 0)) > 0:
				result.append(item)
	result.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return int(a.get("slot", 99)) < int(b.get("slot", 99)))
	return result

func storage_slots() -> Array:
	var slots: Array = []
	slots.resize(18)
	for item in items_at("storage"):
		var slot := int(item.get("slot", -1))
		if slot >= 0 and slot < slots.size() and slots[slot] == null:
			slots[slot] = item
	return slots

func take(id: String) -> String:
	if not state.inventory.has(id):
		return "ITEM NOT FOUND"
	state.inventory[id]["location"] = "backpack"
	if id == "knife":
		state.knife_location = "backpack"
	state.save()
	return "%s ADDED TO BACKPACK" % state.inventory[id]["name"]

func arm(id: String) -> String:
	if id == "knife":
		state.knife_location = "armed"
		state.inventory.knife["location"] = "armed"
		state.pistol_armed = false
		state.inventory.makarov["location"] = "backpack" if state.inventory.makarov["location"] != "storage" else "storage"
		state.save()
		return "UTILITY KNIFE READY"
	if id == "makarov":
		state.pistol_armed = true
		state.inventory.makarov["location"] = "armed"
		if state.knife_location == "armed":
			state.knife_location = "backpack"
			state.inventory.knife["location"] = "backpack"
		state.save()
		return "MAKAROV READY"
	return "CANNOT ARM THIS ITEM"

func unarm(id: String) -> String:
	if id == "knife" and state.knife_location == "armed":
		state.knife_location = "backpack"
		state.inventory.knife["location"] = "backpack"
	if id == "makarov" and state.pistol_armed:
		state.pistol_armed = false
		state.inventory.makarov["location"] = "backpack"
	state.save()
	return "WEAPON RETURNED TO BACKPACK"

func switch_weapon() -> String:
	var knife_owned := state.knife_location in ["armed", "backpack", "world"]
	var pistol_location := str(state.inventory.makarov.get("location", "storage"))
	var pistol_owned := pistol_location in ["backpack", "armed"]
	if state.pistol_armed and knife_owned and state.knife_location != "world":
		unarm("makarov")
		return arm("knife")
	if state.knife_location == "armed" and pistol_owned:
		unarm("knife")
		return arm("makarov")
	if pistol_owned:
		return arm("makarov")
	if knife_owned and state.knife_location != "world":
		return arm("knife")
	return "NO WEAPON AVAILABLE"

func load_magazine(id: String) -> String:
	if not state.inventory.has(id):
		return "MAGAZINE NOT FOUND"
	var magazine: Dictionary = state.inventory[id]
	var needed := MAGAZINE_CAPACITY - int(magazine.get("rounds", 0))
	var loaded := 0
	for ammo_id in ["loose-9mm", "ammo-box-1", "ammo-box-2"]:
		var ammo: Dictionary = state.inventory[ammo_id]
		while int(ammo.get("rounds", 0)) > 0 and loaded < needed:
			ammo["rounds"] = int(ammo["rounds"]) - 1
			magazine["rounds"] = int(magazine.get("rounds", 0)) + 1
			loaded += 1
	state.save()
	return "%d ROUNDS LOADED" % loaded if loaded > 0 else "MAGAZINE FULL OR NO AMMUNITION"

func unload_magazine_rounds(id: String) -> String:
	var magazine: Dictionary = state.inventory[id]
	var removed := int(magazine.get("rounds", 0))
	magazine["rounds"] = 0
	state.inventory["loose-9mm"]["rounds"] = int(state.inventory["loose-9mm"].get("rounds", 0)) + removed
	state.inventory["loose-9mm"]["location"] = "backpack"
	state.save()
	return "%d ROUNDS UNLOADED" % removed

func insert_magazine(id: String) -> String:
	if state.inserted_magazine != "":
		state.inventory[state.inserted_magazine]["location"] = "backpack"
	state.inserted_magazine = id
	state.inventory[id]["location"] = "gun"
	state.save()
	return "%s INSERTED" % state.inventory[id]["name"]

func remove_magazine() -> String:
	if state.inserted_magazine == "":
		return "NO MAGAZINE INSERTED"
	var id := state.inserted_magazine
	state.inventory[id]["location"] = "backpack"
	state.inserted_magazine = ""
	state.save()
	return "%s REMOVED" % state.inventory[id]["name"]

func rack_slide() -> String:
	if state.chambered_round:
		state.chambered_round = false
		state.inventory["loose-9mm"]["rounds"] = int(state.inventory["loose-9mm"].get("rounds", 0)) + 1
		state.inventory["loose-9mm"]["location"] = "backpack"
	if state.inserted_magazine == "":
		state.save()
		return "CLICK - NO MAGAZINE"
	var magazine: Dictionary = state.inventory[state.inserted_magazine]
	if int(magazine.get("rounds", 0)) <= 0:
		state.save()
		return "CLICK - MAGAZINE EMPTY"
	magazine["rounds"] = int(magazine["rounds"]) - 1
	state.chambered_round = true
	state.save()
	return "ROUND CHAMBERED"

func fire_pistol() -> Dictionary:
	if not state.pistol_armed:
		return {"fired": false, "message": "MAKAROV NOT ARMED"}
	if not state.chambered_round:
		return {"fired": false, "message": "CLICK - CHAMBER EMPTY"}
	state.chambered_round = false
	state.gun_health = maxi(0, state.gun_health - 1)
	if state.inserted_magazine != "":
		var magazine: Dictionary = state.inventory[state.inserted_magazine]
		state.magazine_health[state.inserted_magazine] = maxi(0, int(state.magazine_health.get(state.inserted_magazine, 100)) - 1)
		if int(magazine.get("rounds", 0)) > 0:
			magazine["rounds"] = int(magazine["rounds"]) - 1
			state.chambered_round = true
	state.save()
	return {"fired": true, "message": "BANG"}

func reload_from_pouch() -> String:
	if not state.pistol_armed:
		return "MAKAROV NOT ARMED"
	for index in state.equipped_pouches.size():
		var id := state.equipped_pouches[index]
		if id != "" and int(state.inventory[id].get("rounds", 0)) > 0:
			var old := state.inserted_magazine
			state.inserted_magazine = id
			state.inventory[id]["location"] = "gun"
			state.equipped_pouches[index] = old
			if old != "":
				state.inventory[old]["location"] = "pouch"
			if not state.chambered_round:
				rack_slide()
			state.save()
			return "RELOADED - %d/%d" % [int(state.inventory[id].get("rounds", 0)), MAGAZINE_CAPACITY]
	return "NO LOADED MAGAZINE IN POUCH"

func move_to_pouch(id: String) -> String:
	for index in state.equipped_pouches.size():
		if state.equipped_pouches[index] == "":
			state.equipped_pouches[index] = id
			state.inventory[id]["location"] = "pouch"
			state.save()
			return "MAGAZINE MOVED TO POUCH %d" % (index + 1)
	return "ALL MAGAZINE POUCHES FULL"

func consume(id: String) -> String:
	if not state.inventory.has(id):
		return "ITEM NOT FOUND"
	var item: Dictionary = state.inventory[id]
	if item.get("kind", "") == "food":
		if state.hunger >= 100.0:
			return "NOT HUNGRY"
		var servings := maxi(1, int(item.get("servings", 1)))
		state.hunger = minf(100.0, state.hunger + float(item.get("hunger", 0)) / servings)
		state.thirst = clampf(state.thirst + float(item.get("hydration", 0)) / servings, 0.0, 100.0)
		item["quantity"] = maxf(0.0, float(item.get("quantity", 0)) - 1.0 / servings)
	elif id == "flask":
		if state.thirst >= 100.0:
			return "NOT THIRSTY"
		var used := minf(100.0 - state.thirst, float(item.get("fill", 0)))
		if used <= 0.0:
			return "THE FLASK IS EMPTY"
		state.thirst += used
		item["fill"] = float(item.get("fill", 0)) - used
	else:
		if state.thirst >= 100.0:
			return "NOT THIRSTY"
		state.thirst = minf(100.0, state.thirst + float(item.get("hydration", 0)))
		state.hunger = minf(100.0, state.hunger + 2.0)
		item["quantity"] = maxf(0.0, float(item.get("quantity", 0)) - 1.0)
	if float(item.get("quantity", 0)) <= 0.0:
		item["location"] = "hidden"
	state.save()
	return "CONSUMED %s" % item["name"]

func fill_flask() -> String:
	var flask: Dictionary = state.inventory.flask
	flask["fill"] = 100.0
	state.save()
	return "FLASK FILLED - CLEAN WATER 100%"

func describe(item: Dictionary) -> String:
	var lines: Array[String] = []
	lines.append(str(item.get("name", "UNKNOWN ITEM")))
	match str(item.get("kind", "")):
		"knife": lines.append("Sharpness: %d%%" % int(state.knife_sharpness))
		"pistol":
			lines.append("Health: %d/200" % state.gun_health)
			lines.append("Magazine: %s" % (state.inserted_magazine if state.inserted_magazine != "" else "not inserted"))
			lines.append("Chamber: %s" % ("loaded" if state.chambered_round else "empty"))
		"magazine":
			lines.append("Rounds: %d/%d" % [int(item.get("rounds", 0)), MAGAZINE_CAPACITY])
			lines.append("Health: %d/100" % int(state.magazine_health.get(item.get("id", ""), 100)))
		"ammo": lines.append("Rounds: %d" % int(item.get("rounds", 0)))
		"food":
			lines.append("Quantity: %.2f" % float(item.get("quantity", 0)))
			lines.append("Hunger: +%d" % int(item.get("hunger", 0)))
		"liquid":
			lines.append("Quantity: %.2f" % float(item.get("quantity", 0)))
			if item.get("id", "") == "flask": lines.append("Clean water: %d%%" % int(item.get("fill", 0)))
	return "\n".join(lines)
