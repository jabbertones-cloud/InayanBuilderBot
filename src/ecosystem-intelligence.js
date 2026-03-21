/**
 * Ecosystem Intelligence Module (Universal)
 *
 * Provides comprehensive ecosystem analysis, category detection, feature assessment,
 * and peer benchmarking for ANY code project. Pure functions with no external dependencies.
 *
 * Supports 20+ built-in categories plus automatic category inference for unmapped projects.
 */

/**
 * Universal dependency-to-capability signal map
 * Maps common dependencies across ALL package ecosystems to feature capabilities
 */
export const UNIVERSAL_DEP_SIGNALS = {
  // Authentication & Security
  'passport': 'authentication', 'better-auth': 'authentication', 'next-auth': 'authentication',
  'clerk': 'authentication', 'auth0': 'authentication', 'jsonwebtoken': 'jwt_tokens',
  'bcryptjs': 'password_hashing', 'crypto': 'encryption', 'jsonwebtoken': 'jwt',
  'argon2': 'password_hashing', 'scrypt': 'password_hashing',

  // Database & ORM
  'prisma': 'database_orm', 'drizzle-orm': 'database_orm', 'sequelize': 'database_orm',
  'typeorm': 'database_orm', 'mikro-orm': 'database_orm', 'knex': 'query_builder',
  'pg': 'postgresql', 'mysql2': 'mysql', 'mysql': 'mysql', 'mongodb': 'mongodb',
  'mongoose': 'mongodb_odm', 'redis': 'caching', 'ioredis': 'caching', 'memcached': 'caching',
  'dynamodb': 'aws_dynamodb', '@aws-sdk/client-dynamodb': 'aws_dynamodb',
  'firebase': 'firebase_realtime_db', 'supabase': 'postgresql_managed',

  // HTTP & API
  'express': 'http_server', 'fastify': 'http_server', 'hono': 'http_server',
  'koa': 'http_server', 'nest': 'http_server', 'next': 'http_server',
  'axios': 'http_client', 'got': 'http_client', 'fetch': 'http_client',
  'isomorphic-fetch': 'http_client', 'node-fetch': 'http_client',

  // GraphQL
  'apollo-server': 'graphql_server', 'graphql': 'graphql_support', 'graphql-yoga': 'graphql_server',
  '@apollo/client': 'graphql_client', 'urql': 'graphql_client', 'relay': 'graphql_framework',

  // Testing
  'vitest': 'unit_testing', 'jest': 'unit_testing', 'mocha': 'unit_testing',
  'chai': 'assertion_library', 'expect': 'assertion_library', 'playwright': 'e2e_testing',
  'cypress': 'e2e_testing', 'puppeteer': 'browser_automation', 'webdriver': 'browser_automation',
  'selenium': 'browser_automation', 'supertest': 'api_testing', 'node-test': 'unit_testing',

  // Frontend Frameworks
  'react': 'react_ui', 'vue': 'vue_ui', 'angular': 'angular_ui', 'svelte': 'svelte_ui',
  'solid': 'solid_ui', 'astro': 'static_site_generator', 'next.js': 'nextjs_framework',
  'nuxt': 'nuxt_framework', 'remix': 'remix_framework', 'gatsby': 'gatsby_framework',

  // CSS & Styling
  'tailwindcss': 'tailwind_css', 'bootstrap': 'bootstrap_css', 'material-ui': 'material_design',
  'styled-components': 'css_in_js', 'emotion': 'css_in_js', 'sass': 'sass_support',
  'less': 'less_support', 'postcss': 'postcss_support',

  // State Management
  'redux': 'state_management', 'zustand': 'state_management', 'pinia': 'state_management',
  'recoil': 'state_management', 'jotai': 'state_management', 'mobx': 'state_management',
  'vuex': 'state_management', 'xstate': 'state_machines',

  // Payments & Commerce
  'stripe': 'stripe_payments', '@stripe/stripe-js': 'stripe_payments',
  '@paypal/checkout-server-sdk': 'paypal_payments', 'square': 'square_payments',
  'razorpay': 'razorpay_payments', 'lemonsqueezy': 'lemonsqueezy_commerce',
  '@shopify/shopify-app-express': 'shopify_integration', 'commerce': 'ecommerce_platform',

  // Email & Messaging
  'nodemailer': 'email_sending', 'mailgun': 'mailgun_service', 'sendgrid': 'sendgrid_service',
  'resend': 'resend_email', 'aws-sdk': 'aws_ses', 'twilio': 'sms_messaging',
  'postmark': 'postmark_email', 'mailer': 'email_framework',

  // Observability & Logging
  'pino': 'logging', 'winston': 'logging', 'bunyan': 'logging', 'log4js': 'logging',
  'opentelemetry': 'distributed_tracing', 'datadog': 'datadog_monitoring',
  'sentry': 'error_tracking', 'newrelic': 'newrelic_apm', 'signoz': 'observability_platform',
  'langfuse': 'llm_observability', 'langsmith': 'llm_observability',

  // AI & ML
  'openai': 'openai_api', 'anthropic': 'anthropic_api', '@langchain': 'langchain_framework',
  'langchain': 'langchain_framework', 'llamaindex': 'llamaindex_framework',
  'cohere': 'cohere_api', 'google-generativeai': 'google_gemini', 'aws-sdk': 'aws_bedrock',
  'transformers': 'huggingface_transformers', 'tensorflow': 'tensorflow_ml',
  'torch': 'pytorch_ml', 'scikit-learn': 'scikit_learn', 'pandas': 'pandas_dataframe',
  'numpy': 'numpy_arrays', 'qdrant': 'vector_database', 'pinecone': 'vector_database',
  'chromadb': 'vector_database', 'weaviate': 'vector_database', 'milvus': 'vector_database',

  // Task Queues & Background Jobs
  'bullmq': 'job_queue', 'bull': 'job_queue', 'agenda': 'job_scheduler',
  'node-schedule': 'task_scheduling', 'cron': 'cron_scheduling',
  'celery': 'background_tasks', 'rq': 'redis_queue',

  // Desktop Apps
  'electron': 'electron_desktop', 'tauri': 'tauri_desktop', 'nwjs': 'nwjs_desktop',

  // Mobile Development
  'react-native': 'react_native', 'flutter': 'flutter_mobile', 'nativescript': 'nativescript_mobile',
  'expo': 'expo_framework', 'ionic': 'ionic_mobile',

  // Containerization & DevOps
  'docker': 'docker_support', 'kubernetes': 'kubernetes_support', 'helm': 'helm_charts',
  'terraform': 'terraform_iac', 'ansible': 'ansible_iac', 'pulumi': 'pulumi_iac',
  'railway': 'railway_deployment', 'vercel': 'vercel_deployment', 'netlify': 'netlify_deployment',

  // Web Scraping & Crawling
  'cheerio': 'web_scraping', 'jsdom': 'dom_parsing', 'htmlparser2': 'html_parsing',
  'beautifulsoup': 'web_scraping', 'scrapy': 'scraping_framework', 'selenium': 'web_automation',

  // NFC & Hardware
  'nfc-tools': 'nfc_support', 'serialport': 'serial_communication', 'usb': 'usb_support',
  'hid': 'hid_devices', 'bluetooth': 'bluetooth_support',

  // WebSockets & Real-time
  'socket.io': 'websockets', 'ws': 'websockets', 'uwebsockets': 'websockets',
  'subscriptions-transport-ws': 'graphql_subscriptions',

  // Validation & Schemas
  'zod': 'schema_validation', 'joi': 'schema_validation', 'yup': 'schema_validation',
  'ajv': 'json_schema_validation', 'typescript': 'typescript_support',

  // Markdown & Document Processing
  'marked': 'markdown_parsing', 'remark': 'markdown_processor', 'gray-matter': 'frontmatter',
  'pandoc': 'document_conversion', 'pdf-parse': 'pdf_parsing', 'pdfkit': 'pdf_generation',

  // Analytics
  'mixpanel': 'mixpanel_analytics', 'amplitude': 'amplitude_analytics',
  'segment': 'segment_analytics', 'plausible': 'plausible_analytics',
  'google-analytics': 'google_analytics', 'gtag': 'gtag_tracking',

  // CMS & Headless
  'strapi': 'strapi_cms', 'sanity': 'sanity_cms', 'contentful': 'contentful_api',
  'notion': 'notion_api', 'airtable': 'airtable_api', 'directus': 'directus_cms',

  // E-commerce Platforms
  'shopify': 'shopify_api', 'woocommerce': 'woocommerce_api', 'medusa': 'medusa_framework',
  'commercejs': 'commercejs_platform', 'swell': 'swell_platform',

  // Authentication Protocols
  'oauth2orize': 'oauth2_provider', 'casl': 'authorization_library', '@casl/ability': 'authorization_library',
  'acl': 'acl_system', 'node-acl': 'acl_system',

  // Misc
  'dotenv': 'env_config', 'joi': 'validation', 'moment': 'date_time', 'dayjs': 'date_time',
  'date-fns': 'date_time', 'uuid': 'id_generation', 'nanoid': 'id_generation',
};

