import { Router } from 'express';

import postController from '../controllers/post.js';

const router = Router();

router.get('/', postController.allPostsGet);

export default router;
