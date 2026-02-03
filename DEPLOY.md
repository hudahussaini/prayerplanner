# Deploying to Vercel with Postgres

## Step 1: Deploy to Vercel

```bash
# Install Vercel CLI (if you haven't already)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from your project directory
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **N**
- Project name? (press enter for default or type a name)
- Directory? **/** (press enter)
- Override settings? **N**

## Step 2: Add Vercel Postgres

After first deployment:

1. Go to your project dashboard on vercel.com
2. Click on the **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose a database name (e.g., "scheduler-db")
6. Select a region close to you
7. Click **Create**

## Step 3: Connect Database to Project

1. After creating the database, Vercel will show you connection details
2. Click **Connect Project**
3. Select your scheduler project
4. Vercel will automatically add the `POSTGRES_URL` environment variable

## Step 4: Redeploy

```bash
# Trigger a redeploy to use the new database
vercel --prod
```

That's it! Your app now has persistent storage across all devices.

## Testing

Visit your Vercel URL and create some tasks. They'll persist even after the serverless function goes cold!

## Local Development

Your app still uses SQLite locally. To test with Postgres locally, copy the `POSTGRES_URL` from Vercel and set it as an environment variable:

```bash
export POSTGRES_URL="your-postgres-url-here"
python app.py
```
