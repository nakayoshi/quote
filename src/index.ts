import path from "path";
import dotenv from "dotenv";
import Discord from "discord.js";
import { fromEvent } from "rxjs";
import { first } from "rxjs/operators";
import { filterBot, filterMatch, filterNotMatch } from "./operators";
import {
  mimic,
  toEmbed,
  fetchChannelById,
  fetchMessageByText,
  fetchMessageById
} from "./utils";
import { URL, MARKDOWN_ID, MARKDOWN_TEXT } from "./regexps";

dotenv.config({ path: path.join(__dirname, "../.env") });

const main = async () => {
  const client = new Discord.Client();
  const ready$ = fromEvent<void>(client, "ready");
  const message$ = fromEvent<Discord.Message>(client, "message");

  client.login(process.env.DISCORD_TOKEN);

  ready$.pipe(first()).subscribe(() => {
    if (!client.user) return;
    console.log(`Logged in as ${client.user.tag}`);
  });

  /**
   * Markdown style quotation
   * @example
   * > message
   */
  message$
    .pipe(filterBot, filterMatch(MARKDOWN_TEXT), filterNotMatch(MARKDOWN_ID))
    .subscribe(async message => {
      if (!client.user?.id) return;

      const match = message.content.match(MARKDOWN_TEXT);
      if (!match?.length) return;

      const text = match.join("\n");
      const quote = await fetchMessageByText(text, message.channel);
      if (!quote) return;

      await mimic(
        message.content.replace(MARKDOWN_TEXT, ""),
        message,
        client.user.id,
        { embeds: [toEmbed(quote)] }
      );
    });

  /**
   * Markdown style quotation but id
   * @example
   * > 123456789
   */
  message$
    .pipe(filterBot, filterMatch(MARKDOWN_ID))
    .subscribe(async message => {
      if (!client.user?.id) return;

      const match = message.content.match(MARKDOWN_ID);
      if (!match?.groups?.id) return;

      const { id } = match.groups;
      const quote = await fetchMessageById(id, message.channel);
      if (!quote) return;

      await mimic(
        message.content.replace(MARKDOWN_ID, ""),
        message,
        client.user.id,
        { embeds: [toEmbed(quote)] }
      );
    });

  /**
   * URL quotation
   * @example
   * https://discordapp.com/channels/123/456/789
   */
  message$.pipe(filterBot, filterMatch(URL)).subscribe(async message => {
    if (!client.user?.id) return;

    const match = message.content.match(URL);
    if (!match?.groups?.channelId || !match?.groups?.messageId) return;

    const { channelId, messageId } = match.groups;
    const channel = fetchChannelById(client.channels, channelId);
    const quote = await fetchMessageById(messageId, channel);
    if (!quote) return;

    await mimic(message.content.replace(URL, ""), message, client.user.id, {
      embeds: [toEmbed(quote)]
    });
  });
};

main();
