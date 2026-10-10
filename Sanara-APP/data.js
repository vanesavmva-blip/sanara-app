/* SANARA AI Tool — knowledge data (from the SANARA Kids Digital Product Creator knowledge files) */

const BRAND = ["#2d6a2e", "#5fae3e", "#f6c12a", "#ef6fa2", "#2ea3c3", "#9b6bd3"];

const PRODUCTS = [
  { id: "storybook", label: "Storybook", emoji: "📖", desc: "A picture book with a story, characters and illustrations" },
  { id: "workbook", label: "Kids Workbook", emoji: "✏️", desc: "Practice pages: ABC, numbers, math, tracing and more" },
  { id: "activity", label: "Activity Book", emoji: "🧩", desc: "Coloring, mazes, matching, word search and puzzles" },
  { id: "game", label: "Interactive Game", emoji: "🎲", desc: "Matching, memory, quiz, board and sorting games" },
  { id: "pack", label: "Printable Learning Pack", emoji: "🗂️", desc: "5–10 related activities around ONE theme" },
  { id: "bundle", label: "Complete Kids Bundle", emoji: "🎁", desc: "The premium workflow: several products in one bundle" },
];

const AGES = [
  { id: "2-4", label: "Ages 2-4" },
  { id: "4-6", label: "Ages 4-6" },
  { id: "6-8", label: "Ages 6-8" },
  { id: "8-10", label: "Ages 8-10" },
  { id: "10-12", label: "Ages 10-12" },
];

const AGE_VISUAL = {
  "2-4": "very large simple shapes, very simple background, bright clear colors, friendly expressions, minimal details, strong silhouettes",
  "4-6": "simple scene, expressive characters, bright colors, moderate decorative elements, clear focal point",
  "6-8": "more detailed environment, expressive storytelling, moderate visual complexity, adventure elements",
  "8-10": "more sophisticated composition, greater environmental detail, less babyish character design, mature but child-friendly colors",
  "10-12": "polished illustration, sophisticated character design, greater detail, no preschool styling",
};

const AGE_TEXT = {
  "2-4": "1 very short sentence per page (max 8 words), lots of repetition, simple words, clear emotions",
  "4-6": "1-2 short sentences per page, simple vocabulary, some repetition, a clear positive lesson",
  "6-8": "2-4 sentences per page, richer vocabulary, a little dialogue, clear beginning-middle-end",
  "8-10": "a short paragraph per page, dialogue, descriptive language, a meaningful lesson",
  "10-12": "1-2 paragraphs per page, deeper feelings and problem solving, more mature (still child-safe) themes",
};

const STYLES = [
  { id: "cute", label: "Cute Cartoon", prompt: "cute cartoon children's illustration, rounded forms, friendly proportions, expressive faces, clean outlines, bright cheerful colors" },
  { id: "watercolor", label: "Soft Watercolor", prompt: "soft watercolor children's illustration, gentle watercolor textures, soft edges, light paper texture, delicate colors, warm handmade feeling" },
  { id: "modern", label: "Modern Children's Book", prompt: "modern professional children's picture-book illustration, expressive shapes, controlled color palette, clean composition, subtle texture" },
  { id: "kawaii", label: "Kawaii", prompt: "kawaii illustration style, very cute rounded forms, large expressive eyes, tiny simplified features, soft cheerful colors, simple shapes" },
  { id: "hand", label: "Hand-Drawn", prompt: "hand-drawn children's illustration, organic outlines, subtle handmade imperfections, gentle texture, illustrated storybook feeling" },
  { id: "paper", label: "Paper-Cut Style", prompt: "paper-cut craft illustration, layered paper shapes, soft dimensional shadows, simple geometric forms, craft-inspired aesthetic" },
  { id: "3d", label: "Colorful 3D Cartoon", prompt: "colorful polished 3D children's cartoon style, soft dimensional forms, rounded child-friendly modeling, polished playful surfaces, bright gentle lighting, cheerful colors" },
  { id: "minimal", label: "Minimal Educational", prompt: "minimal educational illustration, clean simple shapes, bold readable silhouettes, minimal detail, flat colors, high visual clarity" },
  { id: "auto", label: "Let AI choose", prompt: "" },
];

const STORY_TYPES = ["Adventure", "Friendship", "Bedtime Story", "Educational Story", "Life Lesson", "Funny Story", "Fantasy", "Animal Story"];

