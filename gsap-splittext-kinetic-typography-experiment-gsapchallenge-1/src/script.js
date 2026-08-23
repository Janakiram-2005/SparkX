// TODO: Fix mobile/touch optimization for better experience on touch devices
// TODO: Interactive area was removed due to issues with the middle title element and overall elements overlaping and causing sequence cancellation
// TODO: Fix issue where the text is not returning to initial position when quickly hovering

gsap.registerPlugin(CustomEase, SplitText, ScrambleTextPlugin);

document.addEventListener("DOMContentLoaded", function () {
  CustomEase.create("customEase", "0.86, 0, 0.07, 1");
  CustomEase.create("mouseEase", "0.25, 0.1, 0.25, 1");

  document.fonts.ready.then(() => {
    initializeAnimation();
  });

  function initializeAnimation() {
    const backgroundTextItems = document.querySelectorAll(".text-item");
    const backgroundImages = {
      default: document.getElementById("default-bg"),
      focus: document.getElementById("focus-bg"),
      presence: document.getElementById("presence-bg"),
      feel: document.getElementById("feel-bg")
    };

    function switchBackgroundImage(id) {
      Object.values(backgroundImages).forEach((bg) => {
        gsap.to(bg, {
          opacity: 0,
          duration: 0.8,
          ease: "customEase"
        });
      });

      if (backgroundImages[id]) {
        gsap.to(backgroundImages[id], {
          opacity: 1,
          duration: 0.8,
          ease: "customEase",
          delay: 0.2
        });
      } else {
        gsap.to(backgroundImages.default, {
          opacity: 1,
          duration: 0.8,
          ease: "customEase",
          delay: 0.2
        });
      }
    }

    const alternativeTexts = {
      focus: {
        BE: "BECOME",
        PRESENT: "MINDFUL",
        LISTEN: "HEAR",
        DEEPLY: "INTENTLY",
        OBSERVE: "NOTICE",
        "&": "+",
        FEEL: "SENSE",
        MAKE: "CREATE",
        BETTER: "IMPROVED",
        DECISIONS: "CHOICES",
        THE: "YOUR",
        CREATIVE: "ARTISTIC",
        PROCESS: "JOURNEY",
        IS: "FEELS",
        MYSTERIOUS: "MAGICAL",
        S: "START",
        I: "INSPIRE",
        M: "MAKE",
        P: "PURE",
        L: "LIGHT",
        C: "CREATE",
        T: "TRANSFORM",
        Y: "YOURS",
        "IS THE KEY": "UNLOCKS ALL",
        "FIND YOUR VOICE": "SPEAK YOUR TRUTH",
        "TRUST INTUITION": "FOLLOW INSTINCT",
        "EMBRACE SILENCE": "WELCOME STILLNESS",
        "QUESTION EVERYTHING": "CHALLENGE NORMS",
        TRUTH: "HONESTY",
        WISDOM: "INSIGHT",
        FOCUS: "CONCENTRATE",
        ATTENTION: "AWARENESS",
        AWARENESS: "CONSCIOUSNESS",
        PRESENCE: "BEING",
        SIMPLIFY: "MINIMIZE",
        REFINE: "PERFECT"
      },
      presence: {
        BE: "EVOLVE",
        PRESENT: "ENGAGED",
        LISTEN: "ABSORB",
        DEEPLY: "FULLY",
        OBSERVE: "ANALYZE",
        "&": "→",
        FEEL: "EXPERIENCE",
        MAKE: "BUILD",
        BETTER: "STRONGER",
        DECISIONS: "SYSTEMS",
        THE: "EACH",
        CREATIVE: "ITERATIVE",
        PROCESS: "METHOD",
        IS: "BECOMES",
        MYSTERIOUS: "REVEALING",
        S: "STRUCTURE",
        I: "ITERATE",
        M: "METHOD",
        P: "PRACTICE",
        L: "LEARN",
        C: "CONSTRUCT",
        T: "TECHNIQUE",
        Y: "YIELD",
        "IS THE KEY": "DRIVES SUCCESS",
        "FIND YOUR VOICE": "DEVELOP YOUR STYLE",
        "TRUST INTUITION": "FOLLOW THE FLOW",
        "EMBRACE SILENCE": "VALUE PAUSES",
        "QUESTION EVERYTHING": "EXAMINE DETAILS",
        TRUTH: "CLARITY",
        WISDOM: "KNOWLEDGE",
        FOCUS: "DIRECTION",
        ATTENTION: "PRECISION",
        AWARENESS: "UNDERSTANDING",
        PRESENCE: "ENGAGEMENT",
        SIMPLIFY: "STREAMLINE",
        REFINE: "OPTIMIZE"
      },
      feel: {
        BE: "SEE",
        PRESENT: "FOCUSED",
        LISTEN: "UNDERSTAND",
        DEEPLY: "CLEARLY",
        OBSERVE: "PERCEIVE",
        "&": "=",
        FEEL: "KNOW",
        MAKE: "ACHIEVE",
        BETTER: "CLEARER",
        DECISIONS: "VISION",
        THE: "THIS",
        CREATIVE: "INSIGHTFUL",
        PROCESS: "THINKING",
        IS: "BRINGS",
        MYSTERIOUS: "ILLUMINATING",
        S: "SHARP",
        I: "INSIGHT",
        M: "MINDFUL",
        P: "PRECISE",
        L: "LUCID",
        C: "CLEAR",
        T: "TRANSPARENT",
        Y: "YES",
        "IS THE KEY": "REVEALS TRUTH",
        "FIND YOUR VOICE": "DISCOVER YOUR VISION",
        "TRUST INTUITION": "BELIEVE YOUR EYES",
        "EMBRACE SILENCE": "SEEK STILLNESS",
        "QUESTION EVERYTHING": "CLARIFY ASSUMPTIONS",
        TRUTH: "REALITY",
        WISDOM: "PERCEPTION",
        FOCUS: "CLARITY",
        ATTENTION: "OBSERVATION",
        AWARENESS: "RECOGNITION",
        PRESENCE: "ALERTNESS",
        SIMPLIFY: "DISTILL",
        REFINE: "SHARPEN"
      }
    };

    backgroundTextItems.forEach((item) => {
      item.dataset.originalText = item.textContent;
      item.dataset.text = item.textContent;

      // Make background text fully opaque by default
      gsap.set(item, { opacity: 1 });
    });

    const typeLines = document.querySelectorAll(".type-line");
    typeLines.forEach((line, index) => {
      if (index % 2 === 0) {
        line.classList.add("odd");
      } else {
        line.classList.add("even");
      }
    });

    const oddLines = document.querySelectorAll(".type-line.odd");
    const evenLines = document.querySelectorAll(".type-line.even");
    const TYPE_LINE_OPACITY = 0.015;

    const state = {
      activeRowId: null,
      kineticAnimationActive: false,
      activeKineticAnimation: null,
      textRevealAnimation: null,
      transitionInProgress: false // New state to track transitions
    };

    const textRows = document.querySelectorAll(".text-row");
    const splitTexts = {};

    textRows.forEach((row, index) => {
      const textElement = row.querySelector(".text-content");
      const text = textElement.dataset.text;
      const rowId = row.dataset.rowId;

      splitTexts[rowId] = new SplitText(textElement, {
        type: "chars",
        charsClass: "char",
        mask: true,
        reduceWhiteSpace: false,
        propIndex: true
      });

      textElement.style.visibility = "visible";
    });

    function updateCharacterWidths() {
      const isMobile = window.innerWidth < 1024;

      textRows.forEach((row, index) => {
        const rowId = row.dataset.rowId;
        const textElement = row.querySelector(".text-content");
        const computedStyle = window.getComputedStyle(textElement);
        const currentFontSize = computedStyle.fontSize;
        const chars = splitTexts[rowId].chars;

        chars.forEach((char, i) => {
          const charText =
            char.textContent ||
            (char.querySelector(".char-inner")
              ? char.querySelector(".char-inner").textContent
              : "");
          if (!charText && i === 0) return;

          let charWidth;

          if (isMobile) {
            const fontSizeValue = parseFloat(currentFontSize);
            const standardCharWidth = fontSizeValue * 0.6;
            charWidth = standardCharWidth;

            if (!char.querySelector(".char-inner") && charText) {
              char.textContent = "";
              const innerSpan = document.createElement("span");
              innerSpan.className = "char-inner";
              innerSpan.textContent = charText;
              char.appendChild(innerSpan);
              innerSpan.style.transform = "translate3d(0, 0, 0)";
            }

            char.style.width = `${charWidth}px`;
            char.style.maxWidth = `${charWidth}px`;
            char.dataset.charWidth = charWidth;
            char.dataset.hoverWidth = charWidth;
          } else {
            const tempSpan = document.createElement("span");
            tempSpan.style.position = "absolute";
            tempSpan.style.visibility = "hidden";
            tempSpan.style.fontSize = currentFontSize;
            tempSpan.style.fontFamily = "Longsile, sans-serif";
            tempSpan.textContent = charText;
            document.body.appendChild(tempSpan);

            const actualWidth = tempSpan.offsetWidth;
            document.body.removeChild(tempSpan);

            const fontSizeValue = parseFloat(currentFontSize);
            const fontSizeRatio = fontSizeValue / 160;
            const padding = 10 * fontSizeRatio;

            charWidth = Math.max(actualWidth + padding, 30 * fontSizeRatio);

            if (!char.querySelector(".char-inner") && charText) {
              char.textContent = "";
              const innerSpan = document.createElement("span");
              innerSpan.className = "char-inner";
              innerSpan.textContent = charText;
              char.appendChild(innerSpan);
              innerSpan.style.transform = "translate3d(0, 0, 0)";
            }

            char.style.width = `${charWidth}px`;
            char.style.maxWidth = `${charWidth}px`;
            char.dataset.charWidth = charWidth;

            const hoverWidth = Math.max(charWidth * 1.8, 85 * fontSizeRatio);
            char.dataset.hoverWidth = hoverWidth;
          }

          char.style.setProperty("--char-index", i);
        });
      });
    }

    updateCharacterWidths();

    window.addEventListener("resize", function () {
      clearTimeout(window.resizeTimer);
      window.resizeTimer = setTimeout(function () {
        updateCharacterWidths();
      }, 250);
    });

    textRows.forEach((row, rowIndex) => {
      const rowId = row.dataset.rowId;
      const chars = splitTexts[rowId].chars;

      gsap.set(chars, {
        opacity: 0,
        filter: "blur(15px)"
      });

      gsap.to(chars, {
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.8,
        stagger: 0.09,
        ease: "customEase",
        delay: 0.15 * rowIndex
      });
    });

    function forceResetKineticAnimation() {
      if (state.activeKineticAnimation) {
        state.activeKineticAnimation.kill();
        state.activeKineticAnimation = null;
      }

      const kineticType = document.getElementById("kinetic-type");
      gsap.killTweensOf([kineticType, typeLines, oddLines, evenLines]);

      // FIXED: Always ensure kinetic type is visible and properly set up
      gsap.set(kineticType, {
        display: "grid",
        scale: 1,
        rotation: 0,
        opacity: 1,
        visibility: "visible" // Added visibility property
      });

      gsap.set(typeLines, {
        opacity: TYPE_LINE_OPACITY,
        x: "0%"
      });

      state.kineticAnimationActive = false;
    }

    function startKineticAnimation(text) {
      // First ensure any existing animation is properly cleaned up
      forceResetKineticAnimation();

      const kineticType = document.getElementById("kinetic-type");

      // FIXED: Explicitly ensure the element is visible with inline styles
      kineticType.style.display = "grid";
      kineticType.style.opacity = "1";
      kineticType.style.visibility = "visible";

      const repeatedText = `${text} ${text} ${text}`;

      typeLines.forEach((line) => {
        line.textContent = repeatedText;
      });

      // FIXED: Add a small delay before starting animation to ensure element is visible
      setTimeout(() => {
        const timeline = gsap.timeline({
          onComplete: () => {
            state.kineticAnimationActive = false;
          }
        });

        timeline.to(kineticType, {
          duration: 1.4,
          ease: "customEase",
          scale: 2.7,
          rotation: -90
        });

        timeline.to(
          oddLines,
          {
            keyframes: [
              { x: "20%", duration: 1, ease: "customEase" },
              { x: "-200%", duration: 1.5, ease: "customEase" }
            ],
            stagger: 0.08
          },
          0
        );

        timeline.to(
          evenLines,
          {
            keyframes: [
              { x: "-20%", duration: 1, ease: "customEase" },
              { x: "200%", duration: 1.5, ease: "customEase" }
            ],
            stagger: 0.08
          },
          0
        );

        timeline.to(
          typeLines,
          {
            keyframes: [
              { opacity: 1, duration: 1, ease: "customEase" },
              { opacity: 0, duration: 1.5, ease: "customEase" }
            ],
            stagger: 0.05
          },
          0
        );

        state.kineticAnimationActive = true;
        state.activeKineticAnimation = timeline;
      }, 20); // Small delay to ensure DOM updates
    }

    function fadeOutKineticAnimation() {
      if (!state.kineticAnimationActive) return;

      if (state.activeKineticAnimation) {
        state.activeKineticAnimation.kill();
        state.activeKineticAnimation = null;
      }

      const kineticType = document.getElementById("kinetic-type");

      // FIXED: Don't set display to none on fadeout completion
      const fadeOutTimeline = gsap.timeline({
        onComplete: () => {
          gsap.set(kineticType, {
            scale: 1,
            rotation: 0,
            opacity: 1
            // Removed setting display: none
          });

          gsap.set(typeLines, {
            opacity: TYPE_LINE_OPACITY,
            x: "0%"
          });

          state.kineticAnimationActive = false;
        }
      });

      fadeOutTimeline.to(kineticType, {
        opacity: 0,
        scale: 0.8,
        duration: 0.5,
        ease: "customEase"
      });
    }

    // FIXED: New function to handle transitions between rows
    function transitionBetweenRows(fromRow, toRow) {
      if (state.transitionInProgress) return;

      state.transitionInProgress = true;

      const fromRowId = fromRow.dataset.rowId;
      const toRowId = toRow.dataset.rowId;

      // 1. Clean up the previous row
      fromRow.classList.remove("active");
      const fromChars = splitTexts[fromRowId].chars;
      const fromInners = fromRow.querySelectorAll(".char-inner");

      gsap.killTweensOf(fromChars);
      gsap.killTweensOf(fromInners);

      // 2. Update state and prepare new row
      toRow.classList.add("active");
      state.activeRowId = toRowId;

      const toText = toRow.querySelector(".text-content").dataset.text;
      const toChars = splitTexts[toRowId].chars;
      const toInners = toRow.querySelectorAll(".char-inner");

      // 3. Force reset kinetic animation (don't fade out, just reset)
      forceResetKineticAnimation();

      // 4. Update background
      switchBackgroundImage(toRowId);

      // 5. Start new animations
      startKineticAnimation(toText);

      if (state.textRevealAnimation) {
        state.textRevealAnimation.kill();
      }
      state.textRevealAnimation = createTextRevealAnimation(toRowId);

      // 6. Reset the previous row instantly
      gsap.set(fromChars, {
        maxWidth: (i, target) => parseFloat(target.dataset.charWidth)
      });

      gsap.set(fromInners, {
        x: 0
      });

      // 7. Animate the new row
      const timeline = gsap.timeline({
        onComplete: () => {
          state.transitionInProgress = false;
        }
      });

      timeline.to(
        toChars,
        {
          maxWidth: (i, target) => parseFloat(target.dataset.hoverWidth),
          duration: 0.64,
          stagger: 0.04,
          ease: "customEase"
        },
        0
      );

      timeline.to(
        toInners,
        {
          x: -35,
          duration: 0.64,
          stagger: 0.04,
          ease: "customEase"
        },
        0.05
      );
    }

    function createTextRevealAnimation(rowId) {
      const timeline = gsap.timeline();

      // Fade out other background text items
      timeline.to(backgroundTextItems, {
        opacity: 0.3,
        duration: 0.5,
        ease: "customEase"
      });

      timeline.call(() => {
        backgroundTextItems.forEach((item) => {
          item.classList.add("highlight");
        });
      });

      timeline.call(
        () => {
          backgroundTextItems.forEach((item) => {
            const originalText = item.dataset.text;
            if (
              alternativeTexts[rowId] &&
              alternativeTexts[rowId][originalText]
            ) {
              item.textContent = alternativeTexts[rowId][originalText];
            }
          });
        },
        null,
        "+=0.5"
      );

      timeline.call(() => {
        backgroundTextItems.forEach((item) => {
          item.classList.remove("highlight");
          item.classList.add("highlight-reverse");
        });
      });

      timeline.call(
        () => {
          backgroundTextItems.forEach((item) => {
            item.classList.remove("highlight-reverse");
          });
        },
        null,
        "+=0.5"
      );

      return timeline;
    }

    function resetBackgroundTextWithAnimation() {
      const timeline = gsap.timeline();

      timeline.call(() => {
        backgroundTextItems.forEach((item) => {
          item.classList.add("highlight");
        });
      });

      timeline.call(
        () => {
          backgroundTextItems.forEach((item) => {
            item.textContent = item.dataset.originalText;
          });
        },
        null,
        "+=0.5"
      );

      timeline.call(() => {
        backgroundTextItems.forEach((item) => {
          item.classList.remove("highlight");
          item.classList.add("highlight-reverse");
        });
      });

      timeline.call(
        () => {
          backgroundTextItems.forEach((item) => {
            item.classList.remove("highlight-reverse");
          });
        },
        null,
        "+=0.5"
      );

      // Restore full opacity to all background text items
      timeline.to(backgroundTextItems, {
        opacity: 1,
        duration: 0.5,
        ease: "customEase"
      });

      return timeline;
    }

    // FIXED: Modified activateRow function to use the transition function
    function activateRow(row) {
      const rowId = row.dataset.rowId;

      // If already active, do nothing
      if (state.activeRowId === rowId) return;

      // If a transition is already in progress, don't start another one
      if (state.transitionInProgress) return;

      // Check if there's already an active row
      const activeRow = document.querySelector(".text-row.active");

      if (activeRow) {
        // Use the transition function to switch between rows
        transitionBetweenRows(activeRow, row);
      } else {
        // No active row, just activate this one normally
        row.classList.add("active");
        state.activeRowId = rowId;

        const text = row.querySelector(".text-content").dataset.text;
        const chars = splitTexts[rowId].chars;
        const innerSpans = row.querySelectorAll(".char-inner");

        switchBackgroundImage(rowId);
        startKineticAnimation(text);

        if (state.textRevealAnimation) {
          state.textRevealAnimation.kill();
        }
        state.textRevealAnimation = createTextRevealAnimation(rowId);

        // Simplified animation without mouse move effects
        const timeline = gsap.timeline();

        timeline.to(
          chars,
          {
            maxWidth: (i, target) => parseFloat(target.dataset.hoverWidth),
            duration: 0.64,
            stagger: 0.04,
            ease: "customEase"
          },
          0
        );

        timeline.to(
          innerSpans,
          {
            x: -35,
            duration: 0.64,
            stagger: 0.04,
            ease: "customEase"
          },
          0.05
        );
      }
    }

    function deactivateRow(row) {
      const rowId = row.dataset.rowId;

      if (state.activeRowId !== rowId) return;

      // If a transition is already in progress, don't interfere
      if (state.transitionInProgress) return;

      state.activeRowId = null;
      row.classList.remove("active");

      switchBackgroundImage("default");
      fadeOutKineticAnimation();

      if (state.textRevealAnimation) {
        state.textRevealAnimation.kill();
      }
      state.textRevealAnimation = resetBackgroundTextWithAnimation();

      const chars = splitTexts[rowId].chars;
      const innerSpans = row.querySelectorAll(".char-inner");

      const timeline = gsap.timeline();

      timeline.to(
        innerSpans,
        {
          x: 0,
          duration: 0.64,
          stagger: 0.03,
          ease: "customEase"
        },
        0
      );

      timeline.to(
        chars,
        {
          maxWidth: (i, target) => parseFloat(target.dataset.charWidth),
          duration: 0.64,
          stagger: 0.03,
          ease: "customEase"
        },
        0.05
      );
    }

    function initializeParallax() {
      const container = document.querySelector("body");
      const backgroundElements = [
        ...document.querySelectorAll("[id$='-bg']"),
        ...document.querySelectorAll(".bg-text-container")
      ];

      const parallaxLayers = [0.02, 0.03, 0.04, 0.05];
      backgroundElements.forEach((el, index) => {
        el.dataset.parallaxSpeed =
          parallaxLayers[index % parallaxLayers.length];

        gsap.set(el, {
          transformOrigin: "center center",
          force3D: true
        });
      });

      let lastParallaxTime = 0;
      const throttleParallax = 20;

      container.addEventListener("mousemove", (e) => {
        const now = Date.now();
        if (now - lastParallaxTime < throttleParallax) return;
        lastParallaxTime = now;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const offsetX = (e.clientX - centerX) / centerX;
        const offsetY = (e.clientY - centerY) / centerY;

        backgroundElements.forEach((el) => {
          const speed = parseFloat(el.dataset.parallaxSpeed);

          if (el.id && el.id.endsWith("-bg") && el.style.opacity === "0") {
            return;
          }

          const moveX = offsetX * 100 * speed;
          const moveY = offsetY * 50 * speed;

          gsap.to(el, {
            x: moveX,
            y: moveY,
            duration: 1.0,
            ease: "mouseEase",
            overwrite: "auto"
          });
        });
      });

      container.addEventListener("mouseleave", () => {
        backgroundElements.forEach((el) => {
          gsap.to(el, {
            x: 0,
            y: 0,
            duration: 1.5,
            ease: "customEase"
          });
        });
      });

      backgroundElements.forEach((el, index) => {
        const delay = index * 0.2;
        const floatAmount = 5 + (index % 3) * 2;

        gsap.to(el, {
          y: `+=${floatAmount}`,
          duration: 3 + (index % 2),
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: delay
        });
      });
    }

    // Keep the event listeners but remove the mouse move functionality
    textRows.forEach((row) => {
      const interactiveArea = row.querySelector(".interactive-area");

      interactiveArea.addEventListener("mouseenter", () => {
        activateRow(row);
      });

      interactiveArea.addEventListener("mouseleave", () => {
        if (state.activeRowId === row.dataset.rowId) {
          deactivateRow(row);
        }
      });

      // Add click event as a backup for mouseenter
      row.addEventListener("click", () => {
        activateRow(row);
      });
    });

    // Add a global function to manually test the animation
    window.testKineticAnimation = function (rowId) {
      const row = document.querySelector(`.text-row[data-row-id="${rowId}"]`);
      if (row) {
        activateRow(row);
        setTimeout(() => {
          deactivateRow(row);
        }, 3000);
      }
    };

    function scrambleRandomText() {
      const randomIndex = Math.floor(
        Math.random() * backgroundTextItems.length
      );
      const randomItem = backgroundTextItems[randomIndex];
      const originalText = randomItem.dataset.text;

      gsap.to(randomItem, {
        duration: 1,
        scrambleText: {
          text: originalText,
          chars: "■▪▌▐▬",
          revealDelay: 0.5,
          speed: 0.3
        },
        ease: "none"
      });

      const delay = 0.5 + Math.random() * 2;
      setTimeout(scrambleRandomText, delay * 1000);
    }

    setTimeout(scrambleRandomText, 1000);

    const simplicity = document.querySelector(
      '.text-item[data-text="IS THE KEY"]'
    );
    if (simplicity) {
      const splitSimplicity = new SplitText(simplicity, {
        type: "chars",
        charsClass: "simplicity-char"
      });

      gsap.from(splitSimplicity.chars, {
        opacity: 0,
        scale: 0.5,
        duration: 1,
        stagger: 0.015,
        ease: "customEase",
        delay: 1
      });
    }

    backgroundTextItems.forEach((item, index) => {
      const delay = index * 0.1;
      gsap.to(item, {
        opacity: 0.85,
        duration: 2 + (index % 3),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: delay
      });
    });

    initializeParallax();

    // FIXED: Add stronger CSS rules to ensure kinetic type is visible
    const style = document.createElement("style");
    style.textContent = `
      #kinetic-type {
        z-index: 200 !important;
        display: grid !important;
        visibility: visible !important;
        opacity: 1;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }
});
