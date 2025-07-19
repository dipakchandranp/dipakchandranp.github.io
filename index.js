// Smooth scroll animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animated');
        }
    });
}, observerOptions);

// Observe all animation elements
document.querySelectorAll('.animate-on-scroll, .animate-slide-left, .animate-slide-right, .animate-scale').forEach(el => {
    observer.observe(el);
});

// Particle Effect using D3.js
let particleEffectInitialized = false;

function initParticleEffect() {
    const svg = d3.select("#particle-container");
    
    // Clear existing content
    svg.selectAll('*').remove();
    
    // Calculate responsive dimensions
    const viewportWidth = window.innerWidth;
    const containerSize = viewportWidth < 640 ? 288 : 320; // 72*4 for mobile, 80*4 for larger screens
    const width = containerSize;
    const height = containerSize;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2; // Radius around the profile image

    // Update SVG size
    svg.attr('width', width).attr('height', height);

    // Create particles data
    const numParticles = viewportWidth < 640 ? 35 : 50; // Fewer particles on mobile
    const particles = d3.range(numParticles).map(d => ({
        id: d,
        angle: Math.random() * 2 * Math.PI,
        distance: 60 + Math.random() * 60, // Adjusted distance for mobile
        speed: 0.005 + Math.random() * 0.01,
        size: 2 + Math.random() * 4,
        opacity: 0.3 + Math.random() * 0.7,
        color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][Math.floor(Math.random() * 5)]
    }));

    // Create particle circles
    const particleGroup = svg.selectAll('.particle')
        .data(particles)
        .enter()
        .append('circle')
        .attr('class', 'particle')
        .attr('r', d => d.size)
        .attr('fill', d => d.color)
        .attr('opacity', d => d.opacity)
        .style('filter', 'blur(0.5px)');

    // Animation function
    function animate() {
        particles.forEach(particle => {
            particle.angle += particle.speed;
            
            // Create orbital motion with some randomness
            const offsetX = Math.cos(particle.angle + Date.now() * 0.001) * 20;
            const offsetY = Math.sin(particle.angle + Date.now() * 0.001) * 20;
            
            particle.x = centerX + Math.cos(particle.angle) * particle.distance + offsetX;
            particle.y = centerY + Math.sin(particle.angle) * particle.distance + offsetY;
            
            // Pulsing opacity effect
            particle.currentOpacity = particle.opacity * (0.5 + 0.5 * Math.sin(Date.now() * 0.003 + particle.id));
        });

        // Update particle positions
        particleGroup
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('opacity', d => d.currentOpacity);

        requestAnimationFrame(animate);
    }

    // Start animation
    animate();

    // Add some shooting stars effect
    function createShootingStar() {
        const startAngle = Math.random() * 2 * Math.PI;
        const startDistance = 100 + Math.random() * 30; // Adjusted for mobile
        const startX = centerX + Math.cos(startAngle) * startDistance;
        const startY = centerY + Math.sin(startAngle) * startDistance;
        
        const endAngle = startAngle + (Math.random() - 0.5) * Math.PI;
        const endDistance = 30 + Math.random() * 30; // Adjusted for mobile
        const endX = centerX + Math.cos(endAngle) * endDistance;
        const endY = centerY + Math.sin(endAngle) * endDistance;

        const star = svg.append('circle')
            .attr('r', 2)
            .attr('fill', '#ffffff')
            .attr('opacity', 0.8)
            .attr('cx', startX)
            .attr('cy', startY)
            .style('filter', 'blur(1px)');

        star.transition()
            .duration(2000)
            .attr('cx', endX)
            .attr('cy', endY)
            .attr('opacity', 0)
            .remove();
    }

    // Create shooting stars periodically
    setInterval(createShootingStar, 3000 + Math.random() * 2000);
    
    // Add resize listener only once
    if (!particleEffectInitialized) {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                initParticleEffect();
            }, 300);
        });
        particleEffectInitialized = true;
    }
}

