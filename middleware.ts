// middleware.ts at project root
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(50, "60 s"), // 50 req per 60s
  analytics: true,
});

export default async function middleware(req) {
  const ip = req.ip ?? "127.0.0.1";

  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }
}