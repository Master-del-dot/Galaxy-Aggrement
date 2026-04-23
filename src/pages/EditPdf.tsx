import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatDistanceToNow } from 'date-fns';
import db from '@/db';

export default function EditPdf() {
  const navigate = useNavigate();
  const docs = useLiveQuery(() => db.generatedDocs.orderBy('id').reverse().toArray());

  if (!docs) {
    return (
      <div className="flex justify-center p-8 pt-20">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
      </div>
    );
  }

  return (
    <main className="px-4 md:px-8 max-w-4xl mx-auto w-full flex flex-col pt-8 gap-8">
      <section className="pl-2">
        <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">Edit PDF</h2>
        <p className="font-body text-on-surface-variant mt-2 text-lg">
          Pick a generated agreement, reopen its saved values, fix any mistakes, and regenerate the PDF.
        </p>
      </section>

      {docs.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-12 text-center flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-outline-variant text-6xl">draft</span>
          <p className="text-on-surface-variant text-lg">No generated PDFs are available to edit yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {docs.map((doc) => (
            <article key={doc.id} className="bg-surface-container-low rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between border border-outline-variant/10">
              <div className="min-w-0">
                <h3 className="font-body text-lg font-semibold text-on-surface truncate">{doc.name}</h3>
                <p className="text-sm text-on-surface-variant mt-2">
                  Last generated {formatDistanceToNow(new Date(doc.date))} ago
                </p>
              </div>
              <button
                onClick={() => navigate(`/edit-pdf/${doc.id}`)}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-primary text-on-primary font-semibold hover:scale-[0.98] transition-transform"
              >
                Open For Editing
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