/**
 * Category Taxonomy System (20+ categories + universal fallback)
 *
 * Defines standard ecosystem categories with keyword detection, critical/high/medium
 * severity features, and scoring weights.
 */
export const CATEGORIES = {
  'pdf-tools': {
    name: 'PDF Tools',
    description: 'PDF generation, parsing, manipulation, and form filling',
    keywords: ['pdf', 'document', 'form', 'fill', 'ocr', 'render', 'viewer', 'generator', 'parse'],
    features: [
      {
        id: 'pdf_generation',
        name: 'PDF Generation',
        severity: 'critical',
        detection: 'dependency',
        signals: ['pdfkit', 'pdf-lib', 'jspdf', 'puppeteer', 'wkhtmltopdf', 'weasyprint', 'reportlab'],
      },
      {
        id: 'pdf_parsing',
        name: 'PDF Parsing',
        severity: 'critical',
        detection: 'dependency',
        signals: ['pdfjs-dist', 'pdf-parse', 'pdf2json', 'poppler', 'pdfplumber', 'pypdf', 'pdfminer'],
      },
      {
        id: 'form_filling',
        name: 'Form Filling',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['form fill', 'form field', 'acroform', 'fillable', 'interactive form', 'xfa'],
      },
      {
        id: 'ocr_support',
        name: 'OCR Support',
        severity: 'high',
        detection: 'dependency',
        signals: ['tesseract', 'surya', 'mmocr', 'vision api', 'ocr', 'paddleocr', 'easyocr', 'pytesseract'],
      },
      {
        id: 'digital_signatures',
        name: 'Digital Signatures',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['e-sign', 'signature', 'digital sign', 'pkcs', 'signing', 'certificate'],
      },
      {
        id: 'batch_processing',
        name: 'Batch Processing',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['batch', 'bulk', 'queue', 'parallel', 'concurrent', 'bulk processing'],
      },
      {
        id: 'template_system',
        name: 'Template System',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['template', 'reusable', 'preset', 'layout', 'template engine'],
      },
      {
        id: 'merge_split',
        name: 'Merge & Split',
        severity: 'low',
        detection: 'readme_keyword',
        signals: ['merge', 'split', 'combine', 'extract pages', 'page range', 'concatenate'],
      },
    ],
    weights: { similarity: 0.35, features: 0.40, health: 0.25 },
  },

  'ai-agent-frameworks': {
    name: 'AI Agent Frameworks',
    description: 'LLM orchestration, tool calling, multi-agent systems, RAG',
    keywords: [
      'agent', 'llm', 'ai', 'orchestration', 'tool-calling', 'rag', 'copilot',
      'autonomous', 'reasoning', 'agentic',
    ],
    features: [
      {
        id: 'llm_integration',
        name: 'LLM Integration',
        severity: 'critical',
        detection: 'dependency',
        signals: ['openai', 'anthropic', '@langchain', 'ollama', 'llamaindex', 'cohere', 'google-generativeai'],
      },
      {
        id: 'tool_calling',
        name: 'Tool Calling',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['tool call', 'function call', 'tool use', 'mcp', 'capabilities', 'tool schema'],
      },
      {
        id: 'memory_system',
        name: 'Memory System',
        severity: 'high',
        detection: 'readme_keyword',
        signals: [
          'memory', 'context window', 'conversation history', 'state management',
          'persistence', 'recall', 'memory buffer',
        ],
      },
      {
        id: 'multi_agent',
        name: 'Multi-Agent',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['multi-agent', 'swarm', 'crew', 'orchestrat', 'collaboration', 'agent team'],
      },
      {
        id: 'streaming',
        name: 'Streaming Response',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['stream', 'sse', 'server-sent', 'real-time', 'incremental', 'token streaming'],
      },
      {
        id: 'knowledge_retrieval',
        name: 'Knowledge Retrieval (RAG)',
        severity: 'medium',
        detection: 'dependency',
        signals: [
          'qdrant', 'pinecone', 'chromadb', 'weaviate', 'rag', 'retrieval',
          'vector', 'embedding', 'milvus',
        ],
      },
      {
        id: 'human_in_loop',
        name: 'Human-in-Loop',
        severity: 'low',
        detection: 'readme_keyword',
        signals: ['human-in-loop', 'approval', 'confirm', 'review', 'verification', 'feedback'],
      },
      {
        id: 'observability',
        name: 'Observability & Tracing',
        severity: 'medium',
        detection: 'dependency',
        signals: [
          'langfuse', 'langsmith', 'opentelemetry', 'pino', 'tracing',
          'logging', 'monitoring', 'telemetry',
        ],
      },
    ],
    weights: { similarity: 0.40, features: 0.40, health: 0.20 },
  },

  'dashboard-chat': {
    name: 'Dashboard & Chat UIs',
    description: 'Web-based chat interfaces, admin dashboards, multi-provider support',
    keywords: [
      'dashboard', 'chat', 'webui', 'admin', 'self-hosted', 'conversation',
      'interface', 'ui', 'web-interface',
    ],
    features: [
      {
        id: 'chat_ui',
        name: 'Chat UI',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: [
          'chat', 'conversation', 'message', 'webui', 'chat interface',
          'messaging', 'dialog', 'chat component',
        ],
      },
      {
        id: 'multi_provider',
        name: 'Multi-Provider',
        severity: 'high',
        detection: 'readme_keyword',
        signals: [
          'multi-provider', 'openai', 'anthropic', 'ollama', 'switch provider',
          'multiple backends', 'provider abstraction',
        ],
      },
      {
        id: 'admin_panel',
        name: 'Admin Panel',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['admin', 'dashboard', 'management', 'settings', 'configuration', 'control panel'],
      },
      {
        id: 'self_hosted',
        name: 'Self-Hosted',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['self-hosted', 'docker', 'helm', 'deploy', 'on-premise', 'self-deployable'],
      },
      {
        id: 'auth_system',
        name: 'Authentication',
        severity: 'medium',
        detection: 'dependency',
        signals: ['next-auth', 'better-auth', 'passport', 'clerk', 'auth0', 'authentication'],
      },
      {
        id: 'streaming_response',
        name: 'Streaming Response',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['streaming', 'real-time', 'sse', 'websocket', 'token streaming'],
      },
      {
        id: 'plugin_system',
        name: 'Plugin System',
        severity: 'low',
        detection: 'readme_keyword',
        signals: ['plugin', 'extension', 'marketplace', 'addon', 'plugin architecture'],
      },
      {
        id: 'mcp_support',
        name: 'MCP Support',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['mcp', 'model context protocol', 'mcp integration'],
      },
    ],
    weights: { similarity: 0.40, features: 0.35, health: 0.25 },
  },

  'e-commerce': {
    name: 'E-Commerce Platform',
    description: 'Shopping carts, checkout, payments, inventory, product catalog, orders',
    keywords: [
      'ecommerce', 'e-commerce', 'shop', 'shopping', 'cart', 'checkout', 'payment',
      'product', 'inventory', 'order', 'commerce',
    ],
    features: [
      {
        id: 'product_catalog',
        name: 'Product Catalog',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: ['product catalog', 'product management', 'products', 'catalog', 'inventory management'],
      },
      {
        id: 'shopping_cart',
        name: 'Shopping Cart',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: ['shopping cart', 'cart', 'add to cart', 'cart management', 'basket'],
      },
      {
        id: 'payment_processing',
        name: 'Payment Processing',
        severity: 'critical',
        detection: 'dependency',
        signals: ['stripe', 'paypal', 'square', 'razorpay', 'payment', 'checkout'],
      },
      {
        id: 'order_management',
        name: 'Order Management',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['order management', 'orders', 'order tracking', 'order history', 'fulfillment'],
      },
      {
        id: 'inventory_tracking',
        name: 'Inventory Tracking',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['inventory', 'stock', 'stock tracking', 'stock management', 'warehouse'],
      },
      {
        id: 'shipping_integration',
        name: 'Shipping Integration',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['shipping', 'shipment', 'carrier', 'delivery', 'logistics', 'shipping rate'],
      },
      {
        id: 'promotions',
        name: 'Promotions & Discounts',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['promotion', 'discount', 'coupon', 'sale', 'offer', 'promo code'],
      },
      {
        id: 'user_accounts',
        name: 'User Accounts & Profiles',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['user account', 'customer profile', 'account management', 'user profile', 'wishlist'],
      },
    ],
    weights: { similarity: 0.35, features: 0.45, health: 0.20 },
  },

  'game-development': {
    name: 'Game Development',
    description: 'Game engines, physics, rendering, multiplayer, asset management, scripting',
    keywords: [
      'game', 'game engine', 'physics', 'rendering', 'multiplayer', 'assets',
      'graphics', '3d', 'gameplay', 'gaming',
    ],
    features: [
      {
        id: 'game_engine',
        name: 'Game Engine',
        severity: 'critical',
        detection: 'dependency',
        signals: ['babylon.js', 'three.js', 'phaser', 'godot', 'unity', 'unreal', 'love2d', 'pygame'],
      },
      {
        id: 'physics_engine',
        name: 'Physics Engine',
        severity: 'high',
        detection: 'dependency',
        signals: ['cannon-es', 'rapier', 'p2.js', 'matter.js', 'bullet', 'physics'],
      },
      {
        id: 'graphics_rendering',
        name: 'Graphics & Rendering',
        severity: 'high',
        detection: 'dependency',
        signals: ['webgl', 'webgpu', 'threejs', 'babylonjs', 'opengl', 'rendering'],
      },
      {
        id: 'multiplayer',
        name: 'Multiplayer Support',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['multiplayer', 'network', 'multiplayer support', 'real-time', 'synchronization', 'netcode'],
      },
      {
        id: 'asset_management',
        name: 'Asset Management',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['asset', 'sprite', 'texture', 'model', 'asset loading', 'resource management'],
      },
      {
        id: 'scripting',
        name: 'Scripting System',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['script', 'scripting', 'game logic', 'behavior', 'event system'],
      },
      {
        id: 'audio',
        name: 'Audio Support',
        severity: 'medium',
        detection: 'dependency',
        signals: ['howler', 'tone.js', 'webaudio', 'audio context', 'sound', 'audio'],
      },
      {
        id: 'input_handling',
        name: 'Input Handling',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['input', 'keyboard', 'mouse', 'gamepad', 'touch', 'controller'],
      },
    ],
    weights: { similarity: 0.30, features: 0.50, health: 0.20 },
  },

  'mobile-app': {
    name: 'Mobile Application',
    description: 'Native UI, push notifications, offline storage, deep linking, biometrics',
    keywords: [
      'mobile', 'app', 'native', 'ios', 'android', 'mobile app',
      'notifications', 'offline', 'biometric', 'geolocation',
    ],
    features: [
      {
        id: 'native_ui',
        name: 'Native UI',
        severity: 'critical',
        detection: 'dependency',
        signals: ['react-native', 'flutter', 'nativescript', 'expo', 'ionic', 'nativebase'],
      },
      {
        id: 'push_notifications',
        name: 'Push Notifications',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['push notification', 'fcm', 'apns', 'notification', 'remote notification'],
      },
      {
        id: 'offline_storage',
        name: 'Offline Storage',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['offline', 'offline storage', 'local storage', 'sqlite', 'realm', 'sync'],
      },
      {
        id: 'deep_linking',
        name: 'Deep Linking',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['deep link', 'deep linking', 'universal link', 'app link', 'app linking'],
      },
      {
        id: 'biometrics',
        name: 'Biometric Authentication',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['biometric', 'fingerprint', 'face id', 'touch id', 'biometric auth'],
      },
      {
        id: 'camera_access',
        name: 'Camera & Media',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['camera', 'photo', 'video', 'media', 'image capture', 'gallery'],
      },
      {
        id: 'geolocation',
        name: 'Geolocation',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['geolocation', 'gps', 'location', 'maps', 'positioning'],
      },
      {
        id: 'background_tasks',
        name: 'Background Tasks',
        severity: 'low',
        detection: 'readme_keyword',
        signals: ['background task', 'background service', 'background job', 'worker'],
      },
    ],
    weights: { similarity: 0.30, features: 0.50, health: 0.20 },
  },

  'cli-tool': {
    name: 'CLI Tool',
    description: 'Argument parsing, stdin/stdout, colors, progress bars, config files, shell completion',
    keywords: [
      'cli', 'command line', 'tool', 'arguments', 'cli tool', 'command',
      'stdin', 'stdout', 'terminal', 'shell',
    ],
    features: [
      {
        id: 'argument_parsing',
        name: 'Argument Parsing',
        severity: 'critical',
        detection: 'dependency',
        signals: ['yargs', 'commander', 'oclif', 'minimist', 'arg', 'meow', 'cli-args'],
      },
      {
        id: 'stdin_stdout',
        name: 'STDIN/STDOUT Handling',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: ['stdin', 'stdout', 'stream', 'pipe', 'piping', 'input output'],
      },
      {
        id: 'colors_formatting',
        name: 'Colors & Formatting',
        severity: 'high',
        detection: 'dependency',
        signals: ['chalk', 'colorette', 'picocolors', 'ansi', 'color', 'colorize'],
      },
      {
        id: 'progress_bars',
        name: 'Progress Bars',
        severity: 'medium',
        detection: 'dependency',
        signals: ['progress', 'cli-progress', 'ora', 'loading', 'spinner'],
      },
      {
        id: 'config_files',
        name: 'Config File Support',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['config', 'configuration', 'config file', '.rc file', 'dotenv'],
      },
      {
        id: 'shell_completion',
        name: 'Shell Completion',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['completion', 'autocomplete', 'shell completion', 'bash completion', 'zsh completion'],
      },
      {
        id: 'help_system',
        name: 'Help & Documentation',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['help', '--help', '-h', 'usage', 'man page', 'documentation'],
      },
      {
        id: 'error_handling',
        name: 'Error Handling',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['error', 'exit code', 'error message', 'validation', 'error handling'],
      },
    ],
    weights: { similarity: 0.35, features: 0.45, health: 0.20 },
  },

  'web-framework': {
    name: 'Web Framework',
    description: 'Routing, middleware, templating, static files, WebSockets, CORS, sessions',
    keywords: [
      'web', 'framework', 'routing', 'middleware', 'template', 'websocket',
      'http', 'server', 'backend', 'web server',
    ],
    features: [
      {
        id: 'routing',
        name: 'Routing',
        severity: 'critical',
        detection: 'dependency',
        signals: ['express', 'fastify', 'hono', 'koa', 'next', 'nuxt', 'router', 'routing'],
      },
      {
        id: 'middleware',
        name: 'Middleware System',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: ['middleware', 'middleware support', 'middleware pipeline', 'request handler'],
      },
      {
        id: 'templating',
        name: 'Templating Engine',
        severity: 'high',
        detection: 'dependency',
        signals: ['ejs', 'pug', 'handlebars', 'nunjucks', 'template', 'templating'],
      },
      {
        id: 'static_files',
        name: 'Static File Serving',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['static', 'static files', 'public', 'assets', 'file serving'],
      },
      {
        id: 'websockets',
        name: 'WebSocket Support',
        severity: 'medium',
        detection: 'dependency',
        signals: ['socket.io', 'ws', 'websocket', 'websockets', 'uwebsockets'],
      },
      {
        id: 'cors_support',
        name: 'CORS Support',
        severity: 'high',
        detection: 'dependency',
        signals: ['cors', 'cross-origin', 'cors middleware', 'origin'],
      },
      {
        id: 'session_management',
        name: 'Session Management',
        severity: 'medium',
        detection: 'dependency',
        signals: ['express-session', 'session', 'sessions', 'session store', 'cookies'],
      },
      {
        id: 'error_handling',
        name: 'Error Handling',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['error', 'error handler', 'exception', 'error handling', 'error page'],
      },
    ],
    weights: { similarity: 0.35, features: 0.45, health: 0.20 },
  },

  'database-tool': {
    name: 'Database Tool',
    description: 'Migrations, ORM, connection pooling, query builder, schema management',
    keywords: [
      'database', 'db', 'orm', 'migration', 'query', 'schema',
      'connection', 'sql', 'data', 'persistence',
    ],
    features: [
      {
        id: 'migrations',
        name: 'Migration System',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: ['migration', 'migrations', 'schema migration', 'migrate', 'migration tool'],
      },
      {
        id: 'orm_support',
        name: 'ORM Support',
        severity: 'critical',
        detection: 'dependency',
        signals: ['prisma', 'drizzle-orm', 'sequelize', 'typeorm', 'orm', 'mikro-orm'],
      },
      {
        id: 'connection_pooling',
        name: 'Connection Pooling',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['connection pool', 'pooling', 'pool', 'connection management', 'pool size'],
      },
      {
        id: 'query_builder',
        name: 'Query Builder',
        severity: 'high',
        detection: 'dependency',
        signals: ['query builder', 'knex', 'query', 'querybuilder', 'sql builder'],
      },
      {
        id: 'schema_management',
        name: 'Schema Management',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['schema', 'schema design', 'schema management', 'table', 'column'],
      },
      {
        id: 'seeding',
        name: 'Database Seeding',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['seed', 'seeding', 'seed data', 'fixture', 'test data'],
      },
      {
        id: 'replication',
        name: 'Replication & Backup',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['replication', 'backup', 'restore', 'replication support', 'disaster recovery'],
      },
      {
        id: 'multi_database',
        name: 'Multi-Database Support',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['multi-database', 'multiple database', 'postgresql', 'mysql', 'sqlite'],
      },
    ],
    weights: { similarity: 0.30, features: 0.50, health: 0.20 },
  },

  'devops-ci-cd': {
    name: 'DevOps & CI/CD',
    description: 'Containerization, CI pipelines, infrastructure-as-code, monitoring, deployment',
    keywords: [
      'devops', 'ci', 'cd', 'pipeline', 'docker', 'kubernetes', 'infrastructure',
      'deploy', 'deployment', 'monitoring', 'automation',
    ],
    features: [
      {
        id: 'containerization',
        name: 'Containerization',
        severity: 'critical',
        detection: 'dependency',
        signals: ['docker', 'docker-compose', 'podman', 'container', 'containerization'],
      },
      {
        id: 'ci_pipeline',
        name: 'CI Pipeline',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: ['ci pipeline', 'github actions', 'gitlab ci', 'jenkins', 'circle ci', 'continuous integration'],
      },
      {
        id: 'infrastructure_as_code',
        name: 'Infrastructure as Code',
        severity: 'high',
        detection: 'dependency',
        signals: ['terraform', 'ansible', 'pulumi', 'cloudformation', 'iac', 'infrastructure'],
      },
      {
        id: 'monitoring',
        name: 'Monitoring & Alerting',
        severity: 'high',
        detection: 'dependency',
        signals: ['prometheus', 'grafana', 'datadog', 'newrelic', 'monitoring', 'metrics'],
      },
      {
        id: 'log_aggregation',
        name: 'Log Aggregation',
        severity: 'medium',
        detection: 'dependency',
        signals: ['elasticsearch', 'splunk', 'sumologic', 'logstash', 'logging', 'logs'],
      },
      {
        id: 'deployment',
        name: 'Deployment Tools',
        severity: 'high',
        detection: 'dependency',
        signals: ['helm', 'kubernetes', 'argocd', 'deployment', 'rollout'],
      },
      {
        id: 'secret_management',
        name: 'Secret Management',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['secret', 'secret management', 'vault', 'encryption', 'credentials'],
      },
      {
        id: 'scaling',
        name: 'Auto-Scaling',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['scaling', 'autoscale', 'auto-scale', 'load balancing', 'horizontal scaling'],
      },
    ],
    weights: { similarity: 0.30, features: 0.50, health: 0.20 },
  },

  'auth-security': {
    name: 'Auth & Security',
    description: 'OAuth, JWT, RBAC, encryption, password hashing, MFA, API keys, session management',
    keywords: [
      'auth', 'security', 'oauth', 'jwt', 'mfa', 'rbac', 'encryption',
      'authentication', 'authorization', 'access control',
    ],
    features: [
      {
        id: 'oauth_support',
        name: 'OAuth Support',
        severity: 'critical',
        detection: 'dependency',
        signals: ['oauth', 'oauth2', 'passport-oauth', 'next-auth', 'oauth2orize'],
      },
      {
        id: 'jwt_tokens',
        name: 'JWT Tokens',
        severity: 'critical',
        detection: 'dependency',
        signals: ['jsonwebtoken', 'jwt', 'jose', 'jwks', 'token'],
      },
      {
        id: 'rbac',
        name: 'Role-Based Access Control',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['rbac', 'role-based', 'role', 'permission', 'access control', 'role management'],
      },
      {
        id: 'encryption',
        name: 'Encryption',
        severity: 'high',
        detection: 'dependency',
        signals: ['crypto', 'encryption', 'bcryptjs', 'sodium', 'libsodium'],
      },
      {
        id: 'password_hashing',
        name: 'Password Hashing',
        severity: 'critical',
        detection: 'dependency',
        signals: ['bcrypt', 'bcryptjs', 'argon2', 'scrypt', 'password hashing'],
      },
      {
        id: 'mfa',
        name: 'Multi-Factor Authentication',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['mfa', 'multi-factor', 'two-factor', '2fa', 'totp', 'authenticator'],
      },
      {
        id: 'api_keys',
        name: 'API Key Management',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['api key', 'api keys', 'key management', 'token management', 'api token'],
      },
      {
        id: 'session_management',
        name: 'Session Management',
        severity: 'high',
        detection: 'dependency',
        signals: ['express-session', 'session', 'session store', 'cookies'],
      },
    ],
    weights: { similarity: 0.35, features: 0.45, health: 0.20 },
  },

  'email-marketing': {
    name: 'Email Marketing',
    description: 'Email sending, templates, tracking, bounce handling, list management, automation',
    keywords: [
      'email', 'marketing', 'newsletter', 'email campaign', 'mailing list',
      'smtp', 'transactional', 'email marketing',
    ],
    features: [
      {
        id: 'email_sending',
        name: 'Email Sending',
        severity: 'critical',
        detection: 'dependency',
        signals: ['nodemailer', 'sendgrid', 'mailgun', 'resend', 'email', 'smtp'],
      },
      {
        id: 'templates',
        name: 'Email Templates',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['template', 'email template', 'template engine', 'dynamic template', 'mjml'],
      },
      {
        id: 'tracking',
        name: 'Email Tracking',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['tracking', 'open tracking', 'click tracking', 'event tracking', 'analytics'],
      },
      {
        id: 'bounce_handling',
        name: 'Bounce Handling',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['bounce', 'bounce handling', 'soft bounce', 'hard bounce', 'unsubscribe'],
      },
      {
        id: 'list_management',
        name: 'List Management',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['list', 'subscriber', 'segmentation', 'list management', 'mailing list'],
      },
      {
        id: 'automation',
        name: 'Automation & Workflows',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['automation', 'workflow', 'drip campaign', 'email sequence', 'trigger'],
      },
      {
        id: 'webhooks',
        name: 'Webhook Support',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['webhook', 'webhooks', 'event', 'callback', 'real-time events'],
      },
      {
        id: 'compliance',
        name: 'GDPR & Compliance',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['gdpr', 'compliance', 'unsubscribe', 'opt-out', 'consent', 'privacy'],
      },
    ],
    weights: { similarity: 0.35, features: 0.45, health: 0.20 },
  },

  'data-pipeline': {
    name: 'Data Pipeline',
    description: 'ETL, streaming, batch processing, scheduling, data validation, transformation',
    keywords: [
      'data', 'etl', 'pipeline', 'stream', 'batch', 'processing',
      'data processing', 'workflow', 'data flow',
    ],
    features: [
      {
        id: 'etl',
        name: 'ETL Support',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: ['etl', 'extract', 'transform', 'load', 'data pipeline'],
      },
      {
        id: 'streaming',
        name: 'Streaming Processing',
        severity: 'high',
        detection: 'dependency',
        signals: ['kafka', 'rabbitmq', 'stream', 'streaming', 'real-time processing'],
      },
      {
        id: 'batch_processing',
        name: 'Batch Processing',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['batch', 'batch processing', 'scheduled', 'recurring job', 'cron'],
      },
      {
        id: 'scheduling',
        name: 'Task Scheduling',
        severity: 'high',
        detection: 'dependency',
        signals: ['schedule', 'scheduling', 'cron', 'agenda', 'node-schedule', 'job scheduler'],
      },
      {
        id: 'data_validation',
        name: 'Data Validation',
        severity: 'high',
        detection: 'dependency',
        signals: ['zod', 'joi', 'yup', 'validation', 'schema validation'],
      },
      {
        id: 'transformation',
        name: 'Data Transformation',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['transform', 'transformation', 'data mapping', 'conversion'],
      },
      {
        id: 'connectors',
        name: 'Data Connectors',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['connector', 'integration', 'source', 'destination', 'connector framework'],
      },
      {
        id: 'error_handling',
        name: 'Error Handling & Retries',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['error', 'retry', 'dead letter', 'error handling', 'circuit breaker'],
      },
    ],
    weights: { similarity: 0.30, features: 0.50, health: 0.20 },
  },

  'browser-automation': {
    name: 'Browser Automation',
    description: 'Headless browser, scraping, screenshot, form filling, navigation, proxy',
    keywords: [
      'browser', 'automation', 'scraping', 'headless', 'puppeteer',
      'screenshot', 'web scraping', 'crawling',
    ],
    features: [
      {
        id: 'headless_browser',
        name: 'Headless Browser',
        severity: 'critical',
        detection: 'dependency',
        signals: ['puppeteer', 'playwright', 'selenium', 'webdriver', 'headless'],
      },
      {
        id: 'web_scraping',
        name: 'Web Scraping',
        severity: 'high',
        detection: 'dependency',
        signals: ['cheerio', 'jsdom', 'beautifulsoup', 'scrapy', 'scraping'],
      },
      {
        id: 'screenshots',
        name: 'Screenshot Capture',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['screenshot', 'capture', 'visual', 'pdf export', 'image export'],
      },
      {
        id: 'form_filling',
        name: 'Form Filling',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['form', 'fill', 'input', 'form filling', 'data entry'],
      },
      {
        id: 'navigation',
        name: 'Navigation & Clicking',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['navigation', 'click', 'navigate', 'goto', 'navigation control'],
      },
      {
        id: 'proxy_support',
        name: 'Proxy Support',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['proxy', 'proxy support', 'vpn', 'rotation', 'proxy list'],
      },
      {
        id: 'javascript_execution',
        name: 'JavaScript Execution',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['javascript', 'script', 'execute', 'js execution', 'eval'],
      },
      {
        id: 'performance_metrics',
        name: 'Performance Metrics',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['performance', 'metrics', 'timing', 'lighthouse', 'performance analysis'],
      },
    ],
    weights: { similarity: 0.30, features: 0.50, health: 0.20 },
  },

  'lead-generation': {
    name: 'Lead Generation',
    description: 'Enrichment, scraping, CRM integration, scoring, sequencing, email verification',
    keywords: [
      'lead', 'lead generation', 'crm', 'sales', 'enrichment',
      'prospect', 'outreach', 'sales automation',
    ],
    features: [
      {
        id: 'lead_enrichment',
        name: 'Lead Enrichment',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: ['enrichment', 'enrich', 'lead enrichment', 'data enrichment', 'api enrichment'],
      },
      {
        id: 'web_scraping',
        name: 'Web Scraping',
        severity: 'high',
        detection: 'dependency',
        signals: ['puppeteer', 'playwright', 'cheerio', 'scraping', 'crawling'],
      },
      {
        id: 'crm_integration',
        name: 'CRM Integration',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['crm', 'salesforce', 'hubspot', 'pipedrive', 'crm integration'],
      },
      {
        id: 'lead_scoring',
        name: 'Lead Scoring',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['scoring', 'lead score', 'qualification', 'lead qualification', 'scoring model'],
      },
      {
        id: 'sequencing',
        name: 'Email Sequencing',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['sequencing', 'sequence', 'email sequence', 'drip campaign', 'automation'],
      },
      {
        id: 'email_verification',
        name: 'Email Verification',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['email verification', 'verify email', 'validation', 'bounceability'],
      },
      {
        id: 'list_management',
        name: 'List Management',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['list', 'list management', 'segmentation', 'filtering', 'deduplication'],
      },
      {
        id: 'analytics',
        name: 'Campaign Analytics',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['analytics', 'reporting', 'metrics', 'tracking', 'conversion'],
      },
    ],
    weights: { similarity: 0.35, features: 0.45, health: 0.20 },
  },

  'nfc-verification': {
    name: 'NFC Verification',
    description: 'NFC reading, tag validation, authentication, contactless, certificate verification',
    keywords: [
      'nfc', 'near field', 'contactless', 'tag', 'verification',
      'nfc reading', 'nfc authentication',
    ],
    features: [
      {
        id: 'nfc_reading',
        name: 'NFC Tag Reading',
        severity: 'critical',
        detection: 'dependency',
        signals: ['nfc', 'nfc-tools', 'nfc-reader', 'nfcpy', 'libnfc'],
      },
      {
        id: 'tag_validation',
        name: 'Tag Validation',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: ['tag validation', 'validate', 'checksum', 'integrity', 'valid tag'],
      },
      {
        id: 'authentication',
        name: 'NFC Authentication',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['authentication', 'auth', 'verify', 'secure', 'authentication protocol'],
      },
      {
        id: 'contactless_payment',
        name: 'Contactless Payment',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['payment', 'contactless', 'transaction', 'payment processing'],
      },
      {
        id: 'certificate_verification',
        name: 'Certificate Verification',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['certificate', 'cert', 'x509', 'certificate chain', 'verification'],
      },
      {
        id: 'data_encoding',
        name: 'Data Encoding Support',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['encoding', 'ndef', 'format', 'data format', 'serialization'],
      },
      {
        id: 'security',
        name: 'Security Features',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['security', 'encryption', 'signing', 'secure', 'tamper'],
      },
      {
        id: 'device_support',
        name: 'Multi-Device Support',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['device', 'multi-device', 'cross-platform', 'android', 'ios'],
      },
    ],
    weights: { similarity: 0.30, features: 0.50, health: 0.20 },
  },

  'content-management': {
    name: 'Content Management',
    description: 'Content CRUD, media management, versioning, publishing workflow, search, API-first',
    keywords: [
      'content', 'cms', 'content management', 'media', 'publishing',
      'blog', 'article', 'content management system',
    ],
    features: [
      {
        id: 'content_crud',
        name: 'Content CRUD',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: ['content', 'crud', 'create', 'read', 'update', 'delete', 'content management'],
      },
      {
        id: 'media_management',
        name: 'Media Management',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['media', 'image', 'video', 'file', 'asset', 'upload', 'media library'],
      },
      {
        id: 'versioning',
        name: 'Content Versioning',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['version', 'versioning', 'revision', 'history', 'rollback'],
      },
      {
        id: 'publishing_workflow',
        name: 'Publishing Workflow',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['publish', 'draft', 'workflow', 'approval', 'schedule publish'],
      },
      {
        id: 'search',
        name: 'Full-Text Search',
        severity: 'medium',
        detection: 'dependency',
        signals: ['elasticsearch', 'meilisearch', 'algolia', 'search', 'indexing'],
      },
      {
        id: 'api_first',
        name: 'API-First',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['api-first', 'rest api', 'graphql', 'api', 'headless cms'],
      },
      {
        id: 'multilingual',
        name: 'Multilingual Support',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['multilingual', 'i18n', 'translation', 'language', 'localization'],
      },
      {
        id: 'seo_optimization',
        name: 'SEO Optimization',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['seo', 'meta', 'sitemap', 'robots', 'seo optimization'],
      },
    ],
    weights: { similarity: 0.35, features: 0.45, health: 0.20 },
  },

  'social-media': {
    name: 'Social Media Management',
    description: 'Posting, scheduling, analytics, multi-platform, content management, engagement tracking',
    keywords: [
      'social', 'social media', 'twitter', 'facebook', 'instagram',
      'posting', 'scheduling', 'social management',
    ],
    features: [
      {
        id: 'posting',
        name: 'Content Posting',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: ['post', 'posting', 'publish', 'share', 'tweet'],
      },
      {
        id: 'scheduling',
        name: 'Content Scheduling',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['schedule', 'scheduling', 'queue', 'planned', 'future post'],
      },
      {
        id: 'analytics',
        name: 'Analytics & Insights',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['analytics', 'insights', 'metrics', 'engagement', 'reach', 'impressions'],
      },
      {
        id: 'multi_platform',
        name: 'Multi-Platform Support',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['multi-platform', 'twitter', 'facebook', 'instagram', 'linkedin', 'tiktok'],
      },
      {
        id: 'content_management',
        name: 'Content Management',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['content', 'library', 'drafts', 'content management', 'media library'],
      },
      {
        id: 'engagement_tracking',
        name: 'Engagement Tracking',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['engagement', 'likes', 'comments', 'shares', 'interaction'],
      },
      {
        id: 'automation',
        name: 'Automation',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['automation', 'auto-post', 'auto-reply', 'bot', 'workflow'],
      },
      {
        id: 'competitor_tracking',
        name: 'Competitor Tracking',
        severity: 'low',
        detection: 'readme_keyword',
        signals: ['competitor', 'competitor tracking', 'monitoring', 'competitor analysis'],
      },
    ],
    weights: { similarity: 0.35, features: 0.45, health: 0.20 },
  },

  'fintech-trading': {
    name: 'Fintech & Trading',
    description: 'Market data, order execution, portfolio management, backtesting, risk analysis',
    keywords: [
      'fintech', 'trading', 'finance', 'crypto', 'investment',
      'forex', 'stock', 'portfolio', 'trading platform',
    ],
    features: [
      {
        id: 'market_data',
        name: 'Market Data',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: ['market data', 'quotes', 'price feed', 'real-time data', 'market prices'],
      },
      {
        id: 'order_execution',
        name: 'Order Execution',
        severity: 'critical',
        detection: 'readme_keyword',
        signals: ['order', 'execution', 'trade', 'buy', 'sell', 'trading'],
      },
      {
        id: 'portfolio_management',
        name: 'Portfolio Management',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['portfolio', 'position', 'allocation', 'rebalancing', 'holdings'],
      },
      {
        id: 'backtesting',
        name: 'Backtesting',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['backtest', 'backtesting', 'historical', 'simulation', 'test strategy'],
      },
      {
        id: 'risk_analysis',
        name: 'Risk Analysis',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['risk', 'var', 'volatility', 'sharpe', 'risk management', 'drawdown'],
      },
      {
        id: 'reporting',
        name: 'Reporting & Analytics',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['report', 'analytics', 'performance', 'returns', 'pnl'],
      },
      {
        id: 'api_integration',
        name: 'Broker API Integration',
        severity: 'high',
        detection: 'readme_keyword',
        signals: ['api', 'broker', 'exchange', 'integration', 'api client'],
      },
      {
        id: 'strategy_framework',
        name: 'Strategy Framework',
        severity: 'medium',
        detection: 'readme_keyword',
        signals: ['strategy', 'algorithm', 'framework', 'signal', 'indicator'],
      },
    ],
    weights: { similarity: 0.30, features: 0.50, health: 0.20 },
  },

  'universal': {
    name: 'Universal Project',
    description: 'Auto-detected category with inferred features based on dependencies',
    keywords: [],
    features: [
      {
        id: 'custom_detection',
        name: 'Custom Feature Detection',
        severity: 'medium',
        detection: 'dependency',
        signals: [],
      },
    ],
    weights: { similarity: 0.30, features: 0.50, health: 0.20 },
  },
};

