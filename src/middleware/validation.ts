import { body, param, query } from 'express-validator';

type Order = 'asc' | 'desc';

export type PostFilterOptions = {
  page?: number;
  sort?: { by: string; order: Order };
  limit?: number;
  keyword?: string;
};

export type CommentFilterOptions = {
  sort?: { by: 'created' | 'likes'; order: Order };
  cursorId?: number;
  limit?: number;
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

const queryPage = () =>
  query('page', '')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt();

const querySort = ({ options }: { options: string[] }) => {
  const regex = new RegExp('^(asc|desc)_(' + options.join('|') + ')$');
  return query('sort')
    .optional()
    .matches(regex)
    .customSanitizer((sortValue: string) => {
      const [sortOrder, sortBy] = sortValue.split('_');
      return { by: sortBy, order: sortOrder };
    });
};

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

const bodyUsername = () => {
  const minLength = 3;
  const maxLength = 16;
  const regex = /^[a-zA-Z0-9_]+$/;

  const errLength = `Username must be ${minLength} to ${maxLength} characters long.`;
  const errRegex = 'Username can only contain letters, numbers or underscores.';

  return body('username')
    .trim()
    .isLength({ min: minLength, max: maxLength })
    .withMessage(errLength)
    .matches(regex)
    .withMessage(errRegex);
};

const bodyPassword = () => {
  const minLength = 8;
  const maxLength = 32;
  const regex = /^(?=.*[a-zA-Z])(?=.*\d).+$/;

  const errLength = `Password must be ${minLength} to ${maxLength} characters long.`;
  const errRegex = 'Password must cantain at least one letter and one number.';

  return body('password')
    .isLength({ min: minLength, max: maxLength })
    .withMessage(errLength)
    .matches(regex)
    .withMessage(errRegex);
};

const postFilterOptions = () => [
  queryPage(),
  queryLimit(),
  queryKeyword(),
  querySort({ options: ['created'] }),
];

const commentFilterOptions = () => [
  queryIntId('cursorId').optional(),
  queryLimit(),
  querySort({ options: ['created', 'likes'] }),
];

const postId = () => paramIntId('postId');
const commentId = () => paramIntId('commentId');

const userCredentials = () => [bodyPassword(), bodyUsername()];

export default {
  postFilterOptions,
  commentFilterOptions,
  userCredentials,
  postId,
  commentId,
};
