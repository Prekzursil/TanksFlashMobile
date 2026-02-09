# Bundled SWF

This project serves the SWF from:

- `apps/web/public/original/tanks.swf`

That file is generated from the source-of-truth:

- `assets/original/tanks.swf`

To (re)generate it manually, run from `apps/web/`:

```bash
npm run sync:swf
```

The web app will try to load `/original/tanks.swf` automatically. If it’s missing, it will show a clear error and offer a file picker fallback.
