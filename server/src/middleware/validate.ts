import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/** Validates and replaces req.body/query/params with the parsed, trusted values. */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) {
      // Express 5 makes req.query a getter-only property (no setter), so a plain
      // assignment throws. It stays configurable, so redefine it instead.
      Object.defineProperty(req, "query", { value: schemas.query.parse(req.query), configurable: true, enumerable: true, writable: true });
    }
    if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
    next();
  };
}
