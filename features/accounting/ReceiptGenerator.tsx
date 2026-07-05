import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { QRCodeSVG } from 'qrcode.react';

export interface ReceiptData {
    type: 'ENCAISSEMENT' | 'DÉCAISSEMENT';
    id: string;
    date: string;
    amount: number;
    label: string;
    recordedBy: string;
    schoolName: string;
}

export interface ReceiptGeneratorRef {
    generateReceipt: (data: ReceiptData) => void;
}

export const ReceiptGenerator = forwardRef<ReceiptGeneratorRef, {}>((props, ref) => {
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        generateReceipt: (data: ReceiptData) => {
            setReceiptData(data);
            setTimeout(() => {
                if (containerRef.current) {
                    const opt = {
                        margin: 10,
                        filename: `recu_${data.type.toLowerCase()}_${data.id}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };
                    html2pdf().set(opt).from(containerRef.current).save().then(() => {
                        setReceiptData(null); // Nettoyage
                    });
                }
            }, 500); // Laisse le temps au DOM de se mettre à jour
        }
    }));

    if (!receiptData) return null;

    // Valeur intégrée dans le QR code pour vérification d'authenticité
    const qrValue = `RECU:${receiptData.id}|TYPE:${receiptData.type}|MONTANT:${receiptData.amount}|DATE:${receiptData.date}`;

    return (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
            <div ref={containerRef} style={{ width: '190mm', padding: '40px', backgroundColor: 'white', color: 'black', fontFamily: 'sans-serif' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', color: '#1a56db', textTransform: 'uppercase' }}>{receiptData.schoolName || 'Institution'}</h1>
                        <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Reçu Officiel / Traçabilité</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 style={{ margin: 0, fontSize: '20px', color: receiptData.type === 'ENCAISSEMENT' ? '#059669' : '#dc2626' }}>
                            {receiptData.type}
                        </h2>
                        <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '14px' }}>Reçu N° {receiptData.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                    <div style={{ flex: 1, paddingRight: '20px' }}>
                        <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}><strong style={{ color: '#4b5563' }}>Date :</strong> {new Date(receiptData.date).toLocaleDateString('fr-FR')} à {new Date(receiptData.date).toLocaleTimeString('fr-FR')}</p>
                        <p style={{ margin: '0 0 10px 0', fontSize: '14px', lineHeight: '1.5' }}><strong style={{ color: '#4b5563' }}>Libellé / Motif :</strong><br/>{receiptData.label}</p>
                        <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}><strong style={{ color: '#4b5563' }}>Opérateur :</strong> {receiptData.recordedBy}</p>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f9fafb' }}>
                        <QRCodeSVG value={qrValue} size={90} level="M" />
                        <p style={{ fontSize: '10px', textAlign: 'center', margin: '5px 0 0 0', color: '#6b7280', fontWeight: 'bold' }}>Scan d'authenticité</p>
                    </div>
                </div>

                <div style={{ backgroundColor: receiptData.type === 'ENCAISSEMENT' ? '#ecfdf5' : '#fef2f2', padding: '20px', borderRadius: '8px', border: `1px solid ${receiptData.type === 'ENCAISSEMENT' ? '#a7f3d0' : '#fecaca'}`, textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', margin: '0 0 5px 0', color: receiptData.type === 'ENCAISSEMENT' ? '#065f46' : '#991b1b', fontWeight: 'bold', textTransform: 'uppercase' }}>Montant Total</p>
                    <p style={{ fontSize: '32px', fontWeight: '900', margin: 0, color: receiptData.type === 'ENCAISSEMENT' ? '#059669' : '#dc2626' }}>
                        {receiptData.amount.toLocaleString('fr-FR')} FCFA
                    </p>
                </div>
                
                <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
                    <div style={{ borderTop: '1px dashed #9ca3af', paddingTop: '10px', width: '200px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>Signature Direction</div>
                    <div style={{ borderTop: '1px dashed #9ca3af', paddingTop: '10px', width: '200px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>Cachet</div>
                </div>
            </div>
        </div>
    );
});
