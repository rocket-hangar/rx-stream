import { build } from '@rocket-scripts/web';

(async () => {
  await build({
    app: 'test-app',
    // type ctrl + space (your code completion shortcut on your IDE)
    // you can look at more configuration options
  });
})();
