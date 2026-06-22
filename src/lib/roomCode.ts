const KEY = "chhummy_room_code";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/I/1 to avoid ambiguity

export function getRoomCode(): string | null {
  return localStorage.getItem(KEY);
}

export function setRoomCode(code: string): void {
  localStorage.setItem(KEY, code.toUpperCase());
}

export function clearRoomCode(): void {
  localStorage.removeItem(KEY);
}

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
