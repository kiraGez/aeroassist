import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  keyPrefix?: string
}

// In-memory rate limit store (for serverless, use Upstash Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000)

export function rateLimit(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyPrefix = 'rl' } = config

  return async function checkRateLimit(
    request: NextRequest
  ): Promise<{ success: boolean; remaining: number; resetTime: number } | NextResponse> {
    // Get client identifier (IP or user ID)
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
    const key = `${keyPrefix}:${ip}`

    const now = Date.now()
    const record = rateLimitStore.get(key)

    if (!record || record.resetTime < now) {
      // New window
      const resetTime = now + windowMs
      rateLimitStore.set(key, { count: 1, resetTime })
      return { success: true, remaining: maxRequests - 1, resetTime }
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((record.resetTime - now) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
            'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString()
          }
        }
      )
    }

    // Increment counter
    record.count++
    rateLimitStore.set(key, record)

    return {
      success: true,
      remaining: maxRequests - record.count,
      resetTime: record.resetTime
    }
  }
}

// Pre-configured rate limiters
export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  keyPrefix: 'chat'
})

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 uploads per hour
  keyPrefix: 'upload'
})

export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  keyPrefix: 'general'
})
