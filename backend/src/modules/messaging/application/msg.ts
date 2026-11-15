import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Clock, IdGenerator, TransactionRunner } from '../../../shared-kernel/ports.js';
import type {
  AssertConversationParticipantRequestDTO,
  AssertConversationParticipantResponseDTO,
  FindConversationRequestDTO,
  FindConversationResponseDTO,
  SendMessageRequestDTO,
  SendMessageResponseDTO,
} from '../dto/msg.dto.js';
import type { IConversationRepository, IdentityForMessaging } from '../ports/msg.js';

// Inbound ports (use cases) — MSG in-app, contracts.md §9.

/** Guard. FR-MSG-7. ConversationNotVisibleToCaller, identical body for unknown ids. */
export interface IAssertConversationParticipantUseCase {
  assertConversationParticipant(input: AssertConversationParticipantRequestDTO): Promise<AssertConversationParticipantResponseDTO>;
}

/** Contended mutation. AD-MSG-2. One conversation per pair; one message per clientMessageId. */
export interface ISendMessageUseCase {
  sendMessage(input: SendMessageRequestDTO): Promise<SendMessageResponseDTO>;
}

/** Resolver. FR-MSG-4. null when the pair has no conversation. */
export interface IFindConversationUseCase {
  findConversation(input: FindConversationRequestDTO): Promise<FindConversationResponseDTO>;
}

export type MsgUseCases = IAssertConversationParticipantUseCase & ISendMessageUseCase & IFindConversationUseCase;

export interface MsgDeps {
  conversations: IConversationRepository;
  identity: IdentityForMessaging;
  transactions: TransactionRunner;
  clock: Clock;
  ids: IdGenerator;
}

/** Interface stub (Solutioning stop-point). */
export class MsgService implements MsgUseCases {
  constructor(protected readonly deps: MsgDeps) {}

  async assertConversationParticipant(_input: AssertConversationParticipantRequestDTO): Promise<AssertConversationParticipantResponseDTO> {
    throw new NotImplementedError('messaging.assertConversationParticipant');
  }

  async sendMessage(_input: SendMessageRequestDTO): Promise<SendMessageResponseDTO> {
    throw new NotImplementedError('messaging.sendMessage');
  }

  async findConversation(_input: FindConversationRequestDTO): Promise<FindConversationResponseDTO> {
    throw new NotImplementedError('messaging.findConversation');
  }
}
