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

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Particle Effect using D3.js
function initParticleEffect() {
    const svg = d3.select("#particle-container");
    const width = 320;
    const height = 320;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 160; // Radius around the profile image

    // Create particles data
    const numParticles = 50;
    const particles = d3.range(numParticles).map(d => ({
        id: d,
        angle: Math.random() * 2 * Math.PI,
        distance: 80 + Math.random() * 80, // Distance from center
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
        const startDistance = 120 + Math.random() * 40;
        const startX = centerX + Math.cos(startAngle) * startDistance;
        const startY = centerY + Math.sin(startAngle) * startDistance;
        
        const endAngle = startAngle + (Math.random() - 0.5) * Math.PI;
        const endDistance = 40 + Math.random() * 40;
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
}

// Initialize particle effect when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure D3 is loaded
    setTimeout(initParticleEffect, 100);
    setTimeout(initTitleWaves, 200);
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
