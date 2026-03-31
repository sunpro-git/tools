module.exports = {
  apps: [
    {
      name: "drive-image-search",
      script: "npx",
      args: "tsx server/index.ts",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        SERVER_PORT: "3001",
      },
      // クラッシュ時の自動再起動
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      // ログ
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      merge_logs: true,
    },
  ],
};
