import { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import { Contract as ContractType, Ledger, Order, SignedCredentialSubject, Witnesses } from './managed/shop/contract/index.cjs';
import ContractModule from './managed/shop/contract/index.cjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';

export * from './managed/shop/contract/index.cjs';
export const ledger = ContractModule.ledger;
export const pureCircuits = ContractModule.pureCircuits;
export const { Contract } = ContractModule;
export type Contract<T, W extends Witnesses<T> = Witnesses<T>> = ContractType<T, W>;

export type ShopPrivateState = {
  readonly orders: Record<string, Order>;
  readonly signedCredentialSubject?: SignedCredentialSubject;
};

export function createShopPrivateState(): ShopPrivateState {
  return {
    orders: {},
    signedCredentialSubject: undefined,
  };
}

export const witnesses = {
  get_order: ({ privateState }: WitnessContext<Ledger, ShopPrivateState>, orderId: Uint8Array): [ShopPrivateState, Order] => [
    privateState,
    privateState.orders[toHex(orderId)],
  ],
  get_identity: ({ privateState }: WitnessContext<Ledger, ShopPrivateState>): [ShopPrivateState, SignedCredentialSubject] => {
    if (privateState.signedCredentialSubject) {
      return [privateState, privateState.signedCredentialSubject];
    } else throw new Error('No identity found');
  },
};
