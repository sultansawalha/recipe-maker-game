import { useState, useCallback, useEffect } from "react";
import { DndContext, type DragEndEvent, useDraggable, useDroppable, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import confetti from "canvas-confetti";

// Types
import type { Ingredient, Recipe, Theme } from "./types";
import { recipes } from "./data/recipes";
import { playCorrectSound, playWrongSound, playWinSound, playTimesUpSound } from "./utils/audio";

const themes: Theme[] = [
  { id: "classic", name: "Classic", className: "", price: 0 },
  { id: "wood", name: "Cozy Wood", className: "bg-[url('https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1600&q=80')] bg-cover bg-center bg-blend-overlay", price: 50 },
  { id: "space", name: "Space Kitchen", className: "bg-[url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1600&q=80')] bg-cover bg-center bg-blend-overlay", price: 100 },
  { id: "underwater", name: "Underwater", className: "bg-[url('https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1600&q=80')] bg-cover bg-center bg-blend-overlay", price: 150 },
];



// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Fire confetti celebration
function fireConfetti() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
}

// Draggable Ingredient Card
function IngredientCard({
  ingredient,
  onClick,
  isSelected,
  isWrong,
  disabled,
}: {
  ingredient: Ingredient;
  onClick: () => void;
  isSelected: boolean;
  isWrong: boolean;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: ingredient.id,
    data: ingredient,
    disabled: disabled || isSelected,
  });

  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      zIndex: 100,
    }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isSelected}
        className={`
          ingredient-card relative p-4 rounded-2xl transition-all duration-300 transform touch-none
          ${isSelected ? "scale-90 opacity-50 cursor-not-allowed" : "cursor-grab active:cursor-grabbing hover:scale-110 hover:shadow-xl hover:-translate-y-1"}
          ${isWrong ? "animate-shake bg-red-200 border-4 border-red-500" : "bg-white border-4 border-amber-300 hover:border-amber-400"}
          ${disabled && !isSelected ? "opacity-50 cursor-not-allowed" : ""}
          shadow-lg hover:shadow-amber-200/50
        `}
      >
        <div className="ingredient-icon text-5xl mb-2 transition-transform">{ingredient.icon}</div>
        <p className="text-sm font-bold text-gray-700">{ingredient.name}</p>
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-400/40 rounded-2xl backdrop-blur-sm">
            <span className="text-4xl drop-shadow-lg">✅</span>
          </div>
        )}
      </button>
    </div>
  );
}