const STORY_IDEAS = {
  "Adventure": ["A little bear crosses a wobbly bridge to reach friends", "A brave mouse follows a treasure map around the garden", "A tiny turtle explores the beach for the first time", "Two friends build a raft to find a lost kite", "A young explorer searches for the rainbow's end"],
  "Friendship": ["A quiet rabbit and a loud little lion learn to listen", "A new kid at school finds a friend in an unexpected place", "Two friends who disagree build something together", "A shy owl learns to say hello", "A puppy shares its favorite toy"],
  "Bedtime Story": ["The Moon's goodnight parade across the sky", "A sleepy bunny counts the stars", "Animals of the forest get ready for bed", "A little cloud looks for a cozy place to sleep", "A soft lullaby travels from house to house"],
  "Educational Story": ["The little water drop's journey (water cycle)", "The seed that wanted to see the sun (plant growth)", "A bee's busy day (pollination)", "A trip around the planets in a cardboard rocket", "Counting friends at the farm"],
  "Life Lesson": ["A little bird learns patience while planting seeds", "A young lion learns calming steps when angry", "A turtle who couldn't fly discovers its own strengths", "A kite that almost works teaches trying again", "An umbrella passes kindness from friend to friend"],
  "Funny Story": ["A penguin who wants to be a chef", "The day the socks went missing", "A giraffe who can't find a hat that fits", "A dinosaur learns to tiptoe at the library", "A cat who thinks it's a dog"],
  "Fantasy": ["A baby dragon who is afraid of the dark", "A unicorn loses its sparkle and finds it again", "A tiny fairy repairs a broken rainbow", "A magical door appears in the garden", "A friendly cloud castle needs a helper"],
  "Animal Story": ["A baby elephant learns to use its trunk", "Farm animals plan a surprise party", "A fox and a rabbit become unlikely friends", "A little octopus learns to share its toys", "A lost duckling finds its way home"],
};

const STORY_LESSON = {
  "Adventure": "Courage means trying even when you feel nervous",
  "Friendship": "Listening and kindness make friendships stronger",
  "Bedtime Story": "Feeling safe, calm and loved at bedtime",
  "Educational Story": "Learning about the world is exciting",
  "Life Lesson": "Small steps and trying again help us grow",
  "Funny Story": "It's okay to be yourself and laugh at little mistakes",
  "Fantasy": "Believing in yourself is a kind of magic",
  "Animal Story": "Everyone has their own special strengths",
};

const STORY_12 = [
  ["Introduce character", "smiles and waves hello, introducing themselves", "happy and welcoming"],
  ["Introduce setting", "walks through their everyday world, showing where they live", "curious and cheerful"],
  ["Introduce desire or goal", "dreams about what they really want", "hopeful and excited"],
  ["Introduce small problem", "discovers the problem standing in the way", "surprised and a little worried"],
  ["First solution", "tries a first idea to solve the problem", "determined"],
  ["Solution does not work", "watches the first idea not work out", "disappointed but not scared"],
  ["Character feels emotion", "sits quietly feeling their big feelings", "sad but gentle"],
  ["Encouragement", "receives kind encouragement from a friend", "comforted and thoughtful"],
  ["Tries again", "tries again with a new idea", "brave and focused"],
  ["Problem is solved", "succeeds and solves the problem", "joyful and proud"],
  ["Reflects on the lesson", "thinks about what they learned", "calm and wise"],
  ["Warm ending", "enjoys a warm, happy ending with friends", "peaceful and happy"],
];

const STORY_16 = [
  ["Character introduction", "smiles and waves hello, introducing themselves", "happy and welcoming"],
  ["Normal world", "goes about a normal day in their world", "cheerful"],
  ["Goal", "discovers what they really want to do", "excited and hopeful"],
  ["Problem begins", "notices the problem for the first time", "surprised"],
  ["First attempt", "tries a first idea", "determined"],
  ["First obstacle", "meets the first obstacle", "puzzled"],
  ["Second attempt", "tries a different idea", "focused"],
  ["Second obstacle", "faces a second obstacle", "a little frustrated but safe"],
  ["Emotional moment", "takes a quiet moment with their feelings", "gently sad"],
  ["New idea", "suddenly has a bright new idea", "inspired, eyes wide"],
  ["Try again", "tries again with the new idea", "brave"],
  ["Progress", "makes real progress", "encouraged and smiling"],
  ["Big challenge", "faces the biggest (child-safe) challenge", "determined and brave"],
  ["Success", "succeeds at last", "overjoyed and proud"],
  ["Lesson", "shares what they learned with a friend", "warm and thoughtful"],
  ["Happy closing scene", "enjoys a happy closing moment", "peaceful and content"],
];

