export function serializable(payload: Record<string, unknown>) {
  return {
    serialize() {
      return payload
    },
  }
}

export function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
  }
}
