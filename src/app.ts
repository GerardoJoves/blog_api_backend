import express from 'express';

import postsRoute from './routes/posts.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/posts', postsRoute);

app.listen(PORT, () => console.log(`App running on port ${PORT}`));
