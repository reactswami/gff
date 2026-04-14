import config from 'app/core/config';

export class TemplateListCtrl {
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
    this.navModel = navModelSrv.getNav('dashboards', 'manage-templates', 0);
  }

  getUser() {
    const _this = this;
    this.backendSrv.get('/api/user').then(user => {
      _this.user = user;
      _this.user.theme = user.theme || 'dark';
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
