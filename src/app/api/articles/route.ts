import { NextResponse } from 'next/server';
import { ArticleRepository } from '@/db/repositories/article.repository';
import { ArticleFilterQuerySchema, type ApiErrorResponse } from '@/schemas/feed.schema';
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

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const rawQuery: Record<string, string | undefined> = {
    feedId: searchParams.get('feedId') ?? undefined,
    unreadOnly: searchParams.get('unreadOnly') ?? undefined,
  };

  const parsedQuery = ArticleFilterQuerySchema.safeParse(rawQuery);
  if (!parsedQuery.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Parâmetros de filtro de artigos inválidos.');
  }

  try {
    const repo = new ArticleRepository();
    const articles = repo.listArticles({
      feedId: parsedQuery.data.feedId,
      unreadOnly: parsedQuery.data.unreadOnly,
    });
    return NextResponse.json({ articles }, { status: 200 });
  } catch (err) {
    logger.error('Failed to list articles', {
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno ao buscar os artigos.');
  }
}
