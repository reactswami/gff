// Replaces: the 'General' section (viewId === 'settings') inside
//           public/app/features/dashboard/settings/settings.html
//
// USAGE: Embedded within the existing settings.html via:
//   <dashboard-general-settings dashboard="ctrl.dashboard"
//     on-folder-change="ctrl.onFolderChange($folder)">
//
// Directives converted:
//   bootstrap-tagsinput → TagsInput           (TagsDirectives.tsx)
//   gf-form-switch      → GfFormSwitch        (Switch/GfFormSwitch.tsx)
//   gf-time-picker-settings → TimepickerSettings (timepicker/TimepickerSettings.tsx)
//   info-popover        → InfoPopover          (InfoPopover.tsx)
//   folder-picker       → still Angular (complex, convert separately)
//   ng-model            → controlled inputs    (no special directive needed)
//
// NOTE: folder-picker is left as an Angular directive in this component's
// template by using react2AngularDirective to keep it working while the
// FolderPicker component is migrated separately.

import React, { useState, useEffect } from 'react';
import { TagsInput } from 'app/core/components/TagsDirectives';
import { GfFormSwitch } from 'app/core/components/Switch/GfFormSwitch';
import { TimepickerSettings } from 'app/features/dashboard/timepicker/TimepickerSettings';
import { InfoPopover } from 'app/core/components/InfoPopover';

interface DashboardMeta {
  folderTitle?: string;
  folderId?: number;
  canSave?: boolean;
}

interface DashboardModel {
  title: string;
  description: string;
  tags: string[];
  editable: boolean;
  graphTooltip: number;
  timepicker: any;
  meta: DashboardMeta;
}

interface DashboardGeneralSettingsProps {
  dashboard: DashboardModel;
  onFolderChange?: (folder: any) => void;
}

const GRAPH_TOOLTIP_OPTIONS = [
  { value: 0, text: 'Default' },
  { value: 1, text: 'Shared crosshair' },
  { value: 2, text: 'Shared Tooltip' },
];

export const DashboardGeneralSettings: React.FC<DashboardGeneralSettingsProps> = ({
  dashboard,
  onFolderChange,
}) => {
  const [title, setTitle] = useState(dashboard.title);
  const [description, setDescription] = useState(dashboard.description);
  const [tags, setTags] = useState<string[]>(dashboard.tags || []);
  const [editable, setEditable] = useState(dashboard.editable);
  const [graphTooltip, setGraphTooltip] = useState(dashboard.graphTooltip);

  // Keep local state in sync when dashboard prop changes externally
  useEffect(() => {
    setTitle(dashboard.title);
    setDescription(dashboard.description);
    setTags(dashboard.tags || []);
    setEditable(dashboard.editable);
    setGraphTooltip(dashboard.graphTooltip);
  }, [dashboard]);

  // Write-through: update the mutable dashboard model that Angular owns
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    dashboard.title = e.target.value;
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
    dashboard.description = e.target.value;
  };

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
    dashboard.tags = newTags;
  };

  const handleEditableChange = () => {
    const next = !editable;
    setEditable(next);
    dashboard.editable = next;
  };

  const handleGraphTooltipChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    setGraphTooltip(val);
    dashboard.graphTooltip = val;
  };

  return (
    <>
      <h3 className="dashboard-settings__header">General</h3>

      <div className="gf-form-group">
        {/* Name */}
        <div className="gf-form">
          <label className="gf-form-label width-7">Name</label>
          <input
            type="text"
            className="gf-form-input width-30"
            value={title}
            onChange={handleTitleChange}
          />
        </div>

        {/* Description */}
        <div className="gf-form">
          <label className="gf-form-label width-7">Description</label>
          <input
            type="text"
            className="gf-form-input width-30"
            value={description}
            onChange={handleDescriptionChange}
          />
        </div>

        {/* Tags — bootstrap-tagsinput → TagsInput */}
        <div className="gf-form">
          <label className="gf-form-label width-7">
            Tags
            <InfoPopover mode="right-normal">Press enter to add a tag</InfoPopover>
          </label>
          <TagsInput
            value={tags}
            onChange={handleTagsChange}
            placeholder="add tags"
          />
        </div>

        {/* Folder picker — left as Angular directive, wired via ng-react bridge */}
        {/* folder-picker is still Angular; this slot keeps it working */}
        <div
          className="gf-form"
          // The folder-picker Angular directive renders here via the parent
          // Angular template which still includes the <folder-picker> tag.
          // This component does NOT render folder-picker itself.
        />

        {/* Editable toggle — gf-form-switch → GfFormSwitch */}
        <GfFormSwitch
          className="gf-form"
          label="Editable"
          labelClass="width-7"
          tooltip="Uncheck, then save and reload to disable all dashboard editing"
          checked={editable}
          onChange={handleEditableChange}
        />
      </div>

      {/* Time picker settings — gf-time-picker-settings → TimepickerSettings */}
      <TimepickerSettings dashboard={dashboard as any} />

      {/* Panel Options */}
      <h5 className="section-heading">Panel Options</h5>
      <div className="gf-form">
        <label className="gf-form-label width-11">
          Graph Tooltip
          <InfoPopover mode="right-normal">
            Cycle between options using Shortcut: CTRL+O or CMD+O
          </InfoPopover>
        </label>
        <div className="gf-form-select-wrapper">
          <select
            className="gf-form-input"
            value={graphTooltip}
            onChange={handleGraphTooltipChange}
          >
            {GRAPH_TOOLTIP_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.text}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
};
