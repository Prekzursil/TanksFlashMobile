# Local SWF (not committed)

For local development, place the original SWF at:

- `assets/original/tanks.swf` (repo root, gitignored)

Then run, from `apps/web/`:

```bash
npm run sync:swf
```

This will copy it to:

- `apps/web/public/original/tanks.swf` (also should not be committed)

The web app will try to load `/original/tanks.swf` automatically. If it’s missing, it will show a clear error and offer a file picker fallback.
