import Discord from 'discord.js';

export const fetchMessageByText = async (text: string, channel: Discord.Channel) => {
  if (!(channel instanceof Discord.TextChannel)) return;

  return channel.messages
    .fetch({ limit: 100 })
    .then(collection => collection.array())
    .then(messages => messages.find(message => message.content.includes(text)));
};

export const fetchMessageById = async (id: string, channel: Discord.Channel) => {
  if (!(channel instanceof Discord.TextChannel)) return;

  return channel.messages
    .fetch({ limit: 100 })
    .then(collection => collection.array())
    .then(messages => messages.find(message => message.id === id));
};

export const fetchChannelById = (channels: Discord.ChannelStore, id: string) => {
  return channels.find(channel => {
    return channel.id === id;
  });
};

export const getNickname = (message: Discord.Message) => {
  const member = message.guild.member(message.author);
  if (member) return member.displayName;
  return message.author.tag;
};

export const toEmbed = (message: Discord.Message) => {
  const avatar = message.author.avatarURL({ format: "png", size: 64 });
  const title =
    message.channel instanceof Discord.TextChannel
      ? message.channel.name
      : message.channel.id;

  const embed = new Discord.MessageEmbed()
    .setTitle(`#${title}`)
    .setDescription(message.content)
    .setURL(message.url)
    .setAuthor(getNickname(message), avatar, message.url)
    .setTimestamp(message.createdTimestamp)
    .setFooter("Quote");

  const thumbnail = message.attachments.first()?.url;
  if (thumbnail) embed.setThumbnail(thumbnail);

  return embed;
};

export const fetchWebhook = async (channel: Discord.TextChannel, selfId: string) => {
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

export const mimic = async (
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

