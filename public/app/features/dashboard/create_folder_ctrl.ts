import appEvents from 'app/core/app_events';
import locationUtil from 'app/core/utils/location_util';

export class CreateFolderCtrl {
  title = '';
  navModel: any;
  titleTouched = false;
  hasValidationError: boolean;
  validationError: any;

  /** @ngInject */
  constructor(private backendSrv, private $location, private validationSrv, navModelSrv) {
    this.navModel = navModelSrv.getNav('dashboards', 'manage-dashboards', 0);
  }

  create() {
    if (this.hasValidationError) {
      return;
    }

    const _this = this;
    return this.backendSrv.createFolder({ title: this.title }).then(result => {
      appEvents.emit('alert-success', ['Folder Created', 'OK']);
      _this.$location.url(locationUtil.stripBaseFromUrl(result.url));
    });
  }

  titleChanged() {
    this.titleTouched = true;
    const _this = this;

    this.validationSrv
      .validateNewFolderName(this.title)
      .then(() => {
        _this.hasValidationError = false;
      })
      .catch(err => {
        _this.hasValidationError = true;
        _this.validationError = err.message;
      });
  }
}
