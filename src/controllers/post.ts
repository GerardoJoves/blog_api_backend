import { Request, Response } from 'express';
import { matchedData, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';

import db from '../lib/prisma.js';
import validation from 'src/middleware/validation.js';

type PostsQueryParams = {
  page?: number;
  sort?: 'asc' | 'desc';
  q?: string;
};

const allPostsGet = [
  ...validation.postsQueryParams(),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', ...errors.mapped() });
      return;
    }
    const { page = 1, sort = 'desc', q } = matchedData<PostsQueryParams>(req);
    const limit = 6;
    const offset = (page - 1) * limit;
    const [posts, totalPosts] = await db.$transaction([
      db.post.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: sort },
        where: { published: true, title: { contains: q } },
      }),
      db.post.count({ where: { published: true, title: { contains: q } } }),
    ]);
    res.json({ posts, totalPosts, page, pageSize: limit });
  }),
];

export default { allPostsGet };
