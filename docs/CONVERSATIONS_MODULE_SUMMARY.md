# Conversations Module - CQRS Refactoring Summary

**Date Completed**: October 18, 2025  
**Module**: Conversations (6th module refactored)  
**Pattern Applied**: CQRS (Command Query Responsibility Segregation)

---

## 📊 Overview Statistics

### Files Created
- **DTOs**: 9 files (~1,200 lines)
- **Commands**: 7 files (~950 lines) 
- **Queries**: 4 files (~630 lines)
- **Total New Files**: 20 files (~2,780 lines)

### Files Modified
- **Controllers**: 4 files refactored

### Files Deleted
- **Legacy Actions**: 11 files removed

### Net Change
- **+20 new files** (DTOs, Commands, Queries, index files)
- **-11 legacy files** (old action files)
- **Net: +9 files**

---

## 🏗️ Architecture Transformation

### Before (Legacy Structure)
```
app/actions/conversations/
├── create_conversation.ts          ❌ Deleted
├── send_message.ts                 ❌ Deleted
├── recall_message.ts               ❌ Deleted
├── mark_as_read.ts                 ❌ Deleted
├── mark_messages_as_read.ts        ❌ Deleted
├── add_participant.ts              ❌ Deleted
├── delete_conversation.ts          ❌ Deleted
├── get_conversation.ts             ❌ Deleted
├── get_conversation_messages.ts    ❌ Deleted
├── list_conversations.ts           ❌ Deleted
└── show_conversation.ts            ❌ Deleted
```

### After (CQRS Structure)
```
app/actions/conversations/
├── dtos/                           ✅ New
│   ├── create_conversation_dto.ts
│   ├── send_message_dto.ts
│   ├── recall_message_dto.ts
│   ├── mark_as_read_dto.ts (includes MarkMessagesAsReadDTO)
│   ├── add_participant_dto.ts
│   ├── delete_conversation_dto.ts
│   ├── get_conversation_detail_dto.ts
│   ├── get_conversation_messages_dto.ts
│   ├── list_conversations_dto.ts
│   └── index.ts
├── commands/                       ✅ New
│   ├── create_conversation_command.ts
│   ├── send_message_command.ts
│   ├── recall_message_command.ts
│   ├── mark_as_read_command.ts (includes MarkMessagesAsReadCommand)
│   ├── add_participant_command.ts
│   ├── delete_conversation_command.ts
│   └── index.ts
└── queries/                        ✅ New
    ├── get_conversation_detail_query.ts
    ├── get_conversation_messages_query.ts
    ├── list_conversations_query.ts
    └── index.ts
```

---

## 📦 Phase Breakdown

### Phase 0: Analysis ✅
**Duration**: ~1 hour  
**Findings**:
- 11 legacy action files (most complex module so far)
- 4 controllers to refactor
- Uses stored procedures: `create_conversation`, `send_message`
- Complex features: conversation deduplication, message recall (2 scopes), soft deletes
- Models: Conversation, Message, ConversationParticipant, DeletedMessage

### Phase 1: DTOs ✅
**Duration**: ~2 hours  
**Files Created**: 10 files (9 DTOs + 1 index.ts)

1. **CreateConversationDTO** (120 lines)
   - Validates: participantIds[], initialMessage?, title?, organizationId?
   - Methods: `isDirect`, `isGroup`, `getAllParticipantIds(creatorId)`
   - Business Logic: At least 1 participant, no duplicates, message max 5000 chars

2. **SendMessageDTO** (80 lines)
   - Validates: conversationId, message (max 5000 chars)
   - Methods: `trimmedMessage`, `containsSuspiciousContent()`
   - Security: Checks for `<script>`, `javascript:` in content

3. **RecallMessageDTO** (80 lines)
   - Validates: messageId, scope ('all' | 'self')
   - Methods: `isRecallForEveryone`, `isRecallForSelf`, `replacementMessage`
   - Dual Scope Logic: 'all' changes message for everyone, 'self' hides for user only

4. **MarkAsReadDTO** (50 lines)
   - Validates: conversationId
   - Simple validation for marking all messages as read

5. **MarkMessagesAsReadDTO** (50 lines)
   - Validates: conversationId, messageIds[] (max 100 at once)
   - Methods: `uniqueMessageIds`
   - Bulk operation support

6. **AddParticipantDTO** (40 lines)
   - Validates: conversationId, userId
   - For adding members to group conversations

