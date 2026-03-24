# Setup & Configuration Guide

## Environment Variables Setup

### Required Environment Variables

To run this project, you need to set the following environment variables:

```bash
# MongoDB Connection URI
MONGODB_URI=mongodb://localhost:27017/LLMessage
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/LLMessage

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-key-minimum-32-characters

# Node Environment
NODE_ENV=development

# Server Configuration
PORT=5000
CLIENT_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
```

### Setting Up Environment Variables

#### Option 1: Using .env file (Recommended for Development)

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` and fill in your actual values:
```bash
MONGODB_URI=mongodb://localhost:27017/LLMessage
JWT_SECRET=your-secure-random-secret-key-here
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxxxxxxxxxxxxxx.apps.googleusercontent.com
```

3. Install dotenv package:
```bash
npm install dotenv
```

4. Update app.js to load environment variables at the very top:
```javascript
// At the very beginning of app.js
require('dotenv').config();
```

#### Option 2: System Environment Variables (Production)

Set environment variables directly on your server/hosting platform:

**Docker Example**:
```dockerfile
ENV MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/LLMessage
ENV JWT_SECRET=your-production-secret
ENV NODE_ENV=production
ENV PORT=5000
ENV CLIENT_URL=https://yourdomain.com
ENV GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

**Linux/Mac**:
```bash
export MONGODB_URI="mongodb://localhost:27017/LLMessage"
export JWT_SECRET="your-secret-key"
export NODE_ENV="production"
```

**Windows (PowerShell)**:
```powershell
$env:MONGODB_URI="mongodb://localhost:27017/LLMessage"
$env:JWT_SECRET="your-secret-key"
$env:NODE_ENV="production"
```

### Updating Configuration System

1. The project now includes a new `config.js` module that handles environment variables
2. Controllers can use this configuration:

```javascript
// Instead of:
// var config = require(__dirname + "/Config/Setting.json");

// Use:
// var config = require(__dirname + "/config");
```

3. The new config system includes:
   - Environment variable support with fallbacks
   - Production environment validation
   - Security warnings for missing secrets

## Security Warnings

⚠️ **CRITICAL**: Never commit these files to version control:
- `.env` (in .gitignore ✓)
- `Config/Setting.json` (should not contain real secrets)
- Any files with passwords or API keys

## Development Setup

```bash
# 1. Install dependencies
npm install
npm install dotenv

# 2. Create .env file
cp .env.example .env

# 3. Edit .env with your local configuration
# nano .env

# 4. Install frontend dependencies
cd apps/views
npm install
cd ../..

# 5. Start development server
npm run dev

# 6. In another terminal, start frontend
npm run client

# 7. Or run both concurrently
npm run dev:all
```

## Production Deployment

1. Set all environment variables on your hosting platform
2. Do NOT use .env file in production
3. Verify configuration validation warnings are resolved
4. Test with: `NODE_ENV=production npm start`

## Troubleshooting

### "MongoDB connection failed"
- Check `MONGODB_URI` environment variable
- Ensure MongoDB server is running: `mongod`
- Verify connection string format

### "Invalid JWT token"
- Ensure `JWT_SECRET` is set
- Secret must be the same across server restarts
- Use a strong random string (min 32 characters)

### Google OAuth not working
- Verify `GOOGLE_CLIENT_ID` is correct
- Check that frontend is using same Client ID
- Ensure callback URLs are configured in Google Cloud Console

## Best Practices

1. **Use strong random secrets**:
   ```bash
   openssl rand -base64 32  # Generate secure random string
   ```

2. **Rotate secrets regularly** in production

3. **Use MongoDB Atlas** for production (managed cloud database)

4. **Enable HTTPS** in production

5. **Use environment-specific configs** for dev/staging/prod

