import _ from 'lodash';
import React, { PureComponent } from 'react';
import { VariableQueryProps } from 'app/types/plugins';

declare let dashboard_data: any;

export default class DefaultVariableQueryEditor extends PureComponent<VariableQueryProps, any> {
  constructor(props) {
    super(props);

    const defaults = {
      object: 'device',
      filter: '',
      groups: '',
      query: '',
      label: ['device..name.'],
      value: 'device..id.',
      fieldList: [],
    };

    this.state = Object.assign(defaults, this.props.query);
    this.loadFieldList(defaults.object);
  }

  async loadFieldList(object) {
    if (object === 'custom') {
      return;
    }
    const command = `{"command":"describe","objects":[{"type":"${object}"}]}`;
    const fieldList = await this.props.datasource
      .runRequest(command)
      .then(
        response => {
          const data = response.data.objects[0].fields;
          const fields =
            ['group', 'device'].indexOf(object) > -1 ? [] : [{ text: 'Device Name', value: 'device.deviceLink.name.' }];
          return fields.concat(
            Object.keys(data)
              .map(key => {
                if (
                  (data[key].polltype && data[key].polltype !== 'cfg') ||
                  ['integer', 'string', 'float'].indexOf(data[key].datatype) === -1 ||
                  ['deviceid', 'idx', 'table', 'poll'].indexOf(key) > -1
                ) {
                  return null;
                }
                return { text: data[key].title, value: `${object}..${key}.` };
              })
              .filter(item => item !== null)
              .sort((a, b) => a.text.localeCompare(b.text))
          );
        },
        err => {
          throw {
            message: 'Request failed. Check logs for details',
            data: err.data,
            config: err.config,
          };
        }
      )
      .then(list => _.sortBy(list, 'text'));

    this.setState({ fieldList });
    this.reload();
  }

  queryTypeChanged(event) {
    let query = '';
    const object = event.target.value;
    let label = [`${object}..name.`];
    let value = `${object}..id.`;

    if (object === 'custom') {
      query = this.props.datasource.decodeMetricQuery(this.state);
      value = this.state.value;
      label = this.state.label;
    }
    this.setState(
      {
        object,
        filter: '',
        groups: '',
        label,
        value,
        query,
        fieldList: [],
      },
      this.reload
    );

    this.loadFieldList(object);
  }

  updateQuery(event) {
    this.setState({ query: event.target.value });
  }

  queryChanged(event) {
    /* Get the value */
    const json = _.attempt(JSON.parse, event.target.value);
    if (_.isError(json)) {
      throw { message: 'Invalid JSON in query'};
    }
    if (!_.get(json, 'fields[0].value')) {
      throw { message: 'Query contains no valid field'};
    }
    this.setState({ query: event.target.value, value: json.fields[0].value }, this.reload);
  }

  valueChanged(event) {
    this.setState({ value: event.target.value }, this.reload);
  }

  labelChanged(event, idx) {
    const label = [...this.state.label];
    label[idx] = event.target.value;
    this.setState({ label }, this.reload);
  }

  groupFilterChanged(event) {
    this.setState({ groups: event.target.value }, this.reload);
  }

  deviceFilterChanged(event) {
    this.setState({ filter: event.target.value }, this.reload);
  }

  addLabel() {
    this.setState({ label: this.state.label.concat(`${this.state.object}..name.`) }, this.reload);
  }

  removeLabel(idx) {
    this.setState({ label: this.state.label.filter((e, i) => i !== idx) }, this.reload);
  }

  reload() {
    const queryModel = _.cloneDeep(this.state);
    _.unset(queryModel, 'fieldList');
    this.props.onChange(queryModel, `${this.state.object} query`);
  }

  renderVariableOptions() {
    return (
      <React.Fragment>
        <option key={0} value="" />
        {this.props.templateSrv.variables.map((item, idx) => (
          <option key={idx + 1} value={`$${item.name}`}>
            ${item.name}
          </option>
        ))}
      </React.Fragment>
    );
  }

  renderFieldList(includeId = true) {
    return (
      <React.Fragment>
        {this.state.fieldList
          .filter(item => includeId || item.text !== 'ID')
          .map((item, idx) => (
            <option key={idx} value={item.value}>
              {item.text}
            </option>
          ))}
      </React.Fragment>
    );
  }

