# CalorieTracker

An AI-powered nutrition tracking app with food scanning, progress tracking, and personalized insights.

## Features

- **AI Food Scanning** - Take a photo of your food and AI identifies calories & macros instantly
- **Progress Tracking** - Monitor weight, body composition, and nutrition trends
- **AI Insights** - Get personalized tips based on your eating patterns
- **Goal Setting** - Set calorie and weight targets
- **InBody Integration** - Upload body composition scans for detailed tracking
- **Master Meals Database** - Community-shared meal database
- **PWA Support** - Install as an app on your phone

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (Auth, Database, Storage)
- **AI**: Groq or OpenAI API for food recognition
- **Hosting**: Vercel

---

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- A [Supabase](https://supabase.com) account (free tier works)
- A [Groq](https://console.groq.com) API key (free) or [OpenAI](https://platform.openai.com) API key

### 1. Clone the Repository

```bash
git clone https://github.com/Parvj26/calorie-tracker.git
cd calorie-tracker
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (~2 minutes)
3. Go to **SQL Editor** in your Supabase dashboard
4. Copy the contents of `supabase-schema.sql` and run it
5. Go to **Settings > API** and copy:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - `anon` public key

### 3. Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
```

Your `.env.local` should look like:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install Dependencies & Run

```bash
npm install
npm run dev
```

The app will be running at `http://localhost:5173`

### 5. Get AI API Keys

The AI features require an API key. After signing up:

1. Go to **Settings** in the app
2. Add your Groq API key (recommended - free tier available)
   - Get one at [console.groq.com](https://console.groq.com)
3. Or add your OpenAI API key
   - Get one at [platform.openai.com](https://platform.openai.com)

---

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and import your GitHub repo
2. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy!

---

## Project Structure

```
src/
├── components/     # React components
├── hooks/          # Custom React hooks
├── contexts/       # React context providers
├── lib/            # Supabase client
├── utils/          # AI integration (Groq, OpenAI)
├── types/          # TypeScript types
└── data/           # Default data
```

---

## Making Yourself an Admin

To access admin features (approve meal submissions):

1. Sign up in the app
2. Go to Supabase dashboard > Table Editor > `user_profiles`
3. Find your user row and change `role` from `user` to `admin`

---

## License

MIT
