import './template/all';
import './dashboard_ctrl';
import './alerting_srv';
import './history/history';
import './dashboard_loader_srv';
import './dashnav/dashnav';
import './submenu/submenu';
import './save_as_modal';
import './save_modal';
import './save_provisioned_modal';
import './shareModalCtrl';
import './share_snapshot_ctrl';
import './dashboard_srv';
import './view_state_srv';
import './validation_srv';
import './time_srv';
import './unsaved_changes_srv';
import './unsaved_changes_modal';
import './unsaved_logout_modal';
import './timepicker/timepicker';
import './upload';
import './export/export_modal';
import './export_data/export_data_modal';
import './ad_hoc_filters';
import './repeat_option/repeat_option';
import './dashgrid/DashboardGridDirective';
import './dashgrid/RowOptions';
import './folder_picker/folder_picker';
import './move_to_folder_modal/move_to_folder';
import './template/save_as_template/save_as_template';
import './template/category_picker/category_picker';
import './settings/settings';
import './panellinks/module';
import './dashlinks/module';

import { CreateFolderCtrl } from './create_folder_ctrl';
import { DashboardImportCtrl } from './dashboard_import_ctrl';
import DashboardPermissions from './permissions/DashboardPermissions';
import { FolderDashboardsCtrl } from './folder_dashboards_ctrl';
import coreModule from 'app/core/core_module';
import { react2AngularDirective } from 'app/core/utils/react2angular';

// angular wrappers
react2AngularDirective('dashboardPermissions', DashboardPermissions, ['dashboardId', 'folder']);

coreModule.controller('FolderDashboardsCtrl', FolderDashboardsCtrl);
coreModule.controller('DashboardImportCtrl', DashboardImportCtrl);
coreModule.controller('CreateFolderCtrl', CreateFolderCtrl);
