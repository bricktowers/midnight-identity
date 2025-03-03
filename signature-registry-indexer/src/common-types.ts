import type { ContractState } from '@midnight-ntwrk/ledger';
import { type CurvePoint } from '@midnight-ntwrk/compact-runtime';

export type Config = {
  indexerUri: string;
  indexerWsUri: string;
  projectId: string;
  networkId: string;
};

export type Transaction = {
  hash: string;
  identifiers: string[];
  contractCalls: Array<{
    address: string;
    __typename: string;
  }>;
};

export type ContractStateUpdateBlock = {
  height: number;
  contracts: ExtractedContractRecord[];
};

export type ContractStateAddress = {
  address: string;
  state: ContractState;
};

export type StreamElementData = {
  blocks: {
    height: number;
    hash: string;
    transactions: Transaction[];
  };
};

export type ExtractedContractRecord = {
  walletPublicKey: string;
  signingPublicKey: CurvePoint;
};
