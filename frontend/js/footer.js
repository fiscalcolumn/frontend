/**
 * Footer Component
 * Fetches and renders footer from Strapi
 * Uses localStorage caching with 1-hour TTL to reduce API calls
 */

// Cache configuration
const FOOTER_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const FOOTER_CACHE_KEYS = {
  HEADER: 'fc_header_data',
  FOOTER: 'fc_footer_data',
  CATEGORIES: 'fc_categories_data'
};

// Shared footer data cache (in-memory)
let footerDataCache = null;
let footerDataPromise = null;

/**
 * Get cached data from localStorage with TTL check
 * @param {string} key - Cache key
 * @returns {object|null} - Cached data or null if expired/missing
 */
function getCachedData(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) {
      console.log(`📭 No cache found for key: ${key}`);
      return null;
    }
    
    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    console.log(`🔍 Cache found for ${key}:`, { hasData: !!data, isNull: data === null, age: Math.round(age / 1000) + 's' });
    
    // Don't return null or invalid cached data
    if (!data || data === null) {
      console.warn(`⚠️ Cache for ${key} contains null data, removing...`);
      localStorage.removeItem(key);
      return null;
    }
    
    const now = Date.now();
    
    // Check if cache is still valid (within TTL)
    if (now - timestamp < FOOTER_CACHE_TTL) {
      console.log(`✅ Cache for ${key} is valid`);
      return data;
    }
    
    // Cache expired, remove it
    console.log(`⏰ Cache for ${key} expired, removing...`);
    localStorage.removeItem(key);
    return null;
  } catch (error) {
    console.error(`❌ Error reading cache for ${key}:`, error);
    // Remove corrupted cache
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Ignore removal errors
    }
    return null;
  }
}

/**
 * Store data in localStorage with timestamp
 * @param {string} key - Cache key
 * @param {object} data - Data to cache
 */
function setCachedData(key, data) {
  try {
    const cacheObject = {
      data: data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheObject));
  } catch (error) {
    console.error('Error writing cache:', error);
    // If storage is full, try to clear old cache
    try {
      Object.values(FOOTER_CACHE_KEYS).forEach(k => {
        if (k !== key) localStorage.removeItem(k);
      });
      localStorage.setItem(key, JSON.stringify({ data: data, timestamp: Date.now() }));
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
  }
}

