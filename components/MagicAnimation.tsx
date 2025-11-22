'use client'

export function MagicAnimation() {
  return (
    <div className="w-full max-w-2xl mx-auto">
        <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <defs>
          <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#E3FDFD', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#CBF1F5', stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="45%" style={{ stopColor: '#FFF5E1', stopOpacity: 1 }} />
            <stop offset="55%" style={{ stopColor: '#FFEDCC', stopOpacity: 1 }} />
          </linearGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
          </filter>
        </defs>

        <g id="main-scene">
          <g id="inputs-group" transform="translate(150, 350)">
            <g id="input-star" className="input-item">
              <path d="M25,2 L32,18 L48,18 L36,28 L40,44 L25,34 L10,44 L14,28 L2,18 L18,18 Z" fill="#FFD700" stroke="#FFA500" strokeWidth="2" strokeLinejoin="round"/>
            </g>
            <g id="input-pencil" className="input-item" transform="translate(-60, 20)">
              <rect x="10" y="0" width="20" height="40" fill="#FFB6C1" stroke="#FF69B4" strokeWidth="2"/>
              <polygon points="10,40 30,40 20,55" fill="#FFDAB9" stroke="#FFA07A" strokeWidth="2"/>
            </g>
            <g id="input-rocket" className="input-item" transform="translate(60, 30)">
              <ellipse cx="20" cy="25" rx="15" ry="25" fill="#ADD8E6" stroke="#87CEEB" strokeWidth="2"/>
              <path d="M5,25 L-5,35 L5,45 Z" fill="#FF6347"/>
              <path d="M35,25 L45,35 L35,45 Z" fill="#FF6347"/>
              <circle cx="20" cy="15" r="7" fill="#E3FDFD"/>
            </g>
          </g>

          <g id="ai-cloud-group" transform="translate(400, 250)">
            <path d="M-80,20 Q-100,0 -80,-30 Q-60,-70 0,-80 Q60,-70 80,-30 Q120,0 100,40 Q80,80 0,70 Q-60,80 -80,20 Z" 
                  fill="url(#cloudGrad)" stroke="#AEEEEE" strokeWidth="4" filter="url(#softGlow)"/>
            
            <g opacity="0.3">
              <circle cx="-30" cy="-10" r="15" fill="none" stroke="#71C9CE" strokeWidth="3" strokeDasharray="4,4" className="cloud-gear"/>
              <circle cx="20" cy="10" r="10" fill="none" stroke="#71C9CE" strokeWidth="3" strokeDasharray="3,3" className="cloud-gear reverse"/>
            </g>
            
            <g fill="#71C9CE">
              <circle cx="-25" cy="0" r="5" />
              <circle cx="25" cy="0" r="5" />
              <path d="M-15,20 Q0,35 15,20" fill="none" stroke="#71C9CE" strokeWidth="3" strokeLinecap="round"/>
            </g>
          </g>

          <g id="result-book-group" transform="translate(400, 420)">
            <path d="M-95,10 C-95,10 -10,20 0,20 C10,20 95,10 95,10 L100,60 C100,60 10,75 0,75 C-10,75 -100,60 -100,60 Z" fill="#CABBE9"/>
            
            <g>
              <path d="M0,15 C-10,15 -90,5 -90,5 L-95,55 C-95,55 -10,70 0,70 Z" fill="#FFF5E1" stroke="#E0D4BC"/>
              <path className="book-page-right" d="M0,15 C10,15 90,5 90,5 L95,55 C95,55 10,70 0,70 Z" fill="#FFEDCC" stroke="#E0D4BC"/>
              <line x1="0" y1="15" x2="0" y2="70" stroke="#DCC7A1" strokeWidth="2"/>
            </g>

            <g transform="translate(0, 30) scale(0.8)">
              <path d="M-30,0 L-30,-20 L-40,-20 L-25,-40 L-10,-20 L-20,-20 L-20,0 Z" fill="#A2D2FF" stroke="#80BDFF"/>
              <path d="M10,0 L10,-30 L0,-30 L15,-50 L30,-30 L20,-30 L20,0 Z" fill="#FFB6C1" stroke="#FF9ABA"/>
              <path d="M-40,-10 Q0,-60 40,-10" fill="none" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
            </g>
          </g>
          
          <g fill="#FFD700">
            <polygon points="400,150 405,160 415,160 408,168 410,178 400,172 390,178 392,168 385,160 395,160" className="sparkle s1"/>
            <polygon points="300,300 303,306 310,306 305,311 307,318 300,314 293,318 295,311 290,306 297,306" className="sparkle s2" transform="scale(0.7)"/>
            <polygon points="500,350 505,360 515,360 508,368 510,378 500,372 490,378 492,368 485,360 495,360" className="sparkle s3" transform="scale(0.8)"/>
          </g>
        </g>
      </svg>
    </div>
  )
}

