import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common'

// Simple in-process rate limiter — 30 requests / IP / minute
// For multi-instance prod, replace with ThrottlerModule + Redis store

const hits = new Map<string, { count: number; resetAt: number }>()

@Injectable()
export class ChatRateLimitGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req   = ctx.switchToHttp().getRequest()
    const ip    = req.ip ?? req.connection.remoteAddress ?? 'unknown'
    const now   = Date.now()
    const entry = hits.get(ip)

    if (!entry || now > entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + 60_000 })
      return true
    }

    if (entry.count >= 30) {
      throw new HttpException(
        { success: false, message: 'Too many messages. Please slow down.', reply: 'You are sending messages too quickly. Please wait a moment.' },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    entry.count++
    return true
  }
}
