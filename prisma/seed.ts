import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const generateMockBlogPost = (authorId: number) => {
  const post = {
    authorId,
    published: true,
    featuredImageUrl: faker.image.urlPicsumPhotos(),
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(4),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };

  return post;
};

const generateMockComment = (
  authorId: number,
  postId: number,
  parentCommentId?: number,
) => {
  const comment = {
    authorId,
    postId,
    parentCommentId,
    content: faker.lorem.paragraphs(1),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };

  return comment;
};

const main = async () => {
  console.log('seeding...');
  const author = await prisma.user.upsert({
    where: { username: 'John_Doe' },
    create: {
      username: 'John_Doe',
      passwordHash: '123',
    },
    update: {},
  });

  for (let i = 0; i < 4; i++) {
    // Generate 4 posts
    const post = await prisma.post.create({
      data: generateMockBlogPost(author.id),
    });

    for (let i = 0; i < 10; i++) {
      // Generate 10 comments to post
      const comment = await prisma.comment.create({
        data: generateMockComment(author.id, post.id),
      });

      for (let i = 0; i < 10; i++) {
        // Generate 10 repies
        const reply = await prisma.comment.create({
          data: generateMockComment(author.id, post.id, comment.id),
        });
      }
    }
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
