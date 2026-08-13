class_name BunkerPixelHud
extends Control

const PANEL := Color(0.035, 0.055, 0.06, 0.88)
const EDGE := Color(0.33, 0.39, 0.40, 0.92)
const INNER := Color(0.12, 0.17, 0.17, 0.84)
const AMBER := Color("d1a14e")

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(queue_redraw)

func _draw() -> void:
	var width := size.x
	var height := size.y
	_panel(Rect2(28, 10, 282, 158))
	_panel(Rect2(width * 0.5 - 190, 10, 380, 46))
	_panel(Rect2(width - 198, 10, 170, 46))
	_panel(Rect2(width * 0.5 - 230, height - 100, 460, 52))

	# Four status glyphs keep the bars readable without swelling the HUD.
	_draw_cross(Vector2(38, 67), Color("a74436"))
	_draw_ration(Vector2(38, 95), Color("d1a14e"))
	_draw_drop(Vector2(38, 123), Color("4c8191"))
	_draw_bolt(Vector2(38, 151), Color("6fc77b"))

func _panel(rectangle: Rect2) -> void:
	draw_rect(rectangle, PANEL)
	draw_rect(rectangle, EDGE, false, 2.0)
	draw_rect(rectangle.grow(-4), INNER, false, 1.0)
	# Two chipped pixels give the panel a restrained distressed edge.
	draw_rect(Rect2(rectangle.position + Vector2(8, -1), Vector2(9, 3)), Color("080b0c"))
	draw_rect(Rect2(rectangle.end - Vector2(21, 1), Vector2(8, 3)), Color("080b0c"))

func _draw_cross(position: Vector2, colour: Color) -> void:
	draw_rect(Rect2(position + Vector2(4, 0), Vector2(5, 13)), colour)
	draw_rect(Rect2(position + Vector2(0, 4), Vector2(13, 5)), colour)

func _draw_ration(position: Vector2, colour: Color) -> void:
	draw_rect(Rect2(position, Vector2(14, 12)), colour)
	draw_rect(Rect2(position + Vector2(3, 3), Vector2(8, 2)), Color("33281a"))

func _draw_drop(position: Vector2, colour: Color) -> void:
	var points := PackedVector2Array([
		position + Vector2(7, 0),
		position + Vector2(13, 8),
		position + Vector2(11, 13),
		position + Vector2(3, 13),
		position + Vector2(1, 8),
	])
	draw_colored_polygon(points, colour)

func _draw_bolt(position: Vector2, colour: Color) -> void:
	var points := PackedVector2Array([
		position + Vector2(8, 0),
		position + Vector2(3, 8),
		position + Vector2(8, 8),
		position + Vector2(4, 15),
		position + Vector2(14, 6),
		position + Vector2(9, 6),
	])
	draw_colored_polygon(points, colour)
