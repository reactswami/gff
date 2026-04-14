import { applyMiddleware, combineReducers, compose, createStore } from 'redux';

import { createLogger } from 'redux-logger';
import dashboardReducers from 'app/features/dashboard/state/reducers';
import foldersReducers from 'app/features/folders/state/reducers';
import pluginReducers from 'app/features/plugins/state/reducers';
import sharedReducers from 'app/core/reducers';
import thunk from 'redux-thunk';

const rootReducers = {
  ...sharedReducers,
  ...foldersReducers,
  ...dashboardReducers,
  ...pluginReducers,
};

export let store;

export function addRootReducer(reducers) {
  Object.assign(rootReducers, ...reducers);
}

export function configureStore() {
  const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

  const rootReducer = combineReducers(rootReducers);

  if (process.env.NODE_ENV !== 'production') {
    // DEV builds we had the logger middleware
    store = createStore(rootReducer, {}, composeEnhancers(applyMiddleware(thunk, createLogger())));
  } else {
    store = createStore(rootReducer, {}, composeEnhancers(applyMiddleware(thunk)));
  }
}
