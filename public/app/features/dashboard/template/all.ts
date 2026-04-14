import './move_to_category_modal/move_to_category';
import './save_as_template/save_as_template';
import './save_as_template/save_template_form';
import './category_picker/category_picker';
import './export/export_template';
import coreModule from 'app/core/core_module';

import { TemplateImportCtrl } from './template_import_ctrl';
coreModule.controller('TemplateImportCtrl', TemplateImportCtrl);
