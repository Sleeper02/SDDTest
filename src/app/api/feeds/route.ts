import { NextResponse } from 'next/server';
import { FeedRepository, DuplicateFeedError } from '@/db/repositories/feed.repository';
import { FeedSyncService } from '@/services/feed-sync.service';
import { InvalidFeedSourceError } from '@/services/feed-parser.service';
import { CreateFeedInputSchema, type ApiErrorResponse } from '@/schemas/feed.schema';
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

export async function GET(): Promise<NextResponse> {
  try {
    const repo = new FeedRepository();
    const result = repo.listAll();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    logger.error('Failed to list feeds', {
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno ao listar os feeds.');
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, 'VALIDATION_ERROR', 'Corpo da requisição JSON inválido.');
  }

  const parsedInput = CreateFeedInputSchema.safeParse(rawBody);
  if (!parsedInput.success) {
    const firstIssue = parsedInput.error.issues[0]?.message ?? 'URL de feed inválida.';
    return errorResponse(400, 'VALIDATION_ERROR', firstIssue);
  }

  try {
    const syncService = new FeedSyncService();
    const result = await syncService.subscribeToFeed(parsedInput.data.url);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateFeedError) {
      return errorResponse(409, 'DUPLICATE_FEED', err.message);
    }
    if (err instanceof InvalidFeedSourceError) {
      return errorResponse(422, 'INVALID_FEED_SOURCE', err.message);
    }
    logger.error('Unexpected error subscribing to feed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno ao cadastrar o feed.');
  }
}
