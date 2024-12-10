import { Router } from 'express';

import postController from '../controllers/post.js';
import commentController from '../controllers/comment.js';

const router = Router();

router.get('/', postController.getPosts);
router.get('/:postId', postController.getPost);
router.get('/:postId/comments', commentController.getPostComments);
router.get(
  '/:postId/comments/:commentId/replies',
  commentController.getCommentReplies,
);

export default router;
