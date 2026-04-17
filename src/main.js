import './style.css';
import { StadiumMap } from './map.js';

class PulseApp {
  constructor() {
    this.map = null;
    this.userHasOnboarded = false;
    this.init();
  }

  async init() {
    this.bindDOM();
    this.setupSimulation();
  }

  bindDOM() {
    const enterBtn = document.getElementById('enter-stadium');
    const exitBtn = document.getElementById('exit-app');
    
    enterBtn.addEventListener('click', () => this.transitionToDashboard());
    exitBtn.addEventListener('click', () => location.reload()); // Simple reset

    // Onboarding flow
    const onboarding = document.getElementById('onboarding');
    const steps = document.querySelectorAll('.step');
    let currentStep = 0;

    onboarding.addEventListener('click', (e) => {
      if (e.target.classList.contains('next-btn')) {
        steps[currentStep].classList.add('hidden');
        currentStep++;
        if (currentStep < steps.length) {
          steps[currentStep].classList.remove('hidden');
        } else {
          onboarding.classList.add('hidden');
          this.userHasOnboarded = true;
        }
      }
    });

    // Emotion Selection
    document.querySelectorAll('.emotion-node').forEach(node => {
      node.addEventListener('click', () => {
        const emotion = node.dataset.emotion;
        this.handleUserPulse(emotion);
      });
    });

    window.addEventListener('sectionSelected', (e) => {
      document.getElementById('current-section-name').textContent = e.detail.name;
    });
  }

  async transitionToDashboard() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    if (!this.map) {
      this.map = new StadiumMap('map-container');
      await this.map.init();
      
      // Show onboarding on first entry
      document.getElementById('onboarding').classList.remove('hidden');
    }
  }

  handleUserPulse(emotion) {
    if (!this.map.selectedSection) {
      this.pushInsight("Select your section on the map first!", "warning");
      return;
    }

    const section = this.map.selectedSection;
    this.map.updateSentiment(section.id, emotion);
    
    // UI Feedback
    this.pushInsight(`Pulse captured for ${section.name}. The arena feels your energy! ✨`, "trending");
    
    // Add a glowing effect to the vital card
    const avgPulse = document.getElementById('avg-pulse');
    avgPulse.textContent = (84 + Math.floor(Math.random() * 5)) + "%";
    avgPulse.parentElement.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.4)';
    setTimeout(() => avgPulse.parentElement.style.boxShadow = '', 1000);
  }

  pushInsight(text, type = 'normal') {
    const list = document.getElementById('insights-list');
    const card = document.createElement('div');
    card.className = `insight-card ${type}`;
    card.innerHTML = `<p>${text}</p><small>${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>`;
    
    list.prepend(card);
    if (list.children.length > 6) list.removeChild(list.lastChild);
  }

  setupSimulation() {
    // Dynamic Stats
    setInterval(() => {
      const attendeeEl = document.getElementById('attendee-count');
      if (attendeeEl) {
        let count = parseInt(attendeeEl.textContent.replace(/,/g, ''));
        count += Math.floor(Math.random() * 10);
        attendeeEl.textContent = count.toLocaleString();
      }
    }, 4000);

    // Random Arena Pulse Changes
    setInterval(() => {
      if (this.map && this.map.sections.length > 0) {
        const randomSection = this.map.sections[Math.floor(Math.random() * this.map.sections.length)];
        const moods = ['excited', 'neutral', 'bored'];
        const mood = moods[Math.floor(Math.random() * moods.length)];
        this.map.updateSentiment(randomSection.id, mood);
      }
    }, 3000);

    // Contextual Insights
    const pool = [
      { t: "Gate B lines are clear. Fast entry available.", type: "trending" },
      { t: "Energy peaking in the Platinum Tier. Wave incoming!", type: "normal" },
      { t: "Restrooms near Section 202 are currently quiet.", type: "normal" },
      { t: "Trend Alert: Seat 104 is the center of the pulse right now.", type: "trending" }
    ];

    setInterval(() => {
      if (this.userHasOnboarded) {
        const item = pool[Math.floor(Math.random() * pool.length)];
        this.pushInsight(item.t, item.type);
      }
    }, 12000);
  }
}

new PulseApp();
