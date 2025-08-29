import { Request, Response } from 'express';
import { matchedData, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';
import passport from 'passport';

import db from '../lib/prisma.js';
import validation, {
  PostFilterOptions,
  PostData,
} from 'src/middleware/validation.js';
import { Prisma } from '@prisma/client';
import optionalJwtAuth from 'src/middleware/optionalJwtAuth.js';

const getPosts = [
  optionalJwtAuth,
  ...validation.postFilterOptions(),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', detail: errors.mapped() });
      return;
    }

    const filterOptions = matchedData<PostFilterOptions>(req);
    const { page = 1, limit = 10, sort, keyword, published } = filterOptions;
    const offset = (page - 1) * limit;
    const dbQuery: Prisma.PostFindFirstArgs = {
      skip: offset,
      take: limit,
      orderBy: { createdAt: sort?.by === 'created' ? sort.order : 'desc' },
      include: { author: { select: { username: true } } },
    };

    if (req.isAuthenticated() && req.user.role === 'ADMIN') {
      if (typeof published === 'boolean') {
        dbQuery.where = { ...dbQuery.where, published: published };
      }
    } else {
      // Regular users can only see published posts
      dbQuery.where = { ...dbQuery.where, published: true };
    }

    if (keyword) {
      dbQuery.where = {
        ...dbQuery.where,
        title: { contains: keyword, mode: 'insensitive' },
      };
    }

    const [posts, totalPosts] = await db.$transaction([
      db.post.findMany(dbQuery),
      db.post.count({ where: dbQuery.where }),
    ]);
    res.json({ posts, totalPosts, page, pageSize: limit });
  }),
];

const getPost = [
  validation.postId(),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', detail: errors.mapped() });
      return;
    }

    const { postId } = matchedData<{ postId: number }>(req);
    const post = await db.post.findUnique({
      where: { id: postId, published: true },
      include: { author: { select: { id: true, username: true } } },
    });
    if (!post) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }

    res.json(post);
  }),
];

const createPost = [
  passport.authenticate('jwt', { session: false }),
  ...validation.postData(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as Express.User;
    if (user.role != 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', detail: errors.mapped() });
      return;
    }

    const data = matchedData<PostData>(req);
    const post = await db.post.create({ data: { authorId: user.id, ...data } });
    res.status(201).json(post);
  }),
];

const updatePost = [
  passport.authenticate('jwt', { session: false }),
  validation.postId(),
  ...validation.postData(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as Express.User;
    if (user.role != 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', detail: errors.mapped() });
      return;
    }

    const { postId, ...data } = matchedData<{ postId: number } & PostData>(req);
    const post = await db.post.update({ where: { id: postId }, data });
    res.status(200).json(post);
  }),
];

export default { getPosts, getPost, createPost, updatePost };
