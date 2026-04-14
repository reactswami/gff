import _ from 'lodash';
import coreModule from 'app/core/core_module';

interface HttpResponse<T> extends Response {
  parsedBody?: IResponse<T>;
}
type URL_PARAMS = Record<string, string>;

type IResponse<T> = {
  data: ResponseData<T>;
};

export type TemplateFilter<T> = (template: T, contextSrv?) => boolean;

type ResponseData<T> = {
  errmsg: string;
  success: boolean;
  objects: Array<ResponseObject<T>>;
};

type ResponseObject<T> = {
  data_total: number;
  type: string;
  objects: Array<object>;
  status: ResponseStatus;
  data: T[];
};

type ResponseStatus = {
  success: boolean;
  errcode: number;
};

type RequestBody = {
  fields?: object;
  filter?: object | string;
  data?: any[];
};

export type Category = {
  category: string;
};

export type CategoryRet = {
  text: string;
};

export type TemplateType = {
  text: string;
};

export type PanelTemplate = {
  id: number;
  name: string;
  owner: string;
  access: string;
  category?: string;
  title?: string;
  description: string;
  data: string;
  type: string;
  folderTitle?: string;
  checked?: boolean;
  selected?: boolean;
};

export type CategoryFilter = (category: Category[] ) => CategoryRet[];

const BASE_URL = window.location.origin + '/api/latest';
const DASHBOARD_TEMPLATE_PATH = '/dashboard_panel_template';

export const getUniqueList = (objectArray, property) => objectArray.reduce( (acc, obj) => {
  const uniqueId = obj[property];
  if ( !acc.includes(uniqueId)) {
    acc.push(uniqueId);
  }
  return acc;
}, []);

export const groupBy = (objectArray, property) => objectArray.reduce((acc, obj) => {
  const key = obj[property];
  const curGroup = acc[key] ?? [];

  return { ...acc, [key]: [...curGroup, obj] };
}, {});

export const getCountBy = (objectArray, property) => objectArray.reduce((acc, obj) => {
  const key = obj[property];
  const curGroup = acc[key] ? acc[key] + 1 : 1;
  return { ...acc, [key]: curGroup };
}, {});

export function sortCategories(categoryList: Category[]): CategoryRet[] {
  const sortCategories = (a: CategoryRet, b: CategoryRet) => {
    return  (a.text.toUpperCase() > b.text.toUpperCase()) ? 1 : (a.text.toUpperCase() < b.text.toUpperCase()) ? -1 : 0;
  };
  return categoryList.map(cat => ({text: cat.category})).sort(sortCategories);
}

export function filterTemplates(template: PanelTemplate, contextSrv) {
  if (contextSrv.user.isGrafanaAdmin) {
    return true;
  }
  return (template.access === 'public') ||
         (template.access === 'private' && template.owner === contextSrv.user.login);
}

export function escapeUnicode(str) {
  return str.split('').map(c => /^[\x00-\x7F]$/.test(c) ?
    c : c.split("").map(a => "\\u" + a.charCodeAt().toString(16).padStart(4, "0")).join("")).join("");
}

export function getAPIURL(path) {
  if (path.startsWith(DASHBOARD_TEMPLATE_PATH)) {
    // Redirect any requests to the /dashboard_panel_templates to the CGI
    return new URL(window.location.origin + '/cgi/dashboard_panel_template');
  } else {
    return new URL(BASE_URL + path);
  }
}

export class BackendApiSrv {

  async http<T>(
    info: RequestInfo,
    init?: RequestInit
  ): Promise<HttpResponse<T>> {

    const response: HttpResponse<T> = await fetch(info, init);

    try {
      response.parsedBody = await response.json();
    } catch (ex) {
      throw new Error(response.statusText);
    }

    if (response.status !== 200) {
      throw new Error(response.parsedBody.data.errmsg);
    }

    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response;
  }

  async api_get<T>(
    path: string,
    params: URL_PARAMS,
    args: RequestInit = { method: "get",
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    }
  ): Promise<T[]> {

    const url = getAPIURL(path);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const templateURL = url.href.replaceAll('%2C', ',');

    const response: HttpResponse<T> = await this.http<T>(templateURL, args);
    const responseData: IResponse<T> = response.parsedBody;
    return responseData?.data?.objects[0]?.data;
  }

  async api_post<T>(
    path: string,
    body: T[],
    args: RequestInit = {
      method: "POST",
      body: escapeUnicode(JSON.stringify({
        "data": [
          ...body
        ]
      })),
      headers: {
        "Content-type": "application/json",
        'Accept': 'application/json',
      }
    }
  ): Promise<T>  {
    const url = getAPIURL(path);
    const response: HttpResponse<T> = await this.http<T>(url.href, args);
    const responseData: IResponse<T> = response.parsedBody;
    return responseData?.data?.objects[0]?.data[0];
  }

