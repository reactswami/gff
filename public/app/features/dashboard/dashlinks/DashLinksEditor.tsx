// Replaces: public/app/features/dashboard/dashlinks/editor.html
//           + DashLinkEditorCtrl in dashlinks/editor.ts
//
// USAGE SITE:
//   dashboard/settings/settings.html:
//     <dash-links-editor dashboard="ctrl.dashboard"></dash-links-editor>
//
// Directives used in original template:
//   tag-color-from-name   → ColoredTag (TagsDirectives.tsx)
//   bootstrap-tagsinput   → TagsInput (TagsDirectives.tsx)
//   ng-model-onblur       → BlurInput (BlurInput.tsx)
//   gf-form-switch        → GfFormSwitch (GfFormSwitch.tsx)
//
// $scope.$on('$destroy') fired appEvent('dash-links-updated') in the original.
// In React this is replaced by a useEffect cleanup.

import React, { useState, useEffect } from 'react';
import appEvents from 'app/core/app_events';
import { ColoredTag, TagsInput } from 'app/core/components/TagsDirectives';
import { GfFormSwitch } from 'app/core/components/Switch/GfFormSwitch';
import { BlurInput } from 'app/core/components/Forms/BlurInput';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface DashLink {
  type: 'dashboards' | 'link';
  title?: string;
  url?: string;
  tooltip?: string;
  icon?: string;
  tags?: string[];
  asDropdown?: boolean;
  keepTime?: boolean;
  includeVars?: boolean;
  targetBlank?: boolean;
}

interface DashLinksEditorProps {
  dashboard: {
    links: DashLink[];
    updateSubmenuVisibility?: () => void;
  };
}

export const iconMap: Record<string, string> = {
  'external link': 'fa-external-link',
  dashboard: 'fa-th-large',
  question: 'fa-question',
  info: 'fa-info',
  bolt: 'fa-bolt',
  doc: 'fa-file-text-o',
  cloud: 'fa-cloud',
};

type Mode = 'list' | 'new' | 'edit';

