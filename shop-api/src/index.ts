import { type ContractAddress, CurvePoint, tokenType } from '@midnight-ntwrk/compact-runtime';
import { type Logger } from 'pino';
import {
  type ShopContract,
  type ShopDerivedState,
  type ShopMidnightProviders,
  type DeployedShopContract,
  type ShopPrivateStates,
  emptyState,
} from './common-types.js';
import {
  type ShopPrivateState,
  Contract,
  createShopPrivateState,
  ledger,
  pureCircuits,
  witnesses,
  type CoinInfo, Order, SignedCredentialSubject,
} from '@bricktowers/shop-contract';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, concat, defer, from, map, type Observable, retry, scan, Subject } from 'rxjs';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils';
import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types/dist/private-state-provider';
import { encodeCoinInfo, encodeContractAddress } from '@midnight-ntwrk/ledger';

const contract: ShopContract = new Contract(witnesses);

export interface DeployedShopAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<ShopDerivedState>;
  submit_order: (order: Order, signedCredentialsSubject?: SignedCredentialSubject) => Promise<void>;
  coin: (value: bigint) => CoinInfo;
}

export class ShopAPI implements DeployedShopAPI {
  private constructor(
    public readonly tokenContractAddress: ContractAddress,
    public readonly deployedContract: DeployedShopContract,
    public readonly providers: ShopMidnightProviders,
    private readonly logger: Logger,
  ) {
    const combine = (acc: ShopDerivedState, value: ShopDerivedState): ShopDerivedState => {
      return {
        whoami: value.whoami,
      };
    };

    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.privateStates$ = new Subject<ShopPrivateState>();
    this.state$ = combineLatest(
      [
        providers.publicDataProvider
          .contractStateObservable(this.deployedContractAddress, { type: 'all' })
          .pipe(map((contractState) => ledger(contractState.data))),
        concat(
          from(defer(() => providers.privateStateProvider.get('initial') as Promise<ShopPrivateState>)),
          this.privateStates$,
        ),
      ],
      (ledgerState, privateState) => {
        const result: ShopDerivedState = {
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

  readonly state$: Observable<ShopDerivedState>;

  readonly privateStates$: Subject<ShopPrivateState>;

  async submit_order(order: Order, signedCredentialSubject?: SignedCredentialSubject): Promise<void> {
    const orderId = toHex(order.id);
    const initialState = await ShopAPI.getOrCreateInitialPrivateState(this.providers.privateStateProvider);
    const newState: ShopPrivateState = {
      ...initialState,
      orders: {
        ...initialState.orders,
        [orderId]: order,
      },
      signedCredentialSubject,
    };
    await this.providers.privateStateProvider.set('initial', newState);
    this.privateStates$.next(newState);
    await this.deployedContract.callTx.submit_order(order.id);
  }

  coin(value: bigint): CoinInfo {
    return encodeCoinInfo({
      type: tokenType(utils.pad('brick_towers_coin', 32), this.tokenContractAddress),
      nonce: toHex(utils.randomBytes(32)),
      value,
    });
  }

  static async deploy(
    tokenContractAddress: string,
    providers: ShopMidnightProviders,
    logger: Logger,
  ): Promise<ShopAPI> {
    const trustedIssuerPublicKey: CurvePoint = {
      x: 0n,
      y: 0n,
    };
    const deployedContract = await deployContract(providers, {
      privateStateKey: 'initial',
      contract: contract,
      initialPrivateState: await ShopAPI.getPrivateState('initial', providers.privateStateProvider),
      args: [
        trustedIssuerPublicKey,
        {
          bytes: encodeContractAddress(tokenContractAddress),
        },
      ],
    });

    return new ShopAPI(tokenContractAddress, deployedContract, providers, logger);
  }

  static async subscribe(
    tokenContractAddress: ContractAddress,
    providers: ShopMidnightProviders,
    contractAddress: ContractAddress,
    logger: Logger,
  ): Promise<ShopAPI> {
    console.log('setting private state');
    const state = await this.getOrCreateInitialPrivateState(providers.privateStateProvider);
    console.log('setting private state', state);

    const deployedGameContract = await findDeployedContract(providers, {
      contractAddress,
      contract: contract,
      privateStateKey: 'initial',
      initialPrivateState: state,
    });

    return new ShopAPI(tokenContractAddress, deployedGameContract, providers, logger);
  }

  static async getOrCreateInitialPrivateState(
    privateStateProvider: PrivateStateProvider<ShopPrivateStates>,
  ): Promise<ShopPrivateState> {
    let state = await privateStateProvider.get('initial');
    if (state === null) {
      state = createShopPrivateState();
      await privateStateProvider.set('initial', state);
    }
    return state;
  }

  static async contractExists(providers: ShopMidnightProviders, contractAddress: ContractAddress): Promise<boolean> {
    // here we are forced by the API to create a private state to check if the contract exists
    try {
      const state = await providers.publicDataProvider.queryContractState(contractAddress);
      if (state === null) {
        return false;
      }
      void ledger(state.data); // try to parse it
      return true;
    } catch (e) {
      return false;
    }
  }

  private static async getPrivateState(
    privateStateKey: string,
    providers: PrivateStateProvider<ShopPrivateStates>,
  ): Promise<ShopPrivateState> {
    const existingPrivateState = await providers.get(privateStateKey);
    const initialState = await this.getOrCreateInitialPrivateState(providers);
    return existingPrivateState ?? initialState;
  }
}

export * as utils from './utils/index.js';
export * from './common-types.js';
