import { HttpException } from "@nestjs/common";

// Helper para lanzar errores con la forma estándar del Cap. 7:
// { error: { code, message, details? } }
export function apiError(status: number, code: string, message: string, details?: unknown): never {
  throw new HttpException({ error: { code, message, ...(details ? { details } : {}) } }, status);
}
