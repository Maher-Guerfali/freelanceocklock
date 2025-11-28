# Supabase Data Sync Implementation

## ✅ What's Been Implemented

### Database Tables
Three tables have been set up in Supabase:
1. **work_sessions** - Stores all work tracking sessions
2. **user_settings** - Stores user preferences (hourly rate, name, email, theme)
3. **todos** - Stores user todo list items

### Automatic Sync Features

#### When User Logs In:
- ✅ Automatically loads all work sessions from Supabase
- ✅ Loads user settings (hourly rate, name, email, theme)
- ✅ Loads todo list from Supabase
- ✅ Shows success message with data count

#### While Logged In:
- ✅ Every new work session is automatically saved to Supabase
- ✅ All changes to settings sync to cloud immediately
- ✅ Todo list changes sync in real-time
- ✅ Data also backed up to localStorage

#### When Not Logged In:
- ✅ All data saved to localStorage (browser cache)
- ✅ Works completely offline
- ✅ Data persists in browser

### Data That Gets Synced

**Work Sessions:**
- Session ID
- Start time
- End time
- Duration
- Earnings
- Hourly rate at time of session

**User Settings:**
- Hourly rate
- User name
- User email
- Theme preference (light/dark)

**Todo List:**
- Todo text
- Completion status
- Todo ID

## 🔧 Setup Instructions

### 1. Create Supabase Tables
Run the SQL script in your Supabase dashboard:
```bash
# File: setup_supabase_tables.sql
```

Go to your Supabase project → SQL Editor → paste the contents of `setup_supabase_tables.sql` → Run

### 2. Configure Environment Variables
Make sure your `.env` file has:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Enable Email Authentication
In Supabase Dashboard:
- Go to Authentication → Providers
- Enable Email provider
- Configure email templates if needed

## 📱 How It Works for Users

### Scenario 1: New User
1. User signs up with email/password
2. Empty account created
3. As they work, data syncs to cloud
4. Can access from any device after login

### Scenario 2: Existing User (Login)
1. User logs in
2. All previous data loads from cloud
3. Continues working, new data syncs
4. Data persists across sessions

### Scenario 3: Guest User (No Login)
1. User uses app without signing in
2. Data saved to browser localStorage
3. Works offline completely
4. Data lost if browser cache cleared

### Scenario 4: Switching Devices
1. User logs in on new device
2. All work sessions appear
3. All todos load
4. Settings restored (rate, theme, etc)

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Policies prevent cross-user data access
- Authentication required for cloud sync

## 🚀 Benefits

✅ **Cross-device sync** - Work from anywhere
✅ **Data backup** - Never lose your work
✅ **Offline mode** - Works without login
✅ **Real-time sync** - Changes save automatically
✅ **Secure** - Your data is private

## 📊 What Gets Synced When

| Action | Synced Immediately |
|--------|-------------------|
| Start/Stop Timer | ✅ Work session |
| Add/Complete Todo | ✅ Todo list |
| Change Hourly Rate | ✅ Settings |
| Change Theme | ✅ Settings |
| Update Name/Email | ✅ Settings |
| Delete Session | ✅ Work sessions |

## 🔄 Sync Flow

```
User Action → State Update → localStorage (backup) → Supabase (if logged in)
                                                    ↓
User Login → Supabase Load → State Update → localStorage (backup)
```

## 💡 Tips

- Login to enable cloud sync across devices
- Data is also backed up to localStorage
- Works offline when not logged in
- Sign up to never lose your data
