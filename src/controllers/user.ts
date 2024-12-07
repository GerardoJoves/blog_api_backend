import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import asyncHandler from 'express-async-handler';
import { validationResult, matchedData } from 'express-validator';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import passport from 'passport';

import validation from 'src/middleware/validation.js';
import db from '../lib/prisma.js';

type UserCredentials = {
  username: string;
  password: string;
};

dotenv.config();

function generateAccessToken(user: Express.User): Promise<string> {
  const { id: sub, username, role } = user;
  const secret = process.env.ACCESS_TOKEN_SECRET as string;
  const payload = { sub, username, role };
  const options = { expiresIn: '1d' };
  return new Promise((resolve, reject) => {
    jwt.sign(payload, secret, options, (err, token) => {
      if (err) reject(err);
      else resolve(token as string);
    });
  });
}

const register = [
  ...validation.userCredentials(),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', detail: errors.array() });
      return;
    }

    const { username, password } = matchedData<UserCredentials>(req);
    const userFound = await db.user.findUnique({ where: { username } });
    if (userFound) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: { username, passwordHash },
    });

    const token = await generateAccessToken(user);
    res.json({ message: 'User created successfully', data: { token } });
  }),
];

const login = [
  ...validation.userCredentials(),
  passport.authenticate('local', { session: false }),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as Express.User;
    const token = await generateAccessToken(user);
    res.json({ message: 'Login successful', data: { token } });
  }),
];

export default { register, login };
