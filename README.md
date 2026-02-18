# NeonMate Chess

A modern, real-time multiplayer chess application featuring distinct visual themes, full chess rule implementation, and a sleek glassmorphism UI. Built with React, Node.js, and Socket.IO.

## 🌟 Features

### 🎮 Gameplay
- **Online Multiplayer**: Create private rooms and play against friends in real-time.
- **Local Multiplayer**: Play "Hotseat" mode on a single device.
- **Complete Chess Logic**:
  - Standard movement and capture rules.
  - **Special Moves**: Castling (Kingside & Queenside), En Passant, and Pawn Promotion.
  - **Game States**: Automatic detection of Check, Checkmate, and Stalemate (Draw).
- **Move Validation**: Highlights legal moves and prevents illegal actions.

### 🎨 Visuals & UI
- **Dynamic Themes**: Switch between three unique visual styles:
  - **Pookie Barbie**: A vibrant pink aesthetic with floating icons.
  - **Batman Dark**: A high-contrast, dark mode with gold accents.
  - **Football Neutral**: A sporty green theme.
- **Glassmorphism Design**: Modern UI with blurred backgrounds and smooth animations.
- **Interactive Elements**:
  - Piece glowing effects on turn.
  - Last move highlighting.
  - Floating background animations.
- **Responsive**: Playable on desktop and mobile devices.

### 💬 Social & Connectivity
- **Real-time Chat**: Integrated chat box for communicating with your opponent during online matches.
- **Room System**:
  - Generate unique room codes.
  - Copy-to-clipboard functionality for easy sharing.
  - Color selection (White/Black) when creating a room.
- **Rematch System**: Seamlessly request and accept rematches after a game ends.
- **Reconnection Handling**: Handles opponent disconnections gracefully.

## 🛠️ Tech Stack

### Frontend
- **React**: UI library for building the game interface.
- **Vite**: Fast build tool and development server.
- **Socket.IO Client**: For real-time bidirectional event communication.
- **CSS3**: Custom animations, gradients, and responsive layout.

### Backend
- **Node.js**: Runtime environment.
- **Express**: Web framework.
- **Socket.IO**: Enables real-time, event-based communication between clients and server.

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chess
   ```

2. **Setup Backend**
   Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. **Setup Frontend**
   Open a new terminal, navigate to the frontend directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

1. **Start the Backend Server**
   Inside the `backend` directory:
   ```bash
   npm start
   # Server runs on http://localhost:3001
   ```

2. **Start the Frontend Client**
   Inside the `frontend` directory:
   ```bash
   npm run dev
   # Client usually runs on http://localhost:5173
   ```

3. **Open in Browser**
   Visit the URL provided by Vite (e.g., `http://localhost:5173`) to start playing!

## ⚙️ Configuration

### Environment Variables
The frontend connects to `http://localhost:3001` by default. To deploy or change the server URL, create a `.env` file in the `frontend` directory:

```env
VITE_SERVER_URL=http://your-production-server.com
```

## 🕹️ How to Play

1. **Select a Theme**: Choose your preferred visual style from the main menu.
2. **Choose Mode**:
   - **Play Local**: Starts a game on the current device.
   - **Create Room**: Generates a Room ID. Share this with a friend. You can choose to play as White or Black.
   - **Join Room**: Enter a Room ID shared by a friend to join their game.
3. **Controls**:
   - Click a piece to select it (valid moves will be highlighted with dots/rings).
   - Click a highlighted square to move.
   - If a Pawn reaches the opposite end, a promotion modal will appear.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.
