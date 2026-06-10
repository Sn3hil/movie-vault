export class RoomBroadcaster {
  private controllers = new Set<ReadableStreamDefaultController>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs: number;

  constructor(debounceMs = 200) {
    this.debounceMs = debounceMs;
  }

  addController(controller: ReadableStreamDefaultController) {
    this.controllers.add(controller);
  }

  removeController(controller: ReadableStreamDefaultController) {
    this.controllers.delete(controller);
  }

  broadcast(event: string, data?: string) {
    const encoder = new TextEncoder();
    const message = data
      ? `event: ${event}\ndata: ${data}\n\n`
      : `event: ${event}\ndata:\n\n`;

    for (const controller of this.controllers) {
      try {
        controller.enqueue(encoder.encode(message));
      } catch {
        this.controllers.delete(controller);
      }
    }
  }

  debouncedNotify(event: string, data?: string) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.broadcast(event, data);
      this.debounceTimer = null;
    }, this.debounceMs);
  }
}

export const roomBroadcaster = new RoomBroadcaster();
