const MENTION_REGEX = /(^|[^\w])@([a-zA-Z0-9._-]{2,60})/g

export interface TaskCommentMentionIdentity {
  id: string
  username: string
}

export interface ResolvedTaskCommentMention {
  userId: string
  username: string
  token: string
}

export function extractTaskCommentMentionTokens(body: string): string[] {
  const tokens = new Set<string>()

  for (const match of body.matchAll(MENTION_REGEX)) {
    const username = match[2]?.trim().toLowerCase()
    if (username) {
      tokens.add(username)
    }
  }

  return Array.from(tokens)
}

export function mapResolvedTaskCommentMentions(
  tokens: string[],
  identities: TaskCommentMentionIdentity[]
): ResolvedTaskCommentMention[] {
  const byUsername = new Map(
    identities.map((identity) => [identity.username.toLowerCase(), identity])
  )

  return tokens.flatMap((token) => {
    const identity = byUsername.get(token)
    if (!identity || !identity.username) {
      return []
    }

    return [
      {
        userId: identity.id,
        username: identity.username,
        token,
      },
    ]
  })
}
