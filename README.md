# message-times

A Claude Code mod that puts a colored date and time above each of your prompts and above the first line of each of Claude's replies in the transcript:

```
◷ Tue, Nov 3 · 2:00:54 PM
❯ one more time
```

The date is green and the time blue (Catppuccin Mocha colors). The year is added only for messages from a previous year.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install message-times --marketplace mani1982/claude-message-times
```

Answer `y` to add the marketplace, then press Enter to pick the user scope. The mod starts working right away, and every new session loads it.

From a shell:

```
claude plugin install message-times --marketplace mani1982/claude-message-times
```

In the desktop app: click + next to the prompt box, then Plugins, then Add marketplace with `mani1982/claude-message-times`, then Add plugin.

## How it works

- When a prompt or reply is saved, the mod records the current time under the message's id, in its own small store file on your machine. It never stores your message text.
- When the transcript draws that message, the mod draws the stamp above it.
- Messages from before you installed the mod have no stamp.
- The mod uses no network and runs no commands. It keeps the newest 5,000 times.

## Development

```
claude plugin validate .
claude plugin test .
```
