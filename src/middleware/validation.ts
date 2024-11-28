import { query } from 'express-validator';

const queryParamPage = () =>
  query('page', '')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt();

const queryParamSort = () =>
  query('sort')
    .optional()
    .isIn(['desc', 'asc'])
    .withMessage('Sort must be either "desc" or "asc"');

const queryParamSearch = () =>
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search query must not be empty');

const postsQueryParams = () => [
  queryParamPage(),
  queryParamSort(),
  queryParamSearch(),
];

export default { postsQueryParams };
