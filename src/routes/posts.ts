import { Router } from 'express';

import postController from '../controllers/post.js';
import commentController from '../controllers/comment.js';

const router = Router();

router.get('/', postController.allPostsGet);
router.get('/:postId', postController.postGet);
router.get('/:postId/comments', commentController.postCommentsGet);
router.get(
  '/:postId/comments/:commentId/replies',
  commentController.commentRepliesGet,
);

export default router;
