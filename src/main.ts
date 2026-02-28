const main = async (): Promise<void> => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }
  console.warn('NEXUS ARENA initializing...');
};

main().catch(console.error);
