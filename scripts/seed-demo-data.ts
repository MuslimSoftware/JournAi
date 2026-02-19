import { execute, DB_URL } from '../src/lib/db';

function id() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function ts(date: string, hour = 9, min = 0) {
  return `${date}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00.000Z`;
}

// ──────────────────────────────────────────────
// ENTRIES — spanning Apr 2024 → Feb 2026
// ──────────────────────────────────────────────

const ENTRIES: { date: string; content: string }[] = [
  // ── 2024 April ──
  {
    date: '2024-04-02',
    content: `First day at the new job. The office is smaller than I expected but the energy is right — everyone seems genuinely excited about what they're building. Got paired with Marcus for onboarding. He has this calm, methodical way of explaining things that immediately put me at ease.\n\nThe tech stack is solid: React, TypeScript, Rust on the backend. Exactly what I was hoping for. Already feel like I made the right call leaving the agency.\n\nCelebrated with takeout sushi at home. New chapter begins.`,
  },
  {
    date: '2024-04-05',
    content: `End of first week. I'm drowning. The codebase is massive and everyone talks in acronyms I don't understand. Spent most of today pretending to follow a conversation about the event pipeline while secretly Googling every third word.\n\nMet Priya during lunch. She's the senior engineer on my squad — intimidatingly sharp. She rattled off a list of architecture docs I "should read this weekend" like it was nothing. The list is twelve items long. Twelve.\n\nStarting to wonder if I made a mistake leaving the agency. At least there I knew what I was doing. Here I feel like a fraud waiting to be discovered.\n\nTexted Ahmed and Omar. They're planning dinner next Friday. I need something familiar right now.`,
  },
  {
    date: '2024-04-12',
    content: `Shipped my first PR today. Nothing groundbreaking — a small UI fix for the settings page — but seeing my code in production felt real. Marcus did the code review and left a genuinely encouraging comment. Small gestures like that matter when you're new.\n\nAfternoon walk through the neighborhood. Discovered a coffee shop called "Ground Truth" that does an incredible cortado. Might become a regular.\n\nCalled Mom tonight. She asked about the job five different ways. Classic Mom.`,
  },
  {
    date: '2024-04-18',
    content: `Had coffee with an old college friend, Tariq. He's been traveling for the past year — Southeast Asia, mostly. The stories about temples in Bagan and street food in Penang made me realize how small my world has gotten. I've been so focused on career that I forgot to be curious about the wider world.\n\nNeed to plan a trip. Even a small one. A weekend somewhere I've never been.`,
  },
  {
    date: '2024-04-24',
    content: `Spent the entire day on a race condition bug that should have taken an hour. Drew sequence diagrams, stared at logs, tried three different approaches — nothing. Meanwhile Marcus casually fixed a critical issue in twenty minutes during standup like it was nothing.\n\nThe gap between where I am and where I should be feels enormous. Everyone else seems to speak this codebase fluently and I'm still sounding out the words.\n\nSkipped my evening run. Didn't have the energy. Just sat on the couch scrolling my phone and feeling sorry for myself. Need to snap out of this but the frustration is real.`,
  },
  {
    date: '2024-04-28',
    content: `Sunday farmers market with Omar. He convinced me to buy a sourdough starter from one of the vendors. Named it "Stanley." We'll see if I can keep this thing alive.\n\nSpent the afternoon reading on the balcony. Started "Atomic Habits" — I know, I'm late to the party. But the chapter on identity-based habits is genuinely reframing how I think about change. You don't rise to the level of your goals, you fall to the level of your systems.\n\nGood, quiet day.`,
  },

  // ── 2024 May ──
  {
    date: '2024-05-03',
    content: `Company offsite at a retreat center in the mountains. Should have been fun. Instead I spent most of it fighting the urge to hide in my room.\n\nThe "team bonding" exercises felt forced. Everyone has years of inside jokes and shared history. I'm the new guy laughing a beat too late at references I don't get. During the fireside chat, someone asked a brilliant question about the company's early pivot and I couldn't think of a single thing to say.\n\nShared a cabin with Marcus and a designer named Leo. They stayed up late talking and I joined but mostly listened, wondering if they could tell I was performing.\n\nI know it takes time. I know this. But knowing doesn't make the loneliness smaller.`,
  },
  {
    date: '2024-05-08',
    content: `Stanley the sourdough starter died. I forgot to feed him for four days. RIP.\n\nWork is picking up pace — sprint goals are ambitious this quarter. But I'm finding my rhythm. The morning routine helps: wake up, journal, coffee, code. No phone for the first hour.\n\nKasia texted me back about Saturday. We're meeting at that new gallery downtown. Nervous in a good way.`,
  },
  {
    date: '2024-05-11',
    content: `First date with Kasia. The gallery was showing this immersive light installation — rooms filled with projected constellations that moved as you walked through them. We spent two hours there, talking about art and childhood and the weird jobs we had in college.\n\nShe's a landscape architect. The way she talks about designing spaces that make people feel something — there's a shared language there with software, I think. Building things that shape experience.\n\nWalked along the river afterward. Didn't want it to end. Already thinking about the next one.`,
  },
  {
    date: '2024-05-17',
    content: `Promoted from "new guy" to actually being trusted with a feature. Leading the search redesign — my first real ownership at this company. Exciting and terrifying in equal measure.\n\nSecond date with Kasia — dinner at a tiny Italian place she loves. The pasta was handmade and she knew the owner by name. She has this way of being fully present in conversation that makes you feel like the only person in the room.\n\nI like who I am around her. That feels important.`,
  },
  {
    date: '2024-05-23',
    content: `Burned out. Six straight hours of deep work turned into ten because the search architecture keeps falling apart at the edges. Priya and I had a tense whiteboard session — she wanted to go with a simpler approach and I pushed back hard. Too hard. The silence after I raised my voice was awful.\n\nSkipped the gym again. Third time this week. The morning routine that was supposed to save me has collapsed into coffee and code, coffee and code.\n\nKasia texted asking about dinner and I snapped at her. Told her I was too busy. She sent back "ok" and the single word felt like a door closing. Called to apologize but it still sits heavy.\n\nI need to find a way to work hard without becoming someone I don't like.`,
  },
  {
    date: '2024-05-30',
    content: `Memorial Day weekend. Drove to the coast with Ahmed and Omar. Rented a cabin near the beach. Spent the days surfing (badly), grilling, and playing cards until 2am.\n\nOmar opened up about his startup idea — an AI tool for small business accounting. His eyes light up when he talks about it. I hope he goes for it.\n\nSunset on the last evening was one of those moments you know you'll remember. Three friends, cold beers, the sound of waves. Simple and perfect.`,
  },

  // ── 2024 June ──
  {
    date: '2024-06-04',
    content: `First real fight with Kasia. She came over and I was still working at 9pm despite promising to cook dinner. She said, "You always choose the screen over me," and I got defensive instead of hearing her.\n\nThe argument spiraled — she brought up how I cancelled plans last weekend, how I'm always "almost done" with work. I said things about needing space that I didn't mean. She left at 11. The apartment felt huge and wrong after she closed the door.\n\nLay in bed replaying every word. She's right about most of it. I've been pouring everything into this job and leaving scraps for the people who actually matter.\n\nTexted her "I'm sorry" at midnight. No response yet.`,
  },
  {
    date: '2024-06-11',
    content: `Search feature shipped to beta. The feedback is mostly positive — users love the speed improvement. A few edge cases to iron out but nothing critical. Celebrated quietly at my desk with a good coffee. Not every win needs to be loud.\n\nStarted therapy with Dr. Patel. First session was mostly intake — background, goals, what brought me in. I told her I'm doing well but want to be doing well intentionally, not accidentally. She smiled at that.`,
  },
  {
    date: '2024-06-19',
    content: `Dad's birthday. Flew home for the weekend. Mom made his favorite — lamb biryani with all the sides. The house smelled like childhood.\n\nGave him a framed photo from our fishing trip last year. He got quiet when he opened it, which for Dad means he loved it. We don't say "I love you" often in this family but we find other ways.\n\nNadia couldn't make it but FaceTimed in during cake. She sang Happy Birthday off-key on purpose. Some things never change.`,
  },
  {
    date: '2024-06-25',
    content: `Made it official with Kasia. We were sitting on her balcony watching the sunset and she just said, "So are we doing this?" and I said, "We're doing this." No drama, no grand gesture. Just two people choosing each other.\n\nCalled Ahmed to tell him. His response: "Finally. We've been placing bets." Apparently Omar had the closest guess on the timeline.\n\nFeeling grateful and a little terrified. The good kind of terrified.`,
  },

  // ── 2024 July ──
  {
    date: '2024-07-03',
    content: `Therapy session today. Dr. Patel asked me to describe my relationship with rest. I realized I treat rest like a reward I have to earn, not a basic need. She challenged me to take one full day this month with zero productivity goals. No errands, no workouts, no "catching up." Just being.\n\nThe idea makes me deeply uncomfortable which probably means I need it.`,
  },
  {
    date: '2024-07-07',
    content: `Fourth of July at Jake and Leila's rooftop party. Everyone was happy and loud and I felt like I was watching it all from behind glass.\n\nKasia introduced me to her friends and I stumbled through small talk, overthinking every sentence. One of them asked what I do and when I said "software engineer" the conversation died. I hate that I care about this.\n\nThe fireworks were beautiful and I felt nothing. Just stood there thinking about the production bug I need to fix Monday and whether Priya is still annoyed about the whiteboard incident.\n\nDrove home in silence. Kasia asked if I was okay. I said yes. I wasn't. I don't know how to explain the emptiness that shows up in rooms full of people.`,
  },
  {
    date: '2024-07-14',
    content: `Took Dr. Patel's advice — zero productivity day. Woke up without an alarm. Read in bed. Took a bath at 2pm on a Sunday. Watched clouds from the balcony.\n\nThe first few hours were agony. My brain kept generating to-do lists. But by late afternoon something shifted. A stillness I haven't felt in months.\n\nI need to protect this. Not every Sunday, but regularly. Rest isn't laziness. It's maintenance.`,
  },
  {
    date: '2024-07-20',
    content: `Hiked Mount Wilson with Marcus and Priya. 14 miles round trip. My legs are destroyed but the views from the summit made every step worth it.\n\nMarcus told us about his woodworking hobby — he's building a dining table from reclaimed oak. The patience required for that kind of craft is something I admire and don't possess. Maybe I should find my version of woodworking.\n\nPriya is training for a half marathon. She runs with this effortless cadence that makes you forget she's covering serious distance.`,
  },
  {
    date: '2024-07-29',
    content: `Performance review. Exceeds expectations across the board. My manager said the search feature was "exactly the kind of ownership we want to see from engineers at your level." She mentioned the leadership development program — something to think about for next year.\n\nShared the news with Kasia over dinner. She said she's proud of me and it hit harder than I expected. Having someone witness your growth matters.`,
  },

  // ── 2024 August ──
  {
    date: '2024-08-05',
    content: `Omar quit his job to go all in on his startup. Everyone at dinner was celebrating, toasting his courage. I smiled and said all the right things — "I believe in you," "this is going to be huge."\n\nBut underneath? Jealousy. Raw, ugly jealousy. He's betting everything on a dream while I'm sitting in my safe job, my safe apartment, my safe routine. When did I become the cautious one?\n\nDrove home thinking about every risk I didn't take, every idea I killed with "practicality." The comfortable life I've built suddenly feels like a cage I decorated to look like a choice.\n\nCan't sleep. The ceiling has no answers.`,
  },
  {
    date: '2024-08-12',
    content: `Anniversary of Grandpa's passing. Drove to the cemetery alone. Sat by his headstone and completely fell apart.\n\nI thought I was past this. It's been years. But grief doesn't work on a schedule — it ambushes you. I tried to tell him about the new job, about Kasia, and my voice just cracked and I sat there sobbing in the grass like a child.\n\nThe worst part is the forgetting. I can't remember what his hands looked like anymore. Can't remember the exact sound of his laugh. These details are slipping away and there's nothing I can do to hold them.\n\nMom called tonight. She was crying too. We sat on the phone in silence for a while, just breathing. Grief is the loneliest shared experience.\n\nI miss him so much it physically hurts.`,
  },
  {
    date: '2024-08-19',
    content: `Two-week vacation starts today. Kasia and I are driving up the coast — no rigid itinerary, just a direction and a playlist. First stop: a tiny town called Mendocino. The Airbnb has a view of the cliffs and I can hear the ocean from bed.\n\nAlready feel the work tension leaving my shoulders. I forget how much I need this until I stop.`,
  },
  {
    date: '2024-08-22',
    content: `Day four of the road trip. Stopped at a vineyard in Sonoma County. Kasia knows way more about wine than I do and watching her swirl and sniff and taste with such intention was endearing.\n\nWe got slightly lost on a back road and ended up at this hidden beach — no one else around. Swam in the freezing water and dried off on the rocks like sea lions. Unplanned moments like this are the whole point of travel.\n\nNote: find the name of that pinot noir Kasia loved.`,
  },
  {
    date: '2024-08-28',
    content: `Last day of vacation. Sitting on the balcony of our final stop — a hotel in Big Sur perched on the cliff edge. The Pacific stretches out forever.\n\nThis trip reminded me who I am outside of work, outside of routine. I'm someone who laughs easily, who gets excited about a good meal, who wants to see every sunset.\n\nKasia fell asleep reading next to me. I don't want to forget this exact feeling.`,
  },

  // ── 2024 September ──
  {
    date: '2024-09-03',
    content: `First day back from vacation and the dread hit before my alarm went off. Lay in bed for twenty minutes staring at the ceiling, bargaining with the universe for one more week away.\n\nThe inbox was a disaster — 200+ emails, three "urgent" Slack threads, a production issue from last week that nobody fully resolved. By noon I was already exhausted. The post-vacation glow lasted approximately forty-five minutes.\n\nNew quarter goals are brutal. I volunteered to lead the mobile migration in a moment of vacation-induced optimism. Now I'm terrified. I don't know React Native well enough for this.\n\nTried to go for a run to shake it off. Made it half a mile before turning around. Body said no. Head said louder.`,
  },
  {
    date: '2024-09-10',
    content: `Kasia met Mom and Dad over FaceTime. It was awkward. Mom was overly formal — the voice she uses with strangers — and Dad barely spoke. Kasia tried hard, asking Dad about his engineering career, but the connection kept dropping and the whole thing felt stilted.\n\nAfterward Kasia said it went "fine" but I could tell she was hurt. She asked why my parents seemed distant. I didn't know how to explain the cultural gap — the way my family shows warmth through food and proximity, not through a screen.\n\nFelt caught between two worlds again. The person I am with Kasia and the person I am with my family don't always speak the same language. I love both versions. I just wish they fit together more easily.\n\nCouldn't focus on work. Architecture decisions piling up while my brain is elsewhere.`,
  },
  {
    date: '2024-09-18',
    content: `Therapy. Dr. Patel and I talked about impostor syndrome. Even after the good review, even after shipping features, there's a voice that says I got lucky. She reframed it: "The fact that you question yourself means you care about quality. The problem isn't the doubt — it's believing the doubt is truth."\n\nWriting it down to remember it.\n\nMade bolognese from scratch tonight. Three-hour simmer. The patience paid off.`,
  },
  {
    date: '2024-09-25',
    content: `Omar's startup got into Y Combinator. I actually screamed when he told me. The guy who was terrified two months ago is now moving to San Francisco for three months. We threw an impromptu celebration at Ahmed's place.\n\nWatching someone bet on themselves and win — even just this first step — is genuinely inspiring. I'm taking notes.`,
  },

  // ── 2024 October ──
  {
    date: '2024-10-03',
    content: `Fall is here and everything looks different. The walk to the coffee shop is now a tunnel of amber and gold. Pulled out my camera for the first time in months and shot a whole roll of the neighborhood in autumn light.\n\nPhotography used to be my thing. When did I stop? Probably when work consumed everything. Committing to one photo walk per week this month.`,
  },
  {
    date: '2024-10-08',
    content: `First major bug in production from my code. The search indexer was silently failing for a subset of users. Felt awful — that sinking feeling when you realize the thing you built is broken. Priya helped me triage and we had it fixed within the hour.\n\nWhat I learned: write better monitoring. The code worked but we had no visibility into edge cases. Marcus said, "The bug isn't the failure. Not catching it sooner is." Fair.`,
  },
  {
    date: '2024-10-15',
    content: `Planned a surprise picnic for Kasia's birthday at the botanical gardens. Packed everything perfectly — her favorite foods, the pinot noir from our road trip, a handwritten letter.\n\nThen it rained. Not a gentle drizzle — a downpour. We sat in the car watching the food get soggy through the windshield. I tried to laugh it off but inside I was spiraling. I'd spent two weeks planning this. Two weeks.\n\nKasia was gracious about it — "the letter is what matters," she said. But I saw the flicker of disappointment when I unpacked the wet blanket. We ended up eating pizza on the couch and she said it was perfect but nothing about it felt perfect to me.\n\nSix months together and I already feel like I'm failing at this. The voice in my head that says I'm not enough is loudest when I'm trying the hardest.`,
  },
  {
    date: '2024-10-22',
    content: `Attended a tech talk on AI and privacy. The speaker made a compelling case that the companies building AI tools have a moral obligation to be transparent about data usage. It resonated — especially thinking about our own product.\n\nBrought it up in our team meeting. We're going to audit our data pipeline. Sometimes the right thing to do isn't the most efficient thing, and that's okay.\n\nAutumn photo walk #3: the park at golden hour. Got a shot of an older couple holding hands on a bench that might be my favorite photo of the year.`,
  },
  {
    date: '2024-10-31',
    content: `Halloween. Kasia and I went as Bob Ross and a happy little tree. It was her idea and the execution was perfect — she even made a tiny cardboard palette for me.\n\nJake and Leila's party was a blast. Ahmed came as a UPS delivery driver and just handed people random boxes all night. The commitment to the bit was legendary.\n\nSomething about being silly together with people you love — it's its own kind of intimacy.`,
  },

  // ── 2024 November ──
  {
    date: '2024-11-05',
    content: `Election day. Voted early. Spent the rest of the day in a fog of anxiety, refreshing news sites until my eyes burned.\n\nWork was impossible. Nobody could focus. We left early by unspoken agreement but going home just meant doom-scrolling on a bigger screen.\n\nI keep thinking about the world my future kids would inherit. The anger feels bottomless — at the system, at the apathy, at my own powerlessness. What's the point of building apps when the foundations underneath everything are cracking?\n\nKasia came over and we sat in silence for a long time. She held my hand and I wanted to be comforted but I just felt numb. Made soup because I didn't know what else to do. The warmth helped for about ten minutes.\n\nGoing to bed angry and scared. Some days the weight of the world is too heavy to carry.`,
  },
  {
    date: '2024-11-14',
    content: `Nadia is visiting for Thanksgiving. She arrives next week and I can't wait. Haven't seen her in person since she moved to Vancouver eight months ago.\n\nWork milestone: mobile app beta is live internally. It's rough but functional. Using our own product on my phone feels surreal. The team is energized.\n\nEvening: started "The Remains of the Day" by Ishiguro. His prose is so restrained and devastating. Every sentence carries weight.`,
  },
  {
    date: '2024-11-21',
    content: `Nadia's here. Within an hour of arriving she started rearranging my living room and critiquing my "sad bachelor lighting." I know she means well but something about my older sister walking into my space and immediately trying to fix it hit a nerve.\n\nWe stayed up late and the conversation turned heavy. She said Mom and Dad are worried about me — that I work too much, that I've changed since the move. I got defensive. Said I'm building a life, not running from one.\n\nThe truth is she touched something real. I have been pulling away from the family. The weekly calls to Mom have become biweekly. I missed Dad's doctor's appointment — didn't even know he had one.\n\nShe and Kasia met and got along immediately, which should have made me happy but instead made me feel like the least interesting person in my own apartment.\n\nLove my sister. Hate the mirror she holds up.`,
  },
  {
    date: '2024-11-28',
    content: `Thanksgiving at home. Mom flew in. Dad drove. Nadia helped me cook — she handled the sides while I did the turkey (first time, terrifyingly). It turned out great. Maybe too much rosemary but nobody complained.\n\nThe table was full: Mom, Dad, Nadia, Kasia, Ahmed, Omar (home from SF for the holiday). Everyone I love in one room. I looked around at one point and thought: this is it. This is the life.\n\nDad pulled me aside after dessert and said, "She's a good one. Don't mess it up." High praise from a man of few words.`,
  },

  // ── 2024 December ──
  {
    date: '2024-12-05',
    content: `First snowfall of the season. Watched it from the office window during a meeting I should've been paying more attention to. There's something about snow that resets everything — covers the mess, quiets the noise.\n\nStarted Christmas shopping. Got Kasia a first edition of a poetry book she mentioned loving as a teenager. Took some digging to find but that's what makes it meaningful.\n\nGym: back squat PR at 275. The strength gains from consistency are real.`,
  },
  {
    date: '2024-12-12',
    content: `Company holiday party. Open bar, live jazz, the whole thing. Danced with Kasia in front of my coworkers which was both embarrassing and wonderful. Marcus clapped. Priya filmed it. I'll never live it down and I don't want to.\n\nGot paired with Leo for the gift exchange. He gave me a handmade ceramic mug — turns out he does pottery on the side. Everyone at this company has hidden depths.\n\nWalked home in the snow. The city was glowing.`,
  },
  {
    date: '2024-12-20',
    content: `Last day of work before the break. Team did a year-end retro and everyone shared their highlights. I listed mine — search feature, mobile beta — but they felt hollow in the saying.\n\nScrolling LinkedIn on the train home was a mistake. Everyone is celebrating promotions, launches, awards. A guy from my college cohort just raised $5M for his startup. Another one published a book. I'm twelve months into a job fixing pagination bugs and calling it growth.\n\nThe comparison trap is quicksand. I know this intellectually. Emotionally I'm chest-deep.\n\nPacked for the trip home feeling heavy. Two weeks with the family sounds wonderful and exhausting in equal measure. Kasia's joining for Christmas and she's nervous. I told her they already love her but I'm not sure that's entirely true yet.`,
  },
  {
    date: '2024-12-25',
    content: `Christmas morning. Mom made her famous cardamom pancakes. Dad wore the ridiculous reindeer sweater Nadia sent him. Kasia fit in like she'd always been here.\n\nWe exchanged gifts in the living room — the same spot where Nadia and I used to tear open presents as kids. Kasia loved the poetry book. She read a passage out loud and her voice cracked. I'll hold that moment for a long time.\n\nAfternoon walk in the snow with Dad. He told me he's proud of the man I'm becoming. I didn't know I needed to hear that until he said it.`,
  },
  {
    date: '2024-12-31',
    content: `Last day of 2024. What a year.\n\nNew job that challenges me. A relationship that grounds me. Friendships that sustain me. A family that loves me despite everything.\n\nThings I want to carry into 2025:\n- The morning routine (it's working)\n- Therapy (keep going)\n- Photography (bring it back)\n- Saying no more often so my yes means something\n\nThings I want to leave behind:\n- The belief that rest has to be earned\n- Comparing my chapter 3 to someone else's chapter 20\n- Checking my phone first thing in the morning\n\nHere's to a year of depth over breadth.`,
  },

  // ── 2025 January ──
  {
    date: '2025-01-03',
    content: `New year, slow start. And that's intentional. Instead of a massive resolution list, I picked three words for the year: presence, craft, generosity.\n\nPresence — put the phone down, be where I am.\nCraft — care about the quality of what I make.\nGenerosity — give freely without keeping score.\n\nBack at work next week. For now, reading and resting.`,
  },
  {
    date: '2025-01-08',
    content: `First week back and the AI initiative landed on my desk like a boulder. I'm supposed to lead the company's first foray into ML-powered tools and I barely understand embeddings. Spent the afternoon reading papers and feeling my confidence evaporate with every paragraph.\n\nThe landscape is moving so fast that every choice feels like a gamble. Pick the wrong model, the wrong vector DB, the wrong architecture — and I've wasted months of the company's time.\n\nKasia started a new project at work and came home glowing with excitement. I tried to match her energy but I was faking it. She noticed. She always notices.\n\nCan't shake the feeling that I'm about to be exposed. The imposter isn't gone — he just learned to dress better.`,
  },
  {
    date: '2025-01-15',
    content: `Rough week. A production incident took down the app for two hours on Tuesday. Not my code this time but the incident response was all-hands. The postmortem revealed gaps in our alerting that we should have caught months ago.\n\nLesson: the boring infrastructure work is the most important work. Monitoring, alerts, runbooks — unglamorous but essential.\n\nNeeded the gym tonight. Heavy squats and loud music. Physical exhaustion as stress relief.`,
  },
  {
    date: '2024-01-20',
    content: `Weekend cabin trip with Kasia. Was supposed to be romantic. Instead we had the conversation I've been avoiding — about the future, about timelines, about whether we want the same things.\n\nShe wants to know where this is going. Marriage, kids, the whole trajectory. I froze. Not because I don't want those things but because the weight of deciding felt suffocating. She took my silence as hesitation and the hurt in her eyes was a knife.\n\nWe spent the rest of the weekend being polite to each other, which is worse than fighting. The cabin had no Wi-Fi and I'd never wanted a distraction more.\n\nShe brought watercolors and painted alone on the porch while I pretended to read by the fireplace. The distance between two people in a small room can be infinite.\n\nDriving home in a silence that wasn't comfortable at all.`,
  },
  {
    date: '2025-01-27',
    content: `Therapy check-in. Six months with Dr. Patel now. We reviewed my progress — better boundaries, less people-pleasing, more intentional rest. Still working on: sitting with discomfort instead of fixing everything immediately.\n\nShe asked me what I'm most proud of this year so far. I said: "I'm learning to disappoint people gracefully." She laughed but I meant it. Saying no is a skill.`,
  },

  // ── 2025 February ──
  {
    date: '2025-02-03',
    content: `Started learning Rust. The borrow checker rejected my code seventeen times in a row. Seventeen. Each error message felt like a personal attack.\n\nI used to be good at picking up new languages. Now I'm sitting here at midnight feeling stupid because I can't figure out ownership. The Rust Book makes it sound elegant. My code is anything but.\n\nWork: the AI prototype is limping along. Semantic search returns garbage results half the time. The demo to the team is in two weeks and I have nothing worth showing.\n\nKasia made a comment about how much I talk about work. "You used to talk about other things," she said. She's right but I don't know what those other things are anymore.\n\nWho am I outside of this job? The question terrifies me because I'm not sure I have an answer.`,
  },
  {
    date: '2025-02-14',
    content: `Valentine's Day. Our first as a couple. Kept it simple — cooked dinner together (her lamb recipe, my salad) and exchanged letters instead of gifts. Hers made me cry. She wrote about the gallery where we first met and how she almost didn't go that night.\n\nThe alternate timeline where we don't meet is terrifying. Grateful for whatever forces put us in the same room.\n\nAlso: one year at the company this month. Time is doing that thing where it's both fast and slow.`,
  },
  {
    date: '2025-02-20',
    content: `Omar's startup raised their seed round. $2.1M. He called me at 8am practically shouting. The pride I feel for him is immense. He went from scared to funded in six months.\n\nCelebrated over video call since he's still in SF. Ahmed, Jake, and I toasted with coffee since it was a work morning. The joy was real anyway.\n\nReminder that betting on yourself, when the timing and preparation align, can actually work.`,
  },
  {
    date: '2025-02-26',
    content: `Photo walk through the industrial district. Found incredible textures — rusted metal, peeling paint, shadows cast by fire escapes. Shot three rolls of film.\n\nThere's a patience to film photography that digital doesn't have. You can't check immediately. You have to trust the process and wait. Feels like a metaphor for most things worth doing.\n\nKasia said she wants to see my photos displayed somewhere. Maybe I'll look into local gallery submissions.`,
  },

  // ── 2025 March ──
  {
    date: '2025-03-05',
    content: `Spring is arriving early. The cherry blossoms along the river are starting to pop. Biked to work for the first time this year — 20 minutes each way and it completely transforms the day. Arriving energized instead of drained from the commute.\n\nBig team discussion about the AI roadmap. We're debating between building our own embedding pipeline vs using a third-party API. I'm pushing for building our own — more control, better privacy story. Priya agrees. Marcus is on the fence.`,
  },
  {
    date: '2025-03-12',
    content: `Mom visited for a long weekend. She reorganized my spice cabinet without asking, rearranged the kitchen, and told me I look tired three separate times.\n\nI know it's love. I know it's her language. But being mothered at 28 when you're trying to feel like an adult is suffocating. She asked about marriage plans with Kasia — twice — and when I deflected she gave me The Look. The one that says "I'm not angry, just disappointed."\n\nShe and Kasia spent Saturday at the botanical gardens and came back with inside jokes. Should have been sweet. Instead I felt managed, like they were comparing notes on how to handle me.\n\nMom pulled me aside before leaving: "You work too hard. You're going to lose her." It landed like a slap. Not because she's wrong.\n\nSpent the evening angry at everyone, mostly myself.`,
  },
  {
    date: '2025-03-19',
    content: `Led my first tech talk at the company all-hands. Topic: "Building Privacy-First AI Features." Terrified going in, energized coming out. The Q&A lasted twice as long as the talk which is either a good sign or a sign I wasn't clear enough.\n\nPriya said it was the best internal talk she's attended. Coming from her, that means everything.\n\nCelebrated with a burger and fries at the dive bar down the street. Sometimes the simple rewards hit hardest.`,
  },
  {
    date: '2025-03-28',
    content: `Kasia and I adopted a cat. His name is Miso — orange tabby, chaotic energy, zero respect for personal space. He knocked my coffee off the desk within the first hour. I think we're going to be great friends.\n\nThe apartment feels different already. Alive in a new way. Kasia keeps taking photos of him sleeping in increasingly absurd positions.`,
  },

  // ── 2025 April ──
  {
    date: '2025-04-06',
    content: `Nadia visited. She and Kasia dragged me on an 8-mile hike with 2,000 feet of elevation gain. They promised it was "easy." It was not easy. I was gasping at the halfway point while they chatted effortlessly.\n\nThe fitness gap shouldn't bother me this much but it does. I've let the gym routine collapse completely — haven't been in six weeks. My body feels like a stranger's.\n\nAt the waterfall, Nadia mentioned her promotion to senior designer. Kasia congratulated her warmly. I said the right things but inside I was doing the math — she's younger than me and already further ahead in her field.\n\nDinner was fine. Miso weaving between our legs, everyone laughing. I smiled through it while my legs throbbed and my ego bled.\n\nLying in bed exhausted, wondering when comparison became my default setting.`,
  },
  {
    date: '2025-04-14',
    content: `Submitted three photos to a local gallery show. The theme is "Urban Solitude" — perfect for the industrial district series. Trying not to get my hopes up but also… hoping.\n\nWork: AI features are in closed beta with 50 users. The feedback is encouraging. People are finding old entries they'd forgotten about through semantic search. One user said, "It's like the app remembers my life better than I do." That's exactly the feeling we're going for.`,
  },
  {
    date: '2025-04-22',
    content: `Earth Day. Volunteered with Kasia at the community garden cleanup. Got my hands in actual dirt for the first time in months. There's something primal about it — the smell of soil, the weight of it, the life in it.\n\nMet an older gentleman named Harold who's been tending the same plot for 30 years. His tomatoes are legendary. He said the secret is "patience and showing up every day." Harold knows things.\n\nNote: start a small herb garden on the balcony.`,
  },

  // ── 2025 May ──
  {
    date: '2025-05-02',
    content: `One of my photos got accepted into the gallery show. "Fire Escape at Dusk" — the one with the geometric shadows I almost didn't shoot because the light was fading fast.\n\nCalled Dad to tell him. He said, "I didn't know you were still doing photography." Which stung a little but also motivated me. I want the people I love to know all the parts of me, not just the engineer.\n\nKasia was over the moon. She's already planning what to wear to the opening.`,
  },
  {
    date: '2025-05-10',
    content: `Gallery opening night. Standing next to my photo on a white wall with a little placard with my name — surreal. People stopped to look at it. A stranger said it made her feel "beautifully lonely." I don't think I've ever received a better compliment.\n\nKasia, Ahmed, Omar (in town for the weekend), Marcus, Priya — they all came. Having your people show up for you is everything.\n\nBought myself a new lens to celebrate. Treating it as an investment, not an expense.`,
  },
  {
    date: '2025-05-18',
    content: `Finished "The Remains of the Day." The ending destroyed me. Stevens spending his entire life in service of duty, realizing too late what he sacrificed — the unexpressed love, the unlived life.\n\nSet the book down and stared at the wall for twenty minutes. The parallel hit too close. How much of my life am I spending in service of "the career"? How many moments with Kasia, with my parents, with friends am I half-present for because my mind is at work?\n\nMiso sat in his carrier next to me in the park, watching birds. He lives entirely in the present. I live in next quarter's roadmap.\n\nThe existential dread is thick today. I'm 29 and I already feel the years contracting. There's never enough time and I'm wasting what I have on things that won't remember me.\n\nCalled Mom but hung up after two rings. Didn't know what I'd say.`,
  },
  {
    date: '2025-05-26',
    content: `Memorial Day. Quiet remembrance in the morning — Grandpa served in Korea. Then a barbecue at Ahmed's place. The tradition continues.\n\nOmar announced he's moving back. The startup is remote-first now and he missed home. We're all thrilled. The group chat hasn't been the same without him physically here.\n\nEvening: Kasia and I slow-danced in the kitchen to Chet Baker. Miso watched from the counter like we were insane. He's not wrong.`,
  },

  // ── 2025 June ──
  {
    date: '2025-06-03',
    content: `Annual review. Got promoted to Senior Engineer. The title matters less than what it represents — a year of consistent growth, of shipping things that mattered, of earning trust.\n\nMy manager's feedback: "You've gone from strong individual contributor to someone the team relies on for direction." That feels earned.\n\nKasia surprised me with a cake that said "Senior Softie" in icing. She knows how to celebrate without making it heavy.`,
  },
  {
    date: '2025-06-12',
    content: `Summer solstice approaching and the long evenings should feel freeing. Instead they feel endless in the wrong way — too much light, nowhere to hide.\n\nBiked home from work at 7pm and stopped at the overlook point. Watched the city glow and felt absolutely nothing. This numbness has been creeping in for weeks. Everything is technically fine — good job, good relationship, good health. So why do I feel like I'm watching my life from the outside?\n\nKasia wants to plan the Japan trip for October. She's excited, showing me itineraries, practicing Japanese phrases. I keep saying "looks great" while thinking about how tired I am.\n\nStarted learning Japanese on Duolingo. Quit after ten minutes. The cheerful notifications felt mocking.\n\nI think I might be depressed. The word feels dramatic for someone with my advantages. But the flatness is real. The joy is gone and I don't know when it left.`,
  },
  {
    date: '2025-06-21',
    content: `Longest day of the year. Spent it at the beach with the whole crew — Kasia, Ahmed, Omar, Jake, Leila. We played volleyball badly, ate too much watermelon, and watched the sunset that didn't seem to want to end.\n\nOmar pulled me aside and thanked me for believing in him when he was scared. Said my support meant more than I knew. Tried not to get emotional. Failed.\n\nSummer solstice resolution: more of this. More time with people I love in places that feel alive.`,
  },
  {
    date: '2025-06-29',
    content: `Balcony herb garden update: basil is thriving, cilantro is struggling, mint is trying to take over the world. Harold from the community garden was right — it's all about showing up consistently.\n\nWork has been intense — we're pushing for the AI features public launch in August. Long days but the team morale is high. Everyone believes in what we're building.\n\nKasia is designing a playground for a school in an underserved neighborhood. The joy she brings to this work is contagious.`,
  },

  // ── 2025 July ──
  {
    date: '2025-07-08',
    content: `Therapy was brutal today. Dr. Patel asked when I last felt truly at peace and I couldn't answer. Not happy — at peace. The Big Sur moment from last summer came to mind but that was a year ago.\n\nShe pushed: "What do you think prevents you from feeling that way more often?" And I said something about work, about being busy, the usual deflections. She didn't let it go. "You use busyness as armor. What are you protecting yourself from?"\n\nI didn't answer because the answer scares me. I think I'm protecting myself from finding out that I'm ordinary. That the career, the achievements, the constant striving — it's all a wall I built so I never have to sit with the question: am I enough without all of this?\n\nDrove home in tears. The good kind, maybe. The honest kind, at least.\n\nHow do I build peace into a life that's designed around avoiding stillness?`,
  },
  {
    date: '2025-07-15',
    content: `Miso got into the flour bag. The kitchen looked like a crime scene. He sat in the middle of the mess, covered in white powder, looking absolutely unbothered. I was too busy laughing to be mad.\n\nKasia captured the whole thing on video. It's already the most-played clip in our shared album.\n\nWork: semantic search accuracy is up to 94% on our test set. The embeddings model we fine-tuned is outperforming the generic one by a wide margin. Priya called it "unreasonably effective." Best kind of result.`,
  },
  {
    date: '2025-07-24',
    content: `Hosted a dinner party. Eight people around our table — barely fit but that's what made it special. Cooked Grandma's lamb biryani recipe for the first time. Not as good as Mom's but close.\n\nThe conversation flowed from travel stories to career doubts to whether ghosts are real (heated debate, no resolution). These long-table dinners are becoming my favorite thing.\n\nMarcus brought a bottle of wine from a vineyard he visited in Oregon. Paired perfectly. Noted for future reference.`,
  },

  // ── 2025 August ──
  {
    date: '2025-08-04',
    content: `AI features launched publicly. The response has been overwhelmingly positive. Users are discovering connections in their own writing they never noticed. One review said: "It's like having a conversation with my own memories." Exactly.\n\nThe team celebration was well-earned. Months of work, hundreds of decisions, countless tradeoffs — and it's live. Not perfect, but alive.\n\nDad called to say he tried the app. His feedback: "The icon is nice." Baby steps.`,
  },
  {
    date: '2025-08-14',
    content: `Took a week off after the launch. Was supposed to be completely offline. Lasted eighteen hours.\n\nCaught myself checking Slack at 6am on day two. The metrics from the launch were calling to me like a drug. "Just a quick look." Three hours later I was responding to messages, tweaking copy, reviewing error logs.\n\nKasia found me hunched over my laptop at 2pm and the look on her face — not angry, just sad. "You promised," she said. I said I was sorry. I said I'd stop. I checked again that night after she fell asleep.\n\nThe anxiety of not knowing is worse than any workload. What if something breaks? What if the numbers drop? What if they realize the features aren't that good?\n\nRest is supposed to be productive. I keep saying it. I don't believe it. Rest feels like falling behind.`,
  },
  {
    date: '2025-08-25',
    content: `Kasia's parents visited for the first time. Her mom, Linda, is warm and talkative. Her dad, Tom, is quiet and observant — reminded me of my own dad. We went to dinner at the Ethiopian place and they loved the coffee ceremony.\n\nTom pulled me aside and asked about my "intentions." Old school but sincere. I told him I'm in this for the long haul. He shook my hand firmly. I think I passed.\n\nSmall thing but it meant a lot: Linda said the apartment felt like a home, not just a place to live.`,
  },

  // ── 2025 September ──
  {
    date: '2025-09-02',
    content: `Back to school energy, even though I haven't been in school for years. Something about September resets my internal clock. New notebooks, new goals, fresh start vibes.\n\nStarted a photography project: "A Year in Light." One photo per week, same neighborhood, tracking how the light changes with the seasons. Shot the first one today — afternoon sun through the maple tree on Elm Street.`,
  },
  {
    date: '2025-09-11',
    content: `Hard day. The anniversary always is, but this year something cracked open deeper.\n\nCalled Uncle Ray to check in and he told me Grandpa used to worry about me. "He'd say, 'That boy works too hard. He's going to miss his own life.'" I had to pull over because I couldn't see the road through the tears.\n\nThe mortality of it all hit like a wave. Uncle Ray is 84. My parents are aging. Dad's doctor appointments are becoming routine. Someday I'll be sitting in a cemetery talking to Mom and Dad the way I talk to Grandpa. The thought made me physically sick.\n\nWork was supposed to be a distraction. Pair-programmed with Amir and couldn't focus. He asked if I was okay and I said yes because what else do you say?\n\nLying awake now with my hand on Miso's warm belly, trying to outrun the panic. Everyone I love is temporary. Including me.`,
  },
  {
    date: '2025-09-20',
    content: `Jazz festival with Kasia. She'd gotten us tickets months ago. The headliner was a pianist who played with his eyes closed the entire set — like he was somewhere else entirely. The music moved through the crowd like weather.\n\nWe sat on the grass afterward, a little wine-dizzy, talking about what kind of old people we want to be. She said she wants to be the kind who dances at every opportunity. I said I want to be the kind who writes letters by hand.\n\nWe're planning decades ahead and it doesn't scare me. That means something.`,
  },

  // ── 2025 October ──
  {
    date: '2025-10-05',
    content: `Japan trip. Day one in Tokyo. The sensory overload is extraordinary — neon, crowds, silence on trains, the smell of ramen from every alley. Everything is precise and beautiful. The hotel room is tiny and perfect.\n\nKasia is already in love with the stationery shops. She bought three notebooks in the first hour. I can't judge — I bought a film camera from a vintage shop in Shinjuku.`,
  },
  {
    date: '2025-10-08',
    content: `Kyoto. Fushimi Inari at sunrise — thousands of vermillion torii gates, almost no one around. It should have been transcendent. Instead I spent the whole walk composing Instagram captions in my head.\n\nThe bamboo grove was peaceful for about three minutes before a tour group arrived and everyone started posing. I sat there trying to have a "moment" and feeling nothing but irritation.\n\nKasia sketched the garden at Kinkaku-ji and her drawing was beautiful. I took forty photos and none of them captured what my eyes could see. The gap between experience and documentation is a canyon I keep falling into.\n\nAm I even enjoying this trip or am I performing enjoyment? The temples are stunning and I'm too trapped in my own head to receive them. Travel was supposed to fix something. It's just showing me that the problem travels with me.`,
  },
  {
    date: '2025-10-12',
    content: `Rural onsen town. We soaked in hot springs overlooking a valley of red and gold maples. The water was mineral-rich and slightly sulfuric. After an hour I felt like my bones were made of liquid.\n\nThe ryokan owner, an elderly woman named Tanaka-san, served us a kaiseki dinner that was a work of art. Every dish was a tiny sculpture. She said cooking is her way of saying "welcome." Hospitality as love language.\n\nI never want to leave this country.`,
  },
  {
    date: '2025-10-16',
    content: `Last day in Japan. Spent it wandering Osaka's street food scene. Takoyaki, okonomiyaki, matcha everything. My stomach might never forgive me but my taste buds are eternally grateful.\n\nBought gifts for everyone — matcha kit for Mom, a woodworking tool for Marcus (he'll understand), hand-dyed fabric for Nadia.\n\nThis trip changed something in me. Seeing a culture that values craft, patience, and harmony so deeply — I want to carry that home.`,
  },

  // ── 2025 November ──
  {
    date: '2025-11-03',
    content: `Post-Japan clarity. Came back with a stronger sense of what matters. Simplified my morning routine. Cleaned out the apartment. Donated three bags of clothes. The Japanese concept of "ma" — negative space — is influencing how I think about everything.\n\nLess noise, more signal. In work, in relationships, in my own head.\n\nMiso seemed offended that we were gone for two weeks. He's been aggressively cuddly since we got back. Forgiveness through proximity.`,
  },
  {
    date: '2025-11-12',
    content: `Big decision at work: they offered me a management track. Tech Lead for a new team. More people stuff, less coding. I'm torn.\n\nTalked it through with Kasia, with Marcus, with Dr. Patel. The consensus is: try it. You can always go back to IC. But you can't know if you're a good leader without leading.\n\nThe thing that scares me most is being responsible for other people's growth. But maybe that fear means I'd take it seriously. Told them yes.`,
  },
  {
    date: '2025-11-20',
    content: `Friendsgiving prep turned into a fight. Kasia and I were supposed to split the cooking but I ended up doing most of it while she handled "the vibe" — decorations, playlist, table setting. By 4pm I was elbow-deep in pumpkin pie filling, sweating, resentful, and she was arranging flowers.\n\nI said something passive-aggressive about the division of labor. She fired back that I always take over the kitchen and then complain about it. She's right, which made me angrier.\n\nThe dinner itself was fine. Ahmed gave a beautiful toast. Omar brought his new girlfriend Rin. Everyone was laughing and I was smiling through clenched teeth, still simmering.\n\nAfterward, cleaning up alone at midnight because Kasia went to bed after I said I "didn't need help" in that tone. The resentment is a habit I can't seem to break. I create the situations I complain about.\n\nI love this woman and I'm terrible at letting her in.`,
  },
  {
    date: '2025-11-28',
    content: `Thanksgiving with the family. Flew home with Kasia. The house was warm, the food was excessive, Dad fell asleep during the football game as tradition demands.\n\nNadia couldn't make it this year — work deadline. FaceTimed her in and she gave everyone a virtual tour of her new studio apartment. It has a reading nook built into a window bay. Jealous.\n\nHelped Mom with the dishes and she told me about her own mother's kitchen in Amman. Stories I've heard before but they sound different now that I'm building my own kitchen traditions.`,
  },

  // ── 2025 December ──
  {
    date: '2025-12-06',
    content: `First month as Tech Lead and I'm drowning. Managing four people is exponentially harder than managing code. Code doesn't have feelings. Code doesn't cry.\n\nHad my first difficult 1:1 today — gave feedback to an engineer whose code quality has been slipping. I was too blunt. She teared up. I panicked and tried to soften everything, which probably made it worse. She left the room quickly and I sat there feeling like the worst person in the building.\n\nMarcus gave me "The Manager's Path" and highlighted his favorite sections but right now I can't read anything about leadership without feeling like a fraud. I'm not a leader. I'm a coder they put in a suit.\n\nMissing the simplicity of heads-down coding. No ambiguity. No hurt feelings. Just logic and tests and clear right-or-wrong.\n\nCalled Kasia on the drive home and cried. First time in months. The weight of other people's careers sitting on my shoulders is crushing.`,
  },
  {
    date: '2025-12-14',
    content: `Kasia and I moved in together. It's been coming for months — we were basically living together anyway, bouncing between two apartments. Found a place with a second bedroom (office/studio), a balcony big enough for the herb garden, and a kitchen with actual counter space.\n\nMiso inspected every corner with the intensity of a health inspector. He approved the living room windowsill immediately. Sunny spot secured.\n\nFirst night: pizza on the floor, surrounded by boxes, watching the city lights through bare windows. Home.`,
  },
  {
    date: '2025-12-24',
    content: `Christmas Eve in the new apartment. First holiday in our own place. Kasia put up lights that she strung across the living room and it transformed the space into something magical.\n\nMom and Dad arrived this afternoon. Mom immediately started arranging things in the kitchen. Dad found the balcony and hasn't moved since. Some things are universal.\n\nBaked cookies with Kasia while Mom supervised. Three generations of family recipes colliding. The kitchen was flour-dusted and perfect.`,
  },
  {
    date: '2025-12-31',
    content: `End of 2025. A year of promotion, travel, moving in together, gallery shows, and growing into a leader I didn't know I could be.\n\nLooking at my journal from January — the three words were presence, craft, generosity. Did I live up to them? Imperfectly, but honestly. The attempt is the point.\n\nWords for 2026: depth, courage, play.\n\nDepth — go deeper with fewer things instead of skimming the surface of many.\nCourage — do the things that scare me, especially the conversations.\nPlay — remember that life is supposed to be fun.\n\nMidnight. Kasia. Champagne. The cat. A good life.`,
  },

  // ── 2026 January ──
  {
    date: '2026-01-04',
    content: `New year, same rhythms (the good ones). Morning coffee by the window. Journal. Move the body. The routine is a container, not a cage.\n\nFirst day back at work. The team energy is high — Q1 goals feel ambitious but achievable. My main focus: scaling the AI features for our growing user base. The infrastructure needs a rethink.\n\nKasia started sketching ideas for a community garden project. The dining table is covered in landscape drawings. I love living with a creative person.`,
  },
  {
    date: '2026-01-10',
    content: `Therapy milestone: one year with Dr. Patel. We reflected on the journey — from a guy who didn't know he needed help to someone who builds his week around this hour. The ROI on therapy is immeasurable.\n\nBiggest growth area: I no longer confuse self-worth with productivity. Bad days don't make me a bad person. Unfinished to-do lists don't erase what I've built.\n\nCelebrated the milestone by journaling about every breakthrough. There are more than I expected.`,
  },
  {
    date: '2026-01-14',
    content: `Burnout. The word I've been avoiding. But when you cry in your car before work three days this week, you have to call it what it is.\n\nThe morning routine is gone — haven't journaled in a week, haven't run in two, haven't cooked a real meal since last Sunday. I'm surviving on coffee and the vending machine. The three intentions I set for the year already feel like a joke.\n\nMentored a junior developer through her first production deploy today. Her nervousness reminded me of my own first time. I gave her encouraging words and the performance felt grotesque — the burned-out manager pretending he has his life together.\n\nKasia asked if I'm okay tonight. I said I'm fine. She didn't believe me. I could see her deciding whether to push and the fact that she chose not to made me feel even more alone.\n\nI don't know who to talk to about this. Dr. Patel is great but one hour a week can't fix a life that's coming apart at the seams.`,
  },
  {
    date: '2026-01-18',
    content: `Drove up to the lake house with Dad for the day. The drive itself was therapeutic — winding roads through the forest, windows down despite the cold.\n\nWe didn't catch any fish but that was never really the point. Dad told me stories about his early career that I'd never heard — how he almost quit engineering to become a teacher, how Grandpa talked him out of it, how he sometimes wonders what that alternate life would've looked like.\n\nIt hit me that my parents are people with unlived lives and unfinished dreams, not just "Mom and Dad." I want to ask them more questions while I still can.\n\nDrove home in comfortable silence. Some of the best conversations happen without words.`,
  },
  {
    date: '2026-01-22',
    content: `Had a difficult conversation with Jake today. He's been distant for months and I finally asked why. He said he's dealing with family stuff but the way he said it — flat, guarded — felt like a door closing. I told him I'm here whenever he's ready. He nodded and changed the subject.\n\nIt triggered something old. The fear that people will leave. That the closeness I think I have with people is a story I'm telling myself. How many of my friendships would survive if I stopped being the one who initiates?\n\nAt work, spent hours on a caching bug while the answer sat in plain sight. Priya spotted it in two minutes. Humility is a superpower in engineering, or so I tell myself. Feels more like evidence of decline.\n\nCame home to an empty apartment — Kasia is at a work event. Miso was asleep. Sat in the dark for a while before turning on the lights.\n\nThe loneliness of being surrounded by people who care about you and still feeling alone. That's the cruelest kind.`,
  },
  {
    date: '2026-01-25',
    content: `Saturday morning tradition: long walk with no destination. Ended up in a part of the neighborhood I rarely visit. Found a tiny used bookshop I never knew existed — "The Paper Crane." The owner, an older woman named Margaret, curates everything by mood instead of genre. Shelves labeled "For Rainy Afternoons" and "When You Need Courage." Genius.\n\nBought a worn copy of "Letters to a Young Poet" by Rilke. Sat in the park and read the first few letters. His advice to the young poet about solitude and patience feels timeless.\n\nAfternoon: helped Omar move into his new apartment. It's small but has great light and a balcony with a view of the park. He seems lighter already — sometimes a change of scenery is all you need.\n\nGrateful for a full, unplanned day.`,
  },
  {
    date: '2026-01-28',
    content: `Interesting conversation with Marcus at lunch about burnout in tech. He's been in the industry for 15 years and says the key is having something outside of work that you care about deeply. For him it's woodworking. He showed me photos of a dining table he built from reclaimed oak. Stunning craftsmanship.\n\nIt made me think about my own creative outlets. Journaling is one. Photography is alive again. The herb garden. These things keep me whole.\n\nGot feedback on the Q4 report — positive overall but need to tighten up the data visualization section. Fair point. I always rush that part.\n\nKasia surprised me with tickets to the jazz festival next month. She knows me too well.`,
  },
  {
    date: '2026-01-30',
    content: `Took a mental health day. No guilt about it — I've learned that these aren't luxuries, they're maintenance.\n\nMorning hike at Eagle Creek. The trail was mostly empty — just me, the trees, and a hawk circling overhead. Reached the summit in about an hour. The view of the valley with morning fog settling between the hills was surreal.\n\nAfternoon: tried watercoloring for the first time in months. Results were better than last time. There's something freeing about being a perpetual beginner. No expectations, no ego, just play.\n\nMade a big batch of chicken soup. The kind that simmers for hours and fills the whole apartment with warmth. Froze half for future lazy dinners.\n\nFeeling recharged. Tomorrow I'll be ready.`,
  },

  // ── 2026 February ──
  {
    date: '2026-02-01',
    content: `New month, fresh energy. Wrote down three intentions for February:\n1. Prioritize sleep — in bed by 10:30 on weeknights\n2. Read for 30 minutes daily\n3. One act of kindness per day, no matter how small\n\nWork was solid. Closed out three PRs and reviewed two more. The codebase is finally starting to feel clean after weeks of refactoring.\n\nRan into my old college friend Tariq at the coffee shop. Haven't seen him in over a year. He just got back from a sabbatical in Japan — the stories about Kyoto temples and rural onsens made me nostalgic for our own trip. We exchanged numbers again and this time I'll actually follow up.\n\nEvening yoga class. The instructor said something that stuck: "You don't need to be flexible to do yoga. You do yoga to become flexible." Applies to more than just stretching.`,
  },
  {
    date: '2026-02-03',
    content: `Back to work after a weekend I barely remember. The team's energy was high and I performed my part — smiles, enthusiasm, "great sprint planning everyone."\n\nThe performance is getting harder to maintain. Everyone sees the competent Tech Lead, the guy with the plan. Nobody sees the 4am anxiety spirals, the meals I skip, the runs I don't take.\n\nLunch at the new Ethiopian place with Kasia. The food was incredible and she was present and warm and I sat across from her thinking about how I don't deserve this. She told me about her community garden project and her face lit up and I felt the distance between her aliveness and my numbness like a physical ache.\n\nAfternoon: coded for three hours straight. The flow state was the only time I felt normal today. The work is the drug and the disease.\n\nSunset from the balcony. Orange melting into purple. I took a photo instead of watching it. Force of habit.`,
  },
  {
    date: '2026-02-05',
    content: `Rough start. Slept terribly — kept waking up with anxious thoughts about the presentation on Friday. Eventually got up at 4am and did a brain dump in my notebook. Getting the thoughts out of my head and onto paper helped. Fell back asleep around 5.\n\nWork was fine despite the fatigue. Pair-programmed with Priya on the search feature — she has an elegant way of thinking about data structures that I learn from every time.\n\nCalled Mom after work. She's planning to visit next month. Wants to bring her famous baklava. I can already taste it. We talked about Dad's retirement plans — he's thinking about teaching part-time at the community college.\n\nEarly night. Tomorrow will be better.`,
  },
  {
    date: '2026-02-07',
    content: `Big presentation at work today. Pitched the new feature to leadership — AI-powered journaling insights. Nervous going in but once I started talking, the energy shifted. They loved the demo.\n\nGot the green light to move to phase two. This could be a defining project for the year. Need to scope out the ML pipeline and figure out the privacy architecture. Users trust us with their most personal thoughts — that responsibility weighs on me in a good way.\n\nCelebrated with the team at the new ramen place on 5th. The spicy miso was phenomenal. Marcus told the funniest story about his cat destroying his keyboard mid-deploy.\n\nGood day. Earned this one.`,
  },
  {
    date: '2026-02-09',
    content: `Sunday morning farmers market. Picked up the usual — sourdough, eggs, tomatoes. The bread guy remembered my name. Small kindnesses from strangers sometimes hurt more than they help. They remind me how starved I am for being seen.\n\nSpent the afternoon on my desk setup — new monitor arm, cable management. Productive procrastination at its finest. Organizing the external world because the internal one is chaos.\n\nFaceTime with Nadia. She just got promoted to senior designer. I said all the right congratulatory things while calculating that she's now ahead of where I was at her age. The comparison is automatic and I hate it.\n\nMade chicken shawarma for dinner. The kitchen smelled like Grandpa's house and I had to sit down for a minute.\n\nSunday scaries are real tonight. Tomorrow feels like a mountain.`,
  },
  {
    date: '2026-02-11',
    content: `Rainy day. Worked from home with the window cracked open — there's something about the sound of rain that makes focus effortless.\n\nStarted reading "Four Thousand Weeks" by Oliver Burkeman. Only two chapters in but it's already shifting how I think about time management. The core idea that we'll never "get on top of everything" is oddly freeing.\n\nKasia and I watched a documentary about deep sea creatures tonight. The bioluminescence footage was mesmerizing. We kept pausing to look things up — turns out there's a jellyfish that's technically immortal. Nature is wild.\n\nNote to self: call Mom tomorrow. She texted about the garden and I forgot to reply.`,
  },
  {
    date: '2026-02-13',
    content: `Long day. Shipped the redesign but the celebration felt hollow. Marcus stayed late for an animation bug and Priya rewrote half the onboarding copy and I keep thinking — did I even contribute? Or did I just manage the spreadsheet while the real engineers did the work?\n\nThe Tech Lead imposter syndrome is different from the engineer kind. At least as an IC I could point to code I wrote. Now I point to "team outcomes" and wonder if the team would be better without me.\n\nDad texted about going fishing this weekend. I haven't replied. The thought of being cheerful for an entire day with him is exhausting. I love my father and I don't have the energy for his silences right now.\n\nEvening run along the waterfront. Forced myself out the door. 5K in 28 minutes — slowest in months. Stopped twice, not for the sunset, but because my chest was tight and I couldn't breathe.\n\nI need to tell someone how bad it's gotten. I just don't know how.`,
  },
  {
    date: '2026-02-14',
    content: `Happy Valentine's Day. Second one together. Woke up early and made breakfast for Kasia — her favorite, banana pancakes with a drizzle of honey. Miso sat on the counter supervising.\n\nWe spent the morning at the flower market downtown. The colors were unreal — deep reds, bright yellows, soft lavenders. I picked up a small bouquet of ranunculus for the kitchen table.\n\nHad a really grounding conversation over coffee about where we see ourselves in five years. No pressure, just dreaming out loud together. It felt easy.\n\nTwo years ago I was starting fresh at a new job, single, figuring things out. Now I have a home, a partner, a cat, a career I'm proud of, and a life that feels intentionally built.\n\nEnding the day grateful. These quiet, intentional moments matter more than grand gestures.`,
  },
];

