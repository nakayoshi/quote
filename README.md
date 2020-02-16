# <img alt="quote" src="https://i.imgur.com/iqDW7gp.png" width="280px" />

![eyecatch](https://i.imgur.com/dlglta1.png)

> Quote allows you to quote messages in a better way

## Usage

### `> <text>`

Quote a message that contains `text` from the same channel and replace your message with an embed.

### `<url>`

Quote a message by the URL and replace your message with an embed.

### `/help`

Shows this help

## How it works

Quote uses Discord's Webhook API to send messages with a customized username and an avatar. We delete the original message and use this technique to pretend the message as if it was sent by another user.

## FAQ

### Quote didn't find the message despite I used the command properly

Due to Discord's API limitation, the number of messages you can go back is restricted up to 100. Alternatively, we provide another way that uses URL to quote so you can use it to avoid the issue.

### Why my message has a badge _BOT_?

Since Quote uses Discord's Webhook API to replace your message, the embed was actually sent by the bot though it is pretended as if you sent it.

### This is an awesome idea! Why doesn't the Discord team implement it officially?

I don't know ¯\\\_(ツ)\_/¯ Tell them to hire me.