const TEXT_SPACES = [
  "generous uncluttered space in the upper left for story text",
  "a clear open sky area across the upper third for story text",
  "open space on the right side for story text",
  "a calm uncluttered band along the bottom for story text",
];

const WORKBOOK_SKILLS = ["ABC / Alphabet", "Numbers", "Math", "Reading", "Writing", "Tracing", "Shapes", "Colors", "Vocabulary", "Mixed workbook"];
const ACTIVITY_TYPES = ["Coloring Pages", "Mazes", "Matching Games", "Spot the Difference", "Word Search", "Simple Puzzles", "Cut and Paste", "Tracing", "Dot-to-Dot", "Mixed Activity Book"];
const GAME_TYPES = ["Matching Game", "Memory Cards", "Flashcard Game", "Scavenger Hunt", "Quiz Game", "Board Game", "Sorting Game", "Guessing Game", "Learning Challenge", "Surprise me"];
const BUNDLE_TYPES = ["Preschool Learning Bundle", "Story + Activity Bundle", "Homeschool Learning Bundle", "Birthday Activity Bundle", "Classroom Activity Bundle", "Themed Kids Mega Bundle"];
const BUNDLE_SIZES = [
  { label: "Mini Bundle", sub: "10-15 pages", pages: 12 },
  { label: "Standard Bundle", sub: "20-30 pages", pages: 25 },
  { label: "Big Bundle", sub: "40-60 pages", pages: 50 },
  { label: "Mega Bundle", sub: "60+ pages", pages: 70 },
];
const DIFFICULTY = ["Easy", "Medium", "Challenging", "Mixed"];

const GOALS = {
  "2-4": ["Colors", "Shapes", "First words", "Simple counting 1-5", "Emotions", "Everyday routines", "Big vs small", "Fine motor skills"],
  "4-6": ["Alphabet", "Numbers 1-10", "Counting", "Patterns", "Beginning sounds", "Sorting", "Basic logic", "Tracing"],
  "6-8": ["Reading", "Addition & subtraction", "Word puzzles", "Sequencing", "Classification", "Creative writing", "Logic"],
  "8-10": ["Word problems", "Reading comprehension", "Writing prompts", "Critical thinking", "Science concepts", "Problem solving"],
  "10-12": ["Independent thinking", "Journaling", "Multi-step math", "Life skills", "Planning", "Money skills"],
};

