const STORAGE_KEY = 'movievault_user';

export function getUsername(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setUsername(name: string): void {
  localStorage.setItem(STORAGE_KEY, name);
}

export function clearUsername(): void {
  localStorage.removeItem(STORAGE_KEY);
}
