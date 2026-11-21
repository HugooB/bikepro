import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { rich } from "./rich";

const render = (node: ReturnType<typeof rich>) =>
  renderToStaticMarkup(createElement(Fragment, null, node));
const b = (text: string) => createElement("b", null, text);

describe("rich", () => {
  it("renders the translation's tags and fills in values", () => {
    expect(render(rich("The {part} moves to <b>History</b>.", { b }, { part: "chain" }))).toBe(
      "The chain moves to <b>History</b>.",
    );
    expect(render(rich("Password: <b>{password}</b>", { b }, { password: "k7mp" }))).toBe(
      "Password: <b>k7mp</b>",
    );
  });

  it("doesn't treat tags in a value as formatting", () => {
    expect(render(rich("The {part} moves to <b>History</b>.", { b }, { part: "<b>x</b>" }))).toBe(
      "The &lt;b&gt;x&lt;/b&gt; moves to <b>History</b>.",
    );
  });
});
