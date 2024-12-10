import { RequestHandler } from 'express';
import { matchedData, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';

import db from '../lib/prisma.js';
import validation, { CommentFilterOptions } from 'src/middleware/validation.js';
import { Prisma } from '@prisma/client';

type CommentFilteringCriteria = CommentFilterOptions & {
  postId: number;
  commentId?: number;
};

const getCommentsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Bad Request', ...errors.mapped() });
    return;
  }

  const filterOptions = matchedData<CommentFilteringCriteria>(req);
  const { postId, commentId, sort, cursorId, limit = 10 } = filterOptions;

  const dbQuery: Prisma.CommentFindManyArgs = {
    take: limit,
    where: { postId, parentCommentId: { equals: commentId ?? null } },
    orderBy: { createdAt: 'desc' },
  };
  if (cursorId) dbQuery.cursor = { id: cursorId };
  if (sort?.by === 'created') dbQuery.orderBy = { createdAt: sort.order };
  if (sort?.by === 'likes') dbQuery.orderBy = { likes: sort.order };

  const [comments, totalComments] = await db.$transaction([
    db.comment.findMany(dbQuery),
    db.comment.count({ where: dbQuery.where }),
  ]);
  res.json({ comments, totalComments });
});

const getPostComments = [
  validation.postId(),
  ...validation.commentFilterOptions(),
  getCommentsHandler,
];

const getCommentReplies = [
  validation.postId(),
  validation.commentId(),
  ...validation.commentFilterOptions(),
  getCommentsHandler,
];

export default { getPostComments, getCommentReplies };
