const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Test data
const testUsers = [
  {
    email: 'alice@example.com',
    username: 'alice_wonder',
    password: 'password123',
    firstName: 'Alice',
    lastName: 'Wonder',
    bio: 'Software developer who loves React and Node.js'
  },
  {
    email: 'bob@example.com',
    username: 'bob_builder',
    password: 'password123',
    firstName: 'Bob',
    lastName: 'Builder',
    bio: 'Full-stack developer and coffee enthusiast ☕'
  },
  {
    email: 'charlie@example.com',
    username: 'charlie_code',
    password: 'password123',
    firstName: 'Charlie',
    lastName: 'Code',
    bio: 'DevOps engineer who automates everything'
  },
  {
    email: 'diana@example.com',
    username: 'diana_design',
    password: 'password123',
    firstName: 'Diana',
    lastName: 'Design',
    bio: 'UI/UX designer with a passion for user-centered design'
  },
  {
    email: 'eve@example.com',
    username: 'eve_explorer',
    password: 'password123',
    firstName: 'Eve',
    lastName: 'Explorer',
    bio: 'Data scientist exploring the world of AI and ML'
  }
];

const testGroups = [
  {
    name: 'Development Team',
    description: 'Main development team discussions and updates'
  },
  {
    name: 'Random Chat',
    description: 'Casual conversations and random topics'
  },
  {
    name: 'Project Alpha',
    description: 'Discussion about the Alpha project development'
  }
];

