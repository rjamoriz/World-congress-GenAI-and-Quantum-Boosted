# Microsoft Outlook Integration Setup Guide
## World Congress Quantum-Powered Agenda Manager

### 🎯 **Overview**

This guide shows you how to integrate Microsoft Outlook with your World Congress system to:
- **Sync real calendar data** from host Outlook calendars
- **Import guest information** from Outlook contacts
- **Automatically create meetings** in Outlook after quantum optimization
- **Send professional invitations** via Outlook email

---

## 🔧 **Prerequisites**

1. **Microsoft 365 or Outlook.com account** with admin privileges
2. **Azure Active Directory** access (for app registration)
3. **World Congress system** running (frontend + backend)
4. **Node.js packages** installed (already done)

---

## 📋 **Step 1: Azure App Registration**

### **1.1 Create Azure App Registration**

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **"New registration"**
4. Fill in the details:
   ```
   Name: World Congress Outlook Integration
   Supported account types: Accounts in this organizational directory only
   Redirect URI: Web - http://localhost:3001/api/outlook/callback
   ```
5. Click **"Register"**

### **1.2 Configure API Permissions**

1. In your app registration, go to **API permissions**
2. Click **"Add a permission"**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   ```
   ✅ Calendars.ReadWrite    - Read and write user calendars
   ✅ Contacts.Read          - Read user contacts
   ✅ User.Read              - Read user profile
   ✅ Mail.Send              - Send mail as user
   ```
6. Click **"Grant admin consent"** (requires admin)

### **1.3 Create Client Secret**

