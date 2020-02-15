import Discord from "discord.js";
import { filter } from "rxjs/operators";

export const filterBot = filter<Discord.Message>(
  message => !message.author.bot
);
export const filterMatch = (regexp: RegExp) =>
  filter<Discord.Message>(message => regexp.test(message.content));
