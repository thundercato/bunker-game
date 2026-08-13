class_name BunkerTouchJoystick
extends Control

var value := Vector2.ZERO
var touch_id := -1
var centre := Vector2(118, 598)
var radius := 72.0

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_process_input(true)
	resized.connect(_layout)
	_layout()

func _layout() -> void:
	centre = Vector2(112, maxf(112.0, size.y - 112.0)).round()
	queue_redraw()

func _input(event: InputEvent) -> void:
	if not is_visible_in_tree():
		return
	if event is InputEventScreenTouch:
		if event.pressed and touch_id == -1 and event.position.x < minf(430.0, size.x * 0.36) and event.position.y > size.y * 0.46:
			touch_id = event.index
			_update_value(event.position)
		elif not event.pressed and event.index == touch_id:
			touch_id = -1
			value = Vector2.ZERO
			queue_redraw()
	elif event is InputEventScreenDrag and event.index == touch_id:
		_update_value(event.position)

func _update_value(position: Vector2) -> void:
	value = (position - centre).limit_length(radius) / radius
	queue_redraw()

func release() -> void:
	touch_id = -1
	value = Vector2.ZERO
	queue_redraw()

func _draw() -> void:
	var outer := PackedVector2Array()
	var inner := PackedVector2Array()
	for index in 16:
		var angle := index * TAU / 16.0
		outer.append((centre + Vector2(cos(angle), sin(angle)) * radius).round())
		inner.append((centre + Vector2(cos(angle), sin(angle)) * (radius - 5.0)).round())
	draw_colored_polygon(outer, Color(0.035, 0.065, 0.06, 0.7))
	draw_polyline(outer, Color(0.33, 0.47, 0.40, 0.9), 3.0)
	draw_polyline(inner, Color(0.08, 0.16, 0.13, 0.92), 2.0)
	for direction in [Vector2.UP, Vector2.RIGHT, Vector2.DOWN, Vector2.LEFT]:
		var marker: Vector2 = (centre + direction * (radius - 14.0)).round()
		draw_rect(Rect2(marker - Vector2.ONE * 3.0, Vector2.ONE * 6.0), Color(0.44, 0.62, 0.50, 0.7))
	var knob := (centre + value * radius).round()
	draw_rect(Rect2(knob - Vector2.ONE * 24.0, Vector2.ONE * 48.0), Color(0.17, 0.29, 0.23, 0.92))
	draw_rect(Rect2(knob - Vector2.ONE * 24.0, Vector2.ONE * 48.0), Color(0.55, 0.72, 0.61, 0.95), false, 3.0)
	draw_rect(Rect2(knob - Vector2.ONE * 17.0, Vector2.ONE * 34.0), Color(0.28, 0.49, 0.37, 0.8))
