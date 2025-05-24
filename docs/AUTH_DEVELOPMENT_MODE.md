# Auth Module - Development Mode Configuration

## 🔧 Password Hashing - Development Mode

**Status**: ✅ Password hashing is **DISABLED** for development

### Current Configuration

All 3 Commands that handle passwords now have a development flag:

```typescript
// 🔧 DEVELOPMENT MODE: Set to true to enable password hashing in production
private readonly USE_PASSWORD_HASH = false
```

### Affected Commands

1. **AuthenticateUserCommand** (Login)
   - `USE_PASSWORD_HASH = false` → Plain text comparison
   - `USE_PASSWORD_HASH = true` → Hash verification

2. **RegisterUserCommand** (Registration)
   - `USE_PASSWORD_HASH = false` → Store plain text password
   - `USE_PASSWORD_HASH = true` → Hash before storing

3. **ResetPasswordCommand** (Password Reset)
   - `USE_PASSWORD_HASH = false` → Store plain text password
   - `USE_PASSWORD_HASH = true` → Hash before storing

### How It Works

#### Development Mode (Current)
```typescript
private readonly USE_PASSWORD_HASH = false

// Login - Plain text comparison
if (this.USE_PASSWORD_HASH) {
  isPasswordValid = await hash.verify(user.password, dto.password)
} else {
  isPasswordValid = user.password === dto.password // ✅ Fast dev iteration
}

// Register - No hashing
const password = this.USE_PASSWORD_HASH
  ? await this.hashPassword(dto.password)
  : dto.password // ✅ Plain text for dev
```

#### Production Mode (Future)
```typescript
private readonly USE_PASSWORD_HASH = true // 🔒 Enable hashing

// Login - Secure hash verification
isPasswordValid = await hash.verify(user.password, dto.password)

// Register - Secure hashing
const password = await this.hashPassword(dto.password)
```

---

## 🎯 When to Enable Password Hashing

### Before Production Deployment

**Step 1**: Change flag in all 3 files
```typescript
// In authenticate_user_command.ts
private readonly USE_PASSWORD_HASH = true

// In register_user_command.ts
private readonly USE_PASSWORD_HASH = true

// In reset_password_command.ts
private readonly USE_PASSWORD_HASH = true
```

**Step 2**: Migrate existing passwords (if any)
```sql
-- Hash all existing plain text passwords
-- (Run migration script to hash passwords in database)
```

**Step 3**: Test thoroughly
- Login with hashed passwords
- Register new users
- Password reset flow

---

## ⚠️ Important Notes

### Development Benefits
- ✅ **Faster iteration** - No hashing overhead
- ✅ **Easier debugging** - Can see actual passwords in DB
- ✅ **Simpler testing** - No need to hash test passwords

### Production Requirements
- 🔒 **MUST enable hashing** before production
- 🔒 **MUST migrate** existing passwords
- 🔒 **MUST test** all auth flows

### Security Warnings
- ⚠️ **DO NOT** use plain text passwords in production
- ⚠️ **DO NOT** commit sensitive data to git
- ⚠️ **DO NOT** share dev database dumps

---

## 📝 Code Locations

### Files to Change for Production

1. `app/actions/auth/commands/authenticate_user_command.ts` (Line ~28)
2. `app/actions/auth/commands/register_user_command.ts` (Line ~32)
3. `app/actions/auth/commands/reset_password_command.ts` (Line ~32)

**Search for**: `USE_PASSWORD_HASH = false`  
**Replace with**: `USE_PASSWORD_HASH = true`

---

## 🔄 Alternative: Environment Variable

**Future Enhancement**: Move to environment variable

```typescript
// config/auth.ts
export const authConfig = {
  usePasswordHash: env.get('USE_PASSWORD_HASH', 'true') === 'true'
}

// In Commands
import { authConfig } from '#config/auth'

private readonly USE_PASSWORD_HASH = authConfig.usePasswordHash
```

Then in `.env`:
```env
# Development
USE_PASSWORD_HASH=false

# Production
USE_PASSWORD_HASH=true
```

---

## ✅ Current Status

```
Development Mode:    ✅ ACTIVE
Password Hashing:    ❌ DISABLED
Plain Text Storage:  ✅ ENABLED

Production Mode:     ⏳ PENDING
Password Hashing:    ⏳ TO BE ENABLED
Secure Storage:      ⏳ TO BE ENABLED
```

---

**Last Updated**: 18/10/2025  
**Mode**: Development  
**Hash Status**: Disabled (for faster iteration)
