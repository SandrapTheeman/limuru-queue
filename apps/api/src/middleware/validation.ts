import type { Context, MiddlewareHandler } from 'hono';
import { z, ZodSchema, ZodError } from 'zod';

export interface ValidationOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

const formatZodError = (error: ZodError) => {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
};

export const validate = (options: ValidationOptions): MiddlewareHandler => {
  return async (c, next) => {
    const errors: { location: string; errors: ReturnType<typeof formatZodError> }[] = [];

    if (options.body) {
      try {
        const body = await c.req.json().catch(() => ({}));
        const validated = options.body.parse(body);
        (c as any).validatedBody = validated;
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push({ location: 'body', errors: formatZodError(error) });
        } else {
          return c.json({ error: 'Invalid request body' }, 400);
        }
      }
    }

    if (options.query) {
      const queryParams = c.req.query();
      const query: Record<string, string | boolean | undefined> = {};
      for (const [k, v] of Object.entries(queryParams)) {
        if (v !== undefined) {
          query[k] = v === 'true' ? true : v === 'false' ? false : v;
        }
      }
      try {
        const validated = options.query.parse(query);
        (c as any).validatedQuery = validated;
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push({ location: 'query', errors: formatZodError(error) });
        }
      }
    }

    if (options.params) {
      try {
        const validated = options.params.parse(c.req.param());
        (c as any).validatedParams = validated;
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push({ location: 'params', errors: formatZodError(error) });
        }
      }
    }

    if (errors.length > 0) {
      return c.json({ error: 'Validation failed', details: errors }, 400);
    }

    await next();
  };
};

export const validateBody = (schema: ZodSchema) => validate({ body: schema });
export const validateQuery = (schema: ZodSchema) => validate({ query: schema });
export const validateParams = (schema: ZodSchema) => validate({ params: schema });
