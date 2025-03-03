import React, { type PropsWithChildren, useState } from 'react';
import { Box, Button, Snackbar, Typography } from '@mui/material';
import './my-battles.css';
import { useMidnightWallet } from './components/MidnightWallet';
import { useRuntimeConfiguration } from './config/RuntimeConfiguration';
import * as firebase from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from 'firebase/app-check';
import type { Logger } from 'pino';
import { useNavigate } from 'react-router-dom';
import { RegisterButton } from './components/RegisterButton';
import { Shop } from './components/Shop';

export type MainPageProps = PropsWithChildren<{
  logger: Logger;
}>;

const MainPage: React.FC<MainPageProps> = ({ logger }) => {
  const midnight = useMidnightWallet();
  const config = useRuntimeConfiguration();
  const [snackBarOpen, setSnackBarOpen] = useState(false);
  const [snackBarText, setSnackBarText] = useState('');
  const firebaseConfig = {
    apiKey: config.FIREBASE_API_KEY,
    authDomain: config.FIREBASE_AUTH_DOMAIN,
    projectId: config.FIREBASE_PROJECT_ID,
    storageBucket: config.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
    appId: config.FIREBASE_APP_ID,
  };

  const app = firebase.initializeApp(firebaseConfig);
  if (config.FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(config.FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      logger.error(e, 'App check failed');
    }
  }

  if (config.FIREBASE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(config.FIREBASE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      logger.error(e, 'App check failed');
    }
  }

  const navigate = useNavigate();

  const onIDP: () => void = () => {
    navigate('/idp');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {midnight.widget}

      <Button
        onClick={onIDP}
        size="small"
        variant={'outlined'}
        sx={{
          cursor: 'pointer',
          textDecoration: 'none',
        }}
      >
        Identity Verification
      </Button>
      <Snackbar
        open={snackBarOpen}
        autoHideDuration={2000}
        onClose={() => {
          setSnackBarOpen(false);
        }}
        message={snackBarText}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <Typography align="justify" variant="body1" color="cornsilk" sx={{ paddingRight: '10%', paddingLeft: '10%' }}>
        Welcome to Wine Shop by{' '}
        <Box
          component="a"
          href="https://bricktowers.io/"
          target="_blank"
          rel="noreferrer"
          sx={{
            color: 'cornsilk',
            textDecoration: 'underline',
          }}
        >
          Brick Towers
        </Box>
      </Typography>
      <Typography align="justify" variant="body1" color="cornsilk" sx={{ paddingRight: '10%', paddingLeft: '10%' }}>
        To use the shop you need a Midnight Lace Wallet with some tDUST and tBTC (Brick Tower Coin) tokens.
      </Typography>
      <RegisterButton logger={logger} />
      <Shop logger={logger} />
    </div>
  );
};

export default MainPage;
