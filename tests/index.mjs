// On Node 22, `node --test tests/` runs this folder as one module (package.json "main"),
// so load every *.test.mjs file here. `node --test` with no folder finds them directly.
import { readdirSync } from 'node:fs';

const here = new URL('.', import.meta.url);
for (const f of readdirSync(here).filter((n) => n.endsWith('.test.mjs')).sort()) await import(new URL(f, here));
