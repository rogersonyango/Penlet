import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Eye, Search, X } from 'lucide-react';
import { contentAPI } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function StudentNotes() {
  const [search, setSearch] = useState('');
  const [viewNote, setViewNote] = useState(null);
  
  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: () => contentAPI.list({ content_type: 'note' }).then(res => res.data),
  });

  const filteredNotes = notes?.filter(note => 
    note.title.toLowerCase().includes(search.toLowerCase())
  );

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith('http')) return fileUrl;
    return `${API_URL}${fileUrl}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Study Notes</h1>
          <p className="text-dark-400">Download and view study materials</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 w-full sm:w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : filteredNotes?.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note, i) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="dashboard-card group"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{note.title}</h3>
                  <p className="text-sm text-dark-400">{note.subject?.name}</p>
                </div>
              </div>
              <p className="text-sm text-dark-400 mt-3 line-clamp-2">{note.description}</p>
              <div className="flex items-center gap-2 mt-4">
                <button 
                  onClick={() => setViewNote(note)}
                  className="flex-1 btn-secondary py-2 text-sm flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" /> View
                </button>
                <a 
                  href={getFileUrl(note.file_url)} 
                  download 
                  className="flex-1 btn-gradient py-2 text-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">No notes available yet</p>
        </div>
      )}

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {viewNote && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewNote(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl h-[90vh] bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <div>
                  <h2 className="text-lg font-semibold text-white">{viewNote.title}</h2>
                  <p className="text-sm text-dark-400">{viewNote.subject?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={getFileUrl(viewNote.file_url)}
                    download
                    className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                  <button onClick={() => setViewNote(null)} className="p-2 text-dark-400 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4">
                <iframe
                  src={getFileUrl(viewNote.file_url)}
                  className="w-full h-full rounded-lg border border-dark-700"
                  title={viewNote.title}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}