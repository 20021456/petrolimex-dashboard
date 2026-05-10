# Workflow preferences

## Git: auto-commit + auto-push

After completing any edit task in this repo, automatically:

1. Stage the changed files (specific paths, NOT `git add .`).
2. Create logical commits — split unrelated changes into separate commits when it helps reviewability.
3. Merge feature branches into `main` with `--no-ff` so the history shows the merge boundary.
4. **Push `main` to `origin` immediately** — do not wait for the user to ask.

Skip the auto-push only if:
- The user explicitly says "don't push" / "không push" for this change.
- Hooks (pre-commit / pre-push) fail — fix the issue and retry rather than bypassing.
- The change touches credentials or secrets — pause and confirm with the user first.

Always include the trailer:
```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Never use `--no-verify`, `--force`, `git config` changes, or amend existing commits unless the user explicitly asks for any of those.
