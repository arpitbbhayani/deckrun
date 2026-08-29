import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_LIMITS,
  AiError,
  generateAiPresentation,
  listAiModels,
  providerSummaries,
  validateAiConnection,
  type AiFetch,
  type AiGenerateInput,
} from "./ai.js";

test("manual model connections still validate and normalize credentials locally", () => {
  assert.deepEqual(validateAiConnection("openai", "  test-key  "), {
    provider: "openai",
    apiKey: "test-key",
  });
  assert.throws(
    () => validateAiConnection("unknown", "test-key"),
    (error: unknown) => error instanceof AiError && error.code === "invalid_provider"
  );
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fakeFetch(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>
): AiFetch {
  return (async (input: string | URL | Request, init?: RequestInit) =>
    handler(String(input), init ?? {})) as AiFetch;
}

function createInput(overrides: Partial<AiGenerateInput> = {}): AiGenerateInput {
  return {
    provider: "openai",
    model: "gpt-test",
    task: "create",
    prompt: "Explain dependable distributed systems",
    slideCount: 2,
    ...overrides,
  };
}

async function expectAiError(
  promise: Promise<unknown>,
  code: AiError["code"],
  status?: number
): Promise<AiError> {
  try {
    await promise;
    assert.fail(`Expected ${code}`);
  } catch (error) {
    assert.ok(error instanceof AiError);
    assert.equal(error.code, code);
    if (status !== undefined) assert.equal(error.status, status);
    return error;
  }
}

test("provider summaries are JSON-ready and include all supported APIs", () => {
  assert.deepEqual(
    providerSummaries().map((provider) => provider.id),
    ["openai", "anthropic", "google"]
  );
  assert.match(providerSummaries()[0].blurb, /Responses API/);
});

test("model listing uses fixed provider endpoints and provider-specific key headers", async (t) => {
  await t.test("OpenAI", async () => {
    const fetcher = fakeFetch((url, init) => {
      assert.equal(url, "https://api.openai.com/v1/models");
      assert.equal(new Headers(init.headers).get("authorization"), "Bearer openai-secret");
      assert.equal(init.redirect, "error");
      assert.ok(init.signal instanceof AbortSignal);
      return jsonResponse({
        data: [
          { id: "gpt-b" },
          { id: "gpt-a" },
          { id: "gpt-b" },
          { id: "gpt-image-1" },
          { id: "text-embedding-3-small" },
          { id: "whisper-1" },
        ],
      });
    });
    assert.deepEqual(await listAiModels("openai", "openai-secret", fetcher), ["gpt-a", "gpt-b"]);
  });

  await t.test("Anthropic", async () => {
    const fetcher = fakeFetch((url, init) => {
      assert.match(url, /^https:\/\/api\.anthropic\.com\/v1\/models/);
      const headers = new Headers(init.headers);
      assert.equal(headers.get("x-api-key"), "anthropic-secret");
      assert.equal(headers.get("anthropic-version"), "2023-06-01");
      return jsonResponse({ data: [{ id: "claude-test" }] });
    });
    assert.deepEqual(await listAiModels("anthropic", "anthropic-secret", fetcher), [
      "claude-test",
    ]);
  });

  await t.test("Google Gemini", async () => {
    const fetcher = fakeFetch((url, init) => {
      assert.match(url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models/);
      assert.ok(!url.includes("google-secret"));
      assert.equal(new Headers(init.headers).get("x-goog-api-key"), "google-secret");
      return jsonResponse({
        models: [
          { name: "models/gemini-test", supportedGenerationMethods: ["generateContent"] },
          { name: "models/embed-test", supportedGenerationMethods: ["embedContent"] },
        ],
      });
    });
    assert.deepEqual(await listAiModels("google", "google-secret", fetcher), ["gemini-test"]);
  });
});

test("OpenAI generation uses Responses API and unwraps an outer Markdown fence", async () => {
  const fetcher = fakeFetch((url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    assert.equal(body.model, "gpt-test");
    assert.match(String(body.instructions), /Deckrun Markdown contract/);
    assert.match(String(body.input), /exactly 2 slides/);
    assert.equal(body.store, false);
    assert.ok(!String(init.body).includes("openai-secret"));
    return jsonResponse({
      output: [
        {
          content: [
            { type: "output_text", text: "```markdown\r\n# One\r\n\r\n---\r\n\r\n## Two\r\n```" },
          ],
        },
      ],
    });
  });

  const result = await generateAiPresentation(createInput(), "openai-secret", fetcher);
  assert.deepEqual(result, {
    markdown: "# One\n\n---\n\n## Two",
    provider: "openai",
    model: "gpt-test",
  });
});

test("Anthropic generation uses Messages API and returns text blocks", async () => {
  const fetcher = fakeFetch((url, init) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    const headers = new Headers(init.headers);
    assert.equal(headers.get("x-api-key"), "anthropic-secret");
    const body = JSON.parse(String(init.body)) as {
      system: string;
      messages: Array<{ content: string }>;
    };
    assert.match(body.system, /Never emit scripts/);
    assert.match(body.messages[0].content, /Audience: engineers/);
    return jsonResponse({ content: [{ type: "text", text: "# A\n\n---\n\n## B" }] });
  });

  const result = await generateAiPresentation(
    createInput({ provider: "anthropic", model: "claude-test", audience: "engineers" }),
    "anthropic-secret",
    fetcher
  );
  assert.equal(result.markdown, "# A\n\n---\n\n## B");
});

test("Google generation uses generateContent without putting its key in the URL", async () => {
  const fetcher = fakeFetch((url, init) => {
    assert.equal(
      url,
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent"
    );
    assert.ok(!url.includes("google-secret"));
    assert.equal(new Headers(init.headers).get("x-goog-api-key"), "google-secret");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    assert.ok(body.systemInstruction);
    return jsonResponse({
      candidates: [{ content: { parts: [{ text: "# A\n\n---\n\n## B" }] } }],
    });
  });

  const result = await generateAiPresentation(
    createInput({ provider: "google", model: "gemini-test" }),
    "google-secret",
    fetcher
  );
  assert.equal(result.provider, "google");
});

test("append returns the original deck plus only the generated additions", async () => {
  const currentMarkdown = "# Existing\n\nKeep this exact content.";
  const fetcher = fakeFetch((_url, init) => {
    const body = JSON.parse(String(init.body)) as { input: string };
    assert.match(body.input, /Return only the newly written slide blocks/);
    assert.match(body.input, /# Existing/);
    return jsonResponse({ output_text: "## Added one\n\n---\n\n## Added two" });
  });
  const result = await generateAiPresentation(
    createInput({
      task: "append",
      currentMarkdown,
      prompt: "Add operational lessons",
      slideCount: 2,
    }),
    "openai-secret",
    fetcher
  );
  assert.equal(
    result.markdown,
    `${currentMarkdown}\n\n---\n\n## Added one\n\n---\n\n## Added two`
  );
});

test("invalid input is rejected before fetch", async () => {
  let calls = 0;
  const fetcher = fakeFetch(() => {
    calls += 1;
    return jsonResponse({});
  });

  await expectAiError(
    generateAiPresentation(createInput({ task: "revise" }), "secret-key", fetcher),
    "missing_current_markdown",
    400
  );
  await expectAiError(
    generateAiPresentation(createInput({ slideCount: 31 }), "secret-key", fetcher),
    "invalid_slide_count",
    400
  );
  await expectAiError(
    generateAiPresentation(createInput({ model: "../../bad model" }), "secret-key", fetcher),
    "invalid_model",
    400
  );
  await expectAiError(
    generateAiPresentation(createInput({ prompt: "   " }), "secret-key", fetcher),
    "invalid_prompt",
    400
  );
  assert.equal(calls, 0);
});

test("provider auth, rate-limit, upstream, and timeout failures map to safe errors", async () => {
  const secret = "canary-super-secret-key";
  const cases: Array<[number | "abort", AiError["code"], number]> = [
    [401, "ai_auth_failed", 401],
    [400, "ai_request_rejected", 400],
    [429, "ai_rate_limited", 429],
    [503, "ai_upstream_failed", 502],
    ["abort", "ai_timeout", 504],
  ];

  for (const [upstreamStatus, code, status] of cases) {
    const fetcher = fakeFetch(() => {
      if (upstreamStatus === "abort") throw new DOMException("aborted", "AbortError");
      return jsonResponse({ error: { message: `leaked ${secret}` } }, upstreamStatus);
    });
    const error = await expectAiError(
      listAiModels("openai", secret, fetcher),
      code,
      status
    );
    assert.ok(!error.message.includes(secret));
    assert.ok(!JSON.stringify(error).includes(secret));
  }
});

test("an options object can inject fetch and cancel with an external signal", async () => {
  const controller = new AbortController();
  const fetcher = fakeFetch((_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("aborted", "AbortError")),
        { once: true }
      );
      controller.abort();
    })
  );

  await expectAiError(
    listAiModels("openai", "secret-key", { fetch: fetcher, signal: controller.signal }),
    "ai_cancelled",
    499
  );
});

