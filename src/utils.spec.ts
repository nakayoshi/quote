import Discord from "discord.js";
import outdent from "outdent";
import { not, isBot, match, removeEmptyLines } from "./utils";

it("negates value", () => {
  expect(not(() => true)()).toBe(false);
});

it("returns true when bot", () => {
  expect(
    isBot({
      author: {
        bot: true
      }
    } as Discord.Message)
  ).toBe(true);
});

it("returns true when content matches", () => {
  expect(
    match(/hello\s/)({
      content: "hello world"
    } as Discord.Message)
  ).toBe(true);
});

it("removes empty lines", () => {
  expect(
    removeEmptyLines(outdent`
  hello


  bye
  `)
  ).toBe(outdent`
  hello
  bye
  `);
});
