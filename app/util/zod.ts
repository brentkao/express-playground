import { ZodError } from "zod";

export function formatZodValidationErrors(err: ZodError) {
  const errors = err.errors.map((error) => {
    return {
      [error.path.join(".")]: error.message,
    };
  });
  return errors;
}
