# SDK 1.51 manual Unit Template parity example

This example deliberately **does not call** `ctx.ui.scientificWorkbench` and does not select `accepted-scientific-v1`.
It manually composes the accepted scientific layout from public `ctx.ui.unitTemplates` only.

It ships no CSS and contains no Resonance-private `respar-*` / `reswin-*` classes.
Its purpose is to prove that the preset is only a convenience composition of Unit Templates, not a second implementation path.
