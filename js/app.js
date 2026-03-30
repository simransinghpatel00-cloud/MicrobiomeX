(() => {
  "use strict";

  // MicrobiomeX is intentionally “just frontend” right now.
  // Keeping state and DOM access boring makes it much easier to swap in real APIs later.

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const textOrEmpty = (value) => (value == null ? "" : String(value));

  const userProfile = {
    name: "",
    age: 25,
    weightKg: 70,
    biologicalSex: "",
    dietType: "omnivore",
    healthIssues: [],
    sleepHours: 7,
    exerciseFrequency: "medium",
    waterGlassesPerDay: 6,
    stressLevel: "medium",
    microbiomeScore: 0,
    diversityPercent: 0,
  };

  let onboardingSelections = {
    dietType: "",
    healthIssues: [],
    exerciseFrequency: "",
    stressLevel: "",
  };

  let todayTracking = {
    digestionStatus: "",
    moodEmoji: "",
    waterGlasses: 0,
  };

  // In-memory histories (demo mode). If we add persistence later, these become the write-through cache.
  const dailyLogs = [];
  const scanHistory = [];
  const chatHistory = [];

  // Clock
  function renderClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const clockEl = $("#clock");
    if (clockEl) clockEl.textContent = `${hh}:${mm}`;
  }

  // Onboarding selections
  function selectDietChip(clickedChipEl) {
    $$("#dietChips .choice-chip").forEach((chip) => chip.classList.remove("is-selected"));
    clickedChipEl.classList.add("is-selected");
    onboardingSelections.dietType = clickedChipEl.dataset.value || "";
  }

  function toggleHealthIssueChip(clickedChipEl) {
    const value = clickedChipEl.dataset.value || "";
    if (!value) return;

    // “None” is exclusive so we don’t end up with contradictory recommendations later.
    if (value === "none") {
      onboardingSelections.healthIssues = [];
      $$("#issueChips .choice-chip").forEach((chip) =>
        chip.classList.remove("is-selected", "is-selected-secondary"),
      );
      clickedChipEl.classList.add("is-selected");
      return;
    }

    $$('#issueChips .choice-chip[data-value="none"]').forEach((chip) =>
      chip.classList.remove("is-selected"),
    );

    clickedChipEl.classList.toggle("is-selected-secondary");
    const selected = onboardingSelections.healthIssues;
    onboardingSelections.healthIssues = selected.includes(value)
      ? selected.filter((x) => x !== value)
      : [...selected, value];
  }

  function selectExerciseChip(clickedChipEl) {
    $$("#exChips .choice-chip").forEach((chip) => chip.classList.remove("is-selected"));
    clickedChipEl.classList.add("is-selected");
    onboardingSelections.exerciseFrequency = clickedChipEl.dataset.value || "";
  }

  function selectStressChip(clickedChipEl) {
    $$("#stressChips .choice-chip").forEach((chip) => chip.classList.remove("is-selected"));
    clickedChipEl.classList.add("is-selected");
    onboardingSelections.stressLevel = clickedChipEl.dataset.value || "";
  }

  function goToOnboardingStep(stepNumber) {
    $$(".onboarding-step").forEach((step) => step.classList.remove("is-active"));
    const nextStep = $(`#step${stepNumber}`);
    if (nextStep) nextStep.classList.add("is-active");
  }

  function syncRangeReadouts() {
    const sleepRange = $("#ob-sleep");
    const sleepVal = $("#sleepValue");
    if (sleepRange && sleepVal) sleepVal.textContent = sleepRange.value;

    const waterRange = $("#ob-water");
    const waterVal = $("#waterValue");
    if (waterRange && waterVal) waterVal.textContent = waterRange.value;
  }

  function completeOnboarding() {
    const name = textOrEmpty($("#ob-name")?.value).trim() || "Friend";
    const age = Number.parseInt(textOrEmpty($("#ob-age")?.value), 10) || 25;
    const weightKg = Number.parseInt(textOrEmpty($("#ob-weight")?.value), 10) || 70;
    const biologicalSex = textOrEmpty($("#ob-sex")?.value) || "other";

    userProfile.name = name;
    userProfile.age = age;
    userProfile.weightKg = weightKg;
    userProfile.biologicalSex = biologicalSex;

    userProfile.dietType = onboardingSelections.dietType || "omnivore";
    userProfile.healthIssues = [...onboardingSelections.healthIssues];

    userProfile.sleepHours = Number.parseInt(textOrEmpty($("#ob-sleep")?.value), 10) || 7;
    userProfile.exerciseFrequency = onboardingSelections.exerciseFrequency || "medium";
    userProfile.waterGlassesPerDay = Number.parseInt(textOrEmpty($("#ob-water")?.value), 10) || 6;
    userProfile.stressLevel = onboardingSelections.stressLevel || "medium";

    calculateMicrobiomeScore();
    renderAppFromProfile();

    const onboardingEl = $("#onboarding");
    if (onboardingEl) onboardingEl.style.display = "none";

    const appRoot = $("#mainApp");
    if (appRoot) {
      appRoot.style.display = "flex";
      requestAnimationFrame(() => requestAnimationFrame(() => appRoot.classList.add("is-visible")));
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Score model (demo heuristic)
  function calculateMicrobiomeScore() {
    // This is a UX placeholder: deterministic + explainable feels better than “random magic”
    // while lab/wearable pipelines are still future work.
    let score = 55;

    const dietBonus = {
      vegan: 14,
      vegetarian: 10,
      mediterranean: 12,
      omnivore: 2,
      keto: 0,
      junk: -18,
    };
    score += dietBonus[userProfile.dietType] ?? 0;

    score -= Math.min(userProfile.healthIssues.length * 5, 25);

    const sleepDelta = Math.abs(userProfile.sleepHours - 7.5);
    score += sleepDelta < 1 ? 8 : sleepDelta < 2 ? 3 : -3;

    const exerciseBonus = { none: -8, low: 2, medium: 8, high: 10 };
    score += exerciseBonus[userProfile.exerciseFrequency] ?? 0;

    score += userProfile.waterGlassesPerDay >= 8 ? 6 : userProfile.waterGlassesPerDay >= 6 ? 3 : -3;

    const stressBonus = { low: 8, medium: 0, high: -10 };
    score += stressBonus[userProfile.stressLevel] ?? 0;

    if (userProfile.age >= 20 && userProfile.age <= 35) score += 4;
    else if (userProfile.age > 50) score -= 4;

    userProfile.microbiomeScore = Math.max(22, Math.min(97, score));

    const diversityByDiet = {
      vegan: 80,
      vegetarian: 74,
      mediterranean: 77,
      omnivore: 64,
      keto: 54,
      junk: 38,
    };

    const baseDiversity = diversityByDiet[userProfile.dietType] ?? 64;
    const diversity =
      baseDiversity +
      (userProfile.healthIssues.length < 2 ? 4 : -4) +
      (userProfile.exerciseFrequency === "high" ? 5 : 0);
    userProfile.diversityPercent = Math.min(94, Math.max(28, diversity));
  }

  function getScoreNarrative() {
    const { microbiomeScore, dietType, healthIssues, name } = userProfile;
    if (microbiomeScore >= 80)
      return `Outstanding, ${name}! Your microbiome is thriving with excellent diversity and high beneficial bacteria.`;
    if (microbiomeScore >= 65)
      return `${name}, your gut health is above average. A few diet tweaks can push it to excellent.`;
    if (microbiomeScore >= 50)
      return `Your gut needs some attention.${
        healthIssues.length
          ? ` Issues like ${healthIssues.slice(0, 2).join(", ")} point to imbalance.`
          : " Focus on diet and sleep."
      }`;
    return "Significant improvement needed. Start with eliminating junk food and managing stress.";
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Data sources (demo)
  // ──────────────────────────────────────────────────────────────────────────────
  const TOP_MICROBES_BY_DIET = {
    vegan: [
      {
        name: "Lactobacillus plantarum",
        type: "Beneficial · Probiotic",
        percent: 84,
        color: "#00e5be",
        fillGradient: "linear-gradient(90deg,#00e5be,#38f9d7)",
        icon: "🟢",
      },
      {
        name: "Bifidobacterium longum",
        type: "Beneficial · Fermenter",
        percent: 78,
        color: "#a78bfa",
        fillGradient: "linear-gradient(90deg,#7f5af0,#a78bfa)",
        icon: "🟣",
      },
      {
        name: "Faecalibacterium prausnitzii",
        type: "Beneficial · Anti-inflam.",
        percent: 65,
        color: "#00e5be",
        fillGradient: "linear-gradient(90deg,#00e5be,#7f5af0)",
        icon: "🟢",
      },
      {
        name: "Akkermansia muciniphila",
        type: "Beneficial · Gut lining",
        percent: 54,
        color: "#ffd200",
        fillGradient: "linear-gradient(90deg,#ffd200,#ffa500)",
        icon: "🟡",
      },
    ],
    vegetarian: [
      {
        name: "Lactobacillus acidophilus",
        type: "Beneficial · Probiotic",
        percent: 79,
        color: "#00e5be",
        fillGradient: "linear-gradient(90deg,#00e5be,#38f9d7)",
        icon: "🟢",
      },
      {
        name: "Bifidobacterium bifidum",
        type: "Beneficial · Immune",
        percent: 70,
        color: "#a78bfa",
        fillGradient: "linear-gradient(90deg,#7f5af0,#a78bfa)",
        icon: "🟣",
      },
      {
        name: "Akkermansia muciniphila",
        type: "Beneficial · Gut lining",
        percent: 48,
        color: "#ffd200",
        fillGradient: "linear-gradient(90deg,#ffd200,#ffa500)",
        icon: "🟡",
      },
      {
        name: "Clostridium butyricum",
        type: "Neutral · Butyrate",
        percent: 38,
        color: "#f472b6",
        fillGradient: "linear-gradient(90deg,#f72585,#ff6b6b)",
        icon: "🔴",
      },
    ],
    omnivore: [
      {
        name: "Lactobacillus acidophilus",
        type: "Beneficial · Probiotic",
        percent: 72,
        color: "#00e5be",
        fillGradient: "linear-gradient(90deg,#00e5be,#38f9d7)",
        icon: "🟢",
      },
      {
        name: "Bacteroides fragilis",
        type: "Neutral · Digestion",
        percent: 60,
        color: "#a78bfa",
        fillGradient: "linear-gradient(90deg,#7f5af0,#a78bfa)",
        icon: "🟣",
      },
      {
        name: "Faecalibacterium prausnitzii",
        type: "Beneficial · Anti-inflam.",
        percent: 45,
        color: "#f472b6",
        fillGradient: "linear-gradient(90deg,#f72585,#ff6b6b)",
        icon: "🔴",
      },
      {
        name: "Akkermansia muciniphila",
        type: "Beneficial · Gut lining",
        percent: 37,
        color: "#ffd200",
        fillGradient: "linear-gradient(90deg,#ffd200,#ffa500)",
        icon: "🟡",
      },
    ],
    keto: [
      {
        name: "Bacteroides thetaiotaomicron",
        type: "Neutral · Fat digest.",
        percent: 66,
        color: "#a78bfa",
        fillGradient: "linear-gradient(90deg,#7f5af0,#a78bfa)",
        icon: "🟣",
      },
      {
        name: "Lactobacillus acidophilus",
        type: "Beneficial · Probiotic",
        percent: 53,
        color: "#00e5be",
        fillGradient: "linear-gradient(90deg,#00e5be,#38f9d7)",
        icon: "🟢",
      },
      {
        name: "Prevotella copri",
        type: "Neutral · Watch",
        percent: 47,
        color: "#f472b6",
        fillGradient: "linear-gradient(90deg,#f72585,#ff6b6b)",
        icon: "🔴",
      },
      {
        name: "Ruminococcus gnavus",
        type: "⚠️ Bloating risk",
        percent: 33,
        color: "#ffd200",
        fillGradient: "linear-gradient(90deg,#ffd200,#ffa500)",
        icon: "🟡",
      },
    ],
    junk: [
      {
        name: "Bacteroides fragilis",
        type: "Neutral · Digestion",
        percent: 61,
        color: "#a78bfa",
        fillGradient: "linear-gradient(90deg,#7f5af0,#a78bfa)",
        icon: "🟣",
      },
      {
        name: "Escherichia coli",
        type: "⚠️ Watch · Overgrowth",
        percent: 53,
        color: "#f472b6",
        fillGradient: "linear-gradient(90deg,#f72585,#ff6b6b)",
        icon: "🔴",
      },
      {
        name: "Lactobacillus acidophilus",
        type: "Beneficial (low)",
        percent: 31,
        color: "#00e5be",
        fillGradient: "linear-gradient(90deg,#00e5be,#38f9d7)",
        icon: "🟢",
      },
      {
        name: "Clostridium difficile",
        type: "⚠️ Risk · Overgrowth",
        percent: 21,
        color: "#ffd200",
        fillGradient: "linear-gradient(90deg,#ffd200,#ffa500)",
        icon: "🟡",
      },
    ],
    mediterranean: [
      {
        name: "Lactobacillus rhamnosus",
        type: "Beneficial · Probiotic",
        percent: 86,
        color: "#00e5be",
        fillGradient: "linear-gradient(90deg,#00e5be,#38f9d7)",
        icon: "🟢",
      },
      {
        name: "Bifidobacterium adolescentis",
        type: "Beneficial · Prebiotic",
        percent: 75,
        color: "#a78bfa",
        fillGradient: "linear-gradient(90deg,#7f5af0,#a78bfa)",
        icon: "🟣",
      },
      {
        name: "Akkermansia muciniphila",
        type: "Beneficial · Gut lining",
        percent: 64,
        color: "#ffd200",
        fillGradient: "linear-gradient(90deg,#ffd200,#ffa500)",
        icon: "🟡",
      },
      {
        name: "Faecalibacterium prausnitzii",
        type: "Beneficial · Anti-inflam.",
        percent: 57,
        color: "#00e5be",
        fillGradient: "linear-gradient(90deg,#00e5be,#7f5af0)",
        icon: "🟢",
      },
    ],
  };

  const DIET_PLANS = {
    vegan: {
      eat: [
        { emoji: "🍌", name: "Banana", benefit: "Prebiotic fiber" },
        { emoji: "🥦", name: "Broccoli", benefit: "Anti-inflam." },
        { emoji: "🫐", name: "Blueberries", benefit: "Polyphenols" },
        { emoji: "🫘", name: "Lentils", benefit: "Resistant starch" },
        { emoji: "🧄", name: "Garlic", benefit: "Prebiotic" },
        { emoji: "🥑", name: "Avocado", benefit: "Healthy fats" },
      ],
      avoid: [
        { emoji: "🍰", name: "Sugar", benefit: "Feeds bad bacteria" },
        { emoji: "🥤", name: "Soda", benefit: "Disrupts pH" },
        { emoji: "🍟", name: "Processed food", benefit: "Low fiber" },
        { emoji: "🍷", name: "Alcohol", benefit: "Gut lining harm" },
      ],
      moderate: [
        { emoji: "🍞", name: "Bread", benefit: "Opt for sourdough" },
        { emoji: "☕", name: "Coffee", benefit: "1–2 cups ok" },
      ],
    },
    vegetarian: {
      eat: [
        { emoji: "🥛", name: "Kefir", benefit: "Probiotics" },
        { emoji: "🍌", name: "Banana", benefit: "Prebiotic" },
        { emoji: "🥦", name: "Broccoli", benefit: "Fiber" },
        { emoji: "🫙", name: "Kimchi", benefit: "Fermented" },
        { emoji: "🫘", name: "Chickpeas", benefit: "Resistant starch" },
        { emoji: "🧅", name: "Onion", benefit: "Prebiotic" },
      ],
      avoid: [
        { emoji: "🍰", name: "Sugar", benefit: "Dysbiosis" },
        { emoji: "🥤", name: "Soda", benefit: "pH harm" },
        { emoji: "🍟", name: "Fries", benefit: "Trans fat" },
        { emoji: "🥐", name: "White flour", benefit: "Blood sugar spike" },
      ],
      moderate: [
        { emoji: "🥚", name: "Eggs", benefit: "Quality protein" },
        { emoji: "🧀", name: "Aged Cheese", benefit: "Aged is better" },
      ],
    },
    omnivore: {
      eat: [
        { emoji: "🥛", name: "Yogurt", benefit: "Live cultures" },
        { emoji: "🍌", name: "Banana", benefit: "Prebiotics" },
        { emoji: "🥦", name: "Broccoli", benefit: "Fiber" },
        { emoji: "🐟", name: "Salmon", benefit: "Omega-3" },
        { emoji: "🫙", name: "Kimchi", benefit: "Fermented" },
        { emoji: "🧄", name: "Garlic", benefit: "Prebiotic" },
      ],
      avoid: [
        { emoji: "🌭", name: "Processed meat", benefit: "Disrupts flora" },
        { emoji: "🍰", name: "Sugar", benefit: "Bad bacteria feed" },
        { emoji: "🥤", name: "Soda", benefit: "Acidity" },
        { emoji: "🍟", name: "Deep-fried", benefit: "Inflammation" },
      ],
      moderate: [
        { emoji: "🥩", name: "Red Meat", benefit: "2–3×/wk max" },
        { emoji: "🥛", name: "Dairy", benefit: "Choose fermented" },
      ],
    },
    keto: {
      eat: [
        { emoji: "🥑", name: "Avocado", benefit: "Healthy fats" },
        { emoji: "🥦", name: "Broccoli", benefit: "Low-carb fiber" },
        { emoji: "🐟", name: "Salmon", benefit: "Omega-3" },
        { emoji: "🫙", name: "Sauerkraut", benefit: "Fermented" },
        { emoji: "🥚", name: "Eggs", benefit: "Complete protein" },
        { emoji: "🧄", name: "Garlic", benefit: "Prebiotic" },
      ],
      avoid: [
        { emoji: "🍞", name: "Bread", benefit: "High carb" },
        { emoji: "🍚", name: "Rice", benefit: "Glucose spike" },
        { emoji: "🍌", name: "Banana", benefit: "High sugar" },
        { emoji: "🥤", name: "Juice", benefit: "Sugar spike" },
      ],
      moderate: [
        { emoji: "🥛", name: "Dairy", benefit: "Full-fat ok" },
        { emoji: "🫘", name: "Legumes", benefit: "Limit portions" },
      ],
    },
    junk: {
      eat: [
        { emoji: "🥛", name: "Kefir", benefit: "Repair microbiome" },
        { emoji: "🍌", name: "Banana", benefit: "Gut lining repair" },
        { emoji: "🥣", name: "Oats", benefit: "Prebiotic fiber" },
        { emoji: "🥦", name: "Broccoli", benefit: "Anti-inflam." },
        { emoji: "🫐", name: "Blueberries", benefit: "Antioxidants" },
        { emoji: "💧", name: "Water 2L+", benefit: "Flush toxins" },
      ],
      avoid: [
        { emoji: "🍔", name: "Fast Food", benefit: "#1 gut killer" },
        { emoji: "🍰", name: "Sugar", benefit: "Most critical" },
        { emoji: "🥤", name: "Soda", benefit: "Worst for gut" },
        { emoji: "🌭", name: "Processed Meat", benefit: "Nitrates harmful" },
      ],
      moderate: [
        { emoji: "🍕", name: "Pizza", benefit: "Veggie opt. only" },
        { emoji: "🍟", name: "Fries", benefit: "Rarely only" },
      ],
    },
    mediterranean: {
      eat: [
        { emoji: "🫒", name: "Olive Oil", benefit: "Polyphenols" },
        { emoji: "🐟", name: "Oily Fish", benefit: "Omega-3" },
        { emoji: "🍅", name: "Tomatoes", benefit: "Lycopene" },
        { emoji: "🫘", name: "Legumes", benefit: "Prebiotic fiber" },
        { emoji: "🥛", name: "Greek Yogurt", benefit: "Probiotics" },
        { emoji: "🍇", name: "Grapes", benefit: "Resveratrol" },
      ],
      avoid: [
        { emoji: "🍰", name: "Sugar", benefit: "Dysbiosis" },
        { emoji: "🌭", name: "Processed Meat", benefit: "Inflammatory" },
        { emoji: "🥐", name: "White Flour", benefit: "Low fiber" },
        { emoji: "🧂", name: "Excess Salt", benefit: "Gut microbiome" },
      ],
      moderate: [
        { emoji: "🍷", name: "Red Wine", benefit: "1 glass ok" },
        { emoji: "🧀", name: "Aged Cheese", benefit: "Fine in moderation" },
      ],
    },
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Rendering
  // ──────────────────────────────────────────────────────────────────────────────
  function renderAppFromProfile() {
    $("#userChip").textContent = userProfile.name;
    $("#dietName").textContent = userProfile.name;
    $("#dietType").textContent =
      {
        omnivore: "omnivore diet",
        vegetarian: "vegetarian diet",
        vegan: "vegan diet",
        keto: "keto diet",
        junk: "current diet",
        mediterranean: "Mediterranean diet",
      }[userProfile.dietType] || "diet";

    $("#chatSubtitle").textContent = `Hi ${userProfile.name}! I know your full gut profile. Ask me anything.`;

    renderTrackDate();

    // Score card: slightly delayed to make the "analysis" feel intentional without being sluggish.
    setTimeout(() => {
      $("#scoreValue").textContent = String(userProfile.microbiomeScore);
      $("#scoreProgressBar").style.width = `${userProfile.microbiomeScore}%`;

      const badge = $("#scoreBadge");
      badge.className = "score-badge";
      if (userProfile.microbiomeScore >= 80) {
        badge.textContent = "Excellent";
        badge.classList.add("score-badge--good");
      } else if (userProfile.microbiomeScore >= 65) {
        badge.textContent = "Good";
        badge.classList.add("score-badge--good");
      } else if (userProfile.microbiomeScore >= 50) {
        badge.textContent = "Fair";
        badge.classList.add("score-badge--fair");
      } else {
        badge.textContent = "Needs Work";
        badge.classList.add("score-badge--poor");
      }

      $("#scoreDescription").textContent = getScoreNarrative();

      $("#diversityPercent").textContent = `${userProfile.diversityPercent}%`;
      const donut = $("#diversityDonut");
      if (donut) donut.style.strokeDashoffset = String(239 - (239 * userProfile.diversityPercent) / 100);

      const speciesEstimate = Math.floor(userProfile.diversityPercent * 4.6);
      $("#speciesEstimate").textContent = `${speciesEstimate} unique bacterial species detected`;
    }, 350);

    renderTopMicrobes();
    renderInsights();
    renderDietPlan();
    renderProgress();
    initializeWaterTracker();
    renderLogHistory();
  }

  function renderTrackDate() {
    const now = new Date();
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const months = [
      "JANUARY",
      "FEBRUARY",
      "MARCH",
      "APRIL",
      "MAY",
      "JUNE",
      "JULY",
      "AUGUST",
      "SEPTEMBER",
      "OCTOBER",
      "NOVEMBER",
      "DECEMBER",
    ];
    $("#trackDate").textContent = `TODAY — ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
  }

  function renderTopMicrobes() {
    const microbes = TOP_MICROBES_BY_DIET[userProfile.dietType] || TOP_MICROBES_BY_DIET.omnivore;
    const list = $("#microbeList");
    list.innerHTML = microbes
      .map(
        (m) => `
      <div class="microbe-card">
        <div class="microbe-card__icon">${m.icon}</div>
        <div class="microbe-card__info">
          <div class="microbe-card__name">${m.name}</div>
          <div class="microbe-card__type">${m.type}</div>
          <div class="microbe-bar"><div class="microbe-bar__fill" data-target-width="${m.percent}%" style="width:0%;background:${m.fillGradient}"></div></div>
        </div>
        <div class="microbe-card__pct" style="color:${m.color}">${m.percent}%</div>
      </div>`,
      )
      .join("");

    setTimeout(() => {
      $$(".microbe-bar__fill").forEach((el) => {
        el.style.width = el.dataset.targetWidth || "0%";
      });
    }, 500);
  }

  function renderInsights() {
    const insights = [];
    const { dietType, healthIssues, sleepHours, exerciseFrequency, stressLevel } = userProfile;

    if (["vegan", "vegetarian", "mediterranean"].includes(dietType)) {
      insights.push({
        color: "#00e5be",
        title: "High Fiber Diversity",
        body: `Your ${dietType} diet supports excellent microbial diversity. Keep prioritizing whole plant foods.`,
      });
    } else if (dietType === "junk") {
      insights.push({
        color: "#f72585",
        title: "⚠️ High Sugar Impact",
        body: "Processed foods feed harmful bacteria. Reducing sugar alone can boost your score by 10+ points.",
      });
    } else if (dietType === "keto") {
      insights.push({
        color: "#ffd200",
        title: "Low Fiber Warning",
        body: "Keto reduces beneficial Firmicutes. Add fermented foods and leafy greens to compensate.",
      });
    } else {
      insights.push({
        color: "#00e5be",
        title: "Balanced Microbiome",
        body: "Omnivore diet shows moderate diversity. More plant variety can significantly boost your score.",
      });
    }

    if (healthIssues.includes("bloating"))
      insights.push({
        color: "#7f5af0",
        title: "Bloating Detected",
        body: "Gas-producing bacteria may be elevated. Avoid carbonated drinks and try digestive enzymes.",
      });
    if (healthIssues.includes("acne"))
      insights.push({
        color: "#f72585",
        title: "Gut–Skin Axis Alert",
        body: "Skin issues often link to gut dysbiosis. Boost Lactobacillus via yogurt and reduce dairy.",
      });
    if (healthIssues.includes("fatigue"))
      insights.push({
        color: "#7f5af0",
        title: "Energy–Gut Link",
        body: "Low gut diversity affects B12 and iron absorption. This may be causing your fatigue.",
      });
    if (healthIssues.includes("constipation"))
      insights.push({
        color: "#ffd200",
        title: "Motility Support Needed",
        body: "Target 25–30g fiber/day and 2L+ water to support gut movement.",
      });
    if (sleepHours < 6)
      insights.push({
        color: "#f72585",
        title: "Sleep Harming Your Gut",
        body: "Under 6h disrupts gut circadian rhythm. Aim for 7–8 hours consistently.",
      });
    if (stressLevel === "high")
      insights.push({
        color: "#f72585",
        title: "Stress = Gut Enemy",
        body: "High cortisol disrupts gut lining integrity. Even 5 min of breathing exercises helps.",
      });
    if (exerciseFrequency === "none")
      insights.push({
        color: "#ffd200",
        title: "Movement Boosts Microbiome",
        body: "Regular exercise increases butyrate-producing bacteria by up to 40%. Start with walks.",
      });

    $("#homeInsights").innerHTML = insights
      .slice(0, 4)
      .map(
        (i) => `
      <div class="insight-card">
        <div class="insight-card__dot" style="background:${i.color}"></div>
        <div>
          <div class="insight-card__title">${i.title}</div>
          <div class="insight-card__body">${i.body}</div>
        </div>
      </div>`,
      )
      .join("");
  }

  function renderDietPlan() {
    const basePlan = DIET_PLANS[userProfile.dietType] || DIET_PLANS.omnivore;
    const eat = [...basePlan.eat];
    const avoid = [...basePlan.avoid];
    const moderate = [...basePlan.moderate];

    // Intent: issue-based tweaks help the UI feel “personal” without pretending we have lab-grade specificity yet.
    if (userProfile.healthIssues.includes("bloating")) {
      avoid.push({ emoji: "🫘", name: "Raw Legumes", benefit: "Gas producer" });
      eat.push({ emoji: "🫚", name: "Ginger Tea", benefit: "Anti-bloating" });
    }
    if (userProfile.healthIssues.includes("ibs")) {
      avoid.push({ emoji: "🧅", name: "Onion/Garlic", benefit: "FODMAP trigger" });
      eat.push({ emoji: "🍚", name: "White Rice", benefit: "IBS-friendly" });
    }
    if (userProfile.healthIssues.includes("acne")) {
      moderate.push({ emoji: "🥛", name: "Milk", benefit: "Hormonal link" });
      eat.push({ emoji: "🫐", name: "Berries", benefit: "Clear-skin antioxidants" });
    }
    if (userProfile.healthIssues.includes("constipation")) {
      eat.push({ emoji: "💧", name: "Water 2L+", benefit: "Bowel motility" });
      eat.push({ emoji: "🥝", name: "Kiwi", benefit: "Natural laxative" });
    }
    if (userProfile.healthIssues.includes("reflux")) {
      avoid.push({ emoji: "🍅", name: "Tomato", benefit: "Acid trigger" });
      moderate.push({ emoji: "☕", name: "Coffee", benefit: "Reflux trigger" });
    }

    const renderFoodCards = (foods, modifierClass) =>
      foods
        .slice(0, 6)
        .map(
          (f) => `
        <div class="food-card ${modifierClass}">
          <div class="food-card__emoji">${f.emoji}</div>
          <div>
            <div class="food-card__name">${f.name}</div>
            <div class="food-card__benefit">${f.benefit}</div>
          </div>
        </div>`,
        )
        .join("");

    $("#eatFoods").innerHTML = renderFoodCards(eat, "food-card--eat");
    $("#avoidFoods").innerHTML = renderFoodCards(avoid, "food-card--avoid");
    $("#moderateFoods").innerHTML = renderFoodCards(moderate, "food-card--moderate");
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Food scanner (API + safe fallback)
  // ──────────────────────────────────────────────────────────────────────────────
  function renderScanHistory() {
    const verdictIcon = { GOOD: "✅", CAUTION: "⚠️", AVOID: "❌" };
    const verdictClass = { GOOD: "verdict-pill--good", CAUTION: "verdict-pill--caution", AVOID: "verdict-pill--avoid" };

    $("#recentScans").innerHTML = scanHistory
      .slice(0, 5)
      .map((s) => {
        const icon = verdictIcon[s.verdict] || "⚠️";
        const cls = verdictClass[s.verdict] || verdictClass.CAUTION;
        return `
        <div class="recent-scan-item">
          <span style="font-size:13px;color:var(--color-text)">${s.food}</span>
          <span class="verdict-pill ${cls}">${icon} ${s.label}</span>
        </div>`;
      })
      .join("");
  }

  function setScanResultPending(food) {
    $("#scanResult").classList.add("is-visible");
    $("#scanFoodName").textContent = food;
    const verdict = $("#scanVerdict");
    verdict.textContent = "...";
    verdict.className = "verdict-pill";
    $("#scanAnalysis").innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;"><div class="spinner"></div><span style="color:var(--color-text-muted);font-size:12px">Analyzing for your specific gut...</span></div>';
  }

  function setScanResultError(message) {
    const verdict = $("#scanVerdict");
    verdict.textContent = "⚠️ Error";
    verdict.className = "verdict-pill verdict-pill--caution";
    $("#scanAnalysis").textContent = message;
  }

  function applyScanResult(food, result) {
    const verdictMap = {
      GOOD: { cls: "verdict-pill--good", label: "✅ Good for you" },
      CAUTION: { cls: "verdict-pill--caution", label: "⚠️ Moderate" },
      AVOID: { cls: "verdict-pill--avoid", label: "❌ Avoid" },
    };
    const mapped = verdictMap[result.verdict] || verdictMap.CAUTION;

    const verdict = $("#scanVerdict");
    verdict.className = `verdict-pill ${mapped.cls}`;
    verdict.textContent = mapped.label;
    $("#scanAnalysis").textContent = result.reason;

    scanHistory.unshift({
      food,
      verdict: result.verdict,
      label: mapped.label.replace(/✅ |⚠️ |❌ /g, ""),
    });
    renderScanHistory();
  }

  function buildScanContext() {
    return `${userProfile.name}, ${userProfile.age}yo ${userProfile.biologicalSex}, diet:${userProfile.dietType}, issues:${
      userProfile.healthIssues.join(",") || "none"
    }, gut score:${userProfile.microbiomeScore}/100, stress:${userProfile.stressLevel}`;
  }

  function parseModelJsonResponse(text) {
    const trimmed = textOrEmpty(text).trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      return { verdict: "CAUTION", reason: trimmed || "No response text." };
    }
  }

  function localFoodScanFallback(food) {
    const f = food.toLowerCase();
    const isProcessed = /(soda|cola|chips|fries|burger|fast|donut|cake|candy)/.test(f);
    const isFermented = /(yogurt|kefir|kimchi|sauerkraut|kombucha)/.test(f);
    const isFiber = /(beans|lentil|oats|broccoli|berries|banana|avocado|garlic|onion)/.test(f);

    if (isProcessed) {
      return {
        verdict: "AVOID",
        reason:
          "This is likely to increase inflammation and feed less helpful bacteria. If you’re craving it, try a smaller portion and pair it with fiber (veg/salad) and water.",
      };
    }
    if (isFermented) {
      return {
        verdict: "GOOD",
        reason:
          "Fermented foods can support beneficial bacteria and gut barrier function. Start with a small serving if you’re prone to bloating.",
      };
    }
    if (isFiber) {
      return {
        verdict: "GOOD",
        reason:
          "Fiber and polyphenols generally support microbial diversity and short-chain fatty acid production. Increase gradually to avoid gas if you’re sensitive.",
      };
    }
    return {
      verdict: "CAUTION",
      reason:
        "This may be okay in moderation. Consider your symptoms today—if you’re bloated or stressed, choose simpler foods and prioritize hydration.",
    };
  }

  async function analyzeFoodForProfile() {
    const input = $("#foodInput");
    const food = textOrEmpty(input?.value).trim();
    if (!food) return;

    setScanResultPending(food);

    try {
      // Keeping this “always works” matters more than being fancy.
      // If we ever wire a real model, it needs a tiny backend/proxy so keys never touch the browser.
      // TODO: Replace this toggle with an environment/config flag once there’s a build step.
      const shouldUseNetwork = false;

      if (!shouldUseNetwork) {
        applyScanResult(food, localFoodScanFallback(food));
        input.value = "";
        return;
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "x-api-key": "<REDACTED>",
          // "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          messages: [
            {
              role: "user",
              content: `You are a gut health AI. User profile: ${buildScanContext()}.\nAnalyze "${food}" for this user's gut health.\nRespond ONLY with valid JSON, no markdown:\n{"verdict":"GOOD"|"CAUTION"|"AVOID","reason":"2-3 sentences personalized to their conditions"}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Scanner request failed (${response.status})`);
      }

      const data = await response.json();
      const modelText = data?.content?.[0]?.text;
      const parsed = parseModelJsonResponse(modelText);
      applyScanResult(food, parsed);
      input.value = "";
    } catch (error) {
      setScanResultError("Unable to analyze right now. Please try again.");
      console.error(error);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Tracker
  // ──────────────────────────────────────────────────────────────────────────────
  function initializeWaterTracker() {
    const row = $("#waterRow");
    row.innerHTML =
      Array.from({ length: 8 }, (_, i) => `<span class="water-drop" data-water-index="${i}">💧</span>`).join("") +
      '<span id="waterCount" style="font-size:11px;color:var(--color-text-muted);font-family:var(--font-mono);margin-left:3px">0/8 glasses</span>';
  }

  function setWaterIntake(index) {
    todayTracking.waterGlasses = index + 1;
    $$(".water-drop").forEach((drop, j) => {
      drop.classList.toggle("is-filled", j <= index);
    });
    $("#waterCount").textContent = `${index + 1}/8 glasses`;
  }

  function selectDigestionStatus(buttonEl) {
    $$(".digestion-button").forEach((b) => b.classList.remove("is-selected"));
    buttonEl.classList.add("is-selected");
    todayTracking.digestionStatus = buttonEl.dataset.value || "";
  }

  function selectMood(buttonEl) {
    $$(".mood-button").forEach((b) => b.classList.remove("is-selected"));
    buttonEl.classList.add("is-selected");
    todayTracking.moodEmoji = buttonEl.dataset.value || "";
  }

  function saveDailyLog() {
    const meals = textOrEmpty($("#mealsInput")?.value).trim();
    const log = {
      date: new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
      meals: meals || "Not logged",
      digestionStatus: todayTracking.digestionStatus || "—",
      moodEmoji: todayTracking.moodEmoji || "—",
      waterGlasses: todayTracking.waterGlasses,
    };

    dailyLogs.unshift(log);
    renderLogHistory();

    $("#mealsInput").value = "";
    $$(".digestion-button,.mood-button").forEach((b) => b.classList.remove("is-selected"));

    todayTracking = { digestionStatus: "", moodEmoji: "", waterGlasses: 0 };
    initializeWaterTracker();

    const button = $("#saveLogButton");
    button.textContent = "✅ Saved!";
    button.style.background = "linear-gradient(135deg,var(--color-accent-teal),rgba(0,229,190,.7))";
    button.style.color = "#07070f";

    setTimeout(() => {
      button.textContent = "💾 Save Today's Log";
      button.style.background = "";
      button.style.color = "";
    }, 2200);
  }

  function renderLogHistory() {
    const container = $("#logHistory");
    if (!dailyLogs.length) {
      container.innerHTML = '<div class="empty-state">No logs yet. Track your first day above!</div>';
      return;
    }
    container.innerHTML = dailyLogs
      .slice(0, 5)
      .map(
        (l) => `
      <div class="log-entry">
        <div class="log-entry__date">${l.date}</div>
        <div class="log-entry__meals">${l.meals}</div>
        <div class="log-entry__tags">
          <span class="log-tag">💩 ${l.digestionStatus}</span>
          <span class="log-tag">${l.moodEmoji} Mood</span>
          <span class="log-tag">💧 ${l.waterGlasses}/8</span>
        </div>
      </div>`,
      )
      .join("");
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Chat (demo fallback)
  // ──────────────────────────────────────────────────────────────────────────────
  function buildSystemPrompt() {
    return `You are MicrobiomeX AI, a warm and knowledgeable gut health assistant.\n\nUser profile:\n- Name: ${userProfile.name}, Age: ${userProfile.age}, Weight: ${userProfile.weightKg}kg, Sex: ${userProfile.biologicalSex}\n- Diet: ${userProfile.dietType}, Issues: ${userProfile.healthIssues.join(", ") || "none"}\n- Sleep: ${userProfile.sleepHours}h, Exercise: ${userProfile.exerciseFrequency}, Water: ${userProfile.waterGlassesPerDay} glasses, Stress: ${userProfile.stressLevel}\n- Gut Score: ${userProfile.microbiomeScore}/100, Diversity: ${userProfile.diversityPercent}%\n\nGive personalized science-based advice specific to their profile. Be warm, concise (under 140 words), use plain text only, no markdown or bullet points. Occasionally use their name.`;
  }

  function appendChatMessage(role, text) {
    const thread = $("#chatThread");
    const msg = document.createElement("div");
    msg.className = `chat-message ${role === "user" ? "chat-message--user" : "chat-message--assistant"}`;
    msg.innerHTML = `<div class="chat-bubble">${text}</div>`;
    msg.style.animation = "fadeIn .3s ease";
    thread.appendChild(msg);
    thread.scrollTop = thread.scrollHeight;

    const tabScroll = $("#tabBody");
    if (tabScroll) tabScroll.scrollTop = tabScroll.scrollHeight;
  }

  function appendChatLoading(loadingId) {
    const thread = $("#chatThread");
    const el = document.createElement("div");
    el.id = loadingId;
    el.className = "chat-message chat-message--assistant";
    el.innerHTML = '<div class="loading-bubble"><div class="spinner"></div><span>Thinking...</span></div>';
    thread.appendChild(el);
    thread.scrollTop = thread.scrollHeight;
  }

  function removeChatLoading(loadingId) {
    const el = document.getElementById(loadingId);
    if (el) el.remove();
  }

  function localChatFallback(userText) {
    const t = userText.toLowerCase();
    if (/(milk|dairy)/.test(t) && userProfile.healthIssues.includes("acne")) {
      return `${userProfile.name}, dairy can worsen acne for some people via the gut–skin axis. If you try it, prefer fermented options (yogurt/kefir) and watch your skin and digestion for 48 hours.`;
    }
    if (/(pizza|fast|burger|fries)/.test(t) && userProfile.dietType === "junk") {
      return `${userProfile.name}, if today is a “reset” day, keep pizza as a small portion and add fiber (salad/veg) plus water. Your score will improve fastest by cutting sugary drinks and ultra-processed snacks.`;
    }
    return `${userProfile.name}, based on your profile, focus on steady sleep (7–8h), more plant variety, and hydration. If you tell me what you ate today and your main symptom, I can tailor it further.`;
  }

  async function sendChatMessage() {
    const input = $("#chatInput");
    const message = textOrEmpty(input?.value).trim();
    if (!message) return;

    input.value = "";
    appendChatMessage("user", message);
    chatHistory.push({ role: "user", content: message });
    $("#chatSuggestions").style.display = "none";

    const loadingId = `chat-loading-${Date.now()}`;
    appendChatLoading(loadingId);

    try {
      const shouldUseNetwork = false;
      if (!shouldUseNetwork) {
        const reply = localChatFallback(message);
        removeChatLoading(loadingId);
        appendChatMessage("assistant", reply);
        chatHistory.push({ role: "assistant", content: reply });
        return;
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 900,
          system: buildSystemPrompt(),
          messages: chatHistory.slice(-12),
        }),
      });

      if (!response.ok) throw new Error(`Chat request failed (${response.status})`);
      const data = await response.json();
      const reply = data?.content?.[0]?.text || "Sorry—no response text.";
      removeChatLoading(loadingId);
      appendChatMessage("assistant", reply);
      chatHistory.push({ role: "assistant", content: reply });
    } catch (error) {
      removeChatLoading(loadingId);
      appendChatMessage("assistant", "Connection issue. Please try again.");
      console.error(error);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Progress tab
  // ──────────────────────────────────────────────────────────────────────────────
  function renderProgress() {
    const dietBase = { vegan: 12, vegetarian: 10, mediterranean: 11, omnivore: 6, keto: 4, junk: 2 };
    const improvement = Math.min(
      25,
      Math.max(
        1,
        (dietBase[userProfile.dietType] ?? 6) +
          (userProfile.exerciseFrequency === "high" ? 4 : 0) +
          (userProfile.stressLevel === "low" ? 3 : 0),
      ),
    );
    $("#progressPercent").textContent = `+${improvement}%`;

    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    const baseScore = userProfile.microbiomeScore;
    const weekScores = labels.map((_, i) =>
      Math.min(99, Math.max(10, baseScore - 8 + i * 2 + (Math.floor(Math.random() * 6) - 3))),
    );
    const colors = ["#7f5af0", "#7f5af0", "#7f5af0", "#7f5af0", "#00e5be", "#00e5be", "#a78bfa"];

    $("#weekRow").innerHTML = labels
      .map(
        (d, i) => `
      <div class="week-day">
        <div class="week-day__label">${d}</div>
        <div class="week-day__bar-wrap">
          <div class="week-day__bar" data-target-height="${weekScores[i]}%" style="height:0%;background:${colors[i]}"></div>
        </div>
        <div class="week-day__score">${weekScores[i]}</div>
      </div>`,
      )
      .join("");

    setTimeout(() => {
      $$(".week-day__bar").forEach((el) => {
        el.style.height = el.dataset.targetHeight || "0%";
      });
    }, 400);

    const speciesEstimate = Math.floor(userProfile.diversityPercent * 4.6);
    $("#statGrid").innerHTML = `
      <div class="stat-card">
        <div class="stat-card__value">${userProfile.microbiomeScore}</div>
        <div class="stat-card__unit">/100</div>
        <div class="stat-card__label">Gut Score</div>
        <div class="stat-card__trend ${userProfile.microbiomeScore >= 65 ? "trend-up" : "trend-down"}">${
          userProfile.microbiomeScore >= 65 ? "↑ Above avg" : "↓ Needs work"
        }</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value">${userProfile.diversityPercent}</div>
        <div class="stat-card__unit">%</div>
        <div class="stat-card__label">Diversity</div>
        <div class="stat-card__trend ${userProfile.diversityPercent >= 65 ? "trend-up" : "trend-down"}">${
          userProfile.diversityPercent >= 65 ? "↑ Diverse" : "↓ Low diversity"
        }</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value">${speciesEstimate}</div>
        <div class="stat-card__unit">sp.</div>
        <div class="stat-card__label">Species Est.</div>
        <div class="stat-card__trend trend-up">↑ Tracked</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value">${userProfile.waterGlassesPerDay}</div>
        <div class="stat-card__unit">gl/day</div>
        <div class="stat-card__label">Hydration</div>
        <div class="stat-card__trend ${userProfile.waterGlassesPerDay >= 6 ? "trend-up" : "trend-down"}">${
          userProfile.waterGlassesPerDay >= 6 ? "↑ Good" : "↓ Drink more"
        }</div>
      </div>
    `;

    const milestones = [];
    if (userProfile.microbiomeScore >= 65)
      milestones.push({ icon: "🏆", title: "Good Gut Health", subtitle: "Score above 65/100", done: true });
    if (["vegan", "vegetarian", "mediterranean"].includes(userProfile.dietType))
      milestones.push({ icon: "🥗", title: "Healthy Diet", subtitle: `${userProfile.dietType} diet detected`, done: true });
    if (userProfile.exerciseFrequency !== "none")
      milestones.push({ icon: "🏃", title: "Active Lifestyle", subtitle: "Exercise logged", done: true });
    if (userProfile.waterGlassesPerDay >= 6)
      milestones.push({
        icon: "💧",
        title: "Well Hydrated",
        subtitle: `${userProfile.waterGlassesPerDay} glasses/day`,
        done: true,
      });

    milestones.push({ icon: "📅", title: "7-Day Streak", subtitle: "Log daily for a week", done: dailyLogs.length >= 7 });
    milestones.push({ icon: "🔬", title: "Microbiome Expert", subtitle: "Reach score 85+", done: userProfile.microbiomeScore >= 85 });
    milestones.push({ icon: "🍽️", title: "Food Scanner Pro", subtitle: "Scan 10+ foods", done: scanHistory.length >= 10 });

    $("#milestones").innerHTML = milestones
      .map(
        (m) => `
      <div class="milestone" style="${m.done ? "" : "opacity:.45"}">
        <div class="milestone__icon">${m.icon}</div>
        <div>
          <div class="milestone__title">${m.title}</div>
          <div class="milestone__subtitle">${m.subtitle}</div>
        </div>
        <div style="font-size:16px">${m.done ? "✅" : "🔒"}</div>
      </div>`,
      )
      .join("");
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Navigation
  // ──────────────────────────────────────────────────────────────────────────────
  function switchTab(tabKey, clickedNavItem) {
    $$(".tab-panel").forEach((panel) => panel.classList.remove("is-active"));
    $$(".bottom-nav__item").forEach((item) => item.classList.remove("is-active"));
    $(`#tab-${tabKey}`)?.classList.add("is-active");
    clickedNavItem?.classList.add("is-active");
    $("#tabBody").scrollTop = 0;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Event wiring (delegation to avoid inline attributes)
  // ──────────────────────────────────────────────────────────────────────────────
  function wireEvents() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const chip = target.closest(".choice-chip");
      if (chip && chip.closest("#dietChips")) return selectDietChip(chip);
      if (chip && chip.closest("#issueChips")) return toggleHealthIssueChip(chip);
      if (chip && chip.closest("#exChips")) return selectExerciseChip(chip);
      if (chip && chip.closest("#stressChips")) return selectStressChip(chip);

      const onboardingAction = target.closest("[data-onboarding-action]");
      if (onboardingAction) {
        const action = onboardingAction.getAttribute("data-onboarding-action");
        if (action === "step-2") return goToOnboardingStep(2);
        if (action === "step-3") return goToOnboardingStep(3);
        if (action === "finish") return completeOnboarding();
      }

      const navItem = target.closest(".bottom-nav__item");
      if (navItem) {
        const tab = navItem.getAttribute("data-tab");
        if (tab) return switchTab(tab, navItem);
      }

      const waterDrop = target.closest(".water-drop");
      if (waterDrop) {
        const index = Number.parseInt(waterDrop.getAttribute("data-water-index") || "", 10);
        if (Number.isFinite(index)) return setWaterIntake(index);
      }

      const digestionBtn = target.closest(".digestion-button");
      if (digestionBtn) return selectDigestionStatus(digestionBtn);

      const moodBtn = target.closest(".mood-button");
      if (moodBtn) return selectMood(moodBtn);

      if (target.closest("#saveLogButton")) return saveDailyLog();

      if (target.closest("#scanButton")) return void analyzeFoodForProfile();

      const suggestion = target.closest(".suggestion-chip");
      if (suggestion) {
        $("#chatInput").value = textOrEmpty(suggestion.textContent).replace("💬 ", "");
        return void sendChatMessage();
      }

      if (target.closest("#sendChatButton")) return void sendChatMessage();
    });

    document.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.matches("#ob-sleep") || target.matches("#ob-water")) syncRangeReadouts();
    });

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (event.key === "Enter" && target.matches("#foodInput")) {
        event.preventDefault();
        void analyzeFoodForProfile();
      }
      if (event.key === "Enter" && target.matches("#chatInput")) {
        event.preventDefault();
        void sendChatMessage();
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Boot
  // ──────────────────────────────────────────────────────────────────────────────
  function boot() {
    renderClock();
    setInterval(renderClock, 30_000);
    wireEvents();
    syncRangeReadouts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();