// Fetch footer data from Strapi (with localStorage + in-memory caching)
async function fetchFooter() {
  console.log('🔍 fetchFooter() called');
  console.log('📊 Cache state:', {
    hasPromise: !!footerDataPromise,
    hasMemoryCache: !!footerDataCache,
    memoryCacheIsNull: footerDataCache === null
  });
  
  // If already fetching, return the same promise
  if (footerDataPromise) {
    console.log('⏳ Already fetching footer, returning existing promise');
    return footerDataPromise;
  }
  
  // Check in-memory cache first (but only if it's not null)
  if (footerDataCache && footerDataCache !== null) {
    console.log('✅ Footer data loaded from in-memory cache');
    return footerDataCache;
  }
  
  // Check localStorage cache
  console.log('🔍 Checking localStorage cache...');
  const cachedFooter = getCachedData(FOOTER_CACHE_KEYS.FOOTER);
  if (cachedFooter) {
    console.log('✅ Footer data loaded from localStorage cache');
    footerDataCache = cachedFooter;
    return footerDataCache;
  }
  
  // Fetch footer data (cache miss - need to fetch from API)
  console.log('🌐 Cache miss - fetching footer from API...');
  footerDataPromise = (async () => {
    try {
      // Use populate=* which should populate all fields including media in components
      // This is the simplest approach that should work with Strapi v5
      const response = await fetch(getApiUrl('/footer?populate=*'));
      if (!response.ok) {
        throw new Error(`Failed to fetch footer: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('🌐 Footer API response:', data);
      
      // Check if data exists (Strapi single types return {"data": null} if no content)
      if (!data || !data.data) {
        console.warn('⚠️ Footer data is null or empty from API. Response:', data);
        footerDataPromise = null;
        return null;
      }
      
      footerDataCache = data.data;
      console.log('✅ Footer data cached in memory:', footerDataCache ? 'Success' : 'Failed');
      
      // Only store in localStorage if data is valid (not null)
      if (footerDataCache) {
        setCachedData(FOOTER_CACHE_KEYS.FOOTER, footerDataCache);
        console.log('💾 Footer data stored in localStorage');
      } else {
        console.warn('⚠️ Footer data is null, not storing in cache');
      }
      
      footerDataPromise = null; // Clear promise after completion
      return footerDataCache;
    } catch (error) {
      console.error('Error fetching footer:', error);
      footerDataPromise = null; // Clear promise on error
      return null;
    }
  })();
  
  return footerDataPromise;
}

// Render social links
function renderSocialLinks(socialLinks) {
  if (!socialLinks || socialLinks.length === 0) {
    return '';
  }

  const iconMap = {
    'facebook': 'fa-facebook',
    'twitter': 'fa-twitter',
    'instagram': 'fa-instagram',
    'linkedin': 'fa-linkedin',
    'youtube': 'fa-youtube',
    'tiktok': 'fa-tiktok',
    'google': 'fa-google-plus'
  };

  return socialLinks.map(link => {
    const iconClass = iconMap[link.platform] || 'fa-link';
    return `<li><a href="${link.url || '#'}" target="_blank" rel="noopener noreferrer"><i class="fa ${iconClass}" aria-hidden="true"></i></a></li>`;
  }).join('');
}

// Render footer links
function renderFooterLinks(links) {
  if (!links || links.length === 0) {
    return '';
  }

  return links.map(link => {
    let url = link.url || '#';
    
    // Ensure internal links start with /
    if (url !== '#' && !url.startsWith('http') && !url.startsWith('/')) {
      url = '/' + url;
    }
    
    return `<li><a href="${url}">${link.label || ''}</a></li>`;
  }).join('');
}

// Render app download buttons
function renderAppDownloads(appDownloads) {
  if (!appDownloads || appDownloads.length === 0) {
    console.warn('No app downloads provided');
    return '';
  }

  const baseUrl = getApiUrl('').replace('/api', '');

  return appDownloads.map((app) => {
    let imageUrl = '';
    let imageAlt = app.platform || 'App Download';
    
    // Get image URL from Strapi - handle different data structures
    if (app.badgeImage) {
      // Handle Strapi v5 structure - check various possible structures
      if (app.badgeImage.data) {
        // Array of images
        if (Array.isArray(app.badgeImage.data) && app.badgeImage.data.length > 0) {
          if (app.badgeImage.data[0].attributes && app.badgeImage.data[0].attributes.url) {
            imageUrl = baseUrl + app.badgeImage.data[0].attributes.url;
          } else if (app.badgeImage.data[0].url) {
            imageUrl = baseUrl + app.badgeImage.data[0].url;
          }
        } 
        // Single image object
        else if (app.badgeImage.data.attributes && app.badgeImage.data.attributes.url) {
          imageUrl = baseUrl + app.badgeImage.data.attributes.url;
        } else if (app.badgeImage.data.url) {
          imageUrl = baseUrl + app.badgeImage.data.url;
        }
      } 
      // Direct attributes structure
      else if (app.badgeImage.attributes && app.badgeImage.attributes.url) {
        imageUrl = baseUrl + app.badgeImage.attributes.url;
      } 
      // Direct URL
      else if (app.badgeImage.url) {
        imageUrl = baseUrl + app.badgeImage.url;
      } 
      // String URL
      else if (typeof app.badgeImage === 'string') {
        imageUrl = baseUrl + app.badgeImage;
      }
    } else {
      console.warn('No badgeImage found for app:', app.platform);
      // If no badgeImage, we can't show an image - return empty
      // User needs to upload badgeImage in Strapi
      return '';
    }
    
    // Render image tag if URL exists
    if (imageUrl) {
      return `<div class="footer_image"><a href="${app.url || '#'}" target="_blank" rel="noopener noreferrer"><img src="${imageUrl}" alt="${imageAlt}" style="max-width: 150px; height: auto; display: block;"></a></div>`;
    } else {
      console.warn('No image URL resolved for app:', app.platform);
      return '';
    }
  }).join('');
}

// Render contact info
function renderContactInfo(contactInfo) {
  if (!contactInfo) {
    return '';
  }

  let html = '<ul>';
  if (contactInfo.email) {
    html += `<li>Email: ${contactInfo.email}</li>`;
  }
  if (contactInfo.phone) {
    html += `<li>Phone: ${contactInfo.phone}</li>`;
  }
  if (contactInfo.address) {
    html += `<li>${contactInfo.address}</li>`;
  }
  html += '</ul>';
  return html;
}

// Render footer logo
function renderFooterLogo(logoText, logoImage) {
  if (logoImage && logoImage.url) {
    return `<a href="/"><img src="${getApiUrl('').replace('/api', '')}${logoImage.url}" alt="${logoText || 'Logo'}" style="max-height: 50px;"></a>`;
  }
  
  if (logoText) {
    const parts = logoText.split(/(\d+)/);
    if (parts.length > 1) {
      return `<a href="/"><div class="footer_logo_text">${parts[0]}<span>${parts[1]}</span></div></a>`;
    }
    return `<a href="/"><div class="footer_logo_text">${logoText}</div></a>`;
  }
  
  return '<a href="/"><div class="footer_logo_text">Fin<span>24x</span></div></a>';
}

// Render footer component
async function renderFooter() {
  console.log('🚀 renderFooter() called');
  const footerContainer = document.querySelector('.footer');
  if (!footerContainer) {
    console.error('❌ Footer container (.footer) not found in DOM');
    return;
  }
  console.log('✅ Footer container found');

  // Hide footer initially to prevent "Loading..." flash
  footerContainer.style.opacity = '0';
  footerContainer.style.visibility = 'hidden';
  
  console.log('🔍 Calling fetchFooter()...');
  const footerData = await fetchFooter();
  console.log('📦 Footer data received:', footerData ? 'Data exists ✅' : 'NULL/UNDEFINED ❌', footerData);
  
  if (!footerData) {
    console.warn('⚠️ Footer data not available, using fallback');
    // Show footer even if data is not available
    footerContainer.style.opacity = '1';
    footerContainer.style.visibility = 'visible';
    return;
  }

  // Get containers
  const footerAbout = footerContainer.querySelector('.footer_about');
  const logoContainer = footerAbout ? footerAbout.querySelector('.footer_logo_container') : null;
  const aboutText = footerAbout ? footerAbout.querySelector('.footer_about_text') : null;

  // Render logo and description
  if (footerAbout) {
    if (logoContainer) {
      logoContainer.innerHTML = renderFooterLogo(footerData.logoText, footerData.logo);
    }

    if (aboutText && footerData.description) {
      aboutText.innerHTML = `<p>${footerData.description}</p>`;
    }

    const socialContainer = footerAbout.querySelector('.footer_social ul');
    if (socialContainer && footerData.socialLinks) {
      socialContainer.innerHTML = renderSocialLinks(footerData.socialLinks);
    }
  }

  // Render contact info
  const footerContact = footerContainer.querySelector('.footer_contact');
  if (footerContact && footerData.contactInfo) {
    const contactInfoContainer = footerContact.querySelector('.footer_contact_info');
    if (contactInfoContainer) {
      contactInfoContainer.innerHTML = renderContactInfo(footerData.contactInfo);
    }
  }

  // Render quick links column 1
  const footerLinks = footerContainer.querySelector('.footer_links');
  if (footerLinks) {
    const linksTitle = footerLinks.querySelector('.footer_title');
    if (linksTitle && footerData.quickLinksTitle) {
      linksTitle.textContent = footerData.quickLinksTitle;
    }

    const linksContainer = footerLinks.querySelector('.footer_links_container ul');
    if (linksContainer) {
      // Combine both columns if they exist
      const allLinks = [
        ...(footerData.quickLinksColumn1 || []),
        ...(footerData.quickLinksColumn2 || [])
      ];
      linksContainer.innerHTML = renderFooterLinks(allLinks);
    }
  }

  // Render app downloads
  const footerMobile = footerContainer.querySelector('.footer_mobile');
  if (footerMobile) {
    const mobileTitle = footerMobile.querySelector('.footer_title');
    if (mobileTitle && footerData.mobileTitle) {
      mobileTitle.textContent = footerData.mobileTitle;
    }

    const mobileContent = footerMobile.querySelector('.footer_mobile_content');
    if (mobileContent) {
      if (footerData.appDownloads && footerData.appDownloads.length > 0) {
        const renderedContent = renderAppDownloads(footerData.appDownloads);
        mobileContent.innerHTML = renderedContent;
      } else {
        console.warn('No app downloads data found in footer');
        mobileContent.innerHTML = '';
      }
    } else {
      console.error('Mobile content container not found');
    }
  } else {
    console.error('Footer Mobile section not found in DOM');
  }

  // Render bottom links
  const copyrightRow = footerContainer.querySelector('.copyright_row');
  if (copyrightRow && footerData.bottomLinks) {
    const crLinks = copyrightRow.querySelector('.cr_list');
    if (crLinks) {
      crLinks.innerHTML = renderFooterLinks(footerData.bottomLinks);
    }
  }

  // Render copyright text
  if (footerData.copyrightText) {
    const crText = footerContainer.querySelector('.cr_text');
    if (crText) {
      crText.innerHTML = footerData.copyrightText;
    }
  }

  // Show footer after content is loaded
  footerContainer.style.opacity = '1';
  footerContainer.style.visibility = 'visible';
  footerContainer.style.transition = 'opacity 0.2s ease-in-out';
}

// Initialize footer when DOM is ready
function initFooter() {
  renderFooter();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFooter);
} else {
  // DOM is already ready
  initFooter();
}

