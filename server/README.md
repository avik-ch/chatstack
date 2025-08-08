# ChatStack Backend API

A comprehensive instant messaging backend built with Node.js, Express, Socket.IO, and PostgreSQL.

## Features

- **Authentication & Authorization**: JWT-based authentication with bcrypt password hashing
- **User Management**: User registration, profiles, and friend system
- **Real-time Messaging**: Socket.IO powered instant messaging
- **Group Chats**: Create and manage group conversations
- **Image Sharing**: Upload and share images in chats using Cloudinary
- **User Search**: Search and discover other users
- **Friendship System**: Send, accept, and manage friend requests
- **Online Status**: Real-time user presence indicators
- **Message Management**: Edit and delete messages with proper permissions


## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chatstack/server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the server directory:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/chatstack_db"
   
   # JWT
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   
   # Server
   PORT=8080
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login user | No |
| GET | `/profile` | Get current user profile | Yes |
| PUT | `/profile` | Update user profile | Yes |
| PUT | `/change-password` | Change user password | Yes |
| POST | `/logout` | Logout user | Yes |

### Users (`/api/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/search?query=...` | Search users | Yes |
| GET | `/:userId` | Get user by ID | Yes |
| POST | `/friend-request` | Send friend request | Yes |
| PUT | `/friend-request/:friendshipId` | Respond to friend request | Yes |
| GET | `/friends/list` | Get friends list | Yes |
| GET | `/friends/pending` | Get pending friend requests | Yes |

### Groups (`/api/groups`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create new group | Yes |
| GET | `/` | Get user's groups | Yes |
| GET | `/:groupId` | Get group details | Yes |
| PUT | `/:groupId` | Update group | Yes |
| POST | `/:groupId/members` | Add member to group | Yes |
| DELETE | `/:groupId/members/:userId` | Remove member from group | Yes |
| DELETE | `/:groupId/leave` | Leave group | Yes |

### Messages (`/api/messages`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/groups/:groupId` | Send message to group | Yes |
| GET | `/groups/:groupId` | Get group messages | Yes |
| PUT | `/:messageId` | Edit message | Yes |
| DELETE | `/:messageId` | Delete message | Yes |
| GET | `/recent/all` | Get recent messages | Yes |

## Socket.IO Events

### Client to Server

| Event | Data | Description |
|-------|------|-------------|
| `join-group` | `{ groupId }` | Join a specific group |
| `leave-group` | `{ groupId }` | Leave a group |
| `typing-start` | `{ groupId }` | Start typing indicator |
| `typing-stop` | `{ groupId }` | Stop typing indicator |
| `send-message` | `{ groupId, content, imageUrl? }` | Send a new message |
| `edit-message` | `{ messageId, content }` | Edit a message |
| `delete-message` | `{ messageId }` | Delete a message |

### Server to Client

| Event | Data | Description |
|-------|------|-------------|
| `joined-group` | `{ groupId }` | Confirmation of joining group |
| `left-group` | `{ groupId }` | Confirmation of leaving group |
| `user-typing` | `{ groupId, user }` | User started typing |
| `user-stop-typing` | `{ groupId, userId }` | User stopped typing |
| `new-message` | `{ groupId, message }` | New message received |
| `message-sent` | `{ groupId, message }` | Confirmation of sent message |
| `message-edited` | `{ groupId, message }` | Message was edited |
| `message-deleted` | `{ groupId, messageId }` | Message was deleted |
| `friend-status-change` | `{ userId, isOnline }` | Friend's online status changed |
| `error` | `{ message }` | Error occurred |

## Database Schema

### Users
- `id`: Unique identifier
- `email`: Email address (unique)
- `username`: Username (unique)
- `password`: Hashed password with per-user salt
- `salt`: Unique salt for password hashing
- `firstName`, `lastName`: User names
- `avatar`: Profile picture URL
- `bio`: User bio
- `isOnline`: Online status
- `lastSeen`: Last seen timestamp

### Groups
- `id`: Unique identifier
- `name`: Group name
- `description`: Group description
- `avatar`: Group picture URL
- `creatorId`: Group creator

### Messages
- `id`: Unique identifier
- `content`: Message text
- `imageUrl`: Image URL (optional)
- `senderId`: Message sender
- `groupId`: Target group
- `createdAt`, `updatedAt`: Timestamps

### GroupMembers
- `userId`: User ID
- `groupId`: Group ID
- `role`: ADMIN, MODERATOR, or MEMBER
- `joinedAt`: Join timestamp

### Friendships
- `requesterId`: Friend request sender
- `recipientId`: Friend request recipient
- `status`: PENDING, ACCEPTED, REJECTED, or BLOCKED

## Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "username",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Create a group
```bash
curl -X POST http://localhost:8080/api/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My Group",
    "description": "A test group",
    "memberIds": ["user_id_1", "user_id_2"]
  }'
```

### Send a message
```bash
curl -X POST http://localhost:8080/api/messages/groups/GROUP_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "content": "Hello, everyone!"
  }'
```

### Change password
```bash
curl -X PUT http://localhost:8080/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "currentPassword": "oldpassword123",
    "newPassword": "newpassword456"
  }'
```




## Security Features

- **JWT token authentication** with configurable expiration
- **Per-user salt password hashing** with bcrypt (prevents rainbow table attacks)
- **Unique salt generation** using crypto.randomBytes for each user
- **CORS configuration** with origin restrictions
- **Input validation and sanitization**
- **File upload restrictions** (image types, size limits)
- **SQL injection prevention** (Prisma ORM)
- **Rate limiting** (can be added)
- **Environment variable protection** for sensitive data

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong JWT secret
3. Configure proper CORS origins
4. Set up SSL/TLS certificates
5. Use environment variables for sensitive data
6. Set up proper logging and monitoring
7. Configure database connection pooling
8. Set up backup strategies

