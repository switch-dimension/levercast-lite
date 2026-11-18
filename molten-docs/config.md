---
issue_tracker: github
tracker_sync: true            # false = keep tasks in the plan only
github:
  repo: switch-dimension/levercast-lite
statuses:                     # GitHub Issues: open/closed plus a label for in progress
  todo: open
  in_progress: in-progress    # label
  done: closed
label: molten                 # applied to every issue Molten creates
---

# Molten config

**Task source: GitHub Issues** (`tracker_sync: true`). It is the single source of truth and holds every task's details and status. Plans in `molten-docs/plan/` only link to issues. They have no checkboxes, so never tick or annotate task status in a plan. File findings as new issues under the feature's parent issue. (See `AGENTS.md` → Task tracking.)

## Tracker operations

GitHub Issues on `switch-dimension/levercast-lite`, via the `gh` CLI.

- **create:** `gh issue create --repo switch-dimension/levercast-lite --title "<title>" --body-file <file> --label molten`
- **parent:** create the parent first, then add each task as a sub-issue: `gh api -X POST repos/switch-dimension/levercast-lite/issues/<parent>/sub_issues -F sub_issue_id=<task issue id>`. If that fails, list `- [ ] #<n>` task links in the parent body instead.
- **block:** `gh api -X POST repos/switch-dimension/levercast-lite/issues/<n>/dependencies/blocked_by -F issue_id=<blocking issue id>`. If that fails, add `Blocked by #<n>` to the task body instead.
- **start:** `gh issue edit <n> --repo switch-dimension/levercast-lite --add-label in-progress --add-assignee @me`
- **finish:** `gh issue close <n> --repo switch-dimension/levercast-lite --comment "Done in <commit sha or PR link>. Verify: <result>"` (and `--remove-label in-progress`)
- **comment:** `gh issue comment <n> --repo switch-dimension/levercast-lite --body "<text>"`
- **read status:** `gh issue view <n> --repo switch-dimension/levercast-lite --json state,labels,assignees`
- Commits reference the issue: `Refs #<n>`, or `Closes #<n>` when the commit finishes it.

Issue IDs (for `sub_issue_id` / `issue_id`) come from `gh api repos/switch-dimension/levercast-lite/issues/<n> -q .id`.
