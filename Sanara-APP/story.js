/* SANARA — built-in story writer (no ChatGPT needed).
 * Writes page-by-page story text from the Story Mixer choices, sized for the child's age.
 * Present tense, child-safe, original. Loads after app.js helpers are defined (uses rngFrom, pick, shuffle, cap). */

const STORY_TEXT = {
  "Meet the hero": {
    short: ["This is {N}. Hello, {N}!", "Meet {N}, a {sp}. {N} loves to play!"],
    mid: ["This is {N}, a {sp} who lives in {S}. {N} loves {fav}.", "Say hello to {N}! {N} is a {sp} with a big smile and an even bigger heart."],
    more: ["Every morning, {N} wakes up ready for something new.", "{N} is {pers}, and everyone in {S} knows it.", "“Today feels like a special day,” {N} says with a grin."],
  },
  "Everyday world": {
    short: ["{N} plays in {S}.", "Every day, {N} has fun in {S}."],
    mid: ["Every day, {N} explores {S}. There is always something new to see.", "{N} spends sunny days playing in {S}. Life is calm and cozy."],
    more: ["{see}", "Birds sing, the breeze whispers, and {N} hums a happy tune.", "But deep down, {N} wishes for a real adventure."],
  },
  "Meet the friends": {
    short: ["{N} plays with {Fs}.", "Here {comes} {Fs}! Friends are fun."],
    mid: ["{N} has the best {friendWord}: {FsDesc}. Together, they laugh and play all day.", "{Fs} {isAre} {N}'s best {friendWord}. They share snacks, stories and lots of giggles."],
    more: ["“Friends make everything better,” says {F}.", "{F} is {Fpers} and always ready to help.", "No day is boring when they are together."],
  },
  "The big wish": {
    short: ["{N} has a big wish.", "{N} wants to {G}!"],
    mid: ["More than anything, {N} wants to {G}. “Can I really do it?” {N} wonders.", "{N} has a big dream: to {G}. It feels exciting — and a little scary too."],
    more: ["{N} looks far into the distance and imagines how it will feel.", "“One day,” {N} whispers, “one day very soon.”", "The wish feels as big as the sky."],
  },
  "The twist!": {
    short: ["Oh! {TW}", "Look! {TW}"],
    mid: ["Suddenly, something surprising happens. {TW}", "Then — whoosh! {TW} {N} can hardly believe it."],
    more: ["{N}'s eyes grow wide. “What should we do now?”", "This changes everything!", "{N}'s heart goes thump, thump, thump."],
  },
  "First try": {
    short: ["{N} tries. Push, push, push!", "{N} gives it a try."],
    mid: ["{N} has an idea and gives it a try. {N} pushes, pulls and stretches as far as possible.", "“I know!” says {N}, and tries the first idea right away."],
    more: ["It is harder than it looks.", "{N} takes a deep breath and keeps going.", "“Almost… almost…” {N} says."],
  },
  "Oops!": {
    short: ["Oh no! It didn't work.", "Oops! Not this time."],
    mid: ["Oh no! The first idea doesn't work. {N} feels a little sad.", "Wobble, wobble — whoops! The plan doesn't work this time."],
    funShort: ["Oops! SPLAT!", "Boing! Oops! Ha ha!"],
    funMid: ["Oops! {N} slips and lands — SPLAT! — right in a muddy puddle. Everyone giggles, even {N}.", "BOING! The plan bounces the wrong way, and {N} ends up upside down. What a silly mess!"],
    more: ["“That's okay,” {N} says. “I can try again.”", "{N} sits down for a moment to think.", "Mistakes are part of learning."],
  },
  "A clue!": {
    short: ["Look! A clue!", "What is that? A clue!"],
    mid: ["Wait — what's that? {N} spots a clue and looks closer.", "{N} finds a tiny clue. “Aha! This must mean something,” {N} says."],
    more: ["{F} leans in to look too.", "The mystery is getting more interesting.", "“Let's follow it,” {N} whispers."],
  },
  "Big feelings": {
    short: ["{N} feels sad.", "{N} needs a hug."],
    mid: ["{N} sits quietly. Big feelings swirl inside, like clouds before the rain.", "{N}'s eyes feel wet. Sometimes things are really hard."],
    more: ["It is okay to feel this way.", "{N} takes a slow, deep breath.", "Even brave hearts feel sad sometimes."],
  },
  "A helping hand": {
    short: ["{F} gives {N} a hug.", "{F} helps {N}."],
    mid: ["{F} sits next to {N}. “You can do it. I believe in you,” {F} says kindly.", "Then {F} comes over with a warm smile. “Let's try together,” {F} says."],
    more: ["{N} feels a little braver already.", "Sometimes all you need is someone who believes in you.", "Together, things don't seem so scary."],
  },
  "Second try": {
    short: ["{N} tries again!", "Again! {N} tries again!"],
    mid: ["{N} thinks of a brand-new idea. This time, {N} goes slowly and carefully.", "“Let's try it a different way,” says {N}. Step by step, {N} tries again."],
    more: ["Little by little, it starts to work.", "{N} doesn't give up.", "This idea feels just right."],
  },
  "Silly moment": {
    short: ["Boing! Ha ha ha!", "Splash! Giggle, giggle!"],
    mid: ["Boing! A bouncy surprise sends everyone tumbling into a giggly heap. Ha ha ha!", "Splash! A big wave of bubbles tickles everyone's noses. They can't stop laughing!"],
    more: ["Even the birds seem to be laughing.", "Laughing together makes everyone feel lighter.", "“That was the silliest thing ever!” {N} giggles."],
  },
  "Another obstacle": {
    short: ["Uh-oh. Another bump!", "Oh! Something is in the way."],
    mid: ["Uh-oh! One more problem pops up in the way. {N} frowns and thinks hard.", "Just when things are going well, another obstacle appears. Hmm…"],
    more: ["But {N} remembers how far {N} has already come.", "“I won't give up now,” {N} says.", "{N} looks for a new way around it."],
  },
  "Working together": {
    short: ["{N} and {F} work together.", "Teamwork! {N} and {F} help each other."],
    mid: ["{N} and {F} put their heads together. “You hold this, and I'll do that!” Teamwork makes it easier.", "{F} has a clever idea, and {N} adds one more. Together, their plan is perfect."],
    more: ["Two helpers are better than one.", "Their plan is clever and fun.", "Everyone has a job, and every job matters."],
  },
  "Getting closer": {
    short: ["Closer… closer…", "Almost there!"],
    mid: ["Step by step, {N} gets closer and closer. The goal is almost in sight!", "One more step, then another. {N} can see the finish now!"],
    more: ["{N}'s heart beats with excitement.", "“Keep going!” cheers {F}.", "Nothing can stop {N} now."],
  },
  "The big moment": {
    short: ["Now! {N} is brave.", "Ready… set… GO!"],
    mid: ["This is the big moment. {N} takes a deep breath, counts to three and goes for it!", "Everything is quiet. {N} stands tall, feels brave and takes the biggest step of all."],
    more: ["“I can do this,” {N} whispers.", "Everyone holds their breath.", "One… two… three!"],
  },
  "Hooray!": {
    short: ["Hooray! {N} did it!", "Yay! {N} did it!"],
    mid: ["Hooray! {N} did it! Everyone cheers and claps and jumps for joy.", "{N} did it! A great big “HOORAY!” fills {S}."],
    more: ["{N} feels proud from nose to toes.", "“We did it together!” {F} shouts.", "It is the best feeling in the whole world."],
  },
  "What we learned": {
    short: ["{N} learned something new today.", "Now {N} knows something special."],
    mid: ["{N} smiles. “Now I know: {L}.”", "That day, {N} learned something important: {L}."],
    more: ["It is a lesson {N} will always remember.", "And it feels wonderful to know it.", "{F} nods. “I learned it too.”"],
  },
  "Happy celebration": {
    short: ["Party time! Yay!", "Hooray for {N}!"],
    mid: ["That evening, everyone celebrates with music, snacks and happy dancing. What a wonderful day!", "There is a party for {N}! Everyone sings, dances and shares yummy treats."],
    more: ["{N} looks around and smiles the biggest smile.", "It is the perfect end to a perfect adventure.", "The End… for now!"],
  },
  "Sweet dreams": {
    short: ["Goodnight, {N}.", "Shh… {N} is sleepy. Goodnight!"],
    mid: ["Snuggled up in bed, {N} smiles about the day. The stars twinkle. Goodnight, {N}.", "The moon glows softly. {N} yawns a big yawn and drifts off to sleep."],
    more: ["Tomorrow will bring new adventures.", "Sweet dreams, little one.", "Everything is calm and cozy."],
  },
  "A happy surprise": {
    short: ["Surprise! Yay!", "Look! A surprise for {N}!"],
    mid: ["And then — surprise! Everyone has something special waiting for {N}. What a perfect ending!", "Just when the day is ending, a happy surprise appears. {N} can't stop smiling!"],
    more: ["It is the best surprise ever.", "“For me?” {N} gasps.", "Some days really are magical."],
  },
  "To be continued…": {
    short: ["What's next for {N}? To be continued…", "Another adventure? To be continued…"],
    mid: ["As the sun sets, {N} spots something new far away. “Another adventure?” {N} grins. To be continued…", "Just then, a little note floats down. It says: “Your next adventure starts tomorrow!” To be continued…"],
    more: ["{F} giggles. “I can't wait!”", "What could it be?", "Stay tuned!"],
  },
  "Sharing the lesson": {
    short: ["{N} tells everyone what she learned.".replace("she", "{N}"), "{N} shares the lesson with friends."],
    mid: ["{N} shares the lesson with everyone: {L}. Now they all know it too.", "Back home, {N} tells everyone the big lesson of the day: {L}."],
    more: ["Everyone nods and smiles.", "Sharing what we learn helps others too.", "What a wise and wonderful friend {N} is."],
  },
  "Exploring further": {
    short: ["{N} looks around. Wow!", "What's over there?"],
    mid: ["{N} explores a new corner of {S}. Everything looks bright and new.", "Around the bend, {N} finds a place never seen before."],
    more: ["Curiosity leads the way.", "“Let's see what's here,” {N} says.", "Every corner holds a little surprise."],
  },
  "A new discovery": {
    short: ["Look what {N} found!", "Wow! Something new!"],
    mid: ["{N} discovers something wonderful hiding nearby. “Look at this!” {N} calls.", "Under a leaf, {N} finds a tiny treasure. What a lucky discovery!"],
    more: ["{F} comes running to see.", "It sparkles in the light.", "This might help them!"],
  },
  "Rest stop": {
    short: ["Time for a snack. Yum!", "{N} rests a little."],
    mid: ["{N} stops for a cozy rest and a tasty snack. Even adventurers need a break!", "Under a shady tree, {N} rests and drinks some cool water."],
    more: ["{F} shares a yummy treat.", "Soon, {N} feels ready to go again.", "Rest helps brave hearts grow strong."],
  },
  "Almost there": {
    short: ["Almost there!", "Just a little more!"],
    mid: ["{N} can almost see the goal now. Just a little bit farther!", "The finish is so close. {N} feels a happy flutter inside."],
    more: ["“Come on, we can make it!” {N} says.", "Every step feels lighter now.", "The end of the journey is near."],
  },
  "Adventure continues": {
    short: ["On and on goes {N}!", "{N} keeps going."],
    mid: ["The adventure goes on, and {N} keeps going with a brave heart.", "Over hills and around corners, {N} keeps on going."],
    more: ["There is so much to see.", "{N} hums a happy tune.", "Nothing can stop {N} today."],
  },
};
/* Lesson beats (one pair per lesson in the Story Mixer) */
Object.assign(STORY_TEXT, {
  "Feeling nervous": { short: ["{N} feels a little scared.", "Gulp! {N} feels nervous."], mid: ["{N}'s tummy feels full of butterflies. “What if I can't do it?” {N} wonders.", "{N} feels nervous and takes a slow, deep breath — in… and out."], more: ["It is okay to feel scared.", "Brave hearts feel scared sometimes too.", "{N} hugs both arms tight."] },
  "One brave step": { short: ["One small step. Brave {N}!", "Step! {N} is brave!"], mid: ["{N} takes one small, brave step. Then another. Being brave doesn't mean not being scared!", "Even though {N} still feels a little scared, {N} tries anyway. That's what courage is."], more: ["“I did it!” {N} whispers.", "Each step feels a bit easier.", "{F} gives a happy thumbs-up."] },
  "A misunderstanding": { short: ["Oh no. {N} and {F} are upset.", "Hmph! Nobody is happy."], mid: ["{N} and {F} both want different things. Oh dear — now they are both upset.", "{F} says something, and {N} hears it the wrong way. Uh-oh, hurt feelings!"], more: ["Nobody feels happy.", "{N} crosses both arms and looks away.", "Sometimes friends don't understand each other."] },
  "Listening": { short: ["{N} listens. {F} listens too.", "Shh… {N} listens."], mid: ["{N} sits down and really listens. “Oh! Now I understand,” {N} says.", "{N} and {F} take turns talking and listening. Soon, they are smiling again."], more: ["Listening is a kind of kindness.", "“I'm sorry,” they both say at the same time.", "Their friendship feels even stronger now."] },
  "Someone needs help": { short: ["Oh! Someone needs help.", "Look! Someone is sad."], mid: ["{N} notices someone who needs help. “Are you okay?” {N} asks gently.", "On the way, {N} sees a little one who looks sad and lost."], more: ["{N} doesn't walk past.", "Kind hearts notice when others need help.", "{N} kneels down to listen."] },
  "A ripple of kindness": { short: ["{N} helps. Yay!", "Kindness makes everyone smile."], mid: ["{N} helps, and the little one smiles. Then that smile gets passed on and on!", "One kind act leads to another, and soon everyone is helping each other."], more: ["Kindness spreads like ripples in a pond.", "Everyone feels warm inside.", "Small kindness, big difference."] },
  "Waiting is hard": { short: ["Wait… wait… wait.", "Is it ready yet? Not yet!"], mid: ["{N} waits and waits. “Is it time yet?” Not yet! Waiting is so hard.", "{N} checks again and again. Tap, tap, tap go {N}'s toes."], more: ["Some good things take time.", "{N} sighs a big sigh.", "Tick-tock goes the clock."] },
  "Worth the wait": { short: ["It's ready! Hooray!", "Yay! It was worth the wait!"], mid: ["At last, it's ready! {N} smiles. It was worth the wait after all.", "Finally! All that waiting made it even more special."], more: ["Patience pays off.", "{N} feels proud of waiting so well.", "Good things really do take time."] },
  "It didn't work": { short: ["Oh no. It didn't work.", "Not this time."], mid: ["{N} tries, but it doesn't work. “Hmm,” {N} says, “I'll try again.”", "Whoops! The first try doesn't work out. That's okay — every try teaches something."], more: ["Mistakes help us learn.", "{N} doesn't give up.", "Next time will be better."] },
  "Practice, practice": { short: ["Again! And again!", "Practice, practice, practice!"], mid: ["{N} practices again and again. Each try gets a little bit better.", "Every day, {N} keeps practicing. Little by little, it gets easier."], more: ["Practice makes progress.", "{N} feels stronger every time.", "“Look, I'm getting better!” {N} cheers."] },
  "A big feeling": { short: ["Grrr! {N} feels upset.", "{N} has a big feeling."], mid: ["A big feeling grows inside {N}, hot and stormy like a rain cloud.", "{N} feels so upset that it's hard to think."], more: ["It is okay to have big feelings.", "Every feeling is allowed.", "{N} wants to stomp and shout."] },
  "Calm-down steps": { short: ["Breathe in. Breathe out. Calm.", "{N} counts to five. Calm."], mid: ["{N} takes a deep breath, counts to five and hugs something soft. Slowly, the stormy feeling floats away.", "Smell the flower, blow out the candle. {N} breathes slowly and feels calm again."], more: ["Now {N} can think clearly.", "Calm feels so much better.", "“I can handle big feelings,” {N} says."] },
  "A tricky problem": { short: ["Hmm. A tricky problem.", "{N} thinks and thinks."], mid: ["{N} looks at the tricky problem carefully. “Hmm… how can I solve this?”", "This problem is a real puzzle. {N} thinks and thinks and thinks."], more: ["Good thinkers take their time.", "{N} looks at it from every side.", "There must be a way!"] },
  "A clever idea": { short: ["Ding! An idea!", "{N} has an idea!"], mid: ["Ding! A clever idea pops into {N}'s head. “I've got it!”", "Suddenly, {N}'s eyes light up. A new idea — a really good one!"], more: ["Sometimes the best ideas come after trying.", "{N} can't wait to try it.", "“Let's do it!” {N} says."] },
  "Comparing": { short: ["{N} feels small.", "Everyone else can do it…"], mid: ["{N} watches the others and feels small. “I can't do it like they can,” {N} sighs.", "Everyone seems so good at things. {N} wonders, “What am I good at?”"], more: ["Comparing can make us feel sad.", "{N} looks down at the ground.", "But everyone is different."] },
  "My special strength": { short: ["{N} is special!", "Look what {N} can do!"], mid: ["Then {N} discovers something wonderful: a special strength that is all {N}'s own!", "{N} realizes, “I'm good at this — in my very own way!”"], more: ["Everyone has something special.", "{N} stands a little taller.", "Being yourself is the best."] },
  "Mine!": { short: ["“Mine!” says {N}.", "{N} won't share."], mid: ["“Mine!” says {N}, holding the treasure tight. Nobody else gets a turn.", "{N} wants to keep the shiny treasure all for {N}."], more: ["But playing alone isn't very fun.", "{F} looks a little sad.", "Hmm… is this the right choice?"] },
  "Sharing is fun": { short: ["{N} shares. Fun!", "Sharing is caring!"], mid: ["{N} decides to share. Now everyone can play, and it is twice as much fun!", "“Here, you can have a turn,” says {N}. Everyone smiles."], more: ["Sharing makes hearts happy.", "Playing together is the best.", "{F} gives {N} a big hug."] },
  "A little mistake": { short: ["Oops! A mistake.", "Uh-oh. {N} made a mistake."], mid: ["Oops! {N} makes a little mistake, and nobody saw. {N} feels worried inside.", "Crash! Something breaks. {N}'s tummy feels funny and worried."], more: ["Should {N} tell?", "Mistakes happen to everyone.", "{N} stops and thinks."] },
  "Telling the truth": { short: ["{N} tells the truth.", "“It was me,” says {N}."], mid: ["{N} takes a deep breath. “It was me. I'm sorry.” Telling the truth feels brave.", "{N} tells the truth, and the worried feeling melts away."], more: ["Everyone is proud of {N}.", "Honesty makes everyone feel safe.", "{N} feels light as a feather."] },
  "Learning moment": { short: ["{N} learns about {X}.", "Something new to learn!"], mid: ["Today, {N} learns something important about {X}.", "{N} stops and thinks about {X}. “This matters,” {N} says."], more: ["Learning can happen anywhere.", "{F} listens closely too.", "{N} will remember this."] },
  "Putting it into practice": { short: ["{N} tries it!", "Look! {N} does it!"], mid: ["{N} shows {X} in action, and it makes everyone smile.", "Now it's time to try. {N} puts {X} into practice — and it works!"], more: ["Doing it feels even better than knowing it.", "Everyone notices.", "“That was wonderful,” says {F}."] },
});
const FAVORITES = ["exploring", "making new friends", "singing silly songs", "looking at the clouds", "building things", "drawing pictures", "playing hide-and-seek", "reading stories"];

