import { NextResponse } from 'next/server';
import { FeedRepository } from '@/db/repositories/feed.repository';
import { FeedIdSchema, type ApiErrorResponse } from '@/schemas/feed.schema';
import { logger } from '@/lib/logger';

function errorResponse(
  status: number,
  code: ApiErrorResponse['error']['code'],
  message: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ feedId: string }> }
): Promise<NextResponse> {
  const { feedId } = await context.params;
  const parsedId = FeedIdSchema.safeParse(feedId);
  if (!parsedId.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Identificador de feed inválido.');
  }

  try {
    const repo = new FeedRepository();
    const deleted = repo.deleteById(parsedId.data);
    if (!deleted) {
      return errorResponse(404, 'NOT_FOUND', 'Inscrição de feed não encontrada.');
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logger.error('Failed to delete feed', {
      feedId,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno ao remover o feed.');
  }
}
