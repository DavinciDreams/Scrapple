# Rabble Project File Structure

Rabble is a real-time multiplayer Scrabble game built in a Next.js monorepo, with the frontend hosted on Vercel and the backend on Render (`https://rabble-l5gj.onrender.com`). Below is the file structure for the `client` (Next.js frontend) and `server` (Socket.IO backend) folders.

## Project Root
rabble/ ├── client/ # Next.js frontend 
        ├── server/ # Socket.IO backend                                                     └── README.md # Project documentation
## Client (Frontend)
The `client` folder contains the Next.js application, including React components, contexts, hooks, and utilities for the Rabble frontend.
client/ ├── package.json # Client dependencies and scripts 
        ├── next.config.js # Next.js configuration to ignore server folder
        ├── tailwind.config.js # Tailwind CSS configuration 
        ├── postcss.config.js # PostCSS configuration for Tailwind 
        ├── public/ # Static assets 
        │ ├── favicon.ico # Favicon 
        │ └── ... 
        ├── src/ 
        │ ├── pages/ # Next.js pages 
        │ │ ├── _app.jsx # Custom App component 
        │ │ ├── index.jsx # Home page (renders Lobby) 
        │ │ └── game/ 
        │ │ └── [roomId].jsx # Game room page 
        │ ├── components/ # React components 
        │ │ ├── GameControls.jsx # Game control buttons (submit, reset, etc.) 
        │ │ ├── GameStatus.jsx # Displays scores, turn, tile bag count 
        │ │ ├── Lobby.jsx # Lobby for creating/joining rooms 
        │ │ ├── ScrabbleBoard.jsx # Game board UI 
        │ │ └── ... 
        │ ├── context/ # React contexts 
        │ │ └── GameContext.jsx # Manages game state (board, tiles, scores) 
        │ ├── hooks/ # Custom React hooks 
        │ │ └── useSocket.js # Socket.IO client connection 
        │ ├── utils/ # Utility functions 
        │ │ └── socketEvents.js # Socket.IO event handlers 
        │ ├── styles/ # CSS styles 
        │ │ └── globals.css # Global styles with Tailwind CSS 
        │ └── ... └── ...
### Key Client Files
- **`package.json`**: Defines Next.js dependencies (`next`, `react`, `socket.io-client`, `tailwindcss`) and scripts (`dev`, `build`, `start`).
- **`next.config.js`**: Configures Next.js to ignore the `server` folder during builds.
- **`src/pages/index.jsx`**: Entry page rendering the `Lobby` component.
- **`src/pages/game/[roomId].jsx`**: Dynamic route for game rooms, rendering the game UI.
- **`src/context/GameContext.jsx`**: Provides game state (board, tiles, scores) via React Context.
- **`src/hooks/useSocket.js`**: Manages Socket.IO client connection to the backend.
- **`src/utils/socketEvents.js`**: Handles Socket.IO events for real-time updates.

## Server (Backend)
The `server` folder contains the Socket.IO backend, managing game state and multiplayer interactions.


### Key Server Files
- **`package.json`**: Defines backend dependencies (`socket.io`, `http`) and scripts (`start`, `dev`).
- **`server.js`**: Implements the Socket.IO server, handling game logic (rooms, turns, tile placement, word submission).

## Notes
- **Monorepo Setup**: The `client` and `server` folders are separate applications within the monorepo. Run `npm install` in each folder to install dependencies.
- **Deployment**:
  - **Client**: Deploy the `client` folder to Vercel, setting the root directory to `client`.
  - **Server**: Deploy the `server` folder to Render, using `npm start` as the start command.
- **Development**:
  - Start the server: `cd server && npm start`
  - Start the client: `cd client && npm run dev`
- **File Paths**: Ensure `socketEvents.js` and other React-related files are in `client/src`, not `server`, to avoid module resolution errors (e.g., `Can't resolve 'react'`).