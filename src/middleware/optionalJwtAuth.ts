import asyncHandler from 'express-async-handler';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import passport from 'passport';

export default asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authMiddleware = passport.authenticate(
      'jwt',
      { session: false },
      (err: unknown, user: Express.User) => {
        if (err) return next(err);
        if (user) return req.login(user, { session: false }, next);
        next();
      },
    ) as RequestHandler;
    await authMiddleware(req, res, next);
  },
);
