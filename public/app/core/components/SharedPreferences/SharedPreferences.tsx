import React, { PureComponent } from 'react';

import { Label } from 'app/core/components/Label/Label';
import SimplePicker from 'app/core/components/Picker/SimplePicker';
import { getBackendSrv, BackendSrv } from 'app/core/services/backend_srv';

import { DashboardSearchHit } from 'app/types';

export interface Props {
  resourceUri: string;
}

export interface State {
  homeDashboardId: number;
  theme: string;
  allowAdvanced: string;
  tileServerUrl: string;
  tileServerSubdomains: string;
  tileServerAttribution: string;
  allowCustomMap: string;
  allowSandboxDownloads: string;
  allowSandboxForms: string;
  allowSandboxModals: string;
  allowSandboxPointerLock: string;
  allowSandboxPopups: string;
  allowSandboxUnsafePopups: string;
  allowSandboxSameOrigin: string;
  allowSandboxScripts: string;
  allowSandboxRedirection: string;
  dashboards: DashboardSearchHit[];
}

const themes = [{ value: '', text: 'Default' }, { value: 'dark', text: 'Dark' }, { value: 'light', text: 'Light' }];
const yesno = [{ value: 'on', text: 'Yes' }, { value: 'off', text: 'No' }];

declare const window: any;

export class SharedPreferences extends PureComponent<Props, State> {
  backendSrv: BackendSrv = getBackendSrv();

  constructor(props) {
    super(props);

    this.state = {
      homeDashboardId: 0,
      theme: '',
      allowAdvanced: '',
      tileServerUrl: '',
      tileServerSubdomains: '',
      tileServerAttribution: '',
      allowCustomMap: '',
      allowSandboxDownloads: '',
      allowSandboxForms: '',
      allowSandboxModals: '',
      allowSandboxPointerLock: '',
      allowSandboxPopups: '',
      allowSandboxUnsafePopups: '',
      allowSandboxSameOrigin: '',
      allowSandboxScripts: '',
      allowSandboxRedirection: '',
      dashboards: [],
    };
  }

  async getStatseekerPreferences() {
    let url = '';
    url += window.location.origin;
    url += '/cgi/dashboard_data';
    return this.backendSrv.get(url, {
      mode: 'get_opts'
    });
  }

  async setStatseekerPreferences(prefs) {
    let url = '';
    url += window.location.origin;
    url += '/cgi/dashboard_data';
    const data = new FormData();
    data.append('mode', 'set_opts');
    data.append('data', JSON.stringify(prefs));
    return this.backendSrv.request({
      method: 'POST',
      url,
      data: data,
      transformRequest: false,
      headers: {
        'Content-Type': undefined
      }
    });
  }

  async componentDidMount() {
    const prefs = await this.backendSrv.get(`/api/${this.props.resourceUri}/preferences`);
    const dashboards = await this.backendSrv.search({ starred: true });
    const ssprefs = await this.getStatseekerPreferences();

    if (prefs.homeDashboardId > 0 && !dashboards.find(d => d.id === prefs.homeDashboardId)) {
      const missing = await this.backendSrv.search({ dashboardIds: [prefs.homeDashboardId] });
      if (missing && missing.length > 0) {
        dashboards.push(missing[0]);
      }
    }

    this.setState({
      homeDashboardId: prefs.homeDashboardId,
      allowAdvanced: ssprefs.db_advanced_query_type,
      tileServerUrl: ssprefs.db_worldmap_tileserver_url,
      tileServerSubdomains: ssprefs.db_worldmap_subdomains,
      tileServerAttribution: ssprefs.db_worldmap_attribution,
      allowCustomMap: ssprefs.db_worldmap_allow_tileservers,
      allowSandboxDownloads: ssprefs.db_sandbox_downloads,
      allowSandboxForms: ssprefs.db_sandbox_forms,
      allowSandboxModals: ssprefs.db_sandbox_modals,
      allowSandboxPointerLock: ssprefs.db_sandbox_pointerlock,
      allowSandboxPopups: ssprefs.db_sandbox_popups,
      allowSandboxUnsafePopups: ssprefs.db_sandbox_unsafepopups,
      allowSandboxSameOrigin: ssprefs.db_sandbox_sameorigin,
      allowSandboxScripts: ssprefs.db_sandbox_scripts,
      allowSandboxRedirection: ssprefs.db_sandbox_redirection,
      theme: prefs.theme,
      dashboards: [{ id: 0, title: 'Dashboards Home', tags: [], type: '', uid: '', uri: '', url: '' }, ...dashboards],
    });
  }

