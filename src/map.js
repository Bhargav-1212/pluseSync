import { CONFIG } from './config.js';

export class StadiumMap {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.sections = [];
    this.selectedSection = null;
    this.tooltip = null;
  }

  async init() {
    await this.loadGoogleMaps();
    
    this.map = new google.maps.Map(document.getElementById(this.containerId), {
      center: CONFIG.STADIUM.CENTER,
      zoom: CONFIG.STADIUM.ZOOM,
      styles: this.getUltraDarkStyles(),
      disableDefaultUI: true,
      mapTypeId: 'satellite',
      tilt: 45
    });

    this.createTooltip();
    this.generateStadiumLayout();
  }

  loadGoogleMaps() {
    return new Promise((resolve) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&callback=initMap`;
      script.async = true;
      window.initMap = resolve;
      document.head.appendChild(script);
    });
  }

  createTooltip() {
    const el = document.createElement('div');
    el.className = 'map-tooltip glass hidden';
    el.style.position = 'absolute';
    el.style.zIndex = '1000';
    el.style.padding = '8px 12px';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);
    this.tooltip = el;
  }

  generateStadiumLayout() {
    const center = CONFIG.STADIUM.CENTER;
    const tiers = [
      { rIn: 0.0004, rOut: 0.0010, count: 18, name: 'Platinum Level', weight: 1.0 },
      { rIn: 0.0011, rOut: 0.0018, count: 24, name: 'Gold Level', weight: 0.8 },
      { rIn: 0.0019, rOut: 0.0028, count: 32, name: 'Silver Level', weight: 0.6 }
    ];

    tiers.forEach((tier, tIdx) => {
      const angleStep = (2 * Math.PI) / tier.count;
      for (let i = 0; i < tier.count; i++) {
        const start = i * angleStep;
        const end = (i + 1) * angleStep;
        const path = this.getSectorPath(center, tier.rIn, tier.rOut, start, end);
        
        const id = `${tIdx + 1}${i.toString().padStart(2, '0')}`;
        const sentiment = Math.random();
        
        const polygon = new google.maps.Polygon({
          paths: path,
          strokeColor: '#FFFFFF',
          strokeOpacity: 0.1,
          strokeWeight: 1,
          fillColor: this.getColorForSentiment(sentiment),
          fillOpacity: 0.5,
          map: this.map,
        });

        const data = { id, name: `Section ${id}`, tier: tier.name, polygon, sentiment };
        this.addInteractions(data);
        this.sections.push(data);
      }
    });
  }

  getSectorPath(center, rIn, rOut, start, end) {
    const p = [];
    const steps = 8;
    const stretch = 1.6; // Improved oval matching for AT&T stadium
    
    for (let j = 0; j <= steps; j++) {
      const a = start + (end - start) * (j / steps);
      p.push({ lat: center.lat + rOut * Math.sin(a), lng: center.lng + rOut * Math.cos(a) * stretch });
    }
    for (let j = steps; j >= 0; j--) {
      const a = start + (end - start) * (j / steps);
      p.push({ lat: center.lat + rIn * Math.sin(a), lng: center.lng + rIn * Math.cos(a) * stretch });
    }
    return p;
  }

  addInteractions(section) {
    google.maps.event.addListener(section.polygon, 'mouseover', (e) => {
      this.showTooltip(section, e.latLng);
      section.polygon.setOptions({ fillOpacity: 0.8, strokeWeight: 2 });
    });

    google.maps.event.addListener(section.polygon, 'mousemove', (e) => {
      this.updateTooltipPos(e.latLng);
    });

    google.maps.event.addListener(section.polygon, 'mouseout', () => {
      this.hideTooltip();
      if (this.selectedSection !== section) {
        section.polygon.setOptions({ fillOpacity: 0.5, strokeWeight: 1 });
      }
    });

    google.maps.event.addListener(section.polygon, 'click', () => {
      this.selectSection(section);
    });
  }

  showTooltip(section, latLng) {
    const s = section.sentiment > 0.6 ? 'HIGH' : (section.sentiment > 0.3 ? 'NEUTRAL' : 'LOW');
    this.tooltip.innerHTML = `<strong>${section.name}</strong><br><small>${section.tier}</small><br>Pulse: ${s}`;
    this.tooltip.classList.remove('hidden');
    this.updateTooltipPos(latLng);
  }

  updateTooltipPos(latLng) {
    const projection = this.map.getProjection();
    const point = projection.fromLatLngToPoint(latLng);
    // Rough estimate for screenspace
    // Note: A real implementation would use an OverlayView for better accuracy
    // but for this prototype we'll use a hacky float near cursor
  }

  hideTooltip() {
    this.tooltip.classList.add('hidden');
  }

  selectSection(section) {
    if (this.selectedSection) {
      this.selectedSection.polygon.setOptions({ fillOpacity: 0.5, strokeColor: '#FFFFFF', strokeOpacity: 0.1 });
    }
    this.selectedSection = section;
    section.polygon.setOptions({ fillOpacity: 0.9, strokeColor: CONFIG.THEME.PRIMARY, strokeOpacity: 1, strokeWeight: 3 });
    window.dispatchEvent(new CustomEvent('sectionSelected', { detail: section }));
  }

  updateSentiment(sectionId, type) {
    const s = this.sections.find(sec => sec.id === sectionId);
    if (!s) return;
    
    let target = type === 'excited' ? 0.9 : (type === 'neutral' ? 0.5 : 0.1);
    s.sentiment = target;
    s.polygon.setOptions({ fillColor: this.getColorForSentiment(target) });
  }

  getColorForSentiment(val) {
    if (val > 0.6) return CONFIG.THEME.SENTIMENT_HIGH;
    if (val > 0.3) return CONFIG.THEME.SENTIMENT_NEUTRAL;
    return CONFIG.THEME.SENTIMENT_LOW;
  }

  getUltraDarkStyles() {
    return [
      { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "all", elementType: "geometry", stylers: [{ color: "#000000" }] },
      { featureType: "landscape", stylers: [{ color: "#050505" }] },
      { featureType: "water", stylers: [{ color: "#0a0a0a" }] }
    ];
  }
}
