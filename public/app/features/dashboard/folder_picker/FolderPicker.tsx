// Replaces: public/app/features/dashboard/folder_picker/folder_picker.ts
//           + folder_picker.html
//
// USAGE SITES (3 locations):
//   dashboard/settings/settings.html             — <folder-picker ...>
//   dashboard/partials/dashboard_import.html     — <folder-picker ...>
//   dashboard/move_to_folder_modal/move_to_folder.html — <folder-picker ...>
//
// Directives used in folder_picker.html:
//   gf-form-dropdown → still Angular (gfFormDropdown not yet migrated)
//   give-focus       → autoFocus (useFocus.ts)
//
// Services:
//   backendSrv   → getBackendSrv() singleton
//   validationSrv → reimplemented inline with Promises (no $q needed)
//   contextSrv   → imported singleton

import React, { useState, useEffect, useCallback, useRef } from 'react';
import _ from 'lodash';
import { getBackendSrv } from 'app/core/services/backend_srv';
import { contextSrv } from 'app/core/services/context_srv';
import appEvents from 'app/core/app_events';

// ─── Types ───────────────────────────────────────────────────────────────────
interface FolderOption {
  text: string;
  value: number | null;
}

interface FolderPickerProps {
  initialTitle?: string;
  initialFolderId?: number | null;
  labelClass?: string;
  onChange: (folder: { id: number | null; title: string }) => void;
  onCreateFolder?: (folder: { id: number; title: string }) => void;
  enableCreateNew?: boolean | string;
  enableReset?: boolean | string;
}

