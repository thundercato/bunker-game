# Field Signal: Dead Air v9 | Credits and source provenance

## New original base music

**Relay Lanterns**, an original 128-second procedural composition and synthesis for this release. Warm sustained harmonies, sparse electric-piano tones and a gentle room tail, without percussion or ominous low drones. No third-party samples, copied melody or recorded performer. The source generation script is preserved under `tools/create_refuge_music.py` in the repository. Existing field ambience remains separate.

## Imported 3D equipment

All six new model families below are from Poly Haven, under CC0 1.0. Licence: https://polyhaven.com/license . Texture maps reduced to 384 or 512 pixels; selected modules used for held objects and loose loot; locally packed into GLB data banks.

- **Service Pistol** by Mateusz Sadek: https://polyhaven.com/a/service_pistol . Includes the model's compatible magazine components. The gameplay name PM is a fictionalised game designation, not a claim that the mesh exactly reproduces a Makarov.
- **Signal Flashlight** by Jiří Ptáček: https://polyhaven.com/a/signal_flashlight
- **Vintage Flashlight** by Omar M. El-Safy: https://polyhaven.com/a/vintage_flashlight
- **Boombox** by Thomas Paul Mouilleron: https://polyhaven.com/a/boombox . Used as the AM/FM-style music receiver. The task radio intentionally remains a transceiver.
- **Bolt Action Rifle 7.62** by Mateusz Sadek: https://polyhaven.com/a/bolt_action_rifle_7_62 . Used for the fictional R7 patrol rifle.
- **Fish Knife** by Mateusz Sadek: https://polyhaven.com/a/fish_knife . Used as the scavenged knife model.

The previous twenty imported model families, architecture and textures retain their credits in V7_CREDITS.md and V8_CREDITS.md. No assets from Into the Radius or STALKER are included.

## Doors, searching and vault sound

**100 CC0 SFX** by rubberduck, CC0: https://opengameart.org/content/100-cc0-sfx . Source files include `door_open.ogg`, `door_close_02.ogg`, `wooded_box_open.ogg`, `paper_01.ogg`, `paper_03.ogg`, `metal_09.ogg` and `slam_04.ogg`.

Modifications: clip selection, paper-handling concatenation, playback-rate changes for heavy vault movement, filtering, loudness normalisation and short click-prevention fades; converted to mono MP3. The mission alert is an original two-tone synthetic cue. Existing gun, ghost, footstep and weather sound credits remain in the earlier manifests.

## Radio programme

The receiver cycles three independently licensed recordings, with band-limited playback, spatial attenuation and original low-level crackle:

- **The Accordion Sample IV** by Spring Spring, CC0 option: https://opengameart.org/content/the-accordion-sample-iv
- **The Accordion Sample** by Spring Spring, CC0: https://opengameart.org/content/the-accordion-sample
- **A Sailor's Chant** by Thimras, CC0: https://opengameart.org/content/a-sailors-chant

Radio edits are filtered, normalised and encoded at 48 kbps, with a shortened 118-second second tune. These are atmospheric folk/synth recordings, not authentic Ukrainian or Russian broadcasts. The base background score is not this radio playlist and has no upbeat rhythm.

## Mission dossiers

The fifteen reconnaissance photographs are screenshots rendered from the actual game destinations, then lightly desaturated and contrast-adjusted. They are not presented as documentary photographs or newly AI-generated imagery. Classified-paper styling, rubber-stamp labels and hand-drawn red map circles are authored UI. All mission maps use the real world coordinates. Older generated concept images remain art-direction references.

## Software and testing

Three.js r170, loaders, geometry utilities and RoundedBoxGeometry: MIT. Pyodide 0.27.7: MPL-2.0 with bundled Python and dependency notices. Full applicable notices are retained under vendor/ and earlier source credits.

Gamepad and optional haptic integrations use the browser's actual exposed APIs. A successful software request is not proof that a phone or controller physically vibrated. No native iPhone/controller hardware was available during development.

No font files, personal saved games, account credentials or proprietary commercial-game assets are distributed in this source.
