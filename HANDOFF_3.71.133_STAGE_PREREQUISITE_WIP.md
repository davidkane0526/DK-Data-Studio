# DK Data Studio — HANDOFF 3.71.133 Phase F Verified Build Baseline

## 1. Scope and source identity

- App: **3.71.133**
- SDK: **1.51.90**
- Plugin API: **1.19.0**
- Unit Templates: **2.5.38** (**41 Units / 73 Layout recipes**, unchanged)
- Android versionCode: **273**
- Verified source HEAD: `80c2c1dbadec9bcf94647cb6515d7f760044b3ec`
- Git tree for the verified source: `7fe0bf73d3c2ece456f98e4e9d120ae38bed2706`
- Build date: **2026-10-09 UTC**

This document replaces the earlier WIP verification checklist with evidence from successful GitHub Actions runs. The verified build baseline is the exact source HEAD above. A subsequent documentation-only commit is not itself the same SHA and must not be mistaken for a rebuilt executable.

## 2. What Phase F 3.71.133 implements

- `sdk/python/dkds_source_import.py` constructs the canonical `dkds.stage-execution-plan.v1` from the existing selected Stage Artifact DAG.
- Stages specify Stage, Action and Task identifiers, prerequisite Stages and Tasks, and expected typed Artifact outputs.
- `sdk/python/dkds_plugin_gen.py` validates the one-to-one relationship with Core Tasks and emits one shared prerequisite Action scheduler.
- Invoking a downstream Stage schedules transitive prerequisites through the existing **Core Task Runner** and **ArtifactStore**. Execution-chain and in-flight work is deduplicated.
- Missing, mismatched or failed prerequisite Artifacts block dependent Stages rather than silently continuing.
- Automatically invoked prerequisite Stages suppress incidental clipboard/CSV Host effects; explicitly invoked targets retain those effects.
- No cross-invocation cached Artifact value is assumed valid. A new invocation recalculates dynamic parameters and sources.
- Non-DAG single-function Python plugins do not acquire a scheduler. The established maximum of eight Actions is unchanged.
- Phase F prerequisite, multi-action, Stage chaining and typed boundary regressions are registered in the existing test/check manifests.

## 3. Verified CI for the exact source commit

### Windows

- Workflow: **Build Windows**, run **#456**
- Run ID: `37895003024`
- Job: **Windows x64**, job ID `113704598452`
- Conclusion: **SUCCESS**
- Full `npm run check` log ends: **[DKDS tests] check PASS (523)**

Artifacts (GitHub Actions IDs; stored artifacts, not local sandbox files):

- Portable: `DK-Data-Studio-Portable-80c2c1dbadec9bcf94647cb6515d7f760044b3ec` (ID `11600610547`, SHA-256 `dff3f5c0668f27b0ba619fac0c5ccc068372659bc433bc64e4ee033a313a14ca`)
- Setup: `DK-Data-Studio-Setup-80c2c1dbadec9bcf94647cb6515d7f760044b3ec` (ID `11600760067`, SHA-256 `0e89504a805387be938765f0616131db16d98430b568f0394152b02f014102e8`)
- Complete Windows: `DK-Data-Studio-Windows-80c2c1dbadec9bcf94647cb6515d7f760044b3ec` (ID `11600560862`, SHA-256 `6c8c20cae41fb96652dadca7e33a52fd4e2c679bcab706914cdda0d466717aca`)
- Clean project: `DK-Data-Studio-Project-80c2c1dbadec9bcf94647cb6515d7f760044b3ec` (ID `11600121405`, SHA-256 `0d99a08ad144cbce7d6f1726e4087b1dd01fcaa95235393cf02dced45d36ac66`)

### Android

- Workflow: **Build Android**, run **#469**
- Run ID: `37895002785`
- Job: **Android arm64 Release APK**, job ID `113704663733`
- Conclusion: **SUCCESS**
- APK Signature Scheme v2 verified **true** in build log
- Artifact: `DK-Data-Studio-Android-arm64-release-80c2c1dbadec9bcf94647cb6515d7f760044b3ec`
- Artifact ID: `11600725426`
- Artifact ZIP SHA-256: `cf3fa055cfccdafe498bb33a8a8b565acc9ac6937fca397f3d5965abe2a12057`

Actions:
- https://github.com/davidkane0526/DK-Data-Studio/actions/runs/37895003024
- https://github.com/davidkane0526/DK-Data-Studio/actions/runs/37895002785

## 4. What verification does and does not establish

The referenced source commit passed both Windows and Android release workflows, including the 523-case full check and APK signing checks. CI success does **not** establish all real-device UI, GPU, scientific-data workflow or long-duration runtime behavior. Those remain separate acceptance questions and should not be represented as tested.

## 5. Architecture invariants

- Keep Core / Presenter domain-blind.
- Keep the six production plugins' single Unit composition ownership.
- Keep Unit Templates **2.5.38**, **41 Units**, **73 Layout recipes** unless a demonstrated shared contract defect requires reopening.
- Keep one Core Task Runner, one ArtifactStore and canonical lineage.
- Python is authoring-time only. Do not ship a second Python runtime, alternate scientific worker, UI engine, notebook state store or parallel workflow engine.
- Reject unsupported source transformations explicitly, without silent fallback.
- Do not create plugin-ID special cases, plugin-private managed responsive geometry or extra Actions beyond public contracts.

## 6. Next development stage

With Phase F prerequisite scheduling incorporated into the verified CI baseline, proceed to **independent end-to-end generated-plugin acceptance** of realistic Python/Jupyter workflows: source import, root and Stage selection, package build, install, runtime Task invocation, typed Artifact lineage, prerequisite failure propagation and Host-effect suppression. Separate static/generator regression success from actual desktop/Android runtime acceptance. Expand supported Python constructs only where needed by concrete tested workflows; do not expand Unit/Core by default.

## 7. Handoff rule

Before subsequent changes, compare `dev` HEAD against verified source `80c2c1dbadec9bcf94647cb6515d7f760044b3ec`. If a documentation-only closure commit follows, preserve this precise distinction. Future executable build claims require CI tied to the new exact commit.
