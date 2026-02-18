import { useState, useEffect, useRef } from 'react'
import './App.css'
import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
console.log('Frontend connecting to:', SERVER_URL);
const socket = io(SERVER_URL, { autoConnect: false, transports: ['websocket'] })

const THEMES = {
  pookie: {
    id: 'pookie',
    label: 'Pookie Barbie',
    colors: {
      bg: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)',
      text: '#5D2E46',
      primary: '#FF6B6B',
      boardLight: 'rgba(255, 240, 245, 0.95)',
      boardDark: 'rgba(255, 183, 178, 0.95)',
      pieceWhite: '#FFFFFF',
      pieceBlack: '#5D2E46',
      glass: 'rgba(255, 255, 255, 0.3)',
      solid: '#FECFEF',
      bgImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='rgba(255,255,255,0.2)'%3E%3Cpath d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E")`
    }
  },
  batman: {
    id: 'batman',
    label: 'Batman Dark',
    colors: {
      bg: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      text: '#FFD700',
      primary: '#1C1C1C',
      boardLight: 'rgba(149, 165, 166, 0.8)',
      boardDark: 'rgba(44, 62, 80, 0.9)',
      pieceWhite: '#F1C40F',
      pieceBlack: '#000000',
      glass: 'rgba(0, 0, 0, 0.5)',
      solid: '#0f0c29',
      bgImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 60' fill='rgba(255,255,255,0.1)'%3E%3Cpath d='M50 35 C 40 45 30 35 20 40 L 10 20 C 20 20 25 30 30 25 C 30 15 40 10 50 20 C 60 10 70 15 70 25 C 75 30 80 20 90 20 L 80 40 C 70 35 60 45 50 35'/%3E%3C/svg%3E")`
    }
  },
  football: {
    id: 'football',
    label: 'Football Neutral',
    colors: {
      bg: 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)',
      text: '#FFFFFF',
      primary: '#054D24',
      boardLight: 'rgba(232, 245, 233, 0.9)',
      boardDark: 'rgba(46, 125, 50, 0.9)',
      pieceWhite: '#FFFFFF',
      pieceBlack: '#000000',
      glass: 'rgba(255, 255, 255, 0.2)',
      solid: '#054D24',
      bgImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='rgba(255,255,255,0.15)'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 6 L 17 10 L 15 16 L 9 16 L 7 10 Z' fill='rgba(255,255,255,0.3)'/%3E%3Cpath d='M12 6 L 12 2 M 17 10 L 21 10 M 15 16 L 18 20 M 9 16 L 6 20 M 7 10 L 3 10' stroke='rgba(255,255,255,0.3)' stroke-width='1'/%3E%3C/svg%3E")`
    }
  }
}

const createBoard = () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null))
  const pieces = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜']
  
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: pieces[c], color: 'black' }
    board[1][c] = { type: '♟', color: 'black' }
    board[6][c] = { type: '♟', color: 'white' }
    board[7][c] = { type: pieces[c], color: 'white' }
  }
  return board
}

const isPathClear = (start, end, board) => {
  const dr = Math.sign(end.r - start.r)
  const dc = Math.sign(end.c - start.c)
  let r = start.r + dr
  let c = start.c + dc
  
  while (r !== end.r || c !== end.c) {
    if (board[r][c]) return false
    r += dr
    c += dc
  }
  return true
}

// Helper to check basic attacks without recursion or full validation
const canAttack = (start, end, board) => {
  const piece = board[start.r][start.c]
  const dr = end.r - start.r
  const dc = end.c - start.c
  const absDr = Math.abs(dr)
  const absDc = Math.abs(dc)
  
  switch (piece.type) {
    case '♟': 
      const direction = piece.color === 'white' ? -1 : 1
      return dr === direction && absDc === 1
    case '♜':
      if (dr !== 0 && dc !== 0) return false
      return isPathClear(start, end, board)
    case '♞':
      return (absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2)
    case '♝':
      if (absDr !== absDc) return false
      return isPathClear(start, end, board)
    case '♛':
      if (dr !== 0 && dc !== 0 && absDr !== absDc) return false
      return isPathClear(start, end, board)
    case '♚':
      return absDr <= 1 && absDc <= 1
    default:
      return false
  }
}

const isSquareUnderAttack = (board, r, c, defenderColor) => {
  const attackerColor = defenderColor === 'white' ? 'black' : 'white'
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j]
      if (piece && piece.color === attackerColor) {
        if (canAttack({r: i, c: j}, {r, c}, board)) return true
      }
    }
  }
  return false
}

const findKing = (board, color) => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (p && p.type === '♚' && p.color === color) return { r, c }
    }
  }
  return null
}

const isKingInCheck = (board, color) => {
  const king = findKing(board, color)
  if (!king) return false
  return isSquareUnderAttack(board, king.r, king.c, color)
}

