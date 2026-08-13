shader_type canvas_item;

uniform vec2 player_uv = vec2(0.5, 0.5);
uniform vec2 facing = vec2(0.0, 1.0);
uniform float ambient_radius = 0.14;
uniform float beam_length = 0.55;
uniform float darkness = 0.965;
uniform bool room_mode = false;
uniform vec4 corridor_limits = vec4(0.08, 0.08, 0.08, 0.08);
uniform float flicker = 1.0;
uniform vec2 viewport_size = vec2(1280.0, 720.0);

float pixel_noise(vec2 position) {
	vec2 cell = floor(position * viewport_size / 4.0);
	return fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
}

void fragment() {
	vec2 aspect = vec2(viewport_size.y / viewport_size.x, 1.0);
	vec2 offset = (UV - player_uv) / aspect;
	float irregularity = (pixel_noise(UV) - 0.5) * 0.008;
	float radial = length(offset) + irregularity;
	float local_light = 1.0 - smoothstep(ambient_radius * 0.36, ambient_radius, radial);

	float horizontal_limit = mix(corridor_limits.x, corridor_limits.y, step(0.0, offset.x));
	float vertical_limit = mix(corridor_limits.z, corridor_limits.w, step(0.0, offset.y));
	float corridor_half_width = 0.048;
	float horizontal = (1.0 - smoothstep(corridor_half_width * 0.72, corridor_half_width, abs(offset.y)));
	horizontal *= 1.0 - smoothstep(horizontal_limit * 0.86, horizontal_limit, abs(offset.x));
	float vertical = (1.0 - smoothstep(corridor_half_width * 0.72, corridor_half_width, abs(offset.x)));
	vertical *= 1.0 - smoothstep(vertical_limit * 0.86, vertical_limit, abs(offset.y));
	float junction_visibility = max(horizontal, vertical);
	local_light *= room_mode ? 1.0 : junction_visibility;

	vec2 direction = normalize(vec2(facing.x / aspect.x, facing.y));
	float forward = dot(offset, direction);
	float sideways = abs(offset.x * direction.y - offset.y * direction.x);
	float cone_width = mix(0.025, 0.16, clamp(forward / max(beam_length, 0.001), 0.0, 1.0));
	float cone = step(0.0, forward) * (1.0 - smoothstep(beam_length * 0.82, beam_length, forward));
	cone *= 1.0 - smoothstep(cone_width * 0.55, cone_width, sideways);
	cone *= room_mode ? 0.0 : 1.0;

	float visible_amount = max(local_light, cone * 0.92) * flicker;
	float alpha = darkness * (1.0 - visible_amount);
	COLOR = vec4(0.002, 0.008, 0.010, alpha);
}