  getUpdateFilter<T>(reqBody: RequestBody, itemList: T[], filterField: string, filter: string) {
    reqBody.fields = {
      [filterField]: {}
    };
    reqBody.filter = this.getFilterValue<T>(itemList, filterField, filter);
  }

  getUpdateBody<T>(itemList: T[], modifiedFields: string[], filterField: string, filter: string): RequestBody {

    const itemCopy = {};
    modifiedFields.forEach(field => {
      itemCopy[field] = itemList[0][field];
    });

    const body: RequestBody = {
      data: [itemCopy]
    };
    this.getUpdateFilter<T>(body, itemList, filterField, filter);
    return body;
  }

  async api_put<T>(
    path: string,
    body: T[],
    modifiedFields,
    filterField = 'id',
    filter = 'IN',
    args: RequestInit = {
      method: "PUT",
      body: escapeUnicode(JSON.stringify(
        this.getUpdateBody<T>(body, modifiedFields, filterField, filter)
      )),
      headers: {
        "Content-type": "application/json",
        'Accept': 'application/json',
      }
    }
  ): Promise<ResponseData<T>> {
    const url = getAPIURL(path);

    const response: HttpResponse<T> = await this.http<T>(url.href, args);
    const responseData: IResponse<T> = response.parsedBody;
    return responseData?.data;
  }

  getFilterValue<T>(itemList: T[], filterField: string, filter: string) {
    if (filter !== 'IN') {
      throw Error(`Filter ${filter} Not Implemented`);
    }

    let filterValue = '';
    itemList.forEach(item => {
      if (filterValue) {
        filterValue = `${filterValue} ,${item[filterField]}`;
      } else {
        filterValue = `${item[filterField]}` ;
      }
    });
    filterValue = `{${filterField}} ${filter} (${filterValue})`;
    return filterValue;
  }

  getDeleteBody<T>(itemList: T[], filterField: string, filter: string) {
    const body = {
      fields: {
        [filterField]: {}
      },
      filter: this.getFilterValue<T>(itemList, filterField, filter)
    };
    return body;
  }

  async api_delete<T>(
    path: string,
    body: T[],
    filterField = 'id',
    filter = 'IN',
    args: RequestInit = {
      method: "DELETE",
      body: escapeUnicode(JSON.stringify(
        this.getDeleteBody<T>(body, filterField, filter)
      )),
      headers: {
        "Content-type": "application/json",
        'Accept': 'application/json',
      }
    }
  ): Promise<ResponseData<T>> {
    const url = getAPIURL(path);

    const response: HttpResponse<T> = await this.http<T>(url.href, args);
    const responseData: IResponse<T> = response.parsedBody;
    return responseData?.data;
  }

  createTemplate(panelTemplate: PanelTemplate[]) {
    return this.api_post<PanelTemplate>(DASHBOARD_TEMPLATE_PATH, [...panelTemplate]);
  }

  deleteTemplate(panelTemplate: PanelTemplate[]) {
    return this.api_delete<PanelTemplate>(DASHBOARD_TEMPLATE_PATH, [...panelTemplate]);
  }

  editTemplate(panelTemplate: PanelTemplate[], editedFields = ['name', 'access', 'category', 'description']) {
    return this.api_put<PanelTemplate>(DASHBOARD_TEMPLATE_PATH, [...panelTemplate],
      editedFields);
  }

  getTemplates(contextSrv,
    filter: TemplateFilter<PanelTemplate> = filterTemplates): Promise<PanelTemplate[]>  {
    return this.api_get<PanelTemplate>(DASHBOARD_TEMPLATE_PATH, {
      fields: 'name,category,access,owner,description,type,data'
    }).then(templates => templates.filter(template => filter(template, contextSrv)));
  }

  getCategories(filter: CategoryFilter = sortCategories): Promise<CategoryRet[]>  {
    return this.api_get<Category>(DASHBOARD_TEMPLATE_PATH, {
      fields: 'category', group_by: '{category}'
    }).then( (categories: Category[]) => filter(categories));
  }
}

coreModule.service('backendApiSrv', BackendApiSrv);

let singletonInstance: BackendApiSrv;

export function setBackendApiSrv(instance: BackendApiSrv) {
  singletonInstance = instance;
}

export function getBackendApiSrv(): BackendApiSrv {
  return singletonInstance;
}
