# 🎲 SchockStemmer

The ultimate Schocken companion app. Track your games, vote on losers, and avoid buying the round.

## ✨ Features

- **Live Game Lobby**: Quick join via 6-character short codes.
- **Anonymous Voting**: All players vote on who they think will lose the round.
- **Drinking Budgets**: Automatic penalty calculation for incorrect votes and self-votes.
- **Session History**: Track your past games and losses.
- **Real-time Sync**: Built on Convex for instant updates across all devices.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, React 19)
- **Database & Backend**: [Convex](https://convex.dev)
- **Authentication**: [Clerk](https://clerk.com)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com) & [Shadcn UI](https://ui.shadcn.com)
- **Icons**: [Hugeicons React](https://github.com/hugeicons/react)

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/danihengeveld/schockstemmer.git
   cd schockstemmer
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file and add your Clerk and Convex keys.

4. **Create Convex dev environment**:
   ```bash
   pnpm exec convex dev
   ```

4. **Run the development server**:
   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) to start playing.

## 👤 Author

**Dani Hengeveld**
- Website: [dani.hengeveld.dev](https://dani.hengeveld.dev)
- GitHub: [@danihengeveld](https://github.com/danihengeveld)