const isValidMove = (start, end, board, lastMove, castlingRights) => {
  const piece = board[start.r][start.c]
  const target = board[end.r][end.c]
  
  if (target && target.color === piece.color) return false
  
  const dr = end.r - start.r
  const dc = end.c - start.c
  const absDr = Math.abs(dr)
  const absDc = Math.abs(dc)
  
  switch (piece.type) {
    case '♟': {
      const direction = piece.color === 'white' ? -1 : 1
      const startRow = piece.color === 'white' ? 6 : 1
      // Move forward 1
      if (dc === 0 && dr === direction && !target) return true
      // Move forward 2
      if (dc === 0 && dr === 2 * direction && start.r === startRow && !target && !board[start.r + direction][start.c]) return true
      // Capture
      if (absDc === 1 && dr === direction && target && target.color !== piece.color) return true
      // En Passant
      if (absDc === 1 && dr === direction && !target && lastMove) {
        const { from, to, piece: lp } = lastMove
        if (lp.type === '♟' && lp.color !== piece.color && 
            Math.abs(from.r - to.r) === 2 && 
            to.r === start.r && to.c === end.c) {
          return true
        }
      }
      return false
    }
    case '♜':
      if (dr !== 0 && dc !== 0) return false
      return isPathClear(start, end, board)
    case '♞':
      return (absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2)
    case '♝':
      if (absDr !== absDc) return false
      return isPathClear(start, end, board)
    case '♛':
      if (dr !== 0 && dc !== 0 && absDr !== absDc) return false
      return isPathClear(start, end, board)
    case '♚':
      if (absDr <= 1 && absDc <= 1) return true
      // Castling
      if (dr === 0 && absDc === 2 && castlingRights) {
        const rights = castlingRights[piece.color]
        const row = piece.color === 'white' ? 7 : 0
        if (start.r !== row || start.c !== 4) return false
        if (isKingInCheck(board, piece.color)) return false
        
        if (dc === 2 && rights.kingSide) { // Kingside
           if (board[row][5] || board[row][6]) return false
           if (isSquareUnderAttack(board, row, 5, piece.color) || isSquareUnderAttack(board, row, 6, piece.color)) return false
           return true
        }
        if (dc === -2 && rights.queenSide) { // Queenside
           if (board[row][1] || board[row][2] || board[row][3]) return false
           if (isSquareUnderAttack(board, row, 3, piece.color) || isSquareUnderAttack(board, row, 2, piece.color)) return false
           return true
        }
      }
      return false
    default:
      return false
  }
}

const hasLegalMoves = (board, color, lastMove, castlingRights) => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c]
      if (piece && piece.color === color) {
        for (let tr = 0; tr < 8; tr++) {
          for (let tc = 0; tc < 8; tc++) {
             if (isValidMove({r,c}, {r: tr, c: tc}, board, lastMove, castlingRights)) {
               const temp = board.map(row => row.map(p => p ? {...p} : null))
               
               // En Passant simulation
               if (piece.type === '♟' && Math.abs(tc - c) === 1 && !temp[tr][tc]) {
                 temp[r][tc] = null
               }
               
               temp[tr][tc] = temp[r][c]
               temp[r][c] = null
               if (!isKingInCheck(temp, color)) return true
             }
          }
        }
      }
    }
  }
  return false
}

const getValidMoves = (board, start, color, lastMove, castlingRights) => {
  const moves = []
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const end = { r, c }
      if (isValidMove(start, end, board, lastMove, castlingRights)) {
        const temp = board.map(row => row.map(p => p ? { ...p } : null))
        const piece = temp[start.r][start.c]
        
        // En Passant simulation
        if (piece.type === '♟' && Math.abs(c - start.c) === 1 && !temp[r][c]) {
             temp[start.r][c] = null
        }

        temp[r][c] = piece
        temp[start.r][start.c] = null
        if (!isKingInCheck(temp, color)) {
          moves.push(end)
        }
      }
    }
  }
  return moves
}

