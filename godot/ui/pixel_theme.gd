class_name BunkerPixelTheme
extends RefCounted

const INK := Color("080b0c")
const PANEL := Color("101719")
const PANEL_RAISED := Color("1d292c")
const EDGE := Color("536168")
const EDGE_HOT := Color("8a9a86")
const TEXT := Color("d8dfd8")
const MUTED := Color("84948c")
const GREEN := Color("6fc77b")
const AMBER := Color("d1a14e")
const RED := Color("a74436")

static func create() -> Theme:
	var theme := Theme.new()
	theme.default_font = preload("res://assets/fonts/bunker_pixel.fnt")
	theme.default_font_size = 16
	theme.set_color("font_color", "Label", TEXT)
	theme.set_color("font_shadow_color", "Label", INK)
	theme.set_constant("shadow_offset_x", "Label", 2)
	theme.set_constant("shadow_offset_y", "Label", 2)

	var panel := _box(PANEL, EDGE, 3, 4)
	panel.content_margin_left = 12
	panel.content_margin_right = 12
	panel.content_margin_top = 10
	panel.content_margin_bottom = 10
	theme.set_stylebox("panel", "PanelContainer", panel)

	var button_normal := _box(PANEL_RAISED, EDGE, 2, 2)
	var button_hover := _box(Color("293a3a"), EDGE_HOT, 2, 2)
	var button_pressed := _box(Color("0d1314"), GREEN, 3, 2)
	var button_disabled := _box(Color("101517"), Color("30383b"), 2, 2)
	for style in [button_normal, button_hover, button_pressed, button_disabled]:
		style.content_margin_left = 12
		style.content_margin_right = 12
		style.content_margin_top = 8
		style.content_margin_bottom = 8
	theme.set_stylebox("normal", "Button", button_normal)
	theme.set_stylebox("hover", "Button", button_hover)
	theme.set_stylebox("pressed", "Button", button_pressed)
	theme.set_stylebox("disabled", "Button", button_disabled)
	theme.set_color("font_color", "Button", TEXT)
	theme.set_color("font_hover_color", "Button", Color.WHITE)
	theme.set_color("font_pressed_color", "Button", GREEN)
	theme.set_color("font_disabled_color", "Button", Color("56605d"))
	theme.set_constant("outline_size", "Button", 0)

	var bar_background := _box(Color("090d0e"), Color("455157"), 1, 0)
	var bar_fill := _box(GREEN, Color("9bd6a1"), 1, 0)
	theme.set_stylebox("background", "ProgressBar", bar_background)
	theme.set_stylebox("fill", "ProgressBar", bar_fill)
	theme.set_color("font_color", "ProgressBar", INK)
	return theme

static func apply_bar_colour(bar: ProgressBar, colour: Color) -> void:
	bar.add_theme_stylebox_override("fill", _box(colour.darkened(0.12), colour.lightened(0.18), 1, 0))

static func _box(fill: Color, border: Color, width: int, corner: int) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = fill
	box.border_color = border
	box.set_border_width_all(width)
	box.corner_radius_top_left = corner
	box.corner_radius_top_right = corner
	box.corner_radius_bottom_left = corner
	box.corner_radius_bottom_right = corner
	return box
