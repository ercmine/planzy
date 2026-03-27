export type DryadTipStatus = "created" | "awaiting_signature" | "submitted" | "confirmed" | "failed" | "canceled";

export interface DryadVideoTipIntent {
  id: string;
  videoId: string;
  treeId?: string;
  placeId?: string;
  senderUserId: string;
  senderWalletAddress: string;
  recipientUserId: string;
  recipientCreatorProfileId?: string;
  recipientWalletAddress: string;
  tipKind: "water_tree" | "direct_eth";
  network: "ethereum";
  grossAmountAtomic: bigint;
  platformFeeAtomic: bigint;
  recipientNetAtomic: bigint;
  note?: string;
  status: DryadTipStatus;
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

export interface DryadTipLedgerEvent {
  id: string;
  tipIntentId: string;
  status: DryadTipStatus;
  createdAt: string;
  payload?: Record<string, unknown>;
}

export interface DryadTipsStore {
  saveTipIntent(tip: DryadVideoTipIntent): void;
  getTipIntent(id: string): DryadVideoTipIntent | null;
  listTipsByVideo(videoId: string): DryadVideoTipIntent[];
  listTipsBySender(userId: string): DryadVideoTipIntent[];
  listTipsByRecipient(recipientUserId: string): DryadVideoTipIntent[];
  saveLedgerEvent(event: DryadTipLedgerEvent): void;
  listLedgerEvents(tipIntentId: string): DryadTipLedgerEvent[];
}

export interface DryadTipTransferResult {
  signature: string;
  explorerUrl: string;
}

export interface DryadTipsAdapter {
  submitTransfer(input: { fromWallet: string; toWallet: string; amountWei: bigint; memo: string; idempotencyKey: string }): Promise<DryadTipTransferResult>;
}