// Animated Chord Diagram Logo
function initChordLogo() {
    const svg = d3.select("#chord-logo");
    const width = 45;
    const height = 45;
    const radius = Math.min(width, height) / 2 - 2;
    
    // Updated color palette with warm tones - same as contact section
    const colors = [
        '#f26223', '#ffdd89', '#9ca3af', '#ffffff', 
        '#f26223', '#ffdd89', '#6b7280', '#f3f4f6'
    ];
    
    const g = svg.append('g')
        .attr('transform', `translate(${width/2}, ${height/2})`);
    
    // Generate random matrix data
    function generateRandomData() {
        const size = 6;
        const matrix = [];
        for (let i = 0; i < size; i++) {
            matrix[i] = [];
            for (let j = 0; j < size; j++) {
                if (i === j) {
                    matrix[i][j] = 0;
                } else {
                    matrix[i][j] = Math.random() * 15 + 5;
                }
            }
        }
        return matrix;
    }
    
    let currentData = generateRandomData();
    
    // Create chord layout
    const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending);
    
    const arc = d3.arc()
        .innerRadius(radius - 8)
        .outerRadius(radius - 3);
    
    const ribbon = d3.ribbon()
        .radius(radius - 8);
    
    function updateChord(data) {
        const chords = chord(data);
        
        // Update groups (outer arcs)
        const groups = g.selectAll('.group')
            .data(chords.groups, d => d.index);
        
        groups.exit().remove();
        
        const groupsEnter = groups.enter()
            .append('g')
            .attr('class', 'group');
        
        groupsEnter.append('path')
            .attr('class', 'group-arc');
        
        const groupsUpdate = groupsEnter.merge(groups);
        
        groupsUpdate.select('.group-arc')
            .transition()
            .duration(1500)
            .ease(d3.easeQuadInOut)
            .attr('d', arc)
            .attr('fill', (d, i) => colors[i % colors.length])
            .attr('opacity', 0.8);
        
        // Update ribbons (connections)
        const ribbons = g.selectAll('.ribbon')
            .data(chords, d => `${d.source.index}-${d.target.index}`);
        
        ribbons.exit()
            .transition()
            .duration(500)
            .attr('opacity', 0)
            .remove();
        
        const ribbonsEnter = ribbons.enter()
            .append('path')
            .attr('class', 'ribbon')
            .attr('opacity', 0);
        
        const ribbonsUpdate = ribbonsEnter.merge(ribbons);
        
        ribbonsUpdate
            .transition()
            .duration(1500)
            .ease(d3.easeQuadInOut)
            .attr('d', ribbon)
            .attr('fill', d => colors[d.source.index % colors.length])
            .attr('opacity', 0.6);
    }
    
    // Initial render
    updateChord(currentData);
    
    // Animate data changes
    function animateData() {
        // Generate new data with smooth transitions
        const newData = generateRandomData();
        
        // Smooth transition between old and new data
        const transitionSteps = 30;
        let step = 0;
        
        const animateStep = () => {
            if (step >= transitionSteps) {
                currentData = newData;
                // Schedule next animation
                setTimeout(animateData, 3000 + Math.random() * 2000);
                return;
            }
            
            const t = step / transitionSteps;
            const interpolatedData = currentData.map((row, i) => 
                row.map((value, j) => {
                    const newValue = newData[i][j];
                    return value + (newValue - value) * t;
                })
            );
            
            updateChord(interpolatedData);
            step++;
            
            setTimeout(animateStep, 50);
        };
        
        animateStep();
    }
    
    // Start animation cycle
    setTimeout(animateData, 2000);
    
    // Add subtle pulsing effect
    const pulseAnimation = () => {
        g.transition()
            .duration(2000)
            .attr('transform', `translate(${width/2}, ${height/2}) scale(1.05)`)
            .transition()
            .duration(2000)
            .attr('transform', `translate(${width/2}, ${height/2}) scale(1)`)
            .on('end', pulseAnimation);
    };
    
    // Start pulse after a delay
    setTimeout(pulseAnimation, 5000);
}

