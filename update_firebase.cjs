const fs = require('fs');

const path = 'r:\\Mes Applications\\pr-scl\\services\\firebase.ts';
let content = fs.readFileSync(path, 'utf8');

// Students
content = content.replace(
    /export const fetchStudents = async \(\): Promise<Student\[\]> => \{([\s\S]*?)const q = query\(collection\(db, "students"\), where\("school_id", "==", schoolId\)\);/g,
    `export const fetchStudents = async (academicYear: string): Promise<Student[]> => {$1const q = query(collection(db, "students"), where("school_id", "==", schoolId), where("academic_year", "==", academicYear));`
);

content = content.replace(
    /export const subscribeToStudents = \(schoolId: string, callback: \(students: Student\[\]\) => void\): \(\(\) => void\) => \{[\s\S]*?const q = query\(collection\(db, "students"\), where\("school_id", "==", schoolId\)\);/g,
    `export const subscribeToStudents = (schoolId: string, academicYear: string, callback: (students: Student[]) => void): (() => void) => {\n    const q = query(collection(db, "students"), where("school_id", "==", schoolId), where("academic_year", "==", academicYear));`
);

content = content.replace(/const docId = \`\$\{schoolId\}_\$\{student.id\}\`;/g, 'const docId = `${schoolId}_${student.academic_year}_${student.id}`;');
content = content.replace(/export const deleteStudentDB = async \(id: string\) => \{/g, 'export const deleteStudentDB = async (id: string, academicYear: string) => {');
content = content.replace(/const docId = \`\$\{schoolId\}_\$\{id\}\`;\n    await deleteDoc\(doc\(db, "students", docId\)\);/g, 'const docId = `${schoolId}_${academicYear}_${id}`;\n    await deleteDoc(doc(db, "students", docId));');

// Grades
content = content.replace(
    /export const fetchGrades = async \(\): Promise<Grade\[\]> => \{([\s\S]*?)const q = query\(collection\(db, "grades"\), where\("school_id", "==", schoolId\)\);/g,
    `export const fetchGrades = async (academicYear: string): Promise<Grade[]> => {$1const q = query(collection(db, "grades"), where("school_id", "==", schoolId), where("academic_year", "==", academicYear));`
);

content = content.replace(
    /export const subscribeToGrades = \(schoolId: string, callback: \(grades: Grade\[\]\) => void\): \(\(\) => void\) => \{[\s\S]*?const q = query\(collection\(db, "grades"\), where\("school_id", "==", schoolId\)\);/g,
    `export const subscribeToGrades = (schoolId: string, academicYear: string, callback: (grades: Grade[]) => void): (() => void) => {\n    const q = query(collection(db, "grades"), where("school_id", "==", schoolId), where("academic_year", "==", academicYear));`
);

content = content.replace(/const docId = \`\$\{schoolId\}_\$\{grade.id\}\`;/g, 'const docId = `${schoolId}_${grade.academic_year}_${grade.id}`;');
content = content.replace(/export const deleteGradeDB = async \(id: string\) => \{/g, 'export const deleteGradeDB = async (id: string, academicYear: string) => {');
content = content.replace(/const docId = \`\$\{schoolId\}_\$\{id\}\`;\n    await deleteDoc\(doc\(db, "grades", docId\)\);/g, 'const docId = `${schoolId}_${academicYear}_${id}`;\n    await deleteDoc(doc(db, "grades", docId));');

// Payments
content = content.replace(
    /export const fetchPayments = async \(\): Promise<Payment\[\]> => \{([\s\S]*?)const q = query\(collection\(db, "payments"\), where\("school_id", "==", schoolId\)\);/g,
    `export const fetchPayments = async (academicYear: string): Promise<Payment[]> => {$1const q = query(collection(db, "payments"), where("school_id", "==", schoolId), where("academic_year", "==", academicYear));`
);

content = content.replace(
    /export const subscribeToPayments = \(schoolId: string, callback: \(payments: Payment\[\]\) => void\): \(\(\) => void\) => \{[\s\S]*?const q = query\(collection\(db, "payments"\), where\("school_id", "==", schoolId\)\);/g,
    `export const subscribeToPayments = (schoolId: string, academicYear: string, callback: (payments: Payment[]) => void): (() => void) => {\n    const q = query(collection(db, "payments"), where("school_id", "==", schoolId), where("academic_year", "==", academicYear));`
);

content = content.replace(/const docId = \`\$\{schoolId\}_\$\{payment.id\}\`;/g, 'const docId = `${schoolId}_${payment.academic_year}_${payment.id}`;');
content = content.replace(/export const deletePaymentDB = async \(id: string\) => \{/g, 'export const deletePaymentDB = async (id: string, academicYear: string) => {');
content = content.replace(/const docId = \`\$\{schoolId\}_\$\{id\}\`;\n    await deleteDoc\(doc\(db, "payments", docId\)\);/g, 'const docId = `${schoolId}_${academicYear}_${id}`;\n    await deleteDoc(doc(db, "payments", docId));');


// findIdentityByMatricule - needs to scan across years for students
// "const studentsRef = collection(db, "students");"
// "const q = query(studentsRef, where("matricule", "==", matricule));"
// For now, we leave it, it will return all students matching matricule.
// But we need to build `allowed_academic_years`
const identityCode = `
    const studentsRef = collection(db, "students");
    // On cherche tous les enregistrements de l'élève (toutes années confondues) pour ce matricule et cette école
    const q = query(studentsRef, where("matricule", "==", matricule));
    const querySnapshot = await getDocs(q);

    let allowedYears: string[] = [];
    let schoolIdMatch = null;
    let studentData = null;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.school_id) {
         schoolIdMatch = data.school_id;
         if (data.academic_year) {
             allowedYears.push(data.academic_year);
         }
         // Prendre les infos les plus récentes (on peut juste prendre n'importe lequel pour l'identité de base)
         studentData = data;
      }
    });

    if (schoolIdMatch && studentData) {
      // Find school name
      let schoolName = "École Inconnue";
      try {
        const schoolDoc = await getDoc(doc(db, "schools", schoolIdMatch));
        if (schoolDoc.exists()) {
          schoolName = schoolDoc.data().name || schoolName;
        }
      } catch (e) {
        console.warn("Could not fetch school details", e);
      }
      
      return {
        role: 'eleve' as const,
        school_id: schoolIdMatch,
        school_name: schoolName,
        matricule: matricule,
        allowed_academic_years: allowedYears
      };
    }
`;

content = content.replace(
    /const studentsRef = collection\(db, "students"\);[\s\S]*?return \{\n\s*role: 'eleve' as const,\n\s*school_id: studentData\.school_id,\n\s*school_name: schoolName,\n\s*matricule: matricule\n\s*\};\n\s*\}/g,
    identityCode
);

// We need to also add allowed_academic_years to staff login. Staff members are in app_config/schoolId_settings
// In the code:
// const settingsRef = collection(db, "app_config"); ...
const staffIdentityCode = `
      const configData = settingsDoc.data().data;
      const staffMembers = configData.staff || [];
      const staffMatch = staffMembers.find((s: any) => s.matricule === matricule);
      
      if (staffMatch) {
        // Find school name
        let schoolName = "École Inconnue";
        try {
          const schoolDoc = await getDoc(doc(db, "schools", schoolId));
          if (schoolDoc.exists()) {
            schoolName = schoolDoc.data().name || schoolName;
          }
        } catch (e) {
          console.warn("Could not fetch school details", e);
        }

        return {
          role: staffMatch.role === 'Professeur' ? 'professeur' : 'gestionnaire',
          school_id: schoolId,
          school_name: schoolName,
          matricule: matricule,
          allowed_academic_years: staffMatch.activeYears || [] // par défaut ou toutes ?
        };
      }
`;

content = content.replace(
    /const configData = settingsDoc\.data\(\)\.data;[\s\S]*?return \{\n\s*role: staffMatch\.role === 'Professeur' \? 'professeur' : 'gestionnaire',\n\s*school_id: schoolId,\n\s*school_name: schoolName,\n\s*matricule: matricule\n\s*\};\n\s*\}/g,
    staffIdentityCode
);

// We also need to add allowed_academic_years to Dirigeant
// if (schoolDoc.exists()) { ...
const ownerIdentityCode = `
        return {
          role: 'dirigeant' as const,
          school_id: schoolId,
          school_name: schoolData.name || "Mon École",
          allowed_academic_years: [] // Toutes les années par défaut
        };
`;
content = content.replace(
    /return \{\n\s*role: 'dirigeant' as const,\n\s*school_id: schoolId,\n\s*school_name: schoolData\.name \|\| "Mon École"\n\s*\};/g,
    ownerIdentityCode
);

fs.writeFileSync(path, content, 'utf8');
console.log('firebase.ts updated');
