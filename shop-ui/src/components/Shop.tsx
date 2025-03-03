import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  Snackbar,
  Typography,
} from '@mui/material';
import { type ProviderCallbackAction, useMidnightWallet, type WalletAPI } from './MidnightWallet';
import {
  ShopAPI,
  type ShopCircuitKeys,
  type ShopMidnightProviders,
  type ShopPrivateStates,
} from '@bricktowers/shop-api';
import { type PrivateStateProvider, type PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import type { ProofProvider } from '@midnight-ntwrk/midnight-js-types/dist/proof-provider';
import type { WalletProvider } from '@midnight-ntwrk/midnight-js-types/dist/wallet-provider';
import type { MidnightProvider } from '@midnight-ntwrk/midnight-js-types/dist/midnight-provider';
import { proofClient } from './proofClient';
import { useRuntimeConfiguration } from '../config/RuntimeConfiguration';
import type { Logger } from 'pino';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { CachedFetchZkConfigProvider } from './zkConfigProvider';
import { encodeCoinPublicKey } from '@midnight-ntwrk/ledger';
import { pad } from '@bricktowers/shop-api/dist/utils';
import { type SignedCredentialSubject } from '@bricktowers/shop-contract';
import { dateToUnixTimestamp } from '../IDP';

const providers: (
  publicDataProvider: PublicDataProvider,
  walletProvider: WalletProvider,
  midnightProvider: MidnightProvider,
  walletAPI: WalletAPI,
  callback: (action: ProviderCallbackAction) => void,
) => ShopMidnightProviders = (
  publicDataProvider: PublicDataProvider,
  walletProvider: WalletProvider,
  midnightProvider: MidnightProvider,
  walletAPI: WalletAPI,
  callback: (action: ProviderCallbackAction) => void,
) => {
  const privateStateProvider: PrivateStateProvider<ShopPrivateStates> = levelPrivateStateProvider({
    privateStateStoreName: 'shop-private-state',
  });
  const proofProvider: ProofProvider<ShopCircuitKeys> = proofClient(walletAPI.uris.proverServerUri, callback);
  return {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider: new CachedFetchZkConfigProvider<ShopCircuitKeys>(
      window.location.origin,
      fetch.bind(window),
      callback,
    ),
    proofProvider,
    walletProvider,
    midnightProvider,
  };
};

export interface ShopProps {
  logger: Logger;
}

interface Wine {
  id: string;
  name: string;
  image: string;
  price: number;
}

export const Shop: React.FC<ShopProps> = ({ logger }) => {
  const midnight = useMidnightWallet();
  const config = useRuntimeConfiguration();
  const [inProgress, setInProgress] = React.useState(false);

  useEffect(() => {
    if (midnight.credentialSubject && midnight.signature) {
      const signed: SignedCredentialSubject = {
        subject: midnight.credentialSubject,
        signature: midnight.signature,
      };
      console.log('Identity Defined', signed);
    }
  }, [midnight.credentialSubject, midnight.signature]);

  const onSubmit: () => Promise<void> = async () => {
    if (!midnight.isConnected) {
      midnight.shake();
      return;
    }
    setInProgress(true);
    try {
      if (midnight.walletAPI && midnight.signature && midnight.credentialSubject) {
        const midnightProviders = providers(
          midnight.publicDataProvider,
          midnight.walletProvider,
          midnight.midnightProvider,
          midnight.walletAPI,
          midnight.callback,
        );
        const api = await ShopAPI.subscribe(
          config.BRICK_TOWERS_TOKEN_ADDRESS,
          midnightProviders,
          config.BRICK_TOWERS_SHOP_ADDRESS,
          logger,
        );

        const items = Object.entries(cart)
          .flatMap(([key, count]) => Array(count).fill(pad(key, 16)))
          .concat(Array(100).fill(pad('0000000000000000', 16))) // Fill up to 100 elements
          .slice(0, 100) as Uint8Array[];

        const order = {
          id: pad('1234', 16),
          user_wallet_pk: encodeCoinPublicKey(midnight.walletAPI.coinPublicKey),
          timestamp: dateToUnixTimestamp(2025, 3, 3),
          items: items,
          payment: api.coin(BigInt(totalCost)),
        };
        const signed: SignedCredentialSubject = {
          subject: midnight.credentialSubject,
          signature: midnight.signature,
        };
        try {
          await api.submit_order(order, signed);
        } catch (e) {
          if (e instanceof Error) {
            if (e.message.includes('User is not over 21 years old')) {
              setSnackBarText('Your verified age is not over 21');
            } else {
              console.error('Unexpected error:', e);
              setSnackBarText('Something went wrong. Please try again.');
            }
          } else {
            console.error('Non-standard error thrown:', e);
            setSnackBarText('An unknown error occurred.');
          }
        }
      } else {
        setSnackBarText(
          'Could not verify your age, since no verified identity was found in your private storage. Please go to the Identity Provider page and verify your identity.',
        );
      }
    } catch (e) {
      logger.error(e, 'Failed registration');
    } finally {
      setInProgress(false);
    }
  };
  const onDeploy: () => Promise<void> = async () => {
    if (!midnight.isConnected) {
      midnight.shake();
      return;
    }
    setInProgress(true);
    try {
      if (midnight.walletAPI) {
        const midnightProviders = providers(
          midnight.publicDataProvider,
          midnight.walletProvider,
          midnight.midnightProvider,
          midnight.walletAPI,
          midnight.callback,
        );
        const api = await ShopAPI.deploy(config.BRICK_TOWERS_TOKEN_ADDRESS, midnightProviders, logger);
        logger.info('deployed at', api.deployedContractAddress);
      }
    } catch (e) {
      logger.error(e, 'Failed to Deploy');
    } finally {
      setInProgress(false);
    }
  };

  const wines: Wine[] = [
    { id: '0000000000000001', name: 'Red Wine', image: 'bottle1.png', price: 2 },
    { id: '0000000000000002', name: 'White Wine', image: 'bottle3.png', price: 5 },
    { id: '0000000000000003', name: 'Rosé Wine', image: 'bottle2.png', price: 12 },
  ];
  const [cart, setCart] = useState<Record<string, number>>({
    '0000000000000001': 0,
    '0000000000000002': 0,
    '0000000000000003': 0,
  });

  const handleAdd = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: prev[id] + 1 }));
  };

  const handleRemove = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: Math.max(prev[id] - 1, 0) }));
  };

  const totalCount = Object.values(cart).reduce((acc, count) => acc + count, 0);
  const totalCost = Object.entries(cart).reduce(
    (acc, [id, count]) => acc + count * (wines.find((w) => w.id === id)?.price || 0),
    0,
  );

  const [snackBarText, setSnackBarText] = useState<string | undefined>(undefined);

  if (window.localStorage.getItem('brick_towers_deploy')) {
    // hidden button to deploy
    return (
      <Button onClick={onDeploy} disabled={inProgress}>
        Deploy Shop
      </Button>
    );
  } else {
    return (
      <Container>
        <Snackbar
          autoHideDuration={null}
          open={snackBarText !== undefined}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="error">{snackBarText}</Alert>
        </Snackbar>
        <Grid container spacing={2}>
          {wines.map((wine) => (
            <Grid item xs={12} sm={4} key={wine.id}>
              <Card>
                <CardContent>
                  <img
                    src={wine.image}
                    alt={wine.name}
                    style={{ width: '100%', height: '250px', objectFit: 'contain', borderRadius: 8 }}
                  />
                  <Typography variant="h6" style={{ color: '#222' }}>
                    {wine.name}
                  </Typography>
                  <Typography variant="body1" style={{ color: '#222' }}>
                    Price: {wine.price} tBTC
                  </Typography>
                  <Typography variant="body1" style={{ color: '#222' }}>
                    Quantity: {cart[wine.id]}
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      handleAdd(wine.id);
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      handleRemove(wine.id);
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Typography variant="h6" style={{ marginTop: 20, color: 'cornsilk' }}>
          Total Bottles: {totalCount}
        </Typography>
        <Typography variant="h6" style={{ marginTop: 10, color: 'cornsilk' }}>
          Total Cost: {totalCost} tBTC
        </Typography>
        {totalCost > 0 && (
          <Button
            sx={{ marginRight: '30px', textTransform: 'none' }}
            size="small"
            variant={'outlined'}
            onClick={onSubmit}
            disabled={inProgress}
            startIcon={inProgress ? <CircularProgress size={16} /> : <AttachMoneyIcon />}
          >
            Submit Order
          </Button>
        )}
      </Container>
    );
  }
};
