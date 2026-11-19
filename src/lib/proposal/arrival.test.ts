import { describe, expect, it } from "vitest";
import { arrivalMove } from "./arrival";

describe("arrivalMove: where a fresh ?v= open goes", () => {
  it("stays put for a link in this language without a proposal", () => {
    expect(arrivalMove({ path: "/", lang: "en", wanted: "en", pinned: false, proposal: false })).toBeNull();
  });

  it("moves the home page to /proposal when the link has one", () => {
    expect(arrivalMove({ path: "/", lang: "en", wanted: "en", pinned: false, proposal: true })).toBe("/proposal");
  });

  it("moves to the Bahasa proposal for a Bahasa link opened in English", () => {
    expect(arrivalMove({ path: "/", lang: "en", wanted: "id", pinned: false, proposal: true })).toBe("/id/proposal");
  });

  it("moves a Bahasa link's home page to /id/proposal", () => {
    expect(arrivalMove({ path: "/id", lang: "id", wanted: "id", pinned: false, proposal: true })).toBe("/id/proposal");
  });

  it("leaves other pages alone: a CV link stays on the CV", () => {
    expect(arrivalMove({ path: "/cv", lang: "en", wanted: "en", pinned: false, proposal: true })).toBeNull();
    expect(arrivalMove({ path: "/rates", lang: "en", wanted: "en", pinned: false, proposal: true })).toBeNull();
  });

  it("does not move again once on the proposal", () => {
    expect(arrivalMove({ path: "/proposal", lang: "en", wanted: "en", pinned: false, proposal: true })).toBeNull();
  });

  it("keeps the old language move for links without a proposal", () => {
    expect(arrivalMove({ path: "/cv", lang: "en", wanted: "id", pinned: false, proposal: false })).toBe("/id/cv");
  });

  it("a pinned language still opens the proposal, in the pinned language", () => {
    expect(arrivalMove({ path: "/", lang: "en", wanted: "id", pinned: true, proposal: true })).toBe("/proposal");
    expect(arrivalMove({ path: "/", lang: "en", wanted: "id", pinned: true, proposal: false })).toBeNull();
  });
});
