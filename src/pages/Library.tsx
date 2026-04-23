import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatDistanceToNow } from 'date-fns';
import db from '@/db';

type DownloadableDoc = {
  name: string;
  mimeType?: string;
  extension?: string;
  fileData?: ArrayBuffer;
  pdfData?: ArrayBuffer;
};

export default function Library() {
  const navigate = useNavigate();
  const docs = useLiveQuery(() => db.generatedDocs.orderBy('id').reverse().toArray());

  const handleDelete = async (docId?: number) => {
    if (!docId) return;

    const confirmed = window.confirm('Delete this generated PDF from the library?');
    if (!confirmed) return;

    await db.generatedDocs.delete(docId);
  };

  const handleDownload = (doc: DownloadableDoc) => {
    const fileBytes = doc.fileData ?? doc.pdfData;
    if (!fileBytes) return;

    const blob = new Blob([fileBytes], { type: doc.mimeType || 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = doc.name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <main className="px-4 md:px-8 max-w-5xl mx-auto w-full flex flex-col pt-8">
      <div className="mb-10 pl-2">
        <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">PDF Library</h2>
        <p className="font-body text-on-surface-variant mt-2 text-lg">Download finished agreements or reopen them for corrections.</p>
      </div>

      {!docs ? (
        <div className="flex justify-center p-8">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-12 text-center flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-outline-variant text-6xl">draft</span>
          <p className="text-on-surface-variant text-lg">No documents have been generated yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {docs.map((doc) => (
            <div key={doc.id} className="group bg-surface-container-low hover:bg-surface-container rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-5 transition-all outline-none border border-transparent hover:border-outline-variant/20 shadow-sm">
              <div className="bg-surface-container-highest rounded-lg p-3 flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                <span className="material-symbols-outlined fill">picture_as_pdf</span>
              </div>
              <div className="flex-grow flex flex-col justify-center min-w-0">
                <h3 className="font-body text-lg font-medium text-on-surface truncate pr-4" title={doc.name}>
                  {doc.name}
                </h3>
                <div className="font-label text-sm text-on-surface-variant mt-1 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    {new Date(doc.date).toLocaleDateString()} ({formatDistanceToNow(new Date(doc.date))} ago)
                  </span>
                  <span className="w-1 h-1 rounded-full bg-outline-variant hidden sm:block"></span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">hard_drive</span>
                    {formatSize(doc.size)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 md:ml-auto">
                <button
                  onClick={() => void handleDelete(doc.id)}
                  aria-label="Delete PDF"
                  className="shrink-0 px-5 py-3 rounded-full bg-error-container text-on-error-container font-medium hover:opacity-90 transition-opacity"
                >
                  Delete PDF
                </button>
                <button
                  onClick={() => navigate(`/edit-pdf/${doc.id}`)}
                  aria-label="Edit PDF"
                  className="shrink-0 px-5 py-3 rounded-full bg-surface-container-highest text-on-surface font-medium hover:bg-primary-container/30 hover:text-primary transition-colors"
                >
                  Edit PDF
                </button>
                <button
                  onClick={() => handleDownload(doc as DownloadableDoc)}
                  aria-label="Download PDF"
                  className="shrink-0 px-5 py-3 rounded-full bg-primary-container text-on-primary-container font-medium hover:scale-105 active:scale-95 transition-transform"
                >
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
