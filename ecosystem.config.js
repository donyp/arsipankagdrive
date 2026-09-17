module.exports = {
  apps: [
    {
      name: 'arsiphost',
      script: './backend/server.js',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'data', 'preview_cache'],
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      // Error and output logs
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart
      autorestart: true,
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      
      // Environment
      cwd: './',
    },
  ],
  
  // Cluster mode configuration
  deploy: {
    production: {
      user: 'node',
      host: 'your-hosting-domain.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/ARSIPHOST.git',
      path: '/home/username/ARSIPHOST',
      'post-deploy': 'npm install && pm2 restart ecosystem.config.js --env production',
    },
  },
};
