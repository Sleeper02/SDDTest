import { NextResponse } from 'next/server';
import { ArticleRepository } from '@/db/repositories/article.repository';
import {
  ArticleIdSchema,
  UpdateArticleReadStateSchema,
  type ApiErrorResponse,
} from '@/schemas/feed.schema';
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ articleId: string }> }
): Promise<NextResponse> {
  const { articleId } = await context.params;
  const parsedId = ArticleIdSchema.safeParse(articleId);
  if (!parsedId.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Identificador de artigo inválido.');
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, 'VALIDATION_ERROR', 'Corpo JSON inválido.');
  }

  const parsedBody = UpdateArticleReadStateSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'O campo booleano isRead é obrigatório.');
  }

  try {
    const repo = new ArticleRepository();
    const updated = repo.updateReadState(parsedId.data, parsedBody.data.isRead);
    if (!updated) {
      return errorResponse(404, 'NOT_FOUND', 'Artigo não encontrado.');
    }
    return NextResponse.json({ article: updated }, { status: 200 });
  } catch (err) {
    logger.error('Failed to update article read state', {
      articleId,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno ao atualizar status de leitura.');
  }
}
