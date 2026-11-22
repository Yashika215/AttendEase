import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminApi } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { AcademicYear, Course, Division, YearSemester } from '../types';

interface BulkStudentUploadProps {
  academicYears: AcademicYear[];
  courses: Course[];
  semesters: YearSemester[];
  divisions: Division[];
  onImportComplete: () => void;
}

interface ParsedStudentRow {
  name: string;
  email: string;
  studentId?: string;
  rollNo?: string;
  phone?: string;
}

export const BulkStudentUpload: React.FC<BulkStudentUploadProps> = ({
  academicYears,
  courses,
  semesters,
  divisions,
  onImportComplete
}) => {
  const toast = useToast();
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id || '');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [yearSemesterId, setYearSemesterId] = useState(semesters[0]?.id || '');
  const [divisionId, setDivisionId] = useState(divisions[0]?.id || '');
  const [rows, setRows] = useState<ParsedStudentRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResultMsg(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
      const mapped: ParsedStudentRow[] = json
        .map((r) => ({
          name: String(r.Name || r.name || r.FullName || '').trim(),
          email: String(r.Email || r.email || '').trim(),
          studentId: String(r.StudentID || r.studentId || r.EnrollmentNo || r.RollNo || r.rollNumber || '').trim() || undefined,
          rollNumber: String(r.RollNo || r.rollNo || r.RollNumber || r.rollNumber || r.StudentID || r.studentId || '').trim() || undefined,
          phoneNumber: String(r.Phone || r.phone || r.PhoneNumber || '').trim() || undefined
        }))
        .filter((r) => r.name && r.email);

      setRows(mapped);
      toast.info('File Parsed', `Loaded ${mapped.length} student row(s) ready for import.`);
    } catch {
      toast.error('Parse Failed', 'Could not read Excel/CSV file.');
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const res = await adminApi.bulkImportStudents({
        academicYearId,
        courseId,
        yearSemesterId,
        divisionId,
        students: rows
      });
      const count = res.importedCount ?? res.createdCount ?? rows.length;
      setResultMsg(`Imported ${count} students into division.`);
      toast.success('Bulk Import Complete', `${count} student(s) added.`);
      setRows([]);
      onImportComplete();
    } catch (err: any) {
      toast.error('Import Error', err?.message || 'Bulk student import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      <div>
        <h3 className="text-base font-bold text-[#14213D] dark:text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          <span>Bulk Student Roster Upload (CSV / Excel)</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Upload an Excel (.xlsx) or CSV file with columns: Name, Email, StudentID, RollNo, Phone.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
        >
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} · {c.name}
            </option>
          ))}
        </select>
        <select
          value={yearSemesterId}
          onChange={(e) => setYearSemesterId(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
        >
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={divisionId}
          onChange={(e) => setDivisionId(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
        >
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 cursor-pointer hover:border-blue-500 transition-colors">
        <Upload className="w-7 h-7 text-blue-600 mb-2" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Choose .xlsx or .csv student file
        </span>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
      </label>

      {rows.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-200">
            <AlertCircle className="w-4 h-4" />
            <span>{rows.length} student record(s) ready to import</span>
          </div>
          <button
            type="button"
            disabled={importing}
            onClick={handleImport}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer"
          >
            {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Import Roster</span>
          </button>
        </div>
      )}

      {resultMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{resultMsg}</span>
        </div>
      )}
    </div>
  );
};
