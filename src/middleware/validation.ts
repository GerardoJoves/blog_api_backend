import { body, param, query } from 'express-validator';

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

const userCredentials = () => [bodyPassword(), bodyUsername()];

export default {
  allPostGet,
  paramInt,
  postCommentsGet,
  commentRepliesGet,
  userCredentials,
};
