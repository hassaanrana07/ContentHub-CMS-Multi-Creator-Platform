const { Client, Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/contenthub_db';

async function seed() {
  const pool = new Pool({ connectionString: dbUrl });
  const client = await pool.connect();

  try {
    console.log('Running database schema creation...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await client.query(schemaSql);

    console.log('Seeding initial data...');
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    const creatorPasswordHash = await bcrypt.hash('Creator123!', 10);

    // 1. Super Admin User & Admin Public Profile (for main contenthub.com / site)
    const adminUserRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['ContentHub Platform', 'admin@contenthub.com', adminPasswordHash, 'ADMIN', 'ACTIVE']
    );
    const adminUserId = adminUserRes.rows[0].id;

    const adminProfileRes = await client.query(
      `INSERT INTO creator_profiles (user_id, username, display_name, bio, profile_image)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        adminUserId,
        'admin',
        'ContentHub Platform',
        'Official ContentHub Multi-Creator Platform — Build, publish, and manage creator websites.',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80'
      ]
    );
    const adminCreatorId = adminProfileRes.rows[0].id;

    // Admin Website Settings (for contenthub.com /)
    await client.query(
      `INSERT INTO website_settings (creator_id, site_title, site_description, primary_color, secondary_color, accent_color)
       VALUES ($1, $2, $3, '#171513', '#6B4F3A', '#A65F46')`,
      [adminCreatorId, 'ContentHub CMS — Multi-Creator Platform', 'The ultimate platform for creators to launch, publish, and control their public websites.']
    );

    // Admin Navigation Settings
    await client.query(
      `INSERT INTO navigation_settings (creator_id, footer_text, copyright_text, social_links)
       VALUES ($1, $2, $3, $4)`,
      [
        adminCreatorId,
        'ContentHub CMS empowers independent authors, developers, and designers to publish beautifully.',
        '© 2026 ContentHub Platform Inc. All rights reserved.',
        JSON.stringify({ twitter: 'https://twitter.com/contenthub', github: 'https://github.com/contenthub', linkedin: 'https://linkedin.com/company/contenthub' })
      ]
    );

    // Admin Contact Info
    await client.query(
      `INSERT INTO contact_information (creator_id, email, website)
       VALUES ($1, $2, $3)`,
      [adminCreatorId, 'support@contenthub.com', 'https://contenthub.com']
    );

    // Admin Homepage Sections
    const adminSections = [
      {
        section_type: 'hero',
        title: 'Empowering Independent Content Creators',
        subtitle: 'Multi-Creator CMS Platform',
        body: 'Launch your dedicated creator website in seconds. Customize your branding, publish articles, showcase capabilities, and own your audience.',
        image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
        button_text: 'Register as Content Creator',
        button_url: '/register',
        sort_order: 1
      },
      {
        section_type: 'about',
        title: 'Built for Modern Digital Authors',
        subtitle: 'Why ContentHub?',
        body: 'ContentHub provides reusable landing-page rendering engines, strict creator data isolation, dynamic CMS controls, and real-time branding customization.',
        image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
        button_text: 'Explore Platform Capabilities',
        button_url: '#capabilities',
        sort_order: 2
      },
      {
        section_type: 'cta',
        title: 'Start Building Your Creator Presence Today',
        subtitle: 'No Code Required',
        body: 'Join hundreds of architects, designers, engineers, and writers hosting their websites on ContentHub.',
        image_url: null,
        button_text: 'Register as Content Creator',
        button_url: '/register',
        sort_order: 3
      }
    ];

    for (const s of adminSections) {
      await client.query(
        `INSERT INTO homepage_sections (creator_id, section_type, title, subtitle, body, image_url, button_text, button_url, sort_order, is_visible)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
        [adminCreatorId, s.section_type, s.title, s.subtitle, s.body, s.image_url, s.button_text, s.button_url, s.sort_order]
      );
    }

    // Admin Capabilities
    const adminCapabilities = [
      { title: 'Automatic Site Generation', description: 'Every creator gets an instant public website upon registration.', icon: 'Zap' },
      { title: 'Dynamic CMS Builder', description: 'Reorder sections, toggle visibility, and update content in real-time.', icon: 'Layers' },
      { title: 'Strict Data Isolation', description: 'Role-based access control and backend tenant data isolation.', icon: 'ShieldCheck' },
      { title: 'Custom Branding', description: 'Full control over site colors, logos, titles, and typography.', icon: 'Palette' }
    ];
    for (let i = 0; i < adminCapabilities.length; i++) {
      const c = adminCapabilities[i];
      await client.query(
        `INSERT INTO capabilities (creator_id, title, description, icon, sort_order, is_visible)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [adminCreatorId, c.title, c.description, c.icon, i + 1]
      );
    }

    // Admin Testimonials
    const adminTestimonials = [
      { name: 'Hassan Ali', role: 'Full-Stack Developer', message: 'ContentHub allowed me to launch my personal portfolio and technical blog in under 5 minutes!', rating: 5 },
      { name: 'Sarah Jenkins', role: 'Design Director', message: 'The warm neutral editorial styling and CMS controls give my design studio an elevated look.', rating: 5 },
      { name: 'Ali Raza', role: 'DevOps Lead', message: 'The dataset isolation and REST API design are robust and lightning fast.', rating: 5 }
    ];
    for (const t of adminTestimonials) {
      await client.query(
        `INSERT INTO testimonials (creator_id, name, role, message, rating, is_visible)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [adminCreatorId, t.name, t.role, t.message, t.rating]
      );
    }

    // Admin FAQs
    const adminFaqs = [
      { question: 'What is ContentHub CMS?', answer: 'ContentHub CMS is a multi-creator content management system providing shared website engines with database-driven creator isolation.', sort_order: 1 },
      { question: 'How do creator public URLs work?', answer: 'When you register with username "hassan", your website becomes contenthub.com/hassan automatically.', sort_order: 2 },
      { question: 'Can I customize my colors and sections?', answer: 'Yes! You have full control over homepage sections, capabilities, articles, testimonials, and color palettes from your private dashboard.', sort_order: 3 }
    ];
    for (const f of adminFaqs) {
      await client.query(
        `INSERT INTO faqs (creator_id, question, answer, sort_order, is_visible)
         VALUES ($1, $2, $3, $4, true)`,
        [adminCreatorId, f.question, f.answer, f.sort_order]
      );
    }

    // Admin Category & Posts
    const adminCatRes = await client.query(
      `INSERT INTO categories (creator_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
      [adminCreatorId, 'Platform News', 'Official ContentHub updates and announcements.']
    );
    const adminCatId = adminCatRes.rows[0].id;

    const adminPosts = [
      { title: 'Welcome to ContentHub CMS v1.0', slug: 'welcome-to-contenthub-cms', summary: 'Announcing the launch of ContentHub Multi-Creator Platform.', content: 'Today we are thrilled to launch ContentHub CMS, designed for creators...', status: 'PUBLISHED' },
      { title: 'Mastering Content Isolation & Security', slug: 'mastering-content-isolation-security', summary: 'How ContentHub protects creator data across shared rendering engines.', content: 'Security is at the heart of multi-creator platforms...', status: 'PUBLISHED' },
      { title: 'Designing for Warm Neutral Aesthetics', slug: 'designing-for-warm-neutral-aesthetics', summary: 'Why we selected Charcoal, Terracotta, and Muted Gold for ContentHub.', content: 'Aesthetic harmony builds trust and readability...', status: 'PUBLISHED' },
      { title: 'Future Roadmap: API Extensions', slug: 'future-roadmap-api-extensions', summary: 'What is next for ContentHub developers.', content: 'Upcoming features include webhook integrations...', status: 'PUBLISHED' }
    ];
    for (const p of adminPosts) {
      await client.query(
        `INSERT INTO posts (creator_id, category_id, title, slug, summary, content, featured_image, status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [adminCreatorId, adminCatId, p.title, p.slug, p.summary, p.content, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', p.status]
      );
    }

    // Admin Media
    await client.query(
      `INSERT INTO media (creator_id, url, title, alt_text, media_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminCreatorId, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', 'ContentHub Banner', 'Platform hero image', 'image']
    );

    // Admin Contact Messages (Messages submitted on main contenthub.com / site)
    await client.query(
      `INSERT INTO contact_messages (creator_id, name, email, subject, message, is_read)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminCreatorId, 'Enterprise Partner', 'partner@enterprise.com', 'Platform Licensing Inquiry', 'We would like to discuss hosting 500 creators on ContentHub.', false]
    );

    // 2. Demo Creators (hassan, sarah, ali, ahmed)
    const creatorsData = [
      {
        name: 'Hassan Ali',
        username: 'hassan',
        email: 'hassan@example.com',
        bio: 'Senior Full-Stack Architect & Tech Educator building modern web experiences.',
        profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        site_title: 'Hassan Ali — Software Architecture',
        site_description: 'Official portfolio and technical articles by Hassan Ali.',
        primary_color: '#24211E',
        secondary_color: '#6B4F3A',
        accent_color: '#A65F46',
        hero_title: 'Hassan Ali — Full-Stack Developer',
        hero_sub: 'Full-Stack Developer & Content Creator',
        hero_body: 'I design and build resilient web applications, modern REST APIs, and scalable content platforms.',
        hero_img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
        hero_btn: 'Explore Articles',
        hero_url: '#articles',
        capabilities: [
          { title: 'Web Development', description: 'Building fast React frontends and Node.js REST APIs.', icon: 'Code' },
          { title: 'Software Architecture', description: 'Designing database schemas and multi-tenant systems.', icon: 'Cpu' },
          { title: 'Technical Writing', description: 'Publishing deep-dive technical articles and documentation.', icon: 'BookOpen' },
          { title: 'System Optimization', description: 'Query tuning, caching, and performance profiling.', icon: 'Zap' }
        ],
        articles: [
          { title: 'Building Scalable Multi-Tenant Platforms', slug: 'building-scalable-multi-tenant-platforms', summary: 'A deep dive into multi-creator data isolation and architecture.', content: 'Multi-tenant systems require strict separation of concerns at both database and application API layers...', status: 'PUBLISHED' },
          { title: 'Mastering Modern PostgreSQL Schemas', slug: 'mastering-modern-postgresql-schemas', summary: 'Best practices for foreign keys, constraints, and indexes.', content: 'Database schema design dictates application performance. Here is how we design schemas for speed and safety...', status: 'PUBLISHED' },
          { title: 'The Future of Content Management Systems', slug: 'future-of-content-management-systems', summary: 'Why headless and structured CMS platforms are taking over.', content: 'Traditional monolith CMS platforms are giving way to API-first and decoupled content rendering engines...', status: 'PUBLISHED' },
          { title: 'Zero Downtime Database Migrations', slug: 'zero-downtime-database-migrations', summary: 'Altering large tables safely without locking production transactions.', content: 'Altering high-traffic tables requires non-blocking query strategies and index builds...', status: 'PUBLISHED' },
          { title: 'Drafting Resilient API Contracts', slug: 'drafting-resilient-api-contracts', summary: 'Designing REST endpoints that evolve safely over time.', content: 'API contracts must handle backward compatibility gracefully...', status: 'DRAFT' }
        ]
      },
      {
        name: 'Sarah Jenkins',
        username: 'sarah',
        email: 'sarah@example.com',
        bio: 'Product Designer & Creative Strategist crafting elegant brand identity systems.',
        profile_image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        site_title: 'Sarah Jenkins Design Studio',
        site_description: 'Minimalist product design and brand strategy.',
        primary_color: '#171513',
        secondary_color: '#B08A57',
        accent_color: '#A65F46',
        hero_title: 'Sarah Jenkins Studio',
        hero_sub: 'UI/UX & Editorial Brand Strategy',
        hero_body: 'Crafting thoughtful digital products with strong visual harmony, warm color palettes, and typographic precision.',
        hero_img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
        hero_btn: 'View Work',
        hero_url: '#about',
        capabilities: [
          { title: 'UI/UX Product Design', description: 'Crafting responsive user interfaces with high visual polish.', icon: 'Figma' },
          { title: 'Brand Identity Strategy', description: 'Defining typography, color tokens, and design systems.', icon: 'Palette' }
        ],
        articles: [
          { title: 'The Psychology of Warm Neutral UI Palettes', slug: 'psychology-of-warm-neutral-ui-palettes', summary: 'Moving away from generic blue SaaS styles to editorial warmth.', content: 'Warm neutral tones invoke trust, warmth, and craftsmanship...', status: 'PUBLISHED' },
          { title: 'Design Systems for Rapid Scaling', slug: 'design-systems-for-rapid-scaling', summary: 'How tokenized components accelerate product delivery.', content: 'A structured design system acts as the single source of truth...', status: 'PUBLISHED' }
        ]
      },
      {
        name: 'Ali Raza',
        username: 'ali',
        email: 'ali@example.com',
        bio: 'DevOps & Cloud Engineer specializing in AWS RDS, PostgreSQL, and Kubernetes.',
        profile_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        site_title: 'Ali Raza — Cloud Infrastructure',
        site_description: 'DevOps, database optimization, and high availability systems.',
        primary_color: '#292522',
        secondary_color: '#6B4F3A',
        accent_color: '#B08A57',
        hero_title: 'Ali Raza Infrastructure',
        hero_sub: 'Cloud Systems & Database Architect',
        hero_body: 'Automating deployments, securing cloud databases, and maintaining 99.99% uptime for global applications.',
        hero_img: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
        hero_btn: 'Read Articles',
        hero_url: '#articles',
        capabilities: [
          { title: 'AWS Cloud Infrastructure', description: 'Terraform, RDS, EC2, and S3 deployment pipelines.', icon: 'Server' }
        ],
        articles: [
          { title: 'High Availability PostgreSQL Architecture', slug: 'high-availability-postgresql-architecture', summary: 'Setting up replica nodes and automated failover.', content: 'High availability ensures continuous service operations...', status: 'PUBLISHED' }
        ]
      },
      {
        name: 'Ahmed Khan',
        username: 'ahmed',
        email: 'ahmed@example.com',
        bio: 'Tech Journalist and Podcaster covering artificial intelligence and software craft.',
        profile_image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
        site_title: 'Ahmed Khan — Tech Stories',
        site_description: 'In-depth tech reporting and creator insights.',
        primary_color: '#24211E',
        secondary_color: '#A65F46',
        accent_color: '#B08A57',
        hero_title: 'Ahmed Khan Stories',
        hero_sub: 'Journalism & Creator Economy',
        hero_body: 'Unpacking the intersection of software, creator economy tools, and future technology.',
        hero_img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80',
        hero_btn: 'Read Stories',
        hero_url: '#articles',
        capabilities: [
          { title: 'Tech Journalism', description: 'Reporting on AI developments and creator economy tools.', icon: 'Feather' }
        ],
        articles: [
          { title: 'The Next Era of Independent Publishing', slug: 'the-next-era-of-independent-publishing', summary: 'Empowering creators with owned distribution platforms.', content: 'Relying on centralized platforms puts creators at risk...', status: 'PUBLISHED' }
        ]
      }
    ];

    for (const cData of creatorsData) {
      // Create user
      const userRes = await client.query(
        `INSERT INTO users (name, email, password_hash, role, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [cData.name, cData.email, creatorPasswordHash, 'CREATOR', 'ACTIVE']
      );
      const userId = userRes.rows[0].id;

      // Create creator profile
      const profRes = await client.query(
        `INSERT INTO creator_profiles (user_id, username, display_name, bio, profile_image)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [userId, cData.username, cData.name, cData.bio, cData.profile_image]
      );
      const creatorId = profRes.rows[0].id;

      // Create website settings
      await client.query(
        `INSERT INTO website_settings (creator_id, site_title, site_description, primary_color, secondary_color, accent_color)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [creatorId, cData.site_title, cData.site_description, cData.primary_color, cData.secondary_color, cData.accent_color]
      );

      // Create navigation settings
      await client.query(
        `INSERT INTO navigation_settings (creator_id, footer_text, copyright_text, social_links)
         VALUES ($1, $2, $3, $4)`,
        [creatorId, `Official website of ${cData.name}. Powered by ContentHub CMS.`, `© 2026 ${cData.name}. All rights reserved.`, JSON.stringify({ github: `https://github.com/${cData.username}` })]
      );

      // Create contact info
      await client.query(
        `INSERT INTO contact_information (creator_id, email, phone, address, website, github, linkedin)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [creatorId, cData.email, '+1 (555) 234-5678', 'San Francisco, CA', `https://contenthub.com/${cData.username}`, `https://github.com/${cData.username}`, `https://linkedin.com/in/${cData.username}`]
      );

      // Create default homepage sections
      const defaultSections = [
        {
          section_type: 'hero',
          title: cData.hero_title,
          subtitle: cData.hero_sub,
          body: cData.hero_body,
          image_url: cData.hero_img,
          button_text: cData.hero_btn,
          button_url: cData.hero_url,
          sort_order: 1,
          is_visible: true
        },
        {
          section_type: 'about',
          title: `About ${cData.name}`,
          subtitle: 'Background & Focus',
          body: cData.bio + ' Dedicated to crafting exceptional digital experiences and sharing knowledge with the global community.',
          image_url: cData.profile_image,
          button_text: 'Get in Touch',
          button_url: '#contact',
          sort_order: 2,
          is_visible: true
        },
        {
          section_type: 'cta',
          title: 'Ready to Collaborate?',
          subtitle: 'Let us build something remarkable together.',
          body: 'Feel free to reach out via the contact form or connect on social channels.',
          image_url: null,
          button_text: 'Send Message',
          button_url: '#contact',
          sort_order: 3,
          is_visible: true
        }
      ];

      for (const s of defaultSections) {
        await client.query(
          `INSERT INTO homepage_sections (creator_id, section_type, title, subtitle, body, image_url, button_text, button_url, sort_order, is_visible)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [creatorId, s.section_type, s.title, s.subtitle, s.body, s.image_url, s.button_text, s.button_url, s.sort_order, s.is_visible]
        );
      }

      // Create Capabilities
      if (cData.capabilities) {
        for (let idx = 0; idx < cData.capabilities.length; idx++) {
          const cap = cData.capabilities[idx];
          await client.query(
            `INSERT INTO capabilities (creator_id, title, description, icon, sort_order, is_visible)
             VALUES ($1, $2, $3, $4, $5, true)`,
            [creatorId, cap.title, cap.description, cap.icon || 'Sparkles', idx + 1]
          );
        }
      }

      // Create Category
      const catRes = await client.query(
        `INSERT INTO categories (creator_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
        [creatorId, 'General Tech', 'Articles related to software engineering and design.']
      );
      const categoryId = catRes.rows[0].id;

      // Create Articles
      for (const a of cData.articles) {
        await client.query(
          `INSERT INTO posts (creator_id, category_id, title, slug, summary, content, featured_image, status, published_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [creatorId, categoryId, a.title, a.slug, a.summary, a.content, cData.hero_img, a.status, a.status === 'PUBLISHED' ? new Date() : null]
        );
      }

      // Create Testimonial
      await client.query(
        `INSERT INTO testimonials (creator_id, name, role, message, avatar_url, rating, is_visible)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [creatorId, 'Marcus Vance', 'VP of Product', `Working with ${cData.name} transformed our project quality. Highly professional execution.`, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80', 5, true]
      );

      // Create FAQ
      await client.query(
        `INSERT INTO faqs (creator_id, question, answer, sort_order, is_visible)
         VALUES ($1, $2, $3, $4, $5)`,
        [creatorId, 'What services do you provide?', 'I offer full-stack software development, architectural consulting, and technical writing.', 1, true]
      );

      // Create Media item
      await client.query(
        `INSERT INTO media (creator_id, url, title, alt_text, media_type)
         VALUES ($1, $2, $3, $4, $5)`,
        [creatorId, cData.hero_img, 'Hero Banner Image', 'Banner photo showing workspace setup', 'image']
      );

      // Create Contact Message
      await client.query(
        `INSERT INTO contact_messages (creator_id, name, email, subject, message, is_read)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [creatorId, 'David Miller', 'david@company.io', 'Project Inquiry', `Hi ${cData.name}, we would love to discuss a potential project partnership.`, false]
      );
    }

    // Seed Activity Logs
    const initialLogs = [
      { actor: 'ContentHub Platform', action: 'System Seeding Completed', target: 'Schema & Seeding Engine' },
      { actor: 'Hassan Ali', action: 'Published Article', target: 'Building Scalable Multi-Tenant Platforms' },
      { actor: 'Sarah Jenkins', action: 'Updated Site Branding', target: 'Sarah Jenkins Studio' },
      { actor: 'Ali Raza', action: 'Added Infrastructure Capability', target: 'AWS Cloud Infrastructure' }
    ];
    for (const log of initialLogs) {
      await client.query(
        `INSERT INTO activity_logs (user_id, actor_name, action, target_info)
         VALUES ($1, $2, $3, $4)`,
        [adminUserId, log.actor, log.action, log.target]
      );
    }

    console.log('Database seeded successfully!');
    console.log('----------------------------------------------------');
    console.log('Super Admin Login: admin@contenthub.com / Admin123!');
    console.log('Demo Creator Logins: hassan, sarah, ali, ahmed / Creator123!');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
