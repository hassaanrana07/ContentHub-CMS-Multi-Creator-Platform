import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Star,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Send,
  AlertCircle,
  CheckCircle2,
  Menu,
  X,
  Code,
  BookOpen,
  Palette as PaletteIcon,
  Layers,
  Cpu,
  Globe
} from 'lucide-react';

export const PublicCreatorSite = () => {
  const params = useParams();
  const username = params.username || 'admin';
  const isMainAdminSite = username === 'admin';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Testimonials Carousel State
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [isTestimonialPaused, setIsTestimonialPaused] = useState(false);

  // Capabilities Slider State
  const [capabilityIndex, setCapabilityIndex] = useState(0);
  const [isCapPaused, setIsCapPaused] = useState(false);

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactSending, setContactSending] = useState(false);
  const [contactSuccess, setContactSuccess] = useState('');
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    fetchPublicData();
  }, [username]);

  // Auto-scroll Testimonials Carousel (every 4 seconds)
  useEffect(() => {
    if (!data?.testimonials?.length || isTestimonialPaused) return;
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % data.testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [data?.testimonials, isTestimonialPaused]);

  // Auto-scroll Capabilities Slider (every 4 seconds)
  useEffect(() => {
    if (!data?.capabilities?.length || isCapPaused) return;
    const interval = setInterval(() => {
      setCapabilityIndex((prev) => (prev + 1) % data.capabilities.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [data?.capabilities, isCapPaused]);

  const fetchPublicData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`/api/public/site/${username}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Website unavailable or suspended.');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactSending(true);
    setContactSuccess('');
    setContactError('');

    try {
      const res = await axios.post(`/api/public/site/${username}/contact`, contactForm);
      setContactSuccess(res.data.message || 'Message sent successfully!');
      setContactForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setContactError(err.response?.data?.error || 'Failed to send message.');
    } finally {
      setContactSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-warm-terracotta border-t-transparent animate-spin mx-auto" />
          <p className="font-serif font-semibold text-warm-charcoal">Loading Website...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-warm-surface border border-warm-border rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-warm-terracotta/10 text-warm-terracotta flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-warm-charcoal">Website Unavailable</h2>
          <p className="text-sm text-warm-muted leading-relaxed">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-warm-charcoal text-white text-xs font-semibold rounded-lg shadow-md hover:bg-warm-black transition-colors"
          >
            <span>Return to ContentHub</span>
          </Link>
        </div>
      </div>
    );
  }

  const { creator, settings, navigation, sections, capabilities, recent_posts, published_posts_count, testimonials, faqs } = data;

  // Dynamic Theme Colors & Typography Tokens
  const primaryColor = settings?.primary_color || '#24211E';
  const secondaryColor = settings?.secondary_color || '#6B4F3A';
  const accentColor = settings?.accent_color || '#A65F46';
  const bgColor = settings?.bg_color || '#F5F1EA';
  const surfaceColor = settings?.surface_color || '#FFFFFF';
  const textColor = settings?.text_color || '#171513';
  const fontFamily = settings?.font_family || 'Inter';
  const baseFontSize = settings?.base_font_size || '16px';

  const siteHomeUrl = isMainAdminSite ? '/' : `/${username}`;
  const articlesUrl = isMainAdminSite ? '/articles' : `/${username}/articles`;

  const brandDisplayName = settings?.site_title || creator?.display_name || creator?.username;

  // Slider Handlers
  const prevTestimonial = () => {
    if (!testimonials?.length) return;
    setTestimonialIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const nextTestimonial = () => {
    if (!testimonials?.length) return;
    setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevCapability = () => {
    if (!capabilities?.length) return;
    setCapabilityIndex((prev) => (prev === 0 ? capabilities.length - 1 : prev - 1));
  };

  const nextCapability = () => {
    if (!capabilities?.length) return;
    setCapabilityIndex((prev) => (prev + 1) % capabilities.length);
  };

  return (
    <div
      className="min-h-screen font-sans antialiased transition-colors"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        fontFamily: fontFamily,
        fontSize: baseFontSize
      }}
    >
      {/* 1. PUBLIC NAVBAR */}
      <nav className="sticky top-0 z-40 bg-warm-surface/95 backdrop-blur-md border-b border-warm-border px-6 py-4 shadow-xs" style={{ backgroundColor: surfaceColor }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to={siteHomeUrl} className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={brandDisplayName} className="h-9 w-auto object-contain" />
            ) : (
              <div
                className="w-9 h-9 rounded-lg text-white font-serif font-bold text-lg flex items-center justify-center shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {brandDisplayName[0] || 'C'}
              </div>
            )}
            <div>
              <span className="font-serif font-bold text-lg tracking-tight block leading-tight" style={{ color: primaryColor }}>
                {brandDisplayName}
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <a href="#about" className="hover:opacity-80 transition-opacity">About</a>
            {capabilities?.length > 0 && <a href="#capabilities" className="hover:opacity-80 transition-opacity">Capabilities</a>}
            {recent_posts?.length > 0 && <a href="#articles" className="hover:opacity-80 transition-opacity">Articles</a>}
            {testimonials?.length > 0 && <a href="#testimonials" className="hover:opacity-80 transition-opacity">Testimonials</a>}
            {faqs?.length > 0 && <a href="#faqs" className="hover:opacity-80 transition-opacity">FAQ</a>}
            <a href="#contact" className="hover:opacity-80 transition-opacity">Contact</a>

            {/* ONLY Main Platform Site (contenthub.com /) shows Register + Login */}
            {isMainAdminSite && (
              <>
                <div className="h-4 w-px bg-warm-border" />
                <Link
                  to="/register"
                  className="px-3.5 py-2 rounded-lg text-white text-xs font-semibold shadow-sm transition-all hover:opacity-90"
                  style={{ backgroundColor: accentColor }}
                >
                  Register as Content Creator
                </Link>

                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-lg bg-warm-bg border border-warm-border text-xs font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: primaryColor }}
                >
                  Login
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="lg:hidden p-2 text-warm-muted hover:text-warm-charcoal"
          >
            {mobileNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="lg:hidden border-t border-warm-border mt-3 pt-3 space-y-3 px-2 pb-3">
            <a href="#about" onClick={() => setMobileNavOpen(false)} className="block py-1 text-sm font-medium">About</a>
            {capabilities?.length > 0 && <a href="#capabilities" onClick={() => setMobileNavOpen(false)} className="block py-1 text-sm font-medium">Capabilities</a>}
            {recent_posts?.length > 0 && <a href="#articles" onClick={() => setMobileNavOpen(false)} className="block py-1 text-sm font-medium">Articles</a>}
            {testimonials?.length > 0 && <a href="#testimonials" onClick={() => setMobileNavOpen(false)} className="block py-1 text-sm font-medium">Testimonials</a>}
            {faqs?.length > 0 && <a href="#faqs" onClick={() => setMobileNavOpen(false)} className="block py-1 text-sm font-medium">FAQ</a>}
            <a href="#contact" onClick={() => setMobileNavOpen(false)} className="block py-1 text-sm font-medium">Contact</a>
            {isMainAdminSite && (
              <div className="pt-2 border-t border-warm-border flex flex-col gap-2">
                <Link to="/register" className="w-full text-center py-2 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: accentColor }}>
                  Register as Content Creator
                </Link>
                <Link to="/login" className="w-full text-center py-2 rounded-lg bg-warm-bg border border-warm-border text-xs font-semibold">
                  Login
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* 2. DYNAMIC HOMEPAGE SECTIONS */}
      <main className="space-y-16 py-6">
        {sections && sections.map((sec) => {
          switch (sec.section_type) {
            case 'hero':
              return (
                <section key={sec.id} className="max-w-6xl mx-auto px-6 py-12 md:py-20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                      {sec.subtitle && (
                        <span
                          className="inline-block px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-white shadow-xs"
                          style={{ backgroundColor: secondaryColor }}
                        >
                          {sec.subtitle}
                        </span>
                      )}
                      <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-tight" style={{ color: primaryColor }}>
                        {sec.title}
                      </h1>
                      {sec.body && (
                        <p className="text-base md:text-lg opacity-85 leading-relaxed font-sans">
                          {sec.body}
                        </p>
                      )}
                      {sec.button_text && (
                        <div>
                          <a
                            href={sec.button_url || '#contact'}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold shadow-md transition-all hover:scale-105"
                            style={{ backgroundColor: accentColor }}
                          >
                            <span>{sec.button_text}</span>
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                    </div>

                    {sec.image_url && (
                      <div className="relative">
                        <img
                          src={sec.image_url}
                          alt={sec.title}
                          className="w-full h-[400px] object-cover rounded-2xl shadow-xl border border-warm-border"
                        />
                      </div>
                    )}
                  </div>
                </section>
              );

            case 'about':
              return (
                <section id="about" key={sec.id} className="border-y border-warm-border py-16" style={{ backgroundColor: surfaceColor }}>
                  <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    {sec.image_url && (
                      <img
                        src={sec.image_url}
                        alt={sec.title}
                        className="w-full h-80 md:h-[420px] object-cover rounded-2xl border border-warm-border shadow-md"
                      />
                    )}
                    <div className="space-y-4">
                      {sec.subtitle && (
                        <span className="text-xs font-mono font-bold uppercase tracking-wider opacity-75">
                          {sec.subtitle}
                        </span>
                      )}
                      <h2 className="text-3xl md:text-4xl font-serif font-bold" style={{ color: primaryColor }}>{sec.title}</h2>
                      <p className="text-base opacity-85 leading-relaxed whitespace-pre-line">{sec.body}</p>
                      {sec.button_text && (
                        <a
                          href={sec.button_url || '#contact'}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <span>{sec.button_text}</span>
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </section>
              );

            case 'cta':
              return (
                <section key={sec.id} className="max-w-6xl mx-auto px-6 py-8">
                  <div
                    className="p-10 md:p-14 rounded-3xl text-white text-center space-y-6 shadow-xl"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {sec.subtitle && (
                      <span className="text-xs font-mono uppercase tracking-widest opacity-80 font-bold">{sec.subtitle}</span>
                    )}
                    <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">{sec.title}</h2>
                    {sec.body && <p className="text-sm md:text-base opacity-90 max-w-xl mx-auto">{sec.body}</p>}
                    {sec.button_text && (
                      <div>
                        <a
                          href={sec.button_url || '#contact'}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-md hover:opacity-90 transition-all"
                          style={{ backgroundColor: surfaceColor, color: primaryColor }}
                        >
                          <span>{sec.button_text}</span>
                          <ArrowRight className="w-4 h-4" style={{ color: accentColor }} />
                        </a>
                      </div>
                    )}
                  </div>
                </section>
              );

            default:
              return (
                <section key={sec.id} className="max-w-6xl mx-auto px-6 py-8">
                  <div className="p-8 border border-warm-border rounded-2xl space-y-4 shadow-sm" style={{ backgroundColor: surfaceColor }}>
                    {sec.subtitle && <span className="text-xs font-mono uppercase tracking-wider font-bold opacity-75">{sec.subtitle}</span>}
                    <h2 className="text-2xl font-serif font-bold" style={{ color: primaryColor }}>{sec.title}</h2>
                    {sec.body && <p className="text-sm opacity-85 leading-relaxed whitespace-pre-line">{sec.body}</p>}
                  </div>
                </section>
              );
          }
        })}

        {/* 3. CAPABILITIES HORIZONTAL SLIDER / CAROUSEL */}
        {capabilities?.length > 0 && (
          <section id="capabilities" className="max-w-6xl mx-auto px-6 py-12 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider opacity-75">Services & Offerings</span>
              <h2 className="text-3xl font-serif font-bold" style={{ color: primaryColor }}>Core Capabilities</h2>
              <p className="text-sm opacity-80">Interactive, database-driven capability & service slider.</p>
            </div>

            {/* Slider Window Container */}
            <div
              className="relative border border-warm-border rounded-3xl p-6 md:p-10 shadow-sm transition-all overflow-hidden"
              style={{ backgroundColor: surfaceColor }}
              onMouseEnter={() => setIsCapPaused(true)}
              onMouseLeave={() => setIsCapPaused(false)}
            >
              {capabilities[capabilityIndex] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
                  <div className="space-y-4">
                    <div
                      className="w-12 h-12 rounded-2xl text-white font-serif font-bold text-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border border-warm-border" style={{ backgroundColor: bgColor }}>
                      Capability #{capabilityIndex + 1} of {capabilities.length}
                    </span>
                    <h3 className="font-serif font-bold text-2xl md:text-3xl" style={{ color: primaryColor }}>
                      {capabilities[capabilityIndex].title}
                    </h3>
                    <p className="text-sm md:text-base opacity-85 leading-relaxed">
                      {capabilities[capabilityIndex].description || 'Professional capability provided by this creator profile.'}
                    </p>
                  </div>

                  {capabilities[capabilityIndex].image_url ? (
                    <img
                      src={capabilities[capabilityIndex].image_url}
                      alt={capabilities[capabilityIndex].title}
                      className="w-full h-56 md:h-64 object-cover rounded-2xl border border-warm-border shadow-md"
                    />
                  ) : (
                    <div
                      className="w-full h-56 md:h-64 rounded-2xl border border-warm-border flex items-center justify-center p-6 text-center space-y-2"
                      style={{ backgroundColor: bgColor }}
                    >
                      <div className="space-y-2">
                        <Cpu className="w-10 h-10 mx-auto opacity-40" />
                        <h4 className="font-serif font-bold text-lg">{capabilities[capabilityIndex].title}</h4>
                        <p className="text-xs opacity-75">Verified Professional Offering</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Capabilities Slider Navigation Controls */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-warm-border/40">
                <button
                  onClick={prevCapability}
                  className="p-2.5 rounded-full border border-warm-border hover:opacity-80 transition-opacity shadow-sm"
                  style={{ backgroundColor: bgColor }}
                  title="Previous Capability"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  {capabilities.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCapabilityIndex(idx)}
                      className={`h-2.5 rounded-full transition-all ${
                        idx === capabilityIndex ? 'w-8' : 'w-2.5 opacity-40'
                      }`}
                      style={{ backgroundColor: idx === capabilityIndex ? accentColor : textColor }}
                    />
                  ))}
                </div>

                <button
                  onClick={nextCapability}
                  className="p-2.5 rounded-full border border-warm-border hover:opacity-80 transition-opacity shadow-sm"
                  style={{ backgroundColor: bgColor }}
                  title="Next Capability"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 4. ARTICLES SECTION (MAX 3 ON HOMEPAGE) */}
        {recent_posts?.length > 0 && (
          <section id="articles" className="max-w-6xl mx-auto px-6 py-12 space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-warm-border pb-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider opacity-75">Publications</span>
                <h2 className="text-3xl font-serif font-bold" style={{ color: primaryColor }}>Latest Articles</h2>
              </div>

              {published_posts_count > 3 && (
                <Link
                  to={articlesUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-warm-border hover:opacity-80 text-xs font-semibold shadow-sm transition-colors"
                  style={{ backgroundColor: surfaceColor }}
                >
                  <span>View All Articles ({published_posts_count})</span>
                  <ArrowRight className="w-4 h-4" style={{ color: accentColor }} />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recent_posts.map((post) => {
                const articleDetailUrl = isMainAdminSite ? `/articles/${post.slug}` : `/${username}/articles/${post.slug}`;
                return (
                  <article key={post.id} className="border border-warm-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between" style={{ backgroundColor: surfaceColor }}>
                    <div className="space-y-4 p-6">
                      {post.featured_image && (
                        <img src={post.featured_image} alt={post.title} className="w-full h-44 object-cover rounded-xl border border-warm-border" />
                      )}
                      <div className="space-y-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-warm-border" style={{ backgroundColor: bgColor }}>
                          {post.category_name || 'General Tech'}
                        </span>
                        <h3 className="font-serif font-bold text-xl leading-snug hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>
                          <Link to={articleDetailUrl}>{post.title}</Link>
                        </h3>
                        {post.summary && <p className="text-xs opacity-80 line-clamp-3 leading-relaxed">{post.summary}</p>}
                      </div>
                    </div>

                    <div className="p-6 pt-0 flex items-center justify-between text-xs border-t border-warm-border/40 mt-4">
                      <span className="opacity-70 font-mono">
                        {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                      </span>
                      <Link
                        to={articleDetailUrl}
                        className="font-semibold hover:underline inline-flex items-center gap-1"
                        style={{ color: accentColor }}
                      >
                        <span>Read Article</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. TESTIMONIALS SLIDER / CAROUSEL */}
        {testimonials?.length > 0 && (
          <section id="testimonials" className="border-y border-warm-border py-16" style={{ backgroundColor: surfaceColor }}>
            <div className="max-w-5xl mx-auto px-6 space-y-8">
              <div className="text-center space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider opacity-75">Endorsements</span>
                <h2 className="text-3xl font-serif font-bold" style={{ color: primaryColor }}>Testimonials</h2>
              </div>

              <div
                className="relative border border-warm-border rounded-3xl p-8 md:p-12 shadow-sm transition-all overflow-hidden"
                style={{ backgroundColor: bgColor }}
                onMouseEnter={() => setIsTestimonialPaused(true)}
                onMouseLeave={() => setIsTestimonialPaused(false)}
              >
                {testimonials[testimonialIndex] && (
                  <div className="space-y-6 text-center max-w-2xl mx-auto">
                    <div className="flex items-center justify-center gap-1">
                      {[...Array(testimonials[testimonialIndex].rating || 5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-current" style={{ color: secondaryColor }} />
                      ))}
                    </div>

                    <p className="text-lg md:text-xl font-serif italic leading-relaxed" style={{ color: primaryColor }}>
                      "{testimonials[testimonialIndex].message}"
                    </p>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      {testimonials[testimonialIndex].avatar_url ? (
                        <img
                          src={testimonials[testimonialIndex].avatar_url}
                          alt={testimonials[testimonialIndex].name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-warm-border shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full text-white font-serif font-bold text-base flex items-center justify-center shadow-sm" style={{ backgroundColor: secondaryColor }}>
                          {testimonials[testimonialIndex].name[0]}
                        </div>
                      )}
                      <div className="text-left">
                        <h4 className="font-serif font-bold text-base" style={{ color: primaryColor }}>{testimonials[testimonialIndex].name}</h4>
                        <p className="text-xs opacity-75">{testimonials[testimonialIndex].role || 'Client'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-warm-border/40">
                  <button
                    onClick={prevTestimonial}
                    className="p-2 rounded-full border border-warm-border hover:opacity-80 transition-opacity shadow-sm"
                    style={{ backgroundColor: surfaceColor }}
                    title="Previous Testimonial"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {testimonials.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setTestimonialIndex(idx)}
                        className={`h-2.5 rounded-full transition-all ${
                          idx === testimonialIndex ? 'w-6' : 'w-2.5 opacity-40'
                        }`}
                        style={{ backgroundColor: idx === testimonialIndex ? accentColor : textColor }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={nextTestimonial}
                    className="p-2 rounded-full border border-warm-border hover:opacity-80 transition-opacity shadow-sm"
                    style={{ backgroundColor: surfaceColor }}
                    title="Next Testimonial"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 6. FAQ SECTION (ACCORDION) */}
        {faqs?.length > 0 && (
          <section id="faqs" className="max-w-4xl mx-auto px-6 py-12 space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider opacity-75">Common Inquiries</span>
              <h2 className="text-3xl font-serif font-bold" style={{ color: primaryColor }}>Frequently Asked Questions</h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq) => {
                const isOpen = activeFaq === faq.id;
                return (
                  <div key={faq.id} className="border border-warm-border rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: surfaceColor }}>
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : faq.id)}
                      className="w-full p-5 text-left font-serif font-bold text-base flex items-center justify-between gap-4 transition-colors"
                      style={{ color: primaryColor }}
                    >
                      <span>{faq.question}</span>
                      {isOpen ? <ChevronUp className="w-5 h-5 shrink-0" style={{ color: accentColor }} /> : <ChevronDown className="w-5 h-5 shrink-0 opacity-60" />}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-sm opacity-85 leading-relaxed border-t border-warm-border/40 pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 7. GET IN TOUCH (CONTACT FORM ISOLATION) */}
        <section id="contact" className="max-w-4xl mx-auto px-6 py-12">
          <div className="border border-warm-border rounded-3xl p-8 md:p-12 shadow-xl space-y-8" style={{ backgroundColor: surfaceColor }}>
            <div className="text-center space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider opacity-75">Reach Out</span>
              <h2 className="text-3xl font-serif font-bold" style={{ color: primaryColor }}>Get In Touch</h2>
              <p className="text-sm opacity-80 max-w-lg mx-auto">
                Send a message directly to {brandDisplayName}.
              </p>
            </div>

            {contactSuccess && (
              <div className="flex items-center gap-3 p-4 rounded-xl border text-sm" style={{ backgroundColor: bgColor, borderColor: secondaryColor }}>
                <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: secondaryColor }} />
                <span>{contactSuccess}</span>
              </div>
            )}

            {contactError && (
              <div className="flex items-center gap-3 p-4 rounded-xl border text-sm" style={{ backgroundColor: bgColor, borderColor: accentColor }}>
                <AlertCircle className="w-5 h-5 shrink-0" style={{ color: accentColor }} />
                <span>{contactError}</span>
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">Your Name</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="David Miller"
                    className="w-full px-4 py-2.5 border border-warm-border rounded-xl text-sm focus:outline-none"
                    style={{ backgroundColor: bgColor, color: textColor }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">Your Email</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="david@company.io"
                    className="w-full px-4 py-2.5 border border-warm-border rounded-xl text-sm focus:outline-none"
                    style={{ backgroundColor: bgColor, color: textColor }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">Subject</label>
                <input
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  placeholder="Project Inquiry / Partnership"
                  className="w-full px-4 py-2.5 border border-warm-border rounded-xl text-sm focus:outline-none"
                  style={{ backgroundColor: bgColor, color: textColor }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">Message</label>
                <textarea
                  rows={4}
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Write your message here..."
                  className="w-full px-4 py-2.5 border border-warm-border rounded-xl text-sm focus:outline-none"
                  style={{ backgroundColor: bgColor, color: textColor }}
                />
              </div>

              <button
                type="submit"
                disabled={contactSending}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: accentColor }}
              >
                <Send className="w-4 h-4" />
                <span>{contactSending ? 'Sending Message...' : 'Send Message'}</span>
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-warm-black/40 py-12 text-white" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-serif font-bold text-lg">{brandDisplayName}</h3>
            <p className="text-xs opacity-75 mt-1 font-mono">{navigation?.footer_text || 'Powered by ContentHub CMS Multi-Creator Platform'}</p>
          </div>

          <div className="text-xs opacity-75 text-center md:text-right font-mono">
            {navigation?.copyright_text || `© ${new Date().getFullYear()} ${brandDisplayName}. All rights reserved.`}
          </div>
        </div>
      </footer>
    </div>
  );
};
