import express from 'express';

import './config/passport.js';

import postsRouter from './routes/posts.js';
import usersRouter from './routes/users.js';
import commentsRouter from './routes/comments.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/users', usersRouter);
app.use('/posts', postsRouter);
app.use('/comments', commentsRouter);

app.listen(PORT, () => console.log(`App running on port ${PORT}`));
