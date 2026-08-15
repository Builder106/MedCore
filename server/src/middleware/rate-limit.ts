import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

interface LimiterOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

export function rateLimit(opts: LimiterOptions) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (opts.skip?.(req)) {
      next();
      return;
    }
    const key = opts.keyGenerator
      ? opts.keyGenerator(req)
      : ((req.headers['x-forwarded-for'] as string | undefined) ??
        req.socket.remoteAddress ??
        'unknown');
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count++;
    if (bucket.count > opts.max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      res.status(429).json({ error: 'rate_limited' });
      return;
    }
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) {
        if (b.resetAt < now) buckets.delete(k);
      }
    }
    next();
  };
}
