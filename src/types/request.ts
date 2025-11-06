import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

export type TypedRequestBody<T> = Request<ParamsDictionary, any, T, ParsedQs>;
export type TypedRequestQuery<T extends ParsedQs> = Request<ParamsDictionary, any, any, T>;
export type TypedRequest<TBody, TQuery extends ParsedQs> = Request<ParamsDictionary, any, TBody, TQuery>;