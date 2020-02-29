import path from "path";
import dotenv from "dotenv";
import Discord from "discord.js";
import outdent from "outdent";
import { fromEvent } from "rxjs";
import { first, filter } from "rxjs/operators";
import {
  mimic,
  toEmbed,
  isBot,
  match,
  not,
  fetchMessageByText,
  removeEmptyLines
} from "./utils";
import { URL, MARKDOWN } from "./regexps";

dotenv.config({ path: path.join(__dirname, "../.env") });

const client = new Discord.Client();
const ready$ = fromEvent<void>(client, "ready");
const message$ = fromEvent<Discord.Message>(client, "message");

ready$.pipe(first()).subscribe(async () => {
  if (!client.user) return;
  console.log(`Logged in as ${client.user.tag}`);

  await client.user.setActivity({
    type: "LISTENING",
    name: "/help"
  });
});

/**
 * Help
 * @example
 * /help
 */
message$
  .pipe(
    filter(message => message.content.startsWith("/help")),
    filter(not(isBot))
  )
  .subscribe(async message => {
    await message.channel.send(outdent`
      **Quote** allows you to quote messages in a better way.

      > \`> <text>\`
      Quote a message that contains \`<text>\` from the same channel and replace your message with an embed.

      > \`<URL>\`
      Quote a message by the \`<URL>\` and replace your message with an embed.

      > \`/help\`
      Shows usage of Quote.

      See also GitHub for more information:
      https://github.com/neet/quote
    `);
  });

/**
 * Markdown style quotation
 * @example
 * > message
 */
message$
  .pipe(filter(not(isBot)), filter(match(MARKDOWN)))
  .subscribe(async message => {
    if (!client.user) return;

    const fragments = message.content.match(new RegExp(MARKDOWN, "gm")) ?? [];
    const text = fragments
      .map(fragment => fragment.match(MARKDOWN)?.groups?.text)
      .filter(match => !!match)
      .join("\n");

    const quote = await fetchMessageByText(text, message.channel, [message.id]);
    if (!quote) return;

    const content = removeEmptyLines(
      message.content.replace(new RegExp(MARKDOWN, "gm"), "")
    );

    await mimic(content, message, client.user.id, {
      embeds: [toEmbed(quote)]
    });
  });

/**
 * URL quotation
 * @example
 * https://discordapp.com/channels/123/456/789
 */
message$
  .pipe(filter(not(isBot)), filter(match(URL)))
  .subscribe(async message => {
    if (!client.user) return;

    const urls = message.content.match(new RegExp(URL, "gm")) ?? [];
    const matches = urls.map(url => url.match(URL));
    const embeds: Discord.MessageEmbed[] = [];

    for (const match of matches) {
      if (
        !match?.groups?.channelId ||
        !match?.groups?.messageId ||
        !match?.groups?.guildId
      ) {
        continue;
      }

      const { guildId, channelId, messageId } = match.groups;
      if (guildId !== message.guild.id) continue;

      const channel = await client.channels.fetch(channelId);
      if (!(channel instanceof Discord.TextChannel)) continue;

      const quote = await channel.messages.fetch(messageId);
      embeds.push(toEmbed(quote));
    }

    if (!embeds.length) return;

    const content = removeEmptyLines(
      message.content.replace(new RegExp(URL, "gm"), "")
    );

    await mimic(content, message, client.user.id, {
      embeds
    });
  });

(async () => {
  await client.login(process.env.DISCORD_TOKEN);
})();
