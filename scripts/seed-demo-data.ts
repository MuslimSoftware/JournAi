import { execute } from '../src/lib/db';

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
    content: `End of first week. The learning curve is steep but manageable. Spent most of the day reading through the codebase — it's well-organized which says a lot about the team culture.\n\nMet Priya during lunch. She's the senior engineer on my squad. Sharp, opinionated in a good way, and surprisingly funny. She recommended a list of architecture docs to read over the weekend.\n\nMissing the old crew a bit. Texted Ahmed and Omar — we're planning dinner next Friday.`,
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
    content: `Something clicked at work today. Was debugging a gnarly race condition and instead of panicking, I just… worked through it methodically. Drew out the sequence diagram on paper. Found the issue in twenty minutes. Three months ago this would have taken me all day.\n\nGrowth is hard to see in the moment but looking back, it's undeniable.\n\nEvening run — first time breaking 25 minutes on a 5K. The weather is perfect for it right now. Cool air, golden light.`,
  },
  {
    date: '2024-04-28',
    content: `Sunday farmers market with Omar. He convinced me to buy a sourdough starter from one of the vendors. Named it "Stanley." We'll see if I can keep this thing alive.\n\nSpent the afternoon reading on the balcony. Started "Atomic Habits" — I know, I'm late to the party. But the chapter on identity-based habits is genuinely reframing how I think about change. You don't rise to the level of your goals, you fall to the level of your systems.\n\nGood, quiet day.`,
  },

  // ── 2024 May ──
  {
    date: '2024-05-03',
    content: `Company offsite at a retreat center in the mountains. Two days of workshops, hiking, and actually getting to know people beyond Slack avatars.\n\nHighlight was the fireside chat with the founders. They talked about the early days — sleeping in the office, pivoting three times, almost running out of money. There's something grounding about hearing that even successful things start messy.\n\nShared a cabin with Marcus and a designer named Leo. We stayed up way too late talking about everything from music to mortality. Good people.`,
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
    content: `Deep work day. Spent six straight hours on the search architecture. Priya and I whiteboarded three different approaches and landed on something elegant. The synergy is real — she thinks in systems, I think in user flows, and together we cover the whole picture.\n\nSkipped the gym to keep the momentum going. Worth it today, but can't make it a habit.\n\nCalled Nadia. She's adjusting to Vancouver — the rain is relentless but she loves the mountains. She asked about Kasia. Sisters always know.`,
  },
  {
    date: '2024-05-30',
    content: `Memorial Day weekend. Drove to the coast with Ahmed and Omar. Rented a cabin near the beach. Spent the days surfing (badly), grilling, and playing cards until 2am.\n\nOmar opened up about his startup idea — an AI tool for small business accounting. His eyes light up when he talks about it. I hope he goes for it.\n\nSunset on the last evening was one of those moments you know you'll remember. Three friends, cold beers, the sound of waves. Simple and perfect.`,
  },

  // ── 2024 June ──
  {
    date: '2024-06-04',
    content: `Kasia came over for the first time. I cooked — chicken shawarma with tahini sauce and homemade pita. The pita was a disaster (too thick, slightly burnt) but she ate it anyway and said it had "character." I think I'm falling for this person.\n\nWe talked until midnight. About family, about faith, about the things that scare us. There's a vulnerability with her that I haven't felt in a long time.`,
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
    content: `Fourth of July weekend (observed). Kasia and I went to the rooftop party at Jake and Leila's place. The fireworks reflected off the river and for a moment the whole city felt like it was celebrating just for us.\n\nMet a bunch of Kasia's friends for the first time. They're warm, welcoming, a little chaotic. I fit in more easily than I expected.\n\nDrove home with the windows down, her hand in mine. Summer is doing its thing.`,
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
    content: `Omar quit his job. He's going all in on the startup. We had a long dinner about it — the risks, the runway, the excitement. He's terrified and alive in a way I've never seen him. I told him I believe in him and meant it completely.\n\nIt made me think about my own risk tolerance. Am I too comfortable? Or is stability its own kind of courage? No answers tonight, just questions.`,
  },
  {
    date: '2024-08-12',
    content: `Anniversary of Grandpa's passing. Drove to the cemetery alone. Sat by his headstone and told him about the new job, about Kasia, about the person I'm becoming. He would have liked her. He would have been proud, I think.\n\nMissing someone doesn't get smaller. You just get bigger around it.\n\nMom called tonight. She was thinking about him too. We shared stories and laughed more than we cried. That feels like progress.`,
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
    content: `Back to work. The post-vacation blues are real but short-lived. Inbox was manageable and the team held things down beautifully while I was gone.\n\nNew quarter, new goals. We're tackling the mobile app — finally. I volunteered to lead the React Native migration. Big undertaking but I've been wanting to go deeper on mobile.\n\nEvening run to shake off the rust. 5K in 26 minutes. Slow but it felt good to move.`,
  },
  {
    date: '2024-09-10',
    content: `Kasia met Mom and Dad over FaceTime. Mom was charming, Dad was awkward in that lovable way. Kasia handled it perfectly — asked Dad about his engineering career and he talked for twenty minutes straight. The highest form of flattery for my father.\n\nAfterward Kasia said, "I see where you get it." Not sure what "it" is but I'll take the compliment.\n\nWork: mobile architecture decisions are consuming my brain. So many tradeoffs between native feel and code sharing.`,
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
    content: `Kasia's birthday. Planned a surprise picnic at the botanical gardens — her favorite place in the city. Packed her favorite foods, a bottle of the pinot noir from our road trip, and a handwritten letter about what she means to me.\n\nShe cried (the good kind). Said nobody's ever written her a letter before. That broke my heart a little. Everyone deserves to have someone put their feelings into words for them.\n\nSix months together. Feels like both a week and a lifetime.`,
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
    content: `Election day. Whatever happens, I'm choosing to focus on what I can control: how I show up in my community, how I treat people, how I use my skills for good. Voted early this morning.\n\nWork was quiet — everyone seemed distracted. We left early by unspoken agreement.\n\nMade soup. When the world feels heavy, I cook. It's grounding in the most literal sense — hands in food, heat from the stove, something nourishing at the end.`,
  },
  {
    date: '2024-11-14',
    content: `Nadia is visiting for Thanksgiving. She arrives next week and I can't wait. Haven't seen her in person since she moved to Vancouver eight months ago.\n\nWork milestone: mobile app beta is live internally. It's rough but functional. Using our own product on my phone feels surreal. The team is energized.\n\nEvening: started "The Remains of the Day" by Ishiguro. His prose is so restrained and devastating. Every sentence carries weight.`,
  },
  {
    date: '2024-11-21',
    content: `Nadia's here. The moment she walked through the door she started critiquing my apartment layout — classic designer sister. Within an hour she'd rearranged the living room and honestly? It's better.\n\nWe stayed up late talking about everything. Her work, my relationship, Mom and Dad's aging, what we want from life. She said something that stuck: "We spend so much time building careers and forget to build lives."\n\nShe and Kasia met today and instantly bonded over a shared love of weird documentaries. My favorite people liking each other is the best feeling.`,
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
    content: `Last day of work before the break. The team did a retro on the year. Highlights: search feature, mobile beta, zero major incidents in Q4. I looked at my first PR from April and barely recognized the code. Growth is visible when you have artifacts.\n\nPacked for the trip home. Two weeks with the family. Kasia's joining for Christmas week — her first holiday with my parents. She's nervous. I told her they already love her.`,
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
    content: `First week back. The office has that fresh-start energy. New quarter goals are ambitious but clear. I'm leading the AI features initiative — the company's first real foray into ML-powered tools.\n\nSpent the afternoon researching embedding models and vector databases. The landscape is moving so fast. Exciting and a little overwhelming.\n\nKasia started a new project at work — redesigning a community park. Watching her sketch ideas at the kitchen table reminded me why I'm drawn to people who make things.`,
  },
  {
    date: '2025-01-15',
    content: `Rough week. A production incident took down the app for two hours on Tuesday. Not my code this time but the incident response was all-hands. The postmortem revealed gaps in our alerting that we should have caught months ago.\n\nLesson: the boring infrastructure work is the most important work. Monitoring, alerts, runbooks — unglamorous but essential.\n\nNeeded the gym tonight. Heavy squats and loud music. Physical exhaustion as stress relief.`,
  },
  {
    date: '2024-01-20',
    content: `Weekend getaway with Kasia to a cabin in the mountains. No Wi-Fi by choice. Spent two days hiking, cooking on a cast iron skillet, reading by the fireplace.\n\nShe brought watercolors and painted the view from the porch. I watched her work — the concentration, the small smiles when a color landed right. I tried too. My mountain looked like a sad triangle but the process was meditative.\n\nDriving home, she said this was the happiest she's been in a long time. Me too.`,
  },
  {
    date: '2025-01-27',
    content: `Therapy check-in. Six months with Dr. Patel now. We reviewed my progress — better boundaries, less people-pleasing, more intentional rest. Still working on: sitting with discomfort instead of fixing everything immediately.\n\nShe asked me what I'm most proud of this year so far. I said: "I'm learning to disappoint people gracefully." She laughed but I meant it. Saying no is a skill.`,
  },

  // ── 2025 February ──
  {
    date: '2025-02-03',
    content: `Started learning Rust. The borrow checker is brutal but the mental model is beautiful once it clicks. Spent the evening working through the Rust Book. Chapter on ownership feels like it rewires how you think about memory.\n\nWork: first prototype of the AI features is working. Basic semantic search over user data. Seeing relevant results surface feels like magic, even knowing exactly how the sausage is made.\n\nKasia made a comment about how much I talk about Rust. Noted.`,
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
    content: `Mom visited for a long weekend. She reorganized my spice cabinet (didn't ask, didn't need to — it's better now). Made baklava from scratch and the apartment smelled like honey and pistachios for days.\n\nShe and Kasia spent Saturday at the botanical gardens while I worked. They came back with inside jokes I wasn't part of and honestly that's perfect.\n\nMom pulled me aside before leaving: "Don't work too hard. The work will always be there. The people won't." She's right. She's always right.`,
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
    content: `Nadia visited. She and Kasia dragged me on a hike that was definitely more than the "easy trail" they promised. 8 miles with 2,000 feet of elevation gain. My legs filed a formal complaint.\n\nBut the views. A waterfall at the midpoint that caught the light perfectly. I brought my camera and got some shots I'm genuinely proud of.\n\nEvening dinner — the three of us cooking together, Miso weaving between our legs. My sister and my partner laughing in my kitchen. Contentment.`,
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
    content: `Quiet Sunday. Read in the park while Miso sat in his carrier next to me, watching birds with laser focus. He's become an outdoor cat in spirit if not in practice.\n\nFinished "The Remains of the Day." The ending wrecked me. Stevens spending his whole life in service of duty and realizing too late what he missed. The dignity of restraint vs the tragedy of unexpressed love. Ishiguro is a master.\n\nMade a promise to myself: never let propriety or pride keep me from telling people what they mean to me.`,
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
    content: `Summer solstice approaching and the evenings are endless. Biked home from work at 7pm in full daylight. Stopped at the overlook point and watched the city glow.\n\nPlanning a trip to Japan for October. Kasia and I have been talking about it since Tariq's stories. Started learning basic Japanese on Duolingo. "Sumimasen" is already my most-used word (to Miso, when I accidentally step near his tail).`,
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
    content: `Something shifted in therapy today. Dr. Patel asked when I last felt truly at peace — not happy, not excited, but at peace. I had to think for a while. It was on the Big Sur balcony last summer, watching Kasia sleep, hearing the ocean.\n\nShe asked what that moment had that my daily life doesn't. The answer came easily: absence of striving. I was enough in that moment. Not becoming, just being.\n\nHow do I build more of that into a life that's always moving?`,
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
    content: `Took a week off after the launch. Completely offline for three days. It was harder than expected — the urge to check Slack, to see metrics, to stay "in the loop." But by day two, the anxiety dissolved into something softer.\n\nRead two books. Cooked elaborate meals for no reason. Took Miso for walks in his carrier. He gets recognized by the coffee shop regulars now.\n\nRest is productive. I'll keep saying it until I believe it fully.`,
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
    content: `Hard day. The anniversary always is. Called Grandpa's best friend, Uncle Ray, to check in. He's 84 and still sharp. Told me stories I'd heard before but listened like it was the first time. Sometimes people don't need new ears — they need familiar ones.\n\nWork was a welcome distraction. Pair-programmed with a new junior engineer, Amir. He reminds me of me a year ago — eager, slightly overwhelmed, trying to absorb everything at once. Told him to be patient with himself.`,
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
    content: `Kyoto. The temples are everything Tariq said they'd be. Fushimi Inari at sunrise — walking through thousands of vermillion torii gates with almost no one else around. The light filtering through was ethereal.\n\nVisited a bamboo grove and sat in silence for twenty minutes. The sound of wind through bamboo is unlike anything else. A kind of natural music.\n\nKasia sketched the garden at Kinkaku-ji. Her drawing captured something my camera couldn't.`,
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
    content: `Friendsgiving. Cooked for twelve people. Kasia and I split the menu — she did the mains, I did the sides and dessert. Made pumpkin pie from actual pumpkins for the first time. The crust was slightly burnt but the filling was perfect.\n\nAhmed gave a toast: "To the people who make the hard years survivable and the good years unforgettable." Everyone clinked glasses and I felt that warmth that comes from belonging.\n\nOmar brought his new girlfriend, Rin. She's a ceramicist. She and Kasia talked for an hour straight. The circle grows.`,
  },
  {
    date: '2025-11-28',
    content: `Thanksgiving with the family. Flew home with Kasia. The house was warm, the food was excessive, Dad fell asleep during the football game as tradition demands.\n\nNadia couldn't make it this year — work deadline. FaceTimed her in and she gave everyone a virtual tour of her new studio apartment. It has a reading nook built into a window bay. Jealous.\n\nHelped Mom with the dishes and she told me about her own mother's kitchen in Amman. Stories I've heard before but they sound different now that I'm building my own kitchen traditions.`,
  },

  // ── 2025 December ──
  {
    date: '2025-12-06',
    content: `First month as Tech Lead. Managing a team of four. The shift from "do the work" to "enable others to do the work" is the hardest professional transition I've made.\n\nHad my first difficult 1:1 — gave feedback to an engineer whose code quality has been slipping. Tried to be direct and kind. She took it well. Left the conversation feeling like I'd done something important, even though it was uncomfortable.\n\nMarcus bought me a book: "The Manager's Path." He highlighted his favorite sections. Mentorship doesn't stop just because you got promoted.`,
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
    content: `One month into the new year and I actually feel different. Not in a dramatic, reinvented way — more like small adjustments compounding. The morning routine is sticking. The journaling is deeper. The sleep is better.\n\nBig realization today: consistency beats intensity. I used to try to change everything at once and flame out by February. This year I picked three things and protected them ruthlessly.\n\nWork highlight: mentored a junior developer through her first production deploy. The nervousness on her face reminded me of my first time. When it went smoothly, her relief was palpable. Told her the nervousness never fully goes away — you just learn to trust the process.\n\nKasia's birthday is coming up. Starting to plan something special. She deserves it.`,
  },
  {
    date: '2026-01-18',
    content: `Drove up to the lake house with Dad for the day. The drive itself was therapeutic — winding roads through the forest, windows down despite the cold.\n\nWe didn't catch any fish but that was never really the point. Dad told me stories about his early career that I'd never heard — how he almost quit engineering to become a teacher, how Grandpa talked him out of it, how he sometimes wonders what that alternate life would've looked like.\n\nIt hit me that my parents are people with unlived lives and unfinished dreams, not just "Mom and Dad." I want to ask them more questions while I still can.\n\nDrove home in comfortable silence. Some of the best conversations happen without words.`,
  },
  {
    date: '2026-01-22',
    content: `Had a difficult conversation with Jake today. He's been distant lately and I finally asked why. Turns out he's been dealing with some family stuff he didn't feel comfortable sharing. I told him I'm here whenever he's ready. No pressure.\n\nIt reminded me that everyone is fighting battles we can't see. I want to be better about checking in on people — not just when I notice something's off, but regularly. A quick text, a coffee invite. These small things matter.\n\nWork was heads-down productive. Finally cracked the caching issue that's been bugging me for days. The solution was embarrassingly simple — sometimes you just need fresh eyes. Priya spotted it in two minutes after I'd been staring at it for hours.\n\nHumility is a superpower in engineering.`,
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
    content: `Back to work after a restful weekend. The team's energy was high — everyone seems recharged. We kicked off sprint planning and the scope feels manageable for once.\n\nLunch at the new Ethiopian place with Kasia. The injera was perfect and the coffee ceremony afterward was a beautiful experience. The owner, Abeba, told us about her journey from Addis Ababa. Her warmth was contagious.\n\nAfternoon deep work session — three hours of uninterrupted coding. Built out the sentiment analysis module. There's a flow state that happens when the problem is just challenging enough. Today I found it.\n\nEvening: watched the sunset from the balcony. Orange melting into purple. Made a mental note to do this more often.`,
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
    content: `Sunday morning farmers market. Picked up sourdough, fresh eggs, and some incredible looking heirloom tomatoes. The bread guy remembered my name which was a nice touch.\n\nSpent the afternoon reorganizing my desk setup. New monitor arm came in — the extra desk space is game changing. Also finally cable-managed everything. It's the little things.\n\nFaceTime with Nadia. She's thriving in Vancouver — just got promoted to senior designer. So proud of her. We planned a trip for April — she wants to show me her favorite hiking trails.\n\nMade chicken shawarma bowls for dinner. The tahini sauce recipe I found last week is a keeper.`,
  },
  {
    date: '2026-02-11',
    content: `Rainy day. Worked from home with the window cracked open — there's something about the sound of rain that makes focus effortless.\n\nStarted reading "Four Thousand Weeks" by Oliver Burkeman. Only two chapters in but it's already shifting how I think about time management. The core idea that we'll never "get on top of everything" is oddly freeing.\n\nKasia and I watched a documentary about deep sea creatures tonight. The bioluminescence footage was mesmerizing. We kept pausing to look things up — turns out there's a jellyfish that's technically immortal. Nature is wild.\n\nNote to self: call Mom tomorrow. She texted about the garden and I forgot to reply.`,
  },
  {
    date: '2026-02-13',
    content: `Long day at work but productive. Finally shipped the redesign we've been iterating on for weeks. The team pulled together nicely in the last stretch — Marcus stayed late to fix a tricky animation bug and Priya rewrote half the onboarding copy.\n\nGot a message from Dad asking about the weekend. He wants to go fishing at the lake. Haven't done that since last summer. I should make it happen.\n\nEvening run along the waterfront. 5K in 24 minutes — not my best but the sunset was incredible so I stopped twice just to take it in. Sometimes you have to let the run be about more than the pace.`,
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
  {
    date: '2024-04-02',
    items: [
      { content: 'Set up dev environment', completed: true },
      { content: 'Read onboarding docs', completed: true },
      { content: 'Meet with Marcus for walkthrough', completed: true },
    ],
  },
  {
    date: '2024-05-11',
    items: [
      { content: 'Gallery tickets — confirm time', completed: true },
      { content: 'Iron the blue shirt', completed: true },
    ],
  },
  {
    date: '2024-06-19',
    items: [
      { content: 'Book flight home for Dad\'s birthday', completed: true },
      { content: 'Pick up framed photo from print shop', completed: true },
      { content: 'Call Nadia about FaceTime plan', completed: true },
    ],
  },
  {
    date: '2024-08-19',
    items: [
      { content: 'Pack for road trip', completed: true },
      { content: 'Download offline maps', completed: true },
      { content: 'Confirm Airbnb check-in time', completed: true },
      { content: 'Playlist for the drive', completed: true },
    ],
  },
  {
    date: '2024-10-15',
    items: [
      { content: 'Pick up pinot noir from wine shop', completed: true },
      { content: 'Write birthday letter for Kasia', completed: true },
      { content: 'Botanical garden picnic setup', completed: true },
    ],
  },
  {
    date: '2024-11-28',
    items: [
      { content: 'Turkey — start brine tonight', completed: true },
      { content: 'Sweet potatoes and cranberry sauce', completed: true },
      { content: 'Set extra chairs from garage', completed: true },
      { content: 'Pick up pumpkin pie from bakery', completed: false },
    ],
  },
  {
    date: '2024-12-20',
    items: [
      { content: 'Pack for family visit', completed: true },
      { content: 'Wrap Kasia\'s gift', completed: true },
      { content: 'Auto-reply on email', completed: false },
    ],
  },
  {
    date: '2025-03-28',
    items: [
      { content: 'Cat carrier — pick up from pet store', completed: true },
      { content: 'Vet appointment scheduled (4pm)', completed: true },
      { content: 'Cat-proof the apartment: secure cables', completed: true },
      { content: 'Buy litter box and food bowls', completed: true },
    ],
  },
  {
    date: '2025-05-10',
    items: [
      { content: 'Iron outfit for gallery opening', completed: true },
      { content: 'Confirm guest list RSVPs', completed: true },
      { content: 'Arrive early for setup', completed: true },
    ],
  },
  {
    date: '2025-10-05',
    items: [
      { content: 'Passports — double check', completed: true },
      { content: 'Yen — exchange at airport', completed: true },
      { content: 'Download Japan Rail app', completed: true },
      { content: 'Pocket wifi pickup confirmation', completed: true },
    ],
  },
  {
    date: '2025-12-14',
    items: [
      { content: 'Moving truck — confirm 9am pickup', completed: true },
      { content: 'Transfer utilities to new address', completed: true },
      { content: 'Change address with post office', completed: false },
      { content: 'Pack kitchen last', completed: true },
    ],
  },
  {
    date: '2026-01-30',
    items: [
      { content: 'Eagle Creek trail — check weather', completed: true },
      { content: 'Pack lunch and water', completed: true },
      { content: 'Watercolor supplies from closet', completed: true },
    ],
  },
  {
    date: '2026-02-07',
    items: [
      { content: 'Practice presentation (run through 2x)', completed: true },
      { content: 'Feature demo prep — test all flows', completed: true },
      { content: 'Book team dinner if it goes well', completed: true },
    ],
  },
  {
    date: '2026-02-14',
    items: [
      { content: 'Make banana pancakes for Kasia', completed: true },
      { content: 'Pick up flowers from the market', completed: true },
      { content: 'Dinner reservation at Saffron (7pm)', completed: false },
      { content: 'Write Valentine\'s letter', completed: true },
    ],
  },
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

async function seedChats() {
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
  console.log('[seed] Starting demo data seed...');
  await wipeAllData();
  await seedEntries();
  await seedTodos();
  await seedStickyNotes();
  await seedChats();
  console.log('[seed] Demo data seed complete! Reload the app to see changes.');
}
