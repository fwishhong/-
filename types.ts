import React from 'react';

export enum GameState {
  MENU = 'MENU',
  INSTRUCTION = 'INSTRUCTION', // The "GET READY" or "CALCULATE" flash
  PLAYING = 'PLAYING',
  RESULT = 'RESULT', // Success or Fail animation
  GAME_OVER = 'GAME_OVER'
}

export enum GameType {
  REFLEX = 'REFLEX',
  MATH = 'MATH',
  STROOP = 'STROOP',
  CUBE_3D = 'CUBE_3D',
  MEMORY = 'MEMORY'
}

export interface MicroGameProps {
  difficulty: number; // 1 to 10, affects speed or complexity
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

export interface GameDefinition {
  type: GameType;
  instruction: string;
  durationMs: number; // Base duration
  Component: React.FC<MicroGameProps>;
}

export interface ScoreEntry {
  date: string;
  score: number;
}