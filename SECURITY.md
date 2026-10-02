# Security Policy

SEASCAN is a Smart India Hackathon 2026 prototype (SIH26057, MoES / NIOT) built by Team BLACK SWANS. It is not
an operational system, but it handles survey imagery and positions, so we take security reports seriously.

## Supported versions

Only the `main` branch and the live demo (<https://deepscan-sih26057-lilac.vercel.app>) are maintained.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Instead, use GitHub's private reporting:
**Security → Report a vulnerability** on this repository
(<https://github.com/larpareek/deepscan-sih26057/security/advisories/new>).

Include what you found, the steps to reproduce it and the impact you expect. We aim to acknowledge reports within
3 days and to fix confirmed issues in the live demo within 14 days. We will credit you in the fix unless you prefer
otherwise.

Please test only against your own local instance or with minimal, non-disruptive requests to the live demo, and do
not access, modify or delete data belonging to other users.

## How the prototype handles data and secrets

- **Secrets stay server-side.** The Gemini API key is read from the backend environment (`GEMINI_API_KEY`) and is
  never sent to the browser or committed; `.env` files are excluded from git and from the Docker image.
- **Uploads are bounded and validated.** Images are size-limited (`SSS_MAX_UPLOAD_MB`), decoded server-side and
  rejected if they are not valid PNG/JPEG; metadata must be valid JSON whose ping count matches the image.
- **No path injection.** Report downloads only accept 32-character hexadecimal job IDs.
- **Restricted cross-origin access.** In production the API only accepts browser requests from the deployed site
  (`SSS_CORS_ORIGINS`).
- **Abuse limits.** The SEASCAN AI chat endpoint is rate-limited per client and caps the size of the context sent
  to the model.
- **Data retention.** Uploaded scans and reports are kept on the backend's ephemeral disk only for processing and
  are lost when the service restarts. Do not upload classified or sensitive survey data to the public demo.
