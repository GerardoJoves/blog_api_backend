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
  const {
    postId,
    commentId: parentCommentId = null,
    sort,
    cursor,
    limit = 10,
  } = filterOptions;

  let orderBy: Prisma.CommentOrderByWithAggregationInput;
  if (sort?.by === 'created') orderBy = { createdAt: sort.order };
  else if (sort?.by === 'likes') orderBy = { likes: sort.order };
  else orderBy = { createdAt: 'desc' };

  const comments = await db.comment.findMany({
    where: { postId, parentCommentId },
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1,
    orderBy,
    include: {
      author: { select: { id: true, username: true } },
      targetUser: { select: { id: true, username: true } },
      _count: { select: { childComments: true } },
    },
  });

  let nextCursor: number | null = null;
  let hasMore = false;

  if (comments.length > limit) {
    hasMore = true;
    const lastComment = comments.pop();
    if (lastComment) nextCursor = lastComment.id;
  }

  res.json({ comments, nextCursor, hasMore });
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', detail: errors.mapped() });
      return;
    }

    const user = req.user as Express.User;
    const data = matchedData<NewCommentData>(req);
    const { postId, parentCommentId, targetUserId, content } = data;

    const isValidRequest =
      (parentCommentId && targetUserId) || (!parentCommentId && !targetUserId);
    if (!isValidRequest) {
      res.status(400).json({
        error: 'Bad Request',
        detail:
          'Invalid comment structure. A base comment cannot have a target user, and a reply must have both a parent comment ID and a target user.',
      });
      return;
    }

    const [post, parentComment, validSiblingReplyTarget] = await Promise.all([
      db.post.findUnique({
        where: { id: postId },
        select: { id: true, published: true },
      }),
      parentCommentId
        ? db.comment.findUnique({
            where: { id: parentCommentId },
            select: { id: true, authorId: true, postId: true },
          })
        : null,
      targetUserId
        ? db.comment.findFirst({
            where: { postId, authorId: targetUserId, parentCommentId },
            select: { id: true },
          })
        : null,
    ]);

    if (!post || post.published === false) {
      res.status(404).json({
        error: 'Not Found',
        detail: 'Post not found',
      });
      return;
    }

    if (parentCommentId && !parentComment) {
      res.status(404).json({
        error: 'Not Found',
        detail: 'Parent comment not found',
      });
      return;
    }

    if (parentComment && parentComment.postId != post.id) {
      res.status(400).json({
        error: 'Bad Request',
        detail:
          "The parent comment's post ID does not match the provided post ID",
      });
      return;
    }

    const isInvalidTarget =
      targetUserId &&
      targetUserId !== parentComment?.authorId &&
      !validSiblingReplyTarget;
    if (isInvalidTarget) {
      res.status(400).json({
        error: 'Bad Request',
        detail: 'The specified user cannot be replied to in this context.',
      });
    }

    const newComment = await db.comment.create({
      data: { authorId: user.id, postId, parentCommentId, content },
    });
    res.status(201).json(newComment);
  }),
];

const deleteComment = [
  passport.authenticate('jwt', { session: false }),
  validation.commentId(),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', detail: errors.mapped() });
      return;
    }

    const user = req.user as Express.User;
    const { commentId } = matchedData<{ commentId: number }>(req);
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true },
    });

    if (!comment) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    if (comment.authorId != user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await db.comment.delete({ where: { id: comment.id } });
    res.json({ message: 'Comment deleted sucessfully' });
  }),
];

const updateComment = [
  passport.authenticate('jwt', { session: false }),
  validation.commentId(),
  validation.commentContent(),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Bad Request', detail: errors.mapped() });
      return;
    }

    const user = req.user as Express.User;
    const data = matchedData<{ commentId: number; content: string }>(req);
    const { commentId, content } = data;
    const comment = await db.comment.findUnique({ where: { id: commentId } });

    if (!comment) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    if (comment.authorId != user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const commentUpdated = await db.comment.update({
      where: { id: comment.id },
      data: { content },
    });
    res.json(commentUpdated);
  }),
];

export default {
  getPostComments,
  getCommentReplies,
  createComment,
  deleteComment,
  updateComment,
};
