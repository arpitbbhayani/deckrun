import { randomBytes } from "crypto";
import type { AiProvider } from "./ai.js";

export interface AiSession {
  provider: AiProvider;
  apiKey: string;
}

interface StoredAiSession extends AiSession {
  expiresAt: number;
  createdAt: number;
  expiryTimer?: ReturnType<typeof setTimeout>;
}

const DEFAULT_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_SESSIONS = 16;

/**
 * Short-lived, process-only storage for BYOK credentials.
 *
 * Tokens are deliberately not serializable and the store never exposes an
 * iterator, which makes it harder for an unrelated route to accidentally log
 * every credential. Stopping Deckrun clears the map with the process.
 */
export class AiSessionStore {
  readonly #sessions = new Map<string, StoredAiSession>();

  constructor(
    private readonly ttlMs = DEFAULT_TTL_MS,
    private readonly maxSessions = DEFAULT_MAX_SESSIONS,
    private readonly now: () => number = Date.now
  ) {}

  create(provider: AiProvider, apiKey: string): string {
    this.prune();
    while (this.#sessions.size >= this.maxSessions) {
      let oldestId: string | undefined;
      let oldestAt = Infinity;
      for (const [id, session] of this.#sessions) {
        if (session.createdAt < oldestAt) {
          oldestId = id;
          oldestAt = session.createdAt;
        }
      }
      if (!oldestId) break;
      this.delete(oldestId);
    }

    const id = randomBytes(32).toString("base64url");
    const createdAt = this.now();
    const session: StoredAiSession = {
      provider,
      apiKey,
      createdAt,
      expiresAt: createdAt + this.ttlMs,
    };
    session.expiryTimer = this.expiryTimer(id, session);
    this.#sessions.set(id, session);
    return id;
  }

  get(id: string): AiSession | null {
    if (!id || id.length > 128) return null;
    const session = this.#sessions.get(id);
    if (!session) return null;
    const now = this.now();
    if (session.expiresAt <= now) {
      this.delete(id);
      return null;
    }
    session.expiresAt = now + this.ttlMs;
    if (session.expiryTimer) clearTimeout(session.expiryTimer);
    session.expiryTimer = this.expiryTimer(id, session);
    return { provider: session.provider, apiKey: session.apiKey };
  }

  delete(id: string): boolean {
    const session = this.#sessions.get(id);
    if (!session) return false;
    if (session.expiryTimer) clearTimeout(session.expiryTimer);
    return this.#sessions.delete(id);
  }

  prune(): void {
    const now = this.now();
    for (const [id, session] of this.#sessions) {
      if (session.expiresAt <= now) this.delete(id);
    }
  }

  private expiryTimer(id: string, session: StoredAiSession): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      // A refreshed session owns a different timer; only the current entry may
      // remove itself. This actively releases the API key even if no later
      // request arrives to trigger prune().
      if (this.#sessions.get(id) === session) this.#sessions.delete(id);
    }, this.ttlMs);
    timer.unref?.();
    return timer;
  }
}
