import { quorumService } from '~/service/quorum';

export default () => `https://127.0.0.1:${quorumService.state.port}`;
