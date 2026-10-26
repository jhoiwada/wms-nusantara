import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from './logger';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_STATE'
  | 'DUPLICATE'
  | 'INTERNAL_ERROR';

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;

    if (statusCode) {
      this.statusCode = statusCode;
    } else {
      switch (code) {
        case 'VALIDATION_ERROR':
          this.statusCode = 400;
          break;
        case 'UNAUTHENTICATED':
          this.statusCode = 401;
          break;
        case 'FORBIDDEN':
          this.statusCode = 403;
          break;
        case 'NOT_FOUND':
          this.statusCode = 404;
          break;
        case 'INSUFFICIENT_STOCK':
        case 'INVALID_STATE':
        case 'DUPLICATE':
          this.statusCode = 409;
          break;
        case 'INTERNAL_ERROR':
        default:
          this.statusCode = 500;
          break;
      }
    }
  }
}

export interface ErrorResult {
  statusCode: number;
  response: ErrorResponse;
}

export function formatError(error: unknown): ErrorResult {
  // Rethrow Next.js internal control-flow errors (redirects, dynamic server bailouts, hanging promises)
  if (
    error &&
    typeof error === 'object' &&
    'digest' in error &&
    typeof (error as Record<string, unknown>).digest === 'string'
  ) {
    throw error;
  }

  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      response: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      response: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data input tidak valid',
          details: error.issues,
        },
      },
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint failed
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.join(', ') ?? 'field';
      return {
        statusCode: 409,
        response: {
          error: {
            code: 'DUPLICATE',
            message: `Data dengan ${target} tersebut sudah terdaftar di sistem`,
            details: error.meta,
          },
        },
      };
    }

    // P2025: Record to update/delete not found
    if (error.code === 'P2025') {
      return {
        statusCode: 404,
        response: {
          error: {
            code: 'NOT_FOUND',
            message: 'Data yang dicari tidak ditemukan di database',
          },
        },
      };
    }
  }

  // Kesalahan tak terduga (Internal Server Error)
  logger.error({ err: error }, 'Unhandled server error captured in handleError');

  return {
    statusCode: 500,
    response: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan internal pada server',
      },
    },
  };
}

export type ErrorApiResponse = Response & ErrorResult;

export function handleError(error: unknown): ErrorApiResponse {
  const result = formatError(error);
  const res = Response.json(result.response, {
    status: result.statusCode,
  }) as ErrorApiResponse;

  res.statusCode = result.statusCode;
  res.response = result.response;

  return res;
}
