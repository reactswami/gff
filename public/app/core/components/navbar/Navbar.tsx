// Replaces: public/app/core/components/navbar/navbar.html
//           + NavbarCtrl in navbar.ts
//
// USAGE SITE: gf_page.ts embeds <navbar model="model"> but gf-page is never used
//   in any route template — this is dead code. Actual pages use <page-header> instead.
//   The Navbar registration is kept for safety in case any template references it.
//
// Directives in original template:
//   ng-repeat → map()             plain array rendering
//   ng-href   → href              trivial replacement
//   dashboard-search → stays Angular (registered separately, rendered after this component)
//
// NavbarCtrl had only showSearch() and navItemClicked() — showSearch emits an
// appEvent. navItemClicked is no longer needed because we render anchors directly.

import React from 'react';

interface Breadcrumb {
  url: string;
  text: string;
}

interface NavModel {
  breadcrumbs?: Breadcrumb[];
}

interface NavbarProps {
  model: NavModel;
}

export const Navbar: React.FC<NavbarProps> = ({ model }) => {
  const breadcrumbs = model?.breadcrumbs || [];

  return (
    <div className="page-nav">
      <div className="page-breadcrumbs">
        <a className="breadcrumb-item active" href="/">
          <i className="fa fa-home" />
        </a>
        {breadcrumbs.map((item, idx) => (
          <a key={idx} className="breadcrumb-item" href={item.url}>
            {item.text}
          </a>
        ))}
      </div>
    </div>
  );
};
