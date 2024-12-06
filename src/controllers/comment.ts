import { Request, Response } from 'express';
import { matchedData, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';

import db from '../lib/prisma.js';
import validation from 'src/middleware/validation.js';
import { Prisma } from '@prisma/client';

type Order = 'asc' | 'desc';

interface CommentsGetParams {
  sort?: { by: string; order: Order };
  cursorId?: number;
  limit?: number;
}

interface PostCommentsGetParams extends CommentsGetParams {
  postId: number;
}

interface CommentRepliesGetParams extends CommentsGetParams {
  commentId: number;
}

const postCommentsGet = [
  ...validation.postCommentsGet(),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', ...errors.mapped() });
      return;
    }

    const {
      postId,
      sort = { by: 'created', order: 'desc' },
      cursorId,
      limit = 10,
    } = matchedData<PostCommentsGetParams>(req);

    const dbQuery: Prisma.CommentFindManyArgs = {
      take: limit,
      where: { postId, parentCommentId: { equals: null } },
    };
    if (cursorId) dbQuery.cursor = { id: cursorId };
    if (sort?.by === 'created') dbQuery.orderBy = { createdAt: sort.order };
    if (sort?.by === 'likes') dbQuery.orderBy = { createdAt: sort.order };
    const comments = await db.comment.findMany(dbQuery);
    const totalComments = await db.comment.count({ where: dbQuery.where });
    res.json({ comments, totalComments });
  }),
];

const commentRepliesGet = [
  ...validation.commentRepliesGet(),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', ...errors.mapped() });
      return;
    }

    const {
      commentId,
      sort = { by: 'created', order: 'desc' },
      cursorId,
      limit = 10,
    } = matchedData<CommentRepliesGetParams>(req);

    const dbQuery: Prisma.CommentFindManyArgs = {
      take: limit,
      where: { parentCommentId: commentId },
    };
    if (cursorId) dbQuery.cursor = { id: cursorId };
    if (sort?.by === 'created') dbQuery.orderBy = { createdAt: sort.order };
    if (sort?.by === 'likes') dbQuery.orderBy = { createdAt: sort.order };
    const replies = await db.comment.findMany(dbQuery);
    const totalReplies = await db.comment.count({ where: dbQuery.where });
    res.json({ replies, totalReplies });
  }),
];

export default { postCommentsGet, commentRepliesGet };
