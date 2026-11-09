/** Module boundaries (ADR-041). Do not remove a rule to make a change pass. */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'packages-not-to-apps',
      comment: 'Packages are shared. They must not depend on an app.',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'apps-not-to-other-apps',
      comment: 'The hub and the node share code only through packages.',
      severity: 'error',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/([^/]+)/', pathNot: '^apps/$1/' },
    },
    {
      name: 'protocol-stays-pure',
      comment: 'The protocol package contains types and pure functions only. No Node built-ins, no I/O.',
      severity: 'error',
      from: { path: '^packages/protocol/' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'apps-import-packages-by-name',
      comment: 'Import a package by its name (@teletron/...), not by a relative path into its folder.',
      severity: 'error',
      from: { path: '^apps/' },
      to: { path: '^packages/', dependencyTypes: ['local'] },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'not-to-dev-dep',
      comment: 'Production code must not import a devDependency.',
      severity: 'error',
      from: { path: '^(apps|packages)/[^/]+/src/', pathNot: '\\.test\\.ts$' },
      to: { dependencyTypes: ['npm-dev'] },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      from: { orphan: true, pathNot: ['\\.d\\.ts$', '\\.test\\.ts$', '^apps/[^/]+/src/index\\.ts$'] },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)dist/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      // "source" points workspace packages to their src, so boundaries are checked on source files, not dist.
      conditionNames: ['source', 'import', 'types', 'default'],
    },
  },
};
