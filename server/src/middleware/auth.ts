import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from './errorHandler.js';

export interface AuthRequest extends Request {
  user?: any;
  userId?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export function signToken(user: { id: string; email?: string | null }): string {
  return jwt.sign(
    { sub: user.id, email: user.email || '' },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions
  );
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized', 401));
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    const user = await User.findById(payload.sub);
    if (!user) return next(new AppError('Unauthorized', 401));
    req.user = user;
    req.userId = user.id;
    next();
  } catch {
    next(new AppError('Unauthorized', 401));
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    User.findById(payload.sub).then((user) => {
      if (user) {
        req.user = user;
        req.userId = user.id;
      }
      next();
    }).catch(() => next());
  } catch {
    next();
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new AppError('Forbidden', 403));
    }
    next();
  };
}