// ─── Validation (reimplemented without $q) ───────────────────────────────────
async function validateNewFolderName(name: string): Promise<void> {
  const trimmed = (name || '').trim();

  if (!trimmed) {
    throw new Error('Name is required');
  }

  if (trimmed.toLowerCase() === 'general') {
    throw new Error('This is a reserved name and cannot be used for a folder.');
  }

  const backendSrv = getBackendSrv();
  const [folders, dashboards] = await Promise.all([
    backendSrv.search({ type: 'dash-folder', folderIds: [0], query: trimmed }),
    backendSrv.search({ type: 'dash-db', folderIds: [0], query: trimmed }),
  ]);

  const hits = [...(folders || []), ...(dashboards || [])];
  for (const hit of hits) {
    if (hit.title.toLowerCase() === trimmed.toLowerCase()) {
      throw new Error('A folder or dashboard in the general folder with the same name already exists');
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export const FolderPicker: React.FC<FolderPickerProps> = ({
  initialTitle = '',
  initialFolderId,
  labelClass = 'width-7',
  onChange,
  enableCreateNew = false,
  enableReset = false,
}) => {
  const backendSrv = getBackendSrv();
  const rootName = 'General';
  const isEditor = contextSrv.isEditor;

  const [options, setOptions] = useState<FolderOption[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderOption | null>(null);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderTouched, setNewFolderTouched] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<FolderOption[]>([]);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Load options ────────────────────────────────────────────────────────────
  const loadOptions = useCallback(async (q: string): Promise<FolderOption[]> => {
    const params = { query: q, type: 'dash-folder', permission: 'Edit' };
    const result = await backendSrv.get('api/search', params);
    const opts: FolderOption[] = [];

    const isGeneralQuery = q === '' || 'general'.startsWith(q.toLowerCase());
    if (isEditor && isGeneralQuery) {
      opts.unshift({ text: rootName, value: 0 });
    }

    if (isEditor && enableCreateNew && q === '') {
      opts.unshift({ text: '-- New Folder --', value: -1 });
    }

    if (enableReset && q === '' && initialTitle !== '') {
      opts.unshift({ text: initialTitle, value: null });
    }

    return [...opts, ...result.map((r: any) => ({ text: r.title, value: r.id }))];
  }, [backendSrv, isEditor, enableCreateNew, enableReset, initialTitle]);

  // ── Initial value ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadOptions('').then(opts => {
      setOptions(opts);
      setFilteredOptions(opts);

      let folder: FolderOption | undefined;

      if (initialFolderId != null) {
        folder = opts.find(o => o.value === initialFolderId);
      } else if (enableReset && initialTitle && initialFolderId === null) {
        folder = { text: initialTitle, value: null };
      }

      if (!folder) {
        const userFolder = opts.find(o => o.text === (contextSrv.user as any).login);
        if (userFolder) {
          folder = userFolder;
        } else if (isEditor) {
          folder = { text: rootName, value: 0 };
        } else {
          folder = opts[0] || { text: initialTitle, value: null };
        }
      }

      setSelectedFolder(folder);

      if (folder && folder.value !== initialFolderId) {
        onChange({ id: folder.value, title: folder.text });
      }
    });
  }, []); // eslint-disable-line

  // ── Query filter ────────────────────────────────────────────────────────────
  const handleQueryChange = useCallback(
    _.debounce(async (q: string) => {
      const opts = await loadOptions(q);
      setFilteredOptions(opts);
    }, 300),
    [loadOptions]
  );

  // ── Dropdown open/close ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) { return undefined; }
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectOption = (opt: FolderOption) => {
    if (opt.value === -1) {
      // Create new folder mode
      setCreating(true);
      setOpen(false);
      setTimeout(() => newFolderInputRef.current?.focus(), 100);
      return;
    }
    setSelectedFolder(opt);
    setOpen(false);
    setQuery('');
    onChange({ id: opt.value, title: opt.text });
  };

  // ── New folder creation ─────────────────────────────────────────────────────
  const handleNewFolderNameChange = (val: string) => {
    setNewFolderName(val);
    setNewFolderTouched(true);
    validateNewFolderName(val)
      .then(() => setValidationError(null))
      .catch(err => setValidationError(err.message));
  };

  const handleCreateFolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const result = await backendSrv.createFolder({ title: newFolderName });
      appEvents.emit('alert-success', ['Folder Created', 'OK']);
      const folder: FolderOption = { text: result.title, value: result.id };
      setSelectedFolder(folder);
      setCreating(false);
      setNewFolderName('');
      setNewFolderTouched(false);
      setValidationError(null);
      onChange({ id: result.id, title: result.title });
    } catch (err) {
      appEvents.emit('alert-error', ['Folder creation failed', String(err)]);
    }
  };

  const handleCancelCreate = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCreating(false);
    setNewFolderName('');
    setNewFolderTouched(false);
    setValidationError(null);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="gf-form-inline">
        <div className="gf-form">
          <label className={`gf-form-label ${labelClass}`}>Folder</label>

          {!creating && (
            <div className="dropdown" ref={dropdownRef} style={{ position: 'relative' }}>
              {/* Toggle button */}
              <a
                className="gf-form-input gf-form-input--dropdown"
                onClick={() => { setOpen(o => !o); setQuery(''); setFilteredOptions(options); }}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {selectedFolder?.text || initialTitle || rootName}
                <i className="fa fa-caret-down" style={{ marginLeft: 'auto' }} />
              </a>

              {open && (
                <div
                  className="dropdown-menu"
                  style={{ display: 'block', position: 'absolute', zIndex: 1050, minWidth: '100%' }}
                >
                  <div style={{ padding: '4px 8px' }}>
                    <input
                      autoFocus
                      type="text"
                      className="gf-form-input"
                      placeholder="Search folders..."
                      value={query}
                      onChange={e => {
                        setQuery(e.target.value);
                        handleQueryChange(e.target.value);
                      }}
                    />
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 200, overflowY: 'auto' }}>
                    {filteredOptions.map((opt, idx) => (
                      <li key={idx}>
                        <a
                          className={`dropdown-item${selectedFolder?.value === opt.value ? ' active' : ''}`}
                          onClick={() => selectOption(opt)}
                          style={{ cursor: 'pointer', display: 'block', padding: '4px 16px' }}
                        >
                          {opt.text}
                        </a>
                      </li>
                    ))}
                    {filteredOptions.length === 0 && (
                      <li style={{ padding: '4px 16px', color: 'var(--color-text-secondary)' }}>
                        No folders found
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {creating && (
            <input
              ref={newFolderInputRef}
              type="text"
              className="gf-form-input max-width-10"
              value={newFolderName}
              onChange={e => handleNewFolderNameChange(e.target.value)}
              placeholder="Folder name"
            />
          )}
        </div>

        {creating && (
          <>
            <div className="gf-form">
              <button
                className="btn btn-inverse"
                onClick={handleCreateFolder}
                disabled={!newFolderTouched || !!validationError}
              >
                <i className="fa fa-fw fa-save" />&nbsp;Create
              </button>
            </div>
            <div className="gf-form">
              <button className="btn btn-inverse" onClick={handleCancelCreate}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {newFolderTouched && validationError && (
        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <label className="gf-form-label text-warning gf-form-label--grow">
              <i className="fa fa-warning" /> {validationError}
            </label>
          </div>
        </div>
      )}
    </>
  );
};
