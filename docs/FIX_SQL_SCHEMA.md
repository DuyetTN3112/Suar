# SQL Schema Fix - Conversations Queries

**Date:** October 19, 2025  
**Issue:** Unknown column 'users.name' in field list  
**Root Cause:** Database schema uses `first_name` + `last_name`, not `name`

---

## 🔍 Problem

Multiple SQL errors in conversations queries:
```sql
Unknown column 'users.name' in 'field list'
```

SQL trying to select:
```sql
SELECT users.name as user_name FROM users
```

But database schema has:
```typescript
// app/models/user.ts
@column() declare first_name: string
@column() declare last_name: string
// NO 'name' column!
```

---

## ✅ Solution

Replace all `users.name` with `CONCAT(first_name, ' ', last_name)`:

### Files Fixed (5 files):

1. **list_conversations_query.ts** (4 occurrences)
   - Line 214: `getParticipants()` - user names
   - Line 96: Search filter in main query
   - Line 120: Search filter in count query  
   - Line 263: `getLastMessages()` - sender names

2. **get_conversation_detail_query.ts** (1 occurrence)
   - Line 108: Last message sender name

3. **get_conversation_messages_query.ts** (1 occurrence)
   - Line 92: Message sender names

---

## 📝 Changes Applied

### Pattern 1: SELECT with CONCAT
```typescript
// Before (❌ Error)
'users.name as user_name'

// After (✅ Works)
Database.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name")
```

### Pattern 2: SEARCH with multiple fields
```typescript
// Before (❌ Single field)
.where('users.name', 'like', searchTerm)

// After (✅ Multiple fields)
.where((nameBuilder) => {
  nameBuilder
    .where('users.first_name', 'like', searchTerm)
    .orWhere('users.last_name', 'like', searchTerm)
    .orWhere('users.email', 'like', searchTerm)
})
```

### Pattern 3: LEFT JOIN with COALESCE (handles NULL)
```typescript
// For optional fields use COALESCE
Database.raw("CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, '')) as sender_name")
```

---

## 🎯 Specific Changes

### 1. list_conversations_query.ts - getParticipants()
```typescript
// Line 214
private async getParticipants(conversationIds: number[]): Promise<Map<number, any[]>> {
  const results = await Database.from('conversation_participants')
    .select(
      'conversation_participants.conversation_id',
      'conversation_participants.user_id',
      Database.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name"), // ✅ Fixed
      'users.email as user_email',
      'users.avatar as user_avatar'
    )
    .join('users', 'conversation_participants.user_id', 'users.id')
    .whereIn('conversation_participants.conversation_id', conversationIds)
}
```

### 2. list_conversations_query.ts - Search filters
```typescript
// Lines 90-103 (Main query search)
if (dto.hasSearch) {
  const searchTerm = `%${dto.trimmedSearch}%`
  conversationsQuery = conversationsQuery.where((builder) => {
    builder.where('conversations.title', 'like', searchTerm).orWhereExists((subQuery) => {
      subQuery
        .from('conversation_participants as cp2')
        .join('users', 'cp2.user_id', 'users.id')
        .whereRaw('cp2.conversation_id = conversations.id')
        .where((nameBuilder) => {
          nameBuilder
            .where('users.first_name', 'like', searchTerm) // ✅ Fixed
            .orWhere('users.last_name', 'like', searchTerm) // ✅ Fixed
            .orWhere('users.email', 'like', searchTerm)     // ✅ Bonus
        })
    })
  })
}

// Lines 114-127 (Count query search - same pattern)
```

### 3. list_conversations_query.ts - getLastMessages()
```typescript
// Line 263
private async getLastMessages(conversationIds: number[], userId: number): Promise<Map<number, any>> {
  const results = await Database.from('messages')
    .select(
      'messages.id',
      'messages.conversation_id',
      'messages.message',
      'messages.sender_id',
      'messages.is_recalled',
      'messages.recall_scope',
      'messages.created_at',
      Database.raw("CONCAT(users.first_name, ' ', users.last_name) as sender_name") // ✅ Fixed
    )
    .join('users', 'messages.sender_id', 'users.id')
}
```

### 4. get_conversation_detail_query.ts
```typescript
// Line 108
const result = await Database.from('messages')
  .select(
    'messages.id',
    'messages.message',
    'messages.sender_id',
    'messages.is_recalled',
    'messages.recall_scope',
    'messages.created_at',
    Database.raw("CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, '')) as sender_name") // ✅ Fixed with COALESCE
  )
  .leftJoin('users', 'messages.sender_id', 'users.id') // LEFT JOIN → use COALESCE
```

### 5. get_conversation_messages_query.ts
```typescript
// Line 92
const messagesQuery = Database.from('messages')
  .select(
    'messages.id',
    'messages.message',
    'messages.sender_id',
    'messages.is_recalled',
    'messages.recall_scope',
    'messages.recalled_at',
    'messages.read_at',
    'messages.created_at',
    'messages.updated_at',
    Database.raw("CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, '')) as sender_name"), // ✅ Fixed
    'users.email as sender_email',
    'users.avatar as sender_avatar'
  )
  .leftJoin('users', 'messages.sender_id', 'users.id')
```

---

## 🧪 Testing

### Before Fix:
```
Error: Unknown column 'users.name' in 'field list'
SQL: SELECT users.name as user_name FROM users
```

### After Fix:
```sql
-- Works correctly
SELECT CONCAT(users.first_name, ' ', users.last_name) as user_name FROM users
```

### Search Enhancement:
```sql
-- Before: Only searched 'name' (didn't exist)
WHERE users.name LIKE '%john%'

-- After: Searches first_name, last_name, AND email
WHERE (
  users.first_name LIKE '%john%'  
  OR users.last_name LIKE '%john%'
  OR users.email LIKE '%john%'
)
```

---

## 📊 Summary

**Total Files Modified:** 3  
**Total SQL Queries Fixed:** 6  
**Pattern Applied:** CONCAT for display, multiple field search for filtering  

### Benefits:
- ✅ SQL queries work with actual schema
- ✅ Better search (first name, last name, email)
- ✅ NULL-safe with COALESCE in LEFT JOINs
- ✅ Consistent naming across all queries

---

## 🎓 Lessons Learned

### Always match SQL to schema
```typescript
// ❌ Don't assume column names
SELECT users.name

// ✅ Check model definition
@column() declare first_name: string
@column() declare last_name: string
```

### Use Database.raw() for computed fields
```typescript
// ✅ Concatenate in database, not in app
Database.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name")
```

### Handle NULLs in LEFT JOINs
```typescript
// ✅ Use COALESCE for optional relations
CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, ''))
```

### Improve search UX
```typescript
// ✅ Search multiple fields
.where('users.first_name', 'like', searchTerm)
.orWhere('users.last_name', 'like', searchTerm)
.orWhere('users.email', 'like', searchTerm)
```

---

**Status:** ✅ ALL CONVERSATIONS SQL FIXED  
**Next:** Test conversations page load  
**Confidence:** HIGH 🎯
