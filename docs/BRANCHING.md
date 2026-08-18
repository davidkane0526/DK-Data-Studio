# Branching Model

## Current local repository

This delivery contains a reconstructed local Git repository on branch `main`. The commits correspond to the actual ZIP snapshots produced during this DK Data Studio session. No remote repository was read or modified when creating this history.

Current development baseline: **v3.24.0**.

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

`v3.24.0` adds user-controlled plugin prewarming, a true dedicated Resonance TOP runtime, robust self-contained project parsing/saving, the plugin-manager viewport repair, and TER improvements selectively absorbed from the provided Graphene Resonance Studio project.
