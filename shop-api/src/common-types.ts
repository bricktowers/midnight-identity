import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type ShopPrivateState, type Contract, type Witnesses } from '@bricktowers/shop-contract';

export type ShopPrivateStates = Record<string, ShopPrivateState>;

export type ShopContract = Contract<ShopPrivateState, Witnesses<ShopPrivateState>>;

export type ShopCircuitKeys = Exclude<keyof ShopContract['impureCircuits'], number | symbol>;

export type ShopMidnightProviders = MidnightProviders<ShopCircuitKeys, ShopPrivateStates>;

export type DeployedShopContract = FoundContract<ShopPrivateState, ShopContract>;

export type ShopDerivedState = {
  readonly whoami: string;
};

export const emptyState: ShopDerivedState = {
  whoami: 'unknown',
};
