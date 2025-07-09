# GitHub Power Scouter - React Version

An anime-style scouter for analyzing GitHub user skills and statistics, built with React, TypeScript, and Vite.

## Features

- **Anime-style interface** with animated power level display
- **GitHub API integration** for comprehensive user analysis
- **Real-time scanning animation** with progress tracking
- **Detailed technical resume** with programming languages and tech stack analysis
- **GitHub token support** for increased API rate limits
- **Responsive design** for mobile and desktop
- **TypeScript** for type safety and better development experience

## Development

### Prerequisites

- Node.js 18+ and npm
- GitHub Personal Access Token (optional, for higher API limits)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

### Build

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment

### GitHub Pages

1. Install gh-pages (if not already installed):
```bash
npm install -g gh-pages
```

2. Deploy:
```bash
npm run deploy
```

### Cloudflare Pages

1. Connect your repository to Cloudflare Pages
2. Set the build command to: `npm run build`
3. Set the build output directory to: `dist`
4. Deploy!

### Other Static Hosts

The built `dist` folder can be deployed to any static hosting service like:
- Netlify
- Vercel
- AWS S3
- Azure Static Web Apps

## GitHub Token Setup

For better API rate limits (5,000 requests/hour instead of 60):

1. Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Create a new token with `public_repo` and `read:user` scopes
3. Enter the token in the application interface

## Technology Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **CSS3** - Styling with animations
- **GitHub API** - User data retrieval

## Project Structure

```
src/
├── components/          # React components
│   ├── UserInput.tsx   # Input form and token management
│   ├── ScouterDisplay.tsx  # Main scouter visualization
│   └── ResumeModal.tsx # Technical resume modal
├── types/
│   └── github.ts       # TypeScript interfaces
├── App.tsx             # Main application component
├── App.css             # Global styles
└── main.tsx           # Application entry point
```

## API Usage

The application uses the GitHub REST API v3 to fetch:
- User profile information
- Repository data and statistics
- Programming language usage
- Recent activity and contributions
- Repository file structure for tech stack analysis

## License

This project is open source and available under the [MIT License](LICENSE).