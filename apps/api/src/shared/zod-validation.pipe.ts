import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

// Valida el body contra un esquema de @capri/contracts y devuelve
// el error con la forma estándar { error: { code, message, details } }.
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        error: {
          code: "VALIDATION_ERROR",
          message: "Datos de entrada inválidos",
          details: result.error.flatten(),
        },
      });
    }
    return result.data;
  }
}
