export const MESSAGE_REACTION_OPTIONS = [
  { emoji: "👍", label: "إعجاب" },
  { emoji: "❤️", label: "قلب" },
  { emoji: "😂", label: "ضحك" },
  { emoji: "😮", label: "مندهش" },
  { emoji: "😢", label: "حزين" },
  { emoji: "🙏", label: "شكر" },
  { emoji: "✅", label: "تم" },
  { emoji: "🔥", label: "رائع" },
] as const;

export type MessageReactionEmoji =
  (typeof MESSAGE_REACTION_OPTIONS)[number]["emoji"];

export type MessageReactionSummary = {
  emoji: MessageReactionEmoji;
  count: number;
  mine: boolean;
  users: string[];
};

export function isMessageReactionEmoji(
  value: string
): value is MessageReactionEmoji {
  return MESSAGE_REACTION_OPTIONS.some((option) => option.emoji === value);
}

export function summarizeMessageReactions(
  reactions: Array<{ emoji: string; userId: string; user: { name: string } }>,
  viewerId: string
): MessageReactionSummary[] {
  const groups = new Map<string, MessageReactionSummary>();

  for (const reaction of reactions) {
    if (!isMessageReactionEmoji(reaction.emoji)) continue;
    const current = groups.get(reaction.emoji) ?? {
      emoji: reaction.emoji,
      count: 0,
      mine: false,
      users: [],
    };
    current.count += 1;
    current.mine ||= reaction.userId === viewerId;
    current.users.push(reaction.user.name);
    groups.set(reaction.emoji, current);
  }

  return MESSAGE_REACTION_OPTIONS.flatMap((option) => {
    const summary = groups.get(option.emoji);
    return summary ? [summary] : [];
  });
}
