import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
  },
}));

vi.mock("./laser-loader", () => ({
  startLaserProgress: vi.fn(),
  stopLaserProgress: vi.fn(),
}));

import { deltaToText, streamSSE } from "./stream-sse";

function sseData(content: unknown): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(enc.encode(chunks[i]));
        i += 1;
        return;
      }
      controller.close();
    },
  });
}

async function collect(body: unknown, chunks: string[]): Promise<string> {
  const deltas: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(streamFromChunks(chunks), { status: 200 })),
  );
  await streamSSE({
    url: "/api/audit-domains",
    body,
    onDelta: (c) => deltas.push(c),
    onDone: () => {},
    onError: (msg) => {
      throw new Error(`onError: ${msg}`);
    },
  });
  return deltas.join("");
}

describe("deltaToText", () => {
  it("returns a string unchanged", () => {
    expect(deltaToText("Ahoj svet")).toBe("Ahoj svet");
    expect(deltaToText("")).toBe("");
  });

  it("drops thinking parts", () => {
    expect(
      deltaToText([
        { type: "thinking", thinking: "najprv zvážim nadpis" },
        { type: "thinking", text: 123 },
      ]),
    ).toBe("");
  });

  it("joins only type===text parts with a string text", () => {
    expect(
      deltaToText([
        { type: "text", text: "# Nadpis\n\n" },
        { type: "text", text: "Telo článku." },
      ]),
    ).toBe("# Nadpis\n\nTelo článku.");
  });

  it("from a mixed chunk keeps only string text parts", () => {
    expect(
      deltaToText([
        { type: "thinking", thinking: "..." },
        { type: "text", text: "Viditeľné" },
        { type: "text", text: 42 },
        { type: "output_text", text: "nie" },
        "ignorovať",
        null,
        { type: "text" },
      ]),
    ).toBe("Viditeľné");
  });

  it.each([null, undefined, {}, 0, false, { type: "text", text: "x" }])(
    "returns empty for non-string non-array %j",
    (value) => {
      expect(deltaToText(value)).toBe("");
    },
  );

  it("never yields [object Object] for any of the shapes above", () => {
    const samples: unknown[] = [
      "ok",
      [{ type: "thinking", thinking: { deep: true } }],
      [
        { type: "text", text: "a" },
        { type: "thinking", thinking: {} },
      ],
      null,
      undefined,
      { type: "text", text: "x" },
      [{ text: "no-type" }],
      [[{ type: "text", text: "nested" }]],
    ];
    for (const sample of samples) {
      const out = deltaToText(sample);
      expect(out).not.toContain("[object Object]");
      expect(typeof out).toBe("string");
    }
  });
});

describe("streamSSE", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("joins text parts and drops thinking, never emitting [object Object]", async () => {
    const out = await collect({ domains: ["example.com"] }, [
      sseData([{ type: "thinking", thinking: "úvaha" }]) +
        sseData([{ type: "text", text: "# Nadpis\n\n" }]) +
        sseData([{ type: "text", text: "Telo článku." }]) +
        "data: [DONE]\n\n",
    ]);
    expect(out).toBe("# Nadpis\n\nTelo článku.");
    expect(out).not.toContain("[object Object]");
  });

  it("reassembles an SSE line split across reads", async () => {
    const line = sseData([{ type: "text", text: "# Nadpis\n\nTelo článku." }]);
    expect(line.startsWith("data: ")).toBe(true);
    const splitAt = 20;
    const out = await collect({}, [
      line.slice(0, splitAt),
      line.slice(splitAt),
      "data: [DONE]\n\n",
    ]);
    expect(out).toBe("# Nadpis\n\nTelo článku.");
  });

  it("still streams a plain string delta (regression)", async () => {
    const out = await collect({}, [
      sseData("# Nadpis\n\n") + sseData("Telo článku.") + "data: [DONE]\n\n",
    ]);
    expect(out).toBe("# Nadpis\n\nTelo článku.");
  });
});
