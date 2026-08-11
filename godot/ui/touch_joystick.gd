class_name BunkerTouchJoystick
extends Control

var value := Vector2.ZERO
var touch_id := -1
var centre := Vector2(118, 598)
var radius := 72.0

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_process_input(true)

func _input(event: InputEvent) -> void:
	if not is_visible_in_tree():
		return
	if event is InputEventScreenTouch:
		if event.pressed and touch_id == -1 and event.position.x < 420 and event.position.y > 350:
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

func _draw() -> void:
	draw_circle(centre, radius, Color(0.06, 0.11, 0.10, 0.66))
	draw_arc(centre, radius, 0, TAU, 48, Color(0.35, 0.55, 0.48, 0.85), 3.0)
	draw_circle(centre + value * radius, 27, Color(0.35, 0.62, 0.48, 0.82))
	draw_arc(centre + value * radius, 27, 0, TAU, 32, Color(0.7, 0.9, 0.78, 0.95), 2.0)
