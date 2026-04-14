import app from './app';

/*
Import theme CSS based on env vars, e.g.: `env GRAFANA_THEME=light yarn start`
*/
declare let GRAFANA_THEME: any;
require('../sass/theme.' + GRAFANA_THEME + '.scss');

app.init();
