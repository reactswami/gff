// Replaces: pageH1 directive in navbar.ts
//
// USAGE SITE: various page templates that embed <page-h1 model="...">
//   to render the page header title with icon/image.
//
// The original directive rendered an <h1> with conditional icon/img.

import React from 'react';

interface PageHeader {
  icon?: string;
  img?: string;
  text?: string;
}

interface NavModel {
  header?: PageHeader;
}

interface PageH1Props {
  model: NavModel;
}

export const PageH1: React.FC<PageH1Props> = ({ model }) => {
  const header = model?.header || {};

  return (
    <h1 className="page-header__title">
      {header.icon && <i className={`page-header__icon ${header.icon}`} />}
      {header.img && <img className="page-header__img" src={header.img} alt="" />}
      {header.text}
    </h1>
  );
};
