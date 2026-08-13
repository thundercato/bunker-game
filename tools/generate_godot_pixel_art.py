#!/usr/bin/env python3
"""Generate the deterministic, game-ready pixel atlas set used by Godot.

The source art is deliberately described as small pixel primitives here so the
runtime never needs an image-generation service and every atlas can be rebuilt
exactly.  All drawing is performed at the final logical pixel density.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "godot" / "assets" / "pixel"

TRANSPARENT = (0, 0, 0, 0)
INK = "#080b0c"
VOID = "#070b0f"
CONCRETE_0 = "#172024"
CONCRETE_1 = "#263238"
CONCRETE_2 = "#354248"
CONCRETE_3 = "#536168"
FLOOR_0 = "#182124"
FLOOR_1 = "#222c2f"
FLOOR_2 = "#2d383a"
GREEN_0 = "#1c2a21"
GREEN_1 = "#354b39"
GREEN_2 = "#58705a"
RUST_0 = "#512c20"
RUST_1 = "#8a4a2c"
WOOD_0 = "#2c1e16"
WOOD_1 = "#5c3c25"
WOOD_2 = "#93613a"
METAL_0 = "#303a3e"
METAL_1 = "#718086"
METAL_2 = "#b6c2c2"
SKIN = "#c9a87d"
HAIR = "#252322"
AMBER = "#d1a14e"
CREAM = "#ead9a4"
RED = "#9d3b2c"
GREEN = "#66b86d"
BLUE = "#4c8191"


def image(width: int, height: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    atlas = Image.new("RGBA", (width, height), TRANSPARENT)
    return atlas, ImageDraw.Draw(atlas)


def save(atlas: Image.Image, name: str) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT / name, optimize=True)


def rect(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str | None = None) -> None:
    draw.rectangle(box, fill=fill, outline=outline)


def line(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], fill: str, width: int = 1) -> None:
    draw.line(points, fill=fill, width=width)


def floor_tile(draw: ImageDraw.ImageDraw, x: int, y: int, variant: int, size: int = 32) -> None:
    rect(draw, (x, y, x + size - 1, y + size - 1), FLOOR_1)
    rect(draw, (x + 1, y + 1, x + size - 2, y + size - 2), FLOOR_0)
    for px, py in [
        (5 + variant * 3, 7),
        (20, 5 + variant * 4),
        (11, 22),
        (27 - variant * 2, 25),
    ]:
        rect(draw, (x + px, y + py, x + px + 1, y + py + 1), FLOOR_2)
    if variant == 1:
        line(draw, [(x + 3, y + 17), (x + 12, y + 17), (x + 16, y + 20)], CONCRETE_2)
    elif variant == 2:
        rect(draw, (x + 3, y + 4, x + 11, y + 7), GREEN_0)
        rect(draw, (x + 5, y + 5, x + 13, y + 8), "#23342c")
    elif variant == 3:
        line(draw, [(x + 21, y + 3), (x + 21, y + 13), (x + 17, y + 17)], "#40352b")


def wall_tile(draw: ImageDraw.ImageDraw, x: int, y: int, variant: int, size: int = 32) -> None:
    rect(draw, (x, y, x + size - 1, y + size - 1), INK)
    rect(draw, (x + 2, y + 2, x + size - 3, y + size - 4), CONCRETE_1)
    rect(draw, (x + 3, y + 3, x + size - 4, y + 7), CONCRETE_2)
    rect(draw, (x + 3, y + size - 9, x + size - 4, y + size - 5), CONCRETE_0)
    line(draw, [(x + 2, y + 15), (x + size - 3, y + 15)], CONCRETE_3)
    line(draw, [(x + 16, y + 2), (x + 16, y + 15)], CONCRETE_0)
    line(draw, [(x + 8, y + 16), (x + 8, y + size - 5)], CONCRETE_0)
    if variant == 1:
        line(draw, [(x + 20, y + 8), (x + 17, y + 12), (x + 20, y + 17), (x + 18, y + 22)], "#101719")
    elif variant == 2:
        rect(draw, (x + 23, y + 3, x + 28, y + 18), RUST_0)
        rect(draw, (x + 25, y + 6, x + 29, y + 13), RUST_1)
    elif variant == 3:
        rect(draw, (x + 4, y + 19, x + 15, y + 27), GREEN_0)
        rect(draw, (x + 7, y + 21, x + 18, y + 29), "#263b31")


def make_bunker_tiles() -> None:
    atlas, draw = image(8 * 32, 2 * 32)
    for variant in range(4):
        floor_tile(draw, variant * 32, 0, variant)
        wall_tile(draw, variant * 32, 32, variant)
    for variant in range(4, 8):
        x = variant * 32
        floor_tile(draw, x, 0, variant % 4)
        rect(draw, (x + 14, 0, x + 17, 31), CONCRETE_0)
        rect(draw, (x + 15, 0, x + 16, 31), CONCRETE_3)
        wall_tile(draw, x, 32, variant % 4)
        if variant == 4:
            rect(draw, (x + 4, 40, x + 27, 54), METAL_0, METAL_2)
            for slit in range(5):
                line(draw, [(x + 7, 43 + slit * 2), (x + 24, 43 + slit * 2)], INK)
        elif variant == 5:
            rect(draw, (x + 3, 34, x + 7, 60), RUST_0)
            rect(draw, (x + 4, 34, x + 5, 60), METAL_1)
    save(atlas, "bunker_tiles.png")


def maze_floor(draw: ImageDraw.ImageDraw, x: int, y: int, variant: int) -> None:
    rect(draw, (x, y, x + 47, y + 47), FLOOR_0)
    rect(draw, (x + 1, y + 1, x + 46, y + 46), "#101719")
    for px, py in [(8, 8), (36, 11), (15, 34), (41, 38), (25, 23)]:
        colour = FLOOR_2 if (px + py + variant) % 2 else CONCRETE_1
        rect(draw, (x + (px + variant * 5) % 44, y + py, x + (px + variant * 5) % 44 + 2, y + py + 1), colour)
    if variant == 1:
        line(draw, [(x + 4, y + 25), (x + 17, y + 25), (x + 23, y + 30)], CONCRETE_2)
    if variant == 2:
        rect(draw, (x + 4, y + 5, x + 17, y + 10), "#193027")
    if variant == 3:
        rect(draw, (x + 31, y + 2, x + 34, y + 30), "#412d24")


def maze_wall(draw: ImageDraw.ImageDraw, x: int, y: int, variant: int) -> None:
    rect(draw, (x, y, x + 47, y + 47), INK)
    rect(draw, (x + 2, y + 2, x + 45, y + 44), CONCRETE_0)
    rect(draw, (x + 4, y + 4, x + 43, y + 13), CONCRETE_2)
    rect(draw, (x + 4, y + 15, x + 43, y + 31), CONCRETE_1)
    rect(draw, (x + 4, y + 33, x + 43, y + 43), "#11191b")
    line(draw, [(x + 4, y + 14), (x + 43, y + 14)], CONCRETE_3, 2)
    line(draw, [(x + 24, y + 3), (x + 24, y + 13)], INK)
    line(draw, [(x + 14, y + 15), (x + 14, y + 31)], INK)
    line(draw, [(x + 34, y + 32), (x + 34, y + 43)], INK)
    if variant == 1:
        line(draw, [(x + 32, y + 8), (x + 27, y + 16), (x + 31, y + 24)], "#090d0e", 2)
    if variant == 2:
        rect(draw, (x + 5, y + 28, x + 18, y + 40), GREEN_0)
    if variant == 3:
        rect(draw, (x + 38, y + 5, x + 43, y + 36), RUST_0)
        rect(draw, (x + 40, y + 7, x + 44, y + 24), RUST_1)


def make_maze_tiles() -> None:
    atlas, draw = image(8 * 48, 2 * 48)
    for variant in range(4):
        maze_floor(draw, variant * 48, 0, variant)
        maze_wall(draw, variant * 48, 48, variant)
    for variant in range(4, 8):
        x = variant * 48
        maze_floor(draw, x, 0, variant % 4)
        wall_tile(draw, x + 8, 56, variant % 4, 32)
        if variant in (4, 5):
            rect(draw, (x + 4, 55, x + 43, 88), METAL_0, METAL_2)
            rect(draw, (x + 8, 59, x + 39, 84), "#182126", CONCRETE_3)
            for bar in range(4):
                line(draw, [(x + 11, 64 + bar * 5), (x + 36, 64 + bar * 5)], INK)
            rect(draw, (x + 33, 69, x + 37, 74), AMBER)
        elif variant == 6:
            rect(draw, (x + 5, 56, x + 42, 90), WOOD_0, METAL_1)
            rect(draw, (x + 9, 59, x + 38, 87), WOOD_1)
            line(draw, [(x + 14, 59), (x + 14, 87)], WOOD_2)
            rect(draw, (x + 33, 71, x + 36, 74), AMBER)
        else:
            rect(draw, (x + 5, 55, x + 42, 90), "#252b2d", METAL_2)
            rect(draw, (x + 10, 60, x + 37, 85), CONCRETE_0)
            line(draw, [(x + 24, 62), (x + 24, 83)], RUST_1, 2)
    save(atlas, "maze_tiles.png")


def character_frame(draw: ImageDraw.ImageDraw, ox: int, oy: int, direction: int, frame: int) -> None:
    bob = 1 if frame in (1, 3) else 0
    stride = -2 if frame == 1 else (2 if frame == 3 else 0)
    # Small grounded shadow, feet remain at y=42 in every frame.
    rect(draw, (ox + 9, oy + 40, ox + 23, oy + 43), "#00000066")
    rect(draw, (ox + 10 + stride, oy + 35, ox + 14 + stride, oy + 42), INK)
    rect(draw, (ox + 18 - stride, oy + 35, ox + 22 - stride, oy + 42), INK)
    rect(draw, (ox + 8, oy + 18 - bob, ox + 23, oy + 35 - bob), INK)
    rect(draw, (ox + 10, oy + 19 - bob, ox + 21, oy + 33 - bob), GREEN_1)
    rect(draw, (ox + 11, oy + 14 - bob, ox + 20, oy + 22 - bob), SKIN, INK)
    rect(draw, (ox + 11, oy + 12 - bob, ox + 20, oy + 16 - bob), HAIR)
    # Directional face cue and torch/weapon hand.
    if direction == 0:  # down
        rect(draw, (ox + 13, oy + 17 - bob, ox + 14, oy + 18 - bob), INK)
        rect(draw, (ox + 18, oy + 17 - bob, ox + 19, oy + 18 - bob), INK)
        rect(draw, (ox + 22, oy + 24 - bob, ox + 26, oy + 27 - bob), SKIN, INK)
    elif direction == 1:  # left
        rect(draw, (ox + 11, oy + 17 - bob, ox + 12, oy + 18 - bob), INK)
        rect(draw, (ox + 5, oy + 23 - bob, ox + 10, oy + 26 - bob), SKIN, INK)
    elif direction == 2:  # right
        rect(draw, (ox + 19, oy + 17 - bob, ox + 20, oy + 18 - bob), INK)
        rect(draw, (ox + 21, oy + 23 - bob, ox + 26, oy + 26 - bob), SKIN, INK)
    else:  # up
        rect(draw, (ox + 11, oy + 14 - bob, ox + 20, oy + 19 - bob), HAIR)
        rect(draw, (ox + 6, oy + 23 - bob, ox + 10, oy + 26 - bob), SKIN, INK)


def make_character() -> None:
    atlas, draw = image(4 * 32, 4 * 48)
    for direction in range(4):
        for frame in range(4):
            character_frame(draw, frame * 32, direction * 48, direction, frame)
    save(atlas, "character.png")


def item_icon(draw: ImageDraw.ImageDraw, ox: int, oy: int, item: int) -> None:
    cx, cy = ox + 16, oy + 16
    if item == 0:  # knife
        line(draw, [(cx - 9, cy + 8), (cx + 7, cy - 8)], INK, 5)
        line(draw, [(cx - 8, cy + 7), (cx + 6, cy - 7)], METAL_2, 3)
        rect(draw, (cx - 12, cy + 7, cx - 5, cy + 11), WOOD_1, INK)
    elif item == 1:  # pistol
        rect(draw, (ox + 5, oy + 8, ox + 25, oy + 14), METAL_1, INK)
        rect(draw, (ox + 20, oy + 12, ox + 27, oy + 16), METAL_0, INK)
        draw.polygon([(ox + 12, oy + 14), (ox + 19, oy + 14), (ox + 17, oy + 27), (ox + 11, oy + 27)], fill=WOOD_1)
        line(draw, [(ox + 12, oy + 14), (ox + 11, oy + 27), (ox + 17, oy + 27), (ox + 19, oy + 14)], INK, 1)
    elif item in (2, 3):  # magazine empty / loaded
        draw.polygon([(ox + 10, oy + 5), (ox + 21, oy + 5), (ox + 19, oy + 27), (ox + 12, oy + 27)], fill=METAL_0)
        line(draw, [(ox + 10, oy + 5), (ox + 21, oy + 5), (ox + 19, oy + 27), (ox + 12, oy + 27), (ox + 10, oy + 5)], INK)
        if item == 3:
            for bullet in range(3):
                rect(draw, (ox + 12 + bullet * 3, oy + 3, ox + 13 + bullet * 3, oy + 8), AMBER)
    elif item in (4, 5):  # ammo box open / closed
        rect(draw, (ox + 4, oy + 10, ox + 27, oy + 25), GREEN_1, INK)
        rect(draw, (ox + 7, oy + 13, ox + 24, oy + 17), GREEN_2)
        if item == 4:
            rect(draw, (ox + 5, oy + 5, ox + 26, oy + 10), GREEN_0, INK)
            for bullet in range(5):
                rect(draw, (ox + 7 + bullet * 4, oy + 11, ox + 8 + bullet * 4, oy + 18), AMBER)
    elif item in (6, 7):  # flask empty/full
        rect(draw, (ox + 9, oy + 7, ox + 22, oy + 27), METAL_1, INK)
        rect(draw, (ox + 12, oy + 4, ox + 19, oy + 8), METAL_2, INK)
        if item == 7:
            rect(draw, (ox + 11, oy + 15, ox + 20, oy + 25), BLUE)
    elif item == 8:  # tin
        rect(draw, (ox + 7, oy + 7, ox + 24, oy + 26), METAL_1, INK)
        rect(draw, (ox + 8, oy + 12, ox + 23, oy + 21), GREEN_1)
    elif item == 9:  # jerky
        draw.polygon([(ox + 5, oy + 11), (ox + 20, oy + 6), (ox + 27, oy + 15), (ox + 18, oy + 26), (ox + 6, oy + 22)], fill=RUST_1)
        line(draw, [(ox + 5, oy + 11), (ox + 20, oy + 6), (ox + 27, oy + 15), (ox + 18, oy + 26), (ox + 6, oy + 22), (ox + 5, oy + 11)], INK)
    elif item == 10:  # apple
        draw.ellipse((ox + 8, oy + 10, ox + 23, oy + 27), fill=RED, outline=INK)
        line(draw, [(ox + 16, oy + 12), (ox + 18, oy + 5)], WOOD_1, 2)
        rect(draw, (ox + 18, oy + 6, ox + 23, oy + 9), GREEN_2)
    elif item == 11:  # ration
        rect(draw, (ox + 5, oy + 7, ox + 26, oy + 26), GREEN_1, INK)
        rect(draw, (ox + 9, oy + 11, ox + 22, oy + 15), CREAM)
    elif item == 12:  # crackers
        rect(draw, (ox + 5, oy + 8, ox + 26, oy + 25), "#b99b66", INK)
        for dot in [(10, 13), (20, 13), (10, 21), (20, 21)]:
            rect(draw, (ox + dot[0], oy + dot[1], ox + dot[0] + 1, oy + dot[1] + 1), WOOD_0)
    elif item == 13:  # cleaner
        rect(draw, (ox + 9, oy + 9, ox + 21, oy + 27), BLUE, INK)
        rect(draw, (ox + 12, oy + 4, ox + 18, oy + 10), METAL_2, INK)
        line(draw, [(ox + 18, oy + 6), (ox + 25, oy + 6)], METAL_2, 2)
    elif item == 14:  # stone
        draw.polygon([(ox + 5, oy + 22), (ox + 9, oy + 9), (ox + 24, oy + 7), (ox + 27, oy + 21), (ox + 20, oy + 27)], fill=CONCRETE_3)
        line(draw, [(ox + 5, oy + 22), (ox + 9, oy + 9), (ox + 24, oy + 7), (ox + 27, oy + 21), (ox + 20, oy + 27), (ox + 5, oy + 22)], INK)
    else:  # brush
        rect(draw, (ox + 4, oy + 17, ox + 24, oy + 23), WOOD_2, INK)
        for bristle in range(5):
            line(draw, [(ox + 8 + bristle * 3, oy + 23), (ox + 8 + bristle * 3, oy + 28)], METAL_1)


def make_items() -> None:
    atlas, draw = image(8 * 32, 2 * 32)
    for item in range(16):
        item_icon(draw, (item % 8) * 32, (item // 8) * 32, item)
    save(atlas, "items.png")


def furniture_slot(draw: ImageDraw.ImageDraw, ox: int, oy: int, kind: int) -> None:
    # Every slot is 64x64 with its contact shadow at the bottom.
    rect(draw, (ox + 6, oy + 51, ox + 57, oy + 57), "#00000066")
    if kind == 0:  # bunk
        rect(draw, (ox + 6, oy + 11, ox + 57, oy + 54), WOOD_0, INK)
        rect(draw, (ox + 9, oy + 16, ox + 54, oy + 49), GREEN_1, INK)
        rect(draw, (ox + 10, oy + 15, ox + 28, oy + 27), CREAM, INK)
        for post in (7, 55):
            rect(draw, (ox + post, oy + 8, ox + post + 2, oy + 57), METAL_1, INK)
    elif kind == 1:  # storage trunk
        rect(draw, (ox + 5, oy + 19, ox + 58, oy + 52), GREEN_0, INK)
        rect(draw, (ox + 7, oy + 22, ox + 56, oy + 47), GREEN_1)
        line(draw, [(ox + 6, oy + 31), (ox + 57, oy + 31)], GREEN_2, 2)
        rect(draw, (ox + 27, oy + 29, ox + 36, oy + 38), AMBER, INK)
        rect(draw, (ox + 10, oy + 18, ox + 13, oy + 53), METAL_1)
        rect(draw, (ox + 50, oy + 18, ox + 53, oy + 53), METAL_1)
    elif kind == 2:  # weapon bench
        rect(draw, (ox + 3, oy + 20, ox + 60, oy + 48), WOOD_0, INK)
        rect(draw, (ox + 5, oy + 18, ox + 58, oy + 27), WOOD_2, INK)
        rect(draw, (ox + 9, oy + 29, ox + 54, oy + 35), GREEN_0)
        line(draw, [(ox + 14, oy + 29), (ox + 44, oy + 29)], METAL_2, 3)
        rect(draw, (ox + 43, oy + 27, ox + 53, oy + 32), WOOD_1, INK)
        rect(draw, (ox + 7, oy + 46, ox + 12, oy + 58), WOOD_1, INK)
        rect(draw, (ox + 51, oy + 46, ox + 56, oy + 58), WOOD_1, INK)
    elif kind == 3:  # faucet
        rect(draw, (ox + 13, oy + 20, ox + 50, oy + 55), METAL_0, INK)
        rect(draw, (ox + 17, oy + 25, ox + 46, oy + 49), "#151b1d", METAL_1)
        line(draw, [(ox + 31, oy + 24), (ox + 31, oy + 10), (ox + 45, oy + 10), (ox + 45, oy + 20)], METAL_2, 4)
        rect(draw, (ox + 26, oy + 7, ox + 36, oy + 11), RUST_1, INK)
        rect(draw, (ox + 31, oy + 35, ox + 33, oy + 45), BLUE)
    elif kind == 4:  # desk
        rect(draw, (ox + 5, oy + 19, ox + 58, oy + 47), WOOD_1, INK)
        rect(draw, (ox + 6, oy + 18, ox + 57, oy + 26), WOOD_2, INK)
        for drawer in range(2):
            rect(draw, (ox + 34, oy + 29 + drawer * 8, ox + 53, oy + 34 + drawer * 8), WOOD_0, INK)
            rect(draw, (ox + 42, oy + 30 + drawer * 8, ox + 45, oy + 32 + drawer * 8), AMBER)
    elif kind == 5:  # drawers
        rect(draw, (ox + 13, oy + 10, ox + 50, oy + 53), WOOD_1, INK)
        for drawer in range(4):
            rect(draw, (ox + 17, oy + 14 + drawer * 9, ox + 46, oy + 20 + drawer * 9), WOOD_2, INK)
            rect(draw, (ox + 30, oy + 16 + drawer * 9, ox + 34, oy + 17 + drawer * 9), AMBER)
    elif kind == 6:  # cupboard
        rect(draw, (ox + 9, oy + 7, ox + 54, oy + 55), GREEN_0, INK)
        rect(draw, (ox + 13, oy + 11, ox + 50, oy + 51), GREEN_1, METAL_1)
        line(draw, [(ox + 32, oy + 11), (ox + 32, oy + 51)], INK, 2)
        rect(draw, (ox + 27, oy + 30, ox + 30, oy + 34), AMBER)
        rect(draw, (ox + 34, oy + 30, ox + 37, oy + 34), AMBER)
    else:  # chest
        rect(draw, (ox + 7, oy + 23, ox + 56, oy + 52), WOOD_0, INK)
        rect(draw, (ox + 9, oy + 25, ox + 54, oy + 47), WOOD_1)
        rect(draw, (ox + 7, oy + 19, ox + 56, oy + 30), WOOD_2, INK)
        rect(draw, (ox + 28, oy + 28, ox + 36, oy + 39), AMBER, INK)
        rect(draw, (ox + 11, oy + 20, ox + 14, oy + 51), METAL_1)
        rect(draw, (ox + 49, oy + 20, ox + 52, oy + 51), METAL_1)


def make_furniture() -> None:
    atlas, draw = image(4 * 64, 2 * 64)
    for kind in range(8):
        furniture_slot(draw, (kind % 4) * 64, (kind // 4) * 64, kind)
    save(atlas, "furniture.png")


def enemy_frame(draw: ImageDraw.ImageDraw, ox: int, oy: int, kind: int, frame: int) -> None:
    if kind == 0:  # spider
        centre = (ox + 16, oy + 18 + (frame % 2))
        for leg in range(4):
            dy = leg * 4 - 6
            reach = 3 if (frame + leg) % 2 else 1
            line(draw, [(centre[0] - 3, centre[1] + dy // 2), (ox + reach, centre[1] + dy)], RUST_1, 2)
            line(draw, [(centre[0] + 3, centre[1] + dy // 2), (ox + 31 - reach, centre[1] + dy)], RUST_1, 2)
        draw.ellipse((ox + 10, oy + 10, ox + 22, oy + 25), fill=RUST_0, outline=INK)
        rect(draw, (ox + 13, oy + 12, ox + 14, oy + 13), RED)
        rect(draw, (ox + 18, oy + 12, ox + 19, oy + 13), RED)
    else:  # rat
        rect(draw, (ox + 7, oy + 22, ox + 24, oy + 25), "#00000066")
        draw.ellipse((ox + 7, oy + 11, ox + 24, oy + 24), fill="#675e58", outline=INK)
        draw.ellipse((ox + 19, oy + 8, ox + 27, oy + 17), fill="#80746b", outline=INK)
        rect(draw, (ox + 23, oy + 10, ox + 24, oy + 11), RED)
        tail_y = oy + 19 + (frame % 2)
        line(draw, [(ox + 8, oy + 19), (ox + 2, tail_y), (ox, tail_y - 3)], "#9b766d", 2)


def make_enemies() -> None:
    atlas, draw = image(4 * 32, 2 * 32)
    for kind in range(2):
        for frame in range(4):
            enemy_frame(draw, frame * 32, kind * 32, kind, frame)
    save(atlas, "enemies.png")


def effect_frame(draw: ImageDraw.ImageDraw, ox: int, oy: int, effect: int) -> None:
    cx, cy = ox + 16, oy + 16
    if effect < 4:  # muzzle flash frames
        radius = 4 + effect * 2
        draw.polygon([(cx, cy - radius), (cx + 3, cy - 3), (cx + radius, cy), (cx + 3, cy + 3), (cx, cy + radius), (cx - 3, cy + 3), (cx - radius, cy), (cx - 3, cy - 3)], fill=AMBER)
        rect(draw, (cx - 2, cy - 2, cx + 2, cy + 2), CREAM)
    elif effect < 8:  # impact
        radius = 3 + (effect - 4) * 2
        for angle in range(8):
            dx = [-1, -1, 0, 1, 1, 1, 0, -1][angle]
            dy = [0, -1, -1, -1, 0, 1, 1, 1][angle]
            line(draw, [(cx + dx * 2, cy + dy * 2), (cx + dx * radius, cy + dy * radius)], RED, 2)
    elif effect < 12:  # pickup glint
        radius = 2 + (effect - 8) * 2
        line(draw, [(cx, cy - radius), (cx, cy + radius)], CREAM, 2)
        line(draw, [(cx - radius, cy), (cx + radius, cy)], CREAM, 2)
    else:  # dust/flicker
        step = effect - 12
        for px, py in [(8 + step, 19), (14, 11 - step), (22 - step, 17), (18, 24)]:
            rect(draw, (ox + px, oy + py, ox + px + 1, oy + py + 1), CONCRETE_3)


def make_effects() -> None:
    atlas, draw = image(4 * 32, 4 * 32)
    for effect in range(16):
        effect_frame(draw, (effect % 4) * 32, (effect // 4) * 32, effect)
    save(atlas, "effects.png")


def make_bitmap_font() -> None:
    font_output = ROOT / "godot" / "assets" / "fonts"
    font_output.mkdir(parents=True, exist_ok=True)
    cell_width, cell_height, columns = 10, 16, 16
    characters = list(range(32, 127))
    rows = (len(characters) + columns - 1) // columns
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
    font = ImageFont.truetype(font_path, 12)
    atlas = Image.new("RGBA", (columns * cell_width, rows * cell_height), TRANSPARENT)
    draw = ImageDraw.Draw(atlas)
    lines = [
        'info face="Bunker Pixel" size=16 bold=1 italic=0 charset="" unicode=1 stretchH=100 smooth=0 aa=1 padding=0,0,0,0 spacing=1,1',
        f'common lineHeight={cell_height} base=13 scaleW={atlas.width} scaleH={atlas.height} pages=1 packed=0',
        'page id=0 file="bunker_pixel.png"',
        f'chars count={len(characters)}',
    ]
    for index, codepoint in enumerate(characters):
        x = (index % columns) * cell_width
        y = (index // columns) * cell_height
        glyph = chr(codepoint)
        # Draw without anti-aliasing by thresholding a small monochrome glyph.
        mask = Image.new("L", (cell_width, cell_height), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.text((1, -1), glyph, font=font, fill=255, stroke_width=0)
        mask = mask.point(lambda value: 255 if value >= 96 else 0)
        colour = Image.new("RGBA", mask.size, (232, 238, 232, 255))
        atlas.alpha_composite(Image.composite(colour, Image.new("RGBA", mask.size, TRANSPARENT), mask), (x, y))
        lines.append(
            f"char id={codepoint} x={x} y={y} width={cell_width} height={cell_height} "
            f"xoffset=0 yoffset=0 xadvance={cell_width} page=0 chnl=15"
        )
    atlas.save(font_output / "bunker_pixel.png", optimize=True)
    (font_output / "bunker_pixel.fnt").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    make_bunker_tiles()
    make_maze_tiles()
    make_character()
    make_items()
    make_furniture()
    make_enemies()
    make_effects()
    make_bitmap_font()
    print(f"Generated Godot pixel atlases in {OUTPUT}")


if __name__ == "__main__":
    main()
