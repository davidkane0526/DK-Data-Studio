# Branching Model

## Current local repository

This delivery contains a reconstructed local Git repository on branch `main`. The commits correspond to the actual ZIP snapshots produced during this DK Data Studio session. No remote repository was read or modified when creating this history.

Current development baseline: **v3.27.0**.

## Recommended future flow

Keep `main` as the local delivered baseline. For larger follow-up work, create a local feature branch and merge it only after tests pass:

```bash
git switch main
git switch -c feature/<name>
# implement
npm test
npm run check
git commit
git switch main
git merge --no-ff feature/<name>
```

Do not access, push to, or modify any remote repository unless the user explicitly requests it.

## Current delivery checkpoint

`v3.27.0` establishes plugin-neutral UI/state infrastructure in core. Resonance SUPER/TOP adapters are host-only, while feature behavior lives in plugin-owned Controller/View/feature-runtime layers. TER, Pulse and Data Center consume common portable-view and dynamic-action infrastructure; Data Center also uses the core state/project store. This is the baseline for further plugin rewrites without growing `app.js`.