// ──────────────────────────────────────────────
// TODOS
// ──────────────────────────────────────────────

const TODOS: { date: string; items: { content: string; completed: boolean }[] }[] = [
  // ── 2024 April ──
  { date: '2024-04-01', items: [{ content: 'Prep for first day — lay out clothes', completed: true }, { content: 'Review offer letter details', completed: false }] },
  { date: '2024-04-02', items: [{ content: 'Set up dev environment', completed: true }, { content: 'Read onboarding docs', completed: true }, { content: 'Meet with Marcus for walkthrough', completed: true }] },
  { date: '2024-04-03', items: [{ content: 'Finish laptop setup — install tools', completed: true }, { content: 'Groceries after work', completed: true }] },
  { date: '2024-04-04', items: [{ content: 'Read codebase overview doc', completed: true }, { content: 'Set up Slack channels', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2024-04-05', items: [{ content: 'Read architecture docs Priya recommended', completed: true }, { content: 'Text Ahmed and Omar about Friday dinner', completed: true }] },
  { date: '2024-04-06', items: [{ content: 'Laundry', completed: true }, { content: 'Read architecture docs (continued)', completed: true }, { content: 'Duolingo', completed: false }] },
  { date: '2024-04-07', items: [{ content: 'Meal prep for the week', completed: true }, { content: 'Evening run', completed: true }] },
  { date: '2024-04-08', items: [{ content: 'Submit first code review comments', completed: true }, { content: 'Standup at 9:30', completed: true }] },
  { date: '2024-04-09', items: [{ content: 'Pair with Marcus on auth module', completed: true }, { content: 'Pick up dry cleaning', completed: false }] },
  { date: '2024-04-10', items: [{ content: 'Write tests for settings page fix', completed: true }, { content: 'Call Mom', completed: true }] },
  { date: '2024-04-11', items: [{ content: 'Address PR feedback', completed: false }, { content: 'Gym — upper body', completed: true }] },
  { date: '2024-04-12', items: [{ content: 'Submit first PR', completed: true }, { content: 'Call Mom', completed: true }, { content: 'Try cortado at Ground Truth', completed: true }] },
  { date: '2024-04-13', items: [{ content: 'Grocery run', completed: true }, { content: 'Clean apartment', completed: true }, { content: 'Check on Miso', completed: true }] },
  { date: '2024-04-14', items: [{ content: 'Laundry', completed: true }, { content: 'Read Atomic Habits ch 1-2', completed: false }] },
  { date: '2024-04-15', items: [{ content: 'Sprint planning meeting', completed: true }] },
  { date: '2024-04-16', items: [{ content: 'Start on search component ticket', completed: false }, { content: 'Dentist at 4pm', completed: true }] },
  { date: '2024-04-17', items: [{ content: 'Continue search component', completed: true }, { content: 'Evening run — 5K', completed: true }, { content: 'Floss', completed: false }] },
  { date: '2024-04-18', items: [{ content: 'Coffee with Tariq at 2pm', completed: true }, { content: 'Research weekend trip ideas', completed: false }] },
  { date: '2024-04-19', items: [{ content: 'Dinner with Ahmed and Omar', completed: true }, { content: 'Pick up wine', completed: true }] },
  { date: '2024-04-20', items: [{ content: 'Sleep in', completed: true }, { content: 'Farmers market', completed: false }] },
  { date: '2024-04-21', items: [{ content: 'Meal prep', completed: true }, { content: 'Iron shirts for the week', completed: true }] },
  { date: '2024-04-22', items: [{ content: 'Code review for Marcus', completed: true }] },
  { date: '2024-04-23', items: [{ content: 'Debug failing test suite', completed: true }, { content: 'Gym — leg day', completed: true }] },
  { date: '2024-04-24', items: [{ content: 'Debug race condition in sync module', completed: true }, { content: 'Evening run — aim for sub-25 5K', completed: true }] },
  { date: '2024-04-25', items: [{ content: 'Write up race condition fix in docs', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2024-04-26', items: [{ content: 'Clean bathroom', completed: true }, { content: 'Call Nadia', completed: true }, { content: 'In bed by 10:30', completed: true }] },
  { date: '2024-04-27', items: [{ content: 'Brunch with Kasia\'s friend group', completed: false }, { content: 'Read', completed: true }] },
  { date: '2024-04-28', items: [{ content: 'Farmers market with Omar', completed: true }, { content: 'Pick up sourdough starter', completed: true }, { content: 'Start reading Atomic Habits', completed: true }] },
  { date: '2024-04-29', items: [{ content: 'Feed sourdough starter', completed: true }, { content: 'Sprint retro', completed: true }] },
  { date: '2024-04-30', items: [{ content: 'Month-end timesheet', completed: true }, { content: 'Feed Stanley', completed: true }] },

  // ── 2024 May ──
  { date: '2024-05-01', items: [{ content: 'Feed Stanley', completed: true }, { content: 'Sprint planning', completed: false }] },
  { date: '2024-05-02', items: [{ content: 'Pack bag for offsite tomorrow', completed: true }] },
  { date: '2024-05-03', items: [{ content: 'Pack for company offsite', completed: true }, { content: 'Bring hiking boots', completed: true }] },
  { date: '2024-05-04', items: [{ content: 'Offsite day 2 — workshops', completed: true }] },
  { date: '2024-05-05', items: [{ content: 'Unpack from offsite', completed: true }, { content: 'Laundry', completed: false }] },
  { date: '2024-05-06', items: [{ content: 'Standup', completed: true }, { content: 'Follow up on offsite action items', completed: true }, { content: 'Feed Stanley', completed: false }] },
  { date: '2024-05-07', items: [{ content: 'Gym — run', completed: true }, { content: 'Groceries', completed: true }, { content: 'Evening run', completed: true }] },
  { date: '2024-05-08', items: [{ content: 'Feed Stanley the sourdough starter', completed: false }, { content: 'Text Kasia about Saturday', completed: true }] },
  { date: '2024-05-09', items: [{ content: 'Code review for Priya', completed: true }, { content: 'Haircut at 5pm', completed: true }, { content: 'Journal', completed: true }] },
  { date: '2024-05-10', items: [{ content: 'Confirm gallery tickets for tomorrow', completed: true }] },
  { date: '2024-05-11', items: [{ content: 'Gallery tickets — confirm time', completed: true }, { content: 'Iron the blue shirt', completed: false }] },
  { date: '2024-05-12', items: [{ content: 'Meal prep', completed: true }, { content: 'Text Kasia — had a great time', completed: true }] },
  { date: '2024-05-13', items: [{ content: 'Sprint standup', completed: true }, { content: 'Start search redesign ticket', completed: true }] },
  { date: '2024-05-14', items: [{ content: 'Search redesign — wireframes', completed: true }] },
  { date: '2024-05-15', items: [{ content: 'Dentist cleaning at 2pm', completed: true }, { content: 'Pick up prescriptions', completed: true }] },
  { date: '2024-05-16', items: [{ content: 'Search redesign — prototype', completed: true }, { content: 'Plan second date', completed: true }] },
  { date: '2024-05-17', items: [{ content: 'Dinner reservation for second date', completed: false }, { content: 'Review search redesign brief', completed: true }] },
  { date: '2024-05-18', items: [{ content: 'Laundry', completed: true }, { content: 'Clean kitchen', completed: false }] },
  { date: '2024-05-19', items: [{ content: 'Grocery run', completed: true }, { content: 'Call Mom', completed: true }] },
  { date: '2024-05-20', items: [{ content: 'Sprint planning', completed: false }, { content: 'Search redesign review with team', completed: true }] },
  { date: '2024-05-21', items: [{ content: 'Implement search filters', completed: true }, { content: 'Evening run', completed: true }] },
  { date: '2024-05-22', items: [{ content: 'Continue search implementation', completed: true }] },
  { date: '2024-05-23', items: [{ content: 'Whiteboard search approaches with Priya', completed: true }, { content: 'Call Nadia', completed: true }, { content: 'Gym — don\'t skip', completed: false }] },
  { date: '2024-05-24', items: [{ content: 'Finish search PR', completed: true }, { content: 'Pay rent', completed: true }] },
  { date: '2024-05-25', items: [{ content: 'Clean apartment', completed: true }, { content: 'Read', completed: true }] },
  { date: '2024-05-26', items: [{ content: 'Farmers market', completed: true }] },
  { date: '2024-05-27', items: [{ content: 'Memorial Day — relax', completed: true }] },
  { date: '2024-05-28', items: [{ content: 'Back to work — clear inbox', completed: true }, { content: 'Gym', completed: true }, { content: 'Evening run', completed: false }] },
  { date: '2024-05-29', items: [{ content: 'Beach trip logistics — book cabin', completed: true }, { content: 'Buy cooler', completed: true }] },
  { date: '2024-05-30', items: [{ content: 'Pack for beach weekend', completed: true }, { content: 'Buy sunscreen', completed: true }, { content: 'Cabin rental confirmation', completed: true }] },
  { date: '2024-05-31', items: [{ content: 'Beach day — surfing with Ahmed and Omar', completed: true }] },

  // ── 2024 June ──
  { date: '2024-06-01', items: [{ content: 'Return from beach trip — unpack', completed: true }] },
  { date: '2024-06-02', items: [{ content: 'Meal prep', completed: true }, { content: 'Grocery run', completed: true }] },
  { date: '2024-06-03', items: [{ content: 'Sprint standup', completed: true }, { content: 'Plan dinner for Kasia — first time at my place', completed: true }] },
  { date: '2024-06-04', items: [{ content: 'Buy chicken for shawarma', completed: true }, { content: 'Make tahini sauce', completed: true }, { content: 'Attempt homemade pita', completed: true }] },
  { date: '2024-06-05', items: [{ content: 'Code review', completed: true }] },
  { date: '2024-06-06', items: [{ content: 'Search feature QA testing', completed: true }, { content: 'Fix edge case in filters', completed: true }] },
  { date: '2024-06-07', items: [{ content: 'Sprint retro', completed: true }, { content: 'Pay bills', completed: true }, { content: 'Duolingo', completed: true }] },
  { date: '2024-06-08', items: [{ content: 'Clean apartment', completed: false }, { content: 'Farmers market', completed: true }] },
  { date: '2024-06-09', items: [{ content: 'Brunch with Kasia', completed: false }, { content: 'Read', completed: true }] },
  { date: '2024-06-10', items: [{ content: 'Final search feature testing', completed: true }, { content: 'Prep for beta release', completed: true }] },
  { date: '2024-06-11', items: [{ content: 'Ship search feature to beta', completed: true }, { content: 'First therapy session with Dr. Patel at 10am', completed: true }] },
  { date: '2024-06-12', items: [{ content: 'Monitor beta feedback', completed: true }, { content: 'Evening run', completed: true }, { content: 'Journal', completed: true }] },
  { date: '2024-06-13', items: [{ content: 'Fix beta bug — empty state', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2024-06-14', items: [{ content: 'Date with Kasia — river walk', completed: true }] },
  { date: '2024-06-15', items: [{ content: 'Laundry', completed: true }, { content: 'Call Dad about birthday plans', completed: true }, { content: 'Duolingo', completed: true }] },
  { date: '2024-06-16', items: [{ content: 'Order framed photo for Dad', completed: true }, { content: 'Meal prep', completed: false }] },
  { date: '2024-06-17', items: [{ content: 'Book flight home', completed: true }] },
  { date: '2024-06-18', items: [{ content: 'Pack for weekend trip home', completed: true }, { content: 'Therapy at 10am', completed: true }, { content: 'Water herb garden', completed: true }] },
  { date: '2024-06-19', items: [{ content: 'Book flight home for Dad\'s birthday', completed: true }, { content: 'Pick up framed photo from print shop', completed: true }, { content: 'Call Nadia about FaceTime plan', completed: true }] },
  { date: '2024-06-20', items: [{ content: 'Dad\'s birthday dinner', completed: true }] },
  { date: '2024-06-21', items: [{ content: 'Fly back home', completed: true }, { content: 'Unpack', completed: true }] },
  { date: '2024-06-22', items: [{ content: 'Rest day', completed: false }, { content: 'Groceries', completed: true }] },
  { date: '2024-06-23', items: [{ content: 'Dinner with Kasia', completed: true }, { content: 'Clean kitchen', completed: false }] },
  { date: '2024-06-24', items: [{ content: 'Standup', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2024-06-25', items: [{ content: 'Tell Ahmed about Kasia', completed: true }, { content: 'Groceries for the week', completed: true }] },
  { date: '2024-06-26', items: [{ content: 'Code review for Leo', completed: true }] },
  { date: '2024-06-27', items: [{ content: 'Therapy at 10am', completed: true }] },
  { date: '2024-06-28', items: [{ content: 'Sprint retro', completed: true }, { content: 'Haircut', completed: false }] },
  { date: '2024-06-29', items: [{ content: 'Farmers market with Kasia', completed: true }, { content: 'Cook together', completed: false }] },
  { date: '2024-06-30', items: [{ content: 'Laundry', completed: true }] },

  // ── 2024 July ──
  { date: '2024-07-01', items: [{ content: 'Sprint planning', completed: true }, { content: 'Gym — run', completed: false }] },
  { date: '2024-07-02', items: [{ content: 'Search feature — fix pagination bug', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2024-07-03', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Plan a zero-productivity day this month', completed: true }, { content: 'Check on Miso', completed: true }] },
  { date: '2024-07-04', items: [{ content: 'Fourth of July — buy sparklers', completed: true }] },
  { date: '2024-07-05', items: [{ content: 'Recovery day', completed: true }, { content: 'Laundry', completed: true }] },
  { date: '2024-07-06', items: [{ content: 'Buy drinks for rooftop party', completed: true }, { content: 'Clean apartment', completed: false }] },
  { date: '2024-07-07', items: [{ content: 'Jake and Leila rooftop party — bring drinks', completed: true }] },
  { date: '2024-07-08', items: [{ content: 'Standup', completed: true }, { content: 'Write tests for search filters', completed: true }] },
  { date: '2024-07-09', items: [{ content: 'Code review', completed: true }, { content: 'Gym — legs', completed: true }, { content: 'Read before bed', completed: true }] },
  { date: '2024-07-10', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2024-07-11', items: [{ content: 'Search feature retro', completed: true }] },
  { date: '2024-07-12', items: [{ content: 'Sprint retro', completed: true }, { content: 'Date night with Kasia', completed: true }] },
  { date: '2024-07-13', items: [{ content: 'Farmers market', completed: true }, { content: 'Meal prep', completed: true }] },
  { date: '2024-07-14', items: [{ content: 'No to-do list today. That\'s the point.', completed: true }] },
  { date: '2024-07-15', items: [{ content: 'Sprint planning', completed: true }] },
  { date: '2024-07-16', items: [{ content: 'Start notifications feature', completed: true }, { content: 'Gym', completed: true }, { content: 'Call Mom', completed: true }] },
  { date: '2024-07-17', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Continue notifications', completed: true }] },
  { date: '2024-07-18', items: [{ content: 'Notifications PR — request review', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2024-07-19', items: [{ content: 'Pack for hike tomorrow', completed: true }, { content: 'Early night', completed: true }] },
  { date: '2024-07-20', items: [{ content: 'Mount Wilson hike — meet Marcus and Priya at 7am', completed: true }, { content: 'Pack extra water and snacks', completed: true }, { content: 'Charge camera battery', completed: true }] },
  { date: '2024-07-21', items: [{ content: 'Rest day — legs are destroyed', completed: true }, { content: 'Read', completed: true }] },
  { date: '2024-07-22', items: [{ content: 'Standup', completed: true }, { content: 'Address notifications PR feedback', completed: true }] },
  { date: '2024-07-23', items: [{ content: 'Merge notifications PR', completed: true }, { content: 'Evening run', completed: true }, { content: 'Read before bed', completed: false }] },
  { date: '2024-07-24', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Laundry', completed: true }] },
  { date: '2024-07-25', items: [{ content: 'Pay bills', completed: true }, { content: 'Gym', completed: true }, { content: 'Wipe down counters', completed: true }] },
  { date: '2024-07-26', items: [{ content: 'Sprint retro', completed: true }, { content: 'Dinner with Kasia', completed: true }, { content: 'Evening run', completed: false }] },
  { date: '2024-07-27', items: [{ content: 'Farmers market', completed: true }, { content: 'Clean apartment', completed: false }] },
  { date: '2024-07-28', items: [{ content: 'Prep performance review self-assessment', completed: true }] },
  { date: '2024-07-29', items: [{ content: 'Prepare for performance review', completed: false }, { content: 'Dinner reservation with Kasia to celebrate', completed: true }] },
  { date: '2024-07-30', items: [{ content: 'Follow up on review action items', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2024-07-31', items: [{ content: 'Month-end timesheet', completed: false }, { content: 'Gym', completed: true }] },

  // ── 2024 August ──
  { date: '2024-08-01', items: [{ content: 'Sprint planning', completed: false }, { content: 'Gym — upper body', completed: true }] },
  { date: '2024-08-02', items: [{ content: 'Code review for Priya', completed: true }, { content: 'Pay rent', completed: true }] },
  { date: '2024-08-03', items: [{ content: 'Farmers market', completed: true }, { content: 'Clean apartment', completed: false }] },
  { date: '2024-08-04', items: [{ content: 'Meal prep', completed: true }, { content: 'Call Mom', completed: false }] },
  { date: '2024-08-05', items: [{ content: 'Dinner with Omar — discuss startup plans', completed: true }, { content: 'Submit expense report', completed: false }] },
  { date: '2024-08-06', items: [{ content: 'Standup', completed: true }, { content: 'Evening run', completed: true }, { content: 'Evening run', completed: false }] },
  { date: '2024-08-07', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Groceries', completed: true }, { content: 'Water herb garden', completed: false }] },
  { date: '2024-08-08', items: [{ content: 'Fix CSS bug on mobile', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2024-08-09', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2024-08-10', items: [{ content: 'Laundry', completed: true }, { content: 'Read', completed: true }, { content: 'Take vitamins', completed: true }] },
  { date: '2024-08-11', items: [{ content: 'Pick up flowers for cemetery', completed: true }, { content: 'Meal prep', completed: true }, { content: 'Stretch', completed: true }] },
  { date: '2024-08-12', items: [{ content: 'Visit Grandpa\'s grave', completed: true }, { content: 'Call Mom', completed: true }, { content: 'Pick up flowers for cemetery', completed: true }] },
  { date: '2024-08-13', items: [{ content: 'Standup', completed: true }, { content: 'Plan road trip route', completed: false }] },
  { date: '2024-08-14', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Book Mendocino Airbnb', completed: true }] },
  { date: '2024-08-15', items: [{ content: 'Book Big Sur hotel', completed: true }] },
  { date: '2024-08-16', items: [{ content: 'Sprint retro', completed: false }, { content: 'Start packing for trip', completed: true }] },
  { date: '2024-08-17', items: [{ content: 'Oil change for the car', completed: true }] },
  { date: '2024-08-18', items: [{ content: 'Finish packing', completed: true }] },
  { date: '2024-08-19', items: [{ content: 'Pack for road trip', completed: true }, { content: 'Download offline maps', completed: true }, { content: 'Confirm Airbnb check-in time', completed: true }, { content: 'Playlist for the drive', completed: true }] },
  { date: '2024-08-20', items: [{ content: 'Drive to Mendocino', completed: true }, { content: 'Settle into Airbnb', completed: true }] },
  { date: '2024-08-21', items: [{ content: 'Explore Mendocino cliffs', completed: false }, { content: 'Find a good restaurant', completed: true }] },
  { date: '2024-08-22', items: [{ content: 'Find the name of that pinot noir Kasia loved', completed: false }, { content: 'Check out vineyard gift shop', completed: true }] },
  { date: '2024-08-23', items: [{ content: 'Drive south along coast', completed: true }, { content: 'Stop at that hidden beach again', completed: false }] },
  { date: '2024-08-24', items: [{ content: 'Explore seaside town', completed: true }, { content: 'Seafood dinner', completed: true }] },
  { date: '2024-08-25', items: [{ content: 'Drive to Big Sur', completed: false }, { content: 'Check in at hotel', completed: true }] },
  { date: '2024-08-26', items: [{ content: 'Hike the coastal trail', completed: true }, { content: 'Read on the balcony', completed: false }] },
  { date: '2024-08-27', items: [{ content: 'Sleep in', completed: true }] },
  { date: '2024-08-28', items: [{ content: 'Check out of Big Sur hotel by 11am', completed: true }] },
  { date: '2024-08-29', items: [{ content: 'Drive home', completed: false }, { content: 'Unpack', completed: true }] },
  { date: '2024-08-30', items: [{ content: 'Laundry — everything from the trip', completed: true }, { content: 'Groceries', completed: true }, { content: 'Reply to emails', completed: true }] },
  { date: '2024-08-31', items: [{ content: 'Meal prep', completed: false }, { content: 'Prep for work Monday', completed: true }] },

  // ── 2024 September ──
  { date: '2024-09-01', items: [{ content: 'Prep for first day back', completed: true }, { content: 'Iron clothes', completed: true }] },
  { date: '2024-09-02', items: [{ content: 'Labor Day — rest', completed: true }, { content: 'Plan the week', completed: true }, { content: 'Tidy desk', completed: true }] },
  { date: '2024-09-03', items: [{ content: 'Clear inbox from vacation', completed: true }, { content: 'Review Q3 goals', completed: true }, { content: 'Volunteer for mobile app project', completed: true }, { content: 'Evening run to shake off rust', completed: true }] },
  { date: '2024-09-04', items: [{ content: 'Mobile app kickoff meeting', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2024-09-05', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Research React Native vs native', completed: true }] },
  { date: '2024-09-06', items: [{ content: 'Sprint retro', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2024-09-07', items: [{ content: 'Farmers market', completed: true }] },
  { date: '2024-09-08', items: [{ content: 'Meal prep', completed: true }, { content: 'Laundry', completed: true }] },
  { date: '2024-09-09', items: [{ content: 'Sprint planning', completed: true }, { content: 'Set up mobile dev environment', completed: false }] },
  { date: '2024-09-10', items: [{ content: 'Set up FaceTime intro — Kasia meets parents', completed: true }] },
  { date: '2024-09-11', items: [{ content: 'Mobile prototype — first screen', completed: true }] },
  { date: '2024-09-12', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Code review', completed: true }, { content: 'Read before bed', completed: false }] },
  { date: '2024-09-13', items: [{ content: 'Sprint retro', completed: false }, { content: 'Groceries', completed: true }] },
  { date: '2024-09-14', items: [{ content: 'Clean apartment', completed: true }, { content: 'Call Nadia', completed: false }] },
  { date: '2024-09-15', items: [{ content: 'Read', completed: true }, { content: 'Cook something new', completed: true }, { content: 'Take out trash', completed: true }] },
  { date: '2024-09-16', items: [{ content: 'Sprint planning', completed: false }, { content: 'Mobile navigation setup', completed: true }] },
  { date: '2024-09-17', items: [{ content: 'Buy bolognese ingredients', completed: true }, { content: 'Gym — upper body', completed: true }] },
  { date: '2024-09-18', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Buy ingredients for bolognese', completed: true }, { content: 'Three-hour simmer — start by 4pm', completed: true }] },
  { date: '2024-09-19', items: [{ content: 'Mobile app — auth screens', completed: true }, { content: 'Evening run', completed: false }] },
  { date: '2024-09-20', items: [{ content: 'Sprint retro', completed: false }, { content: 'Pay rent', completed: true }] },
  { date: '2024-09-21', items: [{ content: 'Farmers market', completed: true }, { content: 'Cook with Kasia', completed: true }] },
  { date: '2024-09-22', items: [{ content: 'Meal prep', completed: true }, { content: 'Laundry', completed: true }] },
  { date: '2024-09-23', items: [{ content: 'Sprint planning', completed: true }] },
  { date: '2024-09-24', items: [{ content: 'Buy champagne for Omar celebration', completed: true }] },
  { date: '2024-09-25', items: [{ content: 'Celebrate Omar\'s YC acceptance at Ahmed\'s', completed: true }, { content: 'Buy champagne', completed: true }] },
  { date: '2024-09-26', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Code review for Marcus', completed: false }] },
  { date: '2024-09-27', items: [{ content: 'Sprint retro', completed: false }, { content: 'Groceries', completed: true }] },
  { date: '2024-09-28', items: [{ content: 'Clean apartment', completed: true }, { content: 'Read', completed: true }] },
  { date: '2024-09-29', items: [{ content: 'Plan October photo walks', completed: true }, { content: 'Meal prep', completed: false }] },
  { date: '2024-09-30', items: [{ content: 'Month-end timesheet', completed: true }, { content: 'Q3 goals review', completed: true }, { content: 'Gym', completed: true }] },

  // ── 2024 October ──
  { date: '2024-10-01', items: [{ content: 'Q4 sprint planning', completed: true }] },
  { date: '2024-10-02', items: [{ content: 'Buy film for photo walks', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2024-10-03', items: [{ content: 'Weekly photo walk #1', completed: true }, { content: 'Buy new roll of film', completed: true }, { content: 'Dust off camera gear', completed: true }] },
  { date: '2024-10-04', items: [{ content: 'Sprint retro', completed: true }, { content: 'Groceries', completed: true }, { content: 'Journal', completed: false }] },
  { date: '2024-10-05', items: [{ content: 'Farmers market', completed: true }] },
  { date: '2024-10-06', items: [{ content: 'Meal prep', completed: true }, { content: 'Laundry', completed: false }] },
  { date: '2024-10-07', items: [{ content: 'Sprint planning', completed: true }, { content: 'Mobile — offline sync', completed: true }, { content: 'Duolingo', completed: false }] },
  { date: '2024-10-08', items: [{ content: 'Fix search indexer production bug', completed: true }, { content: 'Write better monitoring for edge cases', completed: true }, { content: 'Postmortem doc', completed: true }] },
  { date: '2024-10-09', items: [{ content: 'Add monitoring dashboards', completed: true }, { content: 'Evening run', completed: true }, { content: 'Reply to emails', completed: false }] },
  { date: '2024-10-10', items: [{ content: 'Therapy at 10am', completed: false }, { content: 'Photo walk #2 — downtown', completed: true }] },
  { date: '2024-10-11', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2024-10-12', items: [{ content: 'Clean apartment', completed: true }, { content: 'Plan Kasia\'s birthday surprise', completed: true }] },
  { date: '2024-10-13', items: [{ content: 'Buy birthday supplies', completed: true }, { content: 'Write letter draft', completed: true }] },
  { date: '2024-10-14', items: [{ content: 'Pick up pinot noir from wine shop', completed: false }, { content: 'Finalize birthday letter', completed: true }] },
  { date: '2024-10-15', items: [{ content: 'Pick up pinot noir from wine shop', completed: true }, { content: 'Write birthday letter for Kasia', completed: true }, { content: 'Botanical garden picnic setup', completed: true }, { content: 'Surprise picnic supplies — blanket, candles', completed: true }] },
  { date: '2024-10-16', items: [{ content: 'Standup', completed: true }, { content: 'Groceries', completed: true }, { content: 'Read before bed', completed: false }] },
  { date: '2024-10-17', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Photo walk — neighborhood', completed: true }, { content: 'Duolingo', completed: true }] },
  { date: '2024-10-18', items: [{ content: 'Sprint retro', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2024-10-19', items: [{ content: 'Farmers market', completed: true }, { content: 'Cook with Kasia', completed: false }] },
  { date: '2024-10-20', items: [{ content: 'Laundry', completed: false }, { content: 'Meal prep', completed: true }] },
  { date: '2024-10-21', items: [{ content: 'Sprint planning', completed: true }, { content: 'Register for AI privacy talk', completed: true }, { content: 'Call Mom', completed: false }] },
  { date: '2024-10-22', items: [{ content: 'Attend AI & privacy tech talk', completed: true }, { content: 'Photo walk #3 — park at golden hour', completed: true }, { content: 'Propose data pipeline audit at team meeting', completed: true }] },
  { date: '2024-10-23', items: [{ content: 'Start data pipeline audit', completed: true }, { content: 'Evening run', completed: true }] },
  { date: '2024-10-24', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2024-10-25', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2024-10-26', items: [{ content: 'Photo walk #4 — industrial area', completed: true }, { content: 'Clean apartment', completed: true }, { content: 'Duolingo', completed: true }] },
  { date: '2024-10-27', items: [{ content: 'Meal prep', completed: true }] },
  { date: '2024-10-28', items: [{ content: 'Sprint planning', completed: true }, { content: 'Finish Bob Ross wig order', completed: true }, { content: 'Vacuum', completed: false }] },
  { date: '2024-10-29', items: [{ content: 'Data audit — write findings', completed: true }] },
  { date: '2024-10-30', items: [{ content: 'Assemble costumes', completed: true }, { content: 'Buy candy for trick-or-treaters', completed: true }, { content: 'Take vitamins', completed: true }] },
  { date: '2024-10-31', items: [{ content: 'Bob Ross costume — buy wig and palette', completed: true }, { content: 'Help Kasia with tree costume', completed: true }, { content: 'Jake and Leila\'s party at 8pm', completed: true }] },

  // ── 2024 November ──
  { date: '2024-11-01', items: [{ content: 'Recover from Halloween', completed: true }, { content: 'Groceries', completed: true }, { content: 'Call Mom', completed: false }] },
  { date: '2024-11-02', items: [{ content: 'Farmers market', completed: true }, { content: 'Clean apartment', completed: true }] },
  { date: '2024-11-03', items: [{ content: 'Meal prep', completed: true }, { content: 'Laundry', completed: true }, { content: 'Meditate', completed: false }] },
  { date: '2024-11-04', items: [{ content: 'Sprint planning', completed: true }, { content: 'Early night — voting tomorrow', completed: true }] },
  { date: '2024-11-05', items: [{ content: 'Vote — polling station opens at 7am', completed: true }, { content: 'Make soup', completed: true }] },
  { date: '2024-11-06', items: [{ content: 'Standup', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2024-11-07', items: [{ content: 'Therapy at 10am', completed: false }, { content: 'Mobile beta — fix crash on launch', completed: true }] },
  { date: '2024-11-08', items: [{ content: 'Sprint retro', completed: true }, { content: 'Date with Kasia', completed: true }] },
  { date: '2024-11-09', items: [{ content: 'Photo walk — autumn colors', completed: true }] },
  { date: '2024-11-10', items: [{ content: 'Meal prep', completed: true }, { content: 'Call Mom', completed: false }] },
  { date: '2024-11-11', items: [{ content: 'Veterans Day — office closed', completed: true }, { content: 'Long run', completed: true }] },
  { date: '2024-11-12', items: [{ content: 'Mobile beta testing round 2', completed: true }] },
  { date: '2024-11-13', items: [{ content: 'Clean guest room for Nadia\'s visit', completed: true }, { content: 'Buy fresh towels', completed: true }] },
  { date: '2024-11-14', items: [{ content: 'Clean guest room for Nadia', completed: true }, { content: 'Mobile app beta — internal launch', completed: true }, { content: 'Start reading The Remains of the Day', completed: true }] },
  { date: '2024-11-15', items: [{ content: 'Sprint retro', completed: false }, { content: 'Gym', completed: true }] },
  { date: '2024-11-16', items: [{ content: 'Farmers market', completed: false }, { content: 'Cook dinner for Kasia', completed: true }] },
  { date: '2024-11-17', items: [{ content: 'Laundry', completed: true }, { content: 'Read Remains of the Day', completed: true }] },
  { date: '2024-11-18', items: [{ content: 'Sprint planning', completed: true }, { content: 'Confirm Nadia\'s flight details', completed: true }] },
  { date: '2024-11-19', items: [{ content: 'Mobile — push notifications', completed: true }, { content: 'Evening run', completed: true }, { content: 'Floss', completed: false }] },
  { date: '2024-11-20', items: [{ content: 'Stock fridge for Nadia\'s visit', completed: true }, { content: 'Clean bathroom', completed: true }] },
  { date: '2024-11-21', items: [{ content: 'Pick up Nadia from airport at 3pm', completed: true }] },
  { date: '2024-11-22', items: [{ content: 'Show Nadia around the neighborhood', completed: true }] },
  { date: '2024-11-23', items: [{ content: 'Brunch with Nadia and Kasia', completed: true }, { content: 'Walk around the city', completed: false }] },
  { date: '2024-11-24', items: [{ content: 'Nadia leaves — drop at airport', completed: true }, { content: 'Rest', completed: true }, { content: 'In bed by 10:30', completed: true }] },
  { date: '2024-11-25', items: [{ content: 'Sprint planning', completed: true }, { content: 'Start Thanksgiving shopping list', completed: false }] },
  { date: '2024-11-26', items: [{ content: 'Grocery run — Thanksgiving supplies', completed: true }, { content: 'Therapy at 10am', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2024-11-27', items: [{ content: 'Turkey brine prep', completed: true }, { content: 'Set up dining table', completed: true }, { content: 'Clean apartment top to bottom', completed: true }] },
  { date: '2024-11-28', items: [{ content: 'Turkey — start brine tonight', completed: true }, { content: 'Sweet potatoes and cranberry sauce', completed: true }, { content: 'Set extra chairs from garage', completed: true }, { content: 'Pick up pumpkin pie from bakery', completed: false }] },
  { date: '2024-11-29', items: [{ content: 'Leftover turkey sandwiches', completed: false }, { content: 'Rest day', completed: true }] },
  { date: '2024-11-30', items: [{ content: 'Laundry', completed: true }, { content: 'Start Christmas shopping', completed: false }] },

  // ── 2024 December ──
  { date: '2024-12-01', items: [{ content: 'Meal prep', completed: true }, { content: 'Start Christmas shopping list', completed: true }, { content: 'Meditate', completed: false }] },
  { date: '2024-12-02', items: [{ content: 'Sprint planning', completed: true }, { content: 'Order gifts online', completed: true }, { content: 'Water herb garden', completed: false }] },
  { date: '2024-12-03', items: [{ content: 'Search for first edition poetry book', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2024-12-04', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2024-12-05', items: [{ content: 'Find first edition poetry book for Kasia', completed: true }, { content: 'Gym — back squat day', completed: true }, { content: 'Start Christmas shopping list', completed: true }] },
  { date: '2024-12-06', items: [{ content: 'Sprint retro', completed: true }, { content: 'Wrap gifts bought so far', completed: true }, { content: 'Stretch', completed: true }] },
  { date: '2024-12-07', items: [{ content: 'Farmers market', completed: true }, { content: 'Date night', completed: false }] },
  { date: '2024-12-08', items: [{ content: 'Laundry', completed: true }, { content: 'Call Nadia', completed: true }] },
  { date: '2024-12-09', items: [{ content: 'Sprint planning', completed: false }, { content: 'Q4 feature freeze prep', completed: true }] },
  { date: '2024-12-10', items: [{ content: 'Code freeze — final PRs', completed: true }] },
  { date: '2024-12-11', items: [{ content: 'Prep for holiday party — outfit', completed: true }, { content: 'Wrap Leo\'s gift exchange gift', completed: true }] },
  { date: '2024-12-12', items: [{ content: 'Company holiday party — bring Kasia', completed: true }, { content: 'Gift exchange — wrap Leo\'s gift', completed: true }] },
  { date: '2024-12-13', items: [{ content: 'Recovery day', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2024-12-14', items: [{ content: 'Farmers market', completed: true }, { content: 'Finish Christmas shopping', completed: true }, { content: 'Check on Miso', completed: true }] },
  { date: '2024-12-15', items: [{ content: 'Meal prep', completed: true }] },
  { date: '2024-12-16', items: [{ content: 'Sprint planning — light week', completed: true }, { content: 'Ship final bug fixes', completed: true }] },
  { date: '2024-12-17', items: [{ content: 'Year-end retro prep', completed: true }, { content: 'Gym', completed: true }, { content: 'Tidy desk', completed: true }] },
  { date: '2024-12-18', items: [{ content: 'Team year-end retro', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2024-12-19', items: [{ content: 'Last day of work — set OOO', completed: true }] },
  { date: '2024-12-20', items: [{ content: 'Pack for family visit', completed: true }, { content: 'Wrap Kasia\'s gift', completed: true }, { content: 'Auto-reply on email', completed: false }, { content: 'Year-end retro notes', completed: true }] },
  { date: '2024-12-21', items: [{ content: 'Travel day — fly home', completed: true }] },
  { date: '2024-12-22', items: [{ content: 'Settle in at parents', completed: true }] },
  { date: '2024-12-23', items: [{ content: 'Christmas Eve prep', completed: true }, { content: 'Pick up Kasia from airport', completed: false }] },
  { date: '2024-12-24', items: [{ content: 'Christmas Eve dinner prep', completed: true }, { content: 'Set up tree', completed: false }] },
  { date: '2024-12-25', items: [{ content: 'Help Mom with cardamom pancakes', completed: true }, { content: 'Afternoon walk with Dad', completed: false }] },
  { date: '2024-12-26', items: [{ content: 'Leftover day', completed: true }, { content: 'Board games with family', completed: true }] },
  { date: '2024-12-27', items: [{ content: 'Walk with Kasia', completed: true }, { content: 'Call Ahmed', completed: true }] },
  { date: '2024-12-28', items: [{ content: 'Pack to head home', completed: true }, { content: 'Fly back', completed: false }] },
  { date: '2024-12-29', items: [{ content: 'Unpack', completed: false }, { content: 'Laundry', completed: true }] },
  { date: '2024-12-30', items: [{ content: 'Groceries', completed: true }, { content: 'Reflect on the year', completed: false }] },
  { date: '2024-12-31', items: [{ content: 'Write year-end journal reflection', completed: true }, { content: 'Set 2025 intentions', completed: true }] },

  // ── 2025 January ──
  { date: '2025-01-01', items: [{ content: 'Rest — New Year\'s Day', completed: true }] },
  { date: '2025-01-02', items: [{ content: 'Groceries', completed: true }, { content: 'Plan the year', completed: false }] },
  { date: '2025-01-03', items: [{ content: 'Pick three words for 2025', completed: true }, { content: 'Finish reading list from December', completed: false }] },
  { date: '2025-01-04', items: [{ content: 'Meal prep', completed: true }] },
  { date: '2025-01-05', items: [{ content: 'Laundry', completed: true }] },
  { date: '2025-01-06', items: [{ content: 'First day back — clear inbox', completed: false }, { content: 'AI initiative kickoff meeting', completed: true }] },
  { date: '2025-01-07', items: [{ content: 'Research embedding models', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2025-01-08', items: [{ content: 'Research embedding models for AI initiative', completed: true }, { content: 'Review vector database options', completed: true }, { content: 'Set up Q1 sprint goals', completed: true }] },
  { date: '2025-01-09', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Vector DB comparison doc', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2025-01-10', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2025-01-11', items: [{ content: 'Farmers market', completed: true }, { content: 'Date night', completed: true }] },
  { date: '2025-01-12', items: [{ content: 'Meal prep', completed: true }, { content: 'Call Mom', completed: true }] },
  { date: '2025-01-13', items: [{ content: 'Sprint planning', completed: true }, { content: 'Start embedding prototype', completed: true }, { content: 'Journal', completed: false }] },
  { date: '2025-01-14', items: [{ content: 'Embedding pipeline — data ingestion', completed: true }, { content: 'Evening run', completed: true }] },
  { date: '2025-01-15', items: [{ content: 'Incident postmortem — write up gaps', completed: true }, { content: 'Improve alerting coverage', completed: true }, { content: 'Gym — heavy squats', completed: true }] },
  { date: '2025-01-16', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Fix alerting gaps', completed: true }] },
  { date: '2025-01-17', items: [{ content: 'Sprint retro', completed: true }, { content: 'Pay bills', completed: true }] },
  { date: '2025-01-18', items: [{ content: 'Cabin trip with Kasia — pack', completed: true }, { content: 'Buy firewood', completed: false }] },
  { date: '2025-01-19', items: [{ content: 'Cabin — no wifi', completed: false }, { content: 'Hike', completed: true }] },
  { date: '2025-01-20', items: [{ content: 'Drive home from cabin', completed: true }, { content: 'Unpack', completed: true }, { content: 'Call Mom', completed: false }] },
  { date: '2025-01-21', items: [{ content: 'Back to work', completed: true }] },
  { date: '2025-01-22', items: [{ content: 'Embedding prototype demo to team', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-01-23', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Iterate on prototype feedback', completed: true }, { content: 'In bed by 10:30', completed: true }] },
  { date: '2025-01-24', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2025-01-25', items: [{ content: 'Farmers market', completed: true }, { content: 'Cook with Kasia', completed: true }] },
  { date: '2025-01-26', items: [{ content: 'Laundry', completed: false }, { content: 'Meal prep', completed: true }] },
  { date: '2025-01-27', items: [{ content: 'Therapy check-in — 6 month review', completed: true }] },
  { date: '2025-01-28', items: [{ content: 'Sprint planning', completed: true }, { content: 'Embedding accuracy benchmarks', completed: true }] },
  { date: '2025-01-29', items: [{ content: 'Code review for Priya', completed: true }] },
  { date: '2025-01-30', items: [{ content: 'Finalize embedding architecture', completed: true }, { content: 'Groceries', completed: false }] },
  { date: '2025-01-31', items: [{ content: 'Month-end timesheet', completed: true }] },

  // ── 2025 February ──
  { date: '2025-02-01', items: [{ content: 'Farmers market', completed: true }, { content: 'Clean apartment', completed: true }, { content: 'Evening run', completed: false }] },
  { date: '2025-02-02', items: [{ content: 'Meal prep', completed: true }, { content: 'Read Rust Book intro', completed: false }] },
  { date: '2025-02-03', items: [{ content: 'Start Rust Book — chapter 1-3', completed: true }, { content: 'First AI prototype — semantic search', completed: true }, { content: 'Tone down Rust talk around Kasia', completed: false }] },
  { date: '2025-02-04', items: [{ content: 'Rust Book ch 4 — ownership', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-02-05', items: [{ content: 'Semantic search — improve recall', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2025-02-06', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Code review', completed: false }] },
  { date: '2025-02-07', items: [{ content: 'Sprint retro', completed: true }, { content: 'Evening run', completed: true }] },
  { date: '2025-02-08', items: [{ content: 'Farmers market', completed: true }, { content: 'Cook for Kasia', completed: true }] },
  { date: '2025-02-09', items: [{ content: 'Laundry', completed: false }, { content: 'Read', completed: true }] },
  { date: '2025-02-10', items: [{ content: 'Sprint planning', completed: true }, { content: 'AI search — edge case fixes', completed: true }] },
  { date: '2025-02-11', items: [{ content: 'Plan Valentine\'s Day', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-02-12', items: [{ content: 'Buy ingredients for Valentine\'s dinner', completed: true }, { content: 'Write letter for Kasia', completed: true }] },
  { date: '2025-02-13', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Finalize letter', completed: true }, { content: 'Journal', completed: true }] },
  { date: '2025-02-14', items: [{ content: 'Cook dinner together — lamb and salad', completed: true }, { content: 'Exchange letters (not gifts)', completed: true }, { content: 'One year at the company — reflect', completed: true }] },
  { date: '2025-02-15', items: [{ content: 'Rest day', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2025-02-16', items: [{ content: 'Meal prep', completed: false }, { content: 'Clean apartment', completed: true }] },
  { date: '2025-02-17', items: [{ content: 'Sprint planning', completed: true }, { content: 'AI search — closed beta prep', completed: true }, { content: 'Tidy desk', completed: true }] },
  { date: '2025-02-18', items: [{ content: 'Closed beta launch', completed: true }, { content: 'Evening run', completed: true }, { content: 'Journal', completed: true }] },
  { date: '2025-02-19', items: [{ content: 'Monitor beta metrics', completed: true }] },
  { date: '2025-02-20', items: [{ content: 'Video call to celebrate Omar\'s seed round', completed: true }, { content: 'Send congrats gift to Omar', completed: false }] },
  { date: '2025-02-21', items: [{ content: 'Sprint retro', completed: true }, { content: 'Pay rent', completed: true }, { content: 'Duolingo', completed: true }] },
  { date: '2025-02-22', items: [{ content: 'Farmers market', completed: true }, { content: 'Date with Kasia', completed: true }, { content: 'Reply to emails', completed: true }] },
  { date: '2025-02-23', items: [{ content: 'Laundry', completed: true }, { content: 'Meal prep', completed: true }] },
  { date: '2025-02-24', items: [{ content: 'Sprint planning', completed: true }, { content: 'Buy film for photo walk', completed: true }, { content: 'Evening run', completed: false }] },
  { date: '2025-02-25', items: [{ content: 'Beta feedback review', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2025-02-26', items: [{ content: 'Photo walk — industrial district', completed: true }, { content: 'Buy three rolls of film', completed: true }, { content: 'Research local gallery submissions', completed: true }] },
  { date: '2025-02-27', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Process film from walk', completed: false }] },
  { date: '2025-02-28', items: [{ content: 'Month-end timesheet', completed: true }, { content: 'Groceries', completed: true }] },

  // ── 2025 March ──
  { date: '2025-03-01', items: [{ content: 'Farmers market', completed: true }] },
  { date: '2025-03-02', items: [{ content: 'Meal prep', completed: true }, { content: 'Tune up bike for spring', completed: true }] },
  { date: '2025-03-03', items: [{ content: 'Sprint planning', completed: true }] },
  { date: '2025-03-04', items: [{ content: 'Bike to work — test ride', completed: true }] },
  { date: '2025-03-05', items: [{ content: 'Bike to work — first ride of the year', completed: true }, { content: 'Prep AI roadmap discussion points', completed: true }, { content: 'Research embedding pipeline vs third-party API', completed: true }] },
  { date: '2025-03-06', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Groceries', completed: true }, { content: 'Vacuum', completed: false }] },
  { date: '2025-03-07', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2025-03-08', items: [{ content: 'Farmers market', completed: true }] },
  { date: '2025-03-09', items: [{ content: 'Laundry', completed: true }, { content: 'Read', completed: true }] },
  { date: '2025-03-10', items: [{ content: 'Sprint planning', completed: false }, { content: 'Clean apartment — Mom visiting', completed: true }] },
  { date: '2025-03-11', items: [{ content: 'Buy baklava ingredients', completed: true }, { content: 'Fresh sheets for guest bed', completed: true }] },
  { date: '2025-03-12', items: [{ content: 'Clean apartment before Mom arrives', completed: true }, { content: 'Buy pistachio and honey for baklava', completed: true }, { content: 'Pick up Mom from airport', completed: true }] },
  { date: '2025-03-13', items: [{ content: 'Show Mom around the neighborhood', completed: true }, { content: 'Therapy at 10am', completed: false }] },
  { date: '2025-03-14', items: [{ content: 'Mom and Kasia — botanical gardens', completed: false }, { content: 'Sprint retro', completed: true }] },
  { date: '2025-03-15', items: [{ content: 'Brunch with Mom', completed: true }] },
  { date: '2025-03-16', items: [{ content: 'Rest', completed: true }, { content: 'Meal prep', completed: true }] },
  { date: '2025-03-17', items: [{ content: 'Sprint planning', completed: true }, { content: 'Start tech talk slides', completed: false }] },
  { date: '2025-03-18', items: [{ content: 'Practice tech talk — first run', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-03-19', items: [{ content: 'Practice tech talk — run through 3x', completed: true }, { content: 'Prepare slides for Privacy-First AI talk', completed: true }, { content: 'Celebrate with burger at the dive bar', completed: true }] },
  { date: '2025-03-20', items: [{ content: 'Follow up on tech talk feedback', completed: true }, { content: 'Groceries', completed: true }, { content: 'Water herb garden', completed: false }] },
  { date: '2025-03-21', items: [{ content: 'Sprint retro', completed: true }, { content: 'Evening run', completed: true }] },
  { date: '2025-03-22', items: [{ content: 'Farmers market', completed: true }, { content: 'Date night', completed: true }] },
  { date: '2025-03-23', items: [{ content: 'Laundry', completed: true }, { content: 'Research cat breeds', completed: true }] },
  { date: '2025-03-24', items: [{ content: 'Sprint planning', completed: true }] },
  { date: '2025-03-25', items: [{ content: 'Cat adoption application', completed: true }, { content: 'Gym', completed: true }, { content: 'Wipe down counters', completed: true }] },
  { date: '2025-03-26', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Buy cat supplies', completed: true }] },
  { date: '2025-03-27', items: [{ content: 'Cat-proof the apartment', completed: true }] },
  { date: '2025-03-28', items: [{ content: 'Cat carrier — pick up from pet store', completed: true }, { content: 'Vet appointment scheduled (4pm)', completed: true }, { content: 'Cat-proof the apartment: secure cables', completed: true }, { content: 'Buy litter box and food bowls', completed: true }] },
  { date: '2025-03-29', items: [{ content: 'Miso\'s first full day — supervise', completed: true }, { content: 'Buy more cat toys', completed: true }] },
  { date: '2025-03-30', items: [{ content: 'Meal prep', completed: true }, { content: 'Miso adjustment — keep him calm', completed: false }] },
  { date: '2025-03-31', items: [{ content: 'Month-end timesheet', completed: true }] },

  // ── 2025 April ──
  { date: '2025-04-01', items: [{ content: 'Sprint planning', completed: true }] },
  { date: '2025-04-02', items: [{ content: 'AI feature — tool calling impl', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-04-03', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2025-04-04', items: [{ content: 'Sprint retro', completed: true }, { content: 'Confirm Nadia\'s visit next week', completed: true }] },
  { date: '2025-04-05', items: [{ content: 'Clean apartment for Nadia', completed: true }, { content: 'Plan hike route', completed: true }] },
  { date: '2025-04-06', items: [{ content: 'Hike with Nadia and Kasia', completed: true }, { content: 'Bring camera and extra batteries', completed: true }, { content: 'Groceries for group dinner', completed: true }] },
  { date: '2025-04-07', items: [{ content: 'Drop Nadia at airport', completed: true }, { content: 'Laundry', completed: true }, { content: 'In bed by 10:30', completed: true }] },
  { date: '2025-04-08', items: [{ content: 'Sprint planning', completed: true }, { content: 'Process hike photos', completed: false }] },
  { date: '2025-04-09', items: [{ content: 'Code review', completed: true }, { content: 'Evening run', completed: false }] },
  { date: '2025-04-10', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Select photos for gallery submission', completed: true }] },
  { date: '2025-04-11', items: [{ content: 'Sprint retro', completed: true }, { content: 'Print photos — high res', completed: false }] },
  { date: '2025-04-12', items: [{ content: 'Farmers market', completed: true }, { content: 'Write artist statement draft', completed: true }] },
  { date: '2025-04-13', items: [{ content: 'Meal prep', completed: true }, { content: 'Finalize gallery submission', completed: true }] },
  { date: '2025-04-14', items: [{ content: 'Submit 3 photos to gallery — Urban Solitude theme', completed: true }, { content: 'Print photos at high resolution', completed: true }, { content: 'Write artist statement', completed: true }] },
  { date: '2025-04-15', items: [{ content: 'AI feature — response streaming', completed: true }] },
  { date: '2025-04-16', items: [{ content: 'Code review for Amir', completed: false }, { content: 'Groceries', completed: true }] },
  { date: '2025-04-17', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Evening run', completed: true }] },
  { date: '2025-04-18', items: [{ content: 'Sprint retro', completed: true }, { content: 'Pay rent', completed: true }] },
  { date: '2025-04-19', items: [{ content: 'Farmers market', completed: true }] },
  { date: '2025-04-20', items: [{ content: 'Laundry', completed: true }, { content: 'Read', completed: true }] },
  { date: '2025-04-21', items: [{ content: 'Sprint planning', completed: true }] },
  { date: '2025-04-22', items: [{ content: 'Community garden cleanup — bring gloves', completed: true }, { content: 'Ask Harold about tomato growing tips', completed: true }, { content: 'Buy herb garden supplies for balcony', completed: true }] },
  { date: '2025-04-23', items: [{ content: 'Set up balcony herb garden', completed: true }] },
  { date: '2025-04-24', items: [{ content: 'Therapy at 10am', completed: true }] },
  { date: '2025-04-25', items: [{ content: 'Sprint retro', completed: true }, { content: 'Groceries', completed: true }, { content: 'Reply to emails', completed: true }] },
  { date: '2025-04-26', items: [{ content: 'Photo walk — spring flowers', completed: true }] },
  { date: '2025-04-27', items: [{ content: 'Meal prep', completed: true }, { content: 'Call Mom', completed: true }] },
  { date: '2025-04-28', items: [{ content: 'Sprint planning', completed: true }] },
  { date: '2025-04-29', items: [{ content: 'Monitor beta feedback', completed: true }, { content: 'Evening run', completed: true }] },
  { date: '2025-04-30', items: [{ content: 'Month-end timesheet', completed: true }] },

  // ── 2025 May ──
  { date: '2025-05-01', items: [{ content: 'Therapy at 10am', completed: true }] },
  { date: '2025-05-02', items: [{ content: 'Call Dad about the gallery acceptance', completed: true }, { content: 'Plan what to wear for opening night', completed: true }, { content: 'Buy a new camera lens to celebrate', completed: false }] },
  { date: '2025-05-03', items: [{ content: 'Farmers market', completed: false }, { content: 'Clean apartment', completed: true }] },
  { date: '2025-05-04', items: [{ content: 'Meal prep', completed: true }] },
  { date: '2025-05-05', items: [{ content: 'Sprint planning', completed: true }, { content: 'Order new camera lens online', completed: false }] },
  { date: '2025-05-06', items: [{ content: 'AI feature — citation system', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2025-05-07', items: [{ content: 'Code review', completed: false }, { content: 'Groceries', completed: true }] },
  { date: '2025-05-08', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Gallery opening prep — confirm RSVPs', completed: true }, { content: 'Evening run', completed: false }] },
  { date: '2025-05-09', items: [{ content: 'Iron outfit for tomorrow', completed: true }, { content: 'Sprint retro', completed: true }] },
  { date: '2025-05-10', items: [{ content: 'Iron outfit for gallery opening', completed: true }, { content: 'Confirm guest list RSVPs', completed: true }, { content: 'Arrive early for setup', completed: true }] },
  { date: '2025-05-11', items: [{ content: 'Rest — recover from opening night', completed: false }, { content: 'Call Mom', completed: true }] },
  { date: '2025-05-12', items: [{ content: 'Sprint planning', completed: true }] },
  { date: '2025-05-13', items: [{ content: 'AI feature — quality improvements', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-05-14', items: [{ content: 'Code review for Priya', completed: true }, { content: 'Groceries', completed: true }, { content: 'Floss', completed: false }] },
  { date: '2025-05-15', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Water herb garden', completed: true }] },
  { date: '2025-05-16', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2025-05-17', items: [{ content: 'Farmers market', completed: true }, { content: 'Date night', completed: true }, { content: 'Check on Miso', completed: true }] },
  { date: '2025-05-18', items: [{ content: 'Read in the park with Miso', completed: false }, { content: 'Finish The Remains of the Day', completed: true }] },
  { date: '2025-05-19', items: [{ content: 'Sprint planning', completed: false }, { content: 'Meal prep', completed: true }] },
  { date: '2025-05-20', items: [{ content: 'AI feature — tool call display', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2025-05-21', items: [{ content: 'Evening run', completed: true }, { content: 'Groceries', completed: false }] },
  { date: '2025-05-22', items: [{ content: 'Therapy at 10am', completed: true }] },
  { date: '2025-05-23', items: [{ content: 'Sprint retro', completed: false }, { content: 'Pay rent', completed: true }] },
  { date: '2025-05-24', items: [{ content: 'Prep for barbecue — buy sides ingredients', completed: true }] },
  { date: '2025-05-25', items: [{ content: 'Laundry', completed: false }, { content: 'Cook sides for Memorial Day BBQ', completed: true }] },
  { date: '2025-05-26', items: [{ content: 'Barbecue at Ahmed\'s — bring sides', completed: true }, { content: 'Memorial Day morning remembrance', completed: true }] },
  { date: '2025-05-27', items: [{ content: 'Recovery day', completed: true }, { content: 'Water herbs', completed: true }] },
  { date: '2025-05-28', items: [{ content: 'Sprint planning', completed: true }, { content: 'AI feature — public launch prep', completed: true }, { content: 'Tidy desk', completed: true }] },
  { date: '2025-05-29', items: [{ content: 'Performance review self-assessment', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-05-30', items: [{ content: 'Sprint retro', completed: true }, { content: 'Groceries', completed: false }] },
  { date: '2025-05-31', items: [{ content: 'Month-end timesheet', completed: true }] },

  // ── 2025 June ──
  { date: '2025-06-01', items: [{ content: 'Meal prep', completed: false }, { content: 'Read', completed: true }] },
  { date: '2025-06-02', items: [{ content: 'Annual review prep — final notes', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2025-06-03', items: [{ content: 'Annual review prep — gather accomplishments', completed: true }, { content: 'Celebrate promotion with Kasia', completed: false }] },
  { date: '2025-06-04', items: [{ content: 'New role onboarding — senior expectations', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2025-06-05', items: [{ content: 'Therapy at 10am', completed: true }] },
  { date: '2025-06-06', items: [{ content: 'Sprint retro', completed: true }, { content: 'Laundry', completed: true }] },
  { date: '2025-06-07', items: [{ content: 'Farmers market', completed: true }] },
  { date: '2025-06-08', items: [{ content: 'Call Nadia', completed: true }, { content: 'Meal prep', completed: false }] },
  { date: '2025-06-09', items: [{ content: 'Sprint planning', completed: true }, { content: 'Duolingo — Japanese lesson 1', completed: true }] },
  { date: '2025-06-10', items: [{ content: 'Research Japan itineraries', completed: true }] },
  { date: '2025-06-11', items: [{ content: 'Book Japan flights', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2025-06-12', items: [{ content: 'Research Japan trips for October', completed: true }, { content: 'Download Duolingo — start Japanese', completed: true }, { content: 'Bike home via the overlook point', completed: true }] },
  { date: '2025-06-13', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2025-06-14', items: [{ content: 'Farmers market', completed: true }, { content: 'Photo walk', completed: false }] },
  { date: '2025-06-15', items: [{ content: 'Laundry', completed: true }, { content: 'Read', completed: true }] },
  { date: '2025-06-16', items: [{ content: 'Sprint planning', completed: false }, { content: 'Duolingo streak day 7', completed: true }] },
  { date: '2025-06-17', items: [{ content: 'Code review', completed: true }, { content: 'Evening run', completed: false }] },
  { date: '2025-06-18', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Gym', completed: true }, { content: 'Reply to emails', completed: true }] },
  { date: '2025-06-19', items: [{ content: 'AI public launch — final testing', completed: false }, { content: 'Groceries', completed: true }] },
  { date: '2025-06-20', items: [{ content: 'Beach day prep — buy sunscreen', completed: true }, { content: 'Sprint retro', completed: true }, { content: 'Reply to emails', completed: true }] },
  { date: '2025-06-21', items: [{ content: 'Beach day — sunscreen, towels, volleyball', completed: true }, { content: 'Buy watermelon', completed: true }, { content: 'Coordinate rides with Ahmed and Omar', completed: true }] },
  { date: '2025-06-22', items: [{ content: 'Rest — sunburnt', completed: true }, { content: 'Meal prep', completed: true }, { content: 'Duolingo', completed: false }] },
  { date: '2025-06-23', items: [{ content: 'Sprint planning', completed: true }] },
  { date: '2025-06-24', items: [{ content: 'AI launch marketing review', completed: true }, { content: 'Gym', completed: true }, { content: 'Wipe down counters', completed: true }] },
  { date: '2025-06-25', items: [{ content: 'Code review', completed: true }, { content: 'Groceries', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2025-06-26', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Evening run', completed: true }, { content: 'Evening run', completed: false }] },
  { date: '2025-06-27', items: [{ content: 'Sprint retro', completed: false }, { content: 'Pay rent', completed: true }] },
  { date: '2025-06-28', items: [{ content: 'Farmers market', completed: true }, { content: 'Prune the mint', completed: true }, { content: 'Reply to emails', completed: true }] },
  { date: '2025-06-29', items: [{ content: 'Water the herb garden', completed: true }, { content: 'Troubleshoot cilantro situation', completed: false }, { content: 'Contain the mint invasion', completed: true }] },
  { date: '2025-06-30', items: [{ content: 'Month-end timesheet', completed: false }, { content: 'Laundry', completed: true }] },

  // ── 2025 July ──
  { date: '2025-07-01', items: [{ content: 'Sprint planning', completed: true }, { content: 'Water herbs', completed: true }, { content: 'Journal', completed: true }] },
  { date: '2025-07-02', items: [{ content: 'AI feature — fix streaming bug', completed: true }] },
  { date: '2025-07-03', items: [{ content: 'Groceries', completed: true }, { content: 'Prep for long weekend', completed: true }] },
  { date: '2025-07-04', items: [{ content: 'Fourth of July — relax', completed: true }] },
  { date: '2025-07-05', items: [{ content: 'Farmers market', completed: true }, { content: 'Laundry', completed: true }] },
  { date: '2025-07-06', items: [{ content: 'Meal prep', completed: true }, { content: 'Read', completed: true }] },
  { date: '2025-07-07', items: [{ content: 'Sprint planning', completed: true }, { content: 'Evening run', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-07-08', items: [{ content: 'Therapy at 10am — discuss peace vs striving', completed: true }, { content: 'Journal about the Big Sur moment', completed: false }] },
  { date: '2025-07-09', items: [{ content: 'Code review', completed: true }, { content: 'Gym', completed: true }, { content: 'Evening run', completed: true }] },
  { date: '2025-07-10', items: [{ content: 'AI feature — accuracy tuning', completed: true }, { content: 'Groceries', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-07-11', items: [{ content: 'Sprint retro', completed: false }, { content: 'Date night', completed: true }] },
  { date: '2025-07-12', items: [{ content: 'Farmers market', completed: false }, { content: 'Photo walk', completed: true }] },
  { date: '2025-07-13', items: [{ content: 'Laundry', completed: true }, { content: 'Call Mom', completed: false }] },
  { date: '2025-07-14', items: [{ content: 'Sprint planning', completed: true }, { content: 'Secure flour from Miso', completed: false }] },
  { date: '2025-07-15', items: [{ content: 'Clean up Miso\'s flour disaster', completed: true }, { content: 'Buy new flour bag (sealed container this time)', completed: true }, { content: 'Review semantic search accuracy metrics', completed: true }] },
  { date: '2025-07-16', items: [{ content: 'AI accuracy — fine-tuning', completed: true }] },
  { date: '2025-07-17', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-07-18', items: [{ content: 'Sprint retro', completed: true }, { content: 'Groceries', completed: false }] },
  { date: '2025-07-19', items: [{ content: 'Farmers market', completed: true }, { content: 'Plan dinner party menu', completed: false }] },
  { date: '2025-07-20', items: [{ content: 'Meal prep', completed: true }, { content: 'Clean apartment', completed: true }] },
  { date: '2025-07-21', items: [{ content: 'Sprint planning', completed: true }] },
  { date: '2025-07-22', items: [{ content: 'Code review', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-07-23', items: [{ content: 'Prep biryani marinade tonight', completed: true }, { content: 'Set table for 8', completed: true }, { content: 'Take vitamins', completed: true }] },
  { date: '2025-07-24', items: [{ content: 'Dinner party — cook Grandma\'s lamb biryani', completed: true }, { content: 'Buy ingredients: lamb, basmati, saffron, spices', completed: true }, { content: 'Set table for 8', completed: true }, { content: 'Ask Marcus to bring Oregon wine', completed: true }] },
  { date: '2025-07-25', items: [{ content: 'Clean up from dinner party', completed: false }, { content: 'Sprint retro', completed: true }] },
  { date: '2025-07-26', items: [{ content: 'Rest day', completed: true }, { content: 'Farmers market', completed: true }] },
  { date: '2025-07-27', items: [{ content: 'Laundry', completed: true }, { content: 'Read', completed: false }] },
  { date: '2025-07-28', items: [{ content: 'Sprint planning', completed: true }, { content: 'AI launch final prep', completed: true }, { content: 'Water herb garden', completed: true }] },
  { date: '2025-07-29', items: [{ content: 'QA testing — full regression', completed: true }, { content: 'Evening run', completed: false }] },
  { date: '2025-07-30', items: [{ content: 'Fix launch blockers', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2025-07-31', items: [{ content: 'Month-end timesheet', completed: false }, { content: 'Water herbs', completed: true }] },

  // ── 2025 August ──
  { date: '2025-08-01', items: [{ content: 'Launch week prep — final checks', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-08-02', items: [{ content: 'Farmers market', completed: true }, { content: 'Rest before launch week', completed: true }] },
  { date: '2025-08-03', items: [{ content: 'Meal prep', completed: true }, { content: 'Early night', completed: false }] },
  { date: '2025-08-04', items: [{ content: 'AI features public launch — final checks', completed: true }, { content: 'Monitor error rates post-launch', completed: true }, { content: 'Team celebration', completed: true }] },
  { date: '2025-08-05', items: [{ content: 'Monitor launch metrics', completed: true }, { content: 'Fix urgent bug', completed: true }] },
  { date: '2025-08-06', items: [{ content: 'Post-launch hotfix', completed: true }, { content: 'Groceries', completed: true }, { content: 'Water herb garden', completed: false }] },
  { date: '2025-08-07', items: [{ content: 'Therapy at 10am', completed: true }] },
  { date: '2025-08-08', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2025-08-09', items: [{ content: 'Farmers market', completed: true }, { content: 'Pack for time off', completed: false }] },
  { date: '2025-08-10', items: [{ content: 'Set OOO', completed: true }, { content: 'Laundry', completed: true }] },
  { date: '2025-08-11', items: [{ content: 'First day off — sleep in', completed: true }] },
  { date: '2025-08-12', items: [{ content: 'No Slack day 1', completed: true }, { content: 'Cook something elaborate', completed: true }, { content: 'Duolingo', completed: false }] },
  { date: '2025-08-13', items: [{ content: 'No Slack day 2', completed: true }] },
  { date: '2025-08-14', items: [{ content: 'No Slack for 3 days', completed: true }, { content: 'Read two books', completed: true }, { content: 'Take Miso for a walk in the carrier', completed: true }] },
  { date: '2025-08-15', items: [{ content: 'Finish second book', completed: true }, { content: 'Farmers market', completed: true }] },
  { date: '2025-08-16', items: [{ content: 'Photo walk', completed: true }] },
  { date: '2025-08-17', items: [{ content: 'Meal prep', completed: true }] },
  { date: '2025-08-18', items: [{ content: 'Back to work — clear inbox', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2025-08-19', items: [{ content: 'Sprint planning', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2025-08-20', items: [{ content: 'Code review', completed: true }] },
  { date: '2025-08-21', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Water herbs', completed: true }] },
  { date: '2025-08-22', items: [{ content: 'Sprint retro', completed: true }, { content: 'Prep for Kasia\'s parents visit', completed: true }] },
  { date: '2025-08-23', items: [{ content: 'Deep clean apartment', completed: true }] },
  { date: '2025-08-24', items: [{ content: 'Ethiopian restaurant reservation', completed: true }, { content: 'Grocery run — big one', completed: true }] },
  { date: '2025-08-25', items: [{ content: 'Clean apartment for Kasia\'s parents visit', completed: true }, { content: 'Ethiopian restaurant reservation', completed: true }, { content: 'Buy guest towels', completed: true }] },
  { date: '2025-08-26', items: [{ content: 'Show parents around the city', completed: true }, { content: 'Dinner at home', completed: true }] },
  { date: '2025-08-27', items: [{ content: 'Parents leave — airport drop', completed: true }, { content: 'Rest', completed: true }, { content: 'Duolingo', completed: true }] },
  { date: '2025-08-28', items: [{ content: 'Sprint planning', completed: true }] },
  { date: '2025-08-29', items: [{ content: 'Code review', completed: true }] },
  { date: '2025-08-30', items: [{ content: 'Farmers market', completed: true }] },
  { date: '2025-08-31', items: [{ content: 'Meal prep', completed: true }, { content: 'Plan September photo project', completed: true }] },

  // ── 2025 September ──
  { date: '2025-09-01', items: [{ content: 'Labor Day — rest', completed: true }, { content: 'Buy new notebook', completed: true }] },
  { date: '2025-09-02', items: [{ content: 'Start "A Year in Light" photo project', completed: true }, { content: 'Shoot week 1 — maple tree on Elm Street', completed: true }, { content: 'Buy new notebook for September', completed: true }] },
  { date: '2025-09-03', items: [{ content: 'Sprint planning', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-09-04', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2025-09-05', items: [{ content: 'Sprint retro', completed: true }, { content: 'Evening run', completed: true }, { content: 'Meditate', completed: false }] },
  { date: '2025-09-06', items: [{ content: 'Farmers market', completed: true }, { content: 'Photo walk — week 2', completed: true }] },
  { date: '2025-09-07', items: [{ content: 'Meal prep', completed: true }, { content: 'Laundry', completed: true }] },
  { date: '2025-09-08', items: [{ content: 'Sprint planning', completed: true }, { content: 'Mentor Amir — code review session', completed: true }] },
  { date: '2025-09-09', items: [{ content: 'Code review', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2025-09-10', items: [{ content: 'Prepare for tomorrow', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2025-09-11', items: [{ content: 'Call Uncle Ray', completed: true }, { content: 'Pair with Amir on his first task', completed: true }] },
  { date: '2025-09-12', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2025-09-13', items: [{ content: 'Photo walk — week 3', completed: true }, { content: 'Date night', completed: true }] },
  { date: '2025-09-14', items: [{ content: 'Laundry', completed: true }, { content: 'Read', completed: true }] },
  { date: '2025-09-15', items: [{ content: 'Sprint planning', completed: true }, { content: 'Duolingo Japanese', completed: true }, { content: 'Meditate', completed: false }] },
  { date: '2025-09-16', items: [{ content: 'Code review for Amir', completed: false }, { content: 'Evening run', completed: true }] },
  { date: '2025-09-17', items: [{ content: 'Therapy at 10am', completed: true }] },
  { date: '2025-09-18', items: [{ content: 'Groceries', completed: true }] },
  { date: '2025-09-19', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2025-09-20', items: [{ content: 'Jazz festival — confirm tickets', completed: true }, { content: 'Pack picnic blanket and wine', completed: true }] },
  { date: '2025-09-21', items: [{ content: 'Rest day', completed: true }, { content: 'Meal prep', completed: true }, { content: 'Reply to emails', completed: true }] },
  { date: '2025-09-22', items: [{ content: 'Sprint planning', completed: true }, { content: 'Photo walk — week 4', completed: true }] },
  { date: '2025-09-23', items: [{ content: 'Japan trip — book hotels', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2025-09-24', items: [{ content: 'Japan trip — plan itinerary', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2025-09-25', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Evening run', completed: true }] },
  { date: '2025-09-26', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2025-09-27', items: [{ content: 'Farmers market', completed: true }, { content: 'Cook with Kasia', completed: true }] },
  { date: '2025-09-28', items: [{ content: 'Laundry', completed: true }, { content: 'Start packing list for Japan', completed: true }, { content: 'Duolingo', completed: true }] },
  { date: '2025-09-29', items: [{ content: 'Sprint planning — hand off before trip', completed: true }, { content: 'Duolingo — review', completed: true }, { content: 'Take out trash', completed: true }] },
  { date: '2025-09-30', items: [{ content: 'Month-end timesheet', completed: true }, { content: 'Water herbs', completed: true }] },

  // ── 2025 October ──
  { date: '2025-10-01', items: [{ content: 'Japan trip countdown — 4 days', completed: true }] },
  { date: '2025-10-02', items: [{ content: 'Hand off work to Priya', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-10-03', items: [{ content: 'Last day before trip — tie up loose ends', completed: false }, { content: 'Set OOO', completed: true }] },
  { date: '2025-10-04', items: [{ content: 'Pack bags', completed: false }, { content: 'Arrange cat sitter for Miso', completed: true }] },
  { date: '2025-10-05', items: [{ content: 'Passports — double check', completed: true }, { content: 'Yen — exchange at airport', completed: true }, { content: 'Download Japan Rail app', completed: true }, { content: 'Pocket wifi pickup confirmation', completed: true }] },
  { date: '2025-10-06', items: [{ content: 'Arrive Tokyo — check into hotel', completed: true }, { content: 'Explore Shinjuku', completed: true }] },
  { date: '2025-10-07', items: [{ content: 'Tokyo — Meiji Shrine', completed: true }, { content: 'Shibuya crossing', completed: true }, { content: 'Ramen for dinner', completed: true }] },
  { date: '2025-10-08', items: [{ content: 'Fushimi Inari — arrive at sunrise', completed: true }, { content: 'Bring film camera to bamboo grove', completed: true }] },
  { date: '2025-10-09', items: [{ content: 'Kyoto — Kinkaku-ji', completed: true }] },
  { date: '2025-10-10', items: [{ content: 'Day trip to Nara', completed: true }, { content: 'Feed the deer', completed: true }] },
  { date: '2025-10-11', items: [{ content: 'Travel to onsen town', completed: true }, { content: 'Scenic train ride', completed: true }, { content: 'Duolingo', completed: true }] },
  { date: '2025-10-12', items: [{ content: 'Check in at ryokan by 3pm', completed: false }, { content: 'Book onsen time slot', completed: true }] },
  { date: '2025-10-13', items: [{ content: 'Morning onsen', completed: true }, { content: 'Hike in the valley', completed: true }] },
  { date: '2025-10-14', items: [{ content: 'Travel to Osaka', completed: false }, { content: 'Dotonbori street food', completed: true }] },
  { date: '2025-10-15', items: [{ content: 'Osaka Castle', completed: true }] },
  { date: '2025-10-16', items: [{ content: 'Last day shopping — gifts for everyone', completed: true }, { content: 'Matcha kit for Mom', completed: true }, { content: 'Woodworking tool for Marcus', completed: true }, { content: 'Hand-dyed fabric for Nadia', completed: true }, { content: 'Pack souvenirs carefully', completed: true }] },
  { date: '2025-10-17', items: [{ content: 'Fly home', completed: true }] },
  { date: '2025-10-18', items: [{ content: 'Recover from jet lag', completed: true }, { content: 'Unpack', completed: true }] },
  { date: '2025-10-19', items: [{ content: 'Laundry — everything', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2025-10-20', items: [{ content: 'Back to work', completed: true }] },
  { date: '2025-10-21', items: [{ content: 'Sprint planning', completed: false }, { content: 'Gym', completed: true }] },
  { date: '2025-10-22', items: [{ content: 'Code review catch-up', completed: true }, { content: 'Groceries', completed: false }] },
  { date: '2025-10-23', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Process Japan photos', completed: false }] },
  { date: '2025-10-24', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2025-10-25', items: [{ content: 'Farmers market', completed: false }, { content: 'Deliver gifts to friends', completed: true }] },
  { date: '2025-10-26', items: [{ content: 'Meal prep', completed: true }, { content: 'Call Mom', completed: true }] },
  { date: '2025-10-27', items: [{ content: 'Sprint planning', completed: false }, { content: 'Photo walk — week 8', completed: true }] },
  { date: '2025-10-28', items: [{ content: 'Code review', completed: true }] },
  { date: '2025-10-29', items: [{ content: 'Team sync', completed: true }, { content: 'Groceries', completed: false }] },
  { date: '2025-10-30', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Pay bills', completed: false }] },
  { date: '2025-10-31', items: [{ content: 'Halloween — low key this year', completed: true }, { content: 'Hand out candy', completed: false }] },

  // ── 2025 November ──
  { date: '2025-11-01', items: [{ content: 'Farmers market', completed: true }, { content: 'Clean apartment', completed: true }, { content: 'Reply to emails', completed: false }] },
  { date: '2025-11-02', items: [{ content: 'Declutter closet', completed: false }, { content: 'Bag donations', completed: true }] },
  { date: '2025-11-03', items: [{ content: 'Donate 3 bags of clothes', completed: true }, { content: 'Simplify morning routine', completed: true }, { content: 'Deep clean apartment post-trip', completed: true }] },
  { date: '2025-11-04', items: [{ content: 'Sprint planning', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2025-11-05', items: [{ content: 'Code review', completed: true }, { content: 'Groceries', completed: true }, { content: 'Meditate', completed: false }] },
  { date: '2025-11-06', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Evening run', completed: true }, { content: 'Check on Miso', completed: true }] },
  { date: '2025-11-07', items: [{ content: 'Sprint retro', completed: true }, { content: 'Date night', completed: true }] },
  { date: '2025-11-08', items: [{ content: 'Farmers market', completed: true }] },
  { date: '2025-11-09', items: [{ content: 'Meal prep', completed: true }, { content: 'Laundry', completed: true }, { content: 'Water herb garden', completed: true }] },
  { date: '2025-11-10', items: [{ content: 'Sprint planning', completed: true }, { content: 'Think about Tech Lead offer', completed: false }] },
  { date: '2025-11-11', items: [{ content: 'Veterans Day', completed: true }] },
  { date: '2025-11-12', items: [{ content: 'Talk to Kasia about Tech Lead offer', completed: true }, { content: 'Talk to Marcus about leadership transition', completed: true }, { content: 'Therapy — discuss the decision', completed: true }, { content: 'Accept the Tech Lead role', completed: true }] },
  { date: '2025-11-13', items: [{ content: 'First day as Tech Lead (mentally)', completed: false }, { content: 'Groceries', completed: true }] },
  { date: '2025-11-14', items: [{ content: 'Sprint retro', completed: true }] },
  { date: '2025-11-15', items: [{ content: 'Farmers market', completed: true }, { content: 'Cook with Kasia', completed: true }] },
  { date: '2025-11-16', items: [{ content: 'Laundry', completed: true }, { content: 'Plan Friendsgiving menu', completed: true }, { content: 'Read before bed', completed: false }] },
  { date: '2025-11-17', items: [{ content: 'Sprint planning', completed: true }, { content: 'Friendsgiving guest list', completed: false }] },
  { date: '2025-11-18', items: [{ content: 'Buy pumpkins for pie', completed: true }, { content: 'Groceries — big shop', completed: false }] },
  { date: '2025-11-19', items: [{ content: 'Friendsgiving prep — start pie crust', completed: true }, { content: 'Clean apartment', completed: true }] },
  { date: '2025-11-20', items: [{ content: 'Friendsgiving menu planning with Kasia', completed: true }, { content: 'Buy pumpkins for pie (real ones)', completed: true }, { content: 'Set table for 12', completed: true }, { content: 'Ahmed\'s toast — remind him it\'s his turn', completed: true }] },
  { date: '2025-11-21', items: [{ content: 'Clean up from Friendsgiving', completed: true }] },
  { date: '2025-11-22', items: [{ content: 'Farmers market', completed: true }, { content: 'Rest', completed: false }] },
  { date: '2025-11-23', items: [{ content: 'Meal prep', completed: true }, { content: 'Book flights for Thanksgiving', completed: false }] },
  { date: '2025-11-24', items: [{ content: 'Sprint planning — light week', completed: false }, { content: 'Pack for trip home', completed: true }] },
  { date: '2025-11-25', items: [{ content: 'Last day before Thanksgiving break', completed: false }, { content: 'Set OOO', completed: true }] },
  { date: '2025-11-26', items: [{ content: 'Travel day — fly home with Kasia', completed: true }] },
  { date: '2025-11-27', items: [{ content: 'Help Mom with Thanksgiving prep', completed: true }, { content: 'Groceries for Mom', completed: true }, { content: 'Duolingo', completed: false }] },
  { date: '2025-11-28', items: [{ content: 'Book flights home with Kasia', completed: true }, { content: 'FaceTime Nadia into dinner', completed: true }, { content: 'Help Mom with dishes', completed: true }] },
  { date: '2025-11-29', items: [{ content: 'Leftovers', completed: true }, { content: 'Walk with Dad', completed: false }] },
  { date: '2025-11-30', items: [{ content: 'Fly home', completed: true }, { content: 'Unpack', completed: true }] },

  // ── 2025 December ──
  { date: '2025-12-01', items: [{ content: 'First day as Tech Lead — officially', completed: true }, { content: 'Read The Manager\'s Path ch 1', completed: true }] },
  { date: '2025-12-02', items: [{ content: 'Meet with each team member 1:1', completed: true }] },
  { date: '2025-12-03', items: [{ content: 'Team norms doc draft', completed: true }, { content: 'Groceries', completed: false }] },
  { date: '2025-12-04', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Evening run', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2025-12-05', items: [{ content: 'Sprint retro', completed: true }, { content: 'Date night', completed: true }] },
  { date: '2025-12-06', items: [{ content: 'First 1:1s with the team', completed: true }, { content: 'Read The Manager\'s Path (from Marcus)', completed: true }, { content: 'Prepare feedback for code quality conversation', completed: true }] },
  { date: '2025-12-07', items: [{ content: 'Meal prep', completed: true }, { content: 'Start apartment hunting for move-in', completed: true }, { content: 'Wipe down counters', completed: true }] },
  { date: '2025-12-08', items: [{ content: 'Sprint planning', completed: false }, { content: 'Apartment viewings', completed: true }] },
  { date: '2025-12-09', items: [{ content: 'Found the apartment!', completed: true }, { content: 'Start lease paperwork', completed: true }, { content: 'Meditate', completed: false }] },
  { date: '2025-12-10', items: [{ content: 'Sign new lease', completed: true }, { content: 'Gym', completed: true }, { content: 'Call Mom', completed: true }] },
  { date: '2025-12-11', items: [{ content: 'Therapy at 10am', completed: false }, { content: 'Plan moving logistics', completed: true }] },
  { date: '2025-12-12', items: [{ content: 'Sprint retro', completed: true }, { content: 'Book moving truck', completed: false }] },
  { date: '2025-12-13', items: [{ content: 'Start packing — non-essentials first', completed: true }, { content: 'Buy moving boxes', completed: true }, { content: 'Water herb garden', completed: false }] },
  { date: '2025-12-14', items: [{ content: 'Moving truck — confirm 9am pickup', completed: true }, { content: 'Transfer utilities to new address', completed: true }, { content: 'Change address with post office', completed: false }, { content: 'Pack kitchen last', completed: true }, { content: 'Order pizza for first night', completed: true }] },
  { date: '2025-12-15', items: [{ content: 'Unpack essentials', completed: false }, { content: 'Set up bed', completed: true }] },
  { date: '2025-12-16', items: [{ content: 'Work from new apartment', completed: true }] },
  { date: '2025-12-17', items: [{ content: 'Unpack office/studio', completed: true }, { content: 'Groceries — stock new kitchen', completed: true }, { content: 'Water herb garden', completed: true }] },
  { date: '2025-12-18', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Set up herb garden on new balcony', completed: true }] },
  { date: '2025-12-19', items: [{ content: 'Sprint retro — last of the year', completed: true }, { content: 'Set OOO for holidays', completed: true }, { content: 'Duolingo', completed: false }] },
  { date: '2025-12-20', items: [{ content: 'Finish unpacking', completed: false }, { content: 'Laundry', completed: true }] },
  { date: '2025-12-21', items: [{ content: 'Buy Christmas tree', completed: true }, { content: 'Decorate apartment', completed: true }, { content: 'Check on Miso', completed: true }] },
  { date: '2025-12-22', items: [{ content: 'Christmas shopping — last minute', completed: true }, { content: 'Wrap gifts', completed: true }] },
  { date: '2025-12-23', items: [{ content: 'Pick up Mom and Dad from airport', completed: true }, { content: 'Clean guest room', completed: true }, { content: 'Reply to emails', completed: true }] },
  { date: '2025-12-24', items: [{ content: 'String lights across living room', completed: true }, { content: 'Pick up Mom and Dad from airport', completed: true }, { content: 'Bake cookies with Kasia and Mom', completed: true }] },
  { date: '2025-12-25', items: [{ content: 'Christmas morning', completed: true }] },
  { date: '2025-12-26', items: [{ content: 'Leftovers and board games', completed: true }] },
  { date: '2025-12-27', items: [{ content: 'Show parents the new neighborhood', completed: true }] },
  { date: '2025-12-28', items: [{ content: 'Parents leave — airport drop', completed: true }, { content: 'Rest', completed: true }, { content: 'Duolingo', completed: false }] },
  { date: '2025-12-29', items: [{ content: 'Laundry', completed: false }, { content: 'Groceries', completed: true }] },
  { date: '2025-12-30', items: [{ content: 'Year-end reflection draft', completed: true }, { content: 'Buy champagne for NYE', completed: false }] },
  { date: '2025-12-31', items: [{ content: 'Write year-end reflection', completed: true }, { content: 'Pick three words for 2026', completed: true }, { content: 'Buy champagne', completed: true }] },

  // ── 2026 January ──
  { date: '2026-01-01', items: [{ content: 'New Year\'s Day — rest', completed: true }] },
  { date: '2026-01-02', items: [{ content: 'Groceries', completed: true }, { content: 'Set up new year routines', completed: false }] },
  { date: '2026-01-03', items: [{ content: 'Meal prep', completed: true }, { content: 'Clean apartment', completed: true }] },
  { date: '2026-01-04', items: [{ content: 'Review Q1 goals with team', completed: true }, { content: 'Plan AI infrastructure rethink', completed: true }, { content: 'Morning routine — journal, coffee, code', completed: true }] },
  { date: '2026-01-05', items: [{ content: 'Sprint planning', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2026-01-06', items: [{ content: 'Team 1:1s', completed: true }, { content: 'Groceries', completed: true }, { content: 'Duolingo', completed: false }] },
  { date: '2026-01-07', items: [{ content: 'AI infrastructure — draft proposal', completed: true }, { content: 'Evening run', completed: false }] },
  { date: '2026-01-08', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Code review', completed: true }] },
  { date: '2026-01-09', items: [{ content: 'Sprint retro', completed: true }, { content: 'Pay bills', completed: true }] },
  { date: '2026-01-10', items: [{ content: 'Therapy — one year milestone session', completed: true }] },
  { date: '2026-01-11', items: [{ content: 'Farmers market', completed: true }] },
  { date: '2026-01-12', items: [{ content: 'Sprint planning', completed: true }, { content: 'Meal prep', completed: true }, { content: 'Call Mom', completed: true }] },
  { date: '2026-01-13', items: [{ content: 'Team 1:1s', completed: true }, { content: 'Gym', completed: false }] },
  { date: '2026-01-14', items: [{ content: 'Mentor junior dev through first deploy', completed: true }, { content: 'Start planning Kasia\'s birthday surprise', completed: true }, { content: 'Protect the three non-negotiables', completed: true }] },
  { date: '2026-01-15', items: [{ content: 'Therapy at 10am', completed: false }, { content: 'Groceries', completed: true }] },
  { date: '2026-01-16', items: [{ content: 'Sprint retro', completed: true }, { content: 'Evening run', completed: false }] },
  { date: '2026-01-17', items: [{ content: 'Pack fishing gear for tomorrow', completed: true }, { content: 'Farmers market', completed: true }] },
  { date: '2026-01-18', items: [{ content: 'Lake house trip with Dad', completed: true }, { content: 'Pack fishing gear', completed: true }, { content: 'Ask Dad more questions about his early career', completed: true }] },
  { date: '2026-01-19', items: [{ content: 'Laundry', completed: true }, { content: 'Meal prep', completed: true }, { content: 'Gym', completed: true }] },
  { date: '2026-01-20', items: [{ content: 'Sprint planning', completed: true }, { content: 'MLK Day observance', completed: false }] },
  { date: '2026-01-21', items: [{ content: 'Team 1:1s', completed: true }] },
  { date: '2026-01-22', items: [{ content: 'Check in on Jake', completed: true }, { content: 'Fix caching bug — ask Priya for fresh eyes', completed: true }, { content: 'Send coffee invite to three friends this week', completed: true }] },
  { date: '2026-01-23', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Groceries', completed: true }, { content: 'Water herb garden', completed: true }] },
  { date: '2026-01-24', items: [{ content: 'Sprint retro', completed: false }, { content: 'Pay rent', completed: true }] },
  { date: '2026-01-25', items: [{ content: 'Saturday walk — no destination', completed: true }, { content: 'Help Omar move into new apartment', completed: true }, { content: 'Visit The Paper Crane bookshop again', completed: true }] },
  { date: '2026-01-26', items: [{ content: 'Meal prep', completed: true }] },
  { date: '2026-01-27', items: [{ content: 'Sprint planning', completed: true }] },
  { date: '2026-01-28', items: [{ content: 'Lunch with Marcus — burnout conversation', completed: true }, { content: 'Fix Q4 data visualization section', completed: true }, { content: 'Jazz festival tickets — confirm with Kasia', completed: true }] },
  { date: '2026-01-29', items: [{ content: 'Therapy at 10am', completed: true }, { content: 'Evening run', completed: true }, { content: 'Call Mom', completed: false }] },
  { date: '2026-01-30', items: [{ content: 'Eagle Creek trail — check weather', completed: true }, { content: 'Pack lunch and water', completed: true }, { content: 'Watercolor supplies from closet', completed: true }, { content: 'Make chicken soup — big batch', completed: true }] },
  { date: '2026-01-31', items: [{ content: 'Month-end timesheet', completed: true }, { content: 'Gym', completed: true }] },

  // ── 2026 February ──
  { date: '2026-02-01', items: [{ content: 'Write February intentions', completed: true }, { content: 'In bed by 10:30 tonight', completed: true }, { content: 'Follow up with Tariq — exchange numbers', completed: true }, { content: 'Evening yoga class', completed: true }] },
  { date: '2026-02-02', items: [{ content: 'Farmers market', completed: true }, { content: 'Meal prep', completed: true }, { content: 'Read before bed', completed: true }] },
  { date: '2026-02-03', items: [{ content: 'Sprint planning kickoff', completed: true }, { content: 'Lunch at new Ethiopian place with Kasia', completed: true }, { content: 'Build sentiment analysis module', completed: true }, { content: 'Watch sunset from balcony', completed: true }] },
  { date: '2026-02-04', items: [{ content: 'Team 1:1s', completed: false }, { content: 'Gym', completed: true }] },
  { date: '2026-02-05', items: [{ content: 'Brain dump anxiety into notebook', completed: true }, { content: 'Pair program with Priya on search feature', completed: true }, { content: 'Call Mom — reply to garden text', completed: true }, { content: 'Early night — in bed by 9:30', completed: true }] },
  { date: '2026-02-06', items: [{ content: 'Final presentation practice', completed: false }, { content: 'Groceries', completed: true }] },
  { date: '2026-02-07', items: [{ content: 'Practice presentation (run through 2x)', completed: true }, { content: 'Feature demo prep — test all flows', completed: true }, { content: 'Book team dinner if it goes well', completed: true }] },
  { date: '2026-02-08', items: [{ content: 'Rest — recover from big week', completed: true }, { content: 'Laundry', completed: true }, { content: 'Journal', completed: true }] },
  { date: '2026-02-09', items: [{ content: 'Farmers market — sourdough, eggs, tomatoes', completed: true }, { content: 'Set up new monitor arm', completed: true }, { content: 'Cable manage desk', completed: true }, { content: 'FaceTime Nadia', completed: true }] },
  { date: '2026-02-10', items: [{ content: 'Sprint planning', completed: true }, { content: 'Gym', completed: true }, { content: 'Check on Miso', completed: true }] },
  { date: '2026-02-11', items: [{ content: 'Work from home — rainy day', completed: true }, { content: 'Start reading Four Thousand Weeks', completed: true }, { content: 'Call Mom — forgot yesterday', completed: true }, { content: 'Documentary night with Kasia', completed: true }] },
  { date: '2026-02-12', items: [{ content: 'Code review', completed: true }, { content: 'Plan Valentine\'s Day', completed: true }, { content: 'Groceries', completed: true }] },
  { date: '2026-02-13', items: [{ content: 'Ship the redesign', completed: true }, { content: 'Reply to Dad about fishing weekend', completed: false }, { content: 'Evening run — waterfront 5K', completed: true }] },
  { date: '2026-02-14', items: [{ content: 'Make banana pancakes for Kasia', completed: true }, { content: 'Pick up flowers from the market', completed: true }, { content: 'Dinner reservation at Saffron (7pm)', completed: false }, { content: 'Write Valentine\'s letter', completed: true }] },
];

// ──────────────────────────────────────────────
// STICKY NOTES
// ──────────────────────────────────────────────

const STICKY_NOTES: { date: string; content: string }[] = [
  { date: '2024-04-02', content: 'Marcus — onboarding buddy. Desk is by the window.' },
  { date: '2024-04-28', content: '"You don\'t rise to the level of your goals, you fall to the level of your systems." — James Clear' },
  { date: '2024-05-08', content: 'RIP Stanley the sourdough starter (2024–2024). Gone but not forgotten.' },
  { date: '2024-05-11', content: 'Gallery: immersive light installation. River walk after.' },
  { date: '2024-06-11', content: 'Dr. Patel — Therapy Thursdays at 10am' },
  { date: '2024-06-25', content: 'Made it official with Kasia.' },
  { date: '2024-07-14', content: 'Zero productivity day experiment. Verdict: needed and repeating.' },
  { date: '2024-07-29', content: 'Performance review: Exceeds expectations. Leadership program next year.' },
  { date: '2024-08-28', content: 'Big Sur balcony. Pacific Ocean. The feeling of enough.' },
  { date: '2024-09-25', content: 'Omar got into YC!! $2.1M seed coming.' },
  { date: '2024-10-03', content: 'Weekly photo walks are back. One roll of film per week.' },
  { date: '2024-10-22', content: 'AI & Privacy talk — audit our data pipeline this quarter' },
  { date: '2024-12-31', content: '2025 words: presence, craft, generosity' },
  { date: '2025-01-27', content: '"I\'m learning to disappoint people gracefully." — me, in therapy' },
  { date: '2025-02-14', content: 'One year at the company. First Valentine\'s with Kasia.' },
  { date: '2025-03-28', content: 'Welcome home, Miso. Orange tabby. Zero chill.' },
  { date: '2025-04-14', content: 'Submitted 3 photos to gallery. Theme: Urban Solitude.' },
  { date: '2025-05-02', content: '"Fire Escape at Dusk" accepted into the gallery show!' },
  { date: '2025-06-03', content: 'Promoted to Senior Engineer.' },
  { date: '2025-07-15', content: 'Semantic search accuracy: 94%. Priya called it "unreasonably effective."' },
  { date: '2025-08-04', content: 'AI features launched publicly. User review: "like a conversation with my own memories."' },
  { date: '2025-09-02', content: 'New project: "A Year in Light" — one photo per week, same neighborhood.' },
  { date: '2025-10-12', content: 'Tanaka-san: "Cooking is my way of saying welcome." — Onsen town, Japan' },
  { date: '2025-11-03', content: 'Japanese concept: "ma" (間) — the beauty of negative space' },
  { date: '2025-11-12', content: 'Accepted Tech Lead role. Terrified. Excited. Both.' },
  { date: '2025-12-14', content: 'Moved in with Kasia. First night: pizza on the floor, city lights, home.' },
  { date: '2025-12-31', content: '2026 words: depth, courage, play' },
  { date: '2026-01-10', content: 'One year of therapy. Best investment I\'ve ever made.' },
  { date: '2026-01-25', content: 'The Paper Crane bookshop — shelves organized by mood. Visit again!' },
  { date: '2026-02-01', content: 'February intentions:\n1. Sleep by 10:30\n2. Read 30 min/day\n3. One act of kindness daily' },
  { date: '2026-02-07', content: 'Leadership approved AI insights feature! Phase 2 starts next week.' },
  { date: '2026-02-11', content: '"We\'ll never get on top of everything — and that\'s okay." — Oliver Burkeman' },
  { date: '2026-02-14', content: 'Reservation confirmation #4821 — Saffron Restaurant, 7pm, table for 2' },
];

// ──────────────────────────────────────────────
// CHATS
// ──────────────────────────────────────────────

interface ChatSeed {
  title: string;
  date: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

const CHATS: ChatSeed[] = [
  {
    title: 'Weekly mood patterns',
    date: '2026-02-13',
    messages: [
      { role: 'user', content: 'How has my mood been this past week?' },
      {
        role: 'assistant',
        content:
          "Based on your recent entries, your mood has been generally positive this week with a few notable patterns:\n\n**High points:**\n- Your Valentine's Day entry radiates warmth and gratitude — the intentional time with Kasia clearly lifted your spirits\n- The successful presentation on Feb 7th brought a strong sense of accomplishment and team pride\n- Sunday's farmers market and desk reorganization show you're finding joy in small routines\n\n**Lower moments:**\n- Feb 5th had some anxiety around the upcoming presentation that disrupted your sleep\n- You mentioned forgetting to call Mom back, which suggests you've been stretched thin\n\nOverall, the trend is upward. You recover well from dips by leaning into rest, physical activity, and social connection. Your awareness of what recharges you — nature, meaningful conversations, early nights — is serving you well.",
      },
    ],
  },
  {
    title: 'People in my life',
    date: '2026-02-10',
    messages: [
      { role: 'user', content: 'Who have I been spending the most time with over the past two years?' },
      {
        role: 'assistant',
        content:
          "Here's a snapshot of the people who appear most across your journal:\n\n**Kasia** — by far the most mentioned person. From your first date at the light installation gallery in May 2024 to moving in together in December 2025, she's woven into nearly every chapter. Your entries about her carry genuine warmth and growing depth.\n\n**Marcus** — your closest work friend since day one. From onboarding buddy to woodworking conversations to celebrating your gallery show, he's been a steady presence. The lunch conversations about burnout and craft seem particularly meaningful.\n\n**Priya** — a teammate you deeply respect. Consistent mentions of pair programming, whiteboarding sessions, and learning from her systems thinking.\n\n**Omar** — from startup anxiety to YC acceptance to moving back home. You've been there through his whole arc, and the mutual support is clear.\n\n**Dad** — the fishing trips, the birthday visit, the career stories. There's a deepening curiosity about his life beyond the \"Dad\" role that's really touching.\n\n**Nadia** — your sister shows up at key moments: apartment critiques, hiking trips, FaceTime check-ins. The sibling bond is strong.\n\n**Ahmed** — the social glue of your friend group. Present at every barbecue, holiday, and celebration.\n\n**Dr. Patel** — your therapist for over a year. The insights from your sessions ripple through many other entries.\n\nYou surround yourself with thoughtful, growth-oriented people. That says a lot about you too.",
      },
    ],
  },
  {
    title: 'Personal growth reflection',
    date: '2026-01-28',
    messages: [
      { role: 'user', content: 'How have I changed since I started journaling here?' },
      {
        role: 'assistant',
        content:
          "Looking across nearly two years of entries, the growth is striking:\n\n**Professional identity:**\nYou arrived in April 2024 as the \"new guy\" shipping small PRs. By mid-2025 you'd been promoted to Senior Engineer, led a company tech talk, and shipped AI features that users love. Now you're a Tech Lead managing a team. The trajectory isn't just upward — it's *intentional*.\n\n**Relationship with rest:**\nEarly entries show someone who treated rest as a reward. Your therapy work with Dr. Patel transformed that. The July 2024 \"zero productivity day\" was a turning point. By 2025, mental health days were \"maintenance, not luxury.\" That's a profound shift.\n\n**Creative life:**\nPhotography went from \"neglected hobby\" to gallery exhibition. You went from \"I should dust off the camera\" to having your work on a white wall with strangers stopping to look. The \"A Year in Light\" project shows you've committed to it as part of your identity.\n\n**Emotional vocabulary:**\nYour early entries are more factual — what happened, what you did. Over time, they became more reflective. You name feelings now. You sit with discomfort. You write things like \"missing someone doesn't get smaller — you just get bigger around it.\"\n\n**Relationships:**\nThe deepening with Kasia is the obvious arc, but equally important: you've become more intentional about checking in on people, having difficult conversations (Jake), and expressing what people mean to you.\n\nThe thread connecting all of this? You've moved from *doing* to *being*. From measuring days by output to measuring them by presence.",
      },
    ],
  },
  {
    title: 'Work-life balance check',
    date: '2026-02-05',
    messages: [
      { role: 'user', content: 'Am I balancing work and personal life well based on my entries?' },
      {
        role: 'assistant',
        content:
          "Looking across your entries, I'd say you're doing better than you might think — but there are a few patterns worth watching.\n\n**What's working well:**\n- You have clear boundaries: morning routines before touching your phone, protecting sleep, taking mental health days without guilt\n- Your weekends are genuinely restorative — farmers markets, hikes, cooking for friends, reading\n- You celebrate work wins without making work your identity\n- The Japan trip and regular photo walks show you invest in experiences, not just productivity\n\n**Areas to watch:**\n- The Feb 5th entry about 4am anxiety over a presentation suggests work stress sometimes bleeds into personal time\n- Your therapy session flagged the \"generosity trap\" — overcommitting is a pattern that could tip the balance\n- The transition to Tech Lead adds people management on top of technical work — watch for scope creep\n\n**My take:** You're intentional about balance, which puts you ahead of most people. The key insight from your own journal: you already know what recharges you. The challenge isn't awareness — it's protection. Keep guarding those non-negotiables.",
      },
    ],
  },
  {
    title: 'Travel memories',
    date: '2025-10-20',
    messages: [
      { role: 'user', content: 'Tell me about my favorite travel moments this year' },
      {
        role: 'assistant',
        content:
          "Your travel entries are some of the most vivid in your journal. Here are the standout moments:\n\n**Japan (October 2025)** — This was clearly the highlight. Three moments stand out:\n1. *Fushimi Inari at sunrise* — walking through thousands of vermillion torii gates with almost no one around. You described the light as \"ethereal.\"\n2. *The rural onsen* — soaking in hot springs overlooking autumn maples. You wrote that your \"bones were made of liquid.\" Tanaka-san's kaiseki dinner and her philosophy of \"cooking as welcome\" stuck with you deeply.\n3. *Getting lost in Osaka's street food scene* — the pure joy of discovery without a plan.\n\n**Big Sur (August 2024)** — The road trip with Kasia that ended on a cliff-edge balcony watching the Pacific. This is the moment you described to Dr. Patel as your most peaceful — \"absence of striving, just being enough.\"\n\n**Mendocino coast (August 2024)** — The hidden beach you found by accident. Swimming in freezing water, drying on rocks. You wrote: \"Unplanned moments like this are the whole point of travel.\"\n\n**Memorial Day beach (May 2024)** — The cabin with Ahmed and Omar. Surfing badly, grilling, cards until 2am. A simpler trip but the friendship made it glow.\n\nThe common thread: your best travel moments aren't about destinations. They're about presence, surprise, and the people you're with.",
      },
    ],
  },
];

// ──────────────────────────────────────────────
// Seed functions
// ──────────────────────────────────────────────

async function wipeAllData() {
  console.log('[seed] Wiping all data...');
  const tables = [
    'chat_messages',
    'chats',
    'embedding_chunks',
    'entity_mentions',
    'entities',
    'journal_insights',
    'analytics_queue',
    'deep_insights',
    'sticky_notes',
    'todos',
    'entries',
  ];

  for (const table of tables) {
    await execute(`DELETE FROM ${table}`);
  }

  await execute("DELETE FROM entries_fts WHERE entries_fts MATCH '*'").catch(() => {});

  console.log('[seed] All data wiped.');
}

async function seedEntries() {
  console.log('[seed] Inserting entries...');
  for (const entry of ENTRIES) {
    const entryId = id();
    const hour = 7 + Math.floor(Math.random() * 14);
    const min = Math.floor(Math.random() * 60);
    const created = ts(entry.date, hour, min);
    await execute(
      'INSERT INTO entries (id, date, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
      [entryId, entry.date, entry.content, created, created]
    );
  }
  console.log(`[seed] Inserted ${ENTRIES.length} entries.`);
}

async function seedTodos() {
  console.log('[seed] Inserting todos...');
  let count = 0;
  for (const group of TODOS) {
    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i];
      const created = ts(group.date, 7, i * 5);
      await execute(
        'INSERT INTO todos (id, date, content, completed, position, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id(), group.date, item.content, item.completed ? 1 : 0, i, created, created]
      );
      count++;
    }
  }
  console.log(`[seed] Inserted ${count} todos.`);
}

async function seedStickyNotes() {
  console.log('[seed] Inserting sticky notes...');
  for (const note of STICKY_NOTES) {
    const created = ts(note.date, 10, Math.floor(Math.random() * 60));
    await execute(
      'INSERT INTO sticky_notes (id, date, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
      [id(), note.date, note.content, created, created]
    );
  }
  console.log(`[seed] Inserted ${STICKY_NOTES.length} sticky notes.`);
}

export async function seedChats() {
  console.log('[seed] Inserting chats...');
  for (let i = 0; i < CHATS.length; i++) {
    const chat = CHATS[i];
    const chatId = id();
    const chatCreated = ts(chat.date, 19, i * 15);

    await execute(
      'INSERT INTO chats (id, title, created_at, updated_at) VALUES ($1, $2, $3, $4)',
      [chatId, chat.title, chatCreated, chatCreated]
    );

    for (let j = 0; j < chat.messages.length; j++) {
      const msg = chat.messages[j];
      const msgCreated = ts(chat.date, 19, i * 15 + j + 1);
      await execute(
        'INSERT INTO chat_messages (id, chat_id, role, content, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [id(), chatId, msg.role, msg.content, 'sent', msgCreated]
      );
    }
  }
  console.log(`[seed] Inserted ${CHATS.length} chats with messages.`);
}

export async function seedDemoData() {
  if (!DB_URL.includes('_demo')) {
    throw new Error(`Refusing to seed: DB_URL "${DB_URL}" does not contain "_demo". Switch to a demo database first.`);
  }
  console.log('[seed] Starting demo data seed...');
  await wipeAllData();
  await seedEntries();
  await seedTodos();
  await seedStickyNotes();
  console.log('[seed] Demo data seed complete! Reloading...');
  window.location.reload();
}
