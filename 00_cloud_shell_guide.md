# Cloud Shell guide — your terminal for this workshop

**Deploying Gemma 4 on Cloud Run with vLLM · GDG Cloud Manila**

Shared by all three tracks (L4·E4B, L4·12B, RTX·31B). Used Cloud Shell before? Skim **Open it** and
**Saving env vars** and move on. First time? Read the whole thing — it's short.

---

## What Cloud Shell is

A free, browser-based Linux terminal Google gives every GCP user. It runs on a
small VM provisioned on demand, with the whole toolchain pre-installed:

> `gcloud`, `gsutil`, `kubectl`, `docker`, `git`, `jq`, `curl`, `python3` + `pip`,
> `node` + `npm`, and more.

Because it's already authenticated to your Google account and already has
`gcloud` configured, you can run cloud commands the moment it opens — zero
install.

## Why we use it

- **No local setup.** Nobody fights PATH issues during a live session.
- **Same environment for everyone.** "Run this" behaves identically for you and
  the speaker.
- **Persistent home directory.** Your `$HOME` (5 GB) survives across sessions, so
  saved files stick around between breaks — even across days.

## How to open it (any one works)

1. **From the GCP console (most common):** go to
   <https://console.cloud.google.com> and click the Cloud Shell icon in the
   **top-right** — a terminal prompt `>_` symbol. A panel slides up from the
   bottom.
2. **Direct URL:** open <https://shell.cloud.google.com> for a full-screen
   Cloud Shell.
3. **Mobile app:** in the Google Cloud app, tap the menu → **Cloud Shell**. (Fine
   in a pinch; a laptop is far easier for a workshop.)

## First-time setup prompts

The very first time you ever open Cloud Shell — only once per account:

- **"Authorize Cloud Shell"** — it asks to use your credentials to call gcloud on
  your behalf. Click **Authorize**.
- **Provisioning** — it spins up your free VM (~30 seconds). You'll see
  "Provisioning your Cloud Shell machine…".
- A **welcome / tutorial** screen may appear — close it.

After that, future launches open in a couple of seconds.

## Confirm it's working

```bash
gcloud auth list
# Shows the account(s) Cloud Shell is authenticated as. You should see your
# Google email with an ACTIVE marker (*) next to it.

echo $GOOGLE_CLOUD_PROJECT
# Prints the project Cloud Shell currently targets. It may be empty or wrong —
# that's fine, we set it explicitly next.
```

## Set your project

```bash
gcloud config set project YOUR_PROJECT_ID
# Replace YOUR_PROJECT_ID with your real Project ID (NOT the display name).
# Find it at console.cloud.google.com -> Home -> "Project info" card -> Project ID.
# See 00_prerequisites.md.
```

You only need this once per session; `step_01` sets it again as part of env-var
setup, so it's belt-and-suspenders.

## Useful Cloud Shell features

- **Tab completion:** start a `gcloud` command and press <kbd>Tab</kbd> to
  complete subcommands and flags.
- **Open Editor:** the pencil / **Open Editor** button gives a VS Code-like file
  editor in the browser — handy for reading the `cloudbuild.yaml` we generate in
  step 5.
- **Upload / download files:** the three-dot (`⋮`) menu in the terminal toolbar →
  Upload / Download.
- **Persistent `$HOME`:** anything under your home directory survives across
  sessions (5 GB quota).
- **`tmux`** is pre-installed for long background jobs. (Not needed here — our
  long job runs in Cloud Build, not the shell.)

## Pasting in Cloud Shell

You can paste large blocks at once; commands run in sequence. <kbd>Ctrl</kbd>+
<kbd>V</kbd> (<kbd>Cmd</kbd>+<kbd>V</kbd> on Mac) pastes — allow the one-time
browser "allow paste" prompt. If a pasted block's last line has no trailing
newline, press <kbd>Enter</kbd> once to run it.

## Saving environment variables across sessions ⚠️

Variables set with `export FOO=bar` live only for the **current** shell session.
If Cloud Shell disconnects (timeout, refresh, network blip), those exports are
**gone** — but your files are not. So:

- Keep `step_01_env_vars.md` open in a separate browser tab.
- If your session drops, re-paste the `step_01` block to re-export everything,
  then continue where you left off.

Every step file re-states which variables it needs, so you'll know if you've lost
your environment (commands will complain about empty variables).

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Cloud Shell session expired" / disconnected | Refresh or click **Reconnect**. Files are intact; re-paste `step_01` to restore env vars. |
| "Weekly usage limit exceeded" | Rare for one workshop. Fall back to the GCP console UI, or retry after the limit window resets. |
| Slow / laggy | Try a different network. Cloud Shell's VM lives in `us-central1` regardless of your project's region, so a far-away network feels sluggish even when your service is in `asia-southeast1`. That's expected and doesn't affect your deployed service. |

---

**Next →** open [`00_prerequisites.md`](./00_prerequisites.md) and confirm
**every** item, then open your track folder (`L4_gemma_e4b/`, `L4_gemma_12b/`, or
`RTX_gemma_31b/`) and begin with `step_01_env_vars.md`.
