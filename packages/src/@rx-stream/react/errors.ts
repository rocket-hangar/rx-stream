export class AbortStream extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'AbortStream';
  }
}