const sampleMessages = [
  "Hey everyone! How's everyone doing today?",
  "Just finished implementing the new feature. Ready for review!",
  "Anyone free for a quick code review?",
  "Great work on the last sprint! 🎉",
  "Coffee break anyone? ☕",
  "The new design looks amazing! Really love the color scheme.",
  "Can we schedule a meeting for tomorrow?",
  "Found an interesting article about React performance optimization.",
  "Weekend plans anyone?",
  "The deployment went smoothly! All systems green ✅",
  "Working on fixing that bug we discussed earlier.",
  "Thanks for the help with the API integration!",
  "Anyone familiar with PostgreSQL indexing?",
  "The client loved the demo! Great job team!",
  "Quick question about the authentication flow...",
  "Don't forget about the team lunch on Friday!",
  "Just pushed the latest changes to staging.",
  "The new feature is getting great user feedback!",
  "Let's discuss the architecture changes in the next meeting.",
  "Happy Friday everyone! 🎉"
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...');

    // Clear existing data first
    await prisma.message.deleteMany({});
    await prisma.groupMember.deleteMany({});
    await prisma.group.deleteMany({});
    await prisma.friendship.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];
    
    for (const userData of testUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword
        }
      });
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.username}`);
    }

    // Create friendships (make everyone friends with everyone)
    console.log('🤝 Creating friendships...');
    const friendships = [];
    
    for (let i = 0; i < createdUsers.length; i++) {
      for (let j = i + 1; j < createdUsers.length; j++) {
        const friendship = await prisma.friendship.create({
          data: {
            requesterId: createdUsers[i].id,
            addresseeId: createdUsers[j].id,
            status: 'ACCEPTED'
          }
        });
        friendships.push(friendship);
      }
    }
    console.log(`✅ Created ${friendships.length} friendships`);

    // Create groups
    console.log('👥 Creating groups...');
    const createdGroups = [];
    
    for (const groupData of testGroups) {
      const group = await prisma.group.create({
        data: groupData
      });
      createdGroups.push(group);
      console.log(`✅ Created group: ${group.name}`);
    }

    // Add users to groups
    console.log('👤 Adding users to groups...');
    
    // Add Alice as admin to all groups
    for (const group of createdGroups) {
      await prisma.groupMember.create({
        data: {
          userId: createdUsers[0].id, // Alice
          groupId: group.id,
          role: 'ADMIN'
        }
      });
    }

    // Add other users to groups as members
    // Development Team - Alice, Bob, Charlie
    await prisma.groupMember.createMany({
      data: [
        { userId: createdUsers[1].id, groupId: createdGroups[0].id, role: 'MEMBER' }, // Bob
        { userId: createdUsers[2].id, groupId: createdGroups[0].id, role: 'MEMBER' }  // Charlie
      ]
    });

    // Random Chat - Alice, Bob, Diana, Eve
    await prisma.groupMember.createMany({
      data: [
        { userId: createdUsers[1].id, groupId: createdGroups[1].id, role: 'MEMBER' }, // Bob
        { userId: createdUsers[3].id, groupId: createdGroups[1].id, role: 'MEMBER' }, // Diana
        { userId: createdUsers[4].id, groupId: createdGroups[1].id, role: 'MEMBER' }  // Eve
      ]
    });

    // Project Alpha - Alice, Charlie, Diana
    await prisma.groupMember.createMany({
      data: [
        { userId: createdUsers[2].id, groupId: createdGroups[2].id, role: 'MEMBER' }, // Charlie
        { userId: createdUsers[3].id, groupId: createdGroups[2].id, role: 'MEMBER' }  // Diana
      ]
    });

    console.log('✅ Added users to groups');

    // Create direct messages between friends
    console.log('💬 Creating direct messages...');
    
    // Alice and Bob conversation
    await prisma.message.createMany({
      data: [
        {
          content: "Hey Bob! How's the new project going?",
          authorId: createdUsers[0].id, // Alice
          recipientId: createdUsers[1].id // Bob
        },
        {
          content: "Going great! The React components are coming together nicely.",
          authorId: createdUsers[1].id, // Bob
          recipientId: createdUsers[0].id // Alice
        },
        {
          content: "That's awesome! Can't wait to see the demo.",
          authorId: createdUsers[0].id, // Alice
          recipientId: createdUsers[1].id // Bob
        }
      ]
    });

    // Charlie and Diana conversation
    await prisma.message.createMany({
      data: [
        {
          content: "Diana, I love the new UI mockups!",
          authorId: createdUsers[2].id, // Charlie
          recipientId: createdUsers[3].id // Diana
        },
        {
          content: "Thanks Charlie! I tried to make it more intuitive.",
          authorId: createdUsers[3].id, // Diana
          recipientId: createdUsers[2].id // Charlie
        },
        {
          content: "The color scheme really works well with our brand.",
          authorId: createdUsers[2].id, // Charlie
          recipientId: createdUsers[3].id // Diana
        }
      ]
    });

    // Create group messages
    console.log('📢 Creating group messages...');
    
    // Development Team messages
    const devTeamMessages = [
      { content: "Welcome to the Development Team chat!", authorId: createdUsers[0].id },
      { content: "Thanks Alice! Excited to work with everyone.", authorId: createdUsers[1].id },
      { content: "Let's build something amazing together! 🚀", authorId: createdUsers[2].id },
      { content: "Just pushed the latest updates to the repo.", authorId: createdUsers[1].id },
      { content: "Great! I'll review the PR later today.", authorId: createdUsers[0].id }
    ];

    for (const msg of devTeamMessages) {
      await prisma.message.create({
        data: {
          ...msg,
          groupId: createdGroups[0].id
        }
      });
    }

    // Random Chat messages
    const randomChatMessages = [
      { content: "Welcome to random chat! Feel free to discuss anything here.", authorId: createdUsers[0].id },
      { content: "Anyone tried the new coffee shop downtown?", authorId: createdUsers[1].id },
      { content: "Yes! Their espresso is incredible ☕", authorId: createdUsers[3].id },
      { content: "I should check it out this weekend!", authorId: createdUsers[4].id },
      { content: "We should all go together sometime!", authorId: createdUsers[0].id }
    ];

    for (const msg of randomChatMessages) {
      await prisma.message.create({
        data: {
          ...msg,
          groupId: createdGroups[1].id
        }
      });
    }

    // Project Alpha messages
    const projectAlphaMessages = [
      { content: "Project Alpha kick-off! Let's discuss the requirements.", authorId: createdUsers[0].id },
      { content: "I've prepared some initial wireframes for review.", authorId: createdUsers[3].id },
      { content: "Perfect! I'll set up the development environment.", authorId: createdUsers[2].id },
      { content: "Timeline looks good. Should we aim for beta in 2 weeks?", authorId: createdUsers[0].id },
      { content: "That works for me! I'll have the designs ready by then.", authorId: createdUsers[3].id }
    ];

    for (const msg of projectAlphaMessages) {
      await prisma.message.create({
        data: {
          ...msg,
          groupId: createdGroups[2].id
        }
      });
    }

    // Add some random additional messages for variety
    console.log('🎲 Adding random messages...');
    
    for (let i = 0; i < 10; i++) {
      const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const randomRecipient = createdUsers.filter(u => u.id !== randomUser.id)[Math.floor(Math.random() * (createdUsers.length - 1))];
      const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      
      await prisma.message.create({
        data: {
          content: randomMessage,
          authorId: randomUser.id,
          recipientId: randomRecipient.id
        }
      });
    }

    console.log('🎉 Database seeded successfully!');
    console.log('\n📊 Seed Summary:');
    console.log(`👥 Users: ${createdUsers.length}`);
    console.log(`🤝 Friendships: ${friendships.length}`);
    console.log(`👥 Groups: ${createdGroups.length}`);
    console.log('💬 Messages: Direct messages and group messages created');
    
    console.log('\n🔐 Test Login Credentials:');
    testUsers.forEach(user => {
      console.log(`📧 ${user.email} / 🔑 password123`);
    });

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('\n✨ Seed database script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seed database script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