/* Theme kits (Library 45 — Reusable Theme Kit) */
const THEMES = [
  { key: ["dino"], name: "Dinosaurs", colors: [["Leaf Green", "#6bbf59"], ["Sunny Yellow", "#f7c948"], ["Warm Orange", "#f29e4c"], ["Sky Blue", "#7ec8e3"], ["Earth Brown", "#9c6b45"]], bg: "#fbf8ef", setting: "a friendly prehistoric valley with rounded palm trees, ferns, small volcanoes in the distance and colorful flowers", deco: ["dinosaur footprints", "leaves", "tiny stars", "eggs"], objects: ["baby triceratops", "baby T-rex", "baby stegosaurus", "dinosaur egg", "palm tree", "volcano", "fern leaf", "dinosaur footprint"], char: { name: "Dino Dot", species: "friendly baby triceratops", hair: "a rounded mint-green body with three small cream-colored horns", eyes: "large expressive brown eyes", clothing: "a tiny orange scarf", shoes: "no shoes", acc: "a small explorer backpack", sig: "a heart-shaped spot on its tail" } },
  { key: ["ocean", "sea", "mermaid", "fish"], name: "Ocean Animals", colors: [["Ocean Blue", "#2e86c1"], ["Aqua", "#48c9b0"], ["Coral", "#f1948a"], ["Sunny Yellow", "#f7dc6f"], ["Seafoam", "#a3e4d7"]], bg: "#f4fbfb", setting: "a bright friendly underwater reef with colorful coral, soft bubbles, seaweed and rays of sunlight", deco: ["bubbles", "shells", "waves", "starfish"], objects: ["smiling dolphin", "sea turtle", "octopus", "clownfish", "starfish", "seashell", "crab", "whale"], char: { name: "Coral", species: "little sea turtle", hair: "a soft teal shell with rounded hexagon patterns and light green skin", eyes: "big friendly black eyes", clothing: "a pink flower behind one ear", shoes: "no shoes", acc: "", sig: "a tiny golden star on its shell" } },
  { key: ["farm", "barn", "cow"], name: "Farm Animals", colors: [["Barn Red", "#d9534f"], ["Grass Green", "#7cb342"], ["Hay Yellow", "#f4d03f"], ["Sky Blue", "#85c1e9"], ["Cream", "#fdf6e3"]], bg: "#fffaf0", setting: "a sunny farm with a red barn, rolling green hills, a wooden fence and a few fluffy clouds", deco: ["sunflowers", "hay bales", "fence posts", "clouds"], objects: ["cow", "pig", "sheep", "chicken", "horse", "duck", "red barn", "tractor"], char: { name: "Penny", species: "small cheerful piglet", hair: "soft pink skin and a curly tail", eyes: "bright blue eyes", clothing: "green denim overalls", shoes: "small yellow rain boots", acc: "a straw hat", sig: "a daisy tucked in the hat" } },
  { key: ["space", "planet", "rocket", "astronaut"], name: "Space", colors: [["Deep Navy", "#1f3a68"], ["Rocket Red", "#e74c3c"], ["Star Yellow", "#f9e154"], ["Planet Purple", "#9b6bd3"], ["Sky Teal", "#3cc4c4"]], bg: "#f6f7fd", setting: "a friendly outer-space scene with colorful smiling planets, twinkling stars and a soft dark-blue sky", deco: ["stars", "planets", "comets", "moons"], objects: ["rocket", "planet with rings", "smiling moon", "shooting star", "astronaut helmet", "telescope", "friendly alien", "satellite"], char: { name: "Astro Ava", species: "young girl astronaut, about 6 years old, with warm brown skin", hair: "curly black hair in two puffs", eyes: "big bright brown eyes", clothing: "a white-and-orange space suit", shoes: "chunky white space boots", acc: "a round clear helmet under her arm", sig: "a star-shaped patch on her sleeve" } },
  { key: ["jungle", "safari", "zoo"], name: "Jungle Animals", colors: [["Jungle Green", "#239b56"], ["Banana Yellow", "#f7dc6f"], ["Tiger Orange", "#eb984e"], ["Parrot Red", "#e74c3c"], ["Leaf Lime", "#abebc6"]], bg: "#f7fbf2", setting: "a lush friendly jungle with big rounded leaves, hanging vines, colorful flowers and a gentle river", deco: ["big leaves", "vines", "flowers", "paw prints"], objects: ["lion cub", "elephant", "monkey", "giraffe", "parrot", "zebra", "banana bunch", "palm leaf"], char: { name: "Leo", species: "playful lion cub", hair: "golden fur with a fluffy orange mane", eyes: "warm amber eyes", clothing: "a green safari vest", shoes: "no shoes", acc: "tiny binoculars around the neck", sig: "a tuft of mane that sticks straight up" } },
  { key: ["unicorn", "magic", "fairy", "princess", "castle", "dragon"], name: "Magical Kingdom", colors: [["Lavender", "#b39ddb"], ["Pastel Pink", "#f8bbd0"], ["Mint", "#a5d6a7"], ["Sky Blue", "#90caf9"], ["Gold", "#f6c12a"]], bg: "#fdf7fb", setting: "a magical pastel kingdom with a small rounded castle, rainbow, soft clouds and sparkling flowers", deco: ["sparkles", "rainbows", "crowns", "stars"], objects: ["unicorn", "baby dragon", "rainbow", "crystal", "crown", "magic wand", "golden key", "dragon egg"], char: { name: "Luna", species: "young unicorn with a small rounded white body", hair: "a pastel rainbow mane and tail", eyes: "large warm brown eyes with rosy cheeks", clothing: "no clothing", shoes: "no shoes", acc: "a lavender horn", sig: "a tiny star mark on one hoof" } },
  { key: ["wood", "forest", "fox", "bear"], name: "Woodland Friends", colors: [["Fox Orange", "#e67e22"], ["Moss Green", "#7d9d4f"], ["Acorn Brown", "#8d6e63"], ["Berry Red", "#c0392b"], ["Cream", "#fbf3e4"]], bg: "#fcf8f0", setting: "a cozy woodland clearing with rounded trees, mushrooms, a winding path and warm sunlight through the leaves", deco: ["leaves", "acorns", "mushrooms", "stars"], objects: ["fox", "rabbit", "bear cub", "owl", "hedgehog", "acorn", "mushroom", "pinecone"], char: { name: "Milo", species: "cheerful young brown bear", hair: "soft caramel-brown fur and small rounded ears", eyes: "large expressive hazel eyes", clothing: "blue denim overalls over a sunny yellow T-shirt", shoes: "small red sneakers", acc: "", sig: "a tiny dark-brown nose and a warm smile" } },
  { key: ["construct", "truck", "vehicle", "car", "train"], name: "Construction Vehicles", colors: [["Safety Yellow", "#f4c20d"], ["Orange", "#f39c12"], ["Steel Blue", "#5d8aa8"], ["Charcoal", "#4a4a4a"], ["Sky", "#d6eaf8"]], bg: "#fbfaf5", setting: "a friendly construction site with sand piles, traffic cones, rounded hills and a sunny sky", deco: ["traffic cones", "bolts", "tire tracks", "stars"], objects: ["dump truck", "excavator", "bulldozer", "crane", "cement mixer", "traffic cone", "hard hat", "road roller"], char: { name: "Dez", species: "friendly yellow dump truck with a smiling face", hair: "a rounded yellow body with big black wheels", eyes: "large friendly headlight eyes", clothing: "an orange stripe along its side", shoes: "no shoes", acc: "a small orange hard hat on top", sig: "a happy bumper smile" } },
  { key: ["weather", "rain", "season"], name: "Weather", colors: [["Sun Yellow", "#f7c948"], ["Rain Blue", "#5dade2"], ["Cloud Gray", "#d5dbdb"], ["Rainbow Pink", "#f5b7b1"], ["Leaf Green", "#82e0aa"]], bg: "#f8fbfd", setting: "a cheerful sky with a smiling sun, fluffy clouds, a gentle rainbow and light rain over green hills", deco: ["clouds", "raindrops", "snowflakes", "suns"], objects: ["smiling sun", "rain cloud", "rainbow", "snowflake", "umbrella", "raincoat", "wind kite", "snowman"], char: { name: "Pip", species: "little round cloud character", hair: "a fluffy white cloud body", eyes: "big sparkling blue eyes and pink cheeks", clothing: "a tiny yellow rain hat", shoes: "small blue rain boots", acc: "a mini rainbow umbrella", sig: "three little raindrops that float beside it" } },
  { key: ["emotion", "feeling", "kind", "sel"], name: "Emotions & Kindness", colors: [["Happy Yellow", "#f7d154"], ["Calm Blue", "#7fb3d5"], ["Kind Pink", "#f5a9c4"], ["Fresh Green", "#82c99a"], ["Gentle Purple", "#b9a0e0"]], bg: "#fffaf3", setting: "a warm cozy classroom and playground with soft colors and friendly details", deco: ["hearts", "smiles", "stars", "clouds"], objects: ["happy face", "sad face", "angry face", "surprised face", "calm face", "heart", "hug", "helping hands"], char: { name: "Rosie", species: "small cream-colored rabbit", hair: "soft cream fur and long floppy ears with pink insides", eyes: "bright green eyes", clothing: "a lavender dress", shoes: "white sneakers", acc: "a yellow heart necklace", sig: "rosy blush cheeks" } },
  { key: ["health", "habit", "routine", "food"], name: "Healthy Habits", colors: [["Apple Red", "#e74c3c"], ["Fresh Green", "#58d68d"], ["Orange", "#f5b041"], ["Water Blue", "#5dade2"], ["Cream", "#fdf6e3"]], bg: "#fffdf7", setting: "a bright cheerful home and garden with fruits, vegetables and soft morning light", deco: ["fruits", "water drops", "stars", "hearts"], objects: ["red apple", "banana", "carrot", "broccoli", "toothbrush", "water glass", "soap bubbles", "bed with pillow"], char: { name: "Benny", species: "cheerful young boy, about 5 years old, with light tan skin", hair: "short wavy brown hair", eyes: "big friendly green eyes", clothing: "a striped orange T-shirt and blue shorts", shoes: "green sneakers", acc: "", sig: "a small freckle on his nose" } },
  { key: ["alphabet", "abc", "letter"], name: "Alphabet Adventure", colors: [["Green", "#5fae3e"], ["Yellow", "#f6c12a"], ["Pink", "#ef6fa2"], ["Teal", "#2ea3c3"], ["Purple", "#9b6bd3"]], bg: "#fff9ec", setting: "a cheerful classroom of building blocks, books and colorful letters", deco: ["alphabet blocks", "stars", "pencils", "books"], objects: ["apple", "ball", "cat", "duck", "egg", "fish", "goat", "hat"], char: { name: "Bea", species: "friendly little bumblebee", hair: "a round yellow body with soft black stripes", eyes: "huge shiny brown eyes", clothing: "a tiny blue backpack", shoes: "no shoes", acc: "a pencil she holds like a wand", sig: "heart-shaped wings" } },
  { key: ["number", "count", "math"], name: "Numbers & Counting", colors: [["Teal", "#2ea3c3"], ["Sunny Yellow", "#f6c12a"], ["Berry Pink", "#ef6fa2"], ["Leaf Green", "#5fae3e"], ["Grape", "#9b6bd3"]], bg: "#fbfdf8", setting: "a playful toy room full of building blocks, balls and stars", deco: ["stars", "dots", "blocks", "balloons"], objects: ["star", "balloon", "apple", "ladybug", "ball", "building block", "cupcake", "butterfly"], char: { name: "Owlie", species: "small round owl", hair: "soft purple feathers and a cream belly", eyes: "big round golden eyes with glasses", clothing: "a little green bow tie", shoes: "no shoes", acc: "a tiny abacus", sig: "tufted ear feathers shaped like number ones" } },
  { key: ["birthday", "party"], name: "Birthday Party", colors: [["Party Pink", "#ef6fa2"], ["Confetti Yellow", "#f6c12a"], ["Balloon Blue", "#5dade2"], ["Mint", "#82e0aa"], ["Grape", "#a569bd"]], bg: "#fffafc", setting: "a joyful birthday party with balloons, streamers, a cake and presents", deco: ["confetti", "balloons", "streamers", "stars"], objects: ["birthday cake", "balloon", "gift box", "party hat", "cupcake", "candle", "party horn", "ice cream cone"], char: { name: "Pippa", species: "cheerful little panda", hair: "soft black-and-white fur", eyes: "big shiny black eyes", clothing: "a pink party dress with polka dots", shoes: "sparkly purple shoes", acc: "a striped party hat", sig: "a balloon tied to her wrist" } },
];

