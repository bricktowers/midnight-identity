import { createServer } from 'http';
import { type CredentialSubject, pureCircuits, type Signature } from '@bricktowers/identity-contract';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { pad } from '@bricktowers/signature-registry-api';
import { randomBytes as nodeRandomBytes } from 'crypto';

const hashSubject = (subject: CredentialSubject): string => {
  return toHex(pureCircuits.subject_hash(subject));
};

const generateSignature = (subject: CredentialSubject, sk: Uint8Array): Signature => {
  const msg = Buffer.from(hashSubject(subject), 'hex');
  return pureCircuits.sign(msg, sk);
};

function fromRawSubject(raw: any): CredentialSubject {
  return {
    id: new Uint8Array(fromHex(raw.id)),
    first_name: pad(raw.first_name, 32),
    last_name: pad(raw.last_name, 32),
    national_identifier: pad(raw.national_identifier, 32),
    birth_timestamp: BigInt(raw.birth_timestamp),
  };
}

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow requests from any origin (for development)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allowed HTTP methods
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Allowed headers
  if (req.method === 'OPTIONS') {
    // Respond to preflight request
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === 'POST' && req.url === '/sign') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      let raw, subject, userSignature, subjectHash;

      try {
        // Step 1: Parse input
        raw = JSON.parse(body);
        subject = fromRawSubject(raw.subject);
        userSignature = {
          pk: {
            x: BigInt(raw?.signature.pk.x),
            y: BigInt(raw?.signature.pk.y),
          },
          R: {
            x: BigInt(raw?.signature.R.x),
            y: BigInt(raw?.signature.R.y),
          },
          s: BigInt(raw?.signature.s),
        };

        // Step 2: Compute subject hash
        subjectHash = hashSubject(subject);
      } catch (error) {
        console.error('Invalid JSON input:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON input' }));
        return;
      }

      try {
        // Step 3: Verify signature
        pureCircuits.verify_signature(Buffer.from(subjectHash, 'hex'), userSignature);
      } catch (error) {
        console.error('Signature verification failed:', error);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Signature verification failed' }));
        return;
      }

      // Verify against signature registry

      try {
        // Step 4: Generate response on success
        const hash = subjectHash;
        const sk = pad('0x345', 32);
        const signature = generateSignature(subject, sk);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({ hash, signature }, (_, value) => (typeof value === 'bigint' ? value.toString() : value)),
        );
      } catch (error) {
        console.error('Unexpected server error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const subject = {
  id: toHex(nodeRandomBytes(32)),
  first_name: 'Alice',
  last_name: 'Smith',
  national_identifier: '123-45-6789',
  birth_timestamp: '1234567890',
};

const signature: Signature = generateSignature(fromRawSubject(subject), pad('0x123', 32));

const input = {
  subject,
  signature,
};

console.log('Input:', input);

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

/*
curl -X POST http://localhost:3000/sign      -H "Content-Type: application/json"      -d '{
  "subject": {
    "id": "2ea3775ee4f00cce35bc398e5c50bc6bdf3e05b837288fa9ada7227d8451a685",
    "first_name": "Alice",
    "last_name": "Smith",
    "national_identifier": "123-45-6789",
    "birth_timestamp": "1234567890"
  },
  "signature": {
    "pk": { "x": 0, "y": 0 },
    "R": {
      "x": "18250425320773182875191322741382237911789961875104734001453131557863717856764720531473973773908799734018915806598527734631001064002109",
      "y": "59585660597828398764430543205636994154366615495691729038178371728941073242409678482031297068554263240614514392517288322868536272973223"
    },
    "s": "9589090694631275093367095506100403814460881701424917773052016196853504263295565524861055401236141738701836009274121920923060224050114"
  }
}' | jq



{
  "hash": "2c142d00b212644216b4469435ed4b979e8d5139d917c599baaa62bd171504c7",
  "signature": {
    "pk": {
      "x": "0",
      "y": "0"
    },
    "R": {
      "x": "94274180075211532100105663883483095814594123004786781269726409837380726931960064477719543689645874893136628976288238269072299544913388",
      "y": "2591002812354145244166080049779982255011999556763671273197282527791340187036495136631448656665490476659055900861615790415107382016999"
    },
    "s": "94553522974466636013374815211136044108559561951181758599534859053374612204589717963214674964422169696227411079896380304860687124777257"
  }
}

 */
