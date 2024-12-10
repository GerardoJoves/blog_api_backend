import { Router } from 'express';

import postController from '../controllers/post.js';
import commentController from '../controllers/comment.js';

const router = Router();

router.get('/', postController.getPosts);
router.post('/', postController.createPost);
router.get('/:postId', postController.getPost);
router.get('/:postId/comments', commentController.getPostComments);

export default router;