const GENERIC_OBJECTS = ["star", "heart", "rainbow", "cloud", "flower", "balloon", "sun", "butterfly"];

const CHAR_PRESETS = {
  child: [
    { name: "Mia", species: "cheerful young girl, about 6 years old, with warm light-brown skin", hair: "shoulder-length dark brown hair with straight bangs", eyes: "large sparkling brown eyes", clothing: "a sunny yellow T-shirt under blue overalls", shoes: "white sneakers", acc: "a small green leaf hair clip", sig: "rosy cheeks and a big smile", personality: "curious, kind, brave" },
    { name: "Theo", species: "friendly young boy, about 6 years old, with deep brown skin", hair: "short curly black hair", eyes: "big bright brown eyes", clothing: "a red hoodie and denim shorts", shoes: "blue sneakers", acc: "a green backpack", sig: "a gap-toothed grin", personality: "playful, helpful, funny" },
  ],
  animal: [
    { name: "Milo", species: "cheerful young brown bear", hair: "soft caramel-brown fur and small rounded ears", eyes: "large expressive hazel eyes", clothing: "blue denim overalls over a sunny yellow T-shirt", shoes: "small red sneakers", acc: "", sig: "a tiny dark-brown nose and warm smile", personality: "curious, gentle, playful, brave" },
    { name: "Hazel", species: "small cream-colored bunny", hair: "soft cream fur and long ears with pink insides", eyes: "bright green eyes", clothing: "a lavender dress", shoes: "white sneakers", acc: "a yellow flower crown", sig: "a fluffy round tail", personality: "kind, thoughtful, cheerful" },
  ],
  magical: [
    { name: "Luna", species: "young unicorn with a small rounded white body", hair: "a pastel rainbow mane and tail", eyes: "large warm brown eyes with rosy cheeks", clothing: "no clothing", shoes: "no shoes", acc: "a lavender horn", sig: "a tiny star mark on one hoof", personality: "cheerful, gentle, curious" },
    { name: "Ember", species: "friendly baby dragon", hair: "a rounded mint-green body with a cream belly and tiny purple wings", eyes: "large expressive brown eyes", clothing: "a small orange scarf", shoes: "no shoes", acc: "two small rounded horns", sig: "puffs of sparkly pink smoke when it giggles", personality: "brave, silly, loyal" },
  ],
  robot: [
    { name: "Bolt", species: "small friendly robot", hair: "a rounded sky-blue metal body with a dome head", eyes: "big round glowing green screen eyes", clothing: "a yellow chest panel with three colored buttons", shoes: "little orange wheel feet", acc: "a springy antenna with a star on top", sig: "a heart-shaped light that glows when happy", personality: "helpful, curious, clever" },
  ],
};

