# Thin Glass 1.10.0

Plugin API 1.18 / Theme Contract 3.8 theme profile.

- Theme owns semantic tokens, role appearance, role recipes, material parameters, state colors and the optional default scientific series palette.
- Core owns Material Role assignment, generic `thin-glass` rendering and DOM composition.
- Scientific/data content and ordinary controls stay clear; chrome, sidebars and transient/elevated surfaces use restrained Thin Glass.
- Explicit scientific series colors always override the Theme fallback palette.
- Thin Glass uses one optical layer only: low-radius backdrop blur plus restrained edge/inner/specular cues.