// ─── Component ───────────────────────────────────────────────────────────────
export const DashLinksEditor: React.FC<DashLinksEditorProps> = ({ dashboard }) => {
  const [mode, setMode] = useState<Mode>('list');
  const [link, setLink] = useState<DashLink>({ type: 'dashboards', icon: 'external link' });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  // Local copy of links so we can re-render on mutations
  const [links, setLinks] = useState<DashLink[]>(dashboard.links || []);

  // Keep local state in sync with parent if links change externally
  useEffect(() => {
    setLinks(dashboard.links || []);
  }, [dashboard.links]);

  // Mirror the original $scope.$on('$destroy') → appEvent('dash-links-updated')
  useEffect(() => {
    return () => {
      appEvents.emit('dash-links-updated');
    };
  }, []);

  const syncToDashboard = (next: DashLink[]) => {
    dashboard.links = next;
    setLinks([...next]);
  };

  // ── List mode actions ───────────────────────────────────────────────────────
  const setupNew = () => {
    setLink({ type: 'dashboards', icon: 'external link' });
    setEditIndex(null);
    setMode('new');
  };

  const editLink = (l: DashLink, idx: number) => {
    setLink({ ...l });
    setEditIndex(idx);
    setMode('edit');
  };

  const moveLink = (index: number, dir: number) => {
    const next = [...links];
    const target = index + dir;
    if (target < 0 || target >= next.length) { return; }
    [next[index], next[target]] = [next[target], next[index]];
    syncToDashboard(next);
  };

  const deleteLink = (index: number) => {
    const next = links.filter((_, i) => i !== index);
    syncToDashboard(next);
    dashboard.updateSubmenuVisibility?.();
  };

  // ── Edit / New mode actions ─────────────────────────────────────────────────
  const backToList = () => setMode('list');

  const addLink = () => {
    syncToDashboard([...links, link]);
    setMode('list');
  };

  const saveLink = () => {
    if (editIndex === null) { return; }
    const next = links.map((l, i) => i === editIndex ? { ...link } : l);
    syncToDashboard(next);
    setMode('list');
  };

  const updateLink = (patch: Partial<DashLink>) => {
    setLink(prev => ({ ...prev, ...patch }));
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  // ── List view ────────────────────────────────────────────────────────────────
  if (mode === 'list') {
    return (
      <>
        <h3 className="dashboard-settings__header">
          Dashboard Links
        </h3>

        {links.length === 0 ? (
          <div className="empty-list-cta">
            <div className="empty-list-cta__title">
              There are no dashboard links added yet
            </div>
            <a onClick={setupNew} className="empty-list-cta__button btn btn-xlarge btn-success" style={{ cursor: 'pointer' }}>
              <i className="gicon gicon-add-link" />
              Add Dashboard Link
            </a>
            <div className="grafana-info-box">
              <h5>What are Dashboard Links?</h5>
              <p>
                Dashboard Links allow you to place links to other dashboards and web
                sites directly below the dashboard header.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="page-action-bar">
              <div className="page-action-bar__spacer" />
              <a className="btn btn-success" onClick={setupNew} style={{ cursor: 'pointer' }}>
                <i className="fa fa-plus" /> New
              </a>
            </div>
            <table className="filter-table filter-table--hover">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Info</th>
                  <th colSpan={3} />
                </tr>
              </thead>
              <tbody>
                {links.map((l, idx) => (
                  <tr key={idx}>
                    <td className="pointer" onClick={() => editLink(l, idx)}>
                      <i className="fa fa-fw fa-external-link" />
                      {l.type}
                    </td>
                    <td>
                      {l.title && <div>{l.title}</div>}
                      {!l.title && l.url && <div>{l.url}</div>}
                      {!l.title && !l.url && (l.tags || []).map(tag => (
                        <ColoredTag key={tag} name={tag} className="label label-tag" />
                      ))}
                    </td>
                    <td style={{ width: '1%' }}>
                      {idx > 0 && (
                        <i className="pointer fa fa-arrow-up" onClick={() => moveLink(idx, -1)} />
                      )}
                    </td>
                    <td style={{ width: '1%' }}>
                      {idx < links.length - 1 && (
                        <i className="pointer fa fa-arrow-down" onClick={() => moveLink(idx, 1)} />
                      )}
                    </td>
                    <td style={{ width: '1%' }}>
                      <a className="btn btn-danger btn-mini" onClick={() => deleteLink(idx)} style={{ cursor: 'pointer' }}>
                        <i className="fa fa-remove" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </>
    );
  }

  // ── Edit / New view ──────────────────────────────────────────────────────────
  return (
    <>
      <h3 className="dashboard-settings__header">
        <a onClick={backToList} style={{ cursor: 'pointer' }}>Dashboard Links</a>
        {mode === 'new' && <span> &gt; New</span>}
        {mode === 'edit' && <span> &gt; Edit</span>}
      </h3>

      <div className="gf-form-group">
        <div className="gf-form-group">
          {/* Type selector */}
          <div className="gf-form">
            <span className="gf-form-label width-8">Type</span>
            <div className="gf-form-select-wrapper width-10">
              <select
                className="gf-form-input"
                value={link.type}
                onChange={e => updateLink({ type: e.target.value as DashLink['type'] })}
              >
                <option value="dashboards">dashboards</option>
                <option value="link">link</option>
              </select>
            </div>
          </div>

          {/* Dashboards type fields */}
          {link.type === 'dashboards' && (
            <>
              <div className="gf-form">
                <span className="gf-form-label width-8">With tags</span>
                <TagsInput
                  value={link.tags || []}
                  onChange={tags => updateLink({ tags })}
                  placeholder="add tags"
                />
              </div>
              <GfFormSwitch
                className="gf-form"
                label="As dropdown"
                labelClass="width-8"
                switchClass="max-width-4"
                checked={!!link.asDropdown}
                onChange={() => updateLink({ asDropdown: !link.asDropdown })}
              />
              {link.asDropdown && (
                <div className="gf-form">
                  <span className="gf-form-label width-8">Title</span>
                  <BlurInput
                    className="gf-form-input max-width-10"
                    value={link.title || ''}
                    onChange={v => updateLink({ title: v })}
                  />
                </div>
              )}
            </>
          )}

          {/* Link type fields */}
          {link.type === 'link' && (
            <>
              <div className="gf-form">
                <span className="gf-form-label width-8">Url</span>
                <BlurInput
                  className="gf-form-input width-20"
                  value={link.url || ''}
                  onChange={v => updateLink({ url: v })}
                />
              </div>
              <div className="gf-form">
                <span className="gf-form-label width-8">Title</span>
                <BlurInput
                  className="gf-form-input width-20"
                  value={link.title || ''}
                  onChange={v => updateLink({ title: v })}
                />
              </div>
              <div className="gf-form">
                <span className="gf-form-label width-8">Tooltip</span>
                <BlurInput
                  className="gf-form-input width-20"
                  value={link.tooltip || ''}
                  onChange={v => updateLink({ tooltip: v })}
                  placeholder="Open dashboard"
                />
              </div>
              <div className="gf-form">
                <span className="gf-form-label width-8">Icon</span>
                <div className="gf-form-select-wrapper width-20">
                  <select
                    className="gf-form-input"
                    value={link.icon || 'external link'}
                    onChange={e => updateLink({ icon: e.target.value })}
                  >
                    {Object.keys(iconMap).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Include options */}
        <div className="gf-form-group">
          <h5 className="section-heading">Include</h5>
          <GfFormSwitch
            className="gf-form"
            label="Time range"
            labelClass="width-9"
            switchClass="max-width-6"
            checked={!!link.keepTime}
            onChange={() => updateLink({ keepTime: !link.keepTime })}
          />
          <GfFormSwitch
            className="gf-form"
            label="Variable values"
            labelClass="width-9"
            switchClass="max-width-6"
            checked={!!link.includeVars}
            onChange={() => updateLink({ includeVars: !link.includeVars })}
          />
          <GfFormSwitch
            className="gf-form"
            label="Open in new tab"
            labelClass="width-9"
            switchClass="max-width-6"
            checked={!!link.targetBlank}
            onChange={() => updateLink({ targetBlank: !link.targetBlank })}
          />
        </div>
      </div>

      {mode === 'new' && (
        <button className="btn btn-success" onClick={addLink}>Add</button>
      )}
      {mode === 'edit' && (
        <button className="btn btn-success" onClick={saveLink}>Update</button>
      )}
    </>
  );
};
