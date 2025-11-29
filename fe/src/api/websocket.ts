/**
 * WebSocket client for realtime price updates
 * Connects to backend WebSocket server at ws://localhost:3000/ws/prices
 */

export class PriceWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private subscriptions = new Set<string>();
  private listeners = new Map<string, Set<(data: any) => void>>();

  constructor(url = 'ws://localhost:3000/ws/prices', token: string | null = null) {
    this.url = url;
    this.token = token;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const wsUrl = this.token ? `${this.url}?token=${this.token}` : this.url;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('connect');
        resolve();

        // Resubscribe to previous subscriptions
        if (this.subscriptions.size > 0) {
          this.subscribe(Array.from(this.subscriptions));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        this.emit('error', error);
        reject(error);
      };

      this.ws.onclose = () => {
        this.emit('disconnect');
        this.attemptReconnect();
      };
    });
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay);
    }
  }

  private handleMessage(message: any) {
    if (message.type === 'price') {
      this.emit('price', message);
    } else if (message.type === 'connected') {
      this.emit('connected', message);
    } else if (message.type === 'subscribed') {
      this.emit('subscribed', message);
    } else if (message.type === 'error') {
      this.emit('error', message);
    }
  }

  subscribe(symbols: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, will subscribe after connection');
      symbols.forEach((s) => this.subscriptions.add(s.toUpperCase()));
      return;
    }

    const normalized = symbols.map((s) => s.toUpperCase());
    normalized.forEach((s) => this.subscriptions.add(s));

    this.send({
      action: 'subscribe',
      symbols: normalized
    });
  }

  unsubscribe(symbols: string[]) {
    const normalized = symbols.map((s) => s.toUpperCase());
    normalized.forEach((s) => this.subscriptions.delete(s));

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        action: 'unsubscribe',
        symbols: normalized
      });
    }
  }

  private send(data: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

