import { describe, it, expect, vi, beforeEach } from 'vitest'
import { classifyIntent } from './intent-router'

// Mock the AI module
vi.mock('./ai', () => ({
  chatCompletion: vi.fn()
}))

import { chatCompletion } from './ai'

describe('Intent Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should classify greetings as conversational', async () => {
    vi.mocked(chatCompletion).mockResolvedValueOnce(
      JSON.stringify({ type: 'conversational', confidence: 0.95 })
    )

    const result = await classifyIntent('Hello!')

    expect(result.type).toBe('conversational')
    expect(result.confidence).toBe(0.95)
  })

  it('should classify technical questions as technical_query', async () => {
    vi.mocked(chatCompletion).mockResolvedValueOnce(
      JSON.stringify({
        type: 'technical_query',
        keywords: ['crosswind', 'limit', 'B777'],
        confidence: 0.9
      })
    )

    const result = await classifyIntent('What is the max crosswind limit for B777?')

    expect(result.type).toBe('technical_query')
    expect(result.keywords).toContain('crosswind')
  })

  it('should classify quiz requests as generative_task', async () => {
    vi.mocked(chatCompletion).mockResolvedValueOnce(
      JSON.stringify({
        type: 'generative_task',
        topic: 'hydraulics',
        confidence: 0.92
      })
    )

    const result = await classifyIntent('Give me a quiz on hydraulics')

    expect(result.type).toBe('generative_task')
    expect(result.topic).toBe('hydraulics')
  })

  it('should handle malformed JSON responses', async () => {
    vi.mocked(chatCompletion).mockResolvedValueOnce('Not JSON at all')

    const result = await classifyIntent('Some query')

    expect(result.type).toBe('conversational')
    expect(result.confidence).toBeLessThan(1)
  })

  it('should handle errors gracefully', async () => {
    vi.mocked(chatCompletion).mockRejectedValueOnce(new Error('API error'))

    const result = await classifyIntent('Query that fails')

    expect(result.type).toBe('conversational')
    expect(result.confidence).toBe(0.5)
  })
})
