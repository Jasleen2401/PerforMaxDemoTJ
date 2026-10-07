import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { useImportLibrariesMutation } from '../../services/kpiApi';
import type { KpiImportResult } from '../../features/kpi/kpiTypes';

interface KpiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KpiImportModal: React.FC<KpiImportModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<KpiImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importLibraries, { isLoading }] = useImportLibrariesMutation();

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.xlsx')) {
      setFile(droppedFile);
      setGlobalError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setGlobalError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await importLibraries(formData).unwrap();
      if (response.code === 200) {
        setImportResult(response.data);
      }
    } catch (err: any) {
      if (err?.data?.errors && Array.isArray(err.data.errors)) {
        setImportResult({
          totalSectionsFound: 0,
          successfulImports: 0,
          failedImports: err.data.errors.length,
          errors: err.data.errors
        });
      } else {
        const errorMessage = 'An unexpected error occurred during import.';
        setGlobalError(errorMessage);
        console.error('Import failed:', err);
      }
    }
  };

  const reset = () => {
    setFile(null);
    setImportResult(null);
    setGlobalError(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Import Library Template</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">Upload Standard Scorecard (.xlsx)</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200/50 rounded-xl transition-colors text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          {!importResult ? (
            <div className="space-y-6">
              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-3xl p-12 transition-all cursor-pointer group
                  ${isDragging ? 'border-blue-500 bg-blue-50/50 scale-[0.99]' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50/50'}
                  ${file ? 'border-green-400 bg-green-50/30' : ''}
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx"
                  className="hidden"
                />
                
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={`p-4 rounded-2xl transition-all ${file ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600 group-hover:scale-110'}`}>
                    {file ? <FileText className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                  </div>
                  
                  {file ? (
                    <div>
                      <p className="text-sm font-black text-gray-900">{file.name}</p>
                      <p className="text-[10px] text-green-600 font-bold uppercase mt-1">File ready to import</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-gray-900">Drag and drop your file here</p>
                      <p className="text-xs text-gray-400 mt-1">or click to browse from computer</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Global Error Display */}
              {globalError && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-4 animate-in shake duration-300">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-[11px] text-red-800 leading-relaxed font-bold">
                    {globalError}
                  </p>
                </div>
              )}

              {/* Template Info */}
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex gap-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  Please ensure your Excel file follows the standardized scorecard format. The system will automatically resolve positions and categories by name.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={!file || isLoading}
                  onClick={handleUpload}
                  className={`
                    flex-[2] px-6 py-3.5 rounded-xl text-sm font-black text-white shadow-lg transition-all flex items-center justify-center gap-2
                    ${!file || isLoading ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'}
                  `}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing Scorecards...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Start Bulk Import
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Result View */
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 p-6 rounded-3xl bg-gray-50 border border-gray-100">
                <div className={`p-3 rounded-2xl ${importResult.failedImports === 0 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                  {importResult.failedImports === 0 ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Import Summary</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                    {importResult.successfulImports} Success • {importResult.failedImports} Failed • {importResult.totalSectionsFound} Total
                  </p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-1">Error Logs</p>
                  <div className="max-h-[200px] overflow-y-auto rounded-2xl border border-red-50 bg-red-50/30 p-2 space-y-1 custom-scrollbar">
                    {importResult.errors.map((error, idx) => (
                      <div key={idx} className="flex gap-3 items-start p-3 bg-white rounded-xl shadow-sm border border-red-100/50">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium text-gray-700 leading-relaxed">{error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={importResult.failedImports > 0 ? reset : onClose}
                  className="w-full px-6 py-4 rounded-2xl text-sm font-black text-white bg-gray-900 hover:bg-black shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {importResult.failedImports > 0 ? 'Retry with Fixed File' : 'Complete & Close'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KpiImportModal;
