import { Router } from 'express';

import commentController from '../controllers/comment.js';

const router = Router();

router.post('/', commentController.createComment);
router.get('/:commentId/replies', commentController.getCommentReplies);
router.delete('/:commentId', commentController.deleteComment);

export default router;
