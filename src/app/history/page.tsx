"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHistory, deleteFromHistory, type HistoryEntry } from "@/lib/db";
import { FileDown, Trash2, Clock, Calendar, Briefcase, AlertTriangle, X as CloseIcon } from "lucide-react";

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    const data = await getHistory();
    setHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const confirmDelete = async () => {
    if (deleteId !== null) {
      await deleteFromHistory(deleteId);
      setDeleteId(null);
      fetchHistory();
    }
  };

  const handleDownload = (entry: HistoryEntry) => {
    const url = URL.createObjectURL(entry.fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = entry.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewMore = () => {
    setVisibleCount((prev) => prev + 6);
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analysis History</h1>
          <p className="text-slate-400">Keep track of all your optimized resumes and job alignments.</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="bg-[#131C2F] rounded-3xl p-12 border border-white/5 text-slate-400 flex flex-col items-center justify-center text-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6">
            <Clock className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No History Found</h3>
          <p className="max-w-md mb-8 text-slate-500">You haven't optimized any resumes yet. Once you download an optimized resume, it will appear here.</p>
          <Link href="/" className="bg-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
            Start Optimizing
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-700">
            {history.slice(0, visibleCount).map((entry) => (
              <div
                key={entry.id}
                className="bg-[#131C2F] border border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-all group relative"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-400">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <button
                    onClick={() => entry.id && setDeleteId(entry.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                    title="Delete from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-white font-bold text-lg mb-1 truncate" title={entry.jobTitle}>
                  {entry.jobTitle}
                </h3>
                <p className="text-slate-500 text-xs mb-6 truncate" title={entry.fileName}>
                  {entry.fileName}
                </p>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wider">
                    <Calendar className="w-3 h-3" />
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wider">
                    <Clock className="w-3 h-3" />
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(entry)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl text-sm font-medium transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Redownload PDF
                </button>
              </div>
            ))}
          </div>

          {visibleCount < history.length && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={handleViewMore}
                className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 px-8 py-3 rounded-xl font-bold transition-all"
              >
                View More
              </button>
            </div>
          )}
        </>
      )}

      {/* Premium Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setDeleteId(null)}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-[#131C2F] border border-white/10 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-500/10 p-4 rounded-2xl mb-6 text-red-500">
                <AlertTriangle className="w-10 h-10" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">Confirm Deletion</h2>
              <p className="text-slate-400 leading-relaxed mb-8">
                Are you sure you want to remove this resume from your history?
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-3.5 rounded-xl bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
