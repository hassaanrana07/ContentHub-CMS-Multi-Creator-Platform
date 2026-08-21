-- ContentHub CMS PostgreSQL Schema

DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS navigation_settings CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS contact_information CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS faqs CASCADE;
DROP TABLE IF EXISTS testimonials CASCADE;
DROP TABLE IF EXISTS capabilities CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS homepage_sections CASCADE;
DROP TABLE IF EXISTS website_settings CASCADE;
DROP TABLE IF EXISTS creator_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'CREATOR', -- 'ADMIN', 'CREATOR'
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Creator Profiles Table (Includes Admin profile for main / site)
CREATE TABLE creator_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  bio TEXT,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Website Settings Table (Includes Colors & Typography System)
CREATE TABLE website_settings (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER UNIQUE NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  site_title VARCHAR(255) NOT NULL DEFAULT 'My ContentHub Site',
  site_description TEXT DEFAULT 'Welcome to my official website.',
  logo_url TEXT,
  favicon_url TEXT,
  primary_color VARCHAR(50) DEFAULT '#24211E',
  secondary_color VARCHAR(50) DEFAULT '#6B4F3A',
  accent_color VARCHAR(50) DEFAULT '#A65F46',
  bg_color VARCHAR(50) DEFAULT '#F5F1EA',
  surface_color VARCHAR(50) DEFAULT '#FFFFFF',
  text_color VARCHAR(50) DEFAULT '#171513',
  muted_color VARCHAR(50) DEFAULT '#756D65',
  font_family VARCHAR(100) DEFAULT 'Inter',
  base_font_size VARCHAR(20) DEFAULT '16px',
  heading_scale VARCHAR(20) DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Navigation & Footer Settings Table
CREATE TABLE navigation_settings (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER UNIQUE NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  footer_text TEXT DEFAULT 'Powered by ContentHub CMS Multi-Creator Platform',
  copyright_text VARCHAR(255) DEFAULT 'All rights reserved.',
  social_links JSONB DEFAULT '{"twitter": "", "github": "", "linkedin": "", "facebook": ""}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Homepage Sections Table
CREATE TABLE homepage_sections (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL, -- hero, about, capabilities, services, features, testimonials, faq, cta, gallery, contact, custom
  title VARCHAR(255),
  subtitle VARCHAR(255),
  body TEXT,
  image_url TEXT,
  button_text VARCHAR(100),
  button_url VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Capabilities Table
CREATE TABLE capabilities (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100) DEFAULT 'Sparkles',
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER REFERENCES creator_profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Articles / Posts Table
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  summary TEXT,
  content TEXT,
  featured_image TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'PUBLISHED'
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_creator_slug UNIQUE (creator_id, slug)
);

-- Testimonials Table
CREATE TABLE testimonials (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  message TEXT NOT NULL,
  avatar_url TEXT,
  rating INTEGER DEFAULT 5,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- FAQs Table
CREATE TABLE faqs (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Media Management Table
CREATE TABLE media (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title VARCHAR(255),
  alt_text TEXT,
  media_type VARCHAR(50) DEFAULT 'image',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contact Information Table
CREATE TABLE contact_information (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER UNIQUE NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  email VARCHAR(255),
  phone VARCHAR(100),
  address TEXT,
  website VARCHAR(255),
  linkedin VARCHAR(255),
  github VARCHAR(255),
  facebook VARCHAR(255),
  instagram VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contact Messages Table
CREATE TABLE contact_messages (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Platform Activity Logs Table
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  target_info VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Database Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_creator_profiles_username ON creator_profiles(username);
CREATE INDEX idx_homepage_sections_creator ON homepage_sections(creator_id, sort_order);
CREATE INDEX idx_capabilities_creator ON capabilities(creator_id, sort_order);
CREATE INDEX idx_posts_creator ON posts(creator_id, status);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_testimonials_creator ON testimonials(creator_id);
CREATE INDEX idx_faqs_creator ON faqs(creator_id, sort_order);
CREATE INDEX idx_media_creator ON media(creator_id);
CREATE INDEX idx_contact_messages_creator ON contact_messages(creator_id, is_read);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
