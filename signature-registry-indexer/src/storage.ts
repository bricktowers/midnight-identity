import { type Firestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { type ExtractedContractRecord } from './common-types';

export interface IndexStorage {
  readonly saveBlockHeight: (height: number) => Promise<void>;
  readonly getBlockHeight: () => Promise<number | undefined>;
  readonly saveContract: (contract: ExtractedContractRecord) => Promise<void>;
}

export class FirestoreStorage implements IndexStorage {
  firestore: Firestore;
  constructor(
    projectId: string,
    private readonly networkId: string,
  ) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
    this.firestore = admin.firestore();
    this.firestore.settings({ ignoreUndefinedProperties: true });
  }

  async saveBlockHeight(blockHeight: number): Promise<void> {
    const docRef = this.firestore.collection('idp-indexer').doc('currentHeight' + this.networkId);
    await docRef.set({ height: blockHeight, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  }

  async getBlockHeight(): Promise<number | undefined> {
    const docRef = this.firestore.collection('idp-indexer').doc('currentHeight' + this.networkId);
    const doc = await docRef.get();
    return doc.exists ? doc.data()?.height : undefined;
  }

  async saveContract(contract: ExtractedContractRecord): Promise<void> {
    console.log('Saved new contract', contract);
    const docRef = this.firestore.collection('idp-contracts-' + this.networkId).doc(contract.walletPublicKey);
    void (await docRef.set({ contract }, { merge: true }));
  }
}
