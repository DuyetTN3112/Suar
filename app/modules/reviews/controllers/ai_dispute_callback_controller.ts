import type { HttpContext } from '@adonisjs/core/http'

import ProcessAiDisputeCallbackCommand from '#modules/reviews/actions/commands/process_ai_dispute_callback_command'

export default class AiDisputeCallbackController {
  async handle({ request, response }: HttpContext) {
    // Callback received — payload logged at command level with sanitized fields only
    const timestamp = Number(
      request.header('X-Timestamp') ??
        request.header('X-AI-Timestamp') ??
        request.input('timestamp') ??
        0
    )
    const signature = String(
      request.header('X-Signature') ??
        request.header('X-AI-Signature') ??
        request.input('signature') ??
        ''
    )

    const command = new ProcessAiDisputeCallbackCommand()
    const result = await command.execute({
      evaluation_id: request.input('evaluation_id') as string,
      status: request.input('status') as 'completed' | 'failed',
      recommendation: request.input('recommendation') as string | undefined,
      confidence_score: request.input('confidence_score') ? Number(request.input('confidence_score')) : undefined,
      summary: request.input('summary') as string | undefined,
      response_payload: request.input('response_payload') as Record<string, unknown> | undefined,
      error_message: request.input('error_message') as string | undefined,
      timestamp,
      signature,
    })

    response.json({
      success: true,
      data: result,
    })
  }
}