// Recipe Selector Component
function RecipeSelector({
  recipes,
  currentRecipe,
  onSelect,
  totalStars,
}: {
  recipes: Recipe[];
  currentRecipe: Recipe;
  onSelect: (recipe: Recipe) => void;
  totalStars: number;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(recipes.length / itemsPerPage);

  const paginatedRecipes = recipes.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const isLocked = (index: number) => {
    if (index < 10) return false;
    // Recipe 11 (index 10) needs 5 stars
    // Recipe 12 (index 11) needs 10 stars...
    // Formula: (index - 9) * 5
    const requiredStars = (index - 9) * 5;
    return totalStars < requiredStars;
  };

  const getRequiredStars = (index: number) => {
    if (index < 10) return 0;
    return (index - 9) * 5;
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
          className="p-2 rounded-full bg-white/20 hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
        >
          ◀️
        </button>

        <div className="flex flex-wrap justify-center gap-3">
          {paginatedRecipes.map((recipe, i) => {
            const originalIndex = currentPage * itemsPerPage + i;
            const locked = isLocked(originalIndex);
            const reqStars = getRequiredStars(originalIndex);

            return (
              <button
                type="button"
                key={recipe.id}
                onClick={() => !locked && onSelect(recipe)}
                disabled={locked}
                className={`
                  relative px-4 py-2 rounded-full font-bold transition-all duration-300 transform
                  ${currentRecipe.id === recipe.id
                    ? "scale-110 ring-4 ring-white shadow-xl"
                    : "hover:scale-105"
                  }
                  ${locked
                    ? "bg-gray-400 cursor-not-allowed opacity-80"
                    : `bg-gradient-to-r ${recipe.backgroundColor}`
                  }
                  text-white min-w-[140px]
                `}
              >
                {locked ? (
                  <div className="flex flex-col items-center">
                    <span className="text-xl">🔒</span>
                    <span className="text-xs">{reqStars} ⭐ Needed</span>
                  </div>
                ) : (
                  <>
                    <span className="mr-2">{recipe.icon}</span>
                    {recipe.name}
                  </>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={currentPage === totalPages - 1}
          className="p-2 rounded-full bg-white/20 hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
        >
          ▶️
        </button>
      </div>
      <div className="text-center text-white/60 text-sm mt-2 font-bold">
        Page {currentPage + 1} of {totalPages}
      </div>
    </div>
  );
}

// Droppable Plate Component
function Plate({
  selectedIngredients,
  recipe,
  isComplete,
}: {
  selectedIngredients: Ingredient[];
  recipe: Recipe;
  isComplete: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "plate",
  });

  const isEmpty = selectedIngredients.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={`
      relative w-64 h-64 mx-auto rounded-full ${recipe.plateColor}
      border-8 ${isOver ? "border-green-400 scale-105" : "border-gray-200"} shadow-2xl
      flex flex-wrap items-center justify-center gap-2 p-4
      transition-all duration-500
      ${isComplete ? "animate-bounce-slow ring-8 ring-yellow-400 animate-pulse-glow" : ""}
      ${isEmpty ? "animate-float" : ""}
    `}
    >
      {isEmpty ? (
        <div className="text-center pointer-events-none">
          <p className="text-gray-400 font-medium mb-2">
            Drag ingredients here!
          </p>
          <span className="text-3xl">👇</span>
        </div>
      ) : (
        selectedIngredients.map((ingredient, index) => (
          <div
            key={ingredient.id}
            className="text-4xl animate-pop"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {ingredient.icon}
          </div>
        ))
      )}
      {isComplete && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
          <span className="text-4xl animate-bounce">🎉</span>
        </div>
      )}
    </div>
  );
}

// Wrong Ingredient Modal
function WrongIngredientModal({
  ingredient,
  onClose,
}: {
  ingredient: Ingredient | null;
  onClose: () => void;
}) {
  if (!ingredient) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-pop shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-4">🙈</div>
        <h3 className="text-2xl font-bold text-red-500 mb-2">Oops!</h3>
        <p className="text-gray-600 mb-4">
          <span className="text-3xl">{ingredient.icon}</span>{" "}
          <strong>{ingredient.name}</strong> doesn't belong in this recipe!
        </p>
        <p className="text-gray-500 text-sm mb-4">Try another ingredient!</p>
        <button
          type="button"
          onClick={onClose}
          className="bg-gradient-to-r from-orange-400 to-red-400 text-white px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform cursor-pointer"
        >
          Got it! 👍
        </button>
      </div>
    </div>
  );
}

// Sticker Book Modal
function StickerBookModal({
  recipes,
  unlockedStickers,
  onClose,
}: {
  recipes: Recipe[];
  unlockedStickers: string[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-pop shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-blue-600">🏆 Chef Stickers</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">✕</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {recipes.map(recipe => {
            const isUnlocked = unlockedStickers.includes(recipe.id);
            return (
              <div key={recipe.id} className={`flex flex-col items-center p-4 rounded-xl border-2 ${isUnlocked ? "border-yellow-400 bg-yellow-50" : "border-gray-200 bg-gray-50"}`}>
                <div className={`text-6xl mb-2 transition-transform hover:scale-110 ${isUnlocked ? "" : "grayscale opacity-20"}`}>
                  {isUnlocked ? recipe.icon : "❓"}
                </div>
                <p className={`font-bold text-center ${isUnlocked ? "text-gray-800" : "text-gray-400"}`}>
                  {recipe.name}
                </p>
                {isUnlocked && <span className="text-xs text-yellow-600 font-bold mt-1">MASTERED!</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Shop Modal
function ShopModal({
  coins,
  unlockedThemes,
  currentThemeId,
  onBuy,
  onEquip,
  onClose,
}: {
  coins: number;
  unlockedThemes: string[];
  currentThemeId: string;
  onBuy: (theme: Theme) => void;
  onEquip: (themeId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-pop shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-purple-600">🎨 Kitchen Shop</h2>
            <div className="bg-yellow-100 px-4 py-2 rounded-full font-bold text-yellow-700">
              🪙 {coins} Coins
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">✕</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {themes.map(theme => {
            const isOwned = unlockedThemes.includes(theme.id);
            const isEquipped = currentThemeId === theme.id;
            const canAfford = coins >= theme.price;

            return (
              <div key={theme.id} className="border-2 border-gray-200 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg mb-1">{theme.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{isOwned ? "Owned" : `${theme.price} Coins`}</p>
                </div>

                {isOwned ? (
                  <button
                    onClick={() => onEquip(theme.id)}
                    disabled={isEquipped}
                    className={`w-full py-2 rounded-lg font-bold transition-colors ${isEquipped ? "bg-green-100 text-green-700" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                  >
                    {isEquipped ? "Equipped" : "Equip"}
                  </button>
                ) : (
                  <button
                    onClick={() => onBuy(theme)}
                    disabled={!canAfford}
                    className={`w-full py-2 rounded-lg font-bold transition-colors ${canAfford ? "bg-yellow-400 hover:bg-yellow-500 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                  >
                    Buy ({theme.price} 🪙)
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}

// Success Modal
function SuccessModal({
  recipe,
  mistakes,
  earnedCoins,
  onPlayAgain,
  onNextRecipe,
  onClose,
}: {
  recipe: Recipe;
  mistakes: number;
  earnedCoins: number;
  onPlayAgain: () => void;
  onNextRecipe: () => void;
  onClose: () => void;
}) {
  let stars = 3;
  if (mistakes >= 3) stars = 1;
  else if (mistakes >= 1) stars = 2;

  const starDisplay = Array(stars).fill("⭐").join("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-pop shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          ✕
        </button>
        <div className="text-6xl mb-4">{recipe.icon}</div>
        <h3 className="text-2xl font-bold text-green-500 mb-2">
          Amazing Chef! 👨‍🍳
        </h3>
        <p className="text-gray-600 mb-4">
          You made a perfect <strong>{recipe.name}</strong>!
        </p>
        <div className="text-6xl mb-4 animate-bounce-slow filter drop-shadow-md">{starDisplay}</div>
        <p className="text-sm text-gray-400 mb-2 font-medium">
          {mistakes === 0 ? "Perfect Score! 🌟" : `${mistakes} mistake${mistakes > 1 ? 's' : ''}`}
        </p>
        <div className="bg-yellow-100 inline-block px-4 py-2 rounded-full mb-6 font-bold text-yellow-700 animate-pulse">
          +{earnedCoins} Coins 🪙
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            type="button"
            onClick={onPlayAgain}
            className="bg-gradient-to-r from-blue-400 to-blue-500 text-white px-5 py-3 rounded-full font-bold hover:scale-105 transition-transform cursor-pointer"
          >
            Play Again 🔄
          </button>
          <button
            type="button"
            onClick={onNextRecipe}
            className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-5 py-3 rounded-full font-bold hover:scale-105 transition-transform cursor-pointer"
          >
            Next Recipe ➡️
          </button>
        </div>
      </div>
    </div>
  );
}

// Time's Up Modal
function TimesUpModal({
  onTryAgain,
  onChangeMode,
}: {
  onTryAgain: () => void;
  onChangeMode: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-pop shadow-2xl border-4 border-red-400">
        <div className="text-6xl mb-4">⏰</div>
        <h3 className="text-3xl font-bold text-red-500 mb-2">Time's Up!</h3>
        <p className="text-gray-600 mb-6">
          You ran out of time! Be quicker next time!
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onTryAgain}
            className="bg-gradient-to-r from-blue-400 to-blue-500 text-white px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform cursor-pointer shadow-lg"
          >
            Try Again 🔄
          </button>
          <button
            type="button"
            onClick={onChangeMode}
            className="text-gray-500 hover:text-gray-700 font-medium underline cursor-pointer"
          >
            Turn off Timer Mode
          </button>
        </div>
      </div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const percentage = (current / total) * 100;

  return (
    <div className="w-full max-w-md mx-auto mb-2">
      <div className="flex justify-between mb-2">
        <span className="font-bold text-white">Progress</span>
        <span className="font-bold text-white">
          {current}/{total} ingredients
        </span>
      </div>
      <div className="h-4 bg-white/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-400 to-green-400 transition-all duration-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [currentRecipe, setCurrentRecipe] = useState<Recipe>(recipes[0]);
  const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>(
    []
  );
  const [mistakes, setMistakes] = useState(0); // Star Rating State

  // Progression State
  const [coins, setCoins] = useState(() => Number(localStorage.getItem("chefCoins")) || 0);
  const [unlockedStickers, setUnlockedStickers] = useState<string[]>(() => JSON.parse(localStorage.getItem("chefStickers") || "[]"));
  const [unlockedThemes, setUnlockedThemes] = useState<string[]>(() => JSON.parse(localStorage.getItem("chefThemes") || '["classic"]'));
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem("chefCurrentTheme") || "classic");
  const [totalStars, setTotalStars] = useState(() => Number(localStorage.getItem("chefTotalStars")) || 0); // New Star State
  const [earnedCoinsLastGame, setEarnedCoinsLastGame] = useState(0);

  // Modals
  const [showStickers, setShowStickers] = useState(false);
  const [showShop, setShowShop] = useState(false);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem("chefCoins", coins.toString());
    localStorage.setItem("chefStickers", JSON.stringify(unlockedStickers));
    localStorage.setItem("chefThemes", JSON.stringify(unlockedThemes));
    localStorage.setItem("chefCurrentTheme", currentTheme);
    localStorage.setItem("chefTotalStars", totalStars.toString());
  }, [coins, unlockedStickers, unlockedThemes, currentTheme, totalStars]);

  const [wrongIngredient, setWrongIngredient] = useState<Ingredient | null>(
    null
  );
  const [shakeIngredientId, setShakeIngredientId] = useState<string | null>(
    null
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>(() =>
    shuffleArray([
      ...currentRecipe.correctIngredients,
      ...currentRecipe.wrongIngredients,
    ])
  );

  // Timer State
  const [isTimerMode, setIsTimerMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // DND Sensors - Enable click by requiring drag distance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const isComplete =
    selectedIngredients.length === currentRecipe.correctIngredients.length;

  // Timer Logic
  useEffect(() => {
    let interval: number | undefined;

    if (isTimerMode && isTimerActive && !isComplete && !isGameOver) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsGameOver(true);
            setIsTimerActive(false);
            playTimesUpSound(); // Play time's up sound
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isTimerMode, isTimerActive, isComplete, isGameOver]);

  const resetGame = useCallback((recipe: Recipe = currentRecipe) => {
    setSelectedIngredients([]);
    setWrongIngredient(null);
    setShowSuccess(false);
    setIsGameOver(false);
    setMistakes(0); // Reset mistakes
    setTimeLeft(30);
    setIsTimerActive(true); // Start timer immediately on reset if mode is on
    setAllIngredients(
      shuffleArray([...recipe.correctIngredients, ...recipe.wrongIngredients])
    );
  }, [currentRecipe]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && over.id === "plate") {
      const ingredient = active.data.current as Ingredient;
      // Check if ingredient exists to make Typescript happy
      if (!ingredient) return;

      // Pass to existing handler logic
      handleIngredientClick(ingredient);
    }
  };

  const handleIngredientClick = useCallback(
    (ingredient: Ingredient) => {
      // Check if already selected
      if (selectedIngredients.find((i) => i.id === ingredient.id)) {
        return;
      }

      // Check if it's a correct ingredient
      const isCorrect = currentRecipe.correctIngredients.find(
        (i) => i.id === ingredient.id
      );

      if (isCorrect) {
        playCorrectSound(); // Play correct sound
        const newSelected = [...selectedIngredients, ingredient];
        setSelectedIngredients(newSelected);

        // Check if recipe is complete
        if (newSelected.length === currentRecipe.correctIngredients.length) {
          setTimeout(() => {
            fireConfetti();
            playWinSound(); // Play win sound

            // Calculate Rewards
            let reward = 10;
            if (mistakes >= 3) reward = 1;
            else if (mistakes >= 1) reward = 5;

            setEarnedCoinsLastGame(reward);
            setCoins(prev => prev + reward);

            // Award Stars implementation
            let starsEarned = 3;
            if (mistakes >= 3) starsEarned = 1;
            else if (mistakes >= 1) starsEarned = 2;
            setTotalStars(prev => prev + starsEarned);

            // Unlock Sticker if 3 stars
            if (mistakes === 0 && !unlockedStickers.includes(currentRecipe.id)) {
              setUnlockedStickers(prev => {
                const updated = [...prev, currentRecipe.id];
                return updated;
              });
            }

            setShowSuccess(true);
          }, 500);
        }
      } else {
        // Wrong ingredient
        playWrongSound(); // Play wrong sound
        setShakeIngredientId(ingredient.id);
        setWrongIngredient(ingredient);
        setMistakes((prev) => prev + 1); // Increment mistakes
        setTimeout(() => setShakeIngredientId(null), 500);
      }
    },
    [selectedIngredients, currentRecipe]
  );

  const handleRecipeChange = useCallback((recipe: Recipe) => {
    setCurrentRecipe(recipe);
    resetGame(recipe);
  }, [resetGame]);

  const handlePlayAgain = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const handleNextRecipe = useCallback(() => {
    const currentIndex = recipes.findIndex((r) => r.id === currentRecipe.id);
    const nextIndex = (currentIndex + 1) % recipes.length;
    handleRecipeChange(recipes[nextIndex]);
  }, [currentRecipe, handleRecipeChange]);

  const activeTheme = themes.find(t => t.id === currentTheme);

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${currentRecipe.backgroundColor} transition-all duration-500 ${activeTheme?.className || ""}`}
    >
      {/* Header */}
      <header className="py-6 px-4">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-4xl mx-auto gap-4">
          {/* Left - Title */}
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-1">
              👨‍🍳 Chef Mariana
            </h1>
            <p className="text-white/90 text-lg">
              Cooking is fun!
            </p>
          </div>

          {/* Right - Controls */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setShowStickers(true)}
              className="bg-teal-500 text-white px-4 py-2 rounded-full font-bold shadow-lg hover:bg-teal-600 transition-transform active:scale-95 flex items-center gap-2 border-2 border-teal-300"
            >
              <span>📒</span> <span className="hidden sm:inline">Stickers</span>
            </button>

            <button
              onClick={() => setShowShop(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-full font-bold shadow-lg hover:bg-purple-700 transition-transform active:scale-95 flex items-center gap-2 border-2 border-purple-400"
            >
              <span>🛍️</span> <span className="hidden sm:inline">Shop</span>
            </button>

            <div className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 border-2 border-yellow-300">
              <span>🪙</span> {coins}
            </div>

            <button
              onClick={() => setIsTimerMode(!isTimerMode)}
              className={`
                px-4 py-2 rounded-full font-bold transition-all duration-300 shadow-lg border-2
                ${isTimerMode ? "bg-red-500 border-red-300 text-white animate-pulse" : "bg-white/20 border-white/40 text-white hover:bg-white/30"}
              `}
            >
              {isTimerMode ? "⏱️ ON" : "⏱️ OFF"}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-8">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {/* Recipe Selector */}
          <RecipeSelector
            recipes={recipes}
            currentRecipe={currentRecipe}
            onSelect={handleRecipeChange}
            totalStars={totalStars}
          />

          {/* Current Recipe Info */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">
              {currentRecipe.icon} {currentRecipe.name}
            </h2>
            <p className="text-white/80">{currentRecipe.description}</p>
          </div>

          {/* Timer Display */}
          {isTimerMode && (
            <div className="flex justify-center mb-6">
              <div className={`
              text-4xl font-black px-8 py-3 rounded-2xl shadow-xl transition-colors duration-300
              ${timeLeft <= 5 ? "bg-red-500 text-white animate-bounce" :
                  timeLeft <= 10 ? "bg-orange-400 text-white" : "bg-white text-gray-800"}
            `}>
                ⏱️ {timeLeft}s
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <ProgressBar
            current={selectedIngredients.length}
            total={currentRecipe.correctIngredients.length}
          />

          {/* Game Area */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Plate */}
            <div className="order-1 md:order-2">
              <Plate
                selectedIngredients={selectedIngredients}
                recipe={currentRecipe}
                isComplete={isComplete}
              />
              {isComplete && (
                <p className="text-center text-white font-bold text-xl mt-4 animate-pulse">
                  Perfect! You did it! 🎉
                </p>
              )}
            </div>

            {/* Ingredients */}
            <div className="order-2 md:order-1">
              <h3 className="text-xl font-bold text-white mb-4 text-center">
                Choose the ingredients:
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-4 justify-items-center">
                {allIngredients.map((ingredient) => (
                  <IngredientCard
                    key={ingredient.id}
                    ingredient={ingredient}
                    onClick={() => handleIngredientClick(ingredient)}
                    isSelected={selectedIngredients.some(
                      (i) => i.id === ingredient.id
                    )}
                    isWrong={shakeIngredientId === ingredient.id}
                    disabled={isComplete || isGameOver}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Hint Section */}
          <div className="mt-8 text-center">
            <div className="inline-block bg-white/20 backdrop-blur rounded-2xl px-6 py-4">
              <p className="text-white font-medium">
                💡 <strong>Hint:</strong> A {currentRecipe.name} needs{" "}
                {currentRecipe.correctIngredients.length} ingredients!
              </p>
            </div>
          </div>
        </DndContext>
      </main>

      {/* Wrong Ingredient Modal */}
      <WrongIngredientModal
        ingredient={wrongIngredient}
        onClose={() => setWrongIngredient(null)}
      />

      {/* Success Modal */}
      {
        showSuccess && (
          <SuccessModal
            recipe={currentRecipe}
            mistakes={mistakes}
            earnedCoins={earnedCoinsLastGame}
            onPlayAgain={handlePlayAgain}
            onNextRecipe={handleNextRecipe}
            onClose={() => setShowSuccess(false)}
          />
        )
      }

      {/* Stickers Modal */}
      {
        showStickers && (
          <StickerBookModal
            recipes={recipes}
            unlockedStickers={unlockedStickers}
            onClose={() => setShowStickers(false)}
          />
        )
      }

      {/* Shop Modal */}
      {
        showShop && (
          <ShopModal
            coins={coins}
            unlockedThemes={unlockedThemes}
            currentThemeId={currentTheme}
            onBuy={(theme) => {
              if (coins >= theme.price) {
                setCoins(prev => prev - theme.price);
                setUnlockedThemes(prev => [...prev, theme.id]);
              }
            }}
            onEquip={(themeId) => setCurrentTheme(themeId)}
            onClose={() => setShowShop(false)}
          />
        )
      }

      {/* Time's Up Modal */}
      {
        isGameOver && (
          <TimesUpModal
            onTryAgain={handlePlayAgain}
            onChangeMode={() => {
              setIsTimerMode(false);
              setIsGameOver(false);
            }}
          />
        )
      }

      {/* Custom Styles */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes pop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.3); }
          50% { box-shadow: 0 0 40px rgba(255, 255, 255, 0.6); }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .animate-pop {
          animation: pop 0.3s ease-out forwards;
        }

        .animate-bounce-slow {
          animation: bounce-slow 1s ease-in-out infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        /* Fun hover effects for ingredient cards */
        .ingredient-card:hover .ingredient-icon {
          animation: wiggle 0.3s ease-in-out;
        }
      `}</style>
    </div >
  );
}

export default App;
