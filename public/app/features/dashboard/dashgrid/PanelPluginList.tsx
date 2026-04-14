import { getCountBy, getUniqueList, PanelTemplate } from 'app/core/services/backendapi_srv';
import React, { useContext } from 'react';
import Highlighter from 'react-highlight-words';
import { PanelContext, PanelContextType } from './AddPanelPanel';
import PanelTemplateList, { PanelTemplateListProps } from './PanelTemplateList';

type AddPanelHandler = (panelInfo: any) => void;

export type PanelProps = {
  tab: string;
  plugins: any[];
  panelTypes: string[];
  templateTypeFilter: string;
} & PanelFilterProps &
PanelTemplateListProps;

type PluginInfo = any;

const getPanelProps = ({ state, onAddPanel }: PanelContextType): PanelProps => {
  const { categoryFilter, templates, templateTypeFilter, filter } = state;
  let catTemplates = templates;
  if (categoryFilter) {
    catTemplates = catTemplates.filter(template => template.category === categoryFilter);
  }

  if (templateTypeFilter) {
    catTemplates = catTemplates.filter(template => template.type.toLowerCase() === templateTypeFilter.toLowerCase());
  }

  const isTemplateFound = (filter: string, template: PanelTemplate) => {
    const regex = new RegExp(filter.trim(), 'gi');
    return (
      regex.test(template.category) ||
      regex.test(template.name) ||
      regex.test(template.description) ||
      regex.test(template.owner) ||
      regex.test(template.access) ||
      regex.test(template.type)
    );
  };

  if (filter) {
    const filters = filter.trim().split(/\s+/);
    filters.forEach(filter => {
      if (filter && filter.trim().length > 0) {
        catTemplates = catTemplates.filter(cat => isTemplateFound(filter, cat));
      }
    });
  }

  const panelProps: PanelProps = {
    ...state,
    templates: catTemplates,
    plugins: [],
    onAddPanel: onAddPanel,
    panelTypes: getUniqueList(catTemplates, 'type'),
  };

  if (['Add', 'Template'].includes(state.tab)) {
    panelProps.plugins = state.panelPlugins;
  } else if (state.tab === 'Copy') {
    panelProps.plugins = state.copiedPanelPlugins;
  }
  return panelProps;
};

export const Panel = () => {
  const ctx = useContext<PanelContextType>(PanelContext);

  const props = getPanelProps(ctx);
  const { tab, plugins } = props;
  if (tab === 'Copy' && plugins.length === 0) {
    return <NoCopiedPlugin />;
  } else if (tab === 'Template') {
    if (ctx.state.templates.length === 0 || !ctx.state.templates) {
      return <NoTemplatesFound />;
    }
    return <PanelTemplateList {...props} />;
  }

  const countBy = getCountBy(props.templates, 'type');

  return (
    <>
      {plugins.map(panel => (
        <PanelItem key={panel.name} panel={panel} {...props} templateCount={countBy[panel.name.toLowerCase()]} />
      ))}
    </>
  );
};

type PanelItemProps = {
  panel: PluginInfo;
  panelTypes: string[];
  templateCount: number;
} & PanelFilterProps;

const PanelItem = (props: PanelItemProps) => (
  <div className="add-panel__item" onClick={() => props.onAddPanel(props.panel)} title={props.panel.name}>
    <img className="add-panel__item-img" src={props.panel.info.logos.small} />
    <div className="add-panel__item-name">
      <PanelText {...props} />
    </div>
  </div>
);

const NoCopiedPlugin = () => <div className="add-panel__no-panels">No copied panels yet.</div>;
const NoTemplatesFound = () => <div className="add-panel__no-panels">No templates found yet.</div>;

type PanelFilterProps = {
  filter: string;
  onAddPanel: AddPanelHandler;
  tab: string;
};

type PanelTextProps = {
  panel: PluginInfo;
} & PanelFilterProps;

const PanelText = (props: PanelTextProps) => {
  const { panel, filter } = props;
  const searchWords = filter.split('');
  return (
    <Highlighter highlightClassName="highlight-search-match" textToHighlight={panel.name} searchWords={searchWords} />
  );
};
