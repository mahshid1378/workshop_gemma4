# Prerequisites — read & complete *before* Step 1

**Deploying Gemma 4 on Cloud Run with vLLM · GDG Cloud Manila**

This file is shared by all three tracks (L4·E4B, L4·12B, RTX·31B). Work through the checklist,
then read the expanded notes for anything you're unsure about. The deploy step
later **will** fail if you skip the Gemma terms — don't treat that one as
optional.

---

## ✅ Quick checklist

- [ ] **1.** A Google Cloud project with **billing enabled**
- [ ] **2.** You know your **Project ID** (not the project *name* — the ID)
- [ ] **3.** ~$10–20 of budget available (you'll spend far less; this is headroom)
- [ ] **4.** A **HuggingFace account** (free) at <https://huggingface.co>
- [ ] **5.** A HuggingFace **Read access token** (starts with `hf_…`)
- [ ] **6.** Accepted the **Gemma 4 license terms** for *your* track's model:
  - L4 · E4B track → <https://huggingface.co/google/gemma-4-E4B-it>
  - L4 · 12B track → <https://huggingface.co/google/gemma-4-12B-it>
  - RTX · 31B track → <https://huggingface.co/google/gemma-4-31B-it>
- [ ] **7.** Access to **Cloud Shell** (see [`00_cloud_shell_guide.md`](./00_cloud_shell_guide.md))
- [ ] **8.** A modern browser (Chrome recommended)
- [ ] **9.** *(Optional)* HTTP/2 enabled in your browser; `jq` installed locally
  (`jq` is already in Cloud Shell, so this only matters for testing from your laptop)

When every box is checked, open your track folder (`L4_gemma_e4b/`,
`L4_gemma_12b/`, or `RTX_gemma_31b/`) and start with `step_01_env_vars.md`.

---

## Expanded notes

### 1. GCP project with billing enabled

Cloud Run GPUs are a **paid product** — there is no free tier for GPU time. You
need a project linked to an active billing account.

- Go to <https://console.cloud.google.com>
- Top bar: the project picker shows your current project. Create a new one
  (recommended, for a clean teardown) or pick an existing one.
- Billing check: **Navigation menu → Billing**. If it says "This project has no
  billing account," click **Link a billing account**.

A fresh GCP account usually comes with free trial credits — those work fine here.

Keep ~$10–20 of available budget as a safety margin. Your **actual** spend is
roughly **L4: ~$1–3**, **RTX: ~$5–10**. The margin just means you won't get
throttled mid-demo. The real protection against surprise costs is running
`step_99_cleanup.md` at the end.

### 2. Finding your Project ID

The Project ID is **not** the display name. The name is human-friendly ("My
Workshop Project"); the ID is globally unique, often with a number suffix
(`my-workshop-project-417`).

- <https://console.cloud.google.com> → **Home / Dashboard**
- Look at the **Project info** card → copy the **Project ID** exactly.

You'll paste this into `step_01_env_vars.md` as `<YOUR_PROJECT_ID>`.

### 3. Budget

Covered above. Once more, because people forget: **run the cleanup step.** A
forgotten GPU service bills by the hour. `step_99_cleanup.md` removes all of it.

### 4. HuggingFace account

Gemma 4 weights are distributed through HuggingFace. You need a free account to
(a) accept the license and (b) generate a download token.

- Sign up at <https://huggingface.co> and verify your email so token creation is
  unlocked.

### 5. HuggingFace access token

Cloud Build (step 5) authenticates to HuggingFace with a token to download the
weights.

- Go to <https://huggingface.co/settings/tokens>
- **Create new token** → permission **Read** is enough (don't use Write/
  Fine-grained unless you know you need it)
- Name it e.g. `gdg-cloud-run-workshop`
- **Copy the value immediately** — it looks like `hf_xxxxxxxxxxxxxxxxxxxx` and
  you can't view it again after leaving the page. Lost it? Just create another.

Keep it handy for `step_01_env_vars.md`. **Treat it like a password** — don't
commit it or paste it into a public chat.

### 6. Accept the Gemma 4 license terms ⚠️ *do not skip*

Gemma models are **gated** on HuggingFace. Even with a valid token, the download
in step 5 returns **403 Forbidden** until *you* (the logged-in account that owns
the token) have clicked "Acknowledge license" on the model page.

While logged in to HuggingFace, open the page for **your** track and accept:

- L4 · E4B track → <https://huggingface.co/google/gemma-4-E4B-it>
- L4 · 12B track → <https://huggingface.co/google/gemma-4-12B-it>
- RTX · 31B track → <https://huggingface.co/google/gemma-4-31B-it>

Agree to Google's usage license (fill in the form if prompted). Acceptance is
usually instant. **This is the #1 cause of a failed step 5 — do it now.**

### 7. Cloud Shell access

Every command runs in Cloud Shell — a free, browser-based Linux terminal with
`gcloud`, `jq`, `python`, etc. already installed. No local setup. Full
walkthrough: [`00_cloud_shell_guide.md`](./00_cloud_shell_guide.md).

### 8. A modern browser

Chrome is recommended. Firefox and Edge also work. Very old browsers may
struggle with Cloud Shell's terminal.

### 9. Optional but recommended

- **HTTP/2:** streaming responses (Server-Sent Events) in step 10 feel snappier
  over HTTP/2. Modern browsers enable it by default — nothing to do unless you
  turned it off.
- **`jq`:** we use it to pretty-print JSON. It's **already in Cloud Shell**, so
  do nothing. Only install locally (`brew install jq` / `apt-get install jq`) if
  you'll call the endpoint from your own machine afterward.

---

**Next →** read [`00_cloud_shell_guide.md`](./00_cloud_shell_guide.md), then open
your track folder and begin with `step_01_env_vars.md`.
