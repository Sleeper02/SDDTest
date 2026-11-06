import { NextResponse } from 'next/server';
import { FeedSyncService, NotFoundError } from '@/services/feed-sync.service';
import { RefreshFeedsInputSchema, type ApiErrorResponse } from '@/schemas/feed.schema';
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

export async function POST(request: Request): Promise<NextResponse> {
  let feedId: string | undefined;

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const text = await request.text();
      if (text.trim()) {
        const raw = JSON.parse(text) as unknown;
        const parsed = RefreshFeedsInputSchema.safeParse(raw);
        if (!parsed.success) {
          return errorResponse(400, 'VALIDATION_ERROR', 'Parâmetros de atualização inválidos.');
        }
        feedId = parsed.data.feedId;
      }
    } catch {
      return errorResponse(400, 'VALIDATION_ERROR', 'Corpo JSON inválido.');
    }
  }

  try {
    const service = new FeedSyncService();
    const result = await service.refreshFeeds(feedId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return errorResponse(404, 'NOT_FOUND', err.message);
    }
    logger.error('Failed to refresh feeds', {
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno ao atualizar os feeds.');
  }
}
