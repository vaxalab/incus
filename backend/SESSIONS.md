# Session Management Lifecycle

This document explains how sessions work in our system with Redis storage and database analytics tracking.

## 🔄 **Session Data Flow**

### **Two-Layer Session Storage:**

1. **Redis (Primary)**: Actual session data for authentication
2. **Database (Analytics)**: Session metadata for tracking and analytics

## 📊 **Session Lifecycle Scenarios**

### **1. User Login/Registration**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Login    │    │  Redis Session  │    │ Database Record │
│                 │    │                 │    │                 │
│ ✓ Credentials   │───▶│ ✓ sessionID     │───▶│ ✓ sid          │
│ ✓ Role-based    │    │ ✓ userId        │    │ ✓ userId       │
│   expiration    │    │ ✓ Expires in:   │    │ ✓ ipAddress    │
│                 │    │   • 30d (CUST)  │    │ ✓ userAgent    │
│                 │    │   • 14d (ADMIN) │    │ ✓ browser      │
│                 │    │                 │    │ ✓ device       │
│                 │    │                 │    │ ✓ expiresAt    │
│                 │    │                 │    │ ✓ isActive     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**What happens:**

- ✅ Redis session created with role-based TTL
- ✅ Database session record created for analytics
- ✅ Session cookie sent to browser

### **2. User Activity (Rolling Sessions)**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Request   │    │  Redis Session  │    │ Database Record │
│                 │    │                 │    │                 │
│ ✓ Valid cookie  │───▶│ ✓ TTL extended  │───▶│ ✓ lastActivity  │
│ ✓ Authenticated │    │   (rolling)     │    │   updated       │
│                 │    │ ✓ maxAge reset  │    │ ✓ updatedAt     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**What happens:**

- ✅ Redis extends session TTL (rolling behavior)
- ✅ Database `lastActivity` timestamp updated
- ✅ Session remains active

### **3. User Logout**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Logout    │    │  Redis Session  │    │ Database Record │
│                 │    │                 │    │                 │
│ ✓ POST /logout  │───▶│ ✓ Session       │───▶│ ✓ isActive=false│
│                 │    │   destroyed     │    │ ✓ logoutAt      │
│                 │    │ ✗ Data deleted  │    │ ✓ updatedAt     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**What happens:**

- ✅ Database session marked as `isActive: false`
- ✅ Database `logoutAt` timestamp set
- ✅ Redis session destroyed (data deleted)
- ✅ Session cookie invalidated

### **4. Session Expiration (Time-based)**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Time Passes     │    │  Redis Session  │    │ Database Record │
│                 │    │                 │    │                 │
│ ✓ 30 days (CUST)│───▶│ ✗ TTL expired   │───▶│ ✓ isActive=false│
│ ✓ 14 days (ADMIN│    │ ✗ Auto-deleted  │    │   (via cleanup) │
│                 │    │                 │    │ ✓ Preserved for │
│                 │    │                 │    │   analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**What happens:**

- ✅ Redis automatically deletes expired session
- ✅ Database session remains for analytics
- ✅ Cleanup job marks expired sessions as inactive
- ✅ User must re-authenticate

## 🧹 **Cleanup Process**

### **Background Cleanup Job:**

```typescript
// Runs periodically to clean up expired sessions
SessionTrackingUtil.cleanupExpiredSessions(databaseService);
```

**What it does:**

- Finds database sessions where `expiresAt < now()` and `isActive = true`
- Marks them as `isActive: false`
- Preserves data for analytics and reporting

## 📈 **Analytics Benefits**

### **What We Track:**

- **Login Patterns**: When users log in most
- **Session Duration**: How long users stay active
- **Device Analytics**: Mobile vs Desktop usage
- **Browser Analytics**: Chrome, Safari, Firefox usage
- **Geographic Data**: IP-based location (optional)
- **Security Monitoring**: Multiple active sessions, unusual login patterns

### **Admin Dashboard Queries:**

```sql
-- Active sessions by role
SELECT role, COUNT(*) FROM sessions s
JOIN users u ON s.userId = u.id
WHERE s.isActive = true;

-- Average session duration
SELECT AVG(EXTRACT(EPOCH FROM (logoutAt - loginAt))/3600) as avg_hours
FROM sessions WHERE logoutAt IS NOT NULL;

-- Device breakdown
SELECT device, COUNT(*) FROM sessions GROUP BY device;
```

## 🔒 **Security Features**

### **Session Security:**

- ✅ HTTPOnly cookies (prevent XSS)
- ✅ Secure cookies in production (HTTPS only)
- ✅ SameSite protection (CSRF prevention)
- ✅ Role-based expiration times
- ✅ Rolling expiration (extends on activity)

### **Monitoring:**

- ✅ Track IP addresses for suspicious activity
- ✅ Monitor multiple concurrent sessions
- ✅ User agent analysis for bot detection
- ✅ Geographic anomaly detection (optional)

## 🚀 **Performance Considerations**

### **Why This Architecture:**

- **Redis**: Fast session lookups (< 1ms)
- **Database**: Rich analytics without affecting auth performance
- **Async Tracking**: Session tracking doesn't block requests
- **Error Handling**: Failed tracking won't break authentication

### **Scaling:**

- Redis handles millions of concurrent sessions
- Database analytics queries can be optimized with indexes
- Session cleanup can be scheduled during low-traffic periods
- Can add Redis clustering for high availability

## 🛠 **Implementation Notes**

### **Current Implementation:**

- ✅ Role-based session expiration (30d customers, 14d admins)
- ✅ Session metadata extraction (IP, User-Agent, Device, Browser)
- ✅ Database tracking with proper error handling
- ✅ Logout tracking with session invalidation
- ✅ Cleanup utilities for expired sessions

### **Future Enhancements:**

- 🔄 IP geolocation for country detection
- 🔄 Suspicious activity alerts
- 🔄 Admin dashboard for session management
- 🔄 Session analytics reports
- 🔄 Force logout capabilities for admin users
