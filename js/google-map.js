/* Google Maps loader and initializer for parking-page
   English comments for junior developers to follow.
*/
(function(){
  const cfg = window.API_CONFIG || {};
  const API_KEY = cfg.GMAPS_API_KEY || '';

  function loadGoogleMaps(){
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
        return;
      }
      if (!API_KEY){
        console.warn('[Maps] Missing GMAPS_API_KEY in window.API_CONFIG. Showing placeholder background.');
        // Render a simple placeholder to avoid blank area
        const el = document.getElementById('gmap');
        if (el){
          el.style.background = "url('images/panel-image.jpg') center/cover no-repeat";
        }
        resolve(null);
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&v=weekly&libraries=marker`;
      script.async = true; script.defer = true;
      script.onerror = () => reject(new Error('Failed to load Google Maps JS API'));
      script.onload = () => resolve(window.google.maps);
      document.head.appendChild(script);
    });
  }

  function initMap(){
    const el = document.getElementById('gmap');
    if (!el) return;

    // Default center: Melbourne CBD
    const center = { lat: -37.8136, lng: 144.9631 };

    const maps = window.google && window.google.maps;
    if (!maps){
      return; // No API key, placeholder already shown
    }

    const map = new maps.Map(el, {
      center,
      zoom: 14,
      mapId: 'DEMO_MAP_ID', // Optional: custom map style if you have one
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false
    });

    // starter marker
    new maps.Marker({ position: center, map, title: 'Melbourne CBD' });

    // expose globally and notify others
    window.gmap = { map, maps };
    window.dispatchEvent(new CustomEvent('gmap-ready'));

    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        window.gmap.userPos = pos;
        new maps.Marker({ position: pos, map, title: 'You are here' });
        // do not recenter too aggressively if user already moved
        map.setCenter(pos);
      }, () => {}, { enableHighAccuracy: true, maximumAge: 60000 });
    }

    // Allow user to pick a search point by clicking the map
    let searchMarker = null;
    map.addListener('click', (e) => {
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      window.gmap.searchPos = pos;
      if (searchMarker) searchMarker.setMap(null);
      searchMarker = new maps.Marker({ position: pos, map, title: 'Search here' });
    });
  }

  function init(){
    loadGoogleMaps().then(() => initMap()).catch(err => {
      console.error(err);
      const el = document.getElementById('gmap');
      if (el){
        el.textContent = 'Failed to load Google Maps';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.color = '#666';
        el.style.background = '#f5f5f5';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 