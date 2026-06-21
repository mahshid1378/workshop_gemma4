# Contributing

This workshop began as a GDG Cloud Manila 2026 session and is meant to be forked,
remixed, and re-run at your own community event.

## Fork & adapt
1. Fork the repo.
2. Pick or add a track folder named `<GPU>_gemma_<size>/`, keeping the
   `step_01`…`step_10` (+ optional `step_11`) layout so the parallel-tracks
   teaching trick still works.
3. For a new GPU/model, change values only in `step_01_env_vars.md` and
   `step_08_vllm_config.md`; the rest of the flow is model-agnostic.
4. Update the track table in `README.md`, and `SHARED_BUCKET.md` if you host a cache.

## Conventions
- Plain Markdown; commands in fenced ```bash blocks with inline `#` explainers.
- **No secrets** in checked-in files — use placeholders (`<YOUR_PROJECT_ID>`,
  `<YOUR_HF_TOKEN>`). The shared-bucket URL is the only intentionally-public resource.
- Keep tracks structurally parallel: same step numbers/names, only values differ.

## Issues & PRs
A flag changed? A region gained or lost GPU quota? Open an issue or PR with the
fix and the date you verified it.

## License
Contributions are accepted under the repo's [Apache 2.0](./LICENSE) license.
