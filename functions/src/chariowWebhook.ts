import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express = require('express');
import cors = require('cors');
import * as crypto from 'crypto';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Correspondance ID produit Chariow -> Plan interne
const PRODUCT_TO_PLAN: Record<string, 'monthly' | 'quarterly' | 'annual'> = {
  prd_612sq612: 'monthly',
  // IDs personnalisables via variables d'environnement ou configurables ici
  ...(process.env.CHARIOW_PRODUCT_MONTHLY ? { [process.env.CHARIOW_PRODUCT_MONTHLY]: 'monthly' } : {}),
  ...(process.env.CHARIOW_PRODUCT_QUARTERLY ? { [process.env.CHARIOW_PRODUCT_QUARTERLY]: 'quarterly' } : {}),
  ...(process.env.CHARIOW_PRODUCT_ANNUAL ? { [process.env.CHARIOW_PRODUCT_ANNUAL]: 'annual' } : {}),
};

const app = express();
app.use(cors({ origin: true }));

// Capture du body brut pour vérification HMAC
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.post('/', async (req: any, res: any) => {
  try {
    const signature = req.headers['x-chariow-signature'] as string | undefined;
    const pulseEvent = (req.headers['x-pulse-event'] as string | undefined) || req.body?.event;
    const pulseDeliveryId = req.headers['x-pulse-delivery-id'] as string | undefined;
    const secret = process.env.CHARIOW_WEBHOOK_SECRET;

    // 1. Vérification de la signature HMAC si le secret est configuré
    if (secret) {
      if (!signature) {
        console.warn('Requête Chariow rejetée: signature manquante.');
        return res.status(401).send('Missing signature');
      }
      const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
      const computedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      if (signature !== computedSignature) {
        console.warn('Signature Chariow invalide.');
        return res.status(401).send('Invalid signature');
      }
    } else {
      console.warn('ATTENTION: CHARIOW_WEBHOOK_SECRET non configuré. Validation de signature ignorée.');
    }

    const payload = req.body || {};
    const data = payload.data || payload;

    // 2. Filtrer sur les événements de vente réussie
    // Chariow Pulses utilise principalement 'successful.sale'
    const eventType = pulseEvent || payload.type || payload.event;
    const isSuccessfulSale =
      eventType === 'successful.sale' ||
      eventType === 'order.created' ||
      eventType === 'payment.succeeded' ||
      data.status === 'completed' ||
      data.status === 'paid' ||
      payload.status === 'success';

    if (!isSuccessfulSale) {
      console.log(`Événement non pris en charge (${eventType}), acquittement 200.`);
      return res.status(200).json({ received: true, message: 'Event ignored' });
    }

    // 3. Extraction du schoolId et du plan
    // Le schoolId peut provenir des métadonnées (custom_metadata, metadata, custom_fields) ou de la payload directe
    const metadata = data.custom_metadata || data.metadata || payload.metadata || {};
    const schoolId =
      metadata.schoolId ||
      metadata.school_id ||
      data.schoolId ||
      data.school_id ||
      payload.schoolId ||
      payload.school_id;

    if (!schoolId) {
      console.error('Aucun schoolId trouvé dans le webhook Chariow:', JSON.stringify(payload));
      return res.status(400).send('Missing schoolId in order metadata');
    }

    // Détermination du forfait (mensuel, trimestriel, annuel)
    const productId = data.product_id || data.product?.id || payload.product_id;
    let plan: 'monthly' | 'quarterly' | 'annual' = 'monthly';

    if (metadata.plan && ['monthly', 'quarterly', 'annual'].includes(metadata.plan)) {
      plan = metadata.plan;
    } else if (productId && PRODUCT_TO_PLAN[productId]) {
      plan = PRODUCT_TO_PLAN[productId];
    } else if (data.billing_cycle === 'annual' || metadata.billing_cycle === 'annual') {
      plan = 'annual';
    } else if (data.billing_cycle === 'quarterly' || metadata.billing_cycle === 'quarterly') {
      plan = 'quarterly';
    }

    // 4. Mise à jour ou renouvellement de l'abonnement dans schools/{schoolId}
    const schoolRef = db.collection('schools').doc(schoolId);
    const schoolDoc = await schoolRef.get();

    if (!schoolDoc.exists) {
      console.error(`École ${schoolId} introuvable dans Firestore.`);
      return res.status(404).send(`School ${schoolId} not found`);
    }

    const schoolData = schoolDoc.data() || {};
    const now = new Date();
    let baseDate = now;

    // Si l'abonnement est déjà actif et n'a pas encore expiré, on ajoute la durée à la suite
    if (schoolData.subscription_status === 'active' && schoolData.subscription_expires_at) {
      const currentExpiry = schoolData.subscription_expires_at.toDate();
      if (currentExpiry > now) {
        baseDate = currentExpiry;
      }
    }

    let durationDays = 30;
    if (plan === 'quarterly') durationDays = 90;
    if (plan === 'annual') durationDays = 365;

    const expiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const batch = db.batch();

    // Mise à jour de l'école
    batch.update(schoolRef, {
      subscription_plan: plan,
      subscription_expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
      subscription_status: 'active',
      subscription_updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Enregistrement de l'historique du paiement pour traçabilité
    const paymentRecordRef = schoolRef.collection('subscription_payments').doc();
    batch.set(paymentRecordRef, {
      provider: 'chariow',
      plan,
      amount: data.amount || data.total_amount || 0,
      currency: data.currency || 'XOF',
      pulseDeliveryId: pulseDeliveryId || null,
      chariowOrderId: data.id || payload.id || null,
      buyerEmail: data.customer?.email || data.buyer_email || null,
      buyerPhone: data.customer?.phone || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    });

    await batch.commit();

    console.log(`Abonnement validé pour l'école ${schoolId} : forfait ${plan} jusqu'au ${expiresAt.toISOString()}`);
    return res.status(200).json({ success: true, schoolId, plan, expiresAt });
  } catch (error) {
    console.error('Erreur lors du traitement du Webhook Chariow:', error);
    return res.status(500).send('Internal Server Error');
  }
});

export const onChariowWebhook = functions.https.onRequest(app);