function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [currentTheme, setCurrentTheme] = useState('pookie')
  const [board, setBoard] = useState(createBoard())
  const [selected, setSelected] = useState(null)
  const [turn, setTurn] = useState('white')
  const [inCheck, setInCheck] = useState(false)
  const [possibleMoves, setPossibleMoves] = useState([])
  const [captured, setCaptured] = useState({ white: [], black: [] })
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState(null)
  const [isOnline, setIsOnline] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [roomInput, setRoomInput] = useState('')
  const [myColor, setMyColor] = useState(null)
  const [opponentJoined, setOpponentJoined] = useState(false)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [creationColor, setCreationColor] = useState('white')
  const myColorRef = useRef(myColor)
  
  // New State for Rules
  const [lastMove, setLastMove] = useState(null)
  const [castlingRights, setCastlingRights] = useState({
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true }
  })
  const [promotionSquare, setPromotionSquare] = useState(null)

  useEffect(() => {
    myColorRef.current = myColor
  }, [myColor])

  const theme = THEMES[currentTheme].colors

  // Dynamic CSS based on selected theme
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800;900&display=swap');

    @keyframes gradientBG {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    @keyframes patternMove {
      0% { background-position: 0 0; }
      100% { background-position: 50px 50px; }
    }

    @keyframes spotlightMove {
      0% { background-position: 0% 0%; }
      25% { background-position: 100% 0%; }
      50% { background-position: 100% 100%; }
      75% { background-position: 0% 100%; }
      100% { background-position: 0% 0%; }
    }

    :root {
      --bg: ${theme.bg};
      --text: ${theme.text};
      --primary: ${theme.primary};
      --board-light: ${theme.boardLight};
      --board-dark: ${theme.boardDark};
      --piece-white: ${theme.pieceWhite};
      --piece-black: ${theme.pieceBlack};
      --glass-bg: ${theme.glass};
      --bg-solid: ${theme.solid};
      --bg-image: ${theme.bgImage};
    }
    
    * {
      box-sizing: border-box;
    }

    body {
      background: var(--bg);
      background-size: 400% 400%;
      animation: gradientBG 15s ease infinite;
      color: var(--text);
      transition: background 0.8s ease, color 0.5s ease;
      margin: 0;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'Montserrat', sans-serif;
      overflow-x: hidden;
      position: relative;
    }
    
    /* Aesthetic Overlays */
    .noise {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
      opacity: 0.06;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }

    .orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(80px);
      z-index: -3;
      animation: floatOrb 20s ease-in-out infinite alternate;
    }
    
    .orb-1 {
      top: -10%;
      left: -10%;
      width: 50vmax;
      height: 50vmax;
      background: var(--primary);
      opacity: 0.3;
    }
    
    .orb-2 {
      bottom: -20%;
      right: -10%;
      width: 40vmax;
      height: 40vmax;
      background: var(--text);
      opacity: 0.15;
      animation-delay: -10s;
    }

    @keyframes floatOrb {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(30px, 50px) scale(1.1); }
    }

    /* New Visual Elements */
    .grid-overlay {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 50vh;
      background-image: 
        linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
      background-size: 50px 50px;
      transform: perspective(500px) rotateX(60deg);
      transform-origin: bottom;
      opacity: 0.2;
      pointer-events: none;
      z-index: -2;
      mask-image: linear-gradient(to top, black, transparent);
      -webkit-mask-image: linear-gradient(to top, black, transparent);
    }

    .shapes-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
      overflow: hidden;
    }

    .shape {
      position: absolute;
      opacity: 0.3;
      animation: floatShape 20s infinite linear;
    }

    @keyframes floatShape {
      0% { transform: translateY(110vh) rotate(-10deg) scale(0.8); opacity: 0; }
      20% { opacity: 0.6; }
      80% { opacity: 0.6; }
      100% { transform: translateY(-10vh) rotate(10deg) scale(1.2); opacity: 0; }
    }

    /* Theme Specific Shapes */
    ${currentTheme === 'pookie' ? `
      .shape {
        font-size: 4rem;
        filter: drop-shadow(0 0 15px var(--primary));
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .shape-1 { left: 10%; animation-duration: 15s; }
      .shape-1::after { content: '🎀'; }
      
      .shape-2 { left: 30%; animation-duration: 25s; animation-delay: -5s; font-size: 6rem; }
      .shape-2::after { content: '🧸'; }
      
      .shape-3 { left: 70%; animation-duration: 18s; animation-delay: -10s; }
      .shape-3::after { content: '💄'; }
      
      .shape-4 { left: 85%; animation-duration: 22s; animation-delay: -2s; font-size: 5rem; }
      .shape-4::after { content: '💖'; }
    ` : ''}

    ${currentTheme === 'batman' ? `
      .shape {
        font-size: 4rem;
        filter: drop-shadow(0 0 10px rgba(0,0,0,0.8));
        opacity: 0.8;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .shape-1 { left: 20%; animation-duration: 12s; font-size: 6rem; }
      .shape-1::after { content: '🦇'; }
      
      .shape-2 { left: 50%; animation-duration: 18s; animation-delay: -5s; }
      .shape-2::after { content: '🃏'; }
      
      .shape-3 { left: 75%; animation-duration: 15s; animation-delay: -8s; color: #0f0; }
      .shape-3::after { content: '❓'; }
      
      .shape-4 { left: 10%; animation-duration: 20s; animation-delay: -2s; }
      .shape-4::after { content: '🌑'; }
    ` : ''}

    ${currentTheme === 'football' ? `
      .shape {
        font-size: 4rem;
        filter: drop-shadow(0 0 5px rgba(255,255,255,0.3));
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .shape-1 { left: 15%; animation-duration: 14s; }
      .shape-1::after { content: '⚽'; }
      
      .shape-2 { left: 40%; animation-duration: 20s; animation-delay: -4s; font-size: 6rem; }
      .shape-2::after { content: '🥅'; }
      
      .shape-3 { left: 65%; animation-duration: 16s; animation-delay: -9s; }
      .shape-3::after { content: '🏆'; }
      
      .shape-4 { left: 90%; animation-duration: 24s; animation-delay: -1s; }
      .shape-4::after { content: '👟'; }
    ` : ''}

    /* Background Pattern Overlay */
    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -2;
      opacity: 0.4;
    }

    /* Character Overlay */
    body::after {
      content: '';
      position: fixed;
      bottom: -5%;
      right: -5%;
      width: 60vh;
      height: 60vh;
      background-image: var(--bg-image);
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      pointer-events: none;
      z-index: -2;
      transition: background-image 0.5s ease-in-out;
      filter: drop-shadow(0 0 20px rgba(0,0,0,0.3));
    }

    ${currentTheme === 'pookie' ? `
      body::before {
        background-image: radial-gradient(rgba(255, 255, 255, 0.4) 2px, transparent 2px);
        background-size: 40px 40px;
        animation: patternMove 10s linear infinite;
      }
    ` : ''}

    ${currentTheme === 'batman' ? `
      body::before {
        background: radial-gradient(circle 800px at center, rgba(255, 255, 255, 0.03) 0%, transparent 70%);
        background-size: 200% 200%;
        animation: spotlightMove 20s ease-in-out infinite;
      }
    ` : ''}

    ${currentTheme === 'football' ? `
      body::before {
        background-image: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0px, rgba(255, 255, 255, 0.05) 2px, transparent 2px, transparent 20px);
        background-size: 60px 60px;
        animation: patternMove 4s linear infinite;
      }
    ` : ''}

    .container {
      width: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }

    /* Glassmorphism Panel */
    .glass-panel {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 40px;
      padding: 60px;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.18);
      text-align: center;
      max-width: 800px;
      width: 95%;
      animation: float 6s ease-in-out infinite;
    }

    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0px); }
    }

    h1 {
      font-size: 6rem;
      margin: 0 0 20px 0;
      text-transform: uppercase;
      letter-spacing: -3px;
      font-weight: 900;
      background: linear-gradient(180deg, var(--text) 20%, var(--primary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 0 20px rgba(255,255,255,0.3));
      animation: floatTitle 6s ease-in-out infinite;
    }

    @keyframes floatTitle {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-10px) rotate(1deg); }
    }

    .subtitle {
      font-size: 1.5rem;
      margin-bottom: 50px;
      font-weight: 600;
      opacity: 0.9;
      letter-spacing: 1px;
    }

    .theme-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin-bottom: 50px;
      width: 100%;
    }

    .theme-btn {
      padding: 25px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      color: var(--text);
      cursor: pointer;
      font-weight: 800;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: 'Montserrat', sans-serif;
      position: relative;
      overflow: hidden;
    }

    .theme-btn:hover {
      transform: translateY(-5px) scale(1.02);
      background: rgba(255,255,255,0.15);
      border-color: var(--text);
      box-shadow: 0 15px 30px rgba(0,0,0,0.2);
    }

    .theme-btn.active {
      background: var(--text);
      color: var(--bg-solid);
      border-color: transparent;
      box-shadow: 0 0 30px var(--primary), 0 0 10px var(--text);
    }

    .start-btn {
      padding: 25px 80px;
      font-size: 1.8rem;
      border-radius: 50px;
      border: none;
      background: var(--text);
      color: var(--bg-solid);
      cursor: pointer;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      font-family: 'Montserrat', sans-serif;
      animation: pulseBtn 2s infinite;
    }
    
    @keyframes pulseBtn {
      0% { transform: scale(1); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
      50% { transform: scale(1.05); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
      100% { transform: scale(1); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    }

    /* Game Layout */
    .game-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      max-width: 700px;
    }

    .game-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      margin-bottom: 30px;
      padding: 20px 30px;
      background: var(--glass-bg);
      backdrop-filter: blur(15px);
      border-radius: 25px;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }

    .back-btn {
      background: transparent;
      border: 2px solid var(--text);
      color: var(--text);
      padding: 10px 25px;
      border-radius: 30px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      text-transform: uppercase;
      font-size: 0.9rem;
    }

    .back-btn:hover {
      background: var(--text);
      color: var(--bg-solid);
    }

    .game-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .board-wrapper {
      position: relative;
      padding: 20px;
      background: var(--glass-bg);
      backdrop-filter: blur(10px);
      border-radius: 30px;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.5);
    }

    .chess-board {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      grid-template-rows: repeat(8, minmax(0, 1fr));
      width: 100%;
      max-width: 600px;
      aspect-ratio: 1;
      border-radius: 12px;
      border: 10px solid rgba(255,255,255,0.1);
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      user-select: none;
    }
    .square {
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: clamp(1.5rem, 5.5vw, 3.5rem);
      position: relative;
      box-shadow: inset 0 0 10px rgba(0,0,0,0.05);
    }
    .selected {
      background: rgba(255, 255, 255, 0.4) !important;
      box-shadow: inset 0 0 15px var(--primary);
      border: 2px solid var(--primary);
    }
    .last-move {
      background: rgba(255, 255, 0, 0.3) !important;
    }
    .piece.glow {
      animation: pulseGlow 1.5s ease-in-out infinite alternate;
    }
    @keyframes pulseGlow {
      from { filter: drop-shadow(0 0 2px var(--text)); }
      to { filter: drop-shadow(0 0 15px var(--text)); }
    }

    .light { background: var(--board-light); }
    .dark { background: var(--board-dark); }
    
    .piece { 
      cursor: pointer; 
      filter: drop-shadow(0 5px 5px rgba(0,0,0,0.3));
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      user-select: none;
    }
    .piece:hover { transform: scale(1.2); }

    .piece.white { color: var(--piece-white); }
    .piece.black { color: var(--piece-black); }

    .captured-area {
      display: flex;
      gap: 5px;
      min-height: 35px;
      padding: 8px 15px;
      background: rgba(0,0,0,0.2);
      border-radius: 12px;
      width: 100%;
      max-width: 600px;
      align-items: center;
      flex-wrap: wrap;
      margin: 0 auto;
    }
    .captured-piece {
      font-size: 1.5rem;
      line-height: 1;
    }

    .move-dot {
      position: absolute;
      width: 30%;
      height: 30%;
      background: var(--text);
      opacity: 0.3;
      border-radius: 50%;
      pointer-events: none;
    }
    .move-ring {
      position: absolute;
      width: 90%;
      height: 90%;
      border: 6px solid var(--text);
      opacity: 0.3;
      border-radius: 50%;
      pointer-events: none;
      box-sizing: border-box;
    }
    
    /* Ensure black pieces are visible on dark squares in batman theme */
    ${currentTheme === 'batman' ? `.piece.black { text-shadow: 0 0 2px rgba(255,255,255,0.8); }` : ''}

    .online-controls {
      display: flex;
      flex-direction: column;
      gap: 15px;
      width: 100%;
      max-width: 400px;
      margin: 0 auto;
    }
    .room-input {
      padding: 15px;
      border-radius: 15px;
      border: none;
      background: rgba(255,255,255,0.9);
      font-family: inherit;
      font-size: 1rem;
      text-align: center;
      color: #333;
    }

    .chat-container {
      width: 100%;
      max-width: 600px;
      margin-top: 20px;
      background: var(--glass-bg);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 250px;
    }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 15px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .message {
      padding: 8px 12px;
      border-radius: 12px;
      max-width: 80%;
      word-wrap: break-word;
      font-size: 0.9rem;
      animation: popIn 0.3s ease;
    }
    .message.self {
      align-self: flex-end;
      background: var(--primary);
      color: var(--bg-solid);
      border-bottom-right-radius: 2px;
    }
    .message.opponent {
      align-self: flex-start;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.1);
      border-bottom-left-radius: 2px;
    }
    .chat-input-area {
      display: flex;
      padding: 10px;
      background: rgba(0,0,0,0.1);
      gap: 10px;
    }
    .chat-input {
      flex: 1;
      padding: 10px 15px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: var(--text);
      font-family: inherit;
      outline: none;
    }
    .chat-input:focus {
      background: rgba(255,255,255,0.1);
      border-color: var(--primary);
    }
    .send-btn {
      background: var(--text);
      color: var(--bg-solid);
      border: none;
      padding: 0 20px;
      border-radius: 20px;
      cursor: pointer;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 0.8rem;
      transition: transform 0.2s;
    }
    .send-btn:hover {
      transform: scale(1.05);
    }

    .victory-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 100;
      backdrop-filter: blur(5px);
    }
    
    .victory-modal {
      background: var(--glass-bg);
      border: 2px solid var(--primary);
      padding: 40px;
      border-radius: 30px;
      text-align: center;
      box-shadow: 0 0 50px var(--primary);
      animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      max-width: 90%;
    }

    @keyframes popIn {
      0% { transform: scale(0.5); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .winner-text {
      font-size: 3rem;
      font-weight: 900;
      margin-bottom: 20px;
      text-transform: uppercase;
      background: linear-gradient(45deg, var(--text), var(--primary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .promotion-options {
      display: flex;
      gap: 15px;
      justify-content: center;
      margin-top: 20px;
    }
    .promotion-piece {
      font-size: 3rem;
      cursor: pointer;
      padding: 10px;
      background: rgba(255,255,255,0.1);
      border-radius: 10px;
      transition: transform 0.2s;
    }
    .promotion-piece:hover {
      transform: scale(1.2);
      background: rgba(255,255,255,0.2);
    }

    @media (max-width: 768px) {
      .container { padding: 10px; }
      h1 { font-size: 3rem; margin-bottom: 10px; }
      .glass-panel { padding: 25px 15px; }
      .theme-grid { grid-template-columns: 1fr; gap: 10px; }
      .theme-btn { padding: 15px; }
      .start-btn { padding: 15px; font-size: 1.2rem; width: 100%; }
      
      .game-header { padding: 15px; flex-direction: column; gap: 15px; text-align: center; }
      .game-header > div:last-child { display: none; }
      .back-btn { width: 100%; }
      .game-title { font-size: 1.3rem; }
      
      .board-wrapper { padding: 10px; border-radius: 15px; }
      .chess-board { border-width: 4px; }
      .square { font-size: 10vw; }
      
      .captured-area { padding: 5px; min-height: 30px; justify-content: center; }
      .captured-piece { font-size: 1.2rem; }
      
      body::after { opacity: 0.3; right: -20%; width: 30vh; height: 30vh; bottom: 5%; }
      
      .victory-modal { padding: 25px; width: 90%; }
      .winner-text { font-size: 2rem; }
      .chat-container { height: 200px; }
    }
  `

  useEffect(() => {
    socket.on('connect', () => console.log('Connected to server'))
    
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      alert('Connection failed! Check console for details.\nEnsure VITE_SERVER_URL is correct and Backend is running.');
    });
    
    socket.on('room_created', ({ roomId, color }) => {
      setRoomId(roomId)
      setMyColor(color)
      setGameStarted(true)
      setIsOnline(true)
    })

    socket.on('room_joined', ({ roomId, color }) => {
      setRoomId(roomId)
      setMyColor(color)
      setGameStarted(true)
      setIsOnline(true)
      setOpponentJoined(true)
    })

    socket.on('game_start', () => {
      setOpponentJoined(true)
    })

    socket.on('receive_move', (data) => {
      setBoard(data.board)
      setTurn(data.turn)
      setInCheck(data.inCheck)
      setGameOver(data.gameOver)
      setWinner(data.winner)
      setCaptured(data.captured)
      if (data.lastMove) setLastMove(data.lastMove)
      if (data.castlingRights) setCastlingRights(data.castlingRights)
    })

    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, data])
    })

    socket.on('opponent_disconnected', () => {
      setGameOver(true)
      setWinner(myColorRef.current)
      alert('Opponent disconnected! You win!')
    })

    socket.on('error', (message) => {
      alert(message)
    })

    socket.on('room_full', () => {
      alert('Room is full!')
      setGameStarted(false)
      setIsOnline(false)
    })

    socket.on('invalid_room', () => {
      alert('Invalid Room ID!')
      setGameStarted(false)
      setIsOnline(false)
    })

    return () => {
      socket.off('connect')
      socket.off('connect_error')
      socket.off('room_created')
      socket.off('room_joined')
      socket.off('game_start')
      socket.off('receive_move')
      socket.off('receive_message')
      socket.off('opponent_disconnected')
      socket.off('error')
      socket.off('room_full')
      socket.off('invalid_room')
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = () => {
    if (chatInput.trim() && roomId) {
      const msgData = { roomId, text: chatInput, sender: myColor }
      socket.emit('send_message', msgData)
      setChatInput('')
    }
  }

  const promotePawn = (type) => {
    if (!promotionSquare) return
    const { r, c } = promotionSquare
    const newBoard = board.map(row => row.map(p => p ? { ...p } : null))
    newBoard[r][c] = { type, color: turn }
    
    finalizeMove(newBoard, turn)
    setPromotionSquare(null)
  }

  const finalizeMove = (newBoard, currentTurn, explicitCaptured = null, explicitLastMove = null) => {
    const nextTurn = currentTurn === 'white' ? 'black' : 'white'
    
    const finalCaptured = explicitCaptured || captured
    const finalLastMove = explicitLastMove || lastMove

    // Check opponent status
    const check = isKingInCheck(newBoard, nextTurn)
    let mate = false
    
    if (check) {
      if (!hasLegalMoves(newBoard, nextTurn, lastMove, castlingRights)) {
        mate = true
      }
    } else {
      // Stalemate check could go here
      if (!hasLegalMoves(newBoard, nextTurn, lastMove, castlingRights)) {
        // Stalemate logic (optional, for now just no moves but not check)
      }
    }

    setBoard(newBoard)
    setTurn(nextTurn)
    setSelected(null)
    setPossibleMoves([])
    setInCheck(check)
    
    if (mate) {
      setGameOver(true)
      setWinner(currentTurn)
    }

    if (isOnline) {
      socket.emit('move', {
        roomId,
        board: newBoard,
        turn: nextTurn,
        inCheck: check,
        gameOver: mate,
        winner: mate ? currentTurn : null,
        captured: finalCaptured,
        lastMove: finalLastMove,
        castlingRights: castlingRights
      })
    }
  }

  const handleSquareClick = (r, c) => {
    if (gameOver || promotionSquare) return
    
    // Online restriction: prevent moving if it's not your turn or not your color
    if (isOnline && (turn !== myColor || !opponentJoined)) return

    if (selected) {
      // If clicked same square, deselect
      if (selected.r === r && selected.c === c) {
        setSelected(null)
        setPossibleMoves([])
        return
      }

      const targetPiece = board[r][c]
      const selectedPiece = board[selected.r][selected.c]

      // If clicked own piece, switch selection
      if (targetPiece && targetPiece.color === selectedPiece.color) {
        setSelected({ r, c })
        setPossibleMoves(getValidMoves(board, {r, c}, turn, lastMove, castlingRights))
        return
      }

      // Move logic with validation
      if (isValidMove(selected, { r, c }, board, lastMove, castlingRights)) {
        // Simulate move to check for self-check
        const tempBoard = board.map(row => row.map(p => p ? { ...p } : null))
        const nextCaptured = { white: [...captured.white], black: [...captured.black] }
        
        // Handle En Passant Capture
        if (selectedPiece.type === '♟' && Math.abs(c - selected.c) === 1 && !targetPiece) {
           // Remove captured pawn
           tempBoard[selected.r][c] = null
           // Add to captured list
           nextCaptured[turn].push('♟')
        }

        // Handle Castling Move
        if (selectedPiece.type === '♚' && Math.abs(c - selected.c) === 2) {
           const row = selected.r
           if (c > selected.c) { // Kingside
             tempBoard[row][5] = tempBoard[row][7]
             tempBoard[row][7] = null
           } else { // Queenside
             tempBoard[row][3] = tempBoard[row][0]
             tempBoard[row][0] = null
           }
        }

        tempBoard[r][c] = tempBoard[selected.r][selected.c]
        tempBoard[selected.r][selected.c] = null
        
        if (isKingInCheck(tempBoard, turn)) return

        // Update Castling Rights
        const newRights = { ...castlingRights }
        if (selectedPiece.type === '♚') {
           newRights[turn].kingSide = false
           newRights[turn].queenSide = false
        }
        if (selectedPiece.type === '♜') {
           if (selected.c === 0) newRights[turn].queenSide = false
           if (selected.c === 7) newRights[turn].kingSide = false
        }
        // If rook is captured
        if (targetPiece && targetPiece.type === '♜') {
           if (c === 0) newRights[targetPiece.color].queenSide = false
           if (c === 7) newRights[targetPiece.color].kingSide = false
        }
        setCastlingRights(newRights)

        // Check for capture (standard)
        if (targetPiece) {
          nextCaptured[turn].push(targetPiece.type)
        }
        setCaptured(nextCaptured)

        // Update Last Move
        const moveData = { from: selected, to: { r, c }, piece: selectedPiece }
        setLastMove(moveData)

        // Check Promotion
        if (selectedPiece.type === '♟' && (r === 0 || r === 7)) {
           setBoard(tempBoard)
           setPromotionSquare({ r, c })
           return
        }

        // Commit Move
        finalizeMove(tempBoard, turn, nextCaptured, moveData)
      }
    } else {
      // Select logic
      const piece = board[r][c]
      if (piece && piece.color === turn && (!isOnline || myColor === turn)) {
        setSelected({ r, c })
        setPossibleMoves(getValidMoves(board, {r, c}, turn, lastMove, castlingRights))
      }
    }
  }

  const renderBoard = () => {
    const squares = []
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isDark = (r + c) % 2 === 1
        const piece = board[r][c]
        const isSelected = selected?.r === r && selected?.c === c
        const isPossibleMove = possibleMoves.some(m => m.r === r && m.c === c)
        const isCapture = isPossibleMove && (board[r][c] || (selected && board[selected.r][selected.c].type === '♟' && Math.abs(c - selected.c) === 1 && !board[r][c])) // Highlight en passant as capture
        const isLastMove = lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c))
        const shouldGlow = piece && piece.color === turn && !gameOver
        
        squares.push(
          <div 
            key={`${r}-${c}`} 
            className={`square ${isDark ? 'dark' : 'light'} ${isSelected ? 'selected' : ''} ${isLastMove ? 'last-move' : ''}`}
            onClick={() => handleSquareClick(r, c)}
          >
            {piece && <span className={`piece ${piece.color} ${shouldGlow ? 'glow' : ''}`}>{piece.type}</span>}
            {isPossibleMove && !isCapture && <div className="move-dot"></div>}
            {isPossibleMove && isCapture && <div className="move-ring"></div>}
          </div>
        )
      }
    }
    return squares
  }

  return (
    <>
      <style>{styles}</style>
      <div className="noise"></div>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="grid-overlay"></div>
      <div className="shapes-container">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
      </div>
      <div className="container">
        {!gameStarted ? (
          <div className="glass-panel">
            <h1>NeonMate</h1>
            <p className="subtitle">Choose your battlefield</p>
            
            <div className="theme-grid">
              {Object.values(THEMES).map(t => (
                <button 
                  key={t.id} 
                  className={`theme-btn ${currentTheme === t.id ? 'active' : ''}`}
                  onClick={() => setCurrentTheme(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="online-controls">
              <button className="start-btn" onClick={() => {
                setBoard(createBoard())
                setTurn('white')
                setSelected(null)
                setPossibleMoves([])
                setCaptured({ white: [], black: [] })
                setInCheck(false)
                setGameOver(false)
                setWinner(null)
                setMessages([])
                setIsOnline(false)
                setGameStarted(true)
                setLastMove(null)
                setCastlingRights({
                  white: { kingSide: true, queenSide: true },
                  black: { kingSide: true, queenSide: true }
                })
                setPromotionSquare(null)
              }}>
                Play Local
              </button>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.3)', flex: 1 }}></div>
                <span style={{ opacity: 0.7 }}>OR ONLINE</span>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.3)', flex: 1 }}></div>
              </div>

              <div style={{ margin: '15px 0', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ opacity: 0.8, fontSize: '0.9rem' }}>Play as:</span>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '4px' }}>
                  <button 
                    style={{ 
                      background: creationColor === 'white' ? 'var(--text)' : 'transparent',
                      color: creationColor === 'white' ? 'var(--bg-solid)' : 'var(--text)',
                      border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setCreationColor('white')}
                  >White</button>
                  <button 
                    style={{ 
                      background: creationColor === 'black' ? 'var(--text)' : 'transparent',
                      color: creationColor === 'black' ? 'var(--bg-solid)' : 'var(--text)',
                      border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setCreationColor('black')}
                  >Black</button>
                </div>
              </div>

              <button className="theme-btn" onClick={() => {
                socket.connect()
                socket.emit('create_room', creationColor)
              }}>Create Room</button>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  className="room-input" 
                  placeholder="Enter Room ID" 
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                />
                <button className="theme-btn" onClick={() => {
                  if (roomInput) {
                    socket.connect()
                    socket.emit('join_room', roomInput)
                  }
                }}>Join</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="game-container">
            <div className="game-header">
              <button 
                className="theme-btn" 
                style={{ margin: 0, padding: '10px 20px', fontSize: '0.9rem' }}
                onClick={() => {
                  setGameStarted(false)
                  setIsOnline(false)
                  setOpponentJoined(false)
                  setMessages([])
                  socket.disconnect()
                }}
              >
                ← Exit
              </button>
              <div style={{ textAlign: 'center' }}>
                <h2 className="game-title">{THEMES[currentTheme].label}</h2>
                <span style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: 'bold' }}>
                  {gameOver 
                    ? `GAME OVER - ${winner.toUpperCase()} WINS!` 
                    : inCheck 
                      ? `CHECK! (${turn.toUpperCase()}'S TURN)`
                      : `TURN: ${turn.toUpperCase()}`
                  }
                </span>
                {isOnline && (
                  <div style={{ fontSize: '0.8rem', marginTop: '5px', color: 'var(--primary)' }}>
                    ROOM: {roomId} | YOU ARE: {myColor?.toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ width: '80px' }}></div>
            </div>
            <div className="board-wrapper">
              {isOnline && !opponentJoined && (
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                  background: 'rgba(0,0,0,0.85)', zIndex: 10, display: 'flex', 
                  flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                  borderRadius: '30px', backdropFilter: 'blur(5px)', color: '#ffffff'
                }}>
                  <h2 style={{ marginBottom: '10px', color: '#ffffff' }}>Waiting for Opponent...</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <p style={{ color: '#ffffff', margin: 0 }}>Share Room ID:</p>
                    <strong style={{ fontSize: '1.5rem', color: '#ffffff', background: 'rgba(255,255,255,0.1)', padding: '5px 15px', borderRadius: '10px' }}>{roomId}</strong>
                    <button 
                      className="theme-btn"
                      style={{ padding: '10px 20px', fontSize: '0.9rem', color: '#fff', borderColor: '#fff', margin: 0, minWidth: '90px' }}
                      onClick={() => {
                        navigator.clipboard.writeText(roomId)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
              <div className="captured-area" style={{ marginBottom: '15px' }}>
                {captured.black.map((p, i) => (
                  <span key={i} className="captured-piece piece white">{p}</span>
                ))}
              </div>
              <div className="chess-board">
              {renderBoard()}
              </div>
              <div className="captured-area" style={{ marginTop: '15px' }}>
                {captured.white.map((p, i) => (
                  <span key={i} className="captured-piece piece black">{p}</span>
                ))}
              </div>
            </div>
            
            {isOnline && (
              <div className="chat-container">
                <div className="chat-messages">
                  {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.sender === myColor ? 'self' : 'opponent'}`}>
                      <div style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: '2px' }}>
                        {msg.sender === myColor ? 'You' : 'Opponent'}
                      </div>
                      {msg.text}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="chat-input-area">
                  <input 
                    className="chat-input"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                  />
                  <button className="send-btn" onClick={sendMessage}>Send</button>
                </div>
              </div>
            )}

            {promotionSquare && (
              <div className="victory-overlay">
                <div className="victory-modal">
                  <h2 className="winner-text">Promote Pawn</h2>
                  <div className="promotion-options">
                    {['♛', '♜', '♝', '♞'].map(p => (
                      <div key={p} className="promotion-piece" onClick={() => promotePawn(p)}>
                        <span className={`piece ${turn}`}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {gameOver && (
              <div className="victory-overlay">
                <div className="victory-modal">
                  <h2 className="winner-text">{winner} WINS!</h2>
                  <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    <button className="start-btn" style={{ fontSize: '1rem', padding: '15px 30px' }} onClick={() => {
                      setBoard(createBoard())
                      setTurn('white')
                      setSelected(null)
                      setPossibleMoves([])
                      setCaptured({ white: [], black: [] })
                      setInCheck(false)
                      setGameOver(false)
                      setWinner(null)
                      setMessages([])
                      setLastMove(null)
                      setCastlingRights({
                        white: { kingSide: true, queenSide: true },
                        black: { kingSide: true, queenSide: true }
                      })
                      setPromotionSquare(null)
                      if (isOnline) {
                        // Logic to restart online game would go here (e.g. emit 'rematch')
                      }
                    }}>
                      Play Again
                    </button>
                    <button className="theme-btn" onClick={() => {
                      setGameStarted(false)
                      setIsOnline(false)
                      setMessages([])
                      socket.disconnect()
                    }}>
                      Exit Menu
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default App