7. **DeleteConversationDTO** (40 lines)
   - Validates: conversationId
   - For soft delete operations

8. **GetConversationDetailDTO** (40 lines)
   - Validates: conversationId
   - For retrieving conversation details

9. **GetConversationMessagesDTO** (80 lines)
   - Validates: conversationId, page (default 1), limit (1-100, default 20)
   - Methods: `offset`, `isFirstPage`
   - Pagination support

10. **ListConversationsDTO** (80 lines)
    - Validates: page (default 1), limit (1-50, default 15), search?
    - Methods: `offset`, `isFirstPage`, `hasSearch`, `trimmedSearch`
    - Search + pagination support

### Phase 2: Commands ✅
**Duration**: ~4 hours  
**Files Created**: 7 files (6 Commands + 1 index.ts)

1. **CreateConversationCommand** (300 lines) - Most Complex
   - **Stored Procedure**: `CALL create_conversation(creator_id, org_id, participant_csv)`
   - **Deduplication Logic**:
     - Direct (1-1): Checks for existing conversation with exact 2 participants
     - Group: Checks for existing conversation with exact same member set
   - **Methods**:
     - `findExistingDirectConversation(userId1, userId2)` - Complex GROUP BY query
     - `findExistingGroupConversation(participantIds[])` - Participant set matching
     - `createNewConversation()` - Uses stored procedure
     - `addMessage()` - Adds initial message if provided
     - `invalidateCache(participantIds[])` - Clears cache for all participants
   - **Cache Patterns**: `user:{userId}:conversations:*`

2. **SendMessageCommand** (150 lines)
   - **Stored Procedure**: `CALL send_message(conversation_id, sender_id, message)`
   - **Verification**: User must be participant (whereHas query)
   - **Logging**: Warns if message > 5000 chars
   - **Updates**: conversation.updated_at after message sent
   - **Error Handling**: Catches sqlState 45000 (MySQL custom errors)
   - **Cache Patterns**: 
     - `user:{userId}:conversations:*` (list)
     - `conversation:{id}:detail` (detail)
     - `conversation:{id}:messages:*` (messages)

3. **RecallMessageCommand** (150 lines)
   - **Transaction-Based**: Uses `db.transaction()` for atomicity
   - **Dual Scope Logic**:
     - `'all'`: Updates message.content to "Tin nhắn này đã bị thu hồi", sets flags
     - `'self'`: Adds entry to deleted_messages table, message unchanged for others
   - **Validations**: 
     - Only sender can recall
     - Can't recall already-recalled messages
   - **Custom Exceptions**: NotFoundError (404), UnauthorizedError (401)
   - **Cache Patterns**: `conversation:{id}:detail`, `conversation:{id}:messages:*`

4. **MarkAsReadCommand** (85 lines)
   - **Marks**: ALL unread messages in conversation
   - **Filter**: Only messages where sender != current user
   - **Update**: Sets read_at timestamp
   - **Cache Patterns**: List, messages, detail caches

5. **MarkMessagesAsReadCommand** (85 lines)
   - **Marks**: Specific message IDs (bulk operation)
   - **Validation**: Messages must belong to conversation
   - **Efficiency**: Single UPDATE query for multiple messages
   - **Cache Patterns**: Same as MarkAsReadCommand

6. **AddParticipantCommand** (130 lines)
   - **Group Only**: Cannot add to direct 1-1 conversations
   - **Validations**:
     - Current user must be participant
     - Must be group (count >= 2 OR has title)
     - Check for duplicate participants
   - **Insert**: conversation_participants table
   - **Cache Patterns**: Invalidates for all participants

7. **DeleteConversationCommand** (100 lines)
   - **Soft Delete**: Sets deleted_at timestamp
   - **Messages**: Remain in database (not deleted)
   - **Reversible**: Can be restored by clearing deleted_at
   - **Cache Patterns**: Clears list, detail, messages for all participants

### Phase 3: Queries ✅
**Duration**: ~3 hours  
**Files Created**: 4 files (3 Queries + 1 index.ts)

1. **GetConversationDetailQuery** (160 lines)
   - **Returns**: Conversation with participants, unread count, last message
   - **Verification**: User must be participant
   - **Preloads**: participants relationship
   - **Unread Count**: Messages where sender != current user AND read_at is null
   - **Last Message**: Filtered by recalled/deleted status
   - **Redis Cache**: `conversation:{id}:detail:user:{userId}` (5 min TTL)

