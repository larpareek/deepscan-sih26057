# Contributing to SEASCAN (SIH26057)

Thanks for helping! This is a hackathon project, so the process is kept light.

## Setup

Follow **Installation & Setup** in the [README](README.md). The backend (`src/`) and frontend (`ui/`) run independently. Without a backend, the UI falls back to a built-in demo scan.

## Workflow

1. Create a branch from `main`, e.g. `feat/geotiff-input` or `fix/shadow-mask`.
2. Keep each PR focused on one change. Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
3. Before pushing:
   ```bash
   ruff check .                      # Python lint (config in pyproject.toml)
   cd ui && npm run build            # frontend must build
   ```
4. Open a PR and fill in the template. CI runs the same two checks.

## Guidelines

- **Never commit** model weights (`*.pt`, `*.onnx`), datasets, uploads (`data/`) or secrets (`.env`). The `.gitignore` covers these.
- **Model changes:** include before/after metrics (mAP@50, precision, recall, latency) and the dataset split you used.
- **UI changes:** keep WCAG AA. Text contrast must be ≥ 4.5:1, targets ≥ 24 px on desktop and ≥ 44 px on touch screens, and everything must work with a keyboard. Don't convey meaning by colour alone. Respect `prefers-reduced-motion`.
- **API changes:** update the contract in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- Start new source files with the project header line (see any existing file).

## Reporting issues

Open a GitHub issue with steps to reproduce, the expected vs actual behaviour, and, if possible, a sample sonar image and its metadata.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
