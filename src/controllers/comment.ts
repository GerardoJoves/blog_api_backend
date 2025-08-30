import { RequestHandler, Request, Response, NextFunction } from 'express';
import { matchedData, validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';
import { Prisma } from '@prisma/client';
import passport from 'passport';

import db from '../lib/prisma.js';
import validation, {
  CommentFilterOptions,
  NewCommentData,
} from '../middleware/validation.js';

type CommentFilteringCriteria = CommentFilterOptions & {
  postId: number;
  commentId?: number;
};

const getCommentsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res
      .status(400)
      .json({ error: 'Bad Request', status: 400, ...errors.mapped() });
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

interface AuthenticationError extends Error {
  name: 'AuthenticationError';
}

function isAuthenticationError(err: unknown): err is AuthenticationError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: string }).name === 'AuthenticationError'
  );
}

const createComment = [
  passport.authenticate('jwt', { session: false, failWithError: true }),

  (err: unknown, _: Request, res: Response, next: NextFunction) => {
    if (isAuthenticationError(err)) {
      return res.status(401).json({ error: 'Unauthorized', status: 401 });
    } else return next(err);
  },

  ...validation.newComment(),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        status: 400,
        error: 'Bad Request',
        type: 'validation',
        detail: errors.mapped(),
      });
      return;
    }

    const user = req.user as Express.User;
    const data = matchedData<NewCommentData>(req);
    const { postId, parentCommentId, targetUserId, content } = data;

    if (postId && parentCommentId) {
      res.status(400).json({
        error: 'Bad Request',
        msg: 'A comment submission can have either a post ID or a parent comment ID, but not both.',
      });
    }

    const isValidRequest =
      (parentCommentId && targetUserId) || (!parentCommentId && !targetUserId);
    if (!isValidRequest) {
      res.status(400).json({
        error: 'Bad Request',
        msg: 'Invalid comment structure. A post comment cannot have a target user, and a reply must have both a parent comment ID and a target user.',
      });
      return;
    }

    const [post, parentComment, validSiblingReplyTarget] = await Promise.all([
      postId
        ? db.post.findUnique({
            where: { id: postId },
            select: { id: true, published: true },
          })
        : null,
      parentCommentId
        ? db.comment.findUnique({
            where: { id: parentCommentId },
            include: { post: { select: { published: true } } },
          })
        : null,
      targetUserId
        ? db.comment.findFirst({
            where: { postId, authorId: targetUserId, parentCommentId },
            select: { id: true },
          })
        : null,
    ]);

    if (postId && !post) {
      res.status(404).json({
        error: 'Not Found',
        msg: 'Post not found',
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

    if (
      (post && post.published === false) ||
      (parentComment && parentComment.post.published === false)
    ) {
      res.status(404).json({
        error: 'Not Found',
        msg: 'Post not found',
      });
      return;
    }

    if (parentComment && parentComment.parentCommentId) {
      res.status(400).json({
        error: 'Bad Request',
        msg: 'A reply can only be made to a top-level comment. This parent comment is already a reply.',
      });
    }

    const isInvalidTarget =
      targetUserId &&
      targetUserId !== parentComment?.authorId &&
      !validSiblingReplyTarget;
    if (isInvalidTarget) {
      res.status(400).json({
        error: 'Bad Request',
        msg: 'The specified user cannot be replied to in this context.',
      });
    }

    await db.comment.create({
      data: {
        authorId: user.id,
        postId: postId ?? parentComment?.postId,
        parentCommentId,
        targetUserId,
        content,
      },
    });

    res
      .status(201)
      .json({ success: true, msg: 'Comment created successfully' });
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