// Large Chord Diagram for Contact Section
function initContactChord() {
    const svgElement = d3.select("#chord-contact");
    
    // Function to calculate responsive dimensions
    function getResponsiveDimensions() {
        const screenWidth = window.innerWidth;
        const maxWidth = Math.min(screenWidth - 40, 500); // 20px margin on each side, max 500px
        const size = Math.max(maxWidth, 280); // Minimum size of 280px
        
        return {
            width: size,
            height: size,
            radius: Math.min(size, size) / 2 - 20
        };
    }
    
    let dimensions = getResponsiveDimensions();
    let { width, height, radius } = dimensions;
    
    // Set initial SVG dimensions
    svgElement
        .attr('width', width)
        .attr('height', height);
    
    // Updated color palette with warm tones
    const colors = [
        '#f26223', '#ffdd89', '#9ca3af', '#ffffff', 
        '#f26223', '#ffdd89', '#6b7280', '#f3f4f6',
        '#f26223', '#ffdd89', '#9ca3af', '#ffffff'
    ];
    
    const g = svgElement.append('g')
        .attr('transform', `translate(${width/2}, ${height/2})`);
    
    // Generate random matrix data with more complexity
    function generateRandomData() {
        const size = 8; // Increased size for more complexity
        const matrix = [];
        for (let i = 0; i < size; i++) {
            matrix[i] = [];
            for (let j = 0; j < size; j++) {
                if (i === j) {
                    matrix[i][j] = 0;
                } else {
                    matrix[i][j] = Math.random() * 25 + 10;
                }
            }
        }
        return matrix;
    }
    
    let currentData = generateRandomData();
    
    // Create chord layout
    const chord = d3.chord()
        .padAngle(0.03)
        .sortSubgroups(d3.descending);
    
    let arc = d3.arc()
        .innerRadius(radius - 35)
        .outerRadius(radius - 12);
    
    let ribbon = d3.ribbon()
        .radius(radius - 35);
    
    function updateChord(data) {
        const chords = chord(data);
        
        // Update groups (outer arcs)
        const groups = g.selectAll('.contact-group')
            .data(chords.groups, d => d.index);
        
        groups.exit().remove();
        
        const groupsEnter = groups.enter()
            .append('g')
            .attr('class', 'contact-group');
        
        groupsEnter.append('path')
            .attr('class', 'contact-group-arc');
        
        const groupsUpdate = groupsEnter.merge(groups);
        
        groupsUpdate.select('.contact-group-arc')
            .transition()
            .duration(2000)
            .ease(d3.easeQuadInOut)
            .attr('d', arc)
            .attr('fill', (d, i) => colors[i % colors.length])
            .attr('opacity', 0.85);
        
        // Update ribbons (connections)
        const ribbons = g.selectAll('.contact-ribbon')
            .data(chords, d => `${d.source.index}-${d.target.index}`);
        
        ribbons.exit()
            .transition()
            .duration(800)
            .attr('opacity', 0)
            .remove();
        
        const ribbonsEnter = ribbons.enter()
            .append('path')
            .attr('class', 'contact-ribbon')
            .attr('opacity', 0);
        
        const ribbonsUpdate = ribbonsEnter.merge(ribbons);
        
        ribbonsUpdate
            .transition()
            .duration(2000)
            .ease(d3.easeQuadInOut)
            .attr('d', ribbon)
            .attr('fill', d => colors[d.source.index % colors.length])
            .attr('opacity', 0.7);
    }
    
    // Function to resize the chord diagram
    function resizeChord() {
        const newDimensions = getResponsiveDimensions();
        
        // Only update if dimensions actually changed
        if (newDimensions.width !== width || newDimensions.height !== height) {
            width = newDimensions.width;
            height = newDimensions.height;
            radius = newDimensions.radius;
            
            // Update SVG dimensions
            svgElement
                .attr('width', width)
                .attr('height', height);
            
            // Update group transform
            g.attr('transform', `translate(${width/2}, ${height/2})`);
            
            // Update arc and ribbon generators
            arc = d3.arc()
                .innerRadius(radius - 35)
                .outerRadius(radius - 12);
            
            ribbon = d3.ribbon()
                .radius(radius - 35);
            
            // Re-render with current data
            updateChord(currentData);
        }
    }
    
    // Add resize event listener
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeChord, 150); // Debounce resize
    });
    
    // Initial render
    updateChord(currentData);
    
    // Animate data changes with longer intervals
    function animateData() {
        const newData = generateRandomData();
        
        // Smooth transition between old and new data
        const transitionSteps = 40;
        let step = 0;
        
        const animateStep = () => {
            if (step >= transitionSteps) {
                currentData = newData;
                // Schedule next animation with longer delay
                setTimeout(animateData, 4000 + Math.random() * 3000);
                return;
            }
            
            const t = step / transitionSteps;
            const interpolatedData = currentData.map((row, i) => 
                row.map((value, j) => {
                    const newValue = newData[i][j];
                    return value + (newValue - value) * t;
                })
            );
            
            updateChord(interpolatedData);
            step++;
            
            setTimeout(animateStep, 60);
        };
        
        animateStep();
    }
    
    // Start animation cycle
    setTimeout(animateData, 3000);
}

// Navigation Scroll Spy and Active Indicator
class NavigationScrollSpy {
    constructor() {
        this.sections = [];
        this.navLinks = [];
        this.mobileNavLinks = [];
        this.navIndicator = null;
        this.currentActive = null;
        this.isScrolling = false;
        
        this.init();
    }
    
