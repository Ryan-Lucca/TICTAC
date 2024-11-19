const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const games = {}; // Armazena os jogos

io.on("connection", (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    socket.on("joinGame", (gameId) => {
        if (!games[gameId]) {
            games[gameId] = { players: [], board: Array(9).fill(null), currentPlayer: 1 };
        }

        const game = games[gameId];
        if (game.players.length < 2) {
            game.players.push(socket.id);
            socket.join(gameId);
            socket.emit("gameJoined", { board: game.board, player: game.players.length });

            if (game.players.length === 2) {
                io.to(gameId).emit("startGame", { currentPlayer: game.currentPlayer });
            }
        }
    });

    socket.on("makeMove", ({ gameId, index, player }) => {
        const game = games[gameId];

        if (game && game.board[index] === null && game.currentPlayer === player) {
            // Atualiza o tabuleiro
            game.board[index] = player === 1 ? "X" : "O";

            // Verifica vitória ou empate
            const winner = checkWinner(game.board);
            if (winner) {
                io.to(gameId).emit("gameOver", { winner });
                delete games[gameId];
            } else if (game.board.every((cell) => cell !== null)) {
                io.to(gameId).emit("gameOver", { winner: "draw" });
                delete games[gameId];
            } else {
                // Alterna o jogador atual
                game.currentPlayer = player === 1 ? 2 : 1;
                io.to(gameId).emit("updateBoard", { board: game.board, currentPlayer: game.currentPlayer });
            }
        }
    });

    socket.on("disconnect", () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

// Função para verificar vitória
function checkWinner(board) {
    const winConditions = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];

    for (let condition of winConditions) {
        const [a, b, c] = condition;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

// Servir os arquivos estáticos (HTML, CSS, JS)
app.use(express.static("public"));

// Inicia o servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
