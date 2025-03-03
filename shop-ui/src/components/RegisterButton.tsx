import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { type ProviderCallbackAction, useMidnightWallet, type WalletAPI } from './MidnightWallet';
import { deployContract, findDeployedContract, type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { Contract, type Witnesses } from '@bricktowers/signature-registry-contract';
import {
  type MidnightProviders,
  type PrivateStateProvider,
  type PublicDataProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import type { ProofProvider } from '@midnight-ntwrk/midnight-js-types/dist/proof-provider';
import type { WalletProvider } from '@midnight-ntwrk/midnight-js-types/dist/wallet-provider';
import type { MidnightProvider } from '@midnight-ntwrk/midnight-js-types/dist/midnight-provider';
import { proofClient } from './proofClient';
import { useRuntimeConfiguration } from '../config/RuntimeConfiguration';
import type { Logger } from 'pino';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { CachedFetchZkConfigProvider } from './zkConfigProvider';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IdentityRegistryPrivateState {}

type IdentityRegistryPrivateStates = Record<string, IdentityRegistryPrivateState>;
type IdentityRegistryContract = Contract<IdentityRegistryPrivateState, Witnesses<IdentityRegistryPrivateState>>;
type IdentityRegistryCircuitKeys = Exclude<keyof IdentityRegistryContract['impureCircuits'], number | symbol>;
type IdentityRegistryProviders = MidnightProviders<IdentityRegistryCircuitKeys, IdentityRegistryPrivateStates>;
type DeployedIdentityRegistry = FoundContract<IdentityRegistryPrivateState, IdentityRegistryContract>;

const providers: (
  publicDataProvider: PublicDataProvider,
  walletProvider: WalletProvider,
  midnightProvider: MidnightProvider,
  walletAPI: WalletAPI,
  callback: (action: ProviderCallbackAction) => void,
) => IdentityRegistryProviders = (
  publicDataProvider: PublicDataProvider,
  walletProvider: WalletProvider,
  midnightProvider: MidnightProvider,
  walletAPI: WalletAPI,
  callback: (action: ProviderCallbackAction) => void,
) => {
  const privateStateProvider: PrivateStateProvider<IdentityRegistryPrivateStates> = levelPrivateStateProvider({
    privateStateStoreName: 'signature-registry-private-state',
  });
  const proofProvider: ProofProvider<IdentityRegistryCircuitKeys> = proofClient(
    walletAPI.uris.proverServerUri,
    callback,
  );
  return {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider: new CachedFetchZkConfigProvider<IdentityRegistryCircuitKeys>(
      window.location.origin,
      fetch.bind(window),
      callback,
    ),
    proofProvider,
    walletProvider,
    midnightProvider,
  };
};

export interface RegisterButtonProps {
  logger: Logger;
}

export const RegisterButton: React.FC<RegisterButtonProps> = ({ logger }) => {
  const midnightWallet = useMidnightWallet();
  const config = useRuntimeConfiguration();
  const [inProgress, setInProgress] = React.useState(false);
  const onRegister: () => Promise<void> = async () => {
    if (!midnightWallet.isConnected) {
      midnightWallet.shake();
      return;
    }
    setInProgress(true);
    try {
      const contract: IdentityRegistryContract = new Contract({});
      if (midnightWallet.walletAPI) {
        const midnightProviders = providers(
          midnightWallet.publicDataProvider,
          midnightWallet.walletProvider,
          midnightWallet.midnightProvider,
          midnightWallet.walletAPI,
          midnightWallet.callback,
        );
        await midnightProviders.privateStateProvider.set('coin', {});
        const found = await findDeployedContract(midnightProviders, {
          privateStateKey: 'coin',
          contractAddress: config.BRICK_TOWERS_IDP_REGISTER_ADDRESS,
          contract,
        });
        await found.callTx.register({ x: 0n, y: 0n });
      }
    } catch (e) {
      logger.error(e, 'Failed registration');
    } finally {
      setInProgress(false);
    }
  };
  const onDeploy: () => Promise<void> = async () => {
    if (!midnightWallet.isConnected) {
      midnightWallet.shake();
      return;
    }
    setInProgress(true);
    try {
      const contract: IdentityRegistryContract = new Contract({});

      if (midnightWallet.walletAPI) {
        const midnightProviders = providers(
          midnightWallet.publicDataProvider,
          midnightWallet.walletProvider,
          midnightWallet.midnightProvider,
          midnightWallet.walletAPI,
          midnightWallet.callback,
        );
        await midnightProviders.privateStateProvider.set('coin', {});
        const deployedContract: DeployedIdentityRegistry = await deployContract(midnightProviders, {
          privateStateKey: 'coin',
          contract,
          initialPrivateState: {},
        });

        logger.info('deployed at', deployedContract.deployTxData.public.contractAddress);
      }
    } catch (e) {
      logger.error(e, 'Failed to Deploy');
    } finally {
      setInProgress(false);
    }
  };
  if (window.localStorage.getItem('brick_towers_deploy')) {
    // hidden button to deploy
    return (
      <Button onClick={onDeploy} disabled={inProgress}>
        Deploy
      </Button>
    );
  } else if (window.localStorage.getItem('brick_towers_register')) {
    return (
      <Button
        sx={{ marginRight: '30px', textTransform: 'none' }}
        size="small"
        variant={'outlined'}
        onClick={onRegister}
        disabled={inProgress}
        startIcon={inProgress ? <CircularProgress size={16} /> : <AttachMoneyIcon />}
      >
        Register
      </Button>
    );
  } else {
    return <></>;
  }
};
