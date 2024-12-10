import { Router } from 'express';

import commentController from '../controllers/comment.js';

const router = Router();

router.get('/:commentId/replies', commentController.getCommentReplies);
router.post('/', commentController.createComment);

export default router;
