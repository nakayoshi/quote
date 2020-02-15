import path from "path";
import dotenv from "dotenv";
import Discord from "discord.js";
import { first, filter } from "rxjs/operators";
import { fromEvent } from "rxjs";

dotenv.config({ path: path.join(__dirname, "../.env") });

const regexps = {
  MARKDOWN_TEXT: /^\>\s(?<text>.+)/m,
  MARKDOWN_ID: /^\>\s(?<id>[0-9]+)/m,
  MARKDOWN_TEXT_MULTILINE: /\>\s(.+)/gm,
  URL: /https:\/\/(ptb\.)?discordapp.com\/channels\/(?<serverId>.+)\/(?<channelId>.+)\/(?<messageId>.+)/m
};

const fetchMessageByText = async (text: string, channel: Discord.Channel) => {
  if (!(channel instanceof Discord.TextChannel)) return;

  return channel.messages
    .fetch({ limit: 100 })
    .then(collection => collection.array())
    .then(messages => messages.find(message => message.content.includes(text)));
};

const fetchMessageById = async (id: string, channel: Discord.Channel) => {
  if (!(channel instanceof Discord.TextChannel)) return;

  return channel.messages
    .fetch({ limit: 100 })
    .then(collection => collection.array())
    .then(messages => messages.find(message => message.id === id));
};

const fetchChannelById = (channels: Discord.ChannelStore, id: string) => {
  return channels.find(channel => {
    return channel.id === id;
  });
};

const getNickname = (message: Discord.Message) => {
  const member = message.guild.member(message.author);
  if (member) return member.displayName;
  return message.author.tag;
};

const toEmbed = (message: Discord.Message) => {
  const avatar = message.author.avatarURL({ format: "png", size: 64 });
  const title =
    message.channel instanceof Discord.TextChannel
      ? message.channel.name
      : message.channel.id;

  const embed = new Discord.MessageEmbed()
    .setAuthor(getNickname(message), avatar, message.url)
    .setDescription(message.content)
    .setTitle(title)
    .setFooter("Quote")
    .setTimestamp(message.createdTimestamp);

  const thumbnail = message.attachments.first()?.url;
  if (thumbnail) embed.setThumbnail(thumbnail);

  return embed;
};

const fetchWebhook = async (channel: Discord.TextChannel, selfId: string) => {
  const webhook = await channel
    .fetchWebhooks()
    .then(webhooks =>
      webhooks.find(
        ({ owner }) => owner instanceof Discord.User && owner.id === selfId
      )
    );

  if (webhook) return webhook;
  return channel.createWebhook(process.env.DISCORD_WEBHOOK_NAME ?? "quote");
};

const mimic = async (
  plain: string,
  original: Discord.Message,
  selfId: string,
  options: Discord.WebhookMessageOptions = {}
) => {
  if (!original.deletable) return;
  await original.delete();

  if (!(original.channel instanceof Discord.TextChannel)) return;
  const webhook = await fetchWebhook(original.channel, selfId);

  await webhook.send(plain, {
    username: getNickname(original),
    avatarURL: original.author.avatarURL(),
    ...options
  });
};

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
    .pipe(
      filter(message => regexps.MARKDOWN_TEXT.test(message.content)),
      filter(message => !regexps.MARKDOWN_ID.test(message.content))
    )
    .subscribe(async message => {
      if (!client.user?.id) return;

      const match = message.content.match(regexps.MARKDOWN_TEXT);
      if (!match?.groups?.text) return;

      const { text } = match.groups;
      const quote = await fetchMessageByText(text, message.channel);
      if (!quote) return;

      await mimic(
        message.content.replace(regexps.MARKDOWN_TEXT, ""),
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
    .pipe(filter(message => regexps.MARKDOWN_ID.test(message.content)))
    .subscribe(async message => {
      if (!client.user?.id) return;

      const match = message.content.match(regexps.MARKDOWN_ID);
      if (!match?.groups?.id) return;

      const { id } = match.groups;
      const quote = await fetchMessageById(id, message.channel);
      if (!quote) return;

      await mimic(
        message.content.replace(regexps.MARKDOWN_ID, ""),
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
  message$
    .pipe(filter(message => regexps.URL.test(message.content)))
    .subscribe(async message => {
      if (!client.user?.id) return;

      const match = message.content.match(regexps.URL);
      if (!match?.groups?.channelId || !match?.groups?.messageId) return;

      const { channelId, messageId } = match.groups;
      const channel = fetchChannelById(client.channels, channelId);
      const quote = await fetchMessageById(messageId, channel);
      if (!quote) return;

      await mimic(
        message.content.replace(regexps.URL, ""),
        message,
        client.user.id,
        { embeds: [toEmbed(quote)] }
      );
    });

  /**
   * Markdown style quotation but multiple lines
   * @example
   * > foo
   * > bar
   */
  message$
    .pipe(
      filter(message => regexps.MARKDOWN_TEXT_MULTILINE.test(message.content))
    )
    .subscribe(async message => {
      if (!client.user?.id) return;

      const match = message.content.match(regexps.MARKDOWN_TEXT_MULTILINE);
      if (!match) return;

      const text = match.join("\n");
      const quote = await fetchMessageByText(text, message.channel);
      if (!quote) return;

      await mimic(
        message.content.replace(regexps.URL, ""),
        message,
        client.user.id,
        { embeds: [toEmbed(quote)] }
      );
    });
};

main();
