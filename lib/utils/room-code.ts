export function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}