1. Go to **Certificates & secrets**
2. Click **"New client secret"**
3. Add description: "World Congress Integration"
4. Set expiration: 24 months
5. Click **"Add"**
6. **Copy the secret value immediately** (you won't see it again!)

### **1.4 Get Application Details**

Copy these values from your app registration:
- **Application (client) ID** - from Overview page
- **Directory (tenant) ID** - from Overview page  
- **Client secret** - from step 1.3

---

## 🔑 **Step 2: Environment Configuration**

### **2.1 Update Backend Environment**

Add these variables to your backend `.env` file:

```bash
# Microsoft Outlook Integration
OUTLOOK_CLIENT_ID=your-application-client-id-here
OUTLOOK_CLIENT_SECRET=your-client-secret-here
OUTLOOK_TENANT_ID=your-directory-tenant-id-here
OUTLOOK_REDIRECT_URI=http://localhost:3001/api/outlook/callback

# Optional: Outlook Features
OUTLOOK_ENABLED=true
OUTLOOK_AUTO_SYNC=true
OUTLOOK_SYNC_INTERVAL=3600000
```

### **2.2 Restart Backend Server**

```bash
cd backend
npm run dev
```

---

## 🚀 **Step 3: Test Integration**

### **3.1 Check Integration Status**

```bash
curl http://localhost:3001/api/outlook/status
```

Expected response:
```json
{
  "success": true,
  "data": {
    "configured": true,
    "features": {
      "calendarSync": true,
      "contactSearch": true,
      "meetingCreation": true,
      "emailInvitations": true
    }
  }
}
```

### **3.2 Test Authentication**

```bash
curl http://localhost:3001/api/outlook/auth
```

This returns an authorization URL. Open it in your browser to test the OAuth flow.

---

## 💻 **Step 4: Frontend Integration**

### **4.1 Add Outlook Page**

Create a new page in your frontend:

```bash
# Create the page
touch frontend/src/app/outlook/page.tsx
```

Add this content:

```tsx
import OutlookIntegration from '@/components/OutlookIntegration';

export default function OutlookPage() {
  return (
    <div className="container mx-auto py-8">
      <OutlookIntegration />
    </div>
  );
}
```

### **4.2 Add Navigation Link**

Add to your main navigation:

```tsx
<Link href="/outlook" className="nav-link">
  <Mail className="h-4 w-4 mr-2" />
  Outlook Integration
</Link>
```

---

## 🔄 **Step 5: Usage Workflow**

### **5.1 Connect to Outlook**

1. Go to `http://localhost:3000/outlook`
2. Click **"Connect to Outlook"**
3. Sign in with your Microsoft account
4. Grant permissions to the app
5. You'll be redirected back with a success message

### **5.2 Sync Host Calendars**

```bash
# Sync all host calendars
curl -X POST http://localhost:3001/api/outlook/sync-all-hosts \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "your-access-token"}'
```

### **5.3 Search Contacts**

```bash
# Search for contacts
curl -X POST http://localhost:3001/api/outlook/search-contacts \
  -H "Content-Type: application/json" \
  -d '{"query": "TechCorp", "accessToken": "your-access-token"}'
```

### **5.4 Create Meetings**

After quantum scheduling completes, create Outlook meetings:

```bash
curl -X POST http://localhost:3001/api/outlook/create-meeting \
  -H "Content-Type: application/json" \
  -d '{"meetingId": "meeting-id", "accessToken": "your-access-token"}'
```

---

## 🎯 **Step 6: Integration Benefits**

### **Real Calendar Data**
- Hosts' actual availability from Outlook calendars
- No more manual availability input
- Real-time conflict detection

### **Guest Information**
- Import attendee details from Outlook contacts
- Company information and preferences
- Contact history and relationships

### **Automatic Meeting Creation**
- Calendar events created after quantum optimization
- Teams meeting links included
- Professional meeting invitations sent

### **Two-way Synchronization**
- Changes in Outlook reflect in your system
- System updates sync back to Outlook
- Consistent meeting management

---

## 🔧 **Step 7: Advanced Configuration**

### **7.1 Production Setup**

For production deployment:

```bash
# Update redirect URI in Azure
OUTLOOK_REDIRECT_URI=https://your-domain.com/api/outlook/callback

# Use secure token storage
# Implement proper session management
# Add token refresh logic
```

### **7.2 Webhook Integration**

Set up webhooks for real-time updates:

```bash
# Register webhook subscription
curl -X POST https://graph.microsoft.com/v1.0/subscriptions \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "changeType": "created,updated,deleted",
    "notificationUrl": "https://your-domain.com/api/outlook/webhook",
    "resource": "/me/calendar/events"
  }'
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"Not configured" error**
   - Check environment variables are set correctly
   - Restart backend server after adding variables

2. **"Authentication failed" error**
   - Verify Azure app registration settings
   - Check client secret hasn't expired
   - Ensure redirect URI matches exactly

3. **"Permission denied" error**
   - Grant admin consent in Azure portal
   - Check API permissions are correctly configured

4. **"Calendar sync failed" error**
   - Verify user has Outlook calendar access
   - Check access token is valid and not expired

### **Debug Mode**

Enable debug logging:

```bash
DEBUG=outlook:* npm run dev
```

---

## 📊 **Step 8: Monitoring & Analytics**

### **8.1 Integration Metrics**

Monitor these key metrics:
- Calendar sync success rate
- Meeting creation success rate
- Contact search performance
- Authentication failures

### **8.2 Phoenix Observability**

The Outlook integration is automatically monitored by Phoenix:
- API call tracing
- Performance metrics
- Error tracking
- Usage analytics

---

## 🎉 **Success!**

Your World Congress system is now integrated with Microsoft Outlook! 

### **What You've Achieved:**

✅ **Real-time calendar sync** from Outlook to quantum scheduler
✅ **Guest information import** from Outlook contacts  
✅ **Automatic meeting creation** in Outlook calendars
✅ **Professional email invitations** via Outlook
✅ **Enterprise-ready integration** with Microsoft 365

### **Next Steps:**

1. **Test with real data** - Connect actual host Outlook accounts
2. **Import guest contacts** - Search and import attendee information
3. **Run quantum optimization** - Let the system create optimized meetings
4. **Monitor performance** - Use Phoenix dashboard to track integration health

Your quantum-powered World Congress system is now enterprise-ready with full Microsoft Outlook integration! 🚀
