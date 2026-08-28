# Thin Glass 1.8.1

Plugin API 1.18 / Theme Contract 3.6 theme profile.

- Theme plugin owns semantic tokens, role recipes and material parameters.
- Core owns the generic `thin-glass` material renderer and DOM composition.
- Scientific/data content and ordinary controls stay `clear`; chrome, sidebars and transient/elevated surfaces use Thin Glass.
- Thin Glass uses one optical layer only: low-radius backdrop blur plus restrained edge/inner/specular cues. It does not use Liquid Glass refraction, noise or multi-layer optical pseudo-elements.
