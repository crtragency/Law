import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getInternalMessageUpdates } from "@/lib/internal-messages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const encoder = new TextEncoder();
const STREAM_LIFETIME_MS = 50_000;
const POLL_INTERVAL_MS = 1_000;

function parseSince(value: string | null): Date {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) return new Date();

  const oldestAllowed = Date.now() - 10 * 60 * 1000;
  return new Date(Math.max(parsed.getTime(), oldestAllowed));
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  let cursor = parseSince(request.nextUrl.searchParams.get("since"));
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deliveredVersions = new Map<string, string>();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const startedAt = Date.now();

      const enqueue = (chunk: Uint8Array) => {
        if (closed) return false;
        try {
          controller.enqueue(chunk);
          return true;
        } catch {
          closed = true;
          if (timer) clearTimeout(timer);
          return false;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        if (timer) clearTimeout(timer);
        try {
          controller.close();
        } catch {
          // The browser can close the stream before the server finishes cleanup.
        }
      };

      const tick = async () => {
        if (closed || request.signal.aborted) {
          close();
          return;
        }

        if (Date.now() - startedAt >= STREAM_LIFETIME_MS) {
          close();
          return;
        }

        try {
          const batch = await getInternalMessageUpdates(user.id, cursor);
          if (closed || request.signal.aborted) {
            close();
            return;
          }
          if (batch.length > 0) {
            cursor = new Date(batch[batch.length - 1]!.updatedAt);
          }
          const messages = batch.filter((message) => {
            if (deliveredVersions.get(message.id) === message.updatedAt) {
              return false;
            }
            deliveredVersions.set(message.id, message.updatedAt);
            return true;
          });
          if (messages.length > 0) {
            enqueue(
              encoder.encode(`data: ${JSON.stringify({ messages })}\n\n`)
            );
          } else {
            enqueue(encoder.encode(": keep-alive\n\n"));
          }
        } catch {
          enqueue(
            encoder.encode(
              `event: stream-error\ndata: ${JSON.stringify({ retry: true })}\n\n`
            )
          );
        }

        if (!closed) timer = setTimeout(tick, POLL_INTERVAL_MS);
      };

      enqueue(encoder.encode("retry: 1000\n\n"));
      request.signal.addEventListener("abort", close, { once: true });
      void tick();
    },
    cancel() {
      closed = true;
      if (timer) clearTimeout(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "private, no-cache, no-store, no-transform",
      Connection: "keep-alive",
      "Content-Encoding": "identity",
      "X-Accel-Buffering": "no",
    },
  });
}