/* "A little bear crosses a wobbly bridge to reach friends" → "cross a wobbly bridge to reach friends" */
function goalFromIdea(idea) {
  const t = String(idea || "").trim().replace(/[.!?]+$/, "");
  const m = /^(?:a|an|the|one|two)\s+(?:[\w'-]+\s+){0,4}?([a-z]+s)\b\s+(.*)$/i.exec(t);
  if (m && !/ss$/.test(m[1]) && m[2]) {
    let v = m[1].toLowerCase();
    if (/ies$/.test(v)) v = v.slice(0, -3) + "y";
    else if (/(ss|sh|ch|x|z|o)es$/.test(v)) v = v.slice(0, -2);
    else v = v.slice(0, -1);
    if (v === "learn" || v.length > 2) return `${v} ${m[2]}`.replace(/\b(his|her|its)\b/g, "their");
  }
  return "";
}
function shortSetting(setting) {
  let s = String(setting || "a happy place").split(/,| with /)[0].trim();
  s = s.replace(/^(a|an)\s+/i, "the ");
  return s.startsWith("the ") ? s : "the " + s;
}
function speciesShort(sp) {
  const words = String(sp || "friend").split(",")[0].trim().split(/\s+/);
  return words.slice(-2).join(" ");
}
function sentenceCase(text) {
  // Capitalize the first letter of the text and after . ! ? (also when the new sentence starts with a quote)
  return text.replace(/(^|[.!?]\s+)([“"]?)([a-z])/g, (m, a, q, b) => a + q + b.toUpperCase());
}

/* Returns one string per story page (same order as storyBeats). */
function writeStory(c) {
  const beats = storyBeats(c);
  const r = rngFrom(P.id + (P.seed || "") + (P.textSeed || "") + "story-text");
  const ch = c.ch || { name: "Little One", species: "friend", personality: "kind" };
  const fr = c.friends || [];
  const N = ch.name;
  const F = fr[0] ? fr[0].name : "a kind friend";
  const Fs = fr.length ? fr.map((f) => f.name).join(" and ") : "a kind friend";
  const FsDesc = fr.length ? fr.map((f) => `${f.name}, a ${speciesShort(f.species)}`).join(", and ") : "a kind friend";
  const funny = /funny|silly/i.test(P.a.mood || "") || listOf(P.a.storyType).some((t) => /Funny|Silly/.test(t));
  const twistRaw = String(P.a.twist || "Something unexpected happens").trim();
  const TW = cap(twistRaw.replace(/[.!]*$/, "")) + "!";
  const ideaGoal = goalFromIdea(P.a.theme);
  const lessons = storyLessons().map((l) => l.lesson.replace(/\.$/, "").toLowerCase());
  const see = String(c.kit.setting).includes(" with ") ? `${N} can see ${String(c.kit.setting).split(" with ").slice(1).join(" with ")}.` : `${N} loves every corner of ${shortSetting(c.kit.setting)}.`;
  const vars = {
    N, F, Fs, FsDesc, TW, see,
    isAre: fr.length > 1 ? "are" : "is", comes: fr.length > 1 ? "come" : "comes", friendWord: fr.length > 1 ? "friends" : "friend",
    X: (listOf(P.a.lessons).find((x) => !STORY_LESSONS[x]) || "being kind").toLowerCase(),
    sp: speciesShort(ch.species), S: shortSetting(c.kit.setting),
    G: ideaGoal || "go on a brand-new adventure",
    L: lessons.join(", and "),
    pers: String(ch.personality || "kind").split(/,\s*/).slice(0, 3).join(", ").replace(/, ([^,]*)$/, " and $1"),
    Fpers: fr[0] ? String(fr[0].personality || "kind").split(/,\s*/).slice(0, 2).join(" and ") : "kind",
    fav: pick(r, FAVORITES),
  };
  const fill = (s) => s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  const extra = { "2-4": 0, "4-6": 0, "6-8": 1, "8-10": 2, "10-12": 3 }[c.age] ?? 1;
  const customEnding = P.a.ending && !STORY_ENDINGS.includes(P.a.ending) ? cap(String(P.a.ending).replace(/[.!]*$/, "")) + "!" : "";
  return beats.map((b, k) => {
    const T = STORY_TEXT[b.beat];
    let text;
    if (!T) {
      // Lesson beats and anything custom: built from the beat itself
      text = `${N} ${b.action}.`;
      if (extra) text += " " + pick(r, [`“I can do this,” ${N} says softly.`, `${F} smiles and nods.`, "Every step matters."]);
    } else {
      const shortPool = funny && T.funShort ? T.funShort : T.short;
      const midPool = funny && T.funMid ? T.funMid : T.mid;
      if (c.age === "2-4") {
        text = pick(r, shortPool);
        if (/First try|Second try|The big moment/.test(b.beat)) text += ` Can ${N} do it?`;
      } else {
        text = pick(r, midPool);
        shuffle(r, T.more).slice(0, extra).forEach((s) => (text += " " + s));
      }
      if (b.beat === "Happy celebration" && customEnding) text = c.age === "2-4" ? customEnding : `${customEnding} ${pick(r, ["What a wonderful day!", "Everyone is so happy.", "It is the perfect ending."])}`;
    }
    return sentenceCase(fill(text));
  });
}
/* Final text for page k: the customer's edit if any, otherwise the written text */
function storyPageText(c, k) {
  const edits = P.storyEdits || {};
  if (edits[k] != null && edits[k] !== "") return edits[k];
  return writeStory(c)[k] || "";
}
