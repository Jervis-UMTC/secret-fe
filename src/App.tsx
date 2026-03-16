import React, { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);
gsap.defaults({ force3D: true }); // Hardware accelerates all GSAP animations

// --- THE UPGRADED HELPER FUNCTION (Fixes the chopped underline!) ---
const renderWords = (text: string, formatClass: string = "") => {
  return text.split(" ").map((word, index) => {
    if (!word) return null;
    return (
      <React.Fragment key={index}>
        {/* The animatable word — now with a soft cinematic text-glow! */}
        <span className={`letter-word inline-block opacity-0 translate-y-[15px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] will-change-transform will-change-opacity ${formatClass}`}>
          {word}
        </span>
        {/* The space between words. It carries the formatClass so the underline connects! */}
        <span className={`letter-word inline opacity-0 ${formatClass}`}>
          {" "}
        </span>
      </React.Fragment>
    );
  });
};

function App() {
  const containerRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [showClickPrompt, setShowClickPrompt] = useState(false); 
  const [hasClicked, setHasClicked] = useState(false);           
  const [showNextIndicator, setShowNextIndicator] = useState(false);

  const isAssembledRef = useRef(false);
  const currentStanzaRef = useRef(-1); // -1 = not started, 0-5 = stanza index, 6 = finale
  const isAnimatingRef = useRef(false);
  const totalStanzas = 6;
  const { contextSafe } = useGSAP({ scope: containerRef });

  const introQuote = [
    { text: "Even", type: "normal" }, { text: "when", type: "normal" }, { text: "the", type: "normal" },
    { text: "sky", type: "normal" }, { text: "is", type: "normal" }, { text: "made of iron", type: "italic-1" }, 
    { text: "you", type: "normal" }, { text: "still", type: "normal" }, { text: "find", type: "normal" },
    { text: "the strength", type: "italic-2" }, { text: "to", type: "normal" }, { text: "carry", type: "normal" },
    { text: "the sun", type: "normal" },
  ];

  // --- 1. SPLICED PRELOADER ---
  useEffect(() => {
    document.body.style.overflowY = 'hidden';
    window.scrollTo(0, 0);
    
    let progressProxy = { val: 0 };
    const loaderTl = gsap.timeline();

    loaderTl.to(progressProxy, {
      val: 100, duration: 3.5, ease: "power2.inOut", roundProps: "val",
      onUpdate: () => setLoadProgress(progressProxy.val),
    });
    loaderTl.to(".loader-content", { opacity: 0, duration: 0.5 });
    loaderTl.to(".loader-top", { y: "-100%", duration: 1.2, ease: "power3.inOut" }, "+=0.2");
    loaderTl.to(".loader-bottom", { y: "100%", duration: 1.2, ease: "power3.inOut" }, "<");
    loaderTl.add(() => setIsLoading(false));

  }, []);

  // --- 2. THE INTRO TEXT ANIMATION ---
  useGSAP(() => {
    if (isLoading) return; 

    const introTl = gsap.timeline({
      onComplete: () => setShowClickPrompt(true) 
    });

    introTl.to(".intro-word", { y: "0%", opacity: 1, duration: 1.2, stagger: 0.08, ease: "power4.out" });
    introTl.set(".word-mask", { overflow: "visible" });
    introTl.to(".italic-1", { skewX: -15, marginRight: "14px", transformOrigin: "bottom", duration: 0.4, ease: "power2.out" });
    introTl.to(".italic-2", { skewX: -15, marginRight: "14px", transformOrigin: "bottom", duration: 0.4, ease: "power2.out" }, "-=0.1"); 
    introTl.to(".target-underline-line", { width: "100%", duration: 0.4, ease: "power2.out" }, "-=0.1");

  }, { scope: containerRef, dependencies: [isLoading] }); 

  // --- SHOW NEXT STANZA (smooth word-by-word reveal) ---
  const showStanza = contextSafe((index: number) => {
    const stanzas = gsap.utils.toArray(".scroll-stanza") as HTMLElement[];
    const stanza = stanzas[index];
    if (!stanza) return;

    const words = stanza.querySelectorAll(".letter-word");
    const tl = gsap.timeline({
      onComplete: () => {
        isAnimatingRef.current = false;
        setShowNextIndicator(true); 
      }
    });

    // Reveal words one-by-one
    tl.to(words, {
      opacity: 1,
      y: 0,
      stagger: 0.06,
      duration: 0.4,
      ease: "power2.out"
    });
  });

  // --- FADE OUT CURRENT STANZA ---
  const hideStanza = contextSafe((index: number) => {
    const stanzas = gsap.utils.toArray(".scroll-stanza") as HTMLElement[];
    const stanza = stanzas[index];
    if (!stanza) return;

    return gsap.to(stanza, {
      opacity: 0,
      y: -20,
      duration: 0.8,
      ease: "power2.inOut"
    });
  });

  // --- PLAY THE GRAND FINALE ---
  const playFinale = contextSafe(() => {
    const finaleTl = gsap.timeline({
      onComplete: () => { isAnimatingRef.current = false; }
    });

    // Cliff slides down
    finaleTl.to(".cliff-image", {
      y: "100%",
      duration: 3,
      ease: "power2.inOut"
    });

    // Both overlays fade out
    finaleTl.to([".scrim-overlay", ".radial-blur-overlay"], {
      opacity: 0,
      duration: 2.5,
      ease: "power2.inOut"
    }, "<");

    // Mountain restores
    finaleTl.to(".mountain-wrapper", {
      x: "0%",
      y: "0%",
      scale: 1,
      filter: "blur(0px) brightness(1)",
      duration: 4,
      ease: "power2.inOut"
    }, "<");

    // Progress bar fills
    finaleTl.to("#scroll-progress", { scaleX: 1, duration: 2, ease: "power2.inOut" }, 0);
  });

  // --- 3. THE CLICK HANDLER (handles both "Continue" and stanza advancing) ---
  const handleClick = contextSafe(() => {
    // Ignore clicks while animating
    if (isAnimatingRef.current) return;

    // Immediately hide the "next" indicator
    setShowNextIndicator(false);

    // --- FIRST CLICK: The "Continue" assembly ---
    if (!hasClicked && showClickPrompt) {
      setHasClicked(true);
      isAnimatingRef.current = true;
      
      if (audioRef.current) audioRef.current.play(); 

      isAssembledRef.current = true;
      gsap.killTweensOf(".mouse-layer");

      const masterTl = gsap.timeline();

      // Fade out intro
      masterTl.to(".intro-container, .gradient-overlay, .click-prompt", { opacity: 0, duration: 1.2, ease: "power2.inOut" }, 0);
      // Assemble layers
      masterTl.to(".layer", { x: 0, y: 0, rotation: 0, opacity: 1, duration: 2.5, ease: "power3.out" }, 0);
      masterTl.to(".mouse-layer", { x: 0, y: 0, duration: 2.5, ease: "power3.out" }, 0);
      // Show progress bar
      masterTl.to("#scroll-progress", { opacity: 0.8, duration: 1 }, "-=1");

      // Mountain zoom + radial blur
      masterTl.to(".mountain-wrapper", {
        x: "0%", y: "30%", scale: 1.5,
        duration: 3, ease: "power2.inOut"
      });
      masterTl.to(".radial-blur-overlay", {
        opacity: 1, duration: 3, ease: "power2.inOut"
      }, "<");

      // Cliff pops up
      masterTl.to(".cliff-image", {
        x: "25%", y: "30%", scale: 1.5,
        duration: 3, ease: "power2.out"
      });

      // Camera focus pull (background blurs)
      masterTl.fromTo(".mountain-wrapper", 
        { filter: "blur(0px) brightness(1)" }, 
        { filter: "blur(5px) brightness(0.8)", duration: 1.5, ease: "power2.inOut" }
      );

      // Fade in scrim behind text
      masterTl.to(".scrim-overlay", {
        opacity: 1, duration: 1.5, ease: "power2.inOut"
      }, "<"); 

      // Progress: small step for the setup phase
      masterTl.to("#scroll-progress", { scaleX: 0.1, duration: 1, ease: "none" }, "<");

      // After setup, show first stanza
      masterTl.add(() => {
        currentStanzaRef.current = 0;
        showStanza(0);
      });

      return;
    }

    // --- SUBSEQUENT CLICKS: Advance stanzas ---
    if (!hasClicked || currentStanzaRef.current < 0) return;

    const current = currentStanzaRef.current;

    // Already past the last stanza (finale played)
    if (current >= totalStanzas) return;

    isAnimatingRef.current = true;

    // Update progress bar smoothly
    const progressTarget = 0.1 + ((current + 1) / totalStanzas) * 0.9;
    gsap.to("#scroll-progress", { scaleX: progressTarget, duration: 0.8, ease: "power2.out" });

    // If this is the last stanza, fade it out then play finale
    if (current === totalStanzas - 1) {
      const hideTween = hideStanza(current);
      if (hideTween) {
        hideTween.then(() => {
          currentStanzaRef.current = totalStanzas;
          playFinale();
        });
      }
      return;
    }

    // Fade out current, then reveal next
    const hideTween = hideStanza(current);
    if (hideTween) {
      hideTween.then(() => {
        currentStanzaRef.current = current + 1;
        showStanza(current + 1);
      });
    }
  });

  // --- 4. MOUSE HOVER PARALLAX ---
  const handleMouseMove = contextSafe((e: React.MouseEvent) => {
    if (isAssembledRef.current) return; 
    const xPos = (e.clientX / window.innerWidth) - 0.5;
    const yPos = (e.clientY / window.innerHeight) - 0.5;

    gsap.utils.toArray(".mouse-layer").forEach((layer: any) => {
      const speed = layer.getAttribute("data-speed") || 1;
      gsap.to(layer, { x: xPos * 100 * speed, y: yPos * 60 * speed, duration: 2, ease: "power2.out" });
    });
  });

  return (
    <main 
      ref={containerRef} 
      onClick={handleClick}
      onMouseMove={handleMouseMove} 
      className={`bg-[#0a0a0a] text-[#e0e0e0] font-cinematic relative select-none h-[100dvh] overflow-hidden ${showClickPrompt && !hasClicked ? 'cursor-pointer' : ''} ${hasClicked && currentStanzaRef.current < totalStanzas ? 'cursor-pointer' : ''}`}
    >
      {/* THIS HIDES THE UGLY SIDE SCROLLBAR PERMANENTLY */}
      <style>{`
        ::-webkit-scrollbar { display: none; }
        body { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <audio ref={audioRef} loop src="/music.mp3" />

      {/* SPLICED PRELOADER */}
      <div className={`fixed inset-0 z-[100] pointer-events-none ${!isLoading ? 'hidden' : ''}`}>
        <div className="loader-top absolute top-0 left-0 w-full h-1/2 bg-[#0a0a0a]"></div>
        <div className="loader-bottom absolute bottom-0 left-0 w-full h-1/2 bg-[#0a0a0a]"></div>
        <div className="loader-content absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-light tabular-nums">{loadProgress}%</div>
        </div>
      </div>

      {/* THE FIXED CAMERA PORTAL */}
      <div className="fixed inset-0 w-full h-[100dvh] pointer-events-none">
        
        <section className="mountain-wrapper absolute inset-0 w-full h-full origin-center will-change-transform will-change-[filter]">
          <div className="mouse-layer absolute inset-0 w-full h-full will-change-transform" data-speed="-2">
            <img src="/layer6.png" className="layer absolute inset-0 w-full h-full object-contain object-center -translate-x-[25%] translate-y-[30%] -rotate-3 will-change-transform will-change-opacity" alt="L6" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full will-change-transform" data-speed="-1.5">
            <img src="/layer4.png" className="layer absolute inset-0 w-full h-full object-contain object-center -translate-x-[40%] -rotate-6 will-change-transform will-change-opacity" alt="L4" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full will-change-transform" data-speed="1.5">
            <img src="/layer1.png" className="layer absolute inset-0 w-full h-full object-contain object-center -translate-x-[30%] -translate-y-[20%] -rotate-12 will-change-transform will-change-opacity" alt="L1" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full will-change-transform" data-speed="1.2">
            <img src="/layer7.png" className="layer absolute inset-0 w-full h-full object-contain object-center translate-x-[25%] translate-y-[25%] rotate-6 will-change-transform will-change-opacity" alt="L7" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full will-change-transform" data-speed="-1">
            <img src="/layer2.png" className="layer absolute inset-0 w-full h-full object-contain object-center translate-x-[40%] -translate-y-[10%] rotate-6 will-change-transform will-change-opacity" alt="L2" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full will-change-transform" data-speed="0.8">
            <img src="/layer5.png" className="layer absolute inset-0 w-full h-full object-contain object-center translate-x-[35%] rotate-12 will-change-transform will-change-opacity" alt="L5" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full will-change-transform" data-speed="-0.5">
            <img src="/layer8.png" className="layer absolute inset-0 w-full h-full object-contain object-center translate-y-[40%] -rotate-6 will-change-transform will-change-opacity" alt="L8" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full will-change-transform" data-speed="2">
            <img src="/layer3.png" className="layer absolute inset-0 w-full h-full object-contain object-center -translate-y-[30%] rotate-3 will-change-transform will-change-opacity" alt="L3" />
          </div>
        </section>

        {/* THE RADIAL BLUR OVERLAY */}
        <div 
          className="radial-blur-overlay absolute inset-0 z-[2] pointer-events-none opacity-0"
          style={{
            backdropFilter: "blur(12px) brightness(0.4)",
            WebkitBackdropFilter: "blur(12px) brightness(0.4)",
            maskImage: "radial-gradient(circle at center, transparent 10%, black 80%)",
            WebkitMaskImage: "radial-gradient(circle at center, transparent 10%, black 80%)"
          }}
        ></div>

        <div className="gradient-overlay absolute inset-0 z-[5]" style={{ background: 'radial-gradient(circle, rgba(10,10,10,0.95) 20%, rgba(10,10,10,0) 80%)' }}></div>

        {/* THE INTRO QUOTE */}
        <div className="intro-container absolute inset-0 flex items-center justify-center z-10">
          <h1 className="text-2xl sm:text-3xl md:text-5xl leading-relaxed tracking-wide text-center max-w-4xl px-4 sm:px-10 flex flex-wrap justify-center gap-x-2 sm:gap-x-3 gap-y-1 sm:gap-y-2">
            {introQuote.map((item, index) => (
              <span key={index} className="word-mask inline-block overflow-hidden pb-3">
                <span className={`intro-word inline-block relative opacity-0 translate-y-[120%] ${item.type !== 'normal' ? item.type + ' pr-3' : ''}`}>
                  {item.text}
                  {item.type === 'italic-2' && <span className="target-underline-line absolute left-0 bottom-0 h-[2px] w-0 bg-[#e0e0e0]"></span>}
                </span>
              </span>
            ))}
          </h1>
        </div>

        {/* PRESS TO BEGIN PROMPT */}
        <div className={`click-prompt absolute bottom-12 sm:bottom-20 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-1000 ${showClickPrompt && !hasClicked ? 'opacity-60' : 'opacity-0'}`}>
          <p className="text-sm uppercase tracking-[0.3em] animate-pulse">Continue</p>
        </div>

       {/* SCROLL CLIFF */}
        <img src="/cliff.png" className="cliff-image absolute bottom-0 left-0 w-[45vw] object-contain object-left-bottom translate-y-[100%] z-20" alt="Cliff" />

        {/* THE LETTER CONTAINER (CSS GRID REPLACES FLEXBOX) */}
        <div className="absolute inset-0 z-30 pointer-events-none grid place-items-center">
          
          <div className="scrim-overlay opacity-30 absolute w-[90vw] max-w-4xl h-[80vh] bg-black/50 blur-[60px] rounded-[100%]"></div>

          {/* We use CSS Grid so every paragraph stacks directly on top of each other! */}
          <div className="relative text-lg md:text-xl md:leading-loose tracking-wide max-w-2xl w-full px-6 grid grid-cols-1 grid-rows-1 place-items-center text-center">
            
            <p className="scroll-stanza col-start-1 row-start-1 w-full flex flex-col items-center">
              <span className="block mb-6">{renderWords("I see the quiet battles you fight when the world is looking away,", "italic text-white/80")}</span>
              <span className="block mb-10">{renderWords("the way you gather the pieces of yourself on the days that try to break you.")}</span>
              <span className="block mb-4">{renderWords("You carry storms inside your chest,", "italic text-white/80")}</span>
              <span className="block">{renderWords("yet somehow you still speak to me with all the gentleness of morning rain.")}</span>
            </p>

            <p className="scroll-stanza col-start-1 row-start-1 w-full font-bold text-xl md:text-2xl">
              {renderWords("There is such a beautiful, fierce spirit in you.")}
            </p>

            <p className="scroll-stanza col-start-1 row-start-1 w-full flex flex-col items-center">
              <span className="block mb-6">{renderWords("To hurt so deeply and still choose kindness,")}</span>
              <span className="block mb-10">{renderWords("to carry the weight of winter and still bloom—")}</span>
              <span className="block mb-4">{renderWords("that is a quiet, breathtaking kind of courage.", "italic text-white/80")}</span>
              <span className="block">{renderWords("And I am so entirely in love with you.")}</span>
            </p>

            <p className="scroll-stanza col-start-1 row-start-1 w-full font-bold text-xl md:text-2xl">
              {renderWords("You are my favorite person in the world, Eya.")}
            </p>

            <p className="scroll-stanza col-start-1 row-start-1 w-full flex flex-col items-center">
              <span className="block mb-8">{renderWords("Please don't ever apologize for needing to rest your weary hands,", "font-semibold")}</span>
              <span className="block mb-4">{renderWords("for even the oceans have tides,", "italic text-white/80")}</span>
              <span className="block">{renderWords("and my love for you doesn't need you to be unbreakable.")}</span>
            </p>

            <p className="scroll-stanza col-start-1 row-start-1 w-full flex flex-col items-center">
              <span className="block mb-6">{renderWords("I am endlessly in awe of who you are,", "italic")}</span>
              <span className="block">{renderWords("and I will always, always be here to hold you through the dark.", "font-bold")}</span>
            </p>

          </div>
        </div>

        {/* NEW TOP PROGRESS BAR */}
        <div 
          id="scroll-progress" 
          className="fixed top-0 left-0 h-[3px] w-full bg-[#e0e0e0] z-[100] origin-left scale-x-0 opacity-0 pointer-events-none"
        ></div>

        {/* NEW "NEXT" INDICATOR */}
        <div 
          className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-700 pointer-events-none 
          ${showNextIndicator && currentStanzaRef.current < totalStanzas - 1 ? 'opacity-60' : 'opacity-0'} 
          ${currentStanzaRef.current === totalStanzas - 1 && showNextIndicator ? 'opacity-0' : ''}`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-8 h-8 animate-bounce text-[#e0e0e0]" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>

      </div>
    </main>
  );
}

export default App;