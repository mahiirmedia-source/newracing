
        // --- 1. Sound Synthesis Engine (Web Audio API) ---
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        const Sounds = {
            playBounce: (velocity) => {
                if (audioCtx.state === 'suspended') return;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                // Map velocity to frequency and volume
                const freq = Math.min(800, 300 + velocity * 50);
                const vol = Math.min(0.2, velocity * 0.02);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);

                gain.gain.setValueAtTime(vol, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.1);
            },

            playEliminate: () => {
                if (audioCtx.state === 'suspended') return;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(400, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);

                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.5);
            },

            playWin: () => {
                if (audioCtx.state === 'suspended') return;
                [440, 554.37, 659.25, 880].forEach((freq, i) => { // A Major arpeggio
                    setTimeout(() => {
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.type = 'square';
                        osc.frequency.value = freq;
                        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        osc.start();
                        osc.stop(audioCtx.currentTime + 1);
                    }, i * 150);
                });
            }
        };

        // --- 2. Game Setup & Data ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        let width, height, cx, cy;
        let arenaRadius = 0;
        let gapAngle = 0; // The angle where the gap starts
        let gapSize = Math.PI / 8; // Start small
        let arenaRotationSpeed = 0.02;
        let countdownInterval = null; // Used for the auto-restart timer
        let roundStartTime = 0; // To track 50-second round limit

        // List of countries to participate (First 150 ISO 3166-1 alpha-2 country codes)
        const countryCodes = [
            'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
        ].slice(0, 150);

        // Explicit names to avoid Intl API issues
        const COUNTRY_NAMES = {
            'AD': 'Andorra', 'AE': 'United Arab Emirates', 'AF': 'Afghanistan', 'AG': 'Antigua & Barbuda', 'AI': 'Anguilla',
            'AL': 'Albania', 'AM': 'Armenia', 'AO': 'Angola', 'AQ': 'Antarctica', 'AR': 'Argentina',
            'AS': 'American Samoa', 'AT': 'Austria', 'AU': 'Australia', 'AW': 'Aruba', 'AX': 'Åland Islands',
            'AZ': 'Azerbaijan', 'BA': 'Bosnia & Herzegovina', 'BB': 'Barbados', 'BD': 'Bangladesh', 'BE': 'Belgium',
            'BF': 'Burkina Faso', 'BG': 'Bulgaria', 'BH': 'Bahrain', 'BI': 'Burundi', 'BJ': 'Benin',
            'BL': 'St. Barthélemy', 'BM': 'Bermuda', 'BN': 'Brunei', 'BO': 'Bolivia', 'BQ': 'Caribbean Netherlands',
            'BR': 'Brazil', 'BS': 'Bahamas', 'BT': 'Bhutan', 'BV': 'Bouvet Island', 'BW': 'Botswana',
            'BY': 'Belarus', 'BZ': 'Belize', 'CA': 'Canada', 'CC': 'Cocos Islands', 'CD': 'Congo - Kinshasa',
            'CF': 'Central African Republic', 'CG': 'Congo - Brazzaville', 'CH': 'Switzerland', 'CI': 'Côte d’Ivoire', 'CK': 'Cook Islands',
            'CL': 'Chile', 'CM': 'Cameroon', 'CN': 'China', 'CO': 'Colombia', 'CR': 'Costa Rica',
            'CU': 'Cuba', 'CV': 'Cape Verde', 'CW': 'Curaçao', 'CX': 'Christmas Island', 'CY': 'Cyprus',
            'CZ': 'Czechia', 'DE': 'Germany', 'DJ': 'Djibouti', 'DK': 'Denmark', 'DM': 'Dominica',
            'DO': 'Dominican Republic', 'DZ': 'Algeria', 'EC': 'Ecuador', 'EE': 'Estonia', 'EG': 'Egypt',
            'EH': 'Western Sahara', 'ER': 'Eritrea', 'ES': 'Spain', 'ET': 'Ethiopia', 'FI': 'Finland',
            'FJ': 'Fiji', 'FK': 'Falkland Islands', 'FM': 'Micronesia', 'FO': 'Faroe Islands', 'FR': 'France',
            'GA': 'Gabon', 'GB': 'United Kingdom', 'GD': 'Grenada', 'GE': 'Georgia', 'GF': 'French Guiana',
            'GG': 'Guernsey', 'GH': 'Ghana', 'GI': 'Gibraltar', 'GL': 'Greenland', 'GM': 'Gambia',
            'GN': 'Guinea', 'GP': 'Guadeloupe', 'GQ': 'Equatorial Guinea', 'GR': 'Greece', 'GS': 'South Georgia',
            'GT': 'Guatemala', 'GU': 'Guam', 'GW': 'Guinea-Bissau', 'GY': 'Guyana', 'HK': 'Hong Kong',
            'HM': 'Heard & McDonald', 'HN': 'Honduras', 'HR': 'Croatia', 'HT': 'Haiti', 'HU': 'Hungary',
            'ID': 'Indonesia', 'IE': 'Ireland', 'IL': 'Israel', 'IM': 'Isle of Man', 'IN': 'India',
            'IO': 'British Indian Ocean Territory', 'IQ': 'Iraq', 'IR': 'Iran', 'IS': 'Iceland', 'IT': 'Italy',
            'JE': 'Jersey', 'JM': 'Jamaica', 'JO': 'Jordan', 'JP': 'Japan', 'KE': 'Kenya',
            'KG': 'Kyrgyzstan', 'KH': 'Cambodia', 'KI': 'Kiribati', 'KM': 'Comoros', 'KN': 'St. Kitts & Nevis',
            'KP': 'North Korea', 'KR': 'South Korea', 'KW': 'Kuwait', 'KY': 'Cayman Islands', 'KZ': 'Kazakhstan',
            'LA': 'Laos', 'LB': 'Lebanon', 'LC': 'St. Lucia', 'LI': 'Liechtenstein', 'LK': 'Sri Lanka',
            'LR': 'Liberia', 'LS': 'Lesotho', 'LT': 'Lithuania', 'LU': 'Luxembourg', 'LV': 'Latvia',
            'LY': 'Libya', 'MA': 'Morocco', 'MC': 'Monaco', 'MD': 'Moldova', 'ME': 'Montenegro',
            'MF': 'St. Martin', 'MG': 'Madagascar', 'MH': 'Marshall Islands', 'MK': 'North Macedonia', 'ML': 'Mali',
            'MM': 'Myanmar', 'MN': 'Mongolia', 'MO': 'Macau', 'MP': 'Northern Mariana Islands', 'MQ': 'Martinique',
            'MR': 'Mauritania', 'MS': 'Montserrat', 'MT': 'Malta', 'MU': 'Mauritius', 'MV': 'Maldives',
            'MW': 'Malawi', 'MX': 'Mexico', 'MY': 'Malaysia', 'MZ': 'Mozambique', 'NA': 'Namibia',
            'NC': 'New Caledonia', 'NE': 'Niger', 'NF': 'Norfolk Island', 'NG': 'Nigeria', 'NI': 'Nicaragua',
            'NL': 'Netherlands', 'NO': 'Norway', 'NP': 'Nepal', 'NR': 'Nauru', 'NU': 'Niue',
            'NZ': 'New Zealand', 'OM': 'Oman', 'PA': 'Panama', 'PE': 'Peru', 'PF': 'French Polynesia',
            'PG': 'Papua New Guinea', 'PH': 'Philippines', 'PK': 'Pakistan', 'PL': 'Poland', 'PM': 'St. Pierre & Miquelon',
            'PN': 'Pitcairn Islands', 'PR': 'Puerto Rico', 'PS': 'Palestine', 'PT': 'Portugal', 'PW': 'Palau',
            'PY': 'Paraguay', 'QA': 'Qatar', 'RE': 'Réunion', 'RO': 'Romania', 'RS': 'Serbia',
            'RU': 'Russia', 'RW': 'Rwanda', 'SA': 'Saudi Arabia', 'SB': 'Solomon Islands', 'SC': 'Seychelles',
            'SD': 'Sudan', 'SE': 'Sweden', 'SG': 'Singapore', 'SH': 'St. Helena', 'SI': 'Slovenia',
            'SJ': 'Svalbard & Jan Mayen', 'SK': 'Slovakia', 'SL': 'Sierra Leone', 'SM': 'San Marino', 'SN': 'Senegal',
            'SO': 'Somalia', 'SR': 'Suriname', 'SS': 'South Sudan', 'ST': 'São Tomé & Príncipe', 'SV': 'El Salvador',
            'SX': 'Sint Maarten', 'SY': 'Syria', 'SZ': 'Eswatini', 'TC': 'Turks & Caicos', 'TD': 'Chad',
            'TF': 'French Southern Territories', 'TG': 'Togo', 'TH': 'Thailand', 'TJ': 'Tajikistan', 'TK': 'Tokelau',
            'TL': 'Timor-Leste', 'TM': 'Turkmenistan', 'TN': 'Tunisia', 'TO': 'Tonga', 'TR': 'Turkey',
            'TT': 'Trinidad & Tobago', 'TV': 'Tuvalu', 'TW': 'Taiwan', 'TZ': 'Tanzania', 'UA': 'Ukraine',
            'UG': 'Uganda', 'UM': 'U.S. Outlying Islands', 'US': 'United States', 'UY': 'Uruguay', 'UZ': 'Uzbekistan',
            'VA': 'Vatican City', 'VC': 'St. Vincent & Grenadines', 'VE': 'Venezuela', 'VG': 'British Virgin Islands', 'VI': 'U.S. Virgin Islands',
            'VN': 'Vietnam', 'VU': 'Vanuatu', 'WF': 'Wallis & Futuna', 'WS': 'Samoa', 'YE': 'Yemen',
            'YT': 'Mayotte', 'ZA': 'South Africa', 'ZM': 'Zambia', 'ZW': 'Zimbabwe'
        };

        let balls = [];
        let eliminated = [];
        let gameActive = false;
        let winCounts = {}; // Track wins across all rounds

        class Ball {
            constructor(code) {
                this.code = code;
                this.targetRadius = 12; // EXACT same radius for all of them
                this.radius = 0; // Start at 0 for spawn animation
                this.baseRadius = this.targetRadius;

                // Spawn randomly inside the arena
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * (arenaRadius - this.targetRadius - 20);
                this.x = cx + Math.cos(angle) * dist;
                this.y = cy + Math.sin(angle) * dist;

                // Random velocity (Slower)
                const speed = Math.random() * 1 + 0.5; // 0.5 to 1.5 pixels per frame
                const vAngle = Math.random() * Math.PI * 2;
                this.vx = Math.cos(vAngle) * speed;
                this.vy = Math.sin(vAngle) * speed;

                this.mass = this.targetRadius;
                this.isEliminated = false;
                this.boostTime = 0;

                // Load flag image
                this.img = new Image();
                this.img.src = `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
                this.imgLoaded = false;
                this.img.onload = () => this.imgLoaded = true;
            }

            draw() {
                // If the image hasn't loaded yet, don't draw anything (no flash of text)
                if (!this.imgLoaded) return;

                if (this.isEliminated && this.radius < 1) return;

                // Smooth scale-in animation on spawn
                if (!this.isEliminated && this.radius < this.targetRadius && this.boostTime === 0) {
                    this.radius += (this.targetRadius - this.radius) * 0.1;
                }

                ctx.save();
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

                // Boost effect
                if (this.boostTime > 0) {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = '#00ffff';
                    ctx.strokeStyle = '#00ffff';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }

                ctx.clip();

                if (this.imgLoaded) {
                    // Draw image covering the circle
                    ctx.drawImage(this.img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                }

                // Add 3D Shading sphere overlay
                const gradient = ctx.createRadialGradient(
                    this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.1,
                    this.x, this.y, this.radius
                );
                // Top-left shiny highlight tapering off into a darker bottom-right shadow
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
                gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
                gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.3)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }

            update() {
                if (this.isEliminated) {
                    // Shrink and fall animation
                    this.radius *= 0.9;
                    this.x += this.vx;
                    this.y += this.vy;
                    return;
                }

                // Handle boost duration
                if (this.boostTime > 0) {
                    this.boostTime--;
                    if (this.boostTime <= 0) {
                        this.targetRadius = this.baseRadius; // Reset size smoothly 
                    }
                    if (this.radius < this.targetRadius) {
                        this.radius += (this.targetRadius - this.radius) * 0.1;
                    }
                } else if (!this.isEliminated && this.radius > this.targetRadius) {
                    // Smoothly shrink back from boost
                    this.radius += (this.targetRadius - this.radius) * 0.1;
                }

                // Keep ball moving at a minimum speed so it never stops
                const currentSpeedBefore = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (currentSpeedBefore < 0.5) {
                    const scaleStr = currentSpeedBefore === 0 ? 1 : (0.5 / currentSpeedBefore);
                    this.vx = (this.vx || 1) * scaleStr;
                    this.vy = (this.vy || 1) * scaleStr;
                }

                this.x += this.vx;
                this.y += this.vy;

                // Boundary Collision (Circular Arena)
                const dx = this.x - cx;
                const dy = this.y - cy;
                const distFromCenter = Math.sqrt(dx * dx + dy * dy);

                if (distFromCenter + this.radius >= arenaRadius) {
                    // Calculate angle of the ball relative to center
                    let ballAngle = Math.atan2(dy, dx);
                    if (ballAngle < 0) ballAngle += Math.PI * 2;

                    // Normalize gap angles (gap rotates)
                    let normalizedGapStart = gapAngle % (Math.PI * 2);
                    if (normalizedGapStart < 0) normalizedGapStart += Math.PI * 2;
                    let normalizedGapEnd = (normalizedGapStart + gapSize) % (Math.PI * 2);

                    let inGap = false;
                    if (gapSize >= Math.PI * 1.99) {
                        // If the gap has opened entirely, the ball falls out no matter its angle
                        inGap = true;
                    } else if (normalizedGapStart < normalizedGapEnd) {
                        inGap = ballAngle >= normalizedGapStart && ballAngle <= normalizedGapEnd;
                    } else {
                        // Gap crosses the 0 radian line
                        inGap = ballAngle >= normalizedGapStart || ballAngle <= normalizedGapEnd;
                    }

                    if (inGap) {
                        // Eliminate!
                        this.isEliminated = true;
                        Sounds.playEliminate();
                        addEliminatedUI(this.code, this.img.src);
                        checkWinCondition();
                    } else {
                        // Reflect vector based on circle normal
                        const nx = dx / distFromCenter;
                        const ny = dy / distFromCenter;

                        // Dot product of velocity and normal
                        const dot = this.vx * nx + this.vy * ny;

                        // Bounce only if moving towards the wall
                        if (dot > 0) {
                            this.vx -= 2 * dot * nx;
                            this.vy -= 2 * dot * ny;

                            // Remove energy gain from walls so they don't constantly get faster
                            this.vx *= 1.0;
                            this.vy *= 1.0;

                            // Prevent infinite speed 
                            const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                            if (currentSpeed > 3) {
                                this.vx = (this.vx / currentSpeed) * 3;
                                this.vy = (this.vy / currentSpeed) * 3;
                            }

                            // Keep inside
                            this.x = cx + nx * (arenaRadius - this.radius);
                            this.y = cy + ny * (arenaRadius - this.radius);

                            Sounds.playBounce(currentSpeed);
                        }
                    }
                }
            }

            boost() {
                if (this.isEliminated) return;
                this.boostTime = 180; // 3 seconds at 60fps
                this.targetRadius = this.baseRadius * 1.5; // Grow 50%
                // Increase speed towards center slightly to avoid walls
                const dx = cx - this.x;
                const dy = cy - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    this.vx += (dx / dist) * 2;
                    this.vy += (dy / dist) * 2;
                }
            }
        }

        // --- 3. Physics & Math Helpers ---
        function resolveCollisions() {
            for (let i = 0; i < balls.length; i++) {
                for (let j = i + 1; j < balls.length; j++) {
                    const b1 = balls[i];
                    const b2 = balls[j];
                    if (b1.isEliminated || b2.isEliminated) continue;

                    const dx = b2.x - b1.x;
                    const dy = b2.y - b1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = b1.radius + b2.radius;

                    if (dist < minDist) {
                        // 1. Separate them to prevent sticking
                        const overlap = minDist - dist;
                        const nx = dx / dist;
                        const ny = dy / dist;

                        // Move each ball half the overlap distance away
                        b1.x -= nx * (overlap / 2);
                        b1.y -= ny * (overlap / 2);
                        b2.x += nx * (overlap / 2);
                        b2.y += ny * (overlap / 2);

                        // 2. Elastic collision response
                        const normalX = nx;
                        const normalY = ny;

                        // Relative velocity
                        const rvx = b2.vx - b1.vx;
                        const rvy = b2.vy - b1.vy;

                        // Velocity along normal
                        const velAlongNormal = rvx * normalX + rvy * normalY;

                        // Do not resolve if velocities are separating
                        if (velAlongNormal > 0) continue;

                        // Restitution (bounciness) - 1.0 means perfectly elastic so they don't lose energy
                        const e = 1.0;

                        // Impulse scalar
                        let jImpulse = -(1 + e) * velAlongNormal;
                        jImpulse /= (1 / b1.mass) + (1 / b2.mass);

                        // Apply impulse
                        const impulseX = jImpulse * normalX;
                        const impulseY = jImpulse * normalY;

                        b1.vx -= (1 / b1.mass) * impulseX;
                        b1.vy -= (1 / b1.mass) * impulseY;
                        b2.vx += (1 / b2.mass) * impulseX;
                        b2.vy += (1 / b2.mass) * impulseY;

                        const speed = Math.sqrt(b1.vx * b1.vx + b1.vy * b1.vy);
                        if (speed > 2) Sounds.playBounce(speed);
                    }
                }
            }
        }

        // --- 4. Main Game Loop & Rendering ---
        function resize() {
            const container = document.getElementById('app-container');
            width = canvas.width = container.clientWidth;
            height = canvas.height = container.clientHeight;
            cx = width / 2;
            cy = height / 2 + 30; // Shift down slightly to clear top UI
            // Make the circle slightly larger again (0.35 -> 0.38)
            arenaRadius = Math.min(width, height) * 0.38;
        }

        function init() {
            resize();
            gapSize = Math.PI / 8; // Reset initial gap size
            gapAngle = 0;          // Reset gap angle
            balls = countryCodes.map(code => new Ball(code));
            eliminated = [];
            document.getElementById('eliminated-list').innerHTML = '';
            gameActive = true;
            roundStartTime = Date.now();
            document.getElementById('winner-text').innerText = '';

            // Clear any active countdown timer and hide overlay on manual restart
            if (countdownInterval) clearInterval(countdownInterval);
            const overlay = document.getElementById('countdown-overlay');
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.classList.remove('flex');
            }
        }

        function drawArena() {
            ctx.lineWidth = 6;

            // Draw solid circle behind everything for background
            ctx.beginPath();
            ctx.arc(cx, cy, arenaRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(5, 8, 20, 0.4)'; // Deeper, smoother background fade
            ctx.fill();

            // Calculate gaps
            let start1 = gapAngle + gapSize;
            let end1 = gapAngle + Math.PI * 2;

            // Draw Dashed glowing line
            ctx.beginPath();
            ctx.arc(cx, cy, arenaRadius, start1, end1);
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)'; // Cyan-500 equivalent
            ctx.setLineDash([12, 12]);
            ctx.lineCap = 'round';
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
            ctx.stroke();

            // Draw red danger zone (the gap)
            ctx.beginPath();
            ctx.arc(cx, cy, arenaRadius, gapAngle, gapAngle + gapSize);
            ctx.strokeStyle = '#ef4444'; // Red-500 equivalent
            ctx.setLineDash([]);
            ctx.lineCap = 'round';
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
            ctx.stroke();

            ctx.shadowBlur = 0; // Reset
        }

        function addEliminatedUI(code, imgSrc) {
            const list = document.getElementById('eliminated-list');
            // Remove placeholder if it exists
            if (list.innerHTML.includes('Waiting')) {
                list.innerHTML = '';
            }
            const item = document.createElement('div');
            item.className = 'flex items-center gap-1.5 px-3 py-0.5 opacity-70 grayscale-[50%] transition-opacity hover:grayscale-0';
            item.innerHTML = `<img src="${imgSrc}" class="w-4 h-auto rounded-[2px] shadow-sm"> <span class="font-bold text-[10px] text-slate-300">${code}</span>`;

            // Insert at the beginning so newest is seen immediately in the CSS marquee
            list.prepend(item);
        }

        function startAutoRestartCountdown(winnerCode) {
            const overlay = document.getElementById('countdown-overlay');
            const numberEl = document.getElementById('countdown-number');
            const winnerText = document.getElementById('winner-text');
            const winnerFlag = document.getElementById('winner-flag');

            let winnerName = winnerCode;
            if (COUNTRY_NAMES[winnerCode]) {
                winnerName = COUNTRY_NAMES[winnerCode];
            } else {
                try {
                    winnerName = new Intl.DisplayNames(['en'], { type: 'region' }).of(winnerCode);
                } catch (e) { }
            }
            winnerText.innerText = winnerName;

            winnerFlag.src = `https://flagcdn.com/w160/${winnerCode.toLowerCase()}.png`;

            overlay.classList.remove('hidden');
            overlay.classList.add('flex');

            let count = 10;
            numberEl.innerText = count + 's';

            // Trigger animation for the first number
            numberEl.classList.remove('animate-pop');
            void numberEl.offsetWidth; // Trigger DOM reflow to restart animation
            numberEl.classList.add('animate-pop');

            countdownInterval = setInterval(() => {
                count--;
                if (count > 0) {
                    numberEl.innerText = count + 's';
                    // Retrigger animation
                    numberEl.classList.remove('animate-pop');
                    void numberEl.offsetWidth;
                    numberEl.classList.add('animate-pop');
                } else {
                    clearInterval(countdownInterval);
                    overlay.classList.add('hidden');
                    overlay.classList.remove('flex');
                    init(); // Auto-restart the game
                }
            }, 1000);
        }

        function checkWinCondition() {
            const alive = balls.filter(b => !b.isEliminated);
            if (alive.length === 1 && gameActive) {
                gameActive = false;
                Sounds.playWin();

                const winnerCode = alive[0].code;

                // Track win
                winCounts[winnerCode] = (winCounts[winnerCode] || 0) + 1;
                updateLeaderboardUI();

                // Start countdown 1 second after winning
                setTimeout(() => {
                    startAutoRestartCountdown(winnerCode);
                }, 1000);
            }
        }

        function updateLeaderboardUI() {
            const leaderboard = document.getElementById('leaderboard');
            leaderboard.innerHTML = '';

            // Sort by wins (descending)
            const topWinners = Object.entries(winCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3); // Get top 3

            const colors = [
                'text-amber-400', // 1st Place Gold
                'text-slate-300', // 2nd Place Silver
                'text-amber-700'  // 3rd Place Bronze
            ];

            topWinners.forEach(([code, wins], index) => {
                let countryName = code;
                if (COUNTRY_NAMES[code]) {
                    countryName = COUNTRY_NAMES[code];
                } else {
                    try {
                        countryName = new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
                    } catch (e) { }
                }

                const li = document.createElement('li');
                li.className = 'flex justify-between items-center bg-white/5 rounded px-2 py-1 animate-pop';
                li.innerHTML = `
                    <span class="flex items-center gap-2">
                        <span class="${colors[index]} font-bold w-3 text-center text-[10px]">${index + 1}</span>
                        <img src="https://flagcdn.com/w20/${code.toLowerCase()}.png" class="w-4 h-auto rounded-[2px]" />
                        <span class="text-slate-100 truncate w-16" title="${countryName}">${countryName}</span>
                    </span>
                    <span class="text-cyan-400 font-bold">${wins}<span class="text-[10px] opacity-70">W</span></span>
                `;
                leaderboard.appendChild(li);
            });
        }

        function loop() {
            // Dark trail effect for smooth motion blur
            ctx.fillStyle = 'rgba(2, 3, 7, 0.35)';
            ctx.fillRect(0, 0, width, height);

            if (gameActive) {
                // Rotate Arena gap
                gapAngle += arenaRotationSpeed;

                // Enforce exactly 50 seconds match duration via gap size
                const elapsed = Date.now() - roundStartTime;

                // Keep the gap small for the first 35 seconds to prevent early finishes
                // Then rapidly expand the gap over the last 15 seconds to ensure exactly 50s duration
                let progress = 0;
                if (elapsed > 35000) {
                    progress = Math.min(1, (elapsed - 35000) / 15000);
                }

                // Scale gap size smoothly from PI/8 up to almost 2PI
                gapSize = (Math.PI / 8) + (progress * Math.PI * 1.88);

                resolveCollisions();
            }

            drawArena();

            // Draw and update balls
            // Sort to draw alive balls on top of eliminated ones
            balls.sort((a, b) => a.isEliminated - b.isEliminated);

            balls.forEach(ball => {
                ball.update();
                ball.draw();
            });

            requestAnimationFrame(loop);
        }

        // --- 5. Events & Interactions ---
        window.addEventListener('resize', () => {
            if (gameActive) resize();
        });

        document.getElementById('start-btn').addEventListener('click', () => {
            audioCtx.resume().then(() => {
                document.getElementById('start-screen').style.display = 'none';
                document.getElementById('ui-layer').classList.remove('hidden');
                init();
            });
        });

        // Start render loop immediately for background visual
        resize();
        loop();
    