import { Request, Response } from 'express';
import { matchedData, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';

import db from '../lib/prisma.js';
import validation from 'src/middleware/validation.js';
import { Prisma } from '@prisma/client';

type Order = 'asc' | 'desc';

type AllPostsGetParams = {
  page?: number;
  sort?: { by: string; order: Order };
  limit?: number;
  q?: string;
};

const allPostsGet = [
  ...validation.allPostGet(),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', ...errors.mapped() });
      return;
    }

    const {
      page = 1,
      limit = 10,
      sort = { by: 'created', order: 'desc' },
      q,
    } = matchedData<AllPostsGetParams>(req);

    const offset = (page - 1) * limit;
    const dbQuery: Prisma.PostFindFirstArgs = {
      skip: offset,
      take: limit,
      where: { published: true },
    };
    if (sort?.by === 'created') dbQuery.orderBy = { createdAt: sort.order };
    if (q)
      dbQuery.where = {
        published: true,
        title: { contains: q, mode: 'insensitive' },
      };
    const [posts, totalPosts] = await db.$transaction([
      db.post.findMany(dbQuery),
      db.post.count({ where: dbQuery.where }),
    ]);
    res.json({ posts, totalPosts, page, pageSize: limit });
  }),
];

const postGet = [
  validation.paramInt('postId'),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', ...errors.mapped() });
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

export default { allPostsGet, postGet };
