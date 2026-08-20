# DK Data Studio v3.46.1 Verification

v3.46.1 is a focused runtime hotfix driven by the first complete v3.46.0 in-app TOP renderer report.

## Field failure reproduced by the report

The v3.46.0 automation runner discovered and exercised all four configured TOP renderers. Data Center, Resonance Workbench and TER reached ready, while Pulse failed during activity activation. The visible error (`plugin did not register workspace: pulse`) was secondary: the Pulse activity existed, but its `onActivate` render path threw before `activities.set()` could return success.

Pulse still contained a legacy direct DOM write to `#pulseAnalyzeCurrentBtn`. That button id was removed when the header controls migrated to the Core ActionGroup runtime. A main-shell plugin load did not expose the defect because a non-SUPER Pulse activity is not invoked there; the dedicated TOP renderer invokes Pulse immediately and therefore hit the stale lookup on an empty project.

## Fixes

- Guard the removed legacy Pulse control during empty-state rendering. Pulse commands already handle an empty selection safely.
- Dedicated TOP runtime now inspects the target plugin state after activation and reports the original activation error instead of masking it as a missing workspace.
- Automation TOP coverage now records `discovered`, `tested`, `passed`, `failed`, and per-activity outcomes. Coverage fails if any exercised TOP does not reach ready.
- Added a headless regression that renders the Pulse empty state without the removed legacy button.

## Required field acceptance

Run **软件管理 → 自动化测试 → 运行全部自动化测试** in the built application. The TOP section must report all four activities as passed, and coverage must be `discovered=4`, `tested=4`, `passed=4`, `failed=0`.