  onSubmitForm = async event => {
    event.preventDefault();

    const {
      homeDashboardId,
      allowAdvanced,
      tileServerUrl,
      tileServerSubdomains,
      tileServerAttribution,
      allowCustomMap,
      allowSandboxDownloads,
      allowSandboxForms,
      allowSandboxModals,
      allowSandboxPointerLock,
      allowSandboxPopups,
      allowSandboxUnsafePopups,
      allowSandboxSameOrigin,
      allowSandboxScripts,
      allowSandboxRedirection,
      theme
    } = this.state;

    const prefs = {
      homeDashboardId,
      theme,
    };

    await this.backendSrv.put(`/api/${this.props.resourceUri}/preferences`, prefs);

    const ssprefs = {
      db_advanced_query_type: allowAdvanced,
      db_worldmap_tileserver_url: tileServerUrl,
      db_worldmap_subdomains: tileServerSubdomains,
      db_worldmap_attribution: tileServerAttribution,
      db_worldmap_allow_tileservers: allowCustomMap,
      db_sandbox_downloads: allowSandboxDownloads,
      db_sandbox_forms: allowSandboxForms,
      db_sandbox_modals: allowSandboxModals,
      db_sandbox_pointerlock: allowSandboxPointerLock,
      db_sandbox_popups: allowSandboxPopups,
      db_sandbox_unsafepopups: allowSandboxUnsafePopups,
      db_sandbox_sameorigin: allowSandboxSameOrigin,
      db_sandbox_scripts: allowSandboxScripts,
      db_sandbox_redirection: allowSandboxRedirection
    };

    await this.setStatseekerPreferences(ssprefs);

    window.location.reload();
  };

  onThemeChanged = (theme: string) => {
    this.setState({ theme });
  };

  onHomeDashboardChanged = (dashboardId: number) => {
    this.setState({ homeDashboardId: dashboardId });
  };

  onAdvancedChanged = (value: string) => {
    this.setState({ allowAdvanced: value });
  };

  onTileServerUrlChanged = (event: any) => {
    this.setState({ tileServerUrl: event.target.value });
  };

  onTileServerSubdomainsChanged = (event: any) => {
    this.setState({ tileServerSubdomains: event.target.value });
  };

  onTileServerAttributionChanged = (event: any) => {
    this.setState({ tileServerAttribution: event.target.value });
  };

  onCustomMapChanged = (value: string) => {
    this.setState({ allowCustomMap: value });
  };

  onSandboxChanged = (flag: string, value: string) => {
    const newState = {};
    newState[`allowSandbox${flag}`] = value;
    this.setState(newState);
  };

