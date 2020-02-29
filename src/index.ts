import path from "path";
import dotenv from "dotenv";
import Discord from "discord.js";
import outdent from "outdent";
import { fromEvent } from "rxjs";
import { first, filter } from "rxjs/operators";
import { mimic, toEmbed, isBot, match, not, fetchMessageByText } from "./utils";
import { URL, MARKDOWN } from "./regexps";

dotenv.config({ path: path.join(__dirname, "../.env") });

const client = new Discord.Client();
const ready$ = fromEvent<void>(client, "ready");
const message$ = fromEvent<Discord.Message>(client, "message");

ready$.pipe(first()).subscribe(() => {
  if (!client.user) return;
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setActivity({
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

    const match = message.content.match(MARKDOWN);
    if (!match?.groups?.text) return;

    const { text } = match.groups;
    const quote = await fetchMessageByText(text, message.channel, [message.id]);
    if (!quote) return;

    await mimic(
      message.content.replace(MARKDOWN, ""),
      message,
      client.user.id,
      {
        embeds: [toEmbed(quote)]
      }
    );
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

    const match = message.content.match(URL);

    if (
      !match?.groups?.channelId ||
      !match?.groups?.messageId ||
      !match?.groups?.guildId
    ) {
      return;
    }

    const { guildId, channelId, messageId } = match.groups;
    if (guildId !== message.guild.id) return;

    const channel = await client.channels.fetch(channelId);
    if (!(channel instanceof Discord.TextChannel)) return;

    const quote = await channel.messages.fetch(messageId);
    if (!quote) return;

    await mimic(message.content.replace(URL, ""), message, client.user.id, {
      embeds: [toEmbed(quote)]
    });
  });

(async () => {
  await client.login(process.env.DISCORD_TOKEN);
})();
