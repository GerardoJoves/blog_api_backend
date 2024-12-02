import { Router } from 'express';

import postController from '../controllers/post.js';

const router = Router();

router.get('/', postController.allPostsGet);
router.get('/:id', postController.postGet);

export default router;
