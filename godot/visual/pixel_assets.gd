class_name BunkerPixelAssets
extends RefCounted

const BUNKER_TILE_SIZE := 32
const MAZE_TILE_SIZE := 48
const CHARACTER_FRAME := Vector2i(32, 48)
const ITEM_SIZE := 32
const FURNITURE_SIZE := 64
const ENEMY_SIZE := 32
const EFFECT_SIZE := 32

var bunker_tiles: Texture2D = preload("res://assets/pixel/bunker_tiles.png")
var maze_tiles: Texture2D = preload("res://assets/pixel/maze_tiles.png")
var character: Texture2D = preload("res://assets/pixel/character.png")
var items: Texture2D = preload("res://assets/pixel/items.png")
var furniture: Texture2D = preload("res://assets/pixel/furniture.png")
var enemies: Texture2D = preload("res://assets/pixel/enemies.png")
var effects: Texture2D = preload("res://assets/pixel/effects.png")

const ITEM_INDEX := {
	"knife": 0,
	"makarov": 1,
	"makarov-mag-1": 2,
	"makarov-mag-2": 2,
	"ammo-box-1": 5,
	"ammo-box-2": 5,
	"loose-9mm": 4,
	"flask": 6,
	"beans": 8,
	"food-jerky": 9,
	"apple": 10,
	"ration-pack": 11,
	"crackers": 12,
	"energy-bar": 11,
	"crisps": 12,
	"chocolate": 11,
	"tinned-peaches": 8,
	"tinned-soup": 8,
	"cola": 7,
	"orange-pop": 7,
	"cigarettes": 12,
}

const FURNITURE_INDEX := {
	"bunk": 0,
	"storage": 1,
	"weapons": 2,
	"faucet": 3,
	"desk": 4,
	"drawers": 5,
	"cupboard": 6,
	"chest": 7,
}

func bunker_tile_region(index: int) -> Rect2:
	return _region(index, 8, BUNKER_TILE_SIZE)

func maze_tile_region(index: int) -> Rect2:
	return _region(index, 8, MAZE_TILE_SIZE)

func character_region(direction: int, frame: int) -> Rect2:
	return Rect2(frame * CHARACTER_FRAME.x, direction * CHARACTER_FRAME.y, CHARACTER_FRAME.x, CHARACTER_FRAME.y)

func item_region(id: String, item: Dictionary = {}) -> Rect2:
	var index := int(ITEM_INDEX.get(id, 11))
	if id.begins_with("makarov-mag"):
		index = 3 if int(item.get("rounds", 0)) > 0 else 2
	elif id.begins_with("ammo-box") or id == "loose-9mm":
		index = 4 if int(item.get("rounds", 0)) > 0 else 5
	elif id == "flask":
		index = 7 if float(item.get("fill", 0.0)) > 0.0 else 6
	return _region(index, 8, ITEM_SIZE)

func furniture_region(kind: String) -> Rect2:
	return _region(int(FURNITURE_INDEX.get(kind, 7)), 4, FURNITURE_SIZE)

func enemy_region(kind: String, frame: int) -> Rect2:
	var row := 0 if kind == "spider" else 1
	return Rect2((frame % 4) * ENEMY_SIZE, row * ENEMY_SIZE, ENEMY_SIZE, ENEMY_SIZE)

func effect_region(row: int, frame: int) -> Rect2:
	return Rect2((frame % 4) * EFFECT_SIZE, row * EFFECT_SIZE, EFFECT_SIZE, EFFECT_SIZE)

func item_icon(id: String, item: Dictionary = {}) -> AtlasTexture:
	var icon := AtlasTexture.new()
	icon.atlas = items
	icon.region = item_region(id, item)
	icon.filter_clip = true
	return icon

func _region(index: int, columns: int, size: int) -> Rect2:
	return Rect2((index % columns) * size, (index / columns) * size, size, size)
