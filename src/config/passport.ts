import passport from 'passport';
import {
  Strategy as LocalStrategy,
  VerifyFunction as VerifyLocalFunction,
} from 'passport-local';
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  VerifyCallback as VerifyJwtFunction,
  StrategyOptions as JwtStrategyOpts,
} from 'passport-jwt';
import { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import db from '../lib/prisma.js';

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET as string;

const verifyLocal: VerifyLocalFunction = (username, password, done) => {
  (async () => {
    const authErr = { message: 'Incorrect username or password' };
    const user = await db.user.findUnique({ where: { username } });
    if (!user) return done(null, false, authErr);
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return done(null, false, authErr);
    return done(null, user);
  })().catch(done);
};

const verifyJwt: VerifyJwtFunction = (payload: JwtPayload, done) => {
  (async () => {
    const { sub } = payload;
    if (!sub) throw new Error('JWT: sub claim is undefined');
    const user = await db.user.findUnique({ where: { id: +sub } });
    if (!user) return done(null, false);
    return done(null, user);
  })().catch(done);
};

const jwtStrategyOpts: JwtStrategyOpts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: ACCESS_TOKEN_SECRET,
  algorithms: ['HS256'],
};

passport.use(new LocalStrategy(verifyLocal));
passport.use(new JwtStrategy(jwtStrategyOpts, verifyJwt));