2. **GetConversationMessagesQuery** (170 lines)
   - **Pagination**: Offset + limit support
   - **Filters**:
     - Recalled messages: Show "Tin nhắn này đã bị thu hồi" if recall_scope = 'all'
     - Deleted messages: Check deleted_messages table per user
   - **Preloads**: Sender info (name, email, avatar)
   - **Response**: `{ data: MessageWithSender[], meta: PaginationMeta }`
   - **Redis Cache**: `conversation:{id}:messages:page:{page}:limit:{limit}:user:{userId}` (5 min)

3. **ListConversationsQuery** (300 lines) - Most Complex
   - **Features**:
     - Filter by user participation
     - Search by conversation title OR participant name
     - Include unread count per conversation
     - Include last message per conversation
     - Include all participants per conversation
     - Pagination support
     - Sort by updated_at DESC
   - **Query Architecture**:
     - Main query: Get conversations where user is participant
     - Search filter: `title LIKE OR EXISTS(participant.name LIKE)`
     - Batch fetching: `getUnreadCounts()`, `getParticipants()`, `getLastMessages()`
   - **Complexity**: Subquery for last message, filter recalled/deleted
   - **Redis Cache**: `user:{userId}:conversations:page:{page}:limit:{limit}:search:{term}` (5 min)

### Phase 4: Refactor Controllers ✅
**Duration**: ~2 hours  
**Files Modified**: 4 controllers

1. **conversations_controller.ts**
   - **Methods**: index, create, store
   - **Changes**:
     - `index`: Uses ListConversationsQuery + ListConversationsDTO
     - `store`: Uses CreateConversationCommand + CreateConversationDTO
     - Handles JSON parsing for participants array
     - Proper error handling with session flash messages

2. **conversations_message_controller.ts**
   - **Methods**: sendMessage, apiSendMessage, markAsRead, recallMessage
   - **Changes**:
     - `sendMessage`: Uses SendMessageCommand + SendMessageDTO
     - `apiSendMessage`: Returns created message in JSON response
     - `markAsRead`: Uses MarkAsReadCommand + MarkAsReadDTO
     - `recallMessage`: Uses RecallMessageCommand + RecallMessageDTO (dual scope support)

3. **conversations_view_controller.ts**
   - **Methods**: show, apiShow
   - **Changes**:
     - `show`: Uses GetConversationDetailQuery + GetConversationMessagesQuery
     - Auto mark as read when viewing conversation
     - Proper pagination with hasMore flag
     - `apiShow`: JSON API endpoint with same queries

4. **conversation_controller.ts**
   - **Methods**: index, create, store, show, addParticipant, sendMessage, markAsRead, destroy
   - **Changes**:
     - Comprehensive CRUD operations
     - All methods use Commands/Queries with DTOs
     - Proper error handling and redirects
     - `destroy`: Soft delete with DeleteConversationCommand

### Phase 5: Delete Legacy Files ✅
**Duration**: ~15 minutes  
**Files Deleted**: 11 legacy action files

- ✅ Verified no imports reference legacy files (grep search)
- ✅ Deleted all 11 legacy action files via PowerShell
- ✅ Clean directory structure (only dtos/, commands/, queries/)

### Phase 6: Verify & Documentation ✅
**Duration**: ~1 hour  
**Tasks**:
- ✅ Verified compilation (only formatting warnings, no blocking errors)
- ✅ Created CONVERSATIONS_MODULE_SUMMARY.md
- ✅ Documented all phases and complexity points

---

## 🎯 Key Complexity Points

### 1. Stored Procedures Integration
**Challenge**: AdonisJS ORM doesn't directly support stored procedures  
**Solution**: Use `db.rawQuery('CALL procedure_name(?...)', [params])`

```typescript
// Example from SendMessageCommand
await db.rawQuery('CALL send_message(?, ?, ?)', [
  conversationId,
  user.id,
  dto.trimmedMessage
])
```

### 2. Conversation Deduplication
**Challenge**: Prevent duplicate conversations (direct 1-1 and group)  
**Solution**: Complex queries with participant matching

