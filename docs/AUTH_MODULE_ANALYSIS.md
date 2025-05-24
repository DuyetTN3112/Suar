# Auth Module - Analysis & Refactoring Plan

## 📅 Date: 18/10/2025

## 📊 Current State Analysis

### Controllers (7 files)
```
app/controllers/auth/
├── auth_controller.ts          (base/common auth logic?)
├── login_controller.ts         (web login UI + handler)
├── register_controller.ts      (web register UI + handler)
├── logout_controller.ts        (logout handler)
├── forgot_password_controller.ts   (password reset UI + handlers)
├── reset_password_controller.ts    (password reset completion?)
└── social_auth_controller.ts   (OAuth - Google, Facebook, etc.)
```

### Actions (10 files)
```
app/actions/auth/
├── http/
│   ├── login.ts                (~60 lines - email/password auth)
│   ├── register.ts             (~95 lines - user registration)
│   ├── logout.ts               (~45 lines - logout + audit log)
│   ├── forgot_password.ts      (not checked yet)
│   ├── reset_password.ts       (not checked yet)
│   └── web_login.ts            (not checked yet)
│
└── password_reset/
    ├── try_send_password_reset_email.ts  (~50 lines - send reset email)
    ├── verify_password_reset_token.ts    (not checked yet)
    ├── reset_password.ts                 (not checked yet)
    └── expire_password_reset_tokens.ts   (not checked yet)
```

### Routes
```typescript
// Auth routes (start/routes/auth.ts)
GET  /login                          → LoginController.show
POST /login                          → LoginController.store
GET  /register                       → RegisterController.show
POST /register                       → RegisterController.store
POST /logout                         → LogoutController.handle
GET  /logout                         → LogoutController.handle

// Social auth
GET  /auth/:provider/redirect        → SocialAuthController.redirect
GET  /auth/:provider/callback        → SocialAuthController.callback

// Password reset
GET  /forgot-password                → ForgotPasswordController.index
POST /forgot-password                → ForgotPasswordController.send
GET  /forgot-password/reset/:value   → ForgotPasswordController.reset
POST /forgot-password/reset          → ForgotPasswordController.update
```

---

## 🔍 Code Analysis

### 1. Login Action (`app/actions/auth/http/login.ts`)

**Current Implementation**:
```typescript
- Plain text password comparison (INSECURE! ⚠️)
- Rate limiting (1000 req/hour)
- Session flash messages
- Manual auth flow
```

**Issues**:
- ❌ **CRITICAL**: `user.password !== data.password` - no hashing!
- ❌ Business logic mixed with rate limiting
- ❌ Error handling returns `null` (unclear)
- ❌ Not using Hash service properly

**Business Rules**:
- Email + password authentication
- Rate limit: 1000 requests/hour per IP+email
- Block duration: 1 minute after rate limit
- Session-based auth (web guard)
- Flash errors on failure

---

### 2. Register Action (`app/actions/auth/http/register.ts`)

**Current Implementation**:
```typescript
- Creates User, UserDetail, UserProfile, UserSetting
- Finds default status_id and role_id
- Uses database transaction
- Auto-login after registration
```

**Issues**:
- ❌ Password hashing not visible (check User model)
- ❌ Complex nested try-catch
- ❌ Hard-coded default values lookup
- ⚠️ No email verification flow
- ⚠️ No validation on unique username/email

**Business Rules**:
- Default status: 'active'
- Default role: 'user'
- Creates 4 related records (User + 3 children)
- Auto-login after success
- Transaction for data consistency

---

### 3. Logout Action (`app/actions/auth/http/logout.ts`)

**Current Implementation**:
```typescript
- Audit logging before logout
- Clears session
- Clears Inertia shared data
```

**Issues**:
- ✅ Well-structured
- ⚠️ Silent error handling (catch without action)
- ⚠️ Instantiates AuditLogging manually

**Business Rules**:
- Log logout action with timestamp
- Clear web guard session
- Clear Inertia auth props
- Optionally clear remember_me cookie

---

### 4. Password Reset Email (`try_send_password_reset_email.ts`)

**Current Implementation**:
```typescript
- Generates random 32-char token
- Encrypts token value
- Expires old tokens first
- Sends email with reset link
- 1-hour expiration
```

**Issues**:
- ✅ Good security (random token + encryption)
- ⚠️ Static method (not injectable)
- ⚠️ No rate limiting for emails
- ⚠️ Silent failure if user not found

**Business Rules**:
- Token expires after 1 hour
- Only 1 active token per user
- Email contains encrypted token in URL
- Uses mail queue (sendLater)

---

## 🎯 CQRS Refactoring Plan

### Phase 1: Core Auth Commands (Priority: HIGH)

