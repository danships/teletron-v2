export default {
  '*': 'prettier --write --ignore-unknown',
  // eslint lints only TypeScript files. Passing other files triggers an "ignored" warning that fails --max-warnings 0.
  '*.ts': (files) => [`eslint --max-warnings 0 ${files.map((file) => `"${file}"`).join(' ')}`, 'tsc -b'],
};
