import { describe, expect, it } from "vitest";
import { describePing, parsePing } from "./ping";

const summary = { videos: 3, played: 2, watched: 370, total: 570, last: { video: 3, at: 72, ended: false } };

describe("parsePing", () => {
  it("reads a start", () => {
    expect(parsePing({ v: "k7qx2pmd", type: "start", viewing: "0b6f5c5e-1111-4222-8333-444455556666" })).toEqual({
      v: "k7qx2pmd",
      type: "start",
      viewing: "0b6f5c5e-1111-4222-8333-444455556666",
    });
  });

  it("reads an end with its summary", () => {
    expect(parsePing({ v: "k7qx2pmd", type: "end", viewing: "abc-123", summary })).toMatchObject({ type: "end", summary });
  });

  it.each([
    null,
    "nope",
    { v: "k7qx2pmd", type: "start" },
    { v: "k7qx2pmd", type: "other", viewing: "x" },
    { v: "k7qx2pmd", type: "end", viewing: "x" },
    { v: "k7qx2pmd", type: "end", viewing: "x", summary: { ...summary, played: 4 } },
    { v: "k7qx2pmd", type: "end", viewing: "x", summary: { ...summary, watched: -1 } },
    { v: "k7qx2pmd", type: "end", viewing: "x", summary: { ...summary, last: { video: 9, at: 1, ended: false } } },
    { v: "x".repeat(40), type: "start", viewing: "x" },
  ])("refuses %j", (body) => expect(parsePing(body)).toBeNull());
});

describe("describePing", () => {
  it("names the start", () => {
    expect(describePing("Acme", { v: "k7qx2pmd", type: "start", viewing: "x" })).toBe("Acme started your proposal");
  });
  it("sums up the end", () => {
    expect(describePing("Acme", { v: "k7qx2pmd", type: "end", viewing: "x", summary })).toBe(
      "Acme: watched 2 of 3 videos, 6:10 of 9:30, left during video 3 at 1:12",
    );
  });
});
