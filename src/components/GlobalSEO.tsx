import { Helmet } from "react-helmet-async";
import { useSeoSettings } from "@/hooks/useSeoSettings";
import { useEffect } from "react";

export const GlobalSEO = () => {
  const { settings } = useSeoSettings();

  /* --------------------------------------------------
   * Inject third-party scripts (Analytics, GTM, Pixel)
   * -------------------------------------------------- */
  useEffect(() => {
    if (!settings) return;

    /* ---- Google Analytics ---- */
    if (settings.google_analytics_id) {
      const ga1 = document.createElement("script");
      ga1.async = true;
      ga1.src = `https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics_id}`;
      document.head.appendChild(ga1);

      const ga2 = document.createElement("script");
      ga2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${settings.google_analytics_id}');
      `;
      document.head.appendChild(ga2);
    }

    /* ---- Google Tag Manager ---- */
    if (settings.google_tag_manager_id) {
      const gtmScript = document.createElement("script");
      gtmScript.innerHTML = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});const f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${settings.google_tag_manager_id}');
      `;
      document.head.appendChild(gtmScript);

      // GTM noscript mount
      const noscript = document.createElement("noscript");
      noscript.innerHTML = `
        <iframe src="https://www.googletagmanager.com/ns.html?id=${settings.google_tag_manager_id}"
        height="0" width="0" style="display:none;visibility:hidden"></iframe>
      `;
      document.body.prepend(noscript);
    }

    /* ---- Facebook Pixel ---- */
    if (settings.facebook_pixel_id) {
      const script = document.createElement("script");
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}
        (window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${settings.facebook_pixel_id}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
    }

    /* ---- Custom Head Scripts ---- */
    if (settings.custom_head_scripts) {
      const wrap = document.createElement("div");
      wrap.innerHTML = settings.custom_head_scripts;
      Array.from(wrap.children).forEach((child) => {
        document.head.appendChild(child);
      });
    }
  }, [settings]);

  if (!settings) return null;

  /* --------------------
   * Robots meta rules
   * -------------------- */
  const robotsContent = settings.allow_indexing
    ? settings.follow_links
      ? "index, follow"
      : "index, nofollow"
    : "noindex, nofollow";

  /* ---------------------
   * Canonical fallback
   * --------------------- */
  const canonical = settings.canonical_url || window.location.href;

  /* ---------------------
   * Structured Data base
   * --------------------- */
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.og_site_name || settings.site_title,
    url: canonical,
    description: settings.meta_description || "",
    logo: `${canonical}/logo.png`,
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.site_title,
    url: canonical,
    potentialAction: {
      "@type": "SearchAction",
      target: `${canonical}/search?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{settings.site_title}</title>
      <meta name="description" content={settings.meta_description || ""} />
      <meta name="keywords" content={settings.meta_keywords || ""} />
      <meta name="robots" content={robotsContent} />
      <meta name="author" content={settings.og_site_name || settings.site_title} />

      {/* Canonical */}
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:site_name" content={settings.og_site_name} />
      <meta property="og:title" content={settings.site_title} />
      <meta property="og:description" content={settings.meta_description || ""} />
      <meta property="og:image" content={settings.default_og_image} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={settings.og_locale || "id_ID"} />

      {settings.facebook_app_id && <meta property="fb:app_id" content={settings.facebook_app_id} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={settings.site_title} />
      <meta name="twitter:description" content={settings.meta_description || ""} />
      <meta name="twitter:image" content={settings.default_og_image} />
      {settings.twitter_handle && <meta name="twitter:site" content={`@${settings.twitter_handle}`} />}

      {/* Local SEO */}
      {settings.geo_region && <meta name="geo.region" content={settings.geo_region} />}
      {settings.geo_placename && <meta name="geo.placename" content={settings.geo_placename} />}
      {settings.geo_coordinates && <meta name="geo.position" content={settings.geo_coordinates} />}

      {/* Verification Tags */}
      {settings.google_search_console_verification && (
        <meta name="google-site-verification" content={settings.google_search_console_verification} />
      )}
      {settings.bing_verification && <meta name="msvalidate.01" content={settings.bing_verification} />}

      {/* ----------------------
       * JSON-LD Structured Data
       * ---------------------- */}
      {settings.structured_data_enabled && (
        <>
          <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
          <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>

        </>
      )}
    </Helmet>
  );
};
