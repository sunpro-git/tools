process.chdir(__dirname);
require('child_process').execSync('npx vite --port 3000 --host', { stdio: 'inherit' });
