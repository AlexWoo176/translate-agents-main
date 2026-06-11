'use strict';

const path = require('path');
const { getBookRoot } = require('../paths/path-resolver');

function getPhaseRunReportPath(bookSlug, timestamp) {
  const bookRoot = getBookRoot(bookSlug);
  return {
    jsonPath: path.join(bookRoot, 'reports', 'phase-runs', `glossary-${timestamp}.json`),
    mdPath: path.join(bookRoot, 'reports', 'phase-runs', `glossary-${timestamp}.md`)
  };
}

module.exports = {
  getPhaseRunReportPath
};
