import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import {
  type IdentityRegistryPrivateState,
  type Contract,
  type Witnesses,
} from '@bricktowers/signature-registry-contract';

export type IdentityRegistryPrivateStates = Record<string, IdentityRegistryPrivateState>;

export type IdentityRegistryContract = Contract<IdentityRegistryPrivateState, Witnesses<IdentityRegistryPrivateState>>;

export type IdentityRegistryCircuitKeys = Exclude<keyof IdentityRegistryContract['impureCircuits'], number | symbol>;

export type IdentityRegistryProviders = MidnightProviders<IdentityRegistryCircuitKeys, IdentityRegistryPrivateStates>;

export type DeployedIdentityRegistryContract = FoundContract<IdentityRegistryPrivateState, IdentityRegistryContract>;

export type IdentityRegistryDerivedState = {
  readonly whoami: string;
};

export const emptyState: IdentityRegistryDerivedState = {
  whoami: 'unknown',
};

