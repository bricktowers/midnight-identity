import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { type Logger } from 'pino';
import {
  type DeployedIdentityRegistryContract,
  emptyState,
  type IdentityRegistryContract,
  type IdentityRegistryDerivedState,
  type IdentityRegistryProviders,
} from './common-types.js';
import { Contract, CurvePoint, ledger, witnesses } from '@bricktowers/signature-registry-contract';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, type Observable, retry, scan } from 'rxjs';
import * as utils from './utils/index.js';

const contract: IdentityRegistryContract = new Contract(witnesses);

export interface DeployedIdentityAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<IdentityRegistryDerivedState>;
  register: (pk: CurvePoint) => Promise<void>;
}

export class IdentityAPI implements DeployedIdentityAPI {
  private constructor(
    public readonly deployedContract: DeployedIdentityRegistryContract,
    public readonly providers: IdentityRegistryProviders,
    private readonly logger: Logger,
  ) {
    const combine = (
      acc: IdentityRegistryDerivedState,
      value: IdentityRegistryDerivedState,
    ): IdentityRegistryDerivedState => {
      return {
        whoami: value.whoami,
      };
    };

    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.state$ = combineLatest(
      [
        providers.publicDataProvider
          .contractStateObservable(this.deployedContractAddress, { type: 'all' })
          .pipe(map((contractState) => ledger(contractState.data))),
      ],
      (ledgerState) => {
        const result: IdentityRegistryDerivedState = {
          whoami: 'unknown',
        };
        return result;
      },
    ).pipe(
      scan(combine, emptyState),
      retry({
        // sometimes websocket fails which is why we retry
        delay: 500,
      }),
    );
  }

  readonly deployedContractAddress: ContractAddress;

  readonly state$: Observable<IdentityRegistryDerivedState>;

  async register(pk: CurvePoint): Promise<void> {
    await this.deployedContract.callTx.register(pk);
  }

  static async deploy(providers: IdentityRegistryProviders, logger: Logger): Promise<IdentityAPI> {
    const deployedContract = await deployContract(providers, {
      privateStateKey: 'identityRegistry',
      initialPrivateState: { localSecretKey: utils.randomBytes(32) },
      contract: contract,
    });

    return new IdentityAPI(deployedContract, providers, logger);
  }

  static async subscribe(
    providers: IdentityRegistryProviders,
    contractAddress: ContractAddress,
    logger: Logger,
  ): Promise<IdentityAPI> {
    const deployedGameContract = await findDeployedContract(providers, {
      privateStateKey: 'identityRegistry',
      contractAddress,
      contract: contract,
    });

    return new IdentityAPI(deployedGameContract, providers, logger);
  }
}

export * from './utils/index.js';
export * from './common-types.js';