const LETTER_WORDS = { A: "apple", B: "ball", C: "cat", D: "duck", E: "egg", F: "fish", G: "goat", H: "hat", I: "igloo", J: "jellyfish", K: "kite", L: "lion", M: "moon", N: "nest", O: "octopus", P: "pig", Q: "quilt", R: "rabbit", S: "sun", T: "tree", U: "umbrella", V: "violin", W: "whale", X: "xylophone", Y: "yo-yo", Z: "zebra" };
const SHAPES = ["circle", "square", "triangle", "rectangle", "oval", "star", "heart", "diamond", "pentagon", "hexagon"];
const COLOR_OBJECTS = [["red", "apple"], ["blue", "whale"], ["yellow", "sun"], ["green", "frog"], ["orange", "carrot"], ["purple", "grapes"], ["pink", "flamingo"], ["brown", "teddy bear"], ["black", "penguin"], ["white", "cloud"]];
const TRACING_STEPS = ["Vertical lines", "Horizontal lines", "Curves", "Waves", "Zigzags", "Circles", "Shapes", "Simple pictures", "Letters", "Numbers"];
const WRITING_PROMPTS = {
  "2-4": ["Draw your favorite animal", "Draw your family", "Scribble a happy rainbow"],
  "4-6": ["Write your favorite color", "Draw and label your pet (real or pretend)", "Write one thing that makes you happy", "Copy the word 'sun'"],
  "6-8": ["If I had a magic hat I would...", "Write 3 sentences about your best day", "Describe your dream treehouse", "Write a thank-you note to a friend"],
  "8-10": ["Invent a new animal and describe its home", "Write a story that starts with 'The door was open...'", "Explain how to make your favorite snack", "Write a letter to your future self"],
  "10-12": ["Describe a problem in your community and one solution", "Write a short story told by a lost sock", "What would you invent to help people?", "Write about a time you showed courage"],
};

