import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { AiService } from './ai.service'
import { ChatDto } from './dto/chat.dto'
import { ChatRateLimitGuard } from './guards/chat-rate-limit.guard'

// ── Public endpoint — no JwtAuthGuard (patients are unauthenticated) ─────────
// Route: POST /api/ai/chat
//
// ⚠️  RESPONSE SHAPE — CRITICAL:
// lib/api.ts has an Axios interceptor that checks body.success === true
// and automatically unwraps body.data, returning only the inner object.
// So we MUST return { success: true, data: { reply, sessionId } }
// NOT { success: true, reply, sessionId } at the top level —
// that would cause the frontend to receive `undefined` for reply.
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ChatRateLimitGuard)
  async chat(@Body() dto: ChatDto) {
    const { reply, sessionId } = await this.aiService.chat(dto.message, dto.sessionId)
    return {
      success: true,
      data: { reply, sessionId },   // ← wrapped in data so lib/api.ts unwraps correctly
    }
  }
}