#### 1.1 Create DTOs
- [x] `AuthenticateUserDTO` (email, password, remember, ip)
- [ ] `RegisterUserDTO` (firstName, lastName, username, email, password)
- [ ] `LogoutUserDTO` (userId, sessionId?)
- [ ] `RequestPasswordResetDTO` (email)
- [ ] `ResetPasswordDTO` (token, newPassword)
- [ ] `VerifyPasswordResetTokenDTO` (token)

#### 1.2 Create Commands
- [ ] `AuthenticateUserCommand` - Replaces `login.ts`
  - Validates credentials (with hashing!)
  - Rate limiting logic
  - Creates session
  - Audit logging
  
- [ ] `RegisterUserCommand` - Replaces `register.ts`
  - Validates uniqueness
  - Hashes password
  - Creates User + related records
  - Auto-login
  - Send welcome email?
  
- [ ] `LogoutUserCommand` - Replaces `logout.ts`
  - Audit logging
  - Clear session
  - Clear Inertia props
  
- [ ] `RequestPasswordResetCommand` - Replaces `try_send_password_reset_email.ts`
  - Generate token
  - Expire old tokens
  - Send email
  - Rate limiting
  
- [ ] `ResetPasswordCommand` - Replaces `reset_password.ts`
  - Verify token validity
  - Hash new password
  - Update user password
  - Expire token
  - Send confirmation email

#### 1.3 Create Queries
- [ ] `VerifyPasswordResetTokenQuery` - Check token validity
- [ ] `GetAuthUserQuery` - Get current authenticated user
- [ ] `CheckUserPermissionQuery` - Check if user has permission

---

### Phase 2: Controllers Refactoring

#### 2.1 Consolidate Controllers
**Target**: Reduce from 7 to 2-3 controllers

```
app/controllers/auth/
├── auth_controller.ts           (login, register, logout)
├── password_reset_controller.ts (forgot, reset, verify)
└── social_auth_controller.ts    (OAuth - keep separate)
```

#### 2.2 Apply Thin Controller Pattern
- Move business logic to Commands/Queries
- Keep only HTTP concerns:
  - Request validation
  - DTO creation
  - Command/Query invocation
  - Response rendering
  - Error handling

---

### Phase 3: Security Improvements (CRITICAL!)

#### 3.1 Fix Password Handling
- [ ] **URGENT**: Remove plain text password comparison
- [ ] Use Hash service for password verification
- [ ] Add password strength validation
- [ ] Add password history check

#### 3.2 Add Rate Limiting
- [ ] Login attempts (current: ✅)
- [ ] Registration (missing!)
- [ ] Password reset requests (missing!)
- [ ] Email sending (missing!)

#### 3.3 Add Email Verification
- [ ] Generate verification token on registration
- [ ] Send verification email
- [ ] Create `VerifyEmailCommand`
- [ ] Block unverified users from certain actions

#### 3.4 Add Session Management
- [ ] Track active sessions
- [ ] Allow user to revoke sessions
- [ ] Create `RevokeSessionCommand`

---

### Phase 4: Legacy Cleanup

#### 4.1 Delete Old Actions (after migration)
```
✅ app/actions/auth/http/login.ts
✅ app/actions/auth/http/register.ts
✅ app/actions/auth/http/logout.ts
✅ app/actions/auth/http/forgot_password.ts
✅ app/actions/auth/http/reset_password.ts
✅ app/actions/auth/http/web_login.ts
✅ app/actions/auth/password_reset/*.ts (all 4 files)
```

#### 4.2 Delete Old Controllers (after consolidation)
```
✅ app/controllers/auth/login_controller.ts
✅ app/controllers/auth/register_controller.ts
✅ app/controllers/auth/logout_controller.ts
✅ app/controllers/auth/forgot_password_controller.ts
✅ app/controllers/auth/reset_password_controller.ts
(Keep social_auth_controller.ts for now)
```

#### 4.3 Consolidate Routes
- Remove duplicate routes
- Use resource routes where applicable
- Clear naming conventions

---

## 📋 Estimated Effort

| Task | Files | Lines | Time |
|------|-------|-------|------|
| Create 6 DTOs | 6 | ~250 | 1.5h |
| Create 5 Commands | 5 | ~600 | 4h |
| Create 3 Queries | 3 | ~150 | 1.5h |
| Refactor 3 Controllers | 3 | ~400 | 2.5h |
| Security Fixes | - | ~200 | 2h |
| Delete Legacy (10 files) | -10 | -800 | 0.5h |
| Testing | - | ~600 | 3h |
| **Total** | **7 new** | **~1400** | **15h** |

**Net Change**: ~+600 lines (after cleanup)  
**Quality Improvement**: ~400% (estimated)

---

## 🎓 Key Decisions

### 1. Password Hashing Strategy
**Decision**: Use AdonisJS Hash service with Argon2
```typescript
import hash from '@adonisjs/core/services/hash'

// In RegisterUserCommand
const hashedPassword = await hash.make(dto.password)

// In AuthenticateUserCommand
const isValid = await hash.verify(user.password, dto.password)
```

