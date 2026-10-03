# Git Commit Instructions

## Option 1: Run the PowerShell Script

1. Open PowerShell in the project directory
2. Run: `.\commit-to-github.ps1`
3. Enter your GitHub credentials when prompted

## Option 2: Manual Commands

Run these commands in PowerShell from the project directory:

```powershell
# Navigate to project
cd "C:\Users\vivga\OneDrive\AI\AI Projects\Children's Book 2"

# Initialize git (if not already done)
git init

# Add remote
git remote add origin https://github.com/vivmuk/Childrensbook2.git

# Add all files
git add .

# Commit
git commit -m "Initial commit: KinderQuill children's book generator with Venice AI integration"

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

## Option 3: Using GitHub Desktop or VS Code

1. Open the project in VS Code or GitHub Desktop
2. Stage all files
3. Commit with message: "Initial commit: KinderQuill children's book generator with Venice AI integration"
4. Push to origin/main

## Important Notes

- Your API key is in `SETUP.md` but **NOT** in `.env.local` (which is gitignored)
- Make sure `.env.local` is not committed (it's in `.gitignore`)
- For Railway deployment, add the API key as an environment variable in the Railway dashboard

## API Key for Railway

When deploying to Railway, use this API key as an environment variable:
```
VENICE_API_KEY=<your-venice-api-key-here>
```

