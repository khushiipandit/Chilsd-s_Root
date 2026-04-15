import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  doc, getDoc, updateDoc, addDoc,
  collection, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

/* ─── Audio helper (Web Speech API) ─── */
function speak(text) {
  if (!window?.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.82;
  u.pitch = 1.15;
  window.speechSynthesis.speak(u);
}

/* ─── Age group ─── */
function getAgeGroup(age) {
  if (!age || age <= 6) return "tiny";
  if (age <= 9) return "kid";
  return "tween";
}

/* ─── DiceBear character avatar ─── */
function avatarUrl(seed, style = "adventurer") {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,ffd5dc,d1d4f9`;
}

/* ═══════════════════════════════════════════════════════════
   CONTENT ARRAYS
═══════════════════════════════════════════════════════════ */

/* ── Quizzes: Tiny (ages 4-6) ── */
const QUIZZES_TINY = [
  { q: "What color is the sky on a sunny day?",       opts: ["🔵 Blue",  "🔴 Red",     "🟢 Green",  "🟡 Yellow"], ans: 0, xp: 10 },
  { q: "How many legs does a cat have?",              opts: ["2️⃣ Two",  "4️⃣ Four",   "6️⃣ Six",   "8️⃣ Eight"],  ans: 1, xp: 10 },
  { q: "What sound does a dog make?",                 opts: ["🐱 Meow", "🐮 Moo",     "🐶 Woof",   "🦆 Quack"],  ans: 2, xp: 10 },
  { q: "What do we drink that comes from cows?",      opts: ["🍊 Juice","🥛 Milk",    "🍵 Tea",    "🍎 Juice"],   ans: 1, xp: 10 },
  { q: "When someone gives you a present, you say:", opts: ["😴 Nothing","😊 Thank you!","😡 Go away!","😔 Sorry"], ans: 1, xp: 15 },
  { q: "Which of these is a fruit?",                  opts: ["🥕 Carrot","🥦 Broccoli","🍎 Apple",  "🥔 Potato"],  ans: 2, xp: 10 },
  { q: "How many wheels does a bicycle have?",        opts: ["1️⃣ One", "2️⃣ Two",    "3️⃣ Three", "4️⃣ Four"],   ans: 1, xp: 10 },
  { q: "What do you say when you do something wrong?",opts: ["🎉 Yay!", "🙈 Nothing", "🙏 Sorry!",  "😴 Sleep"],   ans: 2, xp: 15 },
];

/* ── Quizzes: Kid (ages 7-9) ── */
const QUIZZES_KID = [
  { q: "What color do you get when you mix red and blue?",    opts: ["Green","Purple","Orange","Pink"],    ans: 1, xp: 20 },
  { q: "How many legs does a spider have?",                   opts: ["4","6","8","10"],                     ans: 2, xp: 20 },
  { q: "Which planet is closest to the Sun?",                 opts: ["Earth","Venus","Mercury","Mars"],     ans: 2, xp: 20 },
  { q: "If your friend is sad, what is the kindest thing to do?", opts: ["Ignore them","Make fun of them","Ask if they are okay","Walk away"], ans: 2, xp: 30 },
  { q: "You found a wallet on the ground. What should you do?",   opts: ["Keep the money","Leave it there","Return it to the owner","Give it to a stranger"], ans: 2, xp: 30 },
  { q: "A classmate is being left out at lunch. What do you do?", opts: ["Join in leaving them out","Invite them to sit with you","Laugh at them","Ignore it"], ans: 1, xp: 30 },
  { q: "What is honesty?",                                    opts: ["Saying what people want to hear","Always telling the truth","Keeping secrets","Being very quiet"], ans: 1, xp: 20 },
  { q: "If you accidentally break something, what should you do?", opts: ["Hide it","Blame someone else","Tell the truth and apologize","Run away"], ans: 2, xp: 30 },
  { q: "Which of these is safe to do online?",                opts: ["Share your home address","Talk to strangers","Tell a trusted adult if something feels wrong","Click every link"], ans: 2, xp: 25 },
  { q: "How many planets are in our Solar System?",           opts: ["7","8","9","10"], ans: 1, xp: 20 },
];

/* ── Quizzes: Tween (ages 10+) ── */
const QUIZZES_TWEEN = [
  { q: "What gas do plants absorb during photosynthesis?",    opts: ["Oxygen","Nitrogen","Carbon Dioxide","Hydrogen"], ans: 2, xp: 25 },
  { q: "How many bones does an adult human body have?",       opts: ["206","306","106","156"], ans: 0, xp: 25 },
  { q: "A classmate is spreading rumors about someone online. You should:", opts: ["Share it — it's just gossip","Ignore it completely","Report it to a trusted adult and don't spread it","Add more rumors"], ans: 2, xp: 35 },
  { q: "Which of these makes a strong password?",             opts: ["Your name","123456","A mix of letters, numbers and symbols","Your birthday"], ans: 2, xp: 25 },
  { q: "You feel very angry at a friend. The best first step is:", opts: ["Shout at them immediately","Take a breath and calm down before talking","Ignore them forever","Tell everyone bad things about them"], ans: 1, xp: 30 },
  { q: "Which planet is known as the Red Planet?",            opts: ["Jupiter","Venus","Saturn","Mars"], ans: 3, xp: 20 },
  { q: "What is a digital footprint?",                        opts: ["A shoe print on a screen","The trail of data you leave online","A type of virus","A way of typing"], ans: 1, xp: 25 },
  { q: "What is empathy?",                                    opts: ["Feeling happy all the time","Understanding and sharing someone else's feelings","Being very smart","Winning every argument"], ans: 1, xp: 25 },
  { q: "The largest ocean on Earth is:",                      opts: ["Atlantic Ocean","Indian Ocean","Arctic Ocean","Pacific Ocean"], ans: 3, xp: 20 },
  { q: "If a friend is being bullied, you should:",           opts: ["Record it for social media","Do nothing — not your problem","Support your friend and report it to a trusted adult","Bully them too"], ans: 2, xp: 35 },
];

/* ── Stories: Tiny (ages 4-6) — short, simple sentences ── */
const STORIES_TINY = [
  {
    title: "The Sharing Apple",
    emoji: "🍎",
    color: "linear-gradient(135deg,#ffd1d1,#ffb347)",
    textColor: "#1a1a2e",
    value: "Sharing",
    character: "mia",
    pages: [
      { text: "Mia had two big, red apples.", emoji: "🍎🍎" },
      { text: "Her friend Tom had no snack and looked very sad.", emoji: "😔" },
      { text: "Mia gave Tom one apple. Tom smiled and said thank you!", emoji: "😊🍎" },
    ],
    lesson: "Sharing makes friends happy! 🌟",
  },
  {
    title: "Be Kind to Animals",
    emoji: "🐕",
    color: "linear-gradient(135deg,#b5ead7,#c7ceea)",
    textColor: "#1a1a2e",
    value: "Kindness",
    character: "leo",
    pages: [
      { text: "Leo saw a little puppy sitting alone in the rain.", emoji: "🌧️🐶" },
      { text: "Leo brought the puppy inside to stay warm and dry.", emoji: "🏠" },
      { text: "The puppy wagged its tail and licked Leo's hand. They became best friends!", emoji: "🐕❤️" },
    ],
    lesson: "Being kind to animals is wonderful! 💖",
  },
  {
    title: "Sorry Makes It Better",
    emoji: "🤗",
    color: "linear-gradient(135deg,#fddb92,#d1fdff)",
    textColor: "#1a1a2e",
    value: "Honesty",
    character: "sam",
    pages: [
      { text: "Sam broke his sister's favourite toy by accident.", emoji: "🧸💔" },
      { text: "Sam felt bad inside. He knew what he had to do.", emoji: "😢" },
      { text: "Sam said 'I'm sorry' and gave his sister a big hug. She forgave him!", emoji: "🤗✨" },
    ],
    lesson: "Saying sorry is very brave! 💪",
  },
  {
    title: "Wash Your Hands!",
    emoji: "🧼",
    color: "linear-gradient(135deg,#a8edea,#fed6e3)",
    textColor: "#1a1a2e",
    value: "Health",
    character: "priya",
    pages: [
      { text: "Priya played in the garden all afternoon and got very muddy.", emoji: "🌿😄" },
      { text: "Before eating dinner, Priya washed her hands with soap and water.", emoji: "🧼💧" },
      { text: "Clean hands kept all the germs away. Priya stayed healthy and strong!", emoji: "💪😊" },
    ],
    lesson: "Always wash your hands before eating! 🏆",
  },
];

/* ── Stories: Kid & Tween (ages 7+) ── */
const STORIES_KID = [
  {
    title: "The Kind Boy and the Butterfly",
    emoji: "🦋",
    color: "linear-gradient(135deg,#a8edea,#fed6e3)",
    textColor: "#1a1a2e",
    value: "Kindness",
    character: "arjun",
    pages: [
      { text: "Arjun was walking to school one morning when he saw a butterfly with a broken wing lying on the path.", emoji: "🦋" },
      { text: "Other children walked past quickly. But Arjun stopped, picked up the butterfly gently, and placed it safely on a flower.", emoji: "🌸" },
      { text: "A week later, Arjun was sad because he had lost his favourite pen. His friend Meera found it and returned it.", emoji: "🖊️" },
      { text: "Meera said, 'I remembered how kind you were to that butterfly. Kindness always comes back.'", emoji: "💖" },
      { text: "Arjun smiled and remembered — every act of kindness, big or small, makes the world a better place.", emoji: "🌍" },
    ],
    lesson: "Small acts of kindness have a big impact on the world around you."
  },
  {
    title: "Riya Tells the Truth",
    emoji: "✨",
    color: "linear-gradient(135deg,#ffecd2,#fcb69f)",
    textColor: "#1a1a2e",
    value: "Honesty",
    character: "riya",
    pages: [
      { text: "Riya accidentally knocked over her mother's favourite vase while playing indoors.", emoji: "🏺" },
      { text: "She panicked. She thought about hiding the pieces or blaming the cat.", emoji: "😰" },
      { text: "But Riya remembered what her teacher said: 'Honesty takes courage, but it builds trust.'", emoji: "🏫" },
      { text: "Riya went to her mother and said, 'Maa, I broke the vase by accident. I'm really sorry.'", emoji: "🙏" },
      { text: "Her mother hugged her and said, 'I'm proud of you for telling the truth. That means more to me than any vase.'", emoji: "🤗" },
    ],
    lesson: "Being honest, even when it's hard, builds trust and makes you stronger."
  },
  {
    title: "The Sharing Tree",
    emoji: "🌳",
    color: "linear-gradient(135deg,#d4fc79,#96e6a1)",
    textColor: "#1a1a2e",
    value: "Respect",
    character: "priya",
    pages: [
      { text: "In a village there was a big mango tree that belonged to everyone. Children played under it every day.", emoji: "🌳" },
      { text: "One day, a new boy named Karan moved to the village. The other children wouldn't let him play near the tree.", emoji: "😔" },
      { text: "Priya noticed and said, 'This tree belongs to everyone. Karan should be welcome here too.'", emoji: "🤝" },
      { text: "The children realised they were being unfair. They apologised to Karan and invited him to play.", emoji: "😊" },
      { text: "From that day on, the tree was truly a sharing tree — a place where everyone was respected and included.", emoji: "🌈" },
    ],
    lesson: "Respecting others means treating everyone fairly and making everyone feel welcome."
  },
  {
    title: "Safe on the Internet",
    emoji: "🛡️",
    color: "linear-gradient(135deg,#a1c4fd,#c2e9fb)",
    textColor: "#1a1a2e",
    value: "Safety",
    character: "anika",
    pages: [
      { text: "Anika loved playing games online. One day, a stranger sent her a message asking for her home address.", emoji: "💬" },
      { text: "Anika felt uncomfortable. Something didn't feel right.", emoji: "😟" },
      { text: "She remembered what her parents taught her: 'Never share personal information with strangers online.'", emoji: "🔒" },
      { text: "Anika didn't reply. Instead, she went straight to her father and showed him the message.", emoji: "👨‍👧" },
      { text: "Her father was proud of her. 'You did exactly the right thing, Anika. Always tell a trusted adult.'", emoji: "⭐" },
    ],
    lesson: "Never share personal information online. Always tell a trusted adult if something feels wrong."
  },
];

/* ── YouTube Videos: Tiny (ages 4-6) ── */
const VIDEOS_TINY = [
  { id: "XqZsoesa55w", title: "Baby Shark Dance",          channel: "Pinkfong",           emoji: "🦈", tag: "Music & Fun" },
  { id: "e_04ZrNroTo", title: "Wheels on the Bus",          channel: "Super Simple Songs", emoji: "🚌", tag: "Songs" },
  { id: "cF7oMQCHxoM", title: "Old MacDonald Had a Farm",   channel: "Super Simple Songs", emoji: "🐄", tag: "Animals" },
  { id: "71hqRT9U0wg", title: "If You're Happy and You Know It", channel: "Super Simple Songs", emoji: "😊", tag: "Songs" },
  { id: "eto3R7vQBBE", title: "Five Little Monkeys",         channel: "Cocomelon",          emoji: "🐒", tag: "Fun" },
  { id: "pnS7K4jRMCc", title: "Rain Rain Go Away",          channel: "Cocomelon",          emoji: "🌧️", tag: "Songs" },
];

/* ── YouTube Videos: Kid & Tween (ages 7+) ── */
const VIDEOS_KID = [
  { id: "1MkrA149Be8", title: "How Do Bees Communicate?",   channel: "TED-Ed",             emoji: "🐝", tag: "Science" },
  { id: "VEQXeLjY9ak", title: "Why Do Animals Sleep?",      channel: "TED-Ed",             emoji: "😴", tag: "Animals" },
  { id: "OHbTx4bCVrE", title: "How Big is the Universe?",   channel: "Kurzgesagt",         emoji: "🚀", tag: "Space" },
  { id: "v64aBpLMOkE", title: "Amazing Ocean Animals",      channel: "National Geographic", emoji: "🐠", tag: "Nature" },
  { id: "Q3oItpVa9fs", title: "How Does Your Brain Work?",  channel: "TED-Ed",             emoji: "🧠", tag: "Science" },
  { id: "B5Sy2iLbFKs", title: "Rainforest Animals for Kids",channel: "National Geographic", emoji: "🌿", tag: "Nature" },
];

/* ── Kindness Scenes: Tiny (simple 3 choices, short text) ── */
const KINDNESS_SCENES_TINY = [
  {
    scenario: "Your friend is crying. What do you do?",
    character: "friend",
    emoji: "😢",
    choices: [
      { text: "😊 Give them a hug",   correct: true,  feedback: "That's so kind! Hugging a sad friend makes them feel better! 🌟" },
      { text: "😄 Laugh at them",     correct: false, feedback: "Laughing at a sad person hurts their feelings more." },
      { text: "🏃 Run away",          correct: false, feedback: "Friends stay and help each other!" },
    ],
    xp: 20,
  },
  {
    scenario: "A friend wants to join your game!",
    character: "buddy",
    emoji: "🎮",
    choices: [
      { text: "😊 Yes, let's play!",  correct: true,  feedback: "Playing together is the best! You're amazing! 🌟" },
      { text: "🚫 No, go away!",      correct: false, feedback: "Including friends makes games more fun!" },
      { text: "😴 Maybe later",       correct: false, feedback: "Friends like to be included right away!" },
    ],
    xp: 20,
  },
  {
    scenario: "You have one cookie and your sister has none.",
    character: "sister",
    emoji: "🍪",
    choices: [
      { text: "💝 Break it and share", correct: true,  feedback: "Sharing is caring! You're a star! ⭐" },
      { text: "😋 Eat it all",         correct: false, feedback: "Sharing makes everyone happy!" },
      { text: "🙈 Hide it",            correct: false, feedback: "Hiding food from family is not kind." },
    ],
    xp: 20,
  },
  {
    scenario: "Someone dropped all their things on the floor!",
    character: "classmate",
    emoji: "📚",
    choices: [
      { text: "🤝 Help them pick up",  correct: true,  feedback: "Helping others is what kind people do! 🌟" },
      { text: "🚶 Keep walking",       correct: false, feedback: "A kind person always stops to help!" },
      { text: "😂 Laugh and leave",    correct: false, feedback: "Laughing at someone who needs help is unkind." },
    ],
    xp: 20,
  },
];

/* ── Kindness Scenes: Kid & Tween ── */
const KINDNESS_SCENES_KID = [
  {
    scenario: "Your friend trips and drops all their books in the hallway.",
    character: "friend",
    emoji: "📚",
    choices: [
      { text: "Walk past and pretend not to notice",    correct: false, feedback: "That would leave your friend feeling very alone." },
      { text: "Stop and help them pick up the books",  correct: true,  feedback: "Amazing! Helping others when they need it is true kindness! 🌟" },
      { text: "Laugh at them",                         correct: false, feedback: "Laughing at someone when they fall would hurt their feelings." },
    ],
    xp: 30,
  },
  {
    scenario: "A new student sits alone at lunch because they don't know anyone.",
    character: "newkid",
    emoji: "🍱",
    choices: [
      { text: "Ignore them — they'll figure it out",           correct: false, feedback: "Being new is scary. Everyone deserves to feel welcome!" },
      { text: "Invite them to sit with you and your friends",  correct: true,  feedback: "That's so kind! A small invite can change someone's whole day. 💖" },
      { text: "Whisper about them with your friends",          correct: false, feedback: "That would make them feel even more left out." },
    ],
    xp: 30,
  },
  {
    scenario: "You have two cookies and your friend forgot their snack.",
    character: "pal",
    emoji: "🍪",
    choices: [
      { text: "Eat both cookies quickly before they notice",   correct: false, feedback: "Sharing makes both of you happy!" },
      { text: "Give your friend one cookie",                   correct: true,  feedback: "Sharing is caring! You're a star. ⭐" },
      { text: "Hide one and only show them one",               correct: false, feedback: "Honesty and sharing always go together!" },
    ],
    xp: 25,
  },
  {
    scenario: "Your younger sibling accidentally tears your favourite book.",
    character: "sibling",
    emoji: "📖",
    choices: [
      { text: "Get really angry and shout at them",              correct: false, feedback: "It was an accident. Shouting can really hurt feelings." },
      { text: "Tell a parent and calmly explain you're upset",   correct: true,  feedback: "Great! It's okay to feel upset, but talking calmly helps everyone. 🤝" },
      { text: "Tear their toy on purpose",                       correct: false, feedback: "That would make the situation much worse for everyone." },
    ],
    xp: 30,
  },
  {
    scenario: "An elderly neighbour is struggling to carry heavy bags.",
    character: "elder",
    emoji: "🛍️",
    choices: [
      { text: "Walk past — it's not your problem",          correct: false, feedback: "Helping people around us makes our whole community better!" },
      { text: "Ask if they need help carrying the bags",    correct: true,  feedback: "Wonderful! Helping neighbours is what community is all about. 🏘️" },
      { text: "Stare at them but don't do anything",        correct: false, feedback: "Seeing someone struggle and actually helping is so much better than just watching." },
    ],
    xp: 30,
  },
];

/* ── Safety Scenes: Tiny ── */
const SAFETY_SCENES_TINY = [
  { scenario: "You wear a helmet when riding your bike.", character: "biker", emoji: "🚲", safe: true,  explanation: "Helmets protect your head! Always wear one when you ride! 🌟" },
  { scenario: "A stranger offers you candy and asks you to go with them.", character: "stranger", emoji: "🍬", safe: false, explanation: "Never go with a stranger! Run away and tell a grown-up right away! 🏃" },
  { scenario: "You cross the road holding a grown-up's hand.", character: "walker", emoji: "🤝", safe: true,  explanation: "Always hold a grown-up's hand near roads! Great job! 🌟" },
  { scenario: "You eat berries you found on a bush in the garden.", character: "garden", emoji: "🫐", safe: false, explanation: "Never eat berries unless a grown-up says they are safe! ⚠️" },
  { scenario: "You wash your hands with soap before eating lunch.", character: "clean", emoji: "🧼", safe: true,  explanation: "Washing hands keeps germs away! Such a smart habit! ✨" },
  { scenario: "You run into the road without looking because you saw your friend.", character: "road", emoji: "🚗", safe: false, explanation: "Always stop, look, and listen before crossing any road! 🚦" },
];

/* ── Safety Scenes: Kid & Tween ── */
const SAFETY_SCENES_KID = [
  { scenario: "A stranger online asks for your home address.", character: "online", emoji: "💬", safe: false, explanation: "Never share your address or personal details with strangers online. Tell a trusted adult right away!" },
  { scenario: "You wear a helmet every time you ride your bike.", character: "biker", emoji: "🚲", safe: true,  explanation: "Always wear a helmet! It protects your head and keeps you safe." },
  { scenario: "A stranger offers you sweets and asks you to get in their car.", character: "stranger", emoji: "🚗", safe: false, explanation: "Never go anywhere with a stranger. Run away and tell a trusted adult immediately!" },
  { scenario: "You cross the road at a zebra crossing after checking both sides.", character: "walker", emoji: "🚦", safe: true,  explanation: "Using crossings and checking for traffic keeps you safe on the road!" },
  { scenario: "Your online friend asks you to keep your chat a secret from your parents.", character: "secret", emoji: "🤫", safe: false, explanation: "Safe people never ask you to keep secrets from your parents. Tell a trusted adult." },
  { scenario: "You wash your hands before eating and after using the toilet.", character: "clean", emoji: "🧼", safe: true,  explanation: "Great hygiene habit! Washing hands prevents the spread of germs and keeps everyone healthy." },
  { scenario: "A website asks you to enter your full name and school name.", character: "website", emoji: "💻", safe: false, explanation: "Be careful about sharing personal info online. Always ask a parent before filling any forms." },
  { scenario: "You tell a trusted adult when something makes you feel uncomfortable.", character: "trust", emoji: "🤝", safe: true,  explanation: "Always speak up! Telling someone you trust is always the right and brave thing to do." },
];

/* ── Feelings Scenes: Tiny (emoji-labelled options) ── */
const FEELINGS_SCENES_TINY = [
  { scene: "It is your birthday! Everyone sings for you!", character: "birthday", emoji: "🎂", options: ["😢 Sad","😊 Happy","😡 Angry","😴 Sleepy"], ans: 1, xp: 15 },
  { scene: "You fell down and hurt your knee.", character: "ouch", emoji: "🩹", options: ["😊 Happy","😮 Surprised","😢 Sad","😄 Excited"], ans: 2, xp: 15 },
  { scene: "A big scary dog is barking loudly at you.", character: "dog", emoji: "🐕", options: ["😊 Happy","😴 Sleepy","😎 Cool","😨 Scared"], ans: 3, xp: 15 },
  { scene: "You are going to the park to play on the swings!", character: "park", emoji: "🛝", options: ["😡 Angry","😄 Excited","😢 Sad","😴 Sleepy"], ans: 1, xp: 15 },
  { scene: "Someone took your favourite toy without asking.", character: "toy", emoji: "😤", options: ["😊 Happy","😴 Sleepy","😡 Angry","😂 Silly"], ans: 2, xp: 15 },
  { scene: "You got a big gold star from your teacher!", character: "star", emoji: "⭐", options: ["😢 Sad","😡 Angry","😊 Happy","😴 Sleepy"], ans: 2, xp: 15 },
];

/* ── Feelings Scenes: Kid & Tween ── */
const FEELINGS_SCENES_KID = [
  { scene: "Your best friend didn't invite you to their birthday party.", character: "birthday", emoji: "🎂", options: ["Happy","Sad","Excited","Proud"], ans: 1, xp: 20 },
  { scene: "You won first prize in the school drawing competition!", character: "winner", emoji: "🏆", options: ["Angry","Scared","Sad","Proud"], ans: 3, xp: 20 },
  { scene: "It's the night before a big school exam and you don't feel ready.", character: "exam", emoji: "📝", options: ["Nervous","Excited","Happy","Silly"], ans: 0, xp: 20 },
  { scene: "Someone took your favourite pencil without asking.", character: "pencil", emoji: "✏️", options: ["Happy","Angry","Bored","Proud"], ans: 1, xp: 20 },
  { scene: "You're going on your first ever camping trip tomorrow!", character: "camp", emoji: "⛺", options: ["Sad","Angry","Excited","Tired"], ans: 2, xp: 20 },
  { scene: "You see a very large dog running towards you with no owner.", character: "dog", emoji: "🐕", options: ["Happy","Bored","Excited","Scared"], ans: 3, xp: 20 },
];

/* ── Speak button (outside component to satisfy lint) ── */
function SpeakBtn({ text, ageGroup }) {
  return (
    <button
      onClick={() => speak(text)}
      title="Read aloud"
      style={{
        background: "rgba(107,107,214,0.12)", border: "none", borderRadius: "30px",
        padding: ageGroup === "tiny" ? "10px 18px" : "6px 14px",
        cursor: "pointer", fontSize: ageGroup === "tiny" ? "18px" : "14px",
        color: "#6b6bd6", fontWeight: "700", marginLeft: "10px", flexShrink: 0
      }}
    >
      🔊
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function ChildDash() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [xp, setXp] = useState(0);

  /* Age */
  const [childAge, setChildAge] = useState(null);
  const [ageGroup, setAgeGroup] = useState("kid");
  const [showAgePicker, setShowAgePicker] = useState(false);

  /* Quiz state */
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);

  /* Story state */
  const [storyIdx, setStoryIdx] = useState(null);
  const [storyPage, setStoryPage] = useState(0);

  /* Video state */
  const [videoPlaying, setVideoPlaying] = useState(null); // video id string or null

  /* Game state */
  const [activeGame, setActiveGame] = useState(null);
  const [gameIdx, setGameIdx] = useState(0);
  const [gameChoice, setGameChoice] = useState(null);
  const [gameAnswered, setGameAnswered] = useState(false);

  const name = userProfile?.displayName || currentUser?.displayName || "Explorer";
  const level = Math.floor(xp / 100) + 1;
  const progress = xp % 100;
  const streak = 3;

  /* ── Active content driven by age group ── */
  const activeQuizzes  = ageGroup === "tiny"  ? QUIZZES_TINY  : ageGroup === "tween" ? QUIZZES_TWEEN  : QUIZZES_KID;
  const activeStories  = ageGroup === "tiny"  ? STORIES_TINY  : STORIES_KID;
  const activeVideos   = ageGroup === "tiny"  ? VIDEOS_TINY   : VIDEOS_KID;
  const activeKindness = ageGroup === "tiny"  ? KINDNESS_SCENES_TINY : KINDNESS_SCENES_KID;
  const activeSafety   = ageGroup === "tiny"  ? SAFETY_SCENES_TINY  : SAFETY_SCENES_KID;
  const activeFeelings = ageGroup === "tiny"  ? FEELINGS_SCENES_TINY : FEELINGS_SCENES_KID;

  /* ── Age-adaptive UI config ── */
  const AG = {
    tiny:  { qFont: "22px", optFont: "18px", storyFont: "20px", emojiSize: "88px", heroTitle: "30px", lineH: "1.9", cardPad: "32px" },
    kid:   { qFont: "20px", optFont: "15px", storyFont: "17px", emojiSize: "64px", heroTitle: "28px", lineH: "1.8", cardPad: "28px" },
    tween: { qFont: "18px", optFont: "15px", storyFont: "16px", emojiSize: "52px", heroTitle: "26px", lineH: "1.7", cardPad: "24px" },
  }[ageGroup];

  /* ── Load XP + age from Firestore ── */
  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, "users", currentUser.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.xp != null) setXp(data.xp);
        if (data.age) {
          setChildAge(data.age);
          setAgeGroup(getAgeGroup(data.age));
        } else {
          setShowAgePicker(true);
        }
      } else {
        setShowAgePicker(true);
      }
    });
  }, [currentUser]);

  /* ── Auto-speak for tiny: quiz ── */
  useEffect(() => {
    if (ageGroup !== "tiny" || activeTab !== "quiz") return;
    const q = activeQuizzes[qIdx];
    if (q) speak(q.q);
  }, [qIdx, activeTab, ageGroup]); // eslint-disable-line

  /* ── Auto-speak for tiny: story pages ── */
  useEffect(() => {
    if (ageGroup !== "tiny" || storyIdx === null) return;
    const story = activeStories[storyIdx];
    if (story) speak(story.pages[storyPage]?.text || "");
  }, [storyPage, storyIdx, ageGroup]); // eslint-disable-line

  /* ── Auto-speak for tiny: games ── */
  useEffect(() => {
    if (ageGroup !== "tiny" || !activeGame) return;
    let text = "";
    if (activeGame === "kindness") text = activeKindness[gameIdx]?.scenario || "";
    if (activeGame === "safety")   text = activeSafety[gameIdx]?.scenario   || "";
    if (activeGame === "feelings") text = activeFeelings[gameIdx]?.scene     || "";
    if (text) speak(text);
  }, [gameIdx, activeGame, ageGroup]); // eslint-disable-line

  async function handleSetAge(age) {
    setChildAge(age);
    setAgeGroup(getAgeGroup(age));
    setShowAgePicker(false);
    setQIdx(0); setSelected(null); setAnswered(false);
    if (currentUser) {
      await updateDoc(doc(db, "users", currentUser.uid), { age });
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  /* ── Quiz answer ── */
  async function handleAnswer(idx) {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const correct = idx === activeQuizzes[qIdx].ans;
    const earned  = correct ? activeQuizzes[qIdx].xp : 0;
    const newXp   = xp + earned;
    if (earned > 0) setXp(newXp);
    if (currentUser) {
      if (earned > 0) await updateDoc(doc(db, "users", currentUser.uid), { xp: newXp });
      await addDoc(collection(db, "assessments"), {
        childUid: currentUser.uid,
        childName: name,
        question: activeQuizzes[qIdx].q,
        correct,
        xpEarned: earned,
        timestamp: serverTimestamp()
      });
    }
    if (correct) speak("Correct! Great job!");
    else speak("Not quite! Try the next one.");
  }

  function nextQuestion() {
    setQIdx((i) => (i + 1) % activeQuizzes.length);
    setSelected(null);
    setAnswered(false);
  }

  async function handleGameAnswer(correct, xpAmt) {
    if (gameAnswered) return;
    setGameAnswered(true);
    if (correct && xpAmt > 0) {
      const newXp = xp + xpAmt;
      setXp(newXp);
      if (currentUser) await updateDoc(doc(db, "users", currentUser.uid), { xp: newXp });
      speak("Well done! That's correct!");
    } else {
      speak("Not quite, but you're learning!");
    }
  }

  function nextGame(totalLen) {
    if (gameIdx + 1 >= totalLen) { setActiveGame(null); setGameIdx(0); }
    else setGameIdx((i) => i + 1);
    setGameChoice(null);
    setGameAnswered(false);
  }

  function exitGame() {
    setActiveGame(null); setGameIdx(0); setGameChoice(null); setGameAnswered(false);
  }

  const badges = [
    { label: "🔥 3-Day Streak", earned: streak >= 3 },
    { label: "🧠 Quiz Master",   earned: xp >= 100 },
    { label: "⚡ 100 XP Club",   earned: xp >= 100 },
    { label: "📖 Bookworm",      earned: xp >= 200 },
    { label: "🎨 Creative Star", earned: xp >= 300 },
    { label: "🌟 Level 5",       earned: level >= 5 },
  ];

  /* ── Shared card style ── */
  const card = { background: "rgba(255,255,255,0.88)", borderRadius: "20px", padding: AG.cardPad, boxShadow: "0 4px 20px rgba(0,0,0,0.07)", marginBottom: "20px" };

  /* ══════════════════════════════════════
     AGE PICKER (shown on first login)
  ══════════════════════════════════════ */
  if (showAgePicker) {
    const bubbleColors = ["#ff6b9d","#ffa040","#ffd700","#6bde6b","#6bcfff","#a78bfa","#ff6b6b","#40c9a2","#3d8bcd","#f29e4c","#7b68ee"];
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#ffecd2 0%,#fcb69f 30%,#a1c4fd 70%,#c2e9fb 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "system-ui,sans-serif" }}>
        <div style={{ background: "white", borderRadius: "28px", padding: "48px 40px", maxWidth: "540px", width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
          <div style={{ fontSize: "72px", marginBottom: "12px" }}>🎂</div>
          <h1 style={{ fontSize: "30px", fontWeight: "800", color: "#1a1a2e", margin: "0 0 8px" }}>How old are you?</h1>
          <p style={{ color: "#666", marginBottom: "36px", fontSize: "16px" }}>We'll make everything perfect just for you!</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", justifyContent: "center" }}>
            {[4,5,6,7,8,9,10,11,12,13,14].map((age) => (
              <button
                key={age}
                onClick={() => handleSetAge(age)}
                style={{
                  width: "72px", height: "72px", borderRadius: "50%",
                  background: `linear-gradient(135deg,${bubbleColors[age - 4]},${bubbleColors[(age - 3) % bubbleColors.length]})`,
                  color: "white", fontWeight: "800", fontSize: "24px", border: "none",
                  cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                  transition: "transform 0.15s",
                }}
                onMouseEnter={(e) => e.target.style.transform = "scale(1.12)"}
                onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
              >
                {age}
              </button>
            ))}
          </div>
          <p style={{ marginTop: "24px", fontSize: "13px", color: "#aaa" }}>You can always change this later from your home tab</p>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════
     STORY READER
  ══════════════════════════════════════ */
  if (storyIdx !== null) {
    const story = activeStories[storyIdx];
    const page  = story.pages[storyPage];
    const isLast = storyPage === story.pages.length - 1;
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#ffecd2 0%,#fcb69f 30%,#a1c4fd 70%,#c2e9fb 100%)", fontFamily: "system-ui,sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", background: "rgba(255,255,255,0.5)", backdropFilter: "blur(10px)" }}>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "#6b6bd6" }}>KidRoots 🌱</div>
          <button style={{ padding: "8px 18px", borderRadius: "20px", border: "none", background: "rgba(255,255,255,0.7)", cursor: "pointer", fontWeight: "600", fontSize: "14px" }} onClick={() => { setStoryIdx(null); setStoryPage(0); }}>← Back</button>
        </div>
        <div style={{ padding: "32px" }}>
          <div style={{ ...card, maxWidth: "660px", margin: "0 auto", textAlign: "center" }}>
            {/* Character avatar */}
            <Avatar seed={story.character} size={ageGroup === "tiny" ? 100 : 80} />
            <div style={{ marginTop: "16px", fontSize: "12px", fontWeight: "700", color: "#6b6bd6", textTransform: "uppercase", letterSpacing: "1px" }}>
              {story.value} · Page {storyPage + 1} of {story.pages.length}
            </div>
            <h2 style={{ fontSize: ageGroup === "tiny" ? "24px" : "22px", fontWeight: "800", color: "#1a1a2e", margin: "8px 0 24px" }}>
              {story.title}
            </h2>
            <div style={{ fontSize: AG.emojiSize, marginBottom: "20px" }}>{page.emoji}</div>
            <p style={{ fontSize: AG.storyFont, color: "#333", lineHeight: AG.lineH, marginBottom: "28px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {page.text}
              <SpeakBtn text={page.text} ageGroup={ageGroup} />
            </p>

            {isLast && (
              <div style={{ background: "#f0faf5", borderRadius: "14px", padding: "18px 22px", marginBottom: "24px", borderLeft: "4px solid #3aa67c" }}>
                <div style={{ fontWeight: "700", color: "#3aa67c", marginBottom: "6px", fontSize: ageGroup === "tiny" ? "17px" : "14px" }}>🌟 Lesson Learned</div>
                <div style={{ fontSize: ageGroup === "tiny" ? "17px" : "15px", color: "#444", lineHeight: "1.6" }}>{story.lesson}</div>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              {storyPage > 0 && (
                <button onClick={() => setStoryPage((p) => p - 1)} style={{ padding: "12px 24px", borderRadius: "12px", border: "2px solid #e0e0e0", background: "white", fontWeight: "700", cursor: "pointer", fontSize: ageGroup === "tiny" ? "17px" : "15px" }}>
                  ← Previous
                </button>
              )}
              {!isLast ? (
                <button onClick={() => setStoryPage((p) => p + 1)} style={{ padding: "12px 28px", background: "#6b6bd6", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: ageGroup === "tiny" ? "17px" : "15px" }}>
                  Next →
                </button>
              ) : (
                <button onClick={() => { setStoryIdx(null); setStoryPage(0); }} style={{ padding: "12px 28px", background: "linear-gradient(135deg,#3aa67c,#06b6d4)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: ageGroup === "tiny" ? "17px" : "15px" }}>
                  Finish Story 🎉
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════
     MAIN DASHBOARD
  ══════════════════════════════════════ */
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#ffecd2 0%,#fcb69f 30%,#a1c4fd 70%,#c2e9fb 100%)", fontFamily: "system-ui,sans-serif" }}>

      {/* TOP BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", background: "rgba(255,255,255,0.5)", backdropFilter: "blur(10px)" }}>
        <div style={{ fontSize: "22px", fontWeight: "800", color: "#6b6bd6" }}>KidRoots 🌱</div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#6b6bd6" }}>⚡ {xp} XP</span>
          <div style={{ width: "120px", height: "10px", background: "rgba(255,255,255,0.6)", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg,#6b6bd6,#ec4899)", borderRadius: "99px", width: `${progress}%`, transition: "width 0.4s" }} />
          </div>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#ec4899" }}>Lv.{level}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#6b6bd6" }}>🔥 {streak} day streak</span>
          <button onClick={handleLogout} style={{ padding: "8px 16px", borderRadius: "20px", border: "none", background: "rgba(255,255,255,0.7)", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>Sign Out</button>
        </div>
      </div>

      <div style={{ padding: "32px" }}>

        {/* TABS */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "28px", flexWrap: "wrap" }}>
          {[
            { id: "home",         label: "🏠 Home" },
            { id: "quiz",         label: "🧠 Quiz" },
            { id: "stories",      label: "📖 Stories" },
            { id: "achievements", label: "🏆 Badges" },
            { id: "games",        label: "🎮 Games" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setVideoPlaying(null); }}
              style={{
                padding: ageGroup === "tiny" ? "12px 26px" : "10px 22px",
                borderRadius: "30px", border: "none",
                background: activeTab === t.id ? "#6b6bd6" : "rgba(255,255,255,0.7)",
                color: activeTab === t.id ? "white" : "#444",
                fontWeight: "700", fontSize: ageGroup === "tiny" ? "15px" : "14px",
                cursor: "pointer",
                boxShadow: activeTab === t.id ? "0 4px 14px rgba(107,107,214,0.4)" : "none"
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════ HOME ══════ */}
        {activeTab === "home" && (
          <>
            <div style={{ background: "linear-gradient(135deg,#6b6bd6,#ec4899)", borderRadius: "20px", padding: "32px", color: "white", marginBottom: "20px" }}>
              <h1 style={{ fontSize: AG.heroTitle, fontWeight: "800", margin: 0 }}>Hi, {name.split(" ")[0]}! 🌟</h1>
              <p style={{ opacity: 0.85, marginTop: "8px", fontSize: ageGroup === "tiny" ? "17px" : "15px" }}>You're on a {streak}-day learning streak. Keep it up!</p>
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.25)", padding: "6px 16px", borderRadius: "30px", fontSize: "14px", fontWeight: "700", marginTop: "16px" }}>
                Level {level} Explorer ✨
              </div>
              {childAge && (
                <button
                  onClick={() => setShowAgePicker(true)}
                  style={{ marginLeft: "10px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.5)", borderRadius: "30px", padding: "6px 14px", color: "white", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
                >
                  Age {childAge} ✏️
                </button>
              )}
            </div>

            {userProfile?.linkedParentName && (
              <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "16px", padding: "14px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", backdropFilter: "blur(10px)" }}>
                <span style={{ fontSize: "22px" }}>👨‍👩‍👧</span>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "14px", color: "#1a1a2e" }}>Connected to {userProfile.linkedParentName}</div>
                  <div style={{ fontSize: "12px", color: "#666" }}>Your parent can see your progress</div>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px" }}>
              {[
                { emoji: "🧠", title: "Daily Quiz",     sub: "Earn XP with every question",               color: "linear-gradient(135deg,#6b6bd6,#8b5cf6)", tab: "quiz" },
                { emoji: "🏆", title: "My Badges",      sub: `${badges.filter(b => b.earned).length} badges earned`, color: "linear-gradient(135deg,#f59e0b,#ef4444)", tab: "achievements" },
                { emoji: "📖", title: "Story Time",     sub: `${activeStories.length} stories to explore`, color: "linear-gradient(135deg,#3aa67c,#06b6d4)", tab: "stories" },
                { emoji: "🎮", title: "Fun Games",      sub: "3 exciting games to play!",                  color: "linear-gradient(135deg,#ec4899,#f43f5e)", tab: "games" },
              ].map((a, i) => (
                <div key={i} onClick={() => a.tab && setActiveTab(a.tab)} style={{ borderRadius: "16px", padding: ageGroup === "tiny" ? "26px" : "22px", background: a.color, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.08)" }}>
                  <div style={{ fontSize: ageGroup === "tiny" ? "38px" : "30px", marginBottom: "8px" }}>{a.emoji}</div>
                  <div style={{ fontWeight: "700", fontSize: ageGroup === "tiny" ? "18px" : "16px", color: "white" }}>{a.title}</div>
                  <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", marginTop: "3px" }}>{a.sub}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════ QUIZ ══════ */}
        {activeTab === "quiz" && (
          <div style={card}>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#6b6bd6", textTransform: "uppercase", marginBottom: "8px" }}>
              Question {qIdx + 1} of {activeQuizzes.length}
              <span style={{ marginLeft: "10px", color: activeQuizzes[qIdx].xp >= 30 ? "#f59e0b" : "#6b6bd6" }}>
                +{activeQuizzes[qIdx].xp} XP
              </span>
            </div>
            <h2 style={{ fontSize: AG.qFont, fontWeight: "700", color: "#1a1a2e", marginBottom: "24px", lineHeight: "1.4", display: "flex", alignItems: "flex-start", gap: "8px" }}>
              {activeQuizzes[qIdx].q}
              <SpeakBtn text={activeQuizzes[qIdx].q} ageGroup={ageGroup} />
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: ageGroup === "tiny" ? "1fr" : "1fr 1fr", gap: "12px" }}>
              {activeQuizzes[qIdx].opts.map((opt, i) => {
                let bg = "white", color = "#333", border = "2px solid #e0e0e0";
                if (answered) {
                  if (i === activeQuizzes[qIdx].ans) { bg = "#dcfce7"; color = "#16a34a"; border = "2px solid #16a34a"; }
                  else if (i === selected)             { bg = "#fee2e2"; color = "#dc2626"; border = "2px solid #dc2626"; }
                } else if (i === selected) { bg = "#f0efff"; border = "2px solid #6b6bd6"; }
                return (
                  <button key={i} onClick={() => handleAnswer(i)} style={{ padding: ageGroup === "tiny" ? "18px 20px" : "14px 18px", borderRadius: "12px", background: bg, color, border, cursor: "pointer", fontSize: AG.optFont, fontWeight: "500", transition: "all 0.2s", textAlign: "left" }}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {answered && (
              <div style={{ marginTop: "20px" }}>
                <div style={{ padding: "14px 18px", borderRadius: "12px", background: selected === activeQuizzes[qIdx].ans ? "#dcfce7" : "#fee2e2", color: selected === activeQuizzes[qIdx].ans ? "#16a34a" : "#dc2626", fontWeight: "600", marginBottom: "14px", fontSize: ageGroup === "tiny" ? "17px" : "15px" }}>
                  {selected === activeQuizzes[qIdx].ans
                    ? `🎉 Correct! +${activeQuizzes[qIdx].xp} XP`
                    : `❌ The answer was "${activeQuizzes[qIdx].opts[activeQuizzes[qIdx].ans]}"`}
                </div>
                <button onClick={nextQuestion} style={{ padding: "12px 28px", background: "#6b6bd6", color: "white", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: ageGroup === "tiny" ? "17px" : "15px" }}>
                  Next Question →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════ STORIES ══════ */}
        {activeTab === "stories" && (
          <>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#1a1a2e", margin: "0 0 6px" }}>📖 Story Time</h2>
              <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                {ageGroup === "tiny" ? "Short stories about kindness and sharing!" : "Stories that teach kindness, honesty, respect, and safety."}
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: ageGroup === "tiny" ? "1fr 1fr" : "repeat(2,1fr)", gap: "18px" }}>
              {activeStories.map((story, i) => (
                <div key={i} onClick={() => { setStoryIdx(i); setStoryPage(0); }} style={{ borderRadius: "20px", padding: "26px", background: story.color, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", transition: "transform 0.2s" }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  {/* Character avatar */}
                  <img src={avatarUrl(story.character, "adventurer")} alt="character" style={{ width: ageGroup === "tiny" ? "70px" : "56px", height: ageGroup === "tiny" ? "70px" : "56px", borderRadius: "50%", border: "3px solid rgba(255,255,255,0.8)", marginBottom: "10px", background: "white" }} />
                  <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: "#6b6bd6", marginBottom: "6px" }}>{story.value}</div>
                  <div style={{ fontWeight: "800", fontSize: ageGroup === "tiny" ? "18px" : "17px", color: story.textColor, marginBottom: "8px" }}>{story.title}</div>
                  <div style={{ fontSize: "13px", color: "#555" }}>{story.pages.length} pages · Tap to read</div>
                </div>
              ))}
            </div>

            {/* ── VIDEO SECTION ── */}
            <div style={{ marginTop: "36px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: 1, height: "2px", background: "linear-gradient(90deg,#e0e0e0,transparent)" }} />
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#1a1a2e", margin: 0, whiteSpace: "nowrap" }}>📺 Watch & Learn</h3>
              <div style={{ flex: 1, height: "2px", background: "linear-gradient(90deg,transparent,#e0e0e0)" }} />
            </div>

            {/* Inline player — shown when a video is selected */}
            {videoPlaying && (
              <div style={{ marginBottom: "24px", borderRadius: "20px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", position: "relative" }}>
                <iframe
                  key={videoPlaying}
                  src={`https://www.youtube-nocookie.com/embed/${videoPlaying}?autoplay=1&rel=0&modestbranding=1`}
                  title="Kids video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: "100%", height: ageGroup === "tiny" ? "260px" : "320px", border: "none", display: "block" }}
                />
                <button
                  onClick={() => setVideoPlaying(null)}
                  style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: "34px", height: "34px", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Video cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: ageGroup === "tiny" ? "1fr 1fr" : "repeat(3,1fr)", gap: "14px" }}>
              {activeVideos.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setVideoPlaying(videoPlaying === v.id ? null : v.id)}
                  style={{
                    borderRadius: "16px", overflow: "hidden", cursor: "pointer",
                    boxShadow: videoPlaying === v.id ? "0 0 0 3px #6b6bd6, 0 6px 20px rgba(107,107,214,0.3)" : "0 4px 14px rgba(0,0,0,0.10)",
                    transition: "transform 0.18s, box-shadow 0.18s",
                    background: "#fff",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  {/* Thumbnail */}
                  <div style={{ position: "relative", background: "#000" }}>
                    <img
                      src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`}
                      alt={v.title}
                      style={{ width: "100%", height: ageGroup === "tiny" ? "110px" : "100px", objectFit: "cover", display: "block", opacity: videoPlaying === v.id ? 0.6 : 1 }}
                    />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: videoPlaying === v.id ? "#6b6bd6" : "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                        <span style={{ fontSize: "16px", marginLeft: "3px", color: videoPlaying === v.id ? "white" : "#e00" }}>
                          {videoPlaying === v.id ? "⏸" : "▶"}
                        </span>
                      </div>
                    </div>
                    <div style={{ position: "absolute", top: "7px", left: "7px", background: "rgba(0,0,0,0.6)", color: "white", fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "6px" }}>
                      {v.tag}
                    </div>
                  </div>
                  {/* Info */}
                  <div style={{ padding: "10px 12px 12px" }}>
                    <div style={{ fontWeight: "700", fontSize: ageGroup === "tiny" ? "13px" : "12px", color: "#1a1a2e", marginBottom: "3px", lineHeight: "1.3" }}>{v.emoji} {v.title}</div>
                    <div style={{ fontSize: "11px", color: "#888" }}>{v.channel}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════ ACHIEVEMENTS ══════ */}
        {activeTab === "achievements" && (
          <div style={card}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1a1a2e", marginBottom: "20px" }}>🏆 Your Badges</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {badges.map((b, i) => (
                <span key={i} style={{ padding: "10px 18px", borderRadius: "30px", background: b.earned ? "linear-gradient(135deg,#ffd700,#ffa500)" : "#eee", color: b.earned ? "#7c4700" : "#aaa", fontWeight: "700", fontSize: ageGroup === "tiny" ? "15px" : "13px", filter: b.earned ? "none" : "grayscale(100%)" }}>
                  {b.label}
                </span>
              ))}
            </div>
            <div style={{ marginTop: "24px", padding: "16px 20px", background: "#f4f6fb", borderRadius: "12px" }}>
              <div style={{ fontWeight: "700", color: "#1a1a2e", fontSize: ageGroup === "tiny" ? "16px" : "14px" }}>Total XP: {xp}</div>
              <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>{100 - progress} XP more to reach Level {level + 1}</div>
            </div>
          </div>
        )}

        {/* ══════ GAMES ══════ */}
        {activeTab === "games" && (
          <>
            {/* Game selection */}
            {!activeGame && (
              <>
                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#1a1a2e", margin: "0 0 6px" }}>🎮 Fun Games</h2>
                  <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                    {ageGroup === "tiny" ? "Tap a game and let's play!" : "Learn important life skills through fun situations!"}
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: ageGroup === "tiny" ? "1fr" : "repeat(3,1fr)", gap: "18px" }}>
                  {[
                    { id: "kindness", emoji: "💖", title: ageGroup === "tiny" ? "Be Kind!" : "Kindness Quest",     desc: ageGroup === "tiny" ? "What's the kind thing to do?" : "Choose the kindest response in each situation.", color: "linear-gradient(135deg,#f093fb,#f5576c)", count: activeKindness.length },
                    { id: "safety",   emoji: "🛡️", title: ageGroup === "tiny" ? "Stay Safe!"  : "Safety Champion", desc: ageGroup === "tiny" ? "Is it safe or not safe?"         : "Decide if each situation is safe or not safe.",  color: "linear-gradient(135deg,#4facfe,#00f2fe)", count: activeSafety.length },
                    { id: "feelings", emoji: "🔍", title: ageGroup === "tiny" ? "How Do I Feel?" : "Feelings Detective", desc: ageGroup === "tiny" ? "Name the feeling you see!"  : "Name the feeling in each situation.",           color: "linear-gradient(135deg,#43e97b,#38f9d7)", count: activeFeelings.length },
                  ].map((g) => (
                    <div
                      key={g.id}
                      onClick={() => { setActiveGame(g.id); setGameIdx(0); setGameChoice(null); setGameAnswered(false); }}
                      style={{ background: g.color, borderRadius: "20px", padding: ageGroup === "tiny" ? "32px 24px" : "28px 22px", cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", color: "white" }}
                    >
                      <div style={{ fontSize: ageGroup === "tiny" ? "52px" : "44px", marginBottom: "12px" }}>{g.emoji}</div>
                      <div style={{ fontWeight: "800", fontSize: ageGroup === "tiny" ? "22px" : "18px", marginBottom: "8px" }}>{g.title}</div>
                      <div style={{ fontSize: ageGroup === "tiny" ? "15px" : "13px", opacity: 0.9, marginBottom: "16px", lineHeight: "1.5" }}>{g.desc}</div>
                      <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: "20px", padding: "6px 14px", display: "inline-block", fontSize: "12px", fontWeight: "700" }}>
                        {g.count} scenes · Tap to play
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── KINDNESS QUEST / BE KIND ── */}
            {activeGame === "kindness" && (() => {
              const scene = activeKindness[gameIdx];
              return (
                <div style={{ maxWidth: "640px", margin: "0 auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <button onClick={exitGame} style={{ background: "rgba(255,255,255,0.7)", border: "none", borderRadius: "20px", padding: "8px 18px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>← Back</button>
                    <div style={{ fontWeight: "700", color: "#6b6bd6", fontSize: "14px" }}>💖 {ageGroup === "tiny" ? "Be Kind" : "Kindness Quest"} · {gameIdx + 1} / {activeKindness.length}</div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#ec4899" }}>+{scene.xp} XP</div>
                  </div>
                  <div style={{ ...card, textAlign: "center" }}>
                    {/* Character + emoji */}
                    <img src={avatarUrl(scene.character, "fun-emoji")} alt="character" style={{ width: ageGroup === "tiny" ? "90px" : "72px", height: ageGroup === "tiny" ? "90px" : "72px", borderRadius: "50%", margin: "0 auto 8px", display: "block", border: "3px solid rgba(240,147,251,0.3)", background: "white" }} />
                    <div style={{ fontSize: AG.emojiSize, marginBottom: "16px" }}>{scene.emoji}</div>
                    <h3 style={{ fontSize: AG.qFont, fontWeight: "700", color: "#1a1a2e", marginBottom: "24px", lineHeight: "1.5", display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "8px" }}>
                      {scene.scenario}
                      <SpeakBtn text={scene.scenario} ageGroup={ageGroup} />
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {scene.choices.map((c, i) => {
                        let bg = "white", border = "2px solid #e0e0e0", color = "#333";
                        if (gameAnswered) {
                          if (c.correct)                              { bg = "#dcfce7"; border = "2px solid #16a34a"; color = "#16a34a"; }
                          else if (gameChoice === i && !c.correct)    { bg = "#fee2e2"; border = "2px solid #dc2626"; color = "#dc2626"; }
                        } else if (gameChoice === i) { bg = "#f0efff"; border = "2px solid #6b6bd6"; }
                        return (
                          <button key={i} onClick={() => { if (!gameAnswered) { setGameChoice(i); handleGameAnswer(c.correct, scene.xp); } }}
                            style={{ padding: ageGroup === "tiny" ? "18px 20px" : "14px 18px", borderRadius: "12px", background: bg, color, border, cursor: gameAnswered ? "default" : "pointer", fontSize: AG.optFont, fontWeight: "500", textAlign: "left", transition: "all 0.2s" }}>
                            {c.text}
                          </button>
                        );
                      })}
                    </div>
                    {gameAnswered && (
                      <div style={{ marginTop: "20px" }}>
                        <div style={{ padding: "14px 18px", borderRadius: "12px", background: scene.choices[gameChoice]?.correct ? "#dcfce7" : "#fff7e6", color: scene.choices[gameChoice]?.correct ? "#16a34a" : "#b45309", fontWeight: "600", marginBottom: "14px", fontSize: ageGroup === "tiny" ? "17px" : "15px" }}>
                          {scene.choices[gameChoice]?.correct ? `🎉 +${scene.xp} XP! ` : ""}
                          {scene.choices[gameChoice]?.feedback}
                        </div>
                        <button onClick={() => nextGame(activeKindness.length)} style={{ padding: "12px 28px", background: "linear-gradient(135deg,#f093fb,#f5576c)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: ageGroup === "tiny" ? "17px" : "15px" }}>
                          {gameIdx + 1 === activeKindness.length ? "Finish Game 🎉" : "Next →"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── SAFETY CHAMPION / STAY SAFE ── */}
            {activeGame === "safety" && (() => {
              const scene = activeSafety[gameIdx];
              const isCorrect = gameAnswered && ((scene.safe && gameChoice === "safe") || (!scene.safe && gameChoice === "unsafe"));
              return (
                <div style={{ maxWidth: "640px", margin: "0 auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <button onClick={exitGame} style={{ background: "rgba(255,255,255,0.7)", border: "none", borderRadius: "20px", padding: "8px 18px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>← Back</button>
                    <div style={{ fontWeight: "700", color: "#6b6bd6", fontSize: "14px" }}>🛡️ {ageGroup === "tiny" ? "Stay Safe" : "Safety Champion"} · {gameIdx + 1} / {activeSafety.length}</div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#ec4899" }}>+25 XP</div>
                  </div>
                  <div style={{ ...card, textAlign: "center" }}>
                    <img src={avatarUrl(scene.character, "fun-emoji")} alt="character" style={{ width: ageGroup === "tiny" ? "90px" : "72px", height: ageGroup === "tiny" ? "90px" : "72px", borderRadius: "50%", margin: "0 auto 8px", display: "block", border: "3px solid rgba(79,172,254,0.3)", background: "white" }} />
                    <div style={{ fontSize: AG.emojiSize, marginBottom: "16px" }}>{scene.emoji}</div>
                    <h3 style={{ fontSize: AG.qFont, fontWeight: "700", color: "#1a1a2e", marginBottom: "28px", lineHeight: "1.5", display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "8px" }}>
                      {scene.scenario}
                      <SpeakBtn text={scene.scenario} ageGroup={ageGroup} />
                    </h3>
                    {!gameAnswered && (
                      <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                        <button onClick={() => { setGameChoice("safe"); handleGameAnswer(scene.safe, 25); }}
                          style={{ flex: 1, maxWidth: "200px", padding: ageGroup === "tiny" ? "22px" : "20px", borderRadius: "16px", background: "linear-gradient(135deg,#43e97b,#38f9d7)", color: "white", border: "none", fontWeight: "800", fontSize: ageGroup === "tiny" ? "20px" : "18px", cursor: "pointer", boxShadow: "0 4px 14px rgba(67,233,123,0.4)" }}>
                          ✅ SAFE
                        </button>
                        <button onClick={() => { setGameChoice("unsafe"); handleGameAnswer(!scene.safe, 25); }}
                          style={{ flex: 1, maxWidth: "200px", padding: ageGroup === "tiny" ? "22px" : "20px", borderRadius: "16px", background: "linear-gradient(135deg,#f5576c,#f093fb)", color: "white", border: "none", fontWeight: "800", fontSize: ageGroup === "tiny" ? "20px" : "18px", cursor: "pointer", boxShadow: "0 4px 14px rgba(245,87,108,0.4)" }}>
                          ❌ NOT SAFE
                        </button>
                      </div>
                    )}
                    {gameAnswered && (
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ fontSize: "48px", marginBottom: "12px" }}>{isCorrect ? "🎉" : "🤔"}</div>
                        <div style={{ padding: "16px 20px", borderRadius: "14px", background: isCorrect ? "#dcfce7" : "#fff7e6", color: isCorrect ? "#16a34a" : "#b45309", fontWeight: "600", marginBottom: "20px", fontSize: ageGroup === "tiny" ? "17px" : "15px", lineHeight: "1.6" }}>
                          {isCorrect ? "Correct! +25 XP 🌟 " : `This is actually ${scene.safe ? "SAFE ✅" : "NOT SAFE ❌"}. `}
                          {scene.explanation}
                        </div>
                        <button onClick={() => nextGame(activeSafety.length)} style={{ padding: "12px 28px", background: "linear-gradient(135deg,#4facfe,#00f2fe)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: ageGroup === "tiny" ? "17px" : "15px" }}>
                          {gameIdx + 1 === activeSafety.length ? "Finish Game 🎉" : "Next →"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── FEELINGS DETECTIVE / HOW DO I FEEL ── */}
            {activeGame === "feelings" && (() => {
              const scene = activeFeelings[gameIdx];
              return (
                <div style={{ maxWidth: "640px", margin: "0 auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <button onClick={exitGame} style={{ background: "rgba(255,255,255,0.7)", border: "none", borderRadius: "20px", padding: "8px 18px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>← Back</button>
                    <div style={{ fontWeight: "700", color: "#6b6bd6", fontSize: "14px" }}>🔍 {ageGroup === "tiny" ? "How Do I Feel?" : "Feelings Detective"} · {gameIdx + 1} / {activeFeelings.length}</div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#ec4899" }}>+{scene.xp} XP</div>
                  </div>
                  <div style={{ ...card, textAlign: "center" }}>
                    <img src={avatarUrl(scene.character, "fun-emoji")} alt="character" style={{ width: ageGroup === "tiny" ? "90px" : "72px", height: ageGroup === "tiny" ? "90px" : "72px", borderRadius: "50%", margin: "0 auto 8px", display: "block", border: "3px solid rgba(67,233,123,0.3)", background: "white" }} />
                    <div style={{ fontSize: AG.emojiSize, marginBottom: "16px" }}>{scene.emoji}</div>
                    <h3 style={{ fontSize: AG.qFont, fontWeight: "700", color: "#1a1a2e", marginBottom: "10px", lineHeight: "1.5", display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "8px" }}>
                      {scene.scene}
                      <SpeakBtn text={scene.scene} ageGroup={ageGroup} />
                    </h3>
                    <p style={{ fontSize: ageGroup === "tiny" ? "17px" : "15px", color: "#888", marginBottom: "24px" }}>
                      {ageGroup === "tiny" ? "How does that feel? 🤔" : "What feeling does this describe?"}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      {scene.options.map((opt, i) => {
                        let bg = "white", border = "2px solid #e0e0e0", color = "#333";
                        if (gameAnswered) {
                          if (i === scene.ans)                              { bg = "#dcfce7"; border = "2px solid #16a34a"; color = "#16a34a"; }
                          else if (gameChoice === i && i !== scene.ans)     { bg = "#fee2e2"; border = "2px solid #dc2626"; color = "#dc2626"; }
                        } else if (gameChoice === i) { bg = "#f0efff"; border = "2px solid #6b6bd6"; }
                        return (
                          <button key={i} onClick={() => { if (!gameAnswered) { setGameChoice(i); handleGameAnswer(i === scene.ans, scene.xp); } }}
                            style={{ padding: ageGroup === "tiny" ? "18px" : "16px", borderRadius: "12px", background: bg, color, border, cursor: gameAnswered ? "default" : "pointer", fontSize: ageGroup === "tiny" ? "18px" : "16px", fontWeight: "700", transition: "all 0.2s" }}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {gameAnswered && (
                      <div style={{ marginTop: "20px" }}>
                        <div style={{ padding: "14px 18px", borderRadius: "12px", background: gameChoice === scene.ans ? "#dcfce7" : "#fff7e6", color: gameChoice === scene.ans ? "#16a34a" : "#b45309", fontWeight: "600", marginBottom: "14px", fontSize: ageGroup === "tiny" ? "17px" : "15px" }}>
                          {gameChoice === scene.ans
                            ? `🎉 Yes! "${scene.options[scene.ans]}"! +${scene.xp} XP`
                            : `The feeling is "${scene.options[scene.ans]}".`}
                        </div>
                        <button onClick={() => nextGame(activeFeelings.length)} style={{ padding: "12px 28px", background: "linear-gradient(135deg,#43e97b,#38f9d7)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: ageGroup === "tiny" ? "17px" : "15px" }}>
                          {gameIdx + 1 === activeFeelings.length ? "Finish Game 🎉" : "Next →"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        )}

      </div>
    </div>
  );
}
