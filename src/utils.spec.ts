import Discord from "discord.js";
import { not, isBot, match } from "./utils";

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
