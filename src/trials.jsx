// Trials & folders panel — saved app-state snapshots organized by folder.
// Opens as a slide-over from the right when invoked from the sidebar.

function TrialsPanel({ open, onClose, state }) {
  const t = (typeof window !== 'undefined' && window.__pupsicTrials) || {};
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const [newName, setNewName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    if (!open) { setEditingId(null); setCreatingFolder(false); setNewName(''); }
  }, [open]);

  const folders = state?.folders || [];
  const trials  = state?.trials  || [];
  const currentTrialId = state?.currentTrialId;

  const trialsByFolder = useMemo(() => {
    const map = {};
    for (const f of folders) map[f.id] = [];
    for (const tr of trials) (map[tr.folderId] || (map[tr.folderId] = [])).push(tr);
    return map;
  }, [folders, trials]);

  const handleSave = () => {
    if (!newName.trim()) return;
    t.saveAsTrial?.({ name: newName.trim() });
    setNewName('');
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    t.createFolder?.(newFolderName.trim());
    setNewFolderName('');
    setCreatingFolder(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
           className={cn('fixed inset-0 z-40 transition-opacity duration-200',
                         open ? 'bg-ink/30 pointer-events-auto opacity-100' : 'opacity-0 pointer-events-none')} />

      {/* Slide-over */}
      <aside className="fixed inset-y-0 right-0 w-[420px] max-w-[92vw] bg-paper border-l hair z-50 flex flex-col"
             style={{
               transform: open ? 'translateX(0)' : 'translateX(100%)',
               transition: 'transform 220ms cubic-bezier(.2,.7,.2,1)',
             }}>
        {/* Header */}
        <div className="px-5 py-4 border-b hair flex items-center justify-between">
          <div>
            <div className="t-caption text-mute">Essais sauvegardés</div>
            <div className="t-bodyhi mt-1">Vos trials & dossiers</div>
          </div>
          <button onClick={onClose}
                  className="w-8 h-8 inline-flex items-center justify-center text-mute hover:text-ink hover:bg-paper2"
                  title="Fermer">
            <IconX size={14} />
          </button>
        </div>

        {/* Save current state */}
        <div className="px-5 py-4 border-b hair bg-paper2/40">
          <div className="t-caption text-accent mb-2">Sauvegarder l'état actuel</div>
          <div className="flex items-center gap-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)}
                   placeholder={`Trial · ${new Date().toLocaleDateString('fr-CH')}`}
                   className="flex-1" />
            <Button variant="primary" size="sm" icon={<IconSave size={13} />} onClick={handleSave}
                    disabled={!newName.trim()}>
              Sauvegarder
            </Button>
          </div>
          {currentTrialId && (
            <div className="mt-2 flex items-center justify-between t-body">
              <span className="text-mute">Trial actif : <span className="text-ink">{trials.find(x => x.id === currentTrialId)?.name}</span></span>
              <button onClick={() => t.updateCurrentTrial?.()}
                      className="t-caption text-accent hover:underline underline-offset-2">
                Écraser →
              </button>
            </div>
          )}
        </div>

        {/* Folders + trials list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {folders.map((f) => {
            const fTrials = trialsByFolder[f.id] || [];
            return (
              <div key={f.id} className="mb-4">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <div className="t-caption text-mute flex items-center gap-1.5">
                    <IconFolder size={11} />
                    <span>{f.name}</span>
                    <span className="text-line">·</span>
                    <span>{fTrials.length}</span>
                  </div>
                  {f.id !== 'default' && (
                    <button onClick={() => t.deleteFolder?.(f.id)}
                            className="t-caption text-mute hover:text-bad opacity-0 hover:opacity-100 group-hover:opacity-100">
                      Supprimer
                    </button>
                  )}
                </div>
                {fTrials.length === 0 ? (
                  <div className="px-2 py-3 t-body text-mute">Aucun trial dans ce dossier.</div>
                ) : (
                  <div className="space-y-1">
                    {fTrials.map(tr => {
                      const isActive = tr.id === currentTrialId;
                      const isEditing = editingId === tr.id;
                      return (
                        <div key={tr.id}
                             className={cn('group px-3 py-2.5 border hair transition-colors',
                                            isActive ? 'bg-accentSoft/40 border-accent/30' : 'hover:bg-paper2/60')}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <Input value={draft} onChange={(e) => setDraft(e.target.value)}
                                       autoFocus className="text-[12px]"
                                       onKeyDown={(e) => {
                                         if (e.key === 'Enter' && draft.trim()) { t.renameTrial?.(tr.id, draft.trim()); setEditingId(null); }
                                         if (e.key === 'Escape') setEditingId(null);
                                       }} />
                              ) : (
                                <>
                                  <div className="t-body text-ink truncate font-medium">{tr.name}</div>
                                  <div className="t-caption text-mute mt-1">
                                    {new Date(tr.updatedAt).toLocaleDateString('fr-CH')} · {Object.keys(tr.snapshot.mmmSpend || {}).length} canaux · {(tr.snapshot.scenarios || []).length} scénario(s)
                                  </div>
                                </>
                              )}
                            </div>
                            {isActive && !isEditing && (
                              <span className="t-caption text-accent shrink-0">Actif</span>
                            )}
                          </div>
                          {!isEditing && (
                            <div className="mt-2.5 flex items-center gap-3">
                              <button onClick={() => { t.loadTrial?.(tr.id); onClose?.(); }}
                                      className="t-caption text-ink hover:text-accent transition-colors">
                                {isActive ? 'Recharger' : 'Charger'}
                              </button>
                              <span className="text-line">·</span>
                              <button onClick={() => t.duplicateTrial?.(tr.id)}
                                      className="t-caption text-mute hover:text-ink transition-colors">
                                Dupliquer
                              </button>
                              <span className="text-line">·</span>
                              <button onClick={() => { setEditingId(tr.id); setDraft(tr.name); }}
                                      className="t-caption text-mute hover:text-ink transition-colors">
                                Renommer
                              </button>
                              {folders.length > 1 && (
                                <>
                                  <span className="text-line">·</span>
                                  <select value={tr.folderId}
                                          onChange={(e) => t.moveTrial?.(tr.id, e.target.value)}
                                          className="t-caption text-mute hover:text-ink bg-transparent cursor-pointer">
                                    {folders.map(ff => <option key={ff.id} value={ff.id}>{ff.name}</option>)}
                                  </select>
                                </>
                              )}
                              <span className="flex-1" />
                              <button onClick={() => t.deleteTrial?.(tr.id)}
                                      className="t-caption text-mute hover:text-bad transition-colors">
                                Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {trials.length === 0 && (
            <div className="px-3 py-10 text-center">
              <div className="t-body text-mute max-w-[280px] mx-auto">
                Aucun essai sauvegardé. Sauvegardez votre travail actuel pour le retrouver plus tard.
              </div>
            </div>
          )}
        </div>

        {/* Footer — create folder */}
        <div className="px-5 py-4 border-t hair">
          {creatingFolder ? (
            <div className="flex items-center gap-2">
              <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                     placeholder="Nom du dossier" autoFocus
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') handleCreateFolder();
                       if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
                     }}
                     className="flex-1" />
              <Button variant="primary" size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                Créer
              </Button>
              <button onClick={() => { setCreatingFolder(false); setNewFolderName(''); }}
                      className="t-caption text-mute hover:text-ink">Annuler</button>
            </div>
          ) : (
            <button onClick={() => setCreatingFolder(true)}
                    className="t-body text-ink hover:text-accent inline-flex items-center gap-1.5">
              <IconFolder size={12} />
              <span>Nouveau dossier</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { TrialsPanel });