  renderLabel() {
    const output = [];
    const stl = {
      border: 'none',
      backgroundColor: 'transparent',
    };

    for (let i = 0; i < this.state.label.length; i++) {
      output.push(
        <div key={i} className="gf-form">
          {i === 0 ? (
            <span className="gf-form-label width-10">Label</span>
          ) : (
            <span style={stl} className="gf-form-label width-10" />
          )}
          <div className="gf-form-select-wrapper">
            <select className="gf-form-input" onChange={e => this.labelChanged(e, i)} value={this.state.label[i]}>
              {this.renderFieldList(false)}
            </select>
          </div>
          {i > 0 && (
            <a className="gf-form-label" onClick={() => this.removeLabel(i)}>
              <i className="fa fa-trash" />
            </a>
          )}
          {i === this.state.label.length - 1 && (
            <a className="gf-form-label" onClick={() => this.addLabel()}>
              <i className="fa fa-plus" />
            </a>
          )}
        </div>
      );
    }

    return output;
  }

  renderValue() {
    return (
      <div className="gf-form">
        <span className="gf-form-label width-10">Value</span>
        <div className="gf-form-select-wrapper">
          <select className="gf-form-input" onChange={e => this.valueChanged(e)} value={this.state.value}>
            {this.renderFieldList(true)}
          </select>
        </div>
      </div>
    );
  }

  appendTypeoptions(options, menu) {
    for (const item of menu) {
      if (item.value) {
        options.push(item);
      } else if (item.submenu) {
        this.appendTypeoptions(options, item.submenu);
      }
    }
  }

  renderTypeOptions() {
    const options = {};
    const menu = dashboard_data.cachedObjects;

    for (const item of menu) {
      if (['Event', 'Threshold'].indexOf(item.text) === -1 && item.submenu) {
        options[item.text] = [];
        this.appendTypeoptions(options[item.text], item.submenu);
      }
    }

    return (
      <React.Fragment>
        <optgroup label="Common Types">
          <option value="device">Device</option>
          <option value="group">Group</option>
          <option value="custom">Advanced</option>
        </optgroup>
        {Object.keys(options).map((key, idx) => (
          <optgroup key={idx} label={key}>
            {_.sortBy(options[key], 'text').map((item, idx2) => (
              <option key={idx2} value={item.value}>
                {item.text}
              </option>
            ))}
          </optgroup>
        ))}
      </React.Fragment>
    );
  }

  render() {
    return (
      <React.Fragment>
        <div className="gf-form">
          <span className="gf-form-label width-10">Object</span>
          <div className="gf-form-select-wrapper">
            <select
              className="gf-form-input"
              required
              onChange={e => this.queryTypeChanged(e)}
              value={this.state.object}
            >
              {this.renderTypeOptions()}
            </select>
          </div>
        </div>
        {this.state.object !== 'custom' && this.renderValue()}
        {this.state.object !== 'custom' && this.renderLabel()}
        {['group', 'custom'].indexOf(this.state.object) === -1 && this.props.templateSrv.variables.length > 0 && (
          <div className="gf-form">
            <span className="gf-form-label width-10">Group filter</span>
            <div className="gf-form-select-wrapper">
              <select
                className="gf-form-input template-variable"
                onChange={e => this.groupFilterChanged(e)}
                value={this.state.groups}
              >
                {this.renderVariableOptions()}
              </select>
            </div>
          </div>
        )}
        {['group', 'device', 'custom'].indexOf(this.state.object) === -1 &&
          this.props.templateSrv.variables.length > 0 && (
          <div className="gf-form">
            <span className="gf-form-label width-10">Device filter</span>
            <div className="gf-form-select-wrapper">
              <select
                className="gf-form-input template-variable"
                onChange={e => this.deviceFilterChanged(e)}
                value={this.state.filter}
              >
                {this.renderVariableOptions()}
              </select>
            </div>
          </div>
        )}
        {this.state.object === 'custom' && (
          <div className="gf-form">
            <span className="gf-form-label width-10">Advanced Query</span>
            <input
              type="text"
              className="gf-form-input"
              value={this.state.query}
              onBlur={e => this.queryChanged(e)}
              onChange={e => this.updateQuery(e)}
              placeholder="Raw data query"
              required
            />
          </div>
        )}
      </React.Fragment>
    );
  }
}
