/**
 * Homepage SEO - Dynamically sets OG image from header logo
 */

(async function() {
  try {
    // Use shared header data if available (reuse from header.js)
    let headerData;
    if (window.getHeaderData) {
      headerData = await window.getHeaderData();
    } else {
      // Fallback if header.js hasn't loaded yet
      const response = await fetch(getApiUrl('/header?populate=*'));
      if (!response.ok) return;
      const result = await response.json();
      headerData = result.data;
    }
    
    if (headerData?.logo?.url) {
      const logoUrl = `${API_CONFIG.BASE_URL}${headerData.logo.url}`;
      
      // Update OG image
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) ogImage.setAttribute('content', logoUrl);
      
      // Update Twitter image
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) twitterImage.setAttribute('content', logoUrl);
    }
  } catch (error) {
    console.error('Could not fetch header for SEO:', error);
  }
})();

