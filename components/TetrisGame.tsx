'use client'

import { useState, useEffect, useCallback } from 'react'

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const INITIAL_SPEED = 800

type Shape = number[][]
type Color = string

const SHAPES: Shape[] = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 0, 0], [1, 1, 1]], // L
    [[0, 0, 1], [1, 1, 1]], // J
    [[0, 1, 1], [1, 1, 0]], // S
    [[1, 1, 0], [0, 1, 1]]  // Z
]

const COLORS: Color[] = [
    'bg-cyan-400',
    'bg-yellow-400',
    'bg-purple-400',
    'bg-orange-400',
    'bg-blue-400',
    'bg-green-400',
    'bg-red-400'
]

const createBoard = () => Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0))

export function TetrisGame() {
    const [board, setBoard] = useState(createBoard())
    const [currentPiece, setCurrentPiece] = useState<{ shape: Shape, x: number, y: number, color: string } | null>(null)
    const [score, setScore] = useState(0)
    const [gameOver, setGameOver] = useState(false)

    const spawnPiece = useCallback(() => {
        const typeId = Math.floor(Math.random() * SHAPES.length)
        const shape = SHAPES[typeId]
        const color = COLORS[typeId]
        setCurrentPiece({
            shape,
            x: Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2),
            y: 0,
            color
        })
    }, [])

    const checkCollision = useCallback((piece: { shape: Shape, x: number, y: number }, boardState: any[][]) => {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const newY = piece.y + y
                    const newX = piece.x + x
                    if (
                        newX < 0 ||
                        newX >= BOARD_WIDTH ||
                        newY >= BOARD_HEIGHT ||
                        (newY >= 0 && boardState[newY][newX])
                    ) {
                        return true
                    }
                }
            }
        }
        return false
    }, [])

    const mergeBoard = useCallback(() => {
        if (!currentPiece) return
        const newBoard = [...board.map(row => [...row])]

        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    if (currentPiece.y + y < 0) {
                        setGameOver(true)
                        return
                    }
                    newBoard[currentPiece.y + y][currentPiece.x + x] = currentPiece.color
                }
            }
        }

        // Check for lines
        let linesCleared = 0
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (newBoard[y].every(cell => cell !== 0)) {
                newBoard.splice(y, 1)
                newBoard.unshift(Array(BOARD_WIDTH).fill(0))
                linesCleared++
                y++ // Recheck same row index
            }
        }

        if (linesCleared > 0) {
            setScore(prev => prev + (linesCleared * 100))
        }

        setBoard(newBoard)
        spawnPiece()
    }, [board, currentPiece, spawnPiece])

    useEffect(() => {
        if (!currentPiece && !gameOver) {
            spawnPiece()
        }
    }, [currentPiece, gameOver, spawnPiece])

    useEffect(() => {
        if (gameOver || !currentPiece) return

        const interval = setInterval(() => {
            if (!checkCollision({ ...currentPiece, y: currentPiece.y + 1 }, board)) {
                setCurrentPiece(prev => prev ? { ...prev, y: prev.y + 1 } : null)
            } else {
                mergeBoard()
            }
        }, INITIAL_SPEED)

        return () => clearInterval(interval)
    }, [currentPiece, board, checkCollision, mergeBoard, gameOver])

    const move = (dir: number) => {
        if (!currentPiece || gameOver) return
        if (!checkCollision({ ...currentPiece, x: currentPiece.x + dir }, board)) {
            setCurrentPiece(prev => prev ? { ...prev, x: prev.x + dir } : null)
        }
    }

    const rotate = () => {
        if (!currentPiece || gameOver) return
        const rotated = currentPiece.shape[0].map((_, i) => currentPiece.shape.map(row => row[i]).reverse())
        if (!checkCollision({ ...currentPiece, shape: rotated }, board)) {
            setCurrentPiece(prev => prev ? { ...prev, shape: rotated } : null)
        }
    }

    const drop = () => {
        if (!currentPiece || gameOver) return
        let dropY = currentPiece.y
        while (!checkCollision({ ...currentPiece, y: dropY + 1 }, board)) {
            dropY++
        }
        setCurrentPiece(prev => prev ? { ...prev, y: dropY } : null)
        // Don't merge immediately here, let next tick handle it or require hard drop logic
    }

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameOver) return
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault()
            }
            if (e.key === 'ArrowLeft') move(-1)
            if (e.key === 'ArrowRight') move(1)
            if (e.key === 'ArrowUp') rotate()
            if (e.key === 'ArrowDown') drop()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentPiece, board, gameOver])


    return (
        <div className="flex flex-col items-center bg-white/90 dark:bg-gray-800/90 p-6 rounded-2xl shadow-xl backdrop-blur-sm border-2 border-purple-200 dark:border-purple-800">
            <h3 className="text-xl font-bold mb-4 text-purple-600 dark:text-purple-400 font-display">
                Waiting for Magic... Play Tetris!
            </h3>

            <div className="relative border-4 border-gray-300 dark:border-gray-600 bg-gray-900 rounded-lg overflow-hidden mb-4">
                {board.map((row, y) => (
                    <div key={y} className="flex">
                        {row.map((cell, x) => {
                            let cellColor = cell || 'bg-gray-800/50'

                            // Draw active piece
                            if (currentPiece) {
                                const pieceY = y - currentPiece.y
                                const pieceX = x - currentPiece.x
                                if (
                                    pieceY >= 0 &&
                                    pieceY < currentPiece.shape.length &&
                                    pieceX >= 0 &&
                                    pieceX < currentPiece.shape[0].length &&
                                    currentPiece.shape[pieceY][pieceX]
                                ) {
                                    cellColor = currentPiece.color
                                }
                            }

                            return (
                                <div
                                    key={`${x}-${y}`}
                                    className={`w-5 h-5 border border-white/5 ${cellColor}`}
                                />
                            )
                        })}
                    </div>
                ))}
                {gameOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white font-bold text-xl">
                        GAME OVER
                    </div>
                )}
            </div>

            <div className="flex justify-between w-full text-sm font-bold text-gray-600 dark:text-gray-300">
                <span>Score: {score}</span>
                <span>Controls: Arrows</span>
            </div>
        </div>
    )
}
