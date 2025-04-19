class ScrabbleGame {
  constructor() {
    this.board = Array(15).fill().map(() => Array(15).fill(null));
    this.players = new Map();
    this.tileBag = this.createTileBag();
    this.currentTurn = null;
    this.lastMove = null;
  }

  createTileBag() {
    const tiles = [];
    const tileDist = [
      { letter: 'A', score: 1, count: 9 }, { letter: 'B', score: 3, count: 2 },
      { letter: 'C', score: 3, count: 2 }, { letter: 'D', score: 2, count: 4 },
      { letter: 'E', score: 1, count: 12 }, { letter: 'F', score: 4, count: 2 },
      { letter: 'G', score: 2, count: 3 }, { letter: 'H', score: 4, count: 2 },
      { letter: 'I', score: 1, count: 9 }, { letter: 'J', score: 8, count: 1 },
      { letter: 'K', score: 5, count: 1 }, { letter: 'L', score: 1, count: 4 },
      { letter: 'M', score: 3, count: 2 }, { letter: 'N', score: 1, count: 6 },
      { letter: 'O', score: 1, count: 8 }, { letter: 'P', score: 3, count: 2 },
      { letter: 'Q', score: 10, count: 1 }, { letter: 'R', score: 1, count: 6 },
      { letter: 'S', score: 1, count: 4 }, { letter: 'T', score: 1, count: 6 },
      { letter: 'U', score: 1, count: 4 }, { letter: 'V', score: 4, count: 2 },
      { letter: 'W', score: 4, count: 2 }, { letter: 'X', score: 8, count: 1 },
      { letter: 'Y', score: 4, count: 2 }, { letter: 'Z', score: 10, count: 1 },
      { letter: '*', score: 0, count: 2 }
    ];

    tileDist.forEach(({letter, score, count}) => {
      for (let i = 0; i < count; i++) {
        tiles.push({ letter, score });
      }
    });

    return this.shuffle(tiles);
  }

  shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  addPlayer(playerId) {
    const playerTiles = [];
    for (let i = 0; i < 7; i++) {
      if (this.tileBag.length > 0) {
        playerTiles.push(this.tileBag.pop());
      }
    }
    this.players.set(playerId, {
      tiles: playerTiles,
      score: 0
    });
    if (!this.currentTurn) {
      this.currentTurn = playerId;
    }
    return playerTiles;
  }

  getPlayerTiles(playerId) {
    return this.players.get(playerId)?.tiles || [];
  }

  async makeMove(playerId, placedTiles) {
    if (this.currentTurn !== playerId) return false;

    // Validate word placement
    if (!this.isValidPlacement(placedTiles)) {
      return false;
    }

    // Apply the move
    const score = this.calculateScore(placedTiles);
    const player = this.players.get(playerId);
    player.score += score;

    // Draw new tiles
    const newTiles = [];
    for (let i = 0; i < placedTiles.length; i++) {
      if (this.tileBag.length > 0) {
        newTiles.push(this.tileBag.pop());
      }
    }
    player.tiles = player.tiles.concat(newTiles);

    // Update game state
    this.lastMove = placedTiles;
    
    // Move to next player
    const playerIds = Array.from(this.players.keys());
    const currentIndex = playerIds.indexOf(this.currentTurn);
    this.currentTurn = playerIds[(currentIndex + 1) % playerIds.length];

    return true;
  }

  isValidPlacement(placedTiles) {
    // Basic validation - tiles must be in a line (horizontal or vertical)
    if (placedTiles.length === 0) return false;
    if (placedTiles.length === 1) return true;

    const rows = placedTiles.map(t => t.row);
    const cols = placedTiles.map(t => t.col);

    const isHorizontal = new Set(rows).size === 1;
    const isVertical = new Set(cols).size === 1;

    if (!isHorizontal && !isVertical) return false;

    // Check for continuity
    if (isHorizontal) {
      const row = rows[0];
      const sortedCols = [...cols].sort((a, b) => a - b);
      for (let i = 1; i < sortedCols.length; i++) {
        if (sortedCols[i] !== sortedCols[i-1] + 1) return false;
      }
    } else {
      const col = cols[0];
      const sortedRows = [...rows].sort((a, b) => a - b);
      for (let i = 1; i < sortedRows.length; i++) {
        if (sortedRows[i] !== sortedRows[i-1] + 1) return false;
      }
    }

    return true;
  }

  calculateScore(placedTiles) {
    let score = 0;
    const wordMultiplier = 1; // TODO: Implement word multipliers (DW, TW)

    placedTiles.forEach(({row, col, tile}) => {
      let letterScore = tile.score;
      // TODO: Implement letter multipliers (DL, TL)
      score += letterScore;
    });

    return score * wordMultiplier;
  }

  getGameState() {
    return {
      board: this.board,
      players: Array.from(this.players.entries()).map(([id, data]) => ({
        id,
        score: data.score
      })),
      currentTurn: this.currentTurn,
      lastMove: this.lastMove,
      remainingTiles: this.tileBag.length
    };
  }
}

module.exports = { ScrabbleGame };
