import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post('/', async (req, res) => {
  // TODO: Verify signature if Chariow provides HMAC secret
  const payload = req.body;
  const { userId, schoolId, planId, status } = payload;
  const uid = userId ?? schoolId;
  if (!uid || !planId || !status) {
    res.status(400).send('Missing required fields');
    return;
  }
  try {
    const userRef = admin.firestore().collection('users').doc(uid);
    await userRef.set(
      {
        subscription: {
          planId,
          status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
    res.status(200).send('OK');
  } catch (e) {
    console.error('Error updating subscription', e);
    res.status(500).send('Internal error');
  }
});

export const onChariowWebhook = functions.https.onRequest(app);