/* Product ideas (Knowledge File 2) */
const IDEAS = [
  ["2-4", "workbook", "My First Colors Adventure", "Children identify and match basic colors using friendly objects and characters.", "Colors"],
  ["2-4", "activity", "Little Animal Match", "Match animal to shadow, parent and baby, animal to food, find the same animal.", "Farm"],
  ["2-4", "workbook", "Shapes Around Me", "Trace, find, match and color circles, squares, triangles, stars and hearts.", "Shapes"],
  ["2-4", "storybook", "My Happy Feelings Book", "Introduce happy, sad, angry, scared, excited and calm with simple faces.", "Emotions"],
  ["2-4", "workbook", "My First Numbers 1-10", "Number recognition, tracing, counting, matching and simple coloring.", "Numbers"],
  ["2-4", "pack", "Little Morning Routine", "A visual routine printable: wake up, brush teeth, get dressed, breakfast.", "Healthy Habits"],
  ["2-4", "activity", "Big or Small?", "Simple visual comparison activities with friendly objects.", "Jungle"],
  ["2-4", "pack", "My First Farm Adventure", "Farm animal sounds, matching, counting and coloring.", "Farm"],
  ["2-4", "pack", "Little Ocean Friends", "Ocean animal matching, counting bubbles and coloring.", "Ocean"],
  ["2-4", "workbook", "Tiny Hands Tracing Book", "Big, easy tracing paths from lines to simple pictures.", "Woodland"],
  ["4-6", "workbook", "Dinosaur Alphabet Adventure", "A-Z letters with friendly dinosaurs: trace, find and match.", "Dinosaurs"],
  ["4-6", "pack", "Space Numbers Mission", "Count, trace and match numbers on a rocket mission.", "Space"],
  ["4-6", "pack", "Mermaid Underwater Learning Pack", "Ocean-themed letters, counting, patterns and coloring.", "Ocean"],
  ["4-6", "activity", "Little Detective Activity Book", "Find the difference, hidden objects and simple logic.", "Woodland"],
  ["4-6", "workbook", "My First Phonics Adventure", "Beginning sounds, rhymes and simple CVC words.", "Alphabet"],
  ["4-6", "workbook", "Monster Math", "Friendly monsters make counting and adding fun.", "Numbers"],
  ["4-6", "storybook", "My Feelings Toolkit", "Name feelings and learn calm-down strategies.", "Emotions"],
  ["4-6", "game", "Animal Habitat Match", "Match each animal to its home: ocean, jungle, farm, forest.", "Jungle"],
  ["4-6", "bundle", "Ready for School Bundle", "Letters, numbers, shapes, routines and a certificate.", "Alphabet"],
  ["6-8", "storybook", "Space Explorer Reading Adventure", "Short reading passages with comprehension questions.", "Space"],
  ["6-8", "workbook", "Jungle Math Challenge", "Addition, subtraction and word problems in the jungle.", "Jungle"],
  ["6-8", "workbook", "Little Scientist Workbook", "Simple experiments, observation and science vocabulary.", "Weather"],
  ["6-8", "pack", "Kindness Challenge for Kids", "Daily kindness missions, journal pages and badges.", "Emotions"],
  ["6-8", "workbook", "Story Builder Workbook", "Characters, settings and plots to write your own stories.", "Magical"],
  ["6-8", "workbook", "Money Basics for Kids", "Coins, counting money and simple shopping games.", "Numbers"],
  ["6-8", "activity", "Mystery Puzzle Book", "Logic puzzles, codes and mazes with a mystery to solve.", "Woodland"],
  ["6-8", "activity", "Growth Mindset Activity Book", "Positive thinking activities and 'yet' challenges.", "Emotions"],
  ["8-10", "workbook", "Young Entrepreneur Workbook", "Plan a lemonade stand: ideas, costs and selling.", "Numbers"],
  ["8-10", "workbook", "Creative Writing Adventure", "Writing prompts, story maps and character builders.", "Magical"],
  ["8-10", "activity", "STEM Challenge Book", "Build, test and improve simple engineering challenges.", "Construction"],
  ["8-10", "activity", "Brain Booster Puzzle Book", "Word searches, logic grids and number puzzles.", "Space"],
  ["8-10", "workbook", "Confidence Journal for Kids", "Daily prompts for strengths, goals and gratitude.", "Emotions"],
  ["8-10", "game", "World Geography Challenge", "Quiz cards about continents, oceans and animals.", "Ocean"],
  ["10-12", "workbook", "Goal Getter Planner for Kids", "Set goals, plan steps and track progress.", "Healthy Habits"],
  ["10-12", "workbook", "Future Career Explorer", "Explore jobs, skills and dream careers.", "Construction"],
  ["10-12", "workbook", "Junior Money Skills Workbook", "Budgets, saving goals and smart spending.", "Numbers"],
  ["10-12", "workbook", "Science Investigation Journal", "Ask questions, predict, test and record results.", "Weather"],
  ["10-12", "workbook", "Digital Citizenship Workbook", "Online kindness, privacy and smart choices.", "Emotions"],
  ["10-12", "activity", "Young Problem Solver Challenge", "Scenario cards and multi-step logic challenges.", "Space"],
];

