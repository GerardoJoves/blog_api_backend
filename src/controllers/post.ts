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

const getPosts = [
  ...validation.postFilterOptions(),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', detail: errors.mapped() });
      return;
    }

    const filterOptions = matchedData<PostFilterOptions>(req);
    const { page = 1, limit = 10, sort, keyword } = filterOptions;
    const offset = (page - 1) * limit;
    const dbQuery: Prisma.PostFindFirstArgs = {
      skip: offset,
      take: limit,
      where: { published: true },
      orderBy: { createdAt: 'desc' }, // default order
    };
    if (sort?.by === 'created') {
      dbQuery.orderBy = { createdAt: sort.order };
    }
    if (keyword) {
      dbQuery.where = {
        title: { contains: keyword, mode: 'insensitive' },
        published: true,
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

export default { getPosts, getPost, createPost };
