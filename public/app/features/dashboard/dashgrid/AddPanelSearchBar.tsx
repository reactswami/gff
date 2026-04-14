import React, { useContext } from 'react';
import { PanelContext, PanelContextType } from './AddPanelPanel';
import _ from 'lodash';
import { getUniqueList } from 'app/core/services/backendapi_srv';

type SearchPanelProps = PanelSearchTopProps & TemplateSearchProps & PanelSearchProps;

type PanelSearchTopProps = {
  tab: string;
};

type TemplateSelectProps = {
  templateTypes: string[];
  templateFilter: string;
};

type TemplateSearchProps = TemplateSearchInputProps & CategorySelectProps & TemplateSelectProps;
type PanelSearchProps = PanelSearchInputProps;

type PanelSearchInputProps = {
  filter: string;
};

type TemplateSearchInputProps = {
  filter: string;
};

type CategorySelectProps = {
  templateCategories: string[];
  categoryFilter: string;
};

const getSearchProps = ({ state }: PanelContextType): SearchPanelProps => {
  const categories = getUniqueList(state.templates,  'category');

  let categoryFilter = state.categoryFilter;
  if (!categories.includes(categoryFilter)) {
    categoryFilter = '';
  }

  return {
    ...state,
    templateFilter: state.templateTypeFilter,
    categoryFilter: categoryFilter,
    templateCategories: categories,
    templateTypes: getUniqueList(state.templates, 'type'),
  };
};

export const AddPanelSearchBar = () => {
  const ctx = useContext<PanelContextType>(PanelContext);
  const props: SearchPanelProps = getSearchProps(ctx);
  const { tab } = props;

  return (
    <div className="add-panel__searchbar">
      {tab === 'Template' ? <TemplateSearchBar {...props} /> : <PanelSearchBar {...props} />}
    </div>
  );
};

const PanelSearchBar = (props: PanelSearchProps) => {
  return (
    <label className="gf-form gf-form--has-input-icon">
      <PanelSearchInput {...props} />
      <i className="gf-form-input-icon fa fa-search" />
    </label>
  );
};

const TemplateSearchBar = (props: TemplateSearchProps) => {
  return (
    <label className="gf-form gf-form--has-input-icon">
      <TemplateSearchInput {...props} />
      <i className="gf-form-input-icon fa fa-search"></i>
      <CategorySelect {...props} />
      <TemplateSelect {...props} />
    </label>
  );
};

const TemplateSearchInput = (props: TemplateSearchInputProps) => {
  const { setState, getPlugins } = useContext<PanelContextType>(PanelContext);

  return (
    <input
      type="text"
      autoFocus
      className="gf-form-input gf-form--grow"
      placeholder={'Template Search Filter'}
      value={props.filter}
      onChange={e => {
        const filter = e.target.value;
        setState(prev => {
          return {
            ...prev,
            filter: filter,
            panelPlugins: getPlugins('')
          };
        });
      }}
    />
  );
};

const PanelSearchInput = (props: PanelSearchInputProps) => {
  const { setState, getPlugins, getCopyPlugins, onAddPanel, state } = useContext<PanelContextType>(PanelContext);
  return (
    <input
      type="text"
      autoFocus
      className="gf-form-input gf-form--grow"
      placeholder={'Panel Search Filter'}
      value={props.filter}
      onChange={e => {
        const filter = e.target.value;
        setState(prev => {
          return {
            ...prev,
            filter: filter,
            copiedPanelPlugins: getCopyPlugins(filter),
            panelPlugins: getPlugins(filter)
          };
        });
      }}
      onKeyPress={evt => {
        if (evt.key === 'Enter') {
          const panel = _.head(state.panelPlugins);
          if (panel) {
            onAddPanel(panel);
          }
        }
      }}
    />
  );
};

const CategorySelect = (props: CategorySelectProps) => {
  const { setState, getPlugins } = useContext<PanelContextType>(PanelContext);
  return (
    <select
      className="gf-form-input"
      onChange={e => {
        const filter = e.target.value;
        setState(prev => ({ ...prev, panelPlugins: getPlugins(''), categoryFilter: filter }));
      }}
    >
      <option value="" selected={props.categoryFilter === ''}>
        -- Category --
      </option>
      {props.templateCategories.map(category => (
        <option key={category} selected={props.categoryFilter === category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
};

const TemplateSelect = (props: TemplateSelectProps) => {
  const { setState, getPlugins } = useContext<PanelContextType>(PanelContext);
  return (
    <select
      className="gf-form-input"
      onChange={e => {
        const filter = e.target.value;
        setState(prev => ({ ...prev, panelPlugins: getPlugins(''), templateTypeFilter: filter}));
      }}
    >
      <option value="" selected={props.templateFilter === ''}>-- Template type --</option>
      {props.templateTypes.map(type => (
        <option key={type} value={type} selected={props.templateFilter === type}>
          {type[0].toUpperCase() + type.slice(1)}
        </option>
      ))}
    </select>
  );
};
