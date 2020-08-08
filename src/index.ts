import path from 'path';
import dotenv from 'dotenv';
import Discord from 'discord.js';
import outdent from 'outdent';
import { fromEvent } from 'rxjs';
import { first, filter } from 'rxjs/operators';

import {
  mimic,
  toEmbed,
  isBot,
  match,
  not,
  fetchMessageByText,
  removeEmptyLines,
} from './utils';
import { URL, MARKDOWN } from './regexps';
import { UserRepository } from './user-repository';
import { UserRepositoryFsImpl } from './user-repository-fs-impl';

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Discord.Client();
const ready$ = fromEvent<void>(client, 'ready');
const message$ = fromEvent<Discord.Message>(client, 'message');
let userRepository: UserRepository;

const afterQuote = async (_author: Discord.User) => {
  const author = await userRepository.find(_author.id);

  try {
    if (author == null) {
      return userRepository.save({
        id: _author.id,
        tag: _author.tag,
        quoteCount: 1,
      });
    }

    return userRepository.update({
      id: author.id,
      tag: author.tag,
      quoteCount: author.quoteCount + 1,
    });
  } finally {
    const newAuthor = await userRepository.find(_author.id);
    const FEEDBACK_THRESHOLD = 5;
    if (newAuthor == null) return;
    if (newAuthor.quoteCount === FEEDBACK_THRESHOLD) {
      return askForFeedback(_author);
    }
  }
}

const askForFeedback = async (user: Discord.User) => {
  await user.send({
    files: ['https://i.imgur.com/ThgdSDE.png'],
  });
  await user.send({
    content: outdent`
    Thank you for using Quote! If you have minutes I'd appreciate it if you **give us a feedback**.

    :arrow_up: Don't forget to up-vote us on Top.gg to help other people to discover this bot!
    <https://bit.ly/2DL4B6U>

    :star: Quote is developed in open-source on GitHub so please star us. Also, let us know if you have any trouble or idea!
    <https://bit.ly/2PCtNiA>

    > *This message has been sent to users who quoted 5 times since 1st Aug 2020*
` });
}

ready$.pipe(first()).subscribe(async () => {
  if (client.user == null) {
    return;
  }

  console.log(`Logged in as ${client.user.tag}`);

  await client.user.setActivity({
    type: 'LISTENING',
    name: '/help',
  });
});

/**
 * Help
 * @example
 * /help
 */
message$
  .pipe(
    filter((message) => message.content.startsWith('/help')),
    filter(not(isBot)),
  )
  .subscribe(async (message) => {
    await message.channel.send(outdent`
      **Quote** allows you to quote messages in a better way.

      > \`> <text>\`
      Quote a message that contains \`<text>\` from the same channel and replace your message with an embed.

      > \`<URL>\`
      Quote a message by the \`<URL>\` and replace your message with an embed.

      > \`/help\`
      Shows usage of Quote.

      See also GitHub for more information:
      https://github.com/nakayoshi/quote
    `);
  });

/**
 * Markdown style quotation
 * @example
 * > message
 */
message$
  .pipe(filter(not(isBot)), filter(match(MARKDOWN)))
  .subscribe(async (message) => {
    if (client.user == null) {
      return;
    }

    const fragments = message.content.match(new RegExp(MARKDOWN, 'gm')) ?? [];
    const text = fragments
      .map((fragment) => fragment.match(MARKDOWN)?.groups?.text)
      .filter((match) => match != null)
      .join('\n');

    const quote = await fetchMessageByText(text, message.channel, [message.id]);

    if (quote == null) {
      return;
    }

    const content = removeEmptyLines(
      message.content.replace(new RegExp(MARKDOWN, 'gm'), ''),
    );

    await mimic(content, message, client.user.id, {
      embeds: [toEmbed(quote)],
    });

    await afterQuote(message.author);
  });

/**
 * URL quotation
 * @example
 * https://discordapp.com/channels/123/456/789
 */
message$
  .pipe(filter(not(isBot)), filter(match(URL)))
  .subscribe(async (message) => {
    if (client.user == null || message.guild == null) {
      return;
    }

    const urls = message.content.match(new RegExp(URL, 'gm')) ?? [];
    const matches = urls.map((url) => url.match(URL));
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

      if (guildId !== message.guild.id) {
        continue;
      }

      const channel = await client.channels.fetch(channelId);

      if (!(channel instanceof Discord.TextChannel)) {
        continue;
      }

      const quote = await channel.messages.fetch(messageId);
      embeds.push(toEmbed(quote));
    }

    if (embeds.length === 0) {
      return;
    }

    const content = removeEmptyLines(
      message.content.replace(new RegExp(URL, 'gm'), ''),
    );

    await mimic(content, message, client.user.id, {
      embeds,
    });

    await afterQuote(message.author);
  });

(async () => {
  userRepository = await UserRepositoryFsImpl.init();
  await client.login(process.env.DISCORD_TOKEN);
})();
