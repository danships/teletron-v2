export type Session = {
  id: string;
  tokenId: string;
  nodeId: string;
  displayAddresses: string[];
  close: (code: number) => void;
};
export type Log = (entry: Record<string, string | number>) => void;
export class SessionRegistry {
  private readonly sessions = new Map<string, Session>();
  constructor(private readonly log: Log) {}
  current(tokenId: string) {
    return this.sessions.get(tokenId);
  }
  install(session: Session) {
    const old = this.current(session.tokenId);
    this.sessions.set(session.tokenId, session);
    const identity = { nodeId: session.nodeId, tokenId: session.tokenId, sessionId: session.id };
    this.log({ event: 'present', ...identity });
    if (old) {
      this.log({ event: 'takeover', ...identity, oldSessionId: old.id });
      old.close(4010);
    }
  }
  remove(session: Session) {
    if (this.current(session.tokenId)?.id === session.id) this.sessions.delete(session.tokenId);
    this.log({ event: 'absent', nodeId: session.nodeId, tokenId: session.tokenId, sessionId: session.id });
  }
  closeByTokenId(id: string, code: number) {
    this.current(id)?.close(code);
  }
}
