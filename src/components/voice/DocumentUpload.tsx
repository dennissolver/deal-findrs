'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Check, X, AlertCircle, Loader2, Mic, Volume2 } from 'lucide-react';
import { DOCUMENT_CATEGORIES } from '@/lib/voice/prompts';
import { useVoiceAssistant } from '@/lib/voice/useVoiceAssistant';

interface UploadedDocument {
  id: string;
  file: File;
  category: string;
  status: 'uploading' | 'uploaded' | 'error';
  progress: number;
  url?: string;
}

interface DocumentUploadProps {
  opportunityId?: string;
  onDocumentsChange?: (docs: UploadedDocument[]) => void;
  className?: string;
}

export function DocumentUpload({ 
  opportunityId,
  onDocumentsChange,
  className = '' 
}: DocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isListening,
    isSpeaking,
    isSupported,
    speak,
    startListening,
    stopListening,
  } = useVoiceAssistant({
    autoListen: false,
  });

  // Handle file selection
  const handleFiles = useCallback((files: FileList, category?: string) => {
    const newDocs: UploadedDocument[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      category: category || currentCategory || 'other',
      status: 'uploading' as const,
      progress: 0,
    }));

    setDocuments(prev => {
      const updated = [...prev, ...newDocs];
      onDocumentsChange?.(updated);
      return updated;
    });

    // Simulate upload (replace with real Supabase upload)
    newDocs.forEach(doc => {
      simulateUpload(doc.id);
    });
  }, [currentCategory, onDocumentsChange]);

  // Simulate upload progress
  const simulateUpload = (docId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10 + Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setDocuments(prev => prev.map(d => 
          d.id === docId ? { ...d, status: 'uploaded', progress: 100 } : d
        ));
      } else {
        setDocuments(prev => prev.map(d => 
          d.id === docId ? { ...d, progress: Math.min(progress, 99) } : d
        ));
      }
    }, 200);
  };

  // Remove document
  const removeDocument = (docId: string) => {
    setDocuments(prev => {
      const updated = prev.filter(d => d.id !== docId);
      onDocumentsChange?.(updated);
      return updated;
    });
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Voice guidance
  const startVoiceGuidance = async () => {
    setVoiceActive(true);
    await speak("Let's gather the supporting documents. These help me give you a more accurate assessment. First up - do you have the certificate of title or proof of ownership? Just upload it now or say skip to move on.");
  };

  // Get category status
  const getCategoryStatus = (categoryKey: string) => {
    const uploaded = documents.filter(d => d.category === categoryKey && d.status === 'uploaded');
    return uploaded.length > 0 ? 'uploaded' : 'pending';
  };

  // Count uploaded documents
  const uploadedCount = documents.filter(d => d.status === 'uploaded').length;
  const requiredCount = DOCUMENT_CATEGORIES.filter(c => c.required).length;
  const requiredUploaded = DOCUMENT_CATEGORIES.filter(c => c.required && getCategoryStatus(c.key) === 'uploaded').length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Voice Guidance Banner */}
      {isSupported && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            {isSpeaking ? (
              <Volume2 className="w-6 h-6 animate-pulse" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
            <div>
              <p className="font-medium">Document Collection Assistant</p>
              <p className="text-sm text-white/80">
                {voiceActive 
                  ? "I'll guide you through the documents needed..." 
                  : "Let me guide you through what documents to upload"}
              </p>
            </div>
          </div>
          <button
            onClick={voiceActive ? () => setVoiceActive(false) : startVoiceGuidance}
            className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
          >
            {voiceActive ? 'Stop Guide' : '🎙️ Start Guide'}
          </button>
        </div>
      )}

      {/* Progress Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Upload Progress</h3>
          <span className="text-sm text-gray-600">
            {uploadedCount} document{uploadedCount !== 1 ? 's' : ''} uploaded
          </span>
        </div>
        <div className="flex gap-2">
          <div className={`flex-1 h-2 rounded-full ${requiredUploaded >= requiredCount ? 'bg-emerald-500' : 'bg-amber-500'}`}>
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(requiredUploaded / requiredCount) * 100}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {requiredUploaded}/{requiredCount} required documents uploaded
        </p>
      </div>

      {/* Document Categories Grid */}
      <div className="grid grid-cols-2 gap-4">
        {DOCUMENT_CATEGORIES.map((category) => {
          const status = getCategoryStatus(category.key);
          const categoryDocs = documents.filter(d => d.category === category.key);
          
          return (
            <div
              key={category.key}
              className={`relative rounded-xl border-2 border-dashed p-4 transition-all cursor-pointer ${
                status === 'uploaded'
                  ? 'border-emerald-300 bg-emerald-50'
                  : currentCategory === category.key
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => {
                setCurrentCategory(category.key);
                fileInputRef.current?.click();
              }}
            >
              {/* Required Badge */}
              {category.required && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                  Required
                </span>
              )}

              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  status === 'uploaded' ? 'bg-emerald-200' : 'bg-gray-200'
                }`}>
                  {status === 'uploaded' ? (
                    <Check className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{category.label}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{category.description}</p>
                  
                  {/* Show uploaded files */}
                  {categoryDocs.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {categoryDocs.map(doc => (
                        <div key={doc.id} className="flex items-center gap-2 text-xs">
                          {doc.status === 'uploading' ? (
                            <Loader2 className="w-3 h-3 animate-spin text-violet-600" />
                          ) : doc.status === 'uploaded' ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-red-500" />
                          )}
                          <span className="truncate text-gray-600">{doc.file.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDocument(doc.id);
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Drop Zone */}
      <div
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          dragActive 
            ? 'border-violet-500 bg-violet-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => {
          setCurrentCategory(null);
          fileInputRef.current?.click();
        }}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-violet-500' : 'text-gray-400'}`} />
        <p className="text-gray-600 font-medium">
          {dragActive ? 'Drop files here...' : 'Drag & drop files or click to browse'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          PDF, DOC, JPG, PNG up to 50MB each
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.dwg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
          e.target.value = ''; // Reset for same file selection
        }}
      />

      {/* Document List (All Uploaded) */}
      {documents.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-3">All Uploaded Documents</h4>
          <div className="space-y-2">
            {documents.map(doc => (
              <div 
                key={doc.id}
                className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  doc.status === 'uploaded' ? 'bg-emerald-100' : 
                  doc.status === 'error' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  {doc.status === 'uploading' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  ) : doc.status === 'uploaded' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {DOCUMENT_CATEGORIES.find(c => c.key === doc.category)?.label || 'Other'} • 
                    {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  
                  {/* Progress bar */}
                  {doc.status === 'uploading' && (
                    <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-violet-500 transition-all"
                        style={{ width: `${doc.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => removeDocument(doc.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What Documents Help With */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Why upload documents?
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Title:</strong> Verifies ownership, checks encumbrances & easements</li>
          <li>• <strong>DA Approval:</strong> Confirms lot yield, conditions, expiry dates</li>
          <li>• <strong>Survey:</strong> Validates dimensions, boundaries, site constraints</li>
          <li>• <strong>Construction Quotes:</strong> Cross-checks your cost estimates</li>
          <li>• <strong>Reports:</strong> Identifies hidden risks (contamination, geotech issues)</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          📊 More documents = more accurate assessment
        </p>
      </div>
    </div>
  );
}

export default DocumentUpload;