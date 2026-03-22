export type PerbugTipStatus = "created" | "awaiting_signature" | "submitted" | "confirmed" | "failed" | "canceled";

export interface PerbugVideoTipIntent {
  id: string;
  videoId: string;
  placeId?: string;
  senderUserId: string;
  senderWalletPublicKey: string;
  recipientUserId: string;
  recipientCreatorProfileId?: string;
  recipientWalletPublicKey: string;
  grossAmountAtomic: bigint;
  platformFeeAtomic: bigint;
  recipientNetAtomic: bigint;
  note?: string;
  status: PerbugTipStatus;
  transactionSignature?: string;
  explorerUrl?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
}

export interface VideoTipSummary {
  videoId: string;
  totalTipsCount: number;
  grossAmountAtomic: bigint;
  netToCreatorAtomic: bigint;
  platformFeeAtomic: bigint;
  latestTipAt?: string;
}

export interface PerbugTipLedgerEvent {
  id: string;
  tipIntentId: string;
  status: PerbugTipStatus;
  createdAt: string;
  payload?: Record<string, unknown>;
}

export interface PerbugTipsStore {
  saveTipIntent(tip: PerbugVideoTipIntent): void;
  getTipIntent(id: string): PerbugVideoTipIntent | null;
  listTipsByVideo(videoId: string): PerbugVideoTipIntent[];
  listTipsBySender(userId: string): PerbugVideoTipIntent[];
  listTipsByRecipient(recipientUserId: string): PerbugVideoTipIntent[];
  saveLedgerEvent(event: PerbugTipLedgerEvent): void;
  listLedgerEvents(tipIntentId: string): PerbugTipLedgerEvent[];
}

export interface PerbugTipTransferResult {
  signature: string;
  explorerUrl: string;
}

export interface PerbugTipsAdapter {
  submitTransfer(input: { fromWallet: string; toWallet: string; amountAtomic: bigint; memo: string; idempotencyKey: string }): Promise<PerbugTipTransferResult>;
}
