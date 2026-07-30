import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { ROLE_TAGS } from './Header';
import { UploadResponse } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (res: UploadResponse) => void;
  uploadFn: (file: File, roleTag: string) => Promise<UploadResponse>;
  currentRoleTag: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  uploadFn,
  currentRoleTag,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [roleTag, setRoleTag] = useState<string>(currentRoleTag || ROLE_TAGS[0]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateAndSetFile = (file: File) => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) {
      setSelectedFile(null);
      setErrorMsg('Only PDF files (.pdf) are allowed.');
      return false;
    }
    setSelectedFile(file);
    setErrorMsg(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a valid PDF resume file (.pdf)');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const result = await uploadFn(selectedFile, roleTag);
      onUploadSuccess(result);
      setIsUploading(false);
      setSelectedFile(null);
      onClose();
    } catch (err: any) {
      console.error('Upload failed:', err);
      setErrorMsg('Failed to process upload. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden transition-all transform scale-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Upload Resume to Agent Memory</h3>
              <p className="text-xs text-slate-500">AI extracts experiences, skills & bio into session memory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Role Tag Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Target Role Tag
            </label>
            <input
              type="text"
              value={roleTag}
              onChange={(e) => setRoleTag(e.target.value)}
              placeholder="e.g. Software Engineer, Machine Learning, Data Scientist..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Type the exact role you are applying for (e.g. Software Engineer, ML Engineer).
            </p>
          </div>

          {/* Drag & Drop Zone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Resume Document (PDF Only)
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                  : selectedFile
                  ? 'border-emerald-400 bg-emerald-50/20'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900 truncate max-w-[240px]">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready for extraction
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="ml-auto text-xs text-slate-400 hover:text-slate-600 underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    Drag & drop your resume file here, or{' '}
                    <span className="text-indigo-600 font-semibold underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-400">Supports PDF documents up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Error notice */}
          {errorMsg && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting Memory...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save & Analyze Resume
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
