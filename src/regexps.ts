export const MARKDOWN_TEXT = /\>\s(.+)/gm;
export const MARKDOWN_ID = /^\>\s(?<id>[0-9]+)/m;
export const URL = /https:\/\/(ptb\.)?discordapp.com\/channels\/(?<serverId>.+)\/(?<channelId>.+)\/(?<messageId>.+)/m;
