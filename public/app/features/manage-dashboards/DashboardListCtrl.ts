import config from 'app/core/config';

export class DashboardListCtrl {
  user: any;
  oldTheme: any;
  teams: any = [];
  orgs: any = [];
  userForm: any;
  showTeamsList = false;
  showOrgsList = false;
  readonlyLoginFields = config.disableLoginForm;
  navModel: any;

  /** @ngInject */
  constructor(private backendSrv, private contextSrv, private $location, navModelSrv) {
    this.getUser();
    this.getUserTeams();
    this.getUserOrgs();
    this.navModel = navModelSrv.getNav('dashboards', 'manage-dashboards', 0);
  }

  getUser() {
    const _this = this;
    this.backendSrv.get('/api/user').then(user => {
      _this.user = user;
      _this.user.theme = user.theme || 'dark';
    });
  }

  getUserTeams() {
    const _this = this;
    this.backendSrv.get('/api/user/teams').then(teams => {
      _this.teams = teams;
      _this.showTeamsList = _this.teams.length > 0;
    });
  }

  getUserOrgs() {
    const _this = this;
    this.backendSrv.get('/api/user/orgs').then(orgs => {
      _this.orgs = orgs;
      _this.showOrgsList = orgs.length > 1;
    });
  }

  setUsingOrg(org) {
    this.backendSrv.post('/api/user/using/' + org.orgId).then(() => {
      window.location.href = config.appSubUrl + '/profile';
    });
  }

  update() {
    if (!this.userForm.$valid) {
      return;
    }

    const _this = this;
    this.backendSrv.put('/api/user/', this.user).then(() => {
      _this.contextSrv.user.name = _this.user.name || _this.user.login;
      if (_this.oldTheme !== _this.user.theme) {
        window.location.href = config.appSubUrl + _this.$location.path();
      }
    });
  }
}
