shader_type canvas_item;

uniform vec2 player_uv = vec2(0.5, 0.5);
uniform vec2 facing = vec2(0.0, 1.0);
uniform float ambient_radius = 0.14;
uniform float beam_length = 0.55;
uniform float darkness = 0.965;
uniform bool room_mode = false;

void fragment() {
	vec2 aspect = vec2(SCREEN_PIXEL_SIZE.y / SCREEN_PIXEL_SIZE.x, 1.0);
	vec2 offset = (UV - player_uv) / aspect;
	float radial = length(offset);
	float local_light = 1.0 - smoothstep(ambient_radius * 0.36, ambient_radius, radial);

	vec2 direction = normalize(vec2(facing.x / aspect.x, facing.y));
	float forward = dot(offset, direction);
	float sideways = abs(offset.x * direction.y - offset.y * direction.x);
	float cone_width = mix(0.025, 0.16, clamp(forward / max(beam_length, 0.001), 0.0, 1.0));
	float cone = step(0.0, forward) * (1.0 - smoothstep(beam_length * 0.82, beam_length, forward));
	cone *= 1.0 - smoothstep(cone_width * 0.55, cone_width, sideways);
	cone *= room_mode ? 0.0 : 1.0;

	float visible_amount = max(local_light, cone * 0.92);
	float alpha = darkness * (1.0 - visible_amount);
	COLOR = vec4(0.0, 0.008, 0.012, alpha);
}
