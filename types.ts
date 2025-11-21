import React from 'react';

export type Language = 'EN' | 'CN';

export enum GameState {
  MENU = 'MENU',
  INSTRUCTION = 'INSTRUCTION', // The "GET READY" or "CALCULATE" flash
  PLAYING = 'PLAYING',
  RESULT = 'RESULT', // Success or Fail animation
  GAME_OVER = 'GAME_OVER'
}

export enum GameType {
  REFLEX_HUNT = 'REFLEX_HUNT',
  MEMORY_SIMON = 'MEMORY_SIMON',
  MATH_COMPARE = 'MATH_COMPARE',
  VISUAL_SPIN = 'VISUAL_SPIN',
  LOGIC_TRAP = 'LOGIC_TRAP',
  ACTION_MASH = 'ACTION_MASH',
  REFLEX_MOLE = 'REFLEX_MOLE', // Replaces MATH_COUNT
  REACTION_WAIT = 'REACTION_WAIT',
  DIRECTION_SWIPE = 'DIRECTION_SWIPE',
  MATH_ORDER = 'MATH_ORDER',
  SPATIAL_FIT = 'SPATIAL_FIT',
  VISUAL_ODD = 'VISUAL_ODD',
  LOGIC_MIX = 'LOGIC_MIX',
  TIMING_CHARGE = 'TIMING_CHARGE',
  VISUAL_SHADOW = 'VISUAL_SHADOW',
  MEMORY_MATCH = 'MEMORY_MATCH'
}

export interface AssetPack {
  themeName: string;
  primary: string; // Base64 image URL
  secondary: string; // Base64 image URL
}

export interface MicroGameProps {
  difficulty: number; // 1 to 10, affects speed or complexity
  score: number; // Current player score for granular scaling
  onComplete: (success: boolean) => void;
  isActive: boolean;
  assets?: AssetPack | null;
  language: Language;
}

export interface GameDefinition {
  type: GameType;
  instructionEn: string;
  instructionCn: string;
  durationMs: number; // Base duration
  Component: React.FC<MicroGameProps>;
}

export interface ScoreEntry {
  date: string;
  score: number;
}