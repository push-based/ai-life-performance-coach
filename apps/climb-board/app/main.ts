import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { BoardComponent, type BoardInput, type Drawing } from './board';

declare global {
  interface Window {
    climbBoard?: {
      load(input: BoardInput): void;
      addGroup(): void;
      drawing(): Drawing;
    };
  }
}

bootstrapApplication(BoardComponent, {
  providers: [provideZonelessChangeDetection()],
})
  .then((ref) => {
    const board = ref.components[0].instance as BoardComponent;
    window.climbBoard = {
      load: (input) => {
        board.load(input);
        ref.tick();
      },
      addGroup: () => {
        board.addGroup();
        ref.tick();
      },
      drawing: () => board.drawing(),
    };
    window.dispatchEvent(new CustomEvent('climb-board:ready'));
  })
  .catch((err) => console.error('climb board', err));
