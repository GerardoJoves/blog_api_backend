import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const images = [
  'https://images.unsplash.com/photo-1505820013142-f86a3439c5b2?q=80&w=2942&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1719937206642-ca0cd57198cc?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=1472&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
];

const generateMockBlogPost = (authorId: number) => {
  const post = {
    authorId,
    published: true,
    featuredImageUrl: images[Math.floor(Math.random() * 4)],
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(4),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };

  return post;
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

  for (let i = 0; i < 10; i++) {
    await prisma.post.create({ data: generateMockBlogPost(author.id) });
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
