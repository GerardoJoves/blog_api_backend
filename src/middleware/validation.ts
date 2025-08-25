import { body, param, query } from 'express-validator';

import db from '../lib/prisma.js';

type Order = 'asc' | 'desc';

export type PostFilterOptions = {
  page?: number;
  sort?: { by: string; order: Order };
  limit?: number;
  keyword?: string;
};

export type CommentFilterOptions = {
  sort?: { by: 'created' | 'likes'; order: Order };
  cursor?: number;
  limit?: number;
};

export type NewCommentData = {
  content: string;
  postId: number;
  parentCommentId?: number;
  targetUserId?: number;
};

export type PostData = {
  title: string;
  content: string;
  published: boolean;
};

const paramIntId = (key: string) =>
  param(key)
    .isInt({ min: 1 })
    .withMessage('Id must be a positive integer')
    .toInt();

const queryIntId = (key: string) =>
  query(key)
    .isInt({ min: 1 })
    .withMessage('Id must be a positive integer')
    .toInt();

const bodyIntId = (key: string) =>
  body(key)
    .isInt({ min: 1 })
    .withMessage('Id must be a positive integer')
    .toInt();

const queryPage = () =>
  query('page', '')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt();

const querySort = ({ options }: { options: string[] }) =>
  query('sort')
    .optional()
    .matches(new RegExp('^(asc|desc)_(' + options.join('|') + ')$'))
    .customSanitizer((sortValue: string) => {
      const [sortOrder, sortBy] = sortValue.split('_');
      return { by: sortBy, order: sortOrder };
    });

const queryKeyword = () =>
  query('keyword')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search query must not be empty');

const queryLimit = () =>
  query('limit')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .customSanitizer((val: number) => (val > 20 ? 20 : val));

const username = () =>
  body('username')
    .trim()
    .isLength({ min: 3, max: 16 })
    .withMessage('Username must be 3 to 16 characters long.')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers or underscores.');

const isUsernameAvailable = () =>
  body('username').custom(async (username: string) => {
    const userFound = await db.user.findUnique({ where: { username } });
    if (userFound) throw new Error('Username already exists');
  });

const password = () =>
  body('password')
    .isLength({ min: 8, max: 32 })
    .withMessage('Password must be 8 to 32 characters long.')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/)
    .withMessage('Password must contain at least one letter and one number.');

const commentContent = () =>
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be 1 to 500 characters long.');

const postContent = () =>
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Post content can not be empty.');

const postTitle = () =>
  body('title')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Post title can not be empty.');

const postData = () => [
  postContent(),
  postTitle(),
  body('published').isBoolean().toBoolean(),
];

const postFilterOptions = () => [
  queryPage(),
  queryLimit(),
  queryKeyword(),
  querySort({ options: ['created'] }),
];

const commentFilterOptions = () => [
  queryIntId('cursor').optional(),
  queryLimit(),
  querySort({ options: ['created', 'likes'] }),
];

const postId = () => paramIntId('postId');
const commentId = () => paramIntId('commentId');

const userCredentials = () => [password(), username()];

const newComment = () => [
  bodyIntId('postId').optional(),
  bodyIntId('parentCommentId').optional(),
  bodyIntId('targetUserId').optional(),
  commentContent(),
];

export default {
  postData,
  newComment,
  postFilterOptions,
  commentFilterOptions,
  userCredentials,
  postId,
  commentId,
  commentContent,
  isUsernameAvailable,
};