/**
 * Infer a category from dependency analysis.
 *
 * Examines repository dependencies against UNIVERSAL_DEP_SIGNALS to auto-generate
 * a category when no standard category matches well.
 *
 * @param {Object} repo - Repository object
 * @returns {Object} Auto-detected category definition
 */
export function inferCategoryFromDeps(repo) {
  if (!repo || typeof repo !== 'object') {
    return null;
  }

  const deps = repo.dependencies || {};
  const depNames = Array.isArray(deps) ? deps : Object.keys(deps);

  const capabilityScores = {};

  for (const dep of depNames) {
    const normalized = dep.replace(/^@[^/]+\//, '').toLowerCase();
    const capability = UNIVERSAL_DEP_SIGNALS[normalized];
    if (capability) {
      capabilityScores[capability] = (capabilityScores[capability] || 0) + 1;
    }
  }

  const sortedCapabilities = Object.entries(capabilityScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((entry) => entry[0]);

  if (sortedCapabilities.length === 0) {
    return null;
  }

  // Build keywords from dependency names and capabilities
  const keywords = sortedCapabilities.slice(0, 3).map((c) => c.replace(/_/g, '-'));

  return {
    categoryId: 'auto-detected',
    categoryName: `${keywords.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('/')}`,
    inferred: true,
    capabilities: sortedCapabilities,
    keywords,
  };
}

/**
 * Get all universal capabilities detected in a repository.
 *
 * Scans dependencies against UNIVERSAL_DEP_SIGNALS and returns all matched capabilities.
 *
 * @param {Object} repo - Repository object
 * @returns {Object} { capabilities: [{name, source, signal}], depCount, topSignals }
 */
export function getUniversalCapabilities(repo) {
  if (!repo || typeof repo !== 'object') {
    return { capabilities: [], depCount: 0, topSignals: [] };
  }

  const deps = repo.dependencies || {};
  const depNames = Array.isArray(deps) ? deps : Object.keys(deps);

  const capMap = new Map(); // capability → { name, source, signal }
  const signalHits = [];

  for (const dep of depNames) {
    const normalized = dep.replace(/^@[^/]+\//, '').toLowerCase();
    const capability = UNIVERSAL_DEP_SIGNALS[normalized];
    if (capability) {
      signalHits.push({ dep: normalized, capability });
      if (!capMap.has(capability)) {
        capMap.set(capability, { name: capability, source: 'dependency', signal: normalized });
      }
    }
  }

  // Also check keywords in description/topics
  const text = `${repo.name || ''} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  const keywordCaps = [
    ['authentication', ['auth', 'login', 'oauth', 'sso']],
    ['payments', ['payment', 'stripe', 'checkout', 'billing']],
    ['database', ['database', 'sql', 'nosql', 'orm']],
    ['real_time', ['realtime', 'real-time', 'websocket', 'socket']],
    ['machine_learning', ['ml', 'machine learning', 'neural', 'deep learning']],
    ['api', ['api', 'rest', 'graphql', 'grpc']],
    ['testing', ['test', 'testing', 'e2e', 'unit test']],
    ['containerization', ['docker', 'container', 'kubernetes', 'k8s']],
    ['mobile', ['mobile', 'ios', 'android', 'react native']],
    ['gaming', ['game', 'gaming', 'roblox', 'unity', 'godot']],
  ];

  for (const [cap, keywords] of keywordCaps) {
    if (!capMap.has(cap) && keywords.some(kw => text.includes(kw))) {
      capMap.set(cap, { name: cap, source: 'keyword', signal: keywords.find(kw => text.includes(kw)) });
    }
  }

  const capabilities = Array.from(capMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    capabilities,
    depCount: depNames.length,
    topSignals: signalHits.slice(0, 10),
  };
}

/**
 * Detect which category a repository most likely belongs to.
 *
 * Examines repository metadata (name, description, topics, dependencies) to
 * auto-classify into one of the defined categories. Falls back to universal
 * category inference if no match found above 0.15 confidence.
 *
 * @param {Object} repo - Repository object with name, description, topics, dependencies
 * @returns {Object} { categoryId, confidence, matchedKeywords, explanation }
 */
export function detectCategory(repo) {
  if (!repo || typeof repo !== 'object') {
    return { categoryId: null, confidence: 0, matchedKeywords: [], explanation: 'Invalid repo' };
  }

  const text = `${repo.name || ''} ${repo.description || ''} ${(repo.topics || []).join(' ')} ${
    Array.isArray(repo.dependencies) ? Object.keys(repo.dependencies).join(' ') : ''
  }`.toLowerCase();

  let bestMatch = { categoryId: null, confidence: 0, matchedKeywords: [] };

  // Skip universal category in initial scan
  for (const [catId, catDef] of Object.entries(CATEGORIES)) {
    if (catId === 'universal') continue;

    const keywords = catDef.keywords || [];
    const matchedKeywords = keywords.filter((kw) => text.includes(kw.toLowerCase()));
    const confidence = matchedKeywords.length / Math.max(1, keywords.length);

    if (confidence > bestMatch.confidence) {
      bestMatch = { categoryId: catId, confidence, matchedKeywords };
    }
  }

  // Fallback to universal category if confidence too low
  if (bestMatch.confidence < 0.15) {
    const inferred = inferCategoryFromDeps(repo);
    if (inferred) {
      return {
        categoryId: inferred.categoryId,
        confidence: 0.5,
        matchedKeywords: inferred.keywords,
        explanation: `Auto-detected: ${inferred.categoryName}`,
        inferred: true,
      };
    }

    return {
      categoryId: null,
      confidence: 0,
      matchedKeywords: [],
      explanation: 'No category match',
    };
  }

  const explanation =
    bestMatch.confidence > 0
      ? `Matched ${bestMatch.matchedKeywords.length} keywords (${bestMatch.matchedKeywords.join(', ')})`
      : 'No category match';

  return { ...bestMatch, explanation };
}

/**
 * Compute feature completeness for a repository within a category.
 *
 * For each feature in the category, check if the repo implements it (via
 * dependency detection or description/README keyword matching).
 *
 * @param {Object} repo - Repository object
 * @param {string} categoryId - Category identifier from CATEGORIES
 * @returns {Object} { score: 0-1, features: [{id, name, detected, method}], missing: [] }
 */
export function computeFeatureCompleteness(repo, categoryId) {
  if (!repo || !categoryId) {
    return {
      score: 0,
      features: [],
      missing: [],
      explanation: 'Invalid repo or category',
    };
  }

  let category = CATEGORIES[categoryId];

  // If category not found but categoryId is 'auto-detected', use universal + inferred features
  if (!category && categoryId === 'auto-detected') {
    category = CATEGORIES['universal'];
  }

  if (!category) {
    return {
      score: 0,
      features: [],
      missing: [],
      explanation: 'Category not found',
    };
  }

  const features = category.features || [];
  const text = `${repo.name || ''} ${repo.description || ''} ${(repo.topics || []).join(' ')} ${
    repo.readme ? repo.readme.toLowerCase() : ''
  }`.toLowerCase();

  const depsText = Array.isArray(repo.dependencies)
    ? Object.keys(repo.dependencies).join(' ').toLowerCase()
    : '';

  const detectedFeatures = [];
  const missing = [];

  for (const feature of features) {
    const signals = feature.signals || [];
    let detected = false;
    let method = null;

    if (feature.detection === 'dependency') {
      for (const signal of signals) {
        if (depsText.includes(signal.toLowerCase())) {
          detected = true;
          method = `dependency: ${signal}`;
          break;
        }
      }
    } else if (feature.detection === 'readme_keyword') {
      for (const signal of signals) {
        if (text.includes(signal.toLowerCase())) {
          detected = true;
          method = `keyword: ${signal}`;
          break;
        }
      }
    }

    const result = {
      id: feature.id,
      name: feature.name,
      severity: feature.severity,
      detected,
      method,
    };

    if (detected) {
      detectedFeatures.push(result);
    } else {
      missing.push(result);
    }
  }

  // Weight score by severity
  const severityWeights = { critical: 1.0, high: 0.7, medium: 0.4, low: 0.2 };
  const maxScore = features.reduce((sum, f) => sum + (severityWeights[f.severity] || 0), 0);
  const actualScore = detectedFeatures.reduce((sum, f) => {
    const feature = features.find((x) => x.id === f.id);
    return sum + (severityWeights[feature?.severity] || 0);
  }, 0);

  const score = maxScore > 0 ? actualScore / maxScore : 0;

  return {
    score: Math.round(score * 1000) / 1000,
    features: detectedFeatures,
    missing,
    completeness: `${detectedFeatures.length}/${features.length} features`,
  };
}

/**
 * Compute Jaccard similarity of normalized dependency names.
 *
 * Normalizes by stripping @scope/, version specifiers, and lowercasing.
 * Returns a value from 0 (no overlap) to 1 (identical).
 *
 * @param {Object|string[]} depsA - Dependencies object or array
 * @param {Object|string[]} depsB - Dependencies object or array
 * @returns {number} Similarity score 0-1
 */
export function computeDependencySimilarity(depsA, depsB) {
  const normalize = (deps) => {
    let arr = Array.isArray(deps) ? deps : Object.keys(deps || {});
    return new Set(
      arr
        .map((dep) =>
          dep
            .replace(/^@[^/]+\//, '') // Remove @scope/
            .replace(/[@^~>=<|]*.*$/, '') // Remove version specifiers
            .toLowerCase(),
        )
        .filter((x) => x.length > 0),
    );
  };

  const setA = normalize(depsA);
  const setB = normalize(depsB);

  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Compute health score for a repository.
 *
 * Combines recency, velocity, adoption, and risk factors into a 0-1 score.
 *
 * @param {Object} repo - Repository object with stars, forks, pushed_at, archived, license
 * @returns {Object} { score: 0-1, breakdown: { recency, velocity, adoption, risk } }
 */
export function computeHealthScore(repo) {
  if (!repo || typeof repo !== 'object') {
    return {
      score: 0,
      breakdown: { recency: 0, velocity: 0, adoption: 0, risk: 0 },
      explanation: 'Invalid repo',
    };
  }

  const stars = Number(repo.stargazers_count || repo.stars || 0);
  const forks = Number(repo.forks_count || repo.forks || 0);
  const archived = repo.archived === true;
  const license = repo.license ? true : false;
  const pushedAt = repo.pushed_at ? new Date(repo.pushed_at).getTime() : 0;
  const createdAt = repo.created_at ? new Date(repo.created_at).getTime() : Date.now();
  const ageMs = Date.now() - createdAt;
  const ageDays = ageMs / 86400000;
  const lastPushedDays = (Date.now() - pushedAt) / 86400000;

  // Recency: 1.0 if pushed in last 30 days, decays to 0 at 365 days
  const recency = Math.max(0, 1 - lastPushedDays / 365);

  // Velocity: stars per year (capped at 1.0)
  const velocity = ageDays > 0 ? Math.min(1, (stars / (ageDays / 365)) / 100) : 0;

  // Adoption: logarithmic scale of stars
  const adoption = Math.min(1, Math.log10(Math.max(1, stars)) / 5);

  // Risk: penalties for archived, low forks, no license
  let risk = 0;
  if (archived) risk += 0.3;
  if (forks === 0 && stars > 10) risk += 0.15;
  if (!license) risk += 0.1;
  risk = Math.min(1, risk);

  // Combined: weighted average, risk subtracts
  const score = Math.round(
    (recency * 0.3 + velocity * 0.25 + adoption * 0.3 - risk * 0.15) * 1000,
  ) / 1000;

  return {
    score: Math.max(0, Math.min(1, score)),
    breakdown: {
      recency: Math.round(recency * 1000) / 1000,
      velocity: Math.round(velocity * 1000) / 1000,
      adoption: Math.round(adoption * 1000) / 1000,
      risk: Math.round(risk * 1000) / 1000,
    },
  };
}

/**
 * Compute comprehensive ecosystem score for a repository.
 *
 * Combines feature completeness, health, and peer similarity into a final score.
 * Provides a recommendation: ADOPT (>0.75), FORK (0.3-0.75), BUILD (<0.3).
 *
 * @param {Object} repo - Repository object
 * @param {Object[]} peers - Array of peer repositories for comparison
 * @param {string} categoryId - Category identifier
 * @returns {Object} { score: 0-1, breakdown, recommendation }
 */
export function computeEcosystemScore(repo, peers, categoryId) {
  if (!repo || !categoryId) {
    return {
      score: 0,
      breakdown: {},
      recommendation: 'BUILD',
      explanation: 'Invalid inputs',
    };
  }

  let category = CATEGORIES[categoryId];

  // If not found, use universal
  if (!category) {
    if (categoryId === 'auto-detected') {
      category = CATEGORIES['universal'];
    } else {
      return {
        score: 0,
        breakdown: {},
        recommendation: 'BUILD',
        explanation: 'Category not found',
      };
    }
  }

  const weights = category.weights || { similarity: 0.35, features: 0.40, health: 0.25 };

  // Feature completeness
  const featureScore = computeFeatureCompleteness(repo, categoryId);

  // Health score
  const healthScore = computeHealthScore(repo);

  // Peer similarity (if peers provided)
  let similarityScore = 0.5; // Default neutral
  if (Array.isArray(peers) && peers.length > 0) {
    const repoDeps = repo.dependencies || {};
    const similarities = peers
      .map((peer) => computeDependencySimilarity(repoDeps, peer.dependencies || {}))
      .filter((s) => s > 0);

    if (similarities.length > 0) {
      similarityScore = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    }
  }

  // Combined score
  const score =
    featureScore.score * weights.features + healthScore.score * weights.health + similarityScore * weights.similarity;

  // Recommendation
  let recommendation = 'BUILD';
  if (score > 0.75) recommendation = 'ADOPT';
  else if (score > 0.3) recommendation = 'FORK';

  return {
    score: Math.round(score * 1000) / 1000,
    breakdown: {
      features: Math.round(featureScore.score * 1000) / 1000,
      health: Math.round(healthScore.score * 1000) / 1000,
      similarity: Math.round(similarityScore * 1000) / 1000,
      weights,
    },
    recommendation,
    reasoning: `Features: ${(featureScore.score * 100).toFixed(0)}%, Health: ${(healthScore.score * 100).toFixed(0)}%, Similarity: ${(similarityScore * 100).toFixed(0)}%`,
  };
}

/**
 * Run comprehensive ecosystem benchmark on target repo against peers.
 *
 * Auto-detects category, scores all repositories, generates rankings and narrative.
 *
 * @param {Object} targetRepo - Target repository to benchmark
 * @param {Object[]} peerRepos - Peer repositories for comparison
 * @param {Object} options - { minStars, maxRepos, focus }
 * @returns {Object} { rankings, narrative, targetProfile, category }
 */
export function benchmarkEcosystem(targetRepo, peerRepos = [], options = {}) {
  if (!targetRepo || typeof targetRepo !== 'object') {
    return {
      rankings: [],
      narrative: 'Invalid target repository',
      targetProfile: null,
      category: null,
      error: true,
    };
  }

  const minStars = options.minStars || 0;
  const maxRepos = options.maxRepos || 20;

  // Detect category
  const categoryDetection = detectCategory(targetRepo);
  if (!categoryDetection.categoryId) {
    return {
      rankings: [],
      narrative: 'Could not auto-detect repository category',
      targetProfile: null,
      category: null,
      error: true,
    };
  }

  const categoryId = categoryDetection.categoryId;
  const category = CATEGORIES[categoryId] || CATEGORIES['universal'];

  // Filter and score target repo
  const targetScore = computeEcosystemScore(targetRepo, peerRepos, categoryId);
  const targetFeatures = computeFeatureCompleteness(targetRepo, categoryId);
  const targetHealth = computeHealthScore(targetRepo);

  // Filter and score peers
  const stars = Number(targetRepo.stargazers_count || targetRepo.stars || 0);
  const filteredPeers = (peerRepos || [])
    .filter((p) => Number(p.stargazers_count || p.stars || 0) >= minStars)
    .slice(0, maxRepos);

  const rankedPeers = filteredPeers
    .map((peer) => {
      const peerScore = computeEcosystemScore(peer, [targetRepo], categoryId);
      const peerFeatures = computeFeatureCompleteness(peer, categoryId);
      const peerHealth = computeHealthScore(peer);

      return {
        name: peer.name || peer.full_name || 'Unknown',
        repo: peer,
        score: peerScore.score,
        features: peerFeatures.score,
        health: peerHealth.score,
        stars: Number(peer.stargazers_count || peer.stars || 0),
        recommendation: peerScore.recommendation,
      };
    })
    .sort((a, b) => b.score - a.score);

  const targetProfile = {
    name: targetRepo.name || targetRepo.full_name || 'Unknown',
    category: category.name,
    categoryId,
    score: targetScore.score,
    recommendation: targetScore.recommendation,
    features: targetFeatures.score,
    health: targetHealth.score,
    stars: stars,
  };

  // Generate narrative
  const topPeer = rankedPeers[0];
  const bottomPeer = rankedPeers[rankedPeers.length - 1];

  let narrative = `${targetProfile.name} (${category.name}): `;
  narrative += `Score ${(targetScore.score * 100).toFixed(0)}/100 → ${targetScore.recommendation}. `;
  narrative += `Features: ${(targetFeatures.score * 100).toFixed(0)}%, Health: ${(targetHealth.score * 100).toFixed(0)}%. `;

  if (topPeer) {
    const gap = ((targetScore.score - topPeer.score) * 100).toFixed(0);
    narrative += `vs. top peer (${topPeer.name}): ${gap > 0 ? '+' : ''}${gap}pp. `;
  }

  if (rankedPeers.length > 0) {
    narrative += `Ranked #${rankedPeers.findIndex((p) => p.name === targetProfile.name) + 1} of ${rankedPeers.length} peers.`;
  }

  return {
    rankings: rankedPeers,
    narrative,
    targetProfile,
    category: {
      id: categoryId,
      name: category.name,
      description: category.description,
    },
    detailedBreakdown: {
      target: {
        score: targetScore,
        features: targetFeatures,
        health: targetHealth,
      },
    },
  };
}

/**
 * Normalize a repository object to a standard schema.
 *
 * Handles variations in GitHub API responses, GitHub GraphQL, and local repo objects.
 *
 * @param {Object} repo - Raw repository object
 * @returns {Object} Normalized repo with standard fields
 */
export function normalizeRepository(repo) {
  if (!repo || typeof repo !== 'object') return null;

  return {
    // Identity
    name: repo.name || '',
    fullName: repo.full_name || `${repo.owner}/${repo.name}` || '',
    description: repo.description || '',
    url: repo.url || repo.html_url || '',

    // Metadata
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    license: repo.license || null,
    archived: repo.archived === true,
    language: repo.language || null,

    // Stats
    stars: Number(repo.stargazers_count || repo.stars || 0),
    forks: Number(repo.forks_count || repo.forks || 0),
    watchers: Number(repo.watchers_count || repo.watchers || 0),

    // Timestamps
    createdAt: repo.created_at || null,
    pushedAt: repo.pushed_at || null,
    updatedAt: repo.updated_at || null,

    // Dependencies (if available)
    dependencies: repo.dependencies || {},

    // README (if available)
    readme: repo.readme || null,

    // Raw object for direct access
    raw: repo,
  };
}

/**
 * Rank repositories by ecosystem score within a category.
 *
 * @param {Object[]} repos - Array of repository objects
 * @param {string} categoryId - Category identifier
 * @returns {Object[]} Ranked repos with scores and recommendations
 */
export function rankRepositoriesByEcosystemScore(repos, categoryId) {
  if (!Array.isArray(repos) || !categoryId) {
    return [];
  }

  // Verify category exists or use universal
  if (!CATEGORIES[categoryId] && categoryId !== 'auto-detected') {
    return [];
  }

  return repos
    .map((repo) => {
      const score = computeEcosystemScore(repo, repos, categoryId);
      const features = computeFeatureCompleteness(repo, categoryId);
      const health = computeHealthScore(repo);

      return {
        name: repo.name || repo.full_name || 'Unknown',
        score: score.score,
        recommendation: score.recommendation,
        features: features.score,
        health: health.score,
        stars: Number(repo.stargazers_count || repo.stars || 0),
        repo,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Generate a detailed comparison matrix between repositories.
 *
 * @param {Object[]} repos - Array of repositories to compare
 * @param {string} categoryId - Category identifier
 * @returns {Object} Comparison matrix with features and scores
 */
export function generateComparisonMatrix(repos, categoryId) {
  if (!Array.isArray(repos) || !categoryId) {
    return { error: true, message: 'Invalid inputs' };
  }

  // Verify category exists or use universal
  let category = CATEGORIES[categoryId];
  if (!category) {
    if (categoryId === 'auto-detected') {
      category = CATEGORIES['universal'];
    } else {
      return { error: true, message: 'Category not found' };
    }
  }

  const features = category.features || [];

  // Build matrix
  const matrix = {
    repos: repos.map((r) => ({
      name: r.name || r.full_name || 'Unknown',
      stars: Number(r.stargazers_count || r.stars || 0),
    })),
    features: features.map((f) => ({
      id: f.id,
      name: f.name,
      severity: f.severity,
    })),
    implementation: {},
  };

  // Populate implementation status
  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const repoName = repo.name || repo.full_name || `repo-${i}`;
    const features_result = computeFeatureCompleteness(repo, categoryId);

    matrix.implementation[repoName] = {};
    for (const feature of features) {
      const isDetected = features_result.features.some((f) => f.id === feature.id);
      matrix.implementation[repoName][feature.id] = isDetected;
    }
  }

  return matrix;
}

export default {
  CATEGORIES,
  UNIVERSAL_DEP_SIGNALS,
  detectCategory,
  computeFeatureCompleteness,
  computeDependencySimilarity,
  computeHealthScore,
  computeEcosystemScore,
  benchmarkEcosystem,
  normalizeRepository,
  rankRepositoriesByEcosystemScore,
  generateComparisonMatrix,
  inferCategoryFromDeps,
  getUniversalCapabilities,
};
