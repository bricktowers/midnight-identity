import { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Contract as ContractType, Witnesses } from './managed/registry/contract/index.cjs';
import ContractModule, { Ledger } from './managed/registry/contract/index.cjs';

export * from './managed/registry/contract/index.cjs';
export const ledger = ContractModule.ledger;
export const pureCircuits = ContractModule.pureCircuits;
export const { Contract } = ContractModule;
export type Contract<T, W extends Witnesses<T> = Witnesses<T>> = ContractType<T, W>;

export type IdentityRegistryPrivateState = {
  readonly localSecretKey: Uint8Array;
};

export const witnesses = {
  local_secret_key: ({
    privateState,
  }: WitnessContext<Ledger, IdentityRegistryPrivateState>): [IdentityRegistryPrivateState, Uint8Array] => [
    privateState,
    privateState.localSecretKey,
  ],
};
