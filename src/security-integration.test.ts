import assert from "node:assert/strict";
import test from "node:test";
import { generateDocHtml, injectDocBridge } from "./generate.js";
import { generatePreviewHtml } from "./preview.js";

test("sandboxed HTML documents receive one validated presenter bridge", () => {
  const raw = "<!doctype html><html><body><button>hello</button></body></html>";
  const bridged = injectDocBridge(raw);

  assert.match(bridged, /data-deckrun-bridge/);
  assert.ok(bridged.startsWith(raw));
  assert.equal(injectDocBridge(bridged), bridged);
  assert.notEqual(
    injectDocBridge("<!doctype html><p>data-deckrun-bridge is ordinary text</p>"),
    "<!doctype html><p>data-deckrun-bridge is ordinary text</p>"
  );

  const wrapper = generateDocHtml("/__remote-doc", "Example");
  assert.match(wrapper, /sandbox="allow-scripts allow-forms allow-modals allow-popups"/);
  assert.doesNotMatch(wrapper, /sandbox="[^"]*allow-same-origin/);
  assert.match(wrapper, /e\.source !== elFrame\.contentWindow/);
  assert.match(wrapper, /deckrun-doc-event/);
});

test("the sandboxed Markdown preview accepts commands only from its parent", () => {
  const preview = generatePreviewHtml();
  assert.match(preview, /e\.source !== window\.parent/);
});
