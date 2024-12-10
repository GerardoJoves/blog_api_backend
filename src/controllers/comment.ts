import { RequestHandler, Request, Response } from 'express';
import { matchedData, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';

import db from '../lib/prisma.js';
import validation, {
  CommentFilterOptions,
  NewCommentData,
} from 'src/middleware/validation.js';
import { Prisma } from '@prisma/client';
import passport from 'passport';

type CommentFilteringCriteria = CommentFilterOptions & {
  postId?: number;
  commentId?: number;
};

const getCommentsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Bad Request', ...errors.mapped() });
    return;
  }

  const filterOptions = matchedData<CommentFilteringCriteria>(req);
  const { postId, commentId, sort, cursor, limit = 10 } = filterOptions;

  const dbQuery: Prisma.CommentFindManyArgs = {
    take: limit,
    where: { postId, parentCommentId: { equals: commentId ?? null } },
    orderBy: { createdAt: 'desc' },
  };
  if (cursor) dbQuery.cursor = { id: cursor };
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
  validation.commentId(),
  ...validation.commentFilterOptions(),
  getCommentsHandler,
];

const createComment = [
  passport.authenticate('jwt', { session: false }),
  ...validation.newComment(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as Express.User;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', detail: errors.mapped() });
      return;
    }

    const data = matchedData<NewCommentData>(req);
    const { postId, parentCommentId, content } = data;

    let parentComment;
    if (parentCommentId) {
      parentComment = await db.comment.findUnique({
        where: { id: parentCommentId },
      });
    }
    if (parentCommentId && !parentComment) {
      res.status(404);
      res.json({ error: 'Not Found', detail: 'Parent comment not found' });
      return;
    }
    if (parentComment && parentComment.postId != postId) {
      res.status(400);
      res.json({
        error: 'Bad Request',
        detail:
          "The parent comment's post ID does not match the provided post ID.",
      });
      return;
    }

    const newComment = await db.comment.create({
      data: { authorId: user.id, postId, parentCommentId, content },
    });
    res.status(201).json(newComment);
  }),
];

export default { getPostComments, getCommentReplies, createComment };