    init() {
        // Get all navigation links and sections
        this.navLinks = document.querySelectorAll('.nav-link');
        this.mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
        this.navIndicator = document.querySelector('.nav-indicator');
        
        // Get all sections
        this.navLinks.forEach(link => {
            const sectionId = link.getAttribute('data-section');
            const section = document.getElementById(sectionId);
            if (section) {
                this.sections.push({
                    id: sectionId,
                    element: section,
                    link: link
                });
            }
        });
        
        // Set up intersection observer for scroll spy
        this.setupScrollSpy();
        
        // Set up click handlers for both desktop and mobile
        this.setupClickHandlers();
        
        // Set initial active state
        this.setActiveSection('home');
    }
    
    setupScrollSpy() {
        const options = {
            root: null,
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0
        };
        
        const observer = new IntersectionObserver((entries) => {
            if (this.isScrolling) return;
            
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;
                    this.setActiveSection(sectionId);
                }
            });
        }, options);
        
        // Observe all sections
        this.sections.forEach(section => {
            observer.observe(section.element);
        });
    }
    
    setupClickHandlers() {
        // Desktop navigation
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');
                this.handleNavigation(sectionId);
            });
        });
        
        // Mobile navigation
        this.mobileNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');
                this.handleNavigation(sectionId);
                // Close mobile menu
                this.closeMobileMenu();
            });
        });
    }
    
    handleNavigation(sectionId) {
        const section = document.getElementById(sectionId);
        
        if (section) {
            this.isScrolling = true;
            this.setActiveSection(sectionId);
            
            // Smooth scroll to section
            section.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Re-enable scroll spy after scrolling is complete
            setTimeout(() => {
                this.isScrolling = false;
            }, 1000);
        }
    }
    
    closeMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        const hamburgerButton = document.getElementById('mobile-menu-button');
        
        if (mobileMenu) {
            mobileMenu.classList.remove('show');
        }
        
        if (hamburgerButton) {
            hamburgerButton.classList.remove('hamburger-open');
        }
    }
    
    setActiveSection(sectionId) {
        if (this.currentActive === sectionId) return;
        
        this.currentActive = sectionId;
        
        // Remove active class from all links (desktop and mobile)
        this.navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        this.mobileNavLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current links
        const activeDesktopLink = document.querySelector(`[data-section="${sectionId}"].nav-link`);
        const activeMobileLink = document.querySelector(`[data-section="${sectionId}"].mobile-nav-link`);
        
        if (activeDesktopLink) {
            activeDesktopLink.classList.add('active');
            this.positionIndicator(activeDesktopLink);
        }
        
        if (activeMobileLink) {
            activeMobileLink.classList.add('active');
        }
    }
    
    positionIndicator(activeLink) {
        if (!this.navIndicator || !activeLink) return;
        
        const linkRect = activeLink.getBoundingClientRect();
        const containerRect = activeLink.parentElement.getBoundingClientRect();
        
        const left = linkRect.left - containerRect.left;
        const width = linkRect.width;
        
        this.navIndicator.style.left = `${left}px`;
        this.navIndicator.style.width = `${width}px`;
        this.navIndicator.classList.add('active');
    }
}

// Mobile Menu Handler
class MobileMenuHandler {
    constructor() {
        this.mobileMenuButton = document.getElementById('mobile-menu-button');
        this.mobileMenu = document.getElementById('mobile-menu');
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        if (!this.mobileMenuButton || !this.mobileMenu) return;
        
        // Handle hamburger button click
        this.mobileMenuButton.addEventListener('click', () => {
            this.toggleMenu();
        });
        
        // Handle backdrop click (clicking outside the menu)
        this.mobileMenu.addEventListener('click', (e) => {
            if (e.target === this.mobileMenu) {
                this.closeMenu();
            }
        });
        
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });
    }
    
    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    openMenu() {
        this.mobileMenu.classList.add('show');
        this.mobileMenuButton.classList.add('hamburger-open');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
        this.isOpen = true;
    }
    
    closeMenu() {
        this.mobileMenu.classList.remove('show');
        this.mobileMenuButton.classList.remove('hamburger-open');
        document.body.style.overflow = ''; // Restore background scroll
        this.isOpen = false;
    }
}

