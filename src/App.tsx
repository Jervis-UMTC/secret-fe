import React, { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

// --- THE UPGRADED HELPER FUNCTION (Fixes the chopped underline!) ---
const renderWords = (text: string, formatClass: string = "") => {
  return text.split(" ").map((word, index) => {
    if (!word) return null;
    return (
      <React.Fragment key={index}>
        {/* The animatable word */}
        <span className={`letter-word inline-block opacity-0 translate-y-[15px] ${formatClass}`}>
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

  const isAssembledRef = useRef(false);
  const { contextSafe } = useGSAP({ scope: containerRef });

  const introQuote = [
    { text: "Life", type: "normal" }, { text: "would", type: "normal" }, { text: "be", type: "normal" },
    { text: "such", type: "normal" }, { text: "a", type: "normal" }, { text: "bright place", type: "italic-1" }, 
    { text: "if", type: "normal" }, { text: "I", type: "normal" }, { text: "was", type: "normal" },
    { text: "allowed", type: "italic-2" }, { text: "to", type: "normal" }, { text: "love", type: "normal" },
    { text: "you", type: "normal" },
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

  // --- 3. THE CLICK ANIMATION ---
  const handleStart = contextSafe(() => {
    if (!showClickPrompt || hasClicked) return;
    setHasClicked(true);
    
    if (audioRef.current) audioRef.current.play(); 

    isAssembledRef.current = true;
    gsap.killTweensOf(".mouse-layer");

    const masterTl = gsap.timeline();
    masterTl.to(".intro-container, .gradient-overlay, .click-prompt", { opacity: 0, duration: 1.2, ease: "power2.inOut" }, 0);
    masterTl.to(".layer", { x: 0, y: 0, rotation: 0, opacity: 1, duration: 2.5, ease: "power3.out" }, 0);
    masterTl.to(".mouse-layer", { x: 0, y: 0, duration: 2.5, ease: "power3.out" }, 0);
    masterTl.to("#scroll-progress", { opacity: 0.8, duration: 1 }, "-=1");
    masterTl.set(document.body, { overflowY: "auto" });

    // --- SEQUENCED SCROLL TIMELINE (The Fix!) ---
    const scrollSequence = gsap.timeline({
      scrollTrigger: { 
        trigger: ".scroll-track", 
        start: "top top", 
        end: "bottom bottom", 
        scrub: 2 
      }
    });

    // 1st: Mountain moves and zooms (OUTSIDE THE LOOP!)
    scrollSequence.to(".mountain-wrapper", {
      x: "0%",
      y: "30%",
      scale: 1.5,
      duration: 5, 
      ease: "power1.inOut"
    });
    
    // Fade in radial blur overlay WITH the mountain move
    scrollSequence.to(".radial-blur-overlay", {
      opacity: 1, 
      duration: 5,
      ease: "power2.inOut"
    }, "<");

    // 2nd: Cliff pops up
    scrollSequence.to(".cliff-image", {
      x: "25%",
      y: "30%", 
      scale: 1.5,
      duration: 5, 
      ease: "power2.out"
    });

    // 3rd: The Camera "Focus Pull" (Background blurs)
    scrollSequence.fromTo(".mountain-wrapper", 
      { filter: "blur(0px) brightness(1)" }, 
      { filter: "blur(5px) brightness(0.8)", duration: 1, ease: "power2.inOut" }
    );

    // 4th: Fade in the dark scrim behind the text
    scrollSequence.to(".scrim-overlay", {
      opacity: 1,
      duration: 1,
      ease: "power2.inOut"
    }, "<"); 

    // --- NOW WE START THE LOOP FOR THE TEXT! ---
    const stanzas = gsap.utils.toArray(".scroll-stanza");
    
    stanzas.forEach((stanza, index) => {
      const words = (stanza as HTMLElement).querySelectorAll(".letter-word");

      // Reveal words one-by-one
      scrollSequence.to(words, {
        opacity: 1, 
        y: 0, 
        stagger: 0.1, 
        duration: 0.2, 
        ease: "power1.out"
      }, "+=1.5"); 

      // Fade paragraph out if it's not the last one
      scrollSequence.to(stanza, {
        opacity: 0, 
        y: -20, 
        duration: 1.5, 
        ease: "power2.inOut"
      }, "+=2");
    });

    // --- THE GRAND FINALE (Reverting to the original scene) ---
    // 1. The Cliff slides back down into the abyss
    scrollSequence.to(".cliff-image", {
      y: "100%", 
      duration: 4, 
      ease: "power2.inOut"
    }, "+=1"); // Starts a moment after the final text fades away

    // 2. Both dark overlays completely fade out
    scrollSequence.to([".scrim-overlay", ".radial-blur-overlay"], {
      opacity: 0,
      duration: 3,
      ease: "power2.inOut"
    }, "<"); // The "<" makes this happen exactly as the cliff goes down

    // 3. The Mountain perfectly restores itself to the original snapped position!
    scrollSequence.to(".mountain-wrapper", {
      x: "0%",
      y: "0%",
      scale: 1,
      filter: "blur(0px) brightness(1)",
      duration: 10, 
      ease: "power2.inOut"
    }, "<");

    // --- TOP PROGRESS BAR (Runs independently) ---
    gsap.to("#scroll-progress", {
      scaleX: 1, 
      ease: "none",
      scrollTrigger: { trigger: ".scroll-track", start: "top top", end: "bottom bottom", scrub: 0.1 }
    });
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
      onClick={handleStart}
      onMouseMove={handleMouseMove} 
      className={`bg-[#0a0a0a] text-[#e0e0e0] font-cinematic relative select-none ${showClickPrompt && !hasClicked ? 'cursor-pointer' : ''}`}
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

      <div className="scroll-track h-[1500vh] w-full"></div>

      {/* THE FIXED CAMERA PORTAL */}
      <div className="fixed inset-0 w-full h-screen pointer-events-none">
        
        <section className="mountain-wrapper absolute inset-0 w-full h-full origin-center">
          <div className="mouse-layer absolute inset-0 w-full h-full" data-speed="-2">
            <img src="/layer6.png" className="layer absolute inset-0 w-full h-full object-contain object-center -translate-x-[25%] translate-y-[30%] -rotate-3" alt="L6" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full" data-speed="-1.5">
            <img src="/layer4.png" className="layer absolute inset-0 w-full h-full object-contain object-center -translate-x-[40%] -rotate-6" alt="L4" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full" data-speed="1.5">
            <img src="/layer1.png" className="layer absolute inset-0 w-full h-full object-contain object-center -translate-x-[30%] -translate-y-[20%] -rotate-12" alt="L1" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full" data-speed="1.2">
            <img src="/layer7.png" className="layer absolute inset-0 w-full h-full object-contain object-center translate-x-[25%] translate-y-[25%] rotate-6" alt="L7" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full" data-speed="-1">
            <img src="/layer2.png" className="layer absolute inset-0 w-full h-full object-contain object-center translate-x-[40%] -translate-y-[10%] rotate-6" alt="L2" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full" data-speed="0.8">
            <img src="/layer5.png" className="layer absolute inset-0 w-full h-full object-contain object-center translate-x-[35%] rotate-12" alt="L5" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full" data-speed="-0.5">
            <img src="/layer8.png" className="layer absolute inset-0 w-full h-full object-contain object-center translate-y-[40%] -rotate-6" alt="L8" />
          </div>
          <div className="mouse-layer absolute inset-0 w-full h-full" data-speed="2">
            <img src="/layer3.png" className="layer absolute inset-0 w-full h-full object-contain object-center -translate-y-[30%] rotate-3" alt="L3" />
          </div>
        </section>

        {/* THE RADIAL BLUR OVERLAY */}
        <div 
          className="radial-blur-overlay absolute inset-0 z-[2] pointer-events-none opacity-0"
          style={{
            backdropFilter: "blur(12px) brightness(0.4)",
            WebkitBackdropFilter: "blur(12px) brightness(0.4)",
            // This cuts the soft, transparent hole in the center of the blur!
            maskImage: "radial-gradient(circle at center, transparent 10%, black 80%)",
            WebkitMaskImage: "radial-gradient(circle at center, transparent 10%, black 80%)"
          }}
        ></div>

        <div className="gradient-overlay absolute inset-0 z-[5]" style={{ background: 'radial-gradient(circle, rgba(10,10,10,0.95) 20%, rgba(10,10,10,0) 80%)' }}></div>

        {/* THE INTRO QUOTE */}
        <div className="intro-container absolute inset-0 flex items-center justify-center z-10">
          <h1 className="text-4xl md:text-5xl leading-relaxed tracking-wide text-center max-w-4xl px-10 flex flex-wrap justify-center gap-x-3 gap-y-2">
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
        <div className={`click-prompt absolute bottom-20 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-1000 ${showClickPrompt && !hasClicked ? 'opacity-60' : 'opacity-0'}`}>
          <p className="text-sm uppercase tracking-[0.3em] animate-pulse">Continue</p>
        </div>

       {/* SCROLL CLIFF */}
        <img src="/cliff.png" className="cliff-image absolute bottom-0 left-0 w-[45vw] object-contain object-left-bottom translate-y-[100%] z-20" alt="Cliff" />

        {/* THE LETTER CONTAINER (CSS GRID REPLACES FLEXBOX) */}
        <div className="absolute inset-0 z-30 pointer-events-none grid place-items-center">
          
          <div className="scrim-overlay opacity-30 absolute w-[90vw] max-w-4xl h-[80vh] bg-black/50 blur-[60px] rounded-[100%]"></div>

          {/* We use CSS Grid so every paragraph stacks directly on top of each other! */}
          <div className="relative text-lg md:text-xl md:leading-loose tracking-wide max-w-2xl w-full px-6 grid grid-cols-1 grid-rows-1 place-items-center text-center">
            
            <p className="scroll-stanza col-start-1 row-start-1 w-full">
              {renderWords("I imagine it sometimes in the quiet parts of the day", "italic")}
              {renderWords("—how simple everything would feel if I did not have to hold myself back.")}
              {renderWords("If I could reach for you without thinking twice,", "italic")}
              {renderWords("if saying your name did not feel like something I had to soften or hide.")}
            </p>

            <p className="scroll-stanza col-start-1 row-start-1 w-full font-bold">
              {renderWords("I think the world would look different.")}
            </p>

            <p className="scroll-stanza col-start-1 row-start-1 w-full">
              {renderWords("Not in ways anyone else would notice. But in the small ways that matter to me—")}
              {renderWords("the kind of brightness that comes from knowing I do not have to pretend my feelings are smaller than they really are.", "italic")}
            </p>

            <p className="scroll-stanza col-start-1 row-start-1 w-full font-bold">
              {renderWords("But instead, I carry it quietly.")}
            </p>

            <p className="scroll-stanza col-start-1 row-start-1 w-full">
              {renderWords("This love that stays somewhere between what I feel and what I am allowed to say.", "font-bold")}
              {/* Notice the exact formatting passed into the helper function here */}
              {renderWords("The kind that lives in pauses, in unfinished sentences, in moments where I almost speak and then choose not to.", "underline underline-offset-[6px] decoration-[1px]")}
            </p>

            {/* This final stanza doesn't fade out at the end, it stays on screen forever! */}
            <p className="scroll-stanza col-start-1 row-start-1 w-full">
              {renderWords("And sometimes I wonder")}
              {renderWords("how light life would feel if loving you was not something I had to keep to myself.", "font-bold underline underline-offset-[6px] decoration-[1px]")}
            </p>

          </div>
        </div>

        {/* NEW TOP PROGRESS BAR */}
        <div 
          id="scroll-progress" 
          className="fixed top-0 left-0 h-[3px] w-full bg-[#e0e0e0] z-[100] origin-left scale-x-0 opacity-0 pointer-events-none"
        ></div>

      </div>
    </main>
  );
}

export default App;