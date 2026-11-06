import { NextResponse } from 'next/server';
import { ArticleRepository } from '@/db/repositories/article.repository';
import { MarkAllReadInputSchema, type ApiErrorResponse } from '@/schemas/feed.schema';
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
        const parsed = MarkAllReadInputSchema.safeParse(raw);
        if (!parsed.success) {
          return errorResponse(400, 'VALIDATION_ERROR', 'Parâmetro feedId inválido.');
        }
        feedId = parsed.data.feedId;
      }
    } catch {
      return errorResponse(400, 'VALIDATION_ERROR', 'Corpo JSON inválido.');
    }
  }

  try {
    const repo = new ArticleRepository();
    const updatedCount = repo.markAllAsRead(feedId);
    return NextResponse.json({ updatedCount }, { status: 200 });
  } catch (err) {
    logger.error('Failed to mark all articles as read', {
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'Erro interno ao marcar os artigos como lidos.'
    );
  }
}