/* Protected characters/franchises → original alternative (IP rules) */
const PROTECTED = [
  ["bluey", "a playful family of friendly cartoon dogs learning through everyday adventures"],
  ["paw patrol", "a team of brave rescue puppies with their own original gadgets"],
  ["peppa", "a cheerful family of original farm animals who love muddy puddles"],
  ["elsa", "an original magical ice princess with her own winter kingdom"],
  ["frozen", "an original snowy kingdom with a kind ice-magic heroine"],
  ["disney", "an original fairy-tale world"],
  ["pixar", "an original toy-world adventure"],
  ["pokemon", "original pocket-sized creature explorers"],
  ["pokémon", "original pocket-sized creature explorers"],
  ["pikachu", "an original electric yellow creature friend"],
  ["marvel", "original kid superheroes with their own powers"],
  ["spider-man", "an original kid superhero who climbs walls"],
  ["spiderman", "an original kid superhero who climbs walls"],
  ["batman", "an original kid night-time hero"],
  ["superman", "an original flying kid superhero"],
  ["hello kitty", "an original cute kitten character with a bow"],
  ["mickey", "an original cheerful mouse character"],
  ["minnie", "an original cheerful mouse character"],
  ["cocomelon", "an original sing-along family"],
  ["mario", "an original jumping adventure hero"],
  ["sonic", "an original super-fast hedgehog-style hero"],
  ["minecraft", "an original blocky building world"],
  ["barbie", "an original fashion-loving adventure doll"],
  ["harry potter", "an original young wizard school"],
  ["dora", "an original young explorer with a talking map"],
  ["moana", "an original ocean-voyager heroine"],
  ["stitch", "an original mischievous alien friend"],
];
