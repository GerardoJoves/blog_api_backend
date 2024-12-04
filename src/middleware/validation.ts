import { param, query } from 'express-validator';

const paramInt = (key: string) =>
  param(key)
    .isInt({ min: 1 })
    .withMessage('Id must be a positive integer')
    .toInt();

const queryPage = () =>
  query('page', '')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt();

const querySort = (...fieldOptions: string[]) =>
  query('sort')
    .optional()
    .matches(new RegExp(`^(\\+|-)(${fieldOptions.join('|')})$`))
    .customSanitizer((queryString: string) => {
      const order = queryString[0] === '+' ? 'asc' : 'desc';
      const field = queryString.slice(1);
      return { by: field, order };
    });

const querySearch = () =>
  query('q')
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

const allPostGet = () => [
  queryPage(),
  querySort('created'),
  querySearch(),
  queryLimit(),
];

const postCommentsGet = () => [
  querySort('created', 'likes'),
  paramInt('postId'),
  queryLimit(),
];

const commentRepliesGet = () => [
  querySort('created', 'likes'),
  paramInt('commentId'),
  queryLimit(),
];

export default { allPostGet, paramInt, postCommentsGet, commentRepliesGet };
