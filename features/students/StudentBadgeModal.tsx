import React, { useRef, useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { useSchool } from '../../App';
import { Student } from '../../types';
import { Modal, Button } from '../../components/ui/Common';

interface StudentBadgeModalProps {
  student: Student | null;
  onClose: () => void;
}

export const StudentBadgeModal: React.FC<StudentBadgeModalProps> = ({ student, onClose }) => {
  const { settings, selectedAcademicYear } = useSchool();
  const badgeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const A4_WIDTH_PX = 1123; // approx 297mm (landscape width) in pixels at 96 DPI
        const padding = 32; // 16px padding on each side
        const availableWidth = containerRef.current.clientWidth - padding;
        if (availableWidth > 0 && availableWidth < A4_WIDTH_PX) {
          setScale(availableWidth / A4_WIDTH_PX);
        } else {
          setScale(1);
        }
      }
    };
    
    // Slight delay to ensure modal is rendered and has width
    const timeout = setTimeout(updateScale, 50);
    window.addEventListener('resize', updateScale);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateScale);
    };
  }, [student]);

  if (!student) return null;

  const year = selectedAcademicYear || (settings as any).currentAcademicYear || '';
  const fullClass = student.serie ? student.classe + ' ' + student.serie : student.classe;
  const qrValue =
    'NAME:' + student.nom + ' ' + student.prenom +
    '|MATRICULE:' + (student.matricule || student.id) +
    '|CLASS:' + fullClass +
    '|YEAR:' + year;

  const primaryVar = 'var(--primary-color)';


  const handleDownloadPNG = async () => {
    if (!badgeRef.current) return;
    setIsExporting(true);
    const originalScale = scale;
    setScale(1);
    // Wait a tick for re-render with unscaled badge
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(badgeRef.current!, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = 'badge_' + (student.matricule || student.id) + '.png';
        link.click();
      } catch (err) {
        console.error('Failed to export PNG', err);
      } finally {
        setScale(originalScale);
        setIsExporting(false);
      }
    }, 150);
  };

  const handleDownload = () => {
    if (!badgeRef.current) return;
    setIsExporting(true);
    const originalScale = scale;
    setScale(1);
    setTimeout(() => {
      const opt = {
        margin: 0,
        filename: 'badge_' + (student.matricule || student.id) + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      };
      (html2pdf as any)().set(opt).from(badgeRef.current!).save().then(() => {
        setScale(originalScale);
        setIsExporting(false);
      }).catch((err: any) => {
        console.error('Failed to export PDF', err);
        setScale(originalScale);
        setIsExporting(false);
      });
    }, 150);
  };
  return (
    <Modal isOpen={!!student} onClose={onClose} title="Badge Etudiant" maxWidth="max-w-3xl">
      <div className="overflow-auto max-h-[80vh] flex flex-col items-center pb-4 w-full overflow-x-hidden" ref={containerRef}>
        {/* ---------- Printable badge wrapper for scaling ---------- */}
        <div style={{
           width: '100%',
           height: `${794 * scale}px`, // 210mm is approx 794px at 96 DPI (landscape height)
           position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: `translateX(-50%) scale(${scale})`,
            transformOrigin: 'top center',
          }}>
            <div
              ref={badgeRef}
              style={{
                width: '297mm', // Landscape A4 Width
                minHeight: '210mm', // Landscape A4 Height
                backgroundColor: '#ffffff',
                color: '#111827',
                fontFamily: 'Arial, sans-serif',
                padding: '20mm',
                boxSizing: 'border-box',
              }}
            >
          {/* ---- Header ---- */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '3px solid ' + primaryVar,
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt="logo"
                  style={{ height: '60px', width: '60px', objectFit: 'contain', borderRadius: '8px' }}
                />
              ) : (
                <div
                  style={{
                    height: '60px',
                    width: '60px',
                    borderRadius: '8px',
                    background: primaryVar,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '28px',
                    fontWeight: 900,
                  }}
                >
                  {(settings.appName || 'E').charAt(0)}
                </div>
              )}
              <div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: primaryVar }}>
                  {settings.appName || 'Etablissement scolaire'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                  Badge Officiel d'Etudiant
                </div>
              </div>
            </div>
            <div
              style={{
                background: primaryVar,
                color: '#fff',
                padding: '8px 20px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              {year}
            </div>
          </div>

          {/* ---- Body: photo + info + QR ---- */}
          <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
            {/* Photo */}
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
              <img
                src={
                  student.photo ||
                  'https://ui-avatars.com/api/?name=' +
                    encodeURIComponent(student.prenom + ' ' + student.nom) +
                    '&background=random&size=200'
                }
                alt="photo"
                style={{
                  width: '120px',
                  height: '150px',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  border: '3px solid ' + primaryVar,
                }}
              />
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: student.genre === 'Feminin' ? '#ec4899' : '#3b82f6',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {student.genre || ''}
              </div>
            </div>

            {/* Info fields */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '26px',
                  fontWeight: 900,
                  color: primaryVar,
                  marginBottom: '14px',
                  lineHeight: 1.15,
                }}
              >
                {student.prenom} {student.nom}
              </div>
              {[
                { label: 'Matricule', value: student.matricule || student.id.slice(-8).toUpperCase() },
                { label: 'Classe', value: fullClass },
                { label: 'Annee academique', value: year },
                { label: 'Date de naissance', value: (student as any).dateNaissance || '-' },
                { label: 'Ville', value: student.ville || '-' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{ display: 'flex', gap: '8px', marginBottom: '7px', fontSize: '13px' }}
                >
                  <span style={{ color: '#6b7280', minWidth: '150px', fontWeight: 600 }}>{label} :</span>
                  <span style={{ fontWeight: 800, color: '#111827' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* QR code */}
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
              <div
                style={{
                  padding: '10px',
                  border: '2px solid ' + primaryVar,
                  borderRadius: '12px',
                  background: '#fff',
                }}
              >
                <QRCodeCanvas value={qrValue} size={110} />
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '6px', fontWeight: 600 }}>
                Verification d'authenticite
              </div>
            </div>
          </div>
          

          {/* ---- Footer ---- */}
          <div
            style={{
              marginTop: '48px',
              borderTop: '2px dashed #d1d5db',
              paddingTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
              Ce badge est un document officiel. Toute falsification est passible de sanctions.
            </div>
            <div style={{ fontSize: '11px', color: primaryVar, fontWeight: 700, textTransform: 'uppercase' }}>
              Cachet &amp; Signature
            </div>
          </div>
          </div>
        </div>
        </div>
        </div>

        {/* ---------- Action buttons (outside badge area) ---------- */}
        <div className="flex gap-3 mt-4 w-full justify-end pr-2">
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          <Button variant="primary" onClick={handleDownloadPNG}>
            <i className="fas fa-image mr-2" />
            Télécharger PNG
          </Button>
          <Button variant="primary" onClick={handleDownload}>
            <i className="fas fa-file-pdf mr-2" />
            Télécharger PDF (A4)
          </Button>

      
        </div>
    </Modal>
  );
};
