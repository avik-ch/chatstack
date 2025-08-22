# Database Scripts

This directory contains utility scripts for managing the ChatStack database.

## Available Scripts

### 🗑️ Clear Database
```bash
npm run db:clear
```
Removes all data from the database while keeping the table structure intact.

### 🌱 Seed Database
```bash
npm run db:seed
```
Populates the database with test data including:
- 5 test users (all friends with each other)
- 3 groups with different member configurations
- Sample direct messages between users
- Sample group messages in each group

### 🔄 Reset Database
```bash
npm run db:reset
```
Combines clear + seed operations. Completely resets the database to a fresh state with test data.

## Test User Accounts

After running the seed script, you can log in with any of these accounts:

| Email | Password | Name | Username |
|-------|----------|------|----------|
| alice@example.com | password123 | Alice Wonder | alice_wonder |
| bob@example.com | password123 | Bob Builder | bob_builder |
| charlie@example.com | password123 | Charlie Code | charlie_code |
| diana@example.com | password123 | Diana Design | diana_design |
| eve@example.com | password123 | Eve Explorer | eve_explorer |

**Note**: Each user account is created with a unique random salt for enhanced security. The passwords are hashed using bcrypt with the user's individual salt.

## Test Data Structure

### Groups Created:
1. **Development Team** - Alice (admin), Bob, Charlie
2. **Random Chat** - Alice (admin), Bob, Diana, Eve  
3. **Project Alpha** - Alice (admin), Charlie, Diana

### Friendships:
- All users are friends with each other (10 total friendships)
- All friend requests are pre-accepted

### Messages:
- Direct message conversations between various users
- Group messages in each of the 3 groups
- Random additional messages for realistic data volume

## Security Features

### Salt Implementation
- Each user account is created with a unique random salt
- Salt length varies between 16-64 characters for additional security
- Passwords are hashed using bcrypt with the user's individual salt
- This prevents rainbow table attacks and enhances overall security

## Usage Tips

- Use `db:reset` when you want to start fresh with consistent test data
- Use `db:clear` when you want to remove data but populate manually
- Use `db:seed` when you have an empty database and want test data

## Files

- `clear-db.js` - Clears all database tables
- `seed-db.js` - Populates database with test data
- `reset-db.js` - Combines clear and seed operations