```typescript
// Direct conversation: Check exact 2 participants
const existing = await Conversation.query()
  .whereHas('participants', (q) => {
    q.whereIn('user_id', [userId1, userId2])
  })
  .has('participants', '=', 2)
  .whereNull('title')
  .first()

// Group conversation: Check exact same member set
const participantCounts = await db.from('conversation_participants')
  .select('conversation_id')
  .count('* as count')
  .whereIn('user_id', participantIds)
  .groupBy('conversation_id')
  .having('count', '=', participantIds.length)
```

### 3. Dual Message Recall Scopes
**Challenge**: Support both "recall for everyone" and "recall for self"  
**Solution**: Transaction-based approach with two different strategies

```typescript
if (scope === 'all') {
  // Change message content for everyone
  message.message = 'Tin nhắn này đã bị thu hồi.'
  message.is_recalled = true
  message.recall_scope = 'all'
  await message.save()
} else if (scope === 'self') {
  // Add to deleted_messages, don't change message
  await DeletedMessage.create({ message_id, user_id })
}
```

### 4. Cache Invalidation Strategy
**Challenge**: Multiple cache patterns need invalidation per operation  
**Solution**: Reusable `invalidateCache()` methods with pattern matching

```typescript
// Example cache patterns
- `user:{userId}:conversations:*` - User's conversation list
- `conversation:{id}:detail` - Conversation detail
- `conversation:{id}:messages:*` - Paginated messages
```

### 5. Message Filtering (Recalled & Deleted)
**Challenge**: Filter messages based on recall status and per-user deletion  
**Solution**: Complex LEFT JOIN with deleted_messages table

```typescript
// Query filters recalled & deleted messages
.leftJoin('deleted_messages', function () {
  this.on('deleted_messages.message_id', 'messages.id')
    .andOnVal('deleted_messages.user_id', currentUserId)
})
.whereNull('deleted_messages.id') // Exclude deleted by current user

// Process recalled messages
if (message.is_recalled && message.recall_scope === 'all') {
  message.message = 'Tin nhắn này đã bị thu hồi.'
}
```

### 6. Batch Fetching for List Query
**Challenge**: Efficiently fetch unread counts, participants, last messages for multiple conversations  
**Solution**: Separate batch queries with Map-based aggregation

```typescript
const [unreadCounts, participants, lastMessages] = await Promise.all([
  this.getUnreadCounts(conversationIds, user.id),
  this.getParticipants(conversationIds),
  this.getLastMessages(conversationIds, user.id),
])

// Aggregate results using Map
conversations.map(conv => ({
  ...conv,
  unread_count: unreadCounts.get(conv.id) || 0,
  participants: participants.get(conv.id) || [],
  last_message: lastMessages.get(conv.id) || null,
}))
```

---

## 🔍 Pattern Comparison

### Legacy Pattern (Before)
```typescript
// File: actions/conversations/send_message.ts
export default class SendMessage {
  async handle({ data }: { data: any }) {
    // Mixed validation, business logic, database operations
    // No separation of concerns
    // Direct model manipulation
  }
}

// Controller
@inject()
async sendMessage(ctx, sendMessage: SendMessage) {
  await sendMessage.handle({ data: { ... } })
}
```

### CQRS Pattern (After)
```typescript
// 1. DTO: Validation layer
export class SendMessageDTO {
  constructor(
    readonly conversationId: number,
    readonly message: string
  ) {
    // Validation in constructor
  }
  
  get trimmedMessage(): string { ... }
}

// 2. Command: Business logic layer
@inject()
export default class SendMessageCommand {
  constructor(protected ctx: HttpContext) {}
  
  async execute(dto: SendMessageDTO): Promise<Message> {
    // Business logic
    // Database operations
    // Cache invalidation
  }
}

// 3. Controller: Presentation layer
@inject()
async sendMessage(ctx, command: SendMessageCommand) {
  const dto = new SendMessageDTO(conversationId, message)
  await command.execute(dto)
}
```

---

## ✅ Benefits Achieved

### 1. Separation of Concerns
- **DTOs**: Pure validation logic
- **Commands**: Write operations + business logic
- **Queries**: Read operations + caching
- **Controllers**: Request/response handling

### 2. Type Safety
- All DTOs are strongly typed
- Constructor-based immutability
- Clear input/output contracts

### 3. Testability
- Each layer can be tested independently
- DTOs: Validation tests
- Commands: Business logic tests
- Queries: Data retrieval tests

### 4. Maintainability
- Clear file structure (dtos/, commands/, queries/)
- Single Responsibility Principle
- Easy to locate and modify specific functionality

