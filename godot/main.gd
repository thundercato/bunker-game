extends Node2D

const VERSION := "0.0.0.2"
const SPEED := 250.0
const RADIUS := 16.0
var player := Vector2(640, 380)
var facing := Vector2.DOWN
var touch_move := Vector2.ZERO
var touch_id := -1
var maze := false
var walls: Array[Rect2] = []
var camera: Camera2D
var status: Label
var button: Button

func _ready() -> void:
	camera = Camera2D.new()
	add_child(camera)
	camera.make_current()
	_build_ui()
	_set_mode(false)

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 20
	add_child(layer)
	var title := Label.new()
	title.text = "GODOT CONTROL BUILD  •  v%s" % VERSION
	title.position = Vector2(22, 18)
	title.add_theme_font_size_override("font_size", 18)
	layer.add_child(title)
	status = Label.new()
	status.position = Vector2(22, 48)
	status.add_theme_font_size_override("font_size", 15)
	layer.add_child(status)
	button = Button.new()
	button.position = Vector2(1060, 625)
	button.custom_minimum_size = Vector2(190, 68)
	button.pressed.connect(func(): _set_mode(not maze))
	layer.add_child(button)
	var hint := Label.new()
	hint.text = "DRAG LEFT SIDE TO MOVE"
	hint.position = Vector2(22, 675)
	layer.add_child(hint)
	var health := Label.new()
	health.text = "● GODOT RENDER ACTIVE"
	health.position = Vector2(1025, 22)
	health.add_theme_color_override("font_color", Color("78e08f"))
	layer.add_child(health)

func _set_mode(value: bool) -> void:
	maze = value
	walls.clear()
	if maze:
		player = Vector2(210, 900)
		walls = [Rect2(0,0,1600,30),Rect2(0,1070,1600,30),Rect2(0,0,30,1100),Rect2(1570,0,30,1100),Rect2(140,100,30,700),Rect2(140,770,370,30),Rect2(290,250,510,30),Rect2(480,250,30,390),Rect2(480,610,510,30),Rect2(770,100,30,350),Rect2(770,420,490,30),Rect2(1230,420,30,480),Rect2(900,760,360,30),Rect2(600,760,30,250),Rect2(980,100,30,190),Rect2(980,260,430,30)]
		button.text = "RETURN"
		status.text = "MAZE  •  FOLLOW CAMERA  •  COLLISION + TORCH"
	else:
		player = Vector2(640,380)
		walls = [Rect2(160,90,960,36),Rect2(160,594,960,36),Rect2(160,90,36,540),Rect2(1084,90,36,540),Rect2(380,250,240,48),Rect2(790,430,170,46)]
		camera.position = Vector2(640,360)
		button.text = "ENTER MAZE"
		status.text = "BUNKER  •  STATIC CAMERA  •  TOUCH / KEYBOARD"
	queue_redraw()

func _physics_process(delta: float) -> void:
	var move := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	if touch_move.length() > move.length():
		move = touch_move
	if move.length() > 0.05:
		move = move.limit_length(1.0)
		facing = move.normalized()
		_move(Vector2(move.x * SPEED * delta, 0))
		_move(Vector2(0, move.y * SPEED * delta))
	if maze:
		camera.position = Vector2(clamp(player.x,640.0,960.0),clamp(player.y,360.0,740.0))
	queue_redraw()

func _move(amount: Vector2) -> void:
	var next := player + amount
	var body := Rect2(next - Vector2.ONE * RADIUS, Vector2.ONE * RADIUS * 2.0)
	for wall in walls:
		if body.intersects(wall):
			return
	player = next

func _draw() -> void:
	draw_rect(Rect2(0,0,1600,1100), Color("152226"))
	draw_rect(Rect2(45,45,1510,1010), Color("1d3035"))
	for wall in walls:
		draw_rect(wall, Color("819197"))
		draw_rect(wall.grow(-5), Color("46575d"))
	if maze:
		_draw_torch()
	else:
		draw_circle(player, 150, Color(0.25, 0.52, 0.50, 0.11))
	draw_circle(player, 24, Color("c5e7e8"))
	draw_circle(player + facing * 12, 5, Color("071114"))

func _draw_torch() -> void:
	draw_circle(player, 118, Color(0.50, 0.72, 0.62, 0.16))
	var side := facing.orthogonal()
	var tip := player + facing * 420.0
	var cone := PackedVector2Array([
		player + side * 28.0,
		tip + side * 145.0,
		tip - side * 145.0,
		player - side * 28.0
	])
	draw_colored_polygon(cone, Color(0.63, 0.78, 0.62, 0.17))

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed and event.position.x < 600:
			touch_id = event.index
			touch_move = (event.position - Vector2(110,610)).limit_length(75) / 75.0
		elif not event.pressed and event.index == touch_id:
			touch_id = -1
			touch_move = Vector2.ZERO
	elif event is InputEventScreenDrag and event.index == touch_id:
		touch_move = (event.position - Vector2(110,610)).limit_length(75) / 75.0
