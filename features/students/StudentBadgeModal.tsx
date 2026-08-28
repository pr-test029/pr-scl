import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
    try {
      const canvas = await html2canvas(badgeRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = 'badge_' + (student.matricule || student.id) + '.png';
      link.click();
    } catch (err) {
      console.error('Failed to export PNG', err);
    }
  };

  const handleDownload = () => {
    if (!badgeRef.current) return;
    const opt = {
      margin: 0,
      filename: 'badge_' + (student.matricule || student.id) + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    };
    (html2pdf as any)().set(opt).from(badgeRef.current).save();
  };

  return (
    <Modal isOpen={!!student} onClose={onClose} title="Badge Etudiant" maxWidth="max-w-3xl">
      <div className="overflow-auto max-h-[80vh] w-full flex flex-col items-center pb-4">
        {/* ---------- Printable badge ---------- */}
        <div
          ref={badgeRef}
          className="w-full max-w-[297mm] md:min-h-[210mm] h-auto p-4 md:p-8 bg-white text-left"
        >
          {/* ---- Header ---- */}
          <div
            className="flex flex-col sm:flex-row justify-between items-center pb-3 mb-6 border-b-[3px] gap-4"
            style={{ borderColor: primaryVar }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt="logo"
                  className="h-16 w-16 object-contain rounded-lg"
                />
              ) : (
                <div
                  className="h-16 w-16 rounded-lg flex items-center justify-center text-white text-3xl font-black"
                  style={{ background: primaryVar }}
                >
                  {(settings.appName || 'E').charAt(0)}
                </div>
              )}
              <div>
                <div className="text-xl md:text-2xl font-black" style={{ color: primaryVar }}>
                  {settings.appName || 'Etablissement scolaire'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Badge Officiel d'Etudiant
                </div>
              </div>
            </div>
            <div
              className="px-5 py-2 rounded-full text-sm font-bold text-white"
              style={{ background: primaryVar }}
            >
              {year}
            </div>
          </div>

          {/* ---- Body: photo + info + QR ---- */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
            {/* Photo */}
            <div className="flex-shrink-0 text-center">
              <img
                src={
                  student.photo ||
                  'https://ui-avatars.com/api/?name=' +
                    encodeURIComponent(student.prenom + ' ' + student.nom) +
                    '&background=random&size=200'
                }
                alt="photo"
                className="w-32 h-40 md:w-[120px] md:h-[150px] object-cover rounded-xl border-4"
                style={{ borderColor: primaryVar }}
              />
              <div
                className="mt-2 text-xs font-bold uppercase tracking-widest"
                style={{ color: student.genre === 'Feminin' ? '#ec4899' : '#3b82f6' }}
              >
                {student.genre || ''}
              </div>
            </div>

            {/* Info fields */}
            <div className="flex-1 w-full text-center md:text-left">
              <div
                className="text-2xl md:text-[26px] font-black mb-4 leading-tight"
                style={{ color: primaryVar }}
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
                  className="flex flex-col sm:flex-row sm:gap-2 mb-2 text-sm"
                >
                  <span className="text-gray-500 sm:min-w-[150px] font-semibold">{label} :</span>
                  <span className="font-extrabold text-gray-900">{value}</span>
                </div>
              ))}
            </div>

            {/* QR code */}
            <div className="flex-shrink-0 text-center mt-4 md:mt-0">
              <div
                className="p-3 rounded-xl border-2 bg-white inline-block"
                style={{ borderColor: primaryVar }}
              >
                <QRCodeSVG value={qrValue} size={110} level="M" />
              </div>
              <div className="text-[10px] text-gray-500 mt-2 font-semibold">
                Verification d'authenticite
              </div>
            </div>
          </div>

          {/* ---- Footer ---- */}
          <div className="mt-8 md:mt-12 pt-4 border-t-2 border-dashed border-gray-300 flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-4">
            <div className="text-xs text-gray-400">
              Ce badge est un document officiel. Toute falsification est passible de sanctions.
            </div>
            <div className="text-xs font-bold uppercase" style={{ color: primaryVar }}>
              Cachet &amp; Signature
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
      </div>
    </Modal>
  );
};