// Hero Intro Typing Animation
class HeroIntroAnimation {
    constructor() {
        this.textElement = document.getElementById('hero-intro-text');
        this.containerElement = document.getElementById('hero-intro-container');
        
        this.messages = [
            { hello: "Hello,", normal: " I'm ", highlight: "Dipak" },
            { hello: "Hello,", normal: " I'm from ", highlight: "Dublin" },
            { hello: "Hello,", normal: " I work at ", highlight: "AWS" }
        ];
        
        this.currentIndex = 0;
        this.isAnimating = false;
        this.pauseDelay = 2000;
        this.flipDelay = 600;
        
        this.init();
    }
    
    init() {
        if (!this.textElement) return;
        
        // Start the animation sequence
        this.startSequence();
    }
    
    startSequence() {
        this.typeMessage(this.messages[this.currentIndex]);
    }
    
    typeMessage(message) {
        this.isAnimating = true;
        this.textElement.className = 'hero-intro-text flip-in';
        
        // Create the full text with proper styling - Hello bold, normal text, and highlighted text
        const fullText = `<span class="intro-hello">${message.hello}</span><span class="intro-normal">${message.normal}</span><span class="intro-highlight">${message.highlight}</span>`;
        
        // Set the text content immediately
        this.textElement.innerHTML = fullText;
        
        // Animation complete
        this.isAnimating = false;
        setTimeout(() => {
            this.flipAndNext();
        }, this.pauseDelay);
    }
    
    flipAndNext() {
        // Use flip-out animation
        this.textElement.className = 'hero-intro-text flip-out';
        
        // Move to next message after flip out
        setTimeout(() => {
            // Reset styles
            this.textElement.style.transform = '';
            this.textElement.style.opacity = '';
            
            // Move to next message
            this.currentIndex = (this.currentIndex + 1) % this.messages.length;
            
            // Start next message
            setTimeout(() => {
                this.startSequence();
            }, 200);
        }, this.flipDelay);
    }
    
    destroy() {
        // Clean up if needed
        if (this.textElement) {
            this.textElement.innerHTML = '';
        }
    }
}

// Initialize navigation scroll spy when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NavigationScrollSpy();
    new MobileMenuHandler();
    new HeroIntroAnimation();
    // Small delay to ensure D3 is loaded
    setTimeout(initParticleEffect, 100);
    setTimeout(initTitleWaves, 200);
    setTimeout(initChordLogo, 300);
    setTimeout(initContactChord, 400);
});

