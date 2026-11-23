/** First non-invasive lint gate for a legacy CSS codebase.
 * The architectural rules are tested in tests/css-architecture.test.mjs.
 * Increase strictness as legacy modules are migrated; do not turn warnings off globally.
 */
export default {
  ignoreFiles:['**/astra.bundle.css'],
  rules:{
    'color-no-invalid-hex':true,
    'block-no-empty':true,
    'no-invalid-double-slash-comments':true,
    'declaration-block-no-duplicate-custom-properties':true,
  }
};
