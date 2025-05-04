import React, { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
//import stockfish from 'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/+esm'

// Function to extract best move and evaluation from Stockfish's message
const getEvaluation = (message, turn) => {
  let result = { bestMove: "", evaluation: "" }; // Initialize with default values
  console.log("Stockfish message:", message); // Log the message for debugging

  // Check for "bestmove" in the message to get the best move
  if (message.startsWith("bestmove")) {
    result.bestMove = message.split(" ")[1];
  }

  // Check for "info score" message to get the evaluation
  if (message.includes("info") && message.includes("score")) {
    const scoreParts = message.split(" ");
    const scoreIndex = scoreParts.indexOf("score") + 2; // "cp" or "mate" is two words after "score"
    console.log("Score parts:", scoreParts); // Log the score parts for debugging
    console.log("Score index:", scoreIndex); // Log the score index for debugging

    if (scoreParts[scoreIndex - 1] === "cp") {
      // Extract centipawn evaluation and adjust based on turn
      let score = parseInt(scoreParts[scoreIndex], 10);
      if (turn !== "b") {
        score = -score; // Invert score if it was Black's turn
      }
      result.evaluation = `${score / 100}`; // Convert centipawns to pawns

    } else if (scoreParts[scoreIndex - 1] === "mate") {
      // Extract mate score if available
      const mateIn = parseInt(scoreParts[scoreIndex], 10);
      result.evaluation = `Mate in ${Math.abs(mateIn)}`;
    }
  }

  return result;
};

const App = () => {
  const [game, setGame] = useState(new Chess());
  const [stockfish, setStockfish] = useState(null);
  const [bestMove, setBestMove] = useState("");
  const [evaluation, setEvaluation] = useState(""); // State to store Stockfish's evaluation
  // State variables for tracking the last move's from and to squares
  const [fromSquare, setFromSquare] = useState(null); // Holds the starting square of the last move
  const [toSquare, setToSquare] = useState(null);     // Holds the destination square of the last move

  useEffect(() => {
    // Load Stockfish as a Web Worker once when the component mounts
    // Use import.meta.env.BASE_URL to ensure the path is correct in development and production
    const stockfishWorker = new Worker(`${import.meta.env.BASE_URL}js/stockfish-16.1-lite-single.js`);

    setStockfish(stockfishWorker);
    return () => {
      stockfishWorker.terminate(); // Clean up the worker when the component unmounts
    };
  }, []);

  const onDrop = (sourceSquare, targetSquare) => {
    const gameCopy = new Chess(game.fen()); // Clone the current game state

    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // Always promote to a queen for simplicity
      });

      if (move === null) {
        return false; // Invalid move
      }

      setGame(gameCopy);

      // Update last move states for highlighting
      setFromSquare(sourceSquare); // Update the starting square of the last move
      setToSquare(targetSquare);   // Update the destination square of the last move

      // Send the updated position to Stockfish to calculate the best move and evaluation
      if (stockfish) {
        stockfish.postMessage(`position fen ${gameCopy.fen()}`);
        stockfish.postMessage("go depth 15"); // Set depth for Stockfish analysis

        // Listen for Stockfish messages and update best move and evaluation
        stockfish.onmessage = (event) => {
          const { bestMove, evaluation } = getEvaluation(event.data, game.turn());
          if (bestMove) setBestMove(bestMove);
          if (evaluation) setEvaluation(evaluation);
        };
      }

      return true; // Valid move
    } catch (error) {
      console.error(error.message);
      return false; // Catch any error and return false
    }
  };

  const getSquareStyles = () => {
    const styles = {}; // Initialize an empty object for square styles
    if (fromSquare) {
      styles[fromSquare] = { backgroundColor: "rgba(173, 216, 230, 0.8)" }; // Light blue for the from-square
    }
    if (toSquare) {
      styles[toSquare] = { backgroundColor: "rgba(144, 238, 144, 0.8)" }; // Light green for the to-square
    }
    return styles; // Return the styles object
  };


  return (
    <div>
      <h1>Chess Game with Stockfish</h1>
      <Chessboard
        position={game.fen()}
        onPieceDrop={onDrop}
        boardWidth={500} // Set the board width to 500px
        customSquareStyles={getSquareStyles()} // Apply last move highlight styles
      />
      <div>
        <h3>Best Move: {bestMove || "Calculating..."}</h3>
        <h3>Evaluation: {evaluation || "Evaluating..."}</h3>
      </div>
    </div>
  );
};

export default App;
