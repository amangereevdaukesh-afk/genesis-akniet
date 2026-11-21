# Development and release

Use develop for active work. Commit and push each tested milestone to origin/develop. Include the source, migrations, configuration examples, tests and documentation needed to reproduce it. Keep credentials, real environment files, personal data, build output and temporary evidence local.

Run npm ci on a fresh checkout and npm run build before releasing. Exercise the changed feature and use Vercel previews for review. Production uses the existing Museum of Days project. Merge develop into main only after the required features pass, including account creation and recovery, cross-device memory playback, consent and visibility rules, storage isolation and the mobile visitor flow. Check README, the published file list and the history for secrets before the final merge and production deployment.
