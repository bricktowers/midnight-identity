import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import React from 'react';
import { MainLayout } from './components';
import MainPage from './MainPage';
import IDP from './IDP';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material';
import { theme } from './config/theme';
import { LocalStateProvider } from './contexts';
import { RuntimeConfigurationProvider, useRuntimeConfiguration } from './config/RuntimeConfiguration';
import { MidnightWalletProvider } from './components/MidnightWallet';
import * as pino from 'pino';
import { FAQ } from './components/FAQ';
import { type NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

const AppWithLogger: React.FC = () => {
  const config = useRuntimeConfiguration();
  const logger = pino.pino({
    level: config.LOGGING_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  });
  setNetworkId(config.NETWORK_ID as NetworkId);
  return (
    <LocalStateProvider logger={logger}>
      <MidnightWalletProvider logger={logger}>
        <BrowserRouter basename={process.env.PUBLIC_URL}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/faq" element={<FAQ />} />
              <Route index path="/" element={<MainPage logger={logger} />} />
              <Route path="/idp" element={<IDP logger={logger} />} />
              <Route path="*" element={<Navigate to="/" replace={true} />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MidnightWalletProvider>
    </LocalStateProvider>
  );
};
const App: React.FC = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <CssBaseline />
      <RuntimeConfigurationProvider>
        <ThemeProvider theme={theme}>
          <AppWithLogger />
        </ThemeProvider>
      </RuntimeConfigurationProvider>
    </DndProvider>
  );
};

export default App;