// Title Wave Effects using D3.js
function initTitleWaves() {
    const titleWaves = document.querySelectorAll('.title-wave');
    
    titleWaves.forEach((waveContainer, index) => {
        const svg = d3.select(waveContainer);
        const width = waveContainer.getBoundingClientRect().width;
        const height = 80;
        const centerY = height / 2;
        
        // Set SVG dimensions
        svg.attr('viewBox', `0 0 ${width} ${height}`);
        
        // Create wave data points
        const numPoints = Math.floor(width / 8); // Wave resolution
        const waveData = d3.range(numPoints).map(i => ({
            x: (i / (numPoints - 1)) * width,
            baseY: centerY,
            amplitude: 0,
            frequency: 0.02 + Math.random() * 0.01,
            phase: Math.random() * Math.PI * 2,
            randomOffset: 0
        }));
        
        // Create gradient for wave
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', `wave-gradient-${index}`)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', width).attr('y2', 0);
            
        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#3b82f6')
            .attr('stop-opacity', 0);
            
        gradient.append('stop')
            .attr('offset', '20%')
            .attr('stop-color', '#8b5cf6')
            .attr('stop-opacity', 0.6);
            
        gradient.append('stop')
            .attr('offset', '50%')
            .attr('stop-color', '#06b6d4')
            .attr('stop-opacity', 0.8);
            
        gradient.append('stop')
            .attr('offset', '80%')
            .attr('stop-color', '#8b5cf6')
            .attr('stop-opacity', 0.6);
            
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#3b82f6')
            .attr('stop-opacity', 0);
        
        // Line generator for smooth curves
        const line = d3.line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveBasis);
        
        // Create multiple wave layers for depth
        const waveLayers = [];
        for (let layer = 0; layer < 3; layer++) {
            const wavePath = svg.append('path')
                .attr('fill', 'none')
                .attr('stroke', `url(#wave-gradient-${index})`)
                .attr('stroke-width', 2 - layer * 0.5)
                .attr('opacity', 0.8 - layer * 0.2)
                .style('filter', 'blur(0.5px)');
            
            waveLayers.push({
                path: wavePath,
                data: waveData.map(d => ({...d})),
                layerOffset: layer * 0.3
            });
        }
        
        // Heartbeat pulse timing
        let heartbeatPhase = 0;
        let lastHeartbeat = 0;
        const heartbeatInterval = 2000; // 2 seconds between heartbeats
        
        // Animation variables
        let animationTime = 0;
        let randomPulses = [];
        
        // Generate random pulse events
        function generateRandomPulse() {
            if (Math.random() < 0.1) { // 10% chance each frame
                randomPulses.push({
                    startTime: animationTime,
                    position: Math.random() * width,
                    intensity: 0.5 + Math.random() * 1.5,
                    duration: 500 + Math.random() * 1000
                });
            }
            
            // Clean up old pulses
            randomPulses = randomPulses.filter(pulse => 
                animationTime - pulse.startTime < pulse.duration
            );
        }
        
        // Animation function
        function animateWaves() {
            animationTime += 16; // ~60fps
            
            // Smooth heartbeat logic with easing
            const timeSinceLastHeartbeat = animationTime - lastHeartbeat;
            let heartbeatAmplitude = 0;
            
            if (timeSinceLastHeartbeat >= heartbeatInterval) {
                lastHeartbeat = animationTime;
            }
            
            // Create smooth double-beat heartbeat pattern with easing
            const beatPhase = (animationTime - lastHeartbeat) / heartbeatInterval;
            
            // First beat - smooth rise and fall
            if (beatPhase >= 0 && beatPhase < 0.15) {
                const phase1 = beatPhase / 0.15;
                // Use smooth easing function
                const eased = 0.5 * (1 - Math.cos(phase1 * Math.PI));
                heartbeatAmplitude = Math.sin(eased * Math.PI) * 12;
            }
            // Second beat - smooth rise and fall
            else if (beatPhase >= 0.2 && beatPhase < 0.32) {
                const phase2 = (beatPhase - 0.2) / 0.12;
                // Use smooth easing function
                const eased = 0.5 * (1 - Math.cos(phase2 * Math.PI));
                heartbeatAmplitude = Math.sin(eased * Math.PI) * 8;
            }
            // Gentle decay between beats
            else if (beatPhase >= 0.32 && beatPhase < 0.5) {
                const decayPhase = (beatPhase - 0.32) / 0.18;
                heartbeatAmplitude = Math.exp(-decayPhase * 3) * 2;
            }
            
            // Generate random pulses
            generateRandomPulse();
            
            // Update wave layers with smooth transitions
            waveLayers.forEach((layer, layerIndex) => {
                layer.data.forEach((point, i) => {
                    // Start with smooth heartbeat amplitude
                    let amplitude = heartbeatAmplitude * (1 - layerIndex * 0.2);
                    
                    // Add gentle base wave motion
                    const baseWave = Math.sin(animationTime * 0.003 + point.phase + layerIndex * 0.5) * 2;
                    amplitude += baseWave;
                    
                    // Add smooth random pulses
                    randomPulses.forEach(pulse => {
                        const distance = Math.abs(point.x - pulse.position);
                        const pulseProgress = (animationTime - pulse.startTime) / pulse.duration;
                        
                        if (distance < 120 && pulseProgress < 1) {
                            // Smooth pulse with gradual falloff
                            const distanceDecay = Math.exp(-distance / 60);
                            const timeDecay = Math.sin(pulseProgress * Math.PI);
                            const smoothPulse = pulse.intensity * distanceDecay * timeDecay * 6;
                            amplitude += smoothPulse;
                        }
                    });
                    
                    // Create gentle center wave spreading
                    const distanceFromCenter = Math.abs(point.x - width / 2);
                    const centerWave = Math.sin(animationTime * 0.006 - distanceFromCenter * 0.015) * 
                        Math.exp(-distanceFromCenter / (width * 0.8)) * 3;
                    
                    amplitude += centerWave;
                    
                    // Add subtle breathing effect
                    const breathingWave = Math.sin(animationTime * 0.001) * 1.5;
                    amplitude += breathingWave;
                    
                    // Smooth the final amplitude to prevent jumps
                    if (!point.previousAmplitude) point.previousAmplitude = 0;
                    const smoothedAmplitude = point.previousAmplitude + (amplitude - point.previousAmplitude) * 0.1;
                    point.previousAmplitude = smoothedAmplitude;
                    
                    point.y = point.baseY + smoothedAmplitude;
                });
                
                // Update path
                layer.path.attr('d', line(layer.data));
            });
            
            requestAnimationFrame(animateWaves);
        }
        
        // Start animation with a slight delay for each title
        setTimeout(() => animateWaves(), index * 200);
    });
}