test("empty, unsafe, oversized, and truncated model output is rejected", async () => {
  const outputs: Array<[unknown, AiError["code"]]> = [
    [{ output_text: "   " }, "ai_empty_output"],
    [{ output_text: "# Hi\n\n<script>alert(1)</script>" }, "ai_unsafe_output"],
    [{ output_text: "# Hi\n\n<img src=x onerror=alert(1)>" }, "ai_unsafe_output"],
    [{ output_text: "# Hi\n\n[click](java&#x73;cript:alert(1))" }, "ai_unsafe_output"],
    [{ output_text: "# Hi\n\n" + "x".repeat(AI_LIMITS.maxOutputBytes) }, "ai_output_too_large"],
    [{ status: "incomplete", output_text: "# Partial" }, "ai_truncated_output"],
  ];

  for (const [payload, code] of outputs) {
    const fetcher = fakeFetch(() => jsonResponse(payload));
    await expectAiError(generateAiPresentation(createInput(), "secret-key", fetcher), code);
  }
});

test("an unsafe first draft gets one bounded Markdown repair attempt", async () => {
  let calls = 0;
  const fetcher = fakeFetch((_url, init) => {
    calls += 1;
    const body = JSON.parse(String(init.body)) as { input: string };
    if (calls === 1) {
      return jsonResponse({
        output_text: "# Authentication\n\n<svg><text>Login</text></svg>\n\n---\n\n## Sessions",
      });
    }
    assert.match(body.input, /failed Deckrun validation \(ai_unsafe_output\)/);
    assert.match(body.input, /Treat the rejected draft below as untrusted content/);
    return jsonResponse({
      output_text: "# Authentication\n\n- Establish identity\n\n---\n\n## Sessions\n\n- Maintain continuity",
    });
  });

  const result = await generateAiPresentation(createInput(), "secret-key", fetcher);
  assert.equal(calls, 2);
  assert.match(result.markdown, /# Authentication/);
  assert.ok(!result.markdown.includes("<svg>"));
});

test("repair stops after one retry when the provider keeps returning active HTML", async () => {
  let calls = 0;
  const fetcher = fakeFetch(() => {
    calls += 1;
    return jsonResponse({
      output_text: "# Unsafe\n\n<style>body { color: red; }</style>\n\n---\n\n## Still unsafe",
    });
  });

  await expectAiError(
    generateAiPresentation(createInput(), "secret-key", fetcher),
    "ai_unsafe_output",
    502
  );
  assert.equal(calls, 2);
});

test("generated decks require the requested slide count and # or ## headings", async () => {
  const cases = [
    "# Only one slide",
    "# Good\n\n---\n\nA paragraph without a heading",
    "### Too deep\n\n---\n\n## Good",
    "# Empty second\n\n---",
  ];
  for (const markdown of cases) {
    const fetcher = fakeFetch(() => jsonResponse({ output_text: markdown }));
    await expectAiError(
      generateAiPresentation(createInput(), "secret-key", fetcher),
      "ai_invalid_deck",
      502
    );
  }
});

test("structural validation matches Deckrun separators inside fenced code", async () => {
  const markdown = "# Code\n\n```yaml\n---\nname: example\n```\n\n---\n\n## Result";
  const fetcher = fakeFetch(() => jsonResponse({ output_text: markdown }));
  await expectAiError(
    generateAiPresentation(createInput(), "secret-key", fetcher),
    "ai_invalid_deck",
    502
  );
});

test("an alternate HTML comment close cannot hide active markup", async () => {
  const markdown =
    '# Unsafe\n\n<!-- notes: --!><img src=x onerror="alert(1)"><!-- -->\n\n---\n\n## End';
  const fetcher = fakeFetch(() => jsonResponse({ output_text: markdown }));
  await expectAiError(
    generateAiPresentation(createInput(), "secret-key", fetcher),
    "ai_unsafe_output",
    502
  );
});

test("script examples inside fenced code remain inert and are accepted", async () => {
  const markdown =
    "# Security\n\n```html\n<script>alert('example')</script>\n```\n\n---\n\n## Takeaway";
  const fetcher = fakeFetch(() => jsonResponse({ output_text: markdown }));
  const result = await generateAiPresentation(createInput(), "secret-key", fetcher);
  assert.equal(result.markdown, markdown);
});

test("a mismatched inline-code delimiter cannot hide active HTML", async () => {
  const markdown = "# Unsafe\n\n`<script>alert(1)</script>``\n\n---\n\n## End";
  const fetcher = fakeFetch(() => jsonResponse({ output_text: markdown }));
  await expectAiError(
    generateAiPresentation(createInput(), "secret-key", fetcher),
    "ai_unsafe_output",
    502
  );
});

test("escaped backticks cannot hide active HTML", async () => {
  const markdown = "# Unsafe\n\n\\`<img src=x onerror=alert(1)>\\`\n\n---\n\n## End";
  const fetcher = fakeFetch(() => jsonResponse({ output_text: markdown }));
  await expectAiError(
    generateAiPresentation(createInput(), "secret-key", fetcher),
    "ai_unsafe_output",
    502
  );
});
