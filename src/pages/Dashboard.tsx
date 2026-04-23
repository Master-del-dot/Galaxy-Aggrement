import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '@/db';

const actions = [
  {
    title: 'Setup',
    description: 'Create templates, auto-build form fields, and manage mappings.',
    icon: 'settings_suggest',
    path: '/setup',
  },
  {
    title: 'Fill Form',
    description: 'Fill a template and generate a preserved-layout PDF.',
    icon: 'edit_note',
    path: '/fill-form',
  },
  {
    title: 'PDFs',
    description: 'Download and manage your generated agreement PDFs.',
    icon: 'folder',
    path: '/library',
  },
  {
    title: 'Edit PDF',
    description: 'Reopen a generated agreement, fix mistakes, and regenerate it.',
    icon: 'edit_document',
    path: '/edit-pdf',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const recentDocs = useLiveQuery(() => db.generatedDocs.orderBy('id').reverse().limit(3).toArray());

  return (
    <main className="px-6 md:px-12 max-w-7xl mx-auto w-full flex flex-col gap-12">
      <section className="flex flex-col gap-2 mt-4 ml-2">
        <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tight">Overview</h2>
        <p className="font-body text-on-surface-variant text-lg max-w-2xl">
          Build templates fast, generate PDF agreements with preserved layout, and reopen finished PDFs whenever you need to correct a mistake.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
        {actions.map((action) => (
          <button
            key={action.title}
            onClick={() => navigate(action.path)}
            className="group relative overflow-hidden bg-gradient-to-br from-primary to-primary-container rounded-xl p-8 flex flex-col items-start justify-between min-h-[220px] transition-transform duration-300 hover:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-primary-fixed/50 shadow-[0_8px_32px_rgba(0,0,0,0.06)] text-left"
          >
            <div className="bg-surface-container-lowest/10 p-4 rounded-full backdrop-blur-sm">
              <span className="material-symbols-outlined thick fill text-4xl text-on-primary">{action.icon}</span>
            </div>
            <div className="mt-auto">
              <h3 className="font-headline font-bold text-2xl text-on-primary mb-1">{action.title}</h3>
              <p className="font-body text-on-primary/80 text-sm">{action.description}</p>
            </div>
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h3 className="font-headline font-bold text-xl text-on-surface ml-2">Recent PDFs</h3>
        <div className="flex flex-col gap-3">
          {recentDocs?.length ? (
            recentDocs.map((doc) => (
              <div key={doc.id} onClick={() => navigate(`/edit-pdf/${doc.id}`)} className="bg-surface-container-lowest rounded-lg p-5 flex items-center justify-between group hover:bg-surface-container-low transition-colors duration-200 cursor-pointer shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-surface-container p-3 rounded-full text-primary">
                    <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                  </div>
                  <div>
                    <h4 className="font-body font-semibold text-on-surface">{doc.name}</h4>
                    <p className="font-label text-xs text-on-surface-variant mt-1">Generated: {new Date(doc.date).toLocaleString()}</p>
                  </div>
                </div>
                <span className="text-primary font-medium">Edit</span>
              </div>
            ))
          ) : (
            <p className="text-on-surface-variant italic ml-2">No documents generated yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
