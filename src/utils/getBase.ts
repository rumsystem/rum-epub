import type { quorumService } from '~/service';

export const getBase = () => `http://127.0.0.1:${((window as any).quorumService as typeof quorumService).state.port}`;
