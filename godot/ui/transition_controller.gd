class_name BunkerSceneTransition
extends RefCounted

const STEPS := 8
const STEP_SECONDS := 0.045

func fade(host: Node, overlay: ColorRect, fade_out: bool) -> void:
	for index in range(STEPS + 1):
		var progress := float(index) / float(STEPS)
		overlay.modulate.a = progress if fade_out else 1.0 - progress
		await host.get_tree().create_timer(STEP_SECONDS).timeout
