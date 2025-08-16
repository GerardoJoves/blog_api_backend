import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const generateMockBlogPost = (
  authorId: number,
  title?: string,
  createdAt?: Date,
) => {
  const post = {
    authorId,
    published: true,
    title: title ?? faker.lorem.sentence(),
    content: faker.lorem.paragraphs(5, '\n\n'),
    createdAt: createdAt ?? faker.date.past(),
    updatedAt: faker.date.recent(),
  };

  return post;
};

const generateMockComment = (
  authorId: number,
  postId: number,
  parentCommentId?: number,
  targetUserId?: number,
) => {
  const comment = {
    authorId,
    postId,
    parentCommentId,
    targetUserId,
    content: faker.lorem.paragraphs(1),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };

  return comment;
};

const main = async () => {
  console.log('seeding...');

  const author = await prisma.user.upsert({
    where: { username: 'john_doe' },
    create: {
      username: 'john_doe',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash('password123', 10),
    },
    update: {},
  });

  const user = await prisma.user.upsert({
    where: { username: 'david_smith' },
    create: {
      username: 'david_smith',
      role: 'USER',
      passwordHash: await bcrypt.hash('password123', 10),
    },
    update: {},
  });

  const post = await prisma.post.create({
    data: generateMockBlogPost(
      author.id,
      'Mock blog post with populated comment section',
      new Date(),
    ),
  });

  for (let i = 0; i < 15; i++) {
    // Generate post comments
    const comment = await prisma.comment.create({
      data: generateMockComment(user.id, post.id),
    });

    for (let i = 0; i < 15; i++) {
      // Generate replies per comment
      const parentComment = comment;
      if (i % 2 === 0) {
        // Author replies to user comment
        await prisma.comment.create({
          data: generateMockComment(
            author.id,
            post.id,
            parentComment.id,
            user.id,
          ),
        });
      } else {
        // User replies to author reply
        await prisma.comment.create({
          data: generateMockComment(
            user.id,
            post.id,
            parentComment.id,
            author.id,
          ),
        });
      }
    }
  }

  for (let i = 0; i < 20; i++) {
    // Generate 30 aditional posts for pagination
    const post = await prisma.post.create({
      data: generateMockBlogPost(author.id),
    });
  }
};

main()
  .then(async () => {
    console.log('done');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
