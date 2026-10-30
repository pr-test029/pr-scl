import React, { useState, useMemo } from 'react';
import { Card, Input, Button, Select, Modal } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { TimetableSlot, AttendanceRecord, GeneralNote } from '../../types';

export const TimetableManagement: React.FC = () => {
    const { settings, updateSettings, cycles, subjects, session } = useSchool();
    const [activeTab, setActiveTab] = useState<'presence' | 'planning' | 'notes'>('presence');

    const timetable: TimetableSlot[] = settings.timetable || [];
    const attendanceList: AttendanceRecord[] = settings.attendance || [];
    const notesList: GeneralNote[] = settings.notes || [];

    // Filter state for Timetable & Presence
    const [selectedCycleId, setSelectedCycleId] = useState<string>(Object.keys(cycles)[0] || '');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [attendanceDate, setAttendanceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

    // Timetable slot form state
    const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
    const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
    const [slotDay, setSlotDay] = useState<TimetableSlot['day']>('Lundi');
    const [slotStartTime, setSlotStartTime] = useState('08:00');
    const [slotEndTime, setSlotEndTime] = useState('10:00');
    const [slotSubject, setSlotSubject] = useState('');
    const [slotRoom, setSlotRoom] = useState('');
    const [slotConflictError, setSlotConflictError] = useState<string>('');

    // Notes state
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<GeneralNote | null>(null);
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');

    const currentCycle = cycles[selectedCycleId];

    // Calcul des classes de ce cycle
    const cycleClasses = useMemo(() => {
        if (!currentCycle) return [];
        if (currentCycle.type === 'simple') return currentCycle.levels;
        const suffixes = currentCycle.type === 'series' ? currentCycle.series : currentCycle.specialites;
        const combos: string[] = [];
        currentCycle.levels.forEach(lvl => {
            if (suffixes.length > 0) {
                suffixes.forEach(s => combos.push(`${lvl} ${s}`));
            } else {
                combos.push(lvl);
            }
        });
        return combos;
    }, [currentCycle]);

    // Sélection par défaut de la première classe si vide
    React.useEffect(() => {
        if (cycleClasses.length > 0 && (!selectedClass || !cycleClasses.includes(selectedClass))) {
            setSelectedClass(cycleClasses[0]);
        }
    }, [cycleClasses, selectedClass]);

    // Matières de la classe sélectionnée
    const classSubjects = useMemo(() => {
        if (!selectedClass) return [];
        return subjects[selectedClass] || [];
    }, [subjects, selectedClass]);

    // Trouver automatiquement le professeur assigné à la matière pour la classe
    const getTeacherForSubject = (className: string, subjectName: string) => {
        // 1. Chercher dans les matières de la classe
        const subs = subjects[className] || [];
        const foundSub = subs.find(s => s.nom.toLowerCase() === subjectName.toLowerCase());
        if (foundSub?.teacher) {
            // Chercher dans staff pour avoir le matricule
            const staffMem = (settings.staff || []).find(st => 
                `${st.prenom} ${st.nom}`.toLowerCase() === foundSub.teacher?.toLowerCase() ||
                st.nom.toLowerCase() === foundSub.teacher?.toLowerCase() ||
                st.matricule.toLowerCase() === foundSub.teacher?.toLowerCase()
            );
            if (staffMem) {
                return { name: `${staffMem.prenom} ${staffMem.nom}`, matricule: staffMem.matricule };
            }
            return { name: foundSub.teacher, matricule: foundSub.teacher };
        }

        // 2. Chercher dans les assignments du personnel
        for (const st of (settings.staff || [])) {
            if (st.assignments && st.assignments.some(a => a.classe === className && (a.subjects.length === 0 || a.subjects.includes(subjectName)))) {
                return { name: `${st.prenom} ${st.nom}`, matricule: st.matricule };
            }
            if (st.assignedClasses && st.assignedClasses.includes(className)) {
                return { name: `${st.prenom} ${st.nom}`, matricule: st.matricule };
            }
        }

        return { name: 'Non assigné', matricule: 'NA' };
    };

    // Helper: conversion heure HH:MM en minutes
    const timeToMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    // Helper: calculer durée en minutes entre deux heures HH:MM
    const calculateDurationMinutes = (startStr: string, endStr: string) => {
        const start = timeToMinutes(startStr);
        const end = timeToMinutes(endStr);
        return Math.max(0, end - start);
    };

    // Détection de conflit de créneaux
    const checkSlotConflict = (day: string, start: string, end: string, teacherMatricule: string, excludeSlotId?: string | null) => {
        if (!teacherMatricule || teacherMatricule === 'NA') return null;
        const newStart = timeToMinutes(start);
        const newEnd = timeToMinutes(end);

        for (const slot of timetable) {
            if (excludeSlotId && slot.id === excludeSlotId) continue;
            if (slot.day === day && slot.teacherMatricule === teacherMatricule) {
                const existingStart = timeToMinutes(slot.startTime);
                const existingEnd = timeToMinutes(slot.endTime);
                // Chevauchement
                if (newStart < existingEnd && newEnd > existingStart) {
                    return `Ce professeur (${slot.teacherName}) a DÉJÀ cours le ${day} de ${slot.startTime} à ${slot.endTime} en classe de ${slot.classe} !`;
                }
            }
        }
        return null;
    };

    // Ajout / Mise à jour d'un créneau dans l'emploi du temps
    const handleSaveSlot = () => {
        setSlotConflictError('');
        if (!selectedClass || !slotSubject) {
            setSlotConflictError('Veuillez sélectionner une matière.');
            return;
        }

        if (timeToMinutes(slotEndTime) <= timeToMinutes(slotStartTime)) {
            setSlotConflictError("L'heure de fin doit être strictement supérieure à l'heure de début.");
            return;
        }

        const teacher = getTeacherForSubject(selectedClass, slotSubject);

        // Vérification de conflit enseignant
        const conflict = checkSlotConflict(slotDay, slotStartTime, slotEndTime, teacher.matricule, editingSlotId);
        if (conflict) {
            setSlotConflictError(conflict);
            return;
        }

        const newSlot: TimetableSlot = {
            id: editingSlotId || `slot_${Date.now()}`,
            day: slotDay,
            startTime: slotStartTime,
            endTime: slotEndTime,
            classe: selectedClass,
            subject: slotSubject,
            teacherMatricule: teacher.matricule,
            teacherName: teacher.name,
            room: slotRoom || undefined
        };

        const updatedTimetable = editingSlotId
            ? timetable.map(s => s.id === editingSlotId ? newSlot : s)
            : [...timetable, newSlot];

        updateSettings({
            ...settings,
            timetable: updatedTimetable
        });

        setIsSlotModalOpen(false);
        setEditingSlotId(null);
        setSlotSubject('');
        setSlotRoom('');
    };

    const handleDeleteSlot = (slotId: string) => {
        if (confirm("Supprimer ce créneau de l'emploi du temps ?")) {
            updateSettings({
                ...settings,
                timetable: timetable.filter(s => s.id !== slotId)
            });
        }
    };

    // Pointage de présence facile pour le surveillant général
    const handleToggleAttendance = (slot: TimetableSlot) => {
        const recordId = `${slot.id}_${attendanceDate}`;
        const existingRecord = attendanceList.find(r => r.id === recordId);
        const duration = calculateDurationMinutes(slot.startTime, slot.endTime);

        let updatedList: AttendanceRecord[];
        if (existingRecord) {
            // Basculer
            updatedList = attendanceList.map(r => r.id === recordId ? {
                ...r,
                present: !r.present,
                markedAt: new Date().toISOString(),
                markedBy: session?.display_name || 'Surveillant Général'
            } : r);
        } else {
            // Créer marqué présent
            const newRecord: AttendanceRecord = {
                id: recordId,
                slotId: slot.id,
                date: attendanceDate,
                classe: slot.classe,
                subject: slot.subject,
                teacherMatricule: slot.teacherMatricule,
                teacherName: slot.teacherName,
                present: true,
                durationMinutes: duration,
                markedAt: new Date().toISOString(),
                markedBy: session?.display_name || 'Surveillant Général'
            };
            updatedList = [...attendanceList, newRecord];
        }

        updateSettings({
            ...settings,
            attendance: updatedList
        });
    };

    // Gestion des Notes du surveillant
    const handleSaveNote = () => {
        if (!noteTitle.trim() || !noteContent.trim()) {
            alert("Veuillez remplir le titre et le contenu de la remarque.");
            return;
        }

        const now = new Date().toISOString();
        let updatedNotes: GeneralNote[];

        if (editingNote) {
            updatedNotes = notesList.map(n => n.id === editingNote.id ? {
                ...n,
                title: noteTitle.trim(),
                content: noteContent.trim(),
                updatedAt: now
            } : n);
        } else {
            const newNote: GeneralNote = {
                id: `note_${Date.now()}`,
                title: noteTitle.trim(),
                content: noteContent.trim(),
                authorMatricule: session?.matricule,
                authorName: session?.display_name || 'Surveillant Général',
                createdAt: now,
                updatedAt: now
            };
            updatedNotes = [newNote, ...notesList];
        }

        updateSettings({
            ...settings,
            notes: updatedNotes
        });

        setIsNoteModalOpen(false);
        setEditingNote(null);
        setNoteTitle('');
        setNoteContent('');
    };

    const handleDeleteNote = (noteId: string) => {
        if (confirm("Supprimer cette remarque ?")) {
            updateSettings({
                ...settings,
                notes: notesList.filter(n => n.id !== noteId)
            });
        }
    };

    const days: TimetableSlot['day'][] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    // Obtenir le jour de la semaine pour la date d'appel sélectionnée
    const getDayNameFromDate = (dateStr: string): TimetableSlot['day'] => {
        const date = new Date(dateStr + 'T12:00:00');
        const dayIdx = date.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
        const map: Record<number, TimetableSlot['day']> = {
            1: 'Lundi',
            2: 'Mardi',
            3: 'Mercredi',
            4: 'Jeudi',
            5: 'Vendredi',
            6: 'Samedi'
        };
        return map[dayIdx] || 'Lundi';
    };

    const currentAttendanceDay = getDayNameFromDate(attendanceDate);

    // Créneaux prévus pour le jour d'appel
    const slotsForAttendanceDay = useMemo(() => {
        return timetable
            .filter(s => s.day === currentAttendanceDay && (!selectedClass || s.classe === selectedClass))
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    }, [timetable, currentAttendanceDay, selectedClass]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-white/5 p-6 rounded-3xl border dark:border-white/10 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-indigo-600/30">
                            <i className="fas fa-calendar-check"></i>
                        </span>
                        Emplois du Temps & Contrôle des Présences
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Espace de contrôle quotidien du Surveillant Général, planification des cours et suivi des enseignants.
                    </p>
                </div>

                {/* Onglets */}
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/10 p-1.5 rounded-2xl border dark:border-white/5">
                    <button
                        onClick={() => setActiveTab('presence')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'presence'
                                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                        }`}
                    >
                        <i className="fas fa-check-double"></i> Pointage Présences
                    </button>
                    <button
                        onClick={() => setActiveTab('planning')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'planning'
                                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                        }`}
                    >
                        <i className="fas fa-calendar-alt"></i> Grille Emploi du Temps
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'notes'
                                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                        }`}
                    >
                        <i className="fas fa-sticky-note"></i> Cahier de Notes
                        {notesList.length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                                {notesList.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* TAB 1: POINTAGE DES PRÉSENCES ENSEIGNANTS */}
            {activeTab === 'presence' && (
                <div className="space-y-6">
                    <Card>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b dark:border-white/10">
                            <div>
                                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                    <i className="fas fa-user-check text-emerald-600"></i> Pointage Quotidien des Enseignants
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Cochez facilement la présence des professeurs pour la date sélectionnée. Les heures validées alimentent automatiquement le calcul des salaires des prestataires.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Date :</label>
                                    <input
                                        type="date"
                                        value={attendanceDate}
                                        onChange={e => setAttendanceDate(e.target.value)}
                                        className="px-3 py-1.5 rounded-xl border dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Classe :</label>
                                    <select
                                        value={selectedClass}
                                        onChange={e => setSelectedClass(e.target.value)}
                                        className="px-3 py-1.5 rounded-xl border dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold"
                                    >
                                        <option value="">Toutes les classes</option>
                                        {cycleClasses.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Liste des créneaux pour ce jour */}
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                    Cours prévus le {currentAttendanceDay} ({new Date(attendanceDate).toLocaleDateString('fr-FR')})
                                </span>
                                <span className="text-xs text-gray-400">
                                    {slotsForAttendanceDay.length} cours prévu(s)
                                </span>
                            </div>

                            {slotsForAttendanceDay.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/10">
                                    <i className="fas fa-calendar-times text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
                                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                        Aucun cours configuré le {currentAttendanceDay} pour cette sélection.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('planning')}
                                        className="mt-3 text-xs text-indigo-600 hover:underline font-bold"
                                    >
                                        Configurer l'emploi du temps dans l'onglet Grille &rarr;
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {slotsForAttendanceDay.map(slot => {
                                        const recordId = `${slot.id}_${attendanceDate}`;
                                        const record = attendanceList.find(r => r.id === recordId);
                                        const isPresent = record?.present || false;
                                        const durationMin = calculateDurationMinutes(slot.startTime, slot.endTime);
                                        const hours = (durationMin / 60).toFixed(1);

                                        return (
                                            <div
                                                key={slot.id}
                                                className={`p-5 rounded-2xl border transition-all ${
                                                    isPresent
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-md'
                                                        : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className="text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
                                                            {slot.classe}
                                                        </span>
                                                        <h4 className="font-bold text-lg dark:text-white mt-2">{slot.subject}</h4>
                                                    </div>
                                                    <span className="text-xs font-mono font-bold bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-lg">
                                                        {slot.startTime} - {slot.endTime} ({hours}h)
                                                    </span>
                                                </div>

                                                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300 mb-4">
                                                    <p className="flex items-center gap-2">
                                                        <i className="fas fa-chalkboard-teacher text-indigo-500"></i>
                                                        <strong>Prof :</strong> {slot.teacherName}
                                                        {slot.teacherMatricule !== 'NA' && (
                                                            <span className="font-mono text-[10px] text-gray-400">({slot.teacherMatricule})</span>
                                                        )}
                                                    </p>
                                                    {slot.room && (
                                                        <p className="flex items-center gap-2">
                                                            <i className="fas fa-door-open text-amber-500"></i>
                                                            <strong>Salle :</strong> {slot.room}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Bouton de pointage */}
                                                <button
                                                    onClick={() => handleToggleAttendance(slot)}
                                                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                                                        isPresent
                                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30'
                                                            : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300'
                                                    }`}
                                                >
                                                    <i className={`fas ${isPresent ? 'fa-check-circle' : 'fa-circle'}`}></i>
                                                    {isPresent ? 'Présence Validée (Coché)' : 'Marquer Présent'}
                                                </button>
                                                {record?.markedAt && (
                                                    <p className="text-[10px] text-gray-400 text-center mt-2">
                                                        Pointé par {record.markedBy} à {new Date(record.markedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 2: GRILLE DE L'EMPLOI DU TEMPS */}
            {activeTab === 'planning' && (
                <div className="space-y-6">
                    <Card>
                        {/* Sélecteurs de classe et cycle */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b dark:border-white/10">
                            <div className="flex flex-wrap items-center gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">Cycle :</label>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {Object.values(cycles).map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => setSelectedCycleId(c.id)}
                                                className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                                                    selectedCycleId === c.id
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10'
                                                }`}
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">Classe :</label>
                                    <select
                                        value={selectedClass}
                                        onChange={e => setSelectedClass(e.target.value)}
                                        className="px-3 py-1.5 rounded-xl border dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold"
                                    >
                                        {cycleClasses.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <Button
                                onClick={() => {
                                    setEditingSlotId(null);
                                    setSlotConflictError('');
                                    setSlotSubject(classSubjects[0]?.nom || '');
                                    setIsSlotModalOpen(true);
                                }}
                                variant="primary"
                                size="sm"
                                disabled={!selectedClass}
                            >
                                <i className="fas fa-plus mr-1.5"></i> Ajouter un créneau
                            </Button>
                        </div>

                        {/* Grille Hebdomadaire par jour */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            {days.map(day => {
                                const daySlots = timetable
                                    .filter(s => s.day === day && s.classe === selectedClass)
                                    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

                                return (
                                    <div key={day} className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3 border dark:border-white/10 space-y-3">
                                        <div className="flex justify-between items-center pb-2 border-b dark:border-white/10">
                                            <span className="font-black text-sm text-gray-900 dark:text-white uppercase">{day}</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                                {daySlots.length}
                                            </span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {daySlots.map(slot => (
                                                <div
                                                    key={slot.id}
                                                    className="p-3 bg-white dark:bg-white/5 rounded-xl border dark:border-white/10 shadow-sm hover:shadow transition-all group"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                                            {slot.startTime} - {slot.endTime}
                                                        </span>
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingSlotId(slot.id);
                                                                    setSlotDay(slot.day);
                                                                    setSlotStartTime(slot.startTime);
                                                                    setSlotEndTime(slot.endTime);
                                                                    setSlotSubject(slot.subject);
                                                                    setSlotRoom(slot.room || '');
                                                                    setSlotConflictError('');
                                                                    setIsSlotModalOpen(true);
                                                                }}
                                                                className="text-gray-400 hover:text-indigo-600 text-xs p-1"
                                                                title="Modifier"
                                                            >
                                                                <i className="fas fa-edit"></i>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteSlot(slot.id)}
                                                                className="text-gray-400 hover:text-red-600 text-xs p-1"
                                                                title="Supprimer"
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <h5 className="font-bold text-sm dark:text-white mt-1">{slot.subject}</h5>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                        <i className="fas fa-chalkboard-teacher mr-1 text-gray-400"></i>
                                                        {slot.teacherName}
                                                    </p>
                                                    {slot.room && (
                                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                                                            <i className="fas fa-door-open mr-1"></i> {slot.room}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}

                                            {daySlots.length === 0 && (
                                                <p className="text-[11px] text-gray-400 italic text-center py-6">
                                                    Aucun cours
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 3: CAHIER DE NOTES ET REMARQUES DU SURVEILLANT */}
            {activeTab === 'notes' && (
                <div className="space-y-6">
                    <Card>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b dark:border-white/10">
                            <div>
                                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                    <i className="fas fa-clipboard-list text-amber-500"></i> Cahier de Notes du Surveillant Général
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Prise de note quotidienne datée et horodatée pour consigner retards, absences, remarques de discipline ou incidents.
                                </p>
                            </div>
                            <Button
                                onClick={() => {
                                    setEditingNote(null);
                                    setNoteTitle('');
                                    setNoteContent('');
                                    setIsNoteModalOpen(true);
                                }}
                                variant="primary"
                                size="sm"
                            >
                                <i className="fas fa-plus mr-1.5"></i> Nouvelle Remarque
                            </Button>
                        </div>

                        <div className="mt-6 space-y-4">
                            {notesList.map(note => {
                                const createdDate = new Date(note.createdAt);
                                const updatedDate = new Date(note.updatedAt);
                                const isModified = note.updatedAt !== note.createdAt;

                                return (
                                    <div
                                        key={note.id}
                                        className="p-5 bg-white dark:bg-white/5 rounded-2xl border dark:border-white/10 shadow-sm hover:border-amber-400 dark:hover:border-amber-500 transition-all"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b dark:border-white/10">
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center text-sm font-bold">
                                                    <i className="fas fa-pen"></i>
                                                </span>
                                                <h4 className="font-bold text-base dark:text-white">{note.title}</h4>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right text-[11px] text-gray-500">
                                                    <p>
                                                        <i className="far fa-clock mr-1"></i>
                                                        Créé le {createdDate.toLocaleDateString('fr-FR')} à {createdDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {isModified && (
                                                        <p className="text-amber-600 dark:text-amber-400 font-semibold">
                                                            Modifié le {updatedDate.toLocaleDateString('fr-FR')} à {updatedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setEditingNote(note);
                                                            setNoteTitle(note.title);
                                                            setNoteContent(note.content);
                                                            setIsNoteModalOpen(true);
                                                        }}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs"
                                                        title="Modifier"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNote(note.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-xs"
                                                        title="Supprimer"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-3 leading-relaxed">
                                            {note.content}
                                        </p>

                                        <p className="text-[10px] text-gray-400 mt-4 flex items-center gap-1.5">
                                            <i className="fas fa-user-shield"></i> Noté par : <strong>{note.authorName}</strong>
                                        </p>
                                    </div>
                                );
                            })}

                            {notesList.length === 0 && (
                                <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/10">
                                    <i className="fas fa-book-open text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
                                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                        Aucune remarque pour le moment.
                                    </p>
                                    <Button
                                        onClick={() => {
                                            setEditingNote(null);
                                            setNoteTitle('');
                                            setNoteContent('');
                                            setIsNoteModalOpen(true);
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="mt-3"
                                    >
                                        Ajouter une première note
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* MODAL CRÉNEAU EMPLOI DU TEMPS */}
            {isSlotModalOpen && (
                <Modal
                    isOpen={true}
                    onClose={() => setIsSlotModalOpen(false)}
                    title={editingSlotId ? "Modifier le créneau" : `Ajouter un cours — ${selectedClass}`}
                    maxWidth="max-w-lg"
                >
                    <div className="space-y-4">
                        {slotConflictError && (
                            <div className="p-3 bg-red-100 text-red-800 text-xs rounded-xl font-bold flex items-center gap-2 border border-red-300">
                                <i className="fas fa-exclamation-triangle text-base"></i>
                                {slotConflictError}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <Select
                                label="Jour"
                                value={slotDay}
                                onChange={e => setSlotDay(e.target.value as any)}
                                options={days.map(d => ({ value: d, label: d }))}
                            />
                            <div>
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">Matière</label>
                                <select
                                    value={slotSubject}
                                    onChange={e => setSlotSubject(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border dark:border-white/10 bg-white dark:bg-white/5 text-sm font-bold"
                                >
                                    <option value="">-- Choisir la matière --</option>
                                    {classSubjects.map(sub => (
                                        <option key={sub.id} value={sub.nom}>{sub.nom}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Professeur auto-assigné */}
                        {slotSubject && (
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-2 text-xs">
                                <i className="fas fa-user-check text-indigo-600"></i>
                                <span>
                                    Professeur assigné : <strong>{getTeacherForSubject(selectedClass, slotSubject).name}</strong>
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Heure de début"
                                type="time"
                                value={slotStartTime}
                                onChange={e => setSlotStartTime(e.target.value)}
                            />
                            <Input
                                label="Heure de fin"
                                type="time"
                                value={slotEndTime}
                                onChange={e => setSlotEndTime(e.target.value)}
                            />
                        </div>

                        <Input
                            label="Salle (facultatif)"
                            placeholder="Ex: Salle 102"
                            value={slotRoom}
                            onChange={e => setSlotRoom(e.target.value)}
                        />

                        <div className="flex justify-end gap-2 pt-4 border-t dark:border-white/10">
                            <Button variant="secondary" onClick={() => setIsSlotModalOpen(false)}>Annuler</Button>
                            <Button variant="primary" onClick={handleSaveSlot}>Enregistrer</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL REMARQUE DU SURVEILLANT */}
            {isNoteModalOpen && (
                <Modal
                    isOpen={true}
                    onClose={() => setIsNoteModalOpen(false)}
                    title={editingNote ? "Modifier la remarque" : "Nouvelle remarque du surveillant"}
                    maxWidth="max-w-lg"
                >
                    <div className="space-y-4">
                        <Input
                            label="Titre / Objet"
                            placeholder="Ex: Retard répété, Incident 3ème A..."
                            value={noteTitle}
                            onChange={e => setNoteTitle(e.target.value)}
                            autoFocus
                        />

                        <div>
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">
                                Contenu de la remarque
                            </label>
                            <textarea
                                value={noteContent}
                                onChange={e => setNoteContent(e.target.value)}
                                placeholder="Détaillez ici l'observation, les faits et l'heure..."
                                rows={5}
                                className="w-full p-3 rounded-xl border dark:border-white/10 bg-white dark:bg-white/5 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t dark:border-white/10">
                            <Button variant="secondary" onClick={() => setIsNoteModalOpen(false)}>Annuler</Button>
                            <Button variant="primary" onClick={handleSaveNote}>Enregistrer la note</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
