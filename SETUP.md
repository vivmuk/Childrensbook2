# Setup Instructions

## API Key Configuration

Your Venice API key has been provided. To use it:

1. Create a `.env.local` file in the root directory
2. Add the following:

```
VENICE_API_KEY=<your-venice-api-key-here>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: The `.env.local` file is already in `.gitignore` and will not be committed to the repository.

## For Railway Deployment

When deploying to Railway, add the environment variable:
- `VENICE_API_KEY` = `<your-venice-api-key-here>`

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` with your API key (see above)

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