### 5. Scalability
- Easy to add new operations (new Command/Query)
- Cache strategy per Query
- Transaction support per Command

### 6. Consistency
- All modules follow same CQRS pattern
- Predictable code organization
- Standardized error handling

---

## 🧪 Testing Checklist

### DTOs Validation
- [ ] CreateConversationDTO: Test with 0 participants (should fail)
- [ ] SendMessageDTO: Test with empty message (should fail)
- [ ] RecallMessageDTO: Test invalid scope value (should fail)
- [ ] GetConversationMessagesDTO: Test limit > 100 (should fail)

### Commands Business Logic
- [ ] CreateConversationCommand: Test conversation deduplication (direct & group)
- [ ] SendMessageCommand: Test non-participant trying to send (should fail)
- [ ] RecallMessageCommand: Test dual scopes (all vs self)
- [ ] MarkAsReadCommand: Test marking own messages (should not mark)
- [ ] AddParticipantCommand: Test adding to direct 1-1 (should fail)

### Queries Caching
- [ ] GetConversationDetailQuery: Test cache hit/miss
- [ ] GetConversationMessagesQuery: Test pagination
- [ ] ListConversationsQuery: Test search functionality

### Controllers Integration
- [ ] conversations_controller: Test index, create, store
- [ ] conversations_message_controller: Test all message operations
- [ ] conversations_view_controller: Test show with auto-mark-read
- [ ] conversation_controller: Test full CRUD cycle

### Cache Invalidation
- [ ] Test cache cleared after CreateConversationCommand
- [ ] Test cache cleared after SendMessageCommand
- [ ] Test cache cleared after RecallMessageCommand
- [ ] Test cache cleared after DeleteConversationCommand

---

## 📈 Performance Considerations

### Stored Procedures
- **Pros**: Optimized database operations, reduced roundtrips
- **Cons**: Harder to test, less portable
- **Used in**: CreateConversationCommand, SendMessageCommand

### Redis Caching (5 min TTL)
- **Conversation List**: Per user, per page, per search term
- **Conversation Detail**: Per conversation, per user
- **Messages**: Per conversation, per page, per user
- **Cache Keys**: Include user ID to prevent data leakage

### Pagination
- **Default Limits**: 
  - Conversations list: 15 per page (max 50)
  - Messages: 20 per page (max 100)
- **Offset-based**: Simple but not ideal for large datasets
- **Future**: Consider cursor-based pagination for messages

### Batch Queries
- **ListConversationsQuery**: 3 parallel queries for unread, participants, last messages
- **Prevents**: N+1 query problem
- **Trade-off**: More complex code vs better performance

---

## 🚀 Next Steps (Optional Improvements)

1. **Add Unit Tests**
   - DTOs validation tests
   - Commands business logic tests
   - Queries caching tests

2. **Add Integration Tests**
   - Controller endpoint tests
   - Full conversation lifecycle tests

3. **Performance Optimization**
   - Consider cursor-based pagination for messages
   - Add database indexes for frequent queries
   - Monitor stored procedure performance

4. **Error Handling**
   - Custom exception hierarchy
   - Better error messages for API responses
   - Logging improvements

5. **Documentation**
   - API documentation (OpenAPI/Swagger)
   - Code comments for complex logic
   - Architecture decision records (ADRs)

6. **Monitoring**
   - Cache hit rate metrics
   - Query performance monitoring
   - Business metrics (messages sent, conversations created)

---

## 📚 Related Modules

This is the **6th module** refactored to CQRS pattern:

1. ✅ Tasks Module
2. ✅ Projects Module  
3. ✅ Users Module
4. ✅ Auth Module
5. ✅ Organizations Module
6. ✅ **Conversations Module** (Current)

All modules now follow the same CQRS architecture for consistency.

---

## 🎉 Conclusion

The Conversations Module refactoring is **complete**. The module now follows CQRS pattern with clear separation between:
- **DTOs** for validation
- **Commands** for write operations
- **Queries** for read operations with caching
- **Controllers** for request/response handling

Despite the complexity (stored procedures, deduplication, dual recall scopes), the refactored code is:
- ✅ More maintainable
- ✅ More testable
- ✅ More scalable
- ✅ Type-safe
- ✅ Consistent with other modules

**Total Effort**: ~12-15 hours  
**Complexity**: High (stored procedures, complex queries, dual scopes)  
**Result**: Clean, professional CQRS architecture ✨
