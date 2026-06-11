export const MONEYFUSION_API_URL = "https://pay.moneyfusion.net/PR_SGS/e470e12aa70f6e84/pay/";

export interface MoneyFusionPaymentRequest {
    totalPrice: number;
    numeroSend: string;
    nomclient: string;
    article: Array<Record<string, number>>;
    personal_Info?: Array<Record<string, any>>;
    return_url?: string;
    webhook_url?: string;
}

export interface MoneyFusionPaymentResponse {
    statut: boolean;
    token?: string;
    message?: string;
    url?: string;
}

export interface MoneyFusionStatusResponse {
    statut: string | boolean;
    transaction?: any;
    message?: string;
}

export const initiatePayment = async (request: MoneyFusionPaymentRequest): Promise<MoneyFusionPaymentResponse> => {
    try {
        const response = await fetch(MONEYFUSION_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request)
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Erreur lors de l'initiation du paiement MoneyFusion:", error);
        throw error;
    }
};

export const checkPaymentStatus = async (token: string): Promise<MoneyFusionStatusResponse> => {
    try {
        const response = await fetch(`https://www.pay.moneyfusion.net/paiementNotif/${token}`);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Erreur lors de la vérification du statut:", error);
        throw error;
    }
};
