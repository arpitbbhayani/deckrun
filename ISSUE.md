# Build broken on `master`: four modules missing — app cannot start / themes not visible

**Repository:** `arpitbbhayani/deckrun` (mirrored at `shivamnarkar47/deckrun`)
**Branch:** `master` (`71518b6`, post-PR #7)
**Severity:** Blocker — `npm run build` fails and the compiled app crashes on launch.
**Symptom reported:** newly added themes (`kanagawa`, `shadcn`) are not visible — because no theme can render at all.

---

## Summary

`npm run build` fails with missing-module errors and `node dist/index.js --list-themes` crashes with `ERR_MODULE_NOT_FOUND`. The source tree imports four modules that do not exist in the repository — not in the working tree, not in any commit, not in any branch. Because `tsc` still emits JS on error, a fresh `dist/` is produced but every file that imports these modules fails at runtime, so the CLI, editor, preview, and theme picker are all unreachable.

## The missing modules

| Module | Imported by | Feature |
|---|---|---|
| `src/presentation-options.ts` | `generate.ts`, `index.ts`, `editor.ts`, `preview.ts` | composition templates (`classic`/`minimal`/`editorial`/`spotlight`) and transitions (`slide`/`fade`/`zoom`/`lift`/`none`) |
| `src/rich-content.ts` | `generate.ts`, `preview.ts` | KaTeX math and Mermaid diagrams |
| `src/fragments.ts` | `generate.ts`, `preview.ts` | incremental reveal (`{reveal}`) |
| `src/lint.ts` | `index.ts` | `deckrun lint` |

## Reproduction

```bash
git clone https://github.com/arpitbbhayani/deckrun.git
cd deckrun
npm install
npm run build
```

Output:

```
src/editor.ts(32,8): error TS2307: Cannot find module './presentation-options.js'
src/generate.ts(27,8): error TS2307: Cannot find module './presentation-options.js'
src/generate.ts(33,8): error TS2307: Cannot find module './rich-content.js'
src/generate.ts(34,48): error TS2307: Cannot find module './fragments.js'
src/index.ts(41,8): error TS2307: Cannot find module './presentation-options.js'
src/index.ts(42,46): error TS2307: Cannot find module './lint.js'
src/preview.ts(29,8): error TS2307: Cannot find module './presentation-options.js'
src/preview.ts(34,8): error TS2307: Cannot find module './rich-content.js'
src/preview.ts(35,48): error TS2307: Cannot find module './fragments.js'
```

Runtime:

```bash
node dist/index.js --list-themes
# Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../dist/presentation-options.js' imported from .../dist/generate.js
```

Deleting `dist/` and rebuilding does not help — the source files themselves are absent.

## Why this happened

The features were announced in `db66c06` ("rich content, templates, transitions, reveals, and deck lint") and merged via PR #7 (`71518b6`), but the implementing files were never committed. `npm@1.4.0` predates these imports and still runs, which is why the published package is unaffected.

## Scope of a fix

To restore a buildable tree, each module must provide the exports its consumers expect:

- **`presentation-options.ts`**: `DEFAULT_TEMPLATE`, `DEFAULT_TRANSITION`, `TEMPLATE_CSS`, `TRANSITION_CSS`, `TEMPLATES`, `TEMPLATE_BY_ID`, `TRANSITIONS`, `TRANSITION_BY_ID`, `findTemplate`, `findTransition`, `resolveTemplateName`, `resolveTransitionName`, `templateListing`, `transitionListing`, `templateSummaries`, `transitionSummaries`, types `TemplateName`/`TransitionName`.
- **`rich-content.ts`**: `RICH_CONTENT_CSS`, `RICH_CONTENT_RUNTIME`, `richContentFeatures`, `richContentHead`.
- **`fragments.ts`**: `FRAGMENT_CSS`, `FRAGMENT_RUNTIME` (`window.deckrunPrepareFragments`).
- **`lint.ts`**: `lintMarkdown`, type `LintIssue`.

## Fix included in linked PR

This issue is fixed in the companion PR which:

- restores all four modules with faithful implementations derived from the README specs and call-site contracts,
- adds `kanagawa` and `shadcn` themes (which were previously invisible due to this defect),
- adds a `curl | sh` one-command installer (`install.sh`) and documents it in `README.md`.

After the fix: `npm run build` exits 0, `--list-themes` shows 16 themes including `kanagawa`/`shadcn`, `--list-templates`/`--list-transitions` work, and `deckrun lint` passes.

## Environment

- Node 18/20/22/24 (tested on 26.7.0), `tsx` for `npm run dev`, `"module": "NodeNext"` (`.js` extensions in imports).
