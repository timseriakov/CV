# Install ego lite (the ego-browser runtime)

Read this file only when the `ego-browser` command is missing or the user asks to install ego lite. For cloning work, go back to `SKILL.md`.

This skill drives every live-page operation through the `ego-browser` CLI, which is provided by the ego lite browser app. Once ego lite is installed and first-run onboarding is done, the environment is ready and stays ready.

ego lite website: https://lite.ego.app/

## Decision order when `ego-browser` is missing

1. If the standalone `ego-browser` skill is installed in this environment, defer to its `references/install.md` and `scripts/install.sh`; it is the canonical installer and may be newer.
2. Otherwise use the vendored copy in this skill: `scripts/install-ego-browser.sh` (same script, carried here so this skill works standalone).

## Install steps (macOS only)

The script will:
- Download the ego lite installer DMG for the machine's CPU architecture (arm64 / x64).
- Install `ego lite.app` to `/Applications` (falling back to `~/Applications` when needed).
- Strip the quarantine attribute so Gatekeeper does not block the first launch.
- Launch the ego lite app. If ego lite is already installed, it skips the download and just opens the app.

Run it with the script's actual path under this skill's directory:

```bash
sh <path-to-this-skill>/scripts/install-ego-browser.sh
```

## Onboarding, a user step you must wait for

After the script opens ego lite, the user completes first-run onboarding in the app GUI:
- Optionally import data from Chrome or another browser.
- Onboarding registers the `ego-browser` command on the PATH (usually under `~/.local/bin`).

Tell the user exactly this, then stop and wait for their confirmation that onboarding is finished. Do not poll, do not retry browser commands in a loop while they onboard.

## Confirm and resume

```bash
command -v ego-browser
```

When this prints a path, return to `SKILL.md` and continue from where the task stopped. If it prints nothing after onboarding, ask the user to restart their terminal session (PATH refresh) before investigating anything else.