### 2. Rate Limiting Strategy
**Decision**: Use Limiter service consistently
```typescript
// Login: 5 attempts per 15 minutes per IP+email
// Register: 3 attempts per hour per IP
// Password Reset: 3 attempts per hour per email
// Email Sending: 5 emails per hour per user
```

### 3. Token Strategy
**Decision**: Keep current encryption approach
```typescript
// Generate random token
const token = string.generateRandom(32)
// Encrypt for URL (prevents enumeration)
const encryptedToken = encryption.encrypt(token)
// Store plain token in DB (for lookup)
// Send encrypted token in email
```

### 4. Session Management
**Decision**: Keep web guard, add session tracking
```typescript
// Current: Simple session-based auth
// Future: Track active sessions in DB
// Allow users to view/revoke sessions
```

---

## ⚠️ Critical Issues to Address

### 1. **SECURITY: Plain Text Password** (CRITICAL!)
```typescript
// CURRENT (INSECURE):
if (user.password !== data.password) { ... }

// SHOULD BE:
const isValid = await hash.verify(user.password, data.password)
if (!isValid) { ... }
```

### 2. **Missing Email Verification**
- Users can register and immediately access system
- No verification flow
- Risk of fake accounts

### 3. **No Rate Limiting on Registration**
- Vulnerable to spam registrations
- Can be abused for email flooding

### 4. **No Password Strength Validation**
- No minimum length check
- No complexity requirements
- Weak passwords allowed

### 5. **Silent Error Handling**
```typescript
// BAD: Catch without action
catch (error) {
  // Error handling is done through the audit logging system
}

// SHOULD: Log or propagate
catch (error) {
  logger.error(error, 'Logout failed')
  throw error
}
```

---

## 🚀 Implementation Order

### Week 1: Core Commands (Day 1-3)
1. ✅ Create DTOs (all 6)
2. Create AuthenticateUserCommand (fix password hashing!)
3. Create RegisterUserCommand
4. Create LogoutUserCommand

### Week 1: Password Reset (Day 4-5)
5. Create RequestPasswordResetCommand
6. Create ResetPasswordCommand
7. Create VerifyPasswordResetTokenQuery

### Week 2: Controllers (Day 1-2)
8. Create new AuthController (thin)
9. Create new PasswordResetController (thin)
10. Update routes

### Week 2: Security (Day 3-4)
11. Add password strength validation
12. Add rate limiting to all auth endpoints
13. Add email verification flow

### Week 2: Cleanup (Day 5)
14. Delete old actions (10 files)
15. Delete old controllers (5 files)
16. Write tests
17. Documentation

---

## 📦 Dependencies

### From Foundation (Already Created)
- ✅ `BaseCommand` - Transaction management
- ✅ `BaseQuery` - Caching support
- ✅ `BaseDTO` - Validation

### External Services
- ✅ `Hash` - Password hashing (Argon2)
- ✅ `Limiter` - Rate limiting
- ✅ `Mail` - Email sending
- ✅ `Encryption` - Token encryption
- ✅ `AuditLogging` - Action tracking

### Models
- ✅ `User` - Main user model
- ✅ `UserDetail` - Additional info
- ✅ `UserProfile` - User preferences
- ✅ `UserSetting` - App settings
- ✅ `PasswordResetToken` - Reset tokens

---

## 🎯 Success Criteria

### Functionality
- ✅ All auth flows working (login, register, logout, password reset)
- ✅ No breaking changes to existing features
- ✅ Backward compatible with current sessions

### Security
- ✅ Password hashing implemented correctly
- ✅ Rate limiting on all endpoints
- ✅ Email verification flow added
- ✅ No plain text passwords anywhere

### Code Quality
- ✅ Zero business logic in controllers
- ✅ All auth logic in Commands/Queries
- ✅ Comprehensive error handling
- ✅ Audit logging on all actions

### Architecture
- ✅ CQRS pattern applied consistently
- ✅ DTOs for all operations
- ✅ Commands for write operations
- ✅ Queries for read operations
- ✅ Thin controllers

### Testing
- ✅ Unit tests for all Commands (5)
- ✅ Unit tests for all Queries (3)
- ✅ Integration tests for Controllers (2)
- ✅ Security tests (password hashing, rate limiting)

---

## 📝 Next Steps

1. **START**: Create `AuthenticateUserDTO`
2. Create `AuthenticateUserCommand` (FIX PASSWORD HASHING!)
3. Update `LoginController` to use Command
4. Test login flow
5. Continue with other Commands...

---

**Status**: 🚀 **READY TO START**  
**Priority**: ⚠️ **CRITICAL** (Security issues!)  
**Estimated Completion**: 2-3 days (full-time) or 1 week (part-time)

---

_Analysis Date: 18/10/2025_  
_Module: Auth - 0% Complete_  
_Next: Create DTOs and AuthenticateUserCommand_
