import React, { PropsWithChildren, useContext } from 'react';
import Highlighter from 'react-highlight-words';
import { PanelContext, PanelContextType} from './AddPanelPanel';
import config from 'app/core/config';
import _ from 'lodash';
import { PanelTemplate } from 'app/core/services/backendapi_srv';

export type PanelTemplateListProps = {
  templates: PanelTemplate[];
  plugins: any[];
};

const getPluginInfo = (pluginJSON: any) => {
  const panels = _.chain(config.panels)
    .filter({ hideFromList: false })
    .map(item => item)
    .value();
  const copiedPanel = pluginJSON;
  const pluginInfo = _.find(panels, { name: copiedPanel.type });
  let pluginCopy = undefined;
  if (pluginInfo) {
    pluginCopy = _.cloneDeep(pluginInfo);
    pluginCopy.name = copiedPanel.title;
    pluginCopy.sort = -1;
    pluginCopy.defaults = copiedPanel;
    return pluginCopy;
  }
  return pluginCopy;
};

const getLogo = (template: PanelTemplate, plugins: any) => {
  const plugin = plugins.filter(plugin =>
    plugin.id.toLowerCase() === template.type.toLowerCase() ||
       plugin.name.toLowerCase() === template.type.toLowerCase());
  return plugin[0].info.logos.small;
};

const PanelTemplateList = (props: PanelTemplateListProps) => (
  <TemplateItemContainer {...props}>
    {props.templates.map(template => (
      <TemplateItem key={template.id} {...template} logo={getLogo(template, props.plugins)} />
    ))}
  </TemplateItemContainer>
);

const areTemplatesSelected = (templates: PanelTemplate[]) => {
  return templates.filter(template =>
    template.selected === true)?.length >= 1;
};


const TemplateItemContainer = ({ templates, children }: PropsWithChildren<PanelTemplateListProps>) => (
  <>
    <div className="template-outer-container">
      <div className="template-container">
        <div className="templatelist-section">{children}</div>
      </div>
    </div>
    <div className="template-add-panels">{areTemplatesSelected(templates) && <AddPanels />}</div>
  </>
);


const addPanels = (ctx: PanelContextType) => {
  const plugins = ctx.state.templates.filter(template =>
    template.selected === true)?.map(template => getPluginInfo(template.data));
  ctx.addPanels(plugins);
};

const AddPanels = () => {
  const ctx = useContext<PanelContextType>(PanelContext);
  return <a className="btn btn-success" onClick={() => addPanels(ctx)}>
    <i className="fa fa-plus"></i>
            &nbsp;Add Panels
  </a>;
};

const selectTemplate = (ctx: PanelContextType, id) => {
  ctx.setState(prev => {
    return {
      ...prev,
      templates: ctx.state.templates.map(template => template.id === id ?
        ({...template, selected: template.selected ? false : true}) : ({...template}))
    };
  });
};

const TemplateSelector = (props: PanelTemplateItemProps) => {
  const ctx = useContext<PanelContextType>(PanelContext);
  return <label className="template-form-switch">
    <input checked={props.selected} type="checkbox" onChange={() => selectTemplate(ctx, props.id)}></input>
  </label>;
};

export type PanelTemplateItemProps = {
  logo: string;
} & PanelTemplate;

const TemplateItem = (props: PanelTemplateItemProps) => {
  const ctx = useContext<PanelContextType>(PanelContext);
  const filter = ctx.state.filter.split('');
  const {name, description, category, access, owner, data, logo} = props;

  return (
    <div className="template-item">
      <div className="templatelist-item">
        <div className='template-title-column'>
          <TemplateSelector {...props}/>
          <a className="template-title" onClick={() => ctx.onAddPanel(getPluginInfo(data))}>
            <div>
              <img className="template-type" src={logo} />
            </div>
            <div className="template-desc">
              <Highlighter
                title={name}
                highlightClassName="highlight-search-match"
                textToHighlight={name}
                searchWords={filter}
              />
              <span title={props.description} className='template-more-info'>
                <Highlighter
                  highlightClassName="highlight-search-match"
                  textToHighlight={description}
                  searchWords={filter}
                />
              </span>
            </div>
          </a>
        </div>
        <div className="template-category template-value">
          <span className="template-label">Category:  </span>
          {category}
        </div>
        <div className="template-category template-value">
          <span className="template-label">Owner:  </span>
          {owner}
        </div>
        <div className="template-category template-value">
          <span className="template-label">Visibility:  </span>
          {access}
        </div>
      </div>
    </div>
  );
};

export default PanelTemplateList;