  render() {
    const {
      theme,
      homeDashboardId,
      dashboards,
      allowAdvanced,
      tileServerUrl,
      tileServerSubdomains,
      tileServerAttribution,
      allowCustomMap,
      allowSandboxDownloads,
      allowSandboxForms,
      allowSandboxModals,
      allowSandboxPointerLock,
      allowSandboxPopups,
      allowSandboxUnsafePopups,
      allowSandboxSameOrigin,
      allowSandboxScripts,
      allowSandboxRedirection
    } = this.state;

    const isAdmin = window.dashBootData.user.isGrafanaAdmin;

    return (
      <form className="section gf-form-group" onSubmit={this.onSubmitForm}>
        <h3 className="page-heading">User Preferences</h3>
        <div className="gf-form">
          <span className="gf-form-label width-17">UI Theme</span>
          <SimplePicker
            value={themes.find(item => item.value === theme)}
            options={themes}
            getOptionValue={i => i.value}
            getOptionLabel={i => i.text}
            onSelected={theme => this.onThemeChanged(theme.value)}
            width={25}
          />
        </div>
        <div className="gf-form">
          <Label
            width={17}
            tooltip="Not finding dashboard you want? Star it first, then it should appear in this select box."
          >
                  Default Dashboard
          </Label>
          <SimplePicker
            value={dashboards.find(dashboard => dashboard.id === homeDashboardId)}
            getOptionValue={i => i.id}
            getOptionLabel={i => i.title}
            onSelected={(dashboard: DashboardSearchHit) => this.onHomeDashboardChanged(dashboard.id)}
            options={dashboards}
            placeholder="Choose default dashboard"
            width={25}
          />
        </div>

        { isAdmin && (<div style={{ marginTop: '1rem' }}>
          <h3 className="page-heading">Global Preferences</h3>

          <div className="gf-form">
            <span className="gf-form-label width-17">Allow Advanced Queries</span>
            <SimplePicker
              value={yesno.find(opt => opt.value === allowAdvanced)}
              options={yesno}
              getOptionValue={i => i.value}
              getOptionLabel={i => i.text}
              onSelected={opt => this.onAdvancedChanged(opt.value)}
              width={25}
            />
          </div>
        </div>
        )}

        { isAdmin && (<div style={{ marginTop: '1rem' }}>
          <h3 className="page-heading">Text/HTML Preferences</h3>

          <div className="gf-form">
            <Label
              width={17}
              tooltip="If this is set to Yes, then any dashboard editor will be able to create a Text/HTML
                     panel that can download files when visited."
            >
                     Allow Downloads
            </Label>
            <SimplePicker
              value={yesno.find(opt => opt.value === allowSandboxDownloads)}
              options={yesno}
              getOptionValue={i => i.value}
              getOptionLabel={i => i.text}
              onSelected={opt => this.onSandboxChanged('Downloads', opt.value)}
              width={25}
            />
          </div>

          <div className="gf-form">
            <Label
              width={17}
              tooltip="If this is set to Yes, then any dashboard editor will be able to create a Text/HTML
                     panel that can contain a form."
            >
                     Allow Forms
            </Label>
            <SimplePicker
              value={yesno.find(opt => opt.value === allowSandboxForms)}
              options={yesno}
              getOptionValue={i => i.value}
              getOptionLabel={i => i.text}
              onSelected={opt => this.onSandboxChanged('Forms', opt.value)}
              width={25}
            />
          </div>

          <div className="gf-form">
            <Label
              width={17}
              tooltip="If this is set to Yes, then any dashboard editor will be able to create a Text/HTML
                     panel that can trigger modal dialogs when visited."
            >
                     Allow Modals
            </Label>
            <SimplePicker
              value={yesno.find(opt => opt.value === allowSandboxModals)}
              options={yesno}
              getOptionValue={i => i.value}
              getOptionLabel={i => i.text}
              onSelected={opt => this.onSandboxChanged('Modals', opt.value)}
              width={25}
            />
          </div>

          <div className="gf-form">
            <Label
              width={17}
              tooltip="If this is set to Yes, then any dashboard editor will be able to create a Text/HTML
                     panel that can lock the mouse pointer when visited."
            >
                     Allow Pointer Lock
            </Label>
            <SimplePicker
              value={yesno.find(opt => opt.value === allowSandboxPointerLock)}
              options={yesno}
              getOptionValue={i => i.value}
              getOptionLabel={i => i.text}
              onSelected={opt => this.onSandboxChanged('PointerLock', opt.value)}
              width={25}
            />
          </div>

          <div className="gf-form">
            <Label
              width={17}
              tooltip="If this is set to Yes, then any dashboard editor will be able to create a Text/HTML
                     panel that can open popup windows with the same sandbox options applied when visited."
            >
                     Allow Popups
            </Label>
            <SimplePicker
              value={yesno.find(opt => opt.value === allowSandboxPopups)}
              options={yesno}
              getOptionValue={i => i.value}
              getOptionLabel={i => i.text}
              onSelected={opt => this.onSandboxChanged('Popups', opt.value)}
              width={25}
            />
          </div>

          <div className="gf-form">
            <Label
              width={17}
              tooltip="If this is set to Yes, then any dashboard editor will be able to create a Text/HTML
                     panel that can open unrestricted popup windows when visited."
            >
                     Allow Unsandboxed Popups
            </Label>
            <SimplePicker
              value={yesno.find(opt => opt.value === allowSandboxUnsafePopups)}
              options={yesno}
              getOptionValue={i => i.value}
              getOptionLabel={i => i.text}
              onSelected={opt => this.onSandboxChanged('UnsafePopups', opt.value)}
              width={25}
            />
          </div>

          <div className="gf-form">
            <Label
              width={17}
              tooltip="If this is set to Yes, then any dashboard editor will be able to create a Text/HTML
                     panel that is allowed to access browser cookies if from the same origin when visited."
            >
                     Allow Same Origin
            </Label>
            <SimplePicker
              value={yesno.find(opt => opt.value === allowSandboxSameOrigin)}
              options={yesno}
              getOptionValue={i => i.value}
              getOptionLabel={i => i.text}
              onSelected={opt => this.onSandboxChanged('SameOrigin', opt.value)}
              width={25}
            />
          </div>

          <div className="gf-form">
            <Label
              width={17}
              tooltip="If this is set to Yes, then any dashboard editor will be able to create a Text/HTML
                     panel that can run javascript when visited."
            >
                     Allow Scripts
            </Label>
            <SimplePicker
              value={yesno.find(opt => opt.value === allowSandboxScripts)}
              options={yesno}
              getOptionValue={i => i.value}
              getOptionLabel={i => i.text}
              onSelected={opt => this.onSandboxChanged('Scripts', opt.value)}
              width={25}
            />
          </div>

          <div className="gf-form">
            <Label
              width={17}
              tooltip="If this is set to Yes, then any dashboard editor will be able to create a Text/HTML
                     panel that can redirect the browser to a different page when visited."
            >
                     Allow Redirection
            </Label>
            <SimplePicker
              value={yesno.find(opt => opt.value === allowSandboxRedirection)}
              options={yesno}
              getOptionValue={i => i.value}
              getOptionLabel={i => i.text}
              onSelected={opt => this.onSandboxChanged('Redirection', opt.value)}
              width={25}
            />
          </div>

        </div>
        )}

        { isAdmin && (<div style={{ marginTop: '1rem' }}>
          <h3 className="page-heading">Worldmap Preferences</h3>

          <div style={{ fontStyle: 'italic', marginBottom: '5px'}}>
            <span
              style={{ marginRight: '3px' }}
            >
                     For an example of how to configure a map provider, see:
            </span>
            <a
              style={{ color: '#178bb5'}}
              target="_blank"
              href="https://docs.statseeker.com/dashboards/setting-a-map-provider"
            >
                     Setting a map provider
            </a>.
          </div>

          <div className="gf-form">
            <Label
              width={17}
              tooltip="This URL will be used to load the tiled map images. Variables used in the URL are
                        {s} for subdomains,
                        {x} for tile x coordinate,
                        {y} for tile y coordinate, and
                        {z} for zoom level."
            >
                     Default Map Provider URL
            </Label>
            <input
              type="text"
              className="gf-form-input width-25"
              value={tileServerUrl}
              onChange={this.onTileServerUrlChanged}
            />
          </div>

          <div className="gf-form">
            <Label
              width={17}
              tooltip="Each character in this string will be treated as a separate subdomain to use in the Map Provider URL."
            >
                     Default Map Provider Subdomains
            </Label>
            <input
              type="text"
              className="gf-form-input width-25"
              value={tileServerSubdomains}
              onChange={this.onTileServerSubdomainsChanged}
            />
          </div>

          <div className="gf-form">
            <Label
              width={17}
              tooltip="This text will be displayed in the bottom right of the map."
            >
                     Default Map Provider Attribution
            </Label>
            <input
              type="text"
              className="gf-form-input width-25"
              value={tileServerAttribution}
              onChange={this.onTileServerAttributionChanged}
            />
          </div>

          <div className="gf-form">
            <Label
              width={17}
              tooltip="If this is set to Yes, then any dashboard editor will be able to define a Map Provider in their dashboards."
            >
                     Allow Custom Map Providers
            </Label>
            <SimplePicker
              value={yesno.find(opt => opt.value === allowCustomMap)}
              options={yesno}
              getOptionValue={i => i.value}
              getOptionLabel={i => i.text}
              onSelected={opt => this.onCustomMapChanged(opt.value)}
              width={25}
            />
          </div>
        </div>
        )}

        <div className="gf-form-button-row">
          <button type="submit" className="btn btn-success">
                  Save
          </button>
        </div>
      </form>
    );
  }
}

export default SharedPreferences;
