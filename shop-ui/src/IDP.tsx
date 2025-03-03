import React, { type PropsWithChildren, useEffect, useState } from 'react';
import type { Logger } from 'pino';
import { useMidnightWallet } from './components/MidnightWallet';
import { type CredentialSubject, pureCircuits, type Signature } from '@bricktowers/identity-contract';
import { Box, Button, TextField, Typography } from '@mui/material';
import { encodeCoinPublicKey } from '@midnight-ntwrk/ledger';
import { pad } from '@bricktowers/shop-api/dist/utils';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { type SignedCredentialSubject } from '@bricktowers/shop-contract';
import { useNavigate } from 'react-router-dom';

export type IDPProps = PropsWithChildren<{
  logger: Logger;
}>;

export function dateToUnixTimestamp(year: number, month: number, day: number): bigint {
  const date = new Date(year, month - 1, day); // month is 0-based in JS Date
  return BigInt(Math.floor(date.getTime())); // Convert to seconds and return as bigint
}

const IDP: React.FC<IDPProps> = ({ logger }) => {
  const midnight = useMidnightWallet();
  const [signature, setSignature] = useState<Signature | undefined>(undefined);
  const [response, setResponse] = useState<any | undefined>(undefined);
  const sk = pad('0x987', 32); // user secret key

  function setYoung(): void {
    if (midnight.isConnected && midnight.walletAPI) {
      const subject = {
        id: encodeCoinPublicKey(midnight.walletAPI.coinPublicKey),
        first_name: pad('Schweizer', 32),
        last_name: pad('Sample', 32),
        national_identifier: pad('S1A00A00', 32),
        birth_timestamp: dateToUnixTimestamp(2005, 8, 1),
      };
      midnight.setCredentialSubject(subject);
      setSignature(generateSignature(subject, sk));
    } else {
      midnight.shake();
    }
  }

  useEffect(() => {
    if (midnight.credentialSubject && midnight.signature) {
      const signed: SignedCredentialSubject = {
        subject: midnight.credentialSubject,
        signature: midnight.signature,
      };
      console.log('Identity Defined', signed);
    }
  }, [midnight.credentialSubject, midnight.signature]);

  function setOld(): void {
    if (midnight.isConnected && midnight.walletAPI) {
      const subject = {
        id: encodeCoinPublicKey(midnight.walletAPI.coinPublicKey),
        first_name: pad('Mara', 32),
        last_name: pad('Paaudzina', 32),
        national_identifier: pad('325035-11782', 32),
        birth_timestamp: dateToUnixTimestamp(1982, 12, 12),
      };
      midnight.setCredentialSubject(subject);
      setSignature(generateSignature(subject, sk));
    } else {
      midnight.shake();
    }
  }

  const uint8ArrayToString = (arr: Uint8Array) => new TextDecoder().decode(arr);

  const hashSubject = (subject: CredentialSubject): string => {
    return toHex(pureCircuits.subject_hash(subject));
  };

  const generateSignature = (subject: CredentialSubject, sk: Uint8Array): Signature => {
    const msg = Buffer.from(hashSubject(subject), 'hex');
    return pureCircuits.sign(msg, sk);
  };

  const sendRequest = async () => {
    if (signature && midnight.credentialSubject) {
      try {
        const input = {
          subject: {
            id: toHex(midnight.credentialSubject.id),
            first_name: uint8ArrayToString(midnight.credentialSubject.first_name),
            last_name: uint8ArrayToString(midnight.credentialSubject.last_name),
            national_identifier: uint8ArrayToString(midnight.credentialSubject.national_identifier),
            birth_timestamp: midnight.credentialSubject.birth_timestamp.toString(),
          },
          signature: generateSignature(midnight.credentialSubject, sk),
        };

        const response = await fetch('http://localhost:3000/sign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: customStringify(input),
        });

        const result = await response.json();
        const signature = {
          pk: {
            x: BigInt(result?.signature.pk.x),
            y: BigInt(result?.signature.pk.y),
          },
          R: {
            x: BigInt(result?.signature.R.x),
            y: BigInt(result?.signature.R.y),
          },
          s: BigInt(result?.signature.s),
        };
        setResponse(result);
        midnight.setSignature(signature);
        console.log('Response:', result);
      } catch (error) {
        console.error('Error sending request:', error);
      }
    }
  };

  const customStringify = (obj: any): string => {
    return JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2);
  };

  const navigate = useNavigate();

  const onShop: () => void = () => {
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {midnight.widget}

      <Button
        onClick={onShop}
        sx={{
          cursor: 'pointer',
          color: 'cornsilk',
          textDecoration: 'underline',
        }}
      >
        Back to Shop
      </Button>

      <Box display="flex" justifyContent="center" gap={4}>
        {/* Young Person */}
        <Box textAlign="center">
          <img src="/id_swiss-min.png" alt="Young Person" width={250} height={159} style={{ borderRadius: 8 }} />
          <Typography variant="subtitle1" sx={{ marginTop: 1 }}>

          </Typography>
          <Button sx={{ textTransform: 'none', marginTop: 1 }} size="small" variant="outlined" onClick={setYoung}>
            Schweizer, 20 years
          </Button>
        </Box>

        {/* Older Person */}
        <Box textAlign="center">
          <img src="/id_latvia-min.png" alt="Older Person" width={250} height={159} style={{ borderRadius: 8 }} />
          <Typography variant="subtitle1" sx={{ marginTop: 1 }}>
          </Typography>
          <Button sx={{ textTransform: 'none', marginTop: 1 }} size="small" variant="outlined" onClick={setOld}>
            Mara Paraudzina, 42 years
          </Button>
        </Box>
      </Box>

      {midnight.credentialSubject === undefined ? null : (
        <Box sx={{ maxWidth: 800, margin: 'auto', padding: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'cornsilk' }}>
            Credential Subject
          </Typography>

          <TextField
            label="ID"
            fullWidth
            margin="dense"
            variant="outlined"
            value={toHex(midnight.credentialSubject.id)}
            InputProps={{ readOnly: true, sx: { color: 'cornsilk' } }}
          />

          <TextField
            label="First Name"
            fullWidth
            margin="dense"
            variant="outlined"
            value={uint8ArrayToString(midnight.credentialSubject.first_name)}
            InputProps={{ readOnly: true, sx: { color: 'cornsilk' } }}
          />

          <TextField
            label="Last Name"
            fullWidth
            margin="dense"
            variant="outlined"
            value={uint8ArrayToString(midnight.credentialSubject.last_name)}
            InputProps={{ readOnly: true, sx: { color: 'cornsilk' } }}
          />

          <TextField
            label="National Identifier"
            fullWidth
            margin="dense"
            variant="outlined"
            value={uint8ArrayToString(midnight.credentialSubject.national_identifier)}
            InputProps={{ readOnly: true, sx: { color: 'cornsilk' } }}
          />

          <TextField
            label="Birth Date"
            fullWidth
            margin="dense"
            variant="outlined"
            value={new Date(Number(midnight.credentialSubject.birth_timestamp)).toLocaleDateString()}
            InputProps={{ readOnly: true, sx: { color: 'cornsilk' } }}
          />

         {/* <TextField
            label="User Signature"
            fullWidth
            margin="dense"
            variant="outlined"
            value={customStringify(signature)}
            multiline
            minRows={3}
            InputProps={{ readOnly: true, sx: { color: 'cornsilk' } }}
          />*/}

          <Button
            sx={{ marginRight: '30px', textTransform: 'none' }}
            size="small"
            variant={'outlined'}
            onClick={sendRequest}
          >
            Obtain Verified and Signed Credentials
          </Button>

          {response === undefined ? null : (
            <TextField
              label="IDP Digital Signature"
              fullWidth
              margin="dense"
              variant="outlined"
              value={customStringify(response)}
              InputProps={{ readOnly: true, sx: { color: 'cornsilk' } }}
              multiline
              minRows={3} // Adjust the number of rows as needed
            />
          )}
        </Box>
      )}
    </div>
  );
};

export default IDP;
