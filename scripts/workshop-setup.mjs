import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VAULT_NAME = 'ai-coach-workshop-vault';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d, delta) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
  return copy;
}

function isoWeekOf(d) {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${pad(week)}`;
}

function expandHome(input) {
  if (input === '~') return homedir();
  if (input.startsWith('~/') || input.startsWith('~\\')) {
    return join(homedir(), input.slice(2));
  }
  return input;
}

function defaultVaultDir() {
  const home = homedir();
  const documents = join(home, 'Documents');
  return existsSync(documents)
    ? join(documents, VAULT_NAME)
    : join(home, VAULT_NAME);
}

function buildFiles(now) {
  const year = String(now.getFullYear());
  const monthNum = now.getMonth() + 1;
  const month = `${year}-${pad(monthNum)}`;
  const monthDir = `${monthNum}-${MONTH_NAMES[now.getMonth()]}`;
  const quarter = `${year}-Q${Math.floor(now.getMonth() / 3) + 1}`;
  const week = isoWeekOf(now);
  const today = isoDate(now);
  const yesterday = isoDate(addDays(now, -1));
  const twoDaysAgo = isoDate(addDays(now, -2));
  const threeDaysAgo = isoDate(addDays(now, -3));
  const fourDaysAgo = isoDate(addDays(now, -4));
  const fiveDaysAgo = isoDate(addDays(now, -5));
  const tomorrow = isoDate(addDays(now, 1));
  const nextWeek = isoDate(addDays(now, 7));
  const nextMonth = isoDate(addDays(now, 30));

  const bookDir = '3.Resources/0.Raw/Books/Tiago Forte/Building a Second Brain';
  const ch1 = `${bookDir}/chapters/01 Where It All Started.md`;
  const ch2 = `${bookDir}/chapters/02 What Is a Second Brain.md`;
  const ch3 = `${bookDir}/chapters/03 How a Second Brain Works.md`;
  const codeConcept = '3.Resources/Concepts/CODE Method.md';
  const paraConcept = '3.Resources/Concepts/PARA Method.md';
  const progConcept = '3.Resources/Concepts/Progressive Summarization.md';
  const ipConcept = '3.Resources/Concepts/Intermediate Packets.md';
  const structurePath = '3.Resources/Structures/Building a Second Brain.md';

  const renderSession = (record) => {
    const headings = {
      spar: 'Sparring session',
      generate: 'Generate attempt',
      elaborate: 'Elaboration',
      teach: 'Teaching session',
    };
    const notes = record.items
      .filter((i) => i.coach_id)
      .map((i) => JSON.stringify(i.coach_id))
      .join(', ');
    const lines = [
      '---',
      `session_id: ${JSON.stringify(record.session_id)}`,
      `kind: ${JSON.stringify(record.kind)}`,
      `tier: ${record.tier}`,
      `date: ${JSON.stringify(record.date)}`,
      `recorded_at: ${JSON.stringify(record.recorded_at)}`,
      `notes: [${notes}]`,
      '---',
      '',
      `# ${headings[record.kind]}, Tier ${record.tier}, ${record.date}`,
      '',
      'Written by the coach. Edits to this file are not read back; the record is the block at the end.',
    ];
    for (const item of record.items) {
      lines.push(
        '',
        `## ${item.title}`,
        '',
        `**Verdict:** ${item.verdict} · **Next review:** ${item.next_review ?? 'none'} · **Note:** ${item.note_path}`,
        '',
        '**Challenge**',
        '',
        `> ${item.challenge}`,
        '',
        '**Answer**',
        '',
        `> ${item.answer}`,
      );
      if (item.gaps.length) {
        lines.push('', '**Gaps**', '', ...item.gaps.map((g) => `- ${g}`));
      }
    }
    lines.push(
      '',
      '```json coach-session',
      JSON.stringify(record, null, 2),
      '```',
      '',
    );
    return lines.join('\n');
  };

  return {
    '0.Inbox/Spaced repetition idea.md': [
      '# Spaced repetition idea',
      '',
      'Try mixing concept notes from [[Building a Second Brain]] with active tasks in [[AI-Workshop]].',
      '',
    ].join('\n'),

    '0.Inbox/Workshop Q&A topics.md': [
      '# Workshop Q&A topics',
      '',
      '- How PARA folders map to the vault graph',
      '- How workstreams stay separate from project notes',
      '- How to connect Claude Code, Codex, or Gemini CLI via MCP',
      '',
    ].join('\n'),

    '1.Projects/AI-Workshop/AI-Workshop.md': [
      '---',
      'status: in-progress',
      `deadline: ${nextWeek}`,
      'done_when: "Workshop delivered live with working vault graph, plans and sparring demo"',
      '---',
      '# AI-Workshop',
      '',
      'Hands-on session showing how to organise notes, plan periods, and learn with ai-coach.',
      '',
      '## Workstreams',
      '',
      '- [[Slides]]',
      '- [[Live Demo]]',
      '- [[Logistics]]',
      '',
      '## Tasks',
      '',
      `- [ ] Send workshop repo link to attendees #S ⏳ ${today}`,
      `- [x] Confirm workshop agenda #S ✅ ${twoDaysAgo}`,
      '',
    ].join('\n'),

    '1.Projects/AI-Workshop/Workstreams/Slides.md': [
      '---',
      'status: in-progress',
      '---',
      '# Slides',
      '',
      'Deck for [[AI-Workshop]] covering [[PARA Method]] and [[CODE Method]].',
      '',
      '## Tasks',
      '',
      `- [x] Draft opening story and PARA overview #M ✅ ${yesterday}`,
      `- [ ] Add vault graph screenshot showing Workstreams and Plans #S ⏳ ${today}`,
      `- [ ] Rehearse transitions end to end #M ⏳ ${tomorrow}`,
      '',
    ].join('\n'),

    '1.Projects/AI-Workshop/Workstreams/Live Demo.md': [
      '---',
      'status: in-progress',
      '---',
      '# Live Demo',
      '',
      'Interactive walkthrough for [[AI-Workshop]] using [[Progressive Summarization]].',
      '',
      '## Tasks',
      '',
      `- [x] Prepare starter vault generator script #L ✅ ${yesterday}`,
      `- [ ] Test graph, plans and climb pages in browser #M ⏳ ${today}`,
      `- [ ] Run one offline sparring round with Gemma #S ⏳ ${tomorrow}`,
      '',
    ].join('\n'),

    '1.Projects/AI-Workshop/Workstreams/Logistics/Logistics.md': [
      '---',
      'status: done',
      '---',
      '# Logistics',
      '',
      'Room, Wi-Fi, and attendee prep for [[AI-Workshop]]. See [[Checklist]].',
      '',
      '## Tasks',
      '',
      `- [x] Book workshop room and projector #M ✅ ${twoDaysAgo}`,
      `- [x] Verify local Wi-Fi and Node 24 instructions #S ✅ ${yesterday}`,
      '',
    ].join('\n'),

    '1.Projects/AI-Workshop/Workstreams/Logistics/Checklist.md': [
      '# Checklist',
      '',
      'Pre-flight checklist for [[Logistics]]:',
      '',
      '- Adapter for projector',
      '- Local Ollama model pre-pulled',
      '- Backup terminal font size increased',
      '',
    ].join('\n'),

    '1.Projects/AI-Workshop/Intermediate Packets/Workshop Setup Checklist.md': [
      '---',
      'project: "[[AI-Workshop]]"',
      'workstream: "[[Logistics]]"',
      '---',
      '# Workshop Setup Checklist',
      '',
      'Reusable checklist harvested from [[AI-Workshop]] / [[Logistics]] following [[Intermediate Packets]].',
      '',
      '1. Run the starter vault script.',
      '2. Open the vault in Obsidian.',
      '3. Start the local browser view.',
      '',
    ].join('\n'),

    '1.Projects/Second Brain Launch/Second Brain Launch.md': [
      '---',
      'status: in-progress',
      `deadline: ${nextMonth}`,
      'done_when: "Personal vault organised in PARA with weekly planning and first book distilled"',
      '---',
      '# Second Brain Launch',
      '',
      'Setting up a personal knowledge and planning system.',
      '',
      '## Workstreams',
      '',
      '- [[Vault Structure]]',
      '- [[Reading Pipeline]]',
      '',
      '## Tasks',
      '',
      `- [x] Create PARA folders and Plans templates #S ✅ ${twoDaysAgo}`,
      '',
    ].join('\n'),

    '1.Projects/Second Brain Launch/Workstreams/Vault Structure.md': [
      '---',
      'status: done',
      '---',
      '# Vault Structure',
      '',
      'Organising notes in [[Second Brain Launch]] using [[PARA Method]].',
      '',
      '## Tasks',
      '',
      `- [x] Move active projects into 1.Projects #M ✅ ${twoDaysAgo}`,
      `- [x] Define personal areas in 2.Areas #S ✅ ${yesterday}`,
      '',
    ].join('\n'),

    '1.Projects/Second Brain Launch/Workstreams/Reading Pipeline.md': [
      '---',
      'status: in-progress',
      '---',
      '# Reading Pipeline',
      '',
      'Distilling [[Building a Second Brain]] into concept notes for [[Second Brain Launch]].',
      '',
      '## Tasks',
      '',
      `- [x] Distil chapter 1 and write summary #M ✅ ${yesterday}`,
      `- [ ] Finish highlighting chapter 2 #M ⏳ ${today}`,
      `- [ ] Synthesise new concept note from chapter 2 #S ⏳ ${tomorrow}`,
      '',
    ].join('\n'),

    '2.Areas/Health/Health.md': [
      '---',
      'status: in-progress',
      '---',
      '# Health',
      '',
      'Daily energy, movement, and sleep.',
      '',
      '## Habits',
      '',
      '- [ ] Walk 30 minutes 🔁 every day',
      '- [ ] Drink 2L of water 🔁 every day',
      '',
      '## Tasks',
      '',
      `- [x] Book annual check-up #S ✅ ${twoDaysAgo}`,
      `- [ ] Plan meals for next week #S ⏳ ${tomorrow}`,
      '',
    ].join('\n'),

    '2.Areas/Learning/Learning.md': [
      '---',
      'status: in-progress',
      '---',
      '# Learning',
      '',
      'Turning reading into durable understanding with [[CODE Method]].',
      '',
      '## Habits',
      '',
      '- [ ] Read 15 pages 🔁 every day',
      '',
      '## Tasks',
      '',
      `- [ ] Review due concept notes with coach spar #S ⏳ ${today}`,
      '',
    ].join('\n'),

    '2.Areas/Public Speaking/Public Speaking.md': [
      '---',
      'status: in-progress',
      '---',
      '# Public Speaking',
      '',
      'Talks, workshops, and community meetups.',
      '',
      '## Tasks',
      '',
      `- [ ] Collect attendee feedback after [[AI-Workshop]] #S ⏳ ${nextWeek}`,
      '',
    ].join('\n'),

    [`${bookDir}/text.md`]: [
      '---',
      'title: "Building a Second Brain"',
      'aliases: ["Building a Second Brain"]',
      'raw_role: "index"',
      `read_on: ${twoDaysAgo}`,
      '---',
      '# Building a Second Brain',
      '',
      'Sample converted source for the workshop.',
      '',
      '## Chapters',
      '',
      `- [[${ch1.replace(/\.md$/, '')}|Chapter 1: Where It All Started]]`,
      `- [[${ch2.replace(/\.md$/, '')}|Chapter 2: What Is a Second Brain]]`,
      `- [[${ch3.replace(/\.md$/, '')}|Chapter 3: How a Second Brain Works]]`,
      '',
    ].join('\n'),

    [ch1]: [
      '---',
      'title: "Chapter 1: Where It All Started"',
      'raw_role: "chapter"',
      'pages: "1-2"',
      '---',
      '# Chapter 1: Where It All Started',
      '',
      '> [!summary]',
      '> Offloading ideas into a trusted external system frees working memory for thinking and creating.',
      '',
      '## Page 1',
      '',
      'Our brains are **for having ideas, not holding them**. When we try to keep every commitment, quote, and insight in our head, ==important thoughts slip away under pressure==.',
      '',
      '## Page 2',
      '',
      'A personal knowledge system turns scattered notes into **building blocks you can reuse across projects**.',
      '',
    ].join('\n'),

    [ch2]: [
      '---',
      'title: "Chapter 2: What Is a Second Brain"',
      'raw_role: "chapter"',
      'pages: "3-4"',
      '---',
      '# Chapter 2: What Is a Second Brain',
      '',
      '> [!summary]',
      '> Capture, organize, distill, and express information by actionability rather than by rigid subject trees.',
      '',
      '## Page 3',
      '',
      'The **CODE method** stands for Capture, Organize, Distill, and Express. Organize notes by **where you will use them, not where you found them**.',
      '',
      '## Page 4',
      '',
      'Actionability beats rigid topic hierarchies when you are trying to ship a real project.',
      '',
    ].join('\n'),

    [ch3]: [
      '---',
      'title: "Chapter 3: How a Second Brain Works"',
      'raw_role: "chapter"',
      'pages: "5-6"',
      '---',
      '# Chapter 3: How a Second Brain Works',
      '',
      '## Page 5',
      '',
      'Progressive Summarization distills a note in layers so your future self can scan the essence in seconds.',
      '',
      '## Page 6',
      '',
      'Intermediate Packets let you assemble larger deliverables from small, finished, reusable pieces.',
      '',
    ].join('\n'),

    '3.Resources/Reading Notes/Building a Second Brain Notes.md': [
      '# Building a Second Brain Notes',
      '',
      'Personal reading notes while going through [[Building a Second Brain]].',
      '',
      `- Loved the core shift in [[${ch1.replace(/\.md$/, '')}|Chapter 1]]: externalise memory so the mind can synthesize.`,
      `- The action-oriented organisation in [[${ch2.replace(/\.md$/, '')}|Chapter 2]] connects directly to [[PARA Method]].`,
      '',
    ].join('\n'),

    '3.Resources/Reading Notes/Building a Second Brain/Chapter 1 Where It All Started.md':
      [
        '---',
        'type: "reading-notes"',
        `chapter: ${JSON.stringify(ch1)}`,
        'book: "Building a Second Brain"',
        '---',
        '',
        '# Reading notes: Chapter 1: Where It All Started',
        '',
        `From [[${ch1.replace(/\.md$/, '')}|Building a Second Brain, Chapter 1: Where It All Started]].`,
        '',
        '## Page 1',
        '',
        `- ${fiveDaysAgo} · Keeping commitments outside my head lowers stress and leaves room for creative synthesis — [[${ch1.replace(/\.md$/, '')}#Page 1|p. 1]]`,
        '',
      ].join('\n'),

    '3.Resources/Reading Notes/Building a Second Brain/Chapter 2 What Is a Second Brain.md':
      [
        '---',
        'type: "reading-notes"',
        `chapter: ${JSON.stringify(ch2)}`,
        'book: "Building a Second Brain"',
        '---',
        '',
        '# Reading notes: Chapter 2: What Is a Second Brain',
        '',
        `From [[${ch2.replace(/\.md$/, '')}|Building a Second Brain, Chapter 2: What Is a Second Brain]].`,
        '',
        '## Page 3',
        '',
        `- ${fiveDaysAgo} · Grouping material by active projects makes it far easier to find when shipping work — [[${ch2.replace(/\.md$/, '')}#Page 3|p. 3]]`,
        '',
      ].join('\n'),

    [structurePath]: [
      '---',
      'type: "structure"',
      'book: "Building a Second Brain"',
      `date: ${JSON.stringify(fourDaysAgo)}`,
      'groups:',
      '  - name: "Capture & Organize"',
      '    concepts:',
      `      - ${JSON.stringify(codeConcept)}`,
      `      - ${JSON.stringify(paraConcept)}`,
      '  - name: "Distill & Express"',
      '    concepts:',
      `      - ${JSON.stringify(progConcept)}`,
      `      - ${JSON.stringify(ipConcept)}`,
      'builds_on:',
      '  - from: "Distill & Express"',
      '    to: "Capture & Organize"',
      '---',
      '# Structure: Building a Second Brain',
      '',
      '## Capture & Organize',
      '',
      '- [[CODE Method]]',
      '- [[PARA Method]]',
      '',
      '## Distill & Express',
      '',
      '- [[Progressive Summarization]]',
      '- [[Intermediate Packets]]',
      '',
      '## Builds on',
      '',
      '- Distill & Express → Capture & Organize',
      '',
    ].join('\n'),

    [codeConcept]: [
      '---',
      'title: "CODE Method"',
      'type: "concept"',
      'coach_id: "workshop-code-method"',
      'core_assertions:',
      '  - "CODE is a four-stage loop: Capture, Organize, Distill, and Express."',
      '  - "Notes are organized by where they will be used, not by where they were found."',
      'forbidden_buzzwords: []',
      'from_notes:',
      '  - "3.Resources/Reading Notes/Building a Second Brain Notes.md"',
      'source_passages:',
      '  - quote: "The CODE method stands for Capture, Organize, Distill, and Express."',
      `    note: ${JSON.stringify(ch2)}`,
      '    pages: "3"',
      '---',
      '# CODE Method',
      '',
      'A four-step loop for turning raw information into finished work: Capture what resonates, Organize for actionability, Distill to the essence, and Express what you know.',
      '',
      `Source: [[${ch2.replace(/\.md$/, '')}|Chapter 2: What Is a Second Brain]].`,
      '',
      'Related: [[PARA Method]], [[Progressive Summarization]].',
      '',
    ].join('\n'),

    [paraConcept]: [
      '---',
      'title: "PARA Method"',
      'type: "concept"',
      'coach_id: "workshop-para-method"',
      'core_assertions:',
      '  - "PARA splits every note into Projects, Areas, Resources, and Archive by actionability."',
      '  - "Actionability beats rigid topic hierarchies when shipping real work."',
      'forbidden_buzzwords: []',
      'from_notes:',
      '  - "3.Resources/Reading Notes/Building a Second Brain Notes.md"',
      'source_passages:',
      '  - quote: "Actionability beats rigid topic hierarchies when you are trying to ship a real project."',
      `    note: ${JSON.stringify(ch2)}`,
      '    pages: "4"',
      '---',
      '# PARA Method',
      '',
      'Organizes every note into four buckets by actionability: Projects (with a deadline), Areas (ongoing standards), Resources (topics of interest), and Archive (inactive items).',
      '',
      `Source: [[${ch2.replace(/\.md$/, '')}|Chapter 2: What Is a Second Brain]].`,
      '',
      'Related: [[CODE Method]].',
      '',
    ].join('\n'),

    [progConcept]: [
      '---',
      'title: "Progressive Summarization"',
      'type: "concept"',
      'coach_id: "workshop-progressive-summarization"',
      'core_assertions:',
      '  - "Notes are distilled in layers over time rather than all at once."',
      '  - "Bold main passages first, then highlight the best of the bold, then write a summary."',
      'forbidden_buzzwords: []',
      'from_notes: []',
      'source_passages:',
      '  - quote: "Progressive Summarization distills a note in layers so your future self can scan the essence in seconds."',
      `    note: ${JSON.stringify(ch3)}`,
      '    pages: "5"',
      '---',
      '# Progressive Summarization',
      '',
      'Distilling a note in layers over time: bold the main passages on the first pass, highlight the best of the bold on the next pass, and write a brief summary in your own words.',
      '',
      `Source: [[${ch3.replace(/\.md$/, '')}|Chapter 3: How a Second Brain Works]].`,
      '',
      'Related: [[CODE Method]], [[Intermediate Packets]].',
      '',
    ].join('\n'),

    [ipConcept]: [
      '---',
      'title: "Intermediate Packets"',
      'type: "concept"',
      'coach_id: "workshop-intermediate-packets"',
      'core_assertions:',
      '  - "Intermediate Packets are small, reusable building blocks harvested from finished work."',
      '  - "Assembling projects from finished packets reduces cold-start friction."',
      'forbidden_buzzwords: []',
      'from_notes: []',
      'source_passages:',
      '  - quote: "Intermediate Packets let you assemble larger deliverables from small, finished, reusable pieces."',
      `    note: ${JSON.stringify(ch3)}`,
      '    pages: "6"',
      '---',
      '# Intermediate Packets',
      '',
      'Small, self-contained building blocks—checklists, outlines, templates, or notes—harvested from finished workstreams so future projects start with momentum.',
      '',
      `Source: [[${ch3.replace(/\.md$/, '')}|Chapter 3: How a Second Brain Works]].`,
      '',
      'Related: [[Progressive Summarization]].',
      '',
    ].join('\n'),

    'Coach/sessions/workshop-01-generate.md': renderSession({
      version: 2,
      kind: 'generate',
      session_id: 'workshop-01-generate',
      tier: 1,
      date: fourDaysAgo,
      recorded_at: `${fourDaysAgo}T09:15:00.000Z`,
      items: [
        {
          coach_id: 'workshop-code-method',
          note_path: codeConcept,
          title: 'CODE Method',
          challenge:
            'Before looking at your note, explain the four steps of CODE and how notes should be organized.',
          answer:
            'Capture what resonates, Organize by where it will be used in active projects, Distill to key points, and Express into outputs.',
          verdict: 'ungraded',
          gaps: [],
          next_review: null,
          generate: {
            attempted_at: `${fourDaysAgo}T09:10:00.000Z`,
            revealed_at: `${fourDaysAgo}T09:14:00.000Z`,
            idk: false,
            marks: [
              {
                assertion:
                  'CODE is a four-stage loop: Capture, Organize, Distill, and Express.',
                mark: 'got it',
              },
              {
                assertion:
                  'Notes are organized by where they will be used, not by where they were found.',
                mark: 'got it',
              },
            ],
          },
        },
        {
          coach_id: 'workshop-para-method',
          note_path: paraConcept,
          title: 'PARA Method',
          challenge:
            'Before looking at your note, list the four PARA folders and the principle behind them.',
          answer:
            'Projects, Areas, Resources, Archive — sorted by how soon you need them for active work.',
          verdict: 'ungraded',
          gaps: [],
          next_review: null,
          generate: {
            attempted_at: `${fourDaysAgo}T09:11:00.000Z`,
            revealed_at: `${fourDaysAgo}T09:14:30.000Z`,
            idk: false,
            marks: [
              {
                assertion:
                  'PARA splits every note into Projects, Areas, Resources, and Archive by actionability.',
                mark: 'got it',
              },
            ],
          },
        },
        {
          coach_id: 'workshop-progressive-summarization',
          note_path: progConcept,
          title: 'Progressive Summarization',
          challenge:
            'Before looking at your note, explain how Progressive Summarization works.',
          answer:
            'You distill a note in layers over multiple visits instead of summarizing everything upfront.',
          verdict: 'ungraded',
          gaps: [],
          next_review: null,
          generate: {
            attempted_at: `${fourDaysAgo}T09:12:00.000Z`,
            revealed_at: `${fourDaysAgo}T09:15:00.000Z`,
            idk: false,
            marks: [
              {
                assertion:
                  'Notes are distilled in layers over time rather than all at once.',
                mark: 'got it',
              },
            ],
          },
        },
      ],
    }),

    'Coach/sessions/workshop-02-spar-t1.md': renderSession({
      version: 2,
      kind: 'spar',
      session_id: 'workshop-02-spar-t1',
      tier: 1,
      date: fourDaysAgo,
      recorded_at: `${fourDaysAgo}T10:00:00.000Z`,
      items: [
        {
          coach_id: 'workshop-code-method',
          note_path: codeConcept,
          title: 'CODE Method',
          challenge:
            'Explain the CODE method to a newcomer and why organization follows actionability.',
          answer:
            'CODE moves ideas from Capture to Organize, Distill, and Express. Filing by active project instead of broad subject means notes surface exactly when you need them to deliver.',
          verdict: 'pass',
          gaps: [],
          next_review: twoDaysAgo,
        },
        {
          coach_id: 'workshop-para-method',
          note_path: paraConcept,
          title: 'PARA Method',
          challenge:
            'How does PARA decide where a new note belongs compared to traditional topic folders?',
          answer:
            'PARA places notes by actionability: Projects have a deadline, Areas are ongoing standards, Resources hold reference material, and Archive stores inactive work.',
          verdict: 'pass',
          gaps: [],
          next_review: tomorrow,
        },
        {
          coach_id: 'workshop-progressive-summarization',
          note_path: progConcept,
          title: 'Progressive Summarization',
          challenge:
            'Walk through the layers of Progressive Summarization and when you apply each layer.',
          answer:
            'You highlight the best sentences right away when reading so the note stays short.',
          verdict: 'fail',
          gaps: [
            'Skipped the first bolding layer and described summarizing all at once instead of across visits.',
          ],
          next_review: today,
        },
      ],
    }),

    'Coach/sessions/workshop-03-elaborate.md': renderSession({
      version: 2,
      kind: 'elaborate',
      session_id: 'workshop-03-elaborate',
      tier: 1,
      date: threeDaysAgo,
      recorded_at: `${threeDaysAgo}T11:00:00.000Z`,
      items: [
        {
          coach_id: 'workshop-code-method',
          note_path: codeConcept,
          title: 'CODE Method',
          challenge:
            'Explain why CODE works, how it connects to PARA, and where you would apply it.',
          answer:
            'It separates collecting from creating so neither stalls the other; Organize maps directly to PARA folders, and I apply it when turning book notes into workshop slides.',
          verdict: 'ungraded',
          gaps: [],
          next_review: null,
          elaborate: {
            answers: [
              {
                kind: 'why',
                question: 'Why does separating Capture from Express work?',
                answer:
                  'It prevents perfectionism during reading while keeping material ready for creation.',
                links: [],
              },
              {
                kind: 'connect',
                question: 'How does CODE connect to PARA?',
                answer:
                  'PARA provides the four actionability buckets used in the Organize step.',
                links: [paraConcept],
              },
              {
                kind: 'apply',
                question: 'Where would you apply CODE this week?',
                answer:
                  'Turning chapters from Building a Second Brain into slides for AI-Workshop.',
                links: [],
              },
            ],
          },
        },
        {
          coach_id: 'workshop-para-method',
          note_path: paraConcept,
          title: 'PARA Method',
          challenge:
            'Explain why PARA works, how it connects to CODE, and where you use it.',
          answer:
            'It matches how work actually happens around deadlines; it powers the Organize step of CODE, and I use it to separate active workshops from long-term areas.',
          verdict: 'ungraded',
          gaps: [],
          next_review: null,
          elaborate: {
            answers: [
              {
                kind: 'why',
                question: 'Why does actionability beat topic trees?',
                answer:
                  'Topic trees force guessing categories upfront, while active projects make the right folder obvious.',
                links: [],
              },
              {
                kind: 'connect',
                question: 'How does PARA connect to CODE?',
                answer: 'It is the concrete structure behind CODE Organize.',
                links: [codeConcept],
              },
              {
                kind: 'apply',
                question: 'Where do you apply PARA?',
                answer:
                  'Keeping workshop deliverables in 1.Projects and daily habits in 2.Areas.',
                links: [],
              },
            ],
          },
        },
      ],
    }),

    'Coach/sessions/workshop-04-space.md': renderSession({
      version: 2,
      kind: 'spar',
      session_id: 'workshop-04-space',
      tier: 1,
      date: twoDaysAgo,
      recorded_at: `${twoDaysAgo}T10:30:00.000Z`,
      items: [
        {
          coach_id: 'workshop-code-method',
          note_path: codeConcept,
          title: 'CODE Method',
          challenge:
            'Recall the CODE loop from memory and explain how Organize differs from archiving by topic.',
          answer:
            'Capture, Organize, Distill, Express: you file notes where they will be used in an active project or area rather than where you happened to find them.',
          verdict: 'pass',
          gaps: [],
          next_review: nextWeek,
        },
      ],
    }),

    'Coach/sessions/workshop-05-judge-t2.md': renderSession({
      version: 2,
      kind: 'spar',
      session_id: 'workshop-05-judge-t2',
      tier: 2,
      date: twoDaysAgo,
      recorded_at: `${twoDaysAgo}T11:00:00.000Z`,
      items: [
        {
          coach_id: 'workshop-code-method',
          note_path: codeConcept,
          title: 'CODE Method',
          challenge:
            'Recall the CODE loop from memory and explain how Organize differs from archiving by topic.',
          answer:
            'Capture, Organize, Distill, Express: you file notes where they will be used in an active project or area rather than where you happened to find them.',
          verdict: 'pass',
          gaps: [],
          next_review: nextWeek,
        },
      ],
    }),

    'Coach/sessions/workshop-06-teach.md': renderSession({
      version: 2,
      kind: 'teach',
      session_id: 'workshop-06-teach',
      tier: 1,
      date: yesterday,
      recorded_at: `${yesterday}T14:00:00.000Z`,
      items: [
        {
          coach_id: 'workshop-code-method',
          note_path: codeConcept,
          title: 'CODE Method',
          challenge:
            'Teach CODE Method to a student who thinks notes should be sorted by book title forever.',
          answer:
            'Sorting by book title helps you remember where a quote came from, not where you need it. In CODE you organize by active project so every note feeds the work you are actually shipping.',
          verdict: 'pass',
          gaps: [],
          next_review: nextMonth,
          teach: {
            turns: [
              {
                role: 'student',
                text: 'Should I keep all my notes in folders named after each book?',
              },
              {
                role: 'learner',
                text: 'Only raw sources stay by book. Concept notes move into CODE Organize by where you will use them next.',
              },
            ],
            misconception: {
              assertion: 1,
              text: 'Notes should stay filed by where you found them instead of where you will use them.',
            },
            misconception_corrected: true,
            unresolved_terms: [],
          },
        },
      ],
    }),

    '4.Archive/Past Meetup 2025/Past Meetup 2025.md': [
      '---',
      'status: done',
      'deadline: 2025-11-15',
      'done_when: "Community meetup hosted and retrospective shared"',
      '---',
      '# Past Meetup 2025',
      '',
      'Archived example project.',
      '',
      '## Workstreams',
      '',
      '- [[Venue]]',
      '',
    ].join('\n'),

    '4.Archive/Past Meetup 2025/Workstreams/Venue.md': [
      '---',
      'status: done',
      '---',
      '# Venue',
      '',
      '## Tasks',
      '',
      '- [x] Confirm venue booking and chairs #M ✅ 2025-11-10',
      '',
    ].join('\n'),

    'Plans/Templates/Yearly.md': [
      '# {{title}}',
      '',
      '## Goals',
      '',
      '## Review',
      '',
    ].join('\n'),

    'Plans/Templates/Quarterly.md': [
      '# {{title}}',
      '',
      '## Goals',
      '',
      '## Review',
      '',
    ].join('\n'),

    'Plans/Templates/Monthly.md': [
      '# {{title}}',
      '',
      '## Goals',
      '',
      '## Scheduled',
      '',
      '```tasks',
      'not done',
      'scheduled in {{title}}',
      'group by folder',
      '```',
      '',
      '## Ad-hoc',
      '',
      '## Review',
      '',
    ].join('\n'),

    'Plans/Templates/Weekly.md': [
      '# {{title}}',
      '',
      '## Goals',
      '',
      '## This week',
      '',
      '```tasks',
      'not done',
      'scheduled in {{title}}',
      'group by folder',
      '```',
      '',
      '## Ad-hoc',
      '',
      '## Done',
      '',
      '```tasks',
      'done in {{title}}',
      'group by folder',
      '```',
      '',
      '## Review',
      '',
    ].join('\n'),

    'Plans/Templates/Daily.md': [
      '# {{title}}',
      '',
      '## Today',
      '',
      '```tasks',
      'not done',
      'scheduled on or before {{title}}',
      'group by folder',
      '```',
      '',
      '## Habits',
      '',
      '## Ad-hoc',
      '',
      '## Done',
      '',
      '```tasks',
      'done on {{title}}',
      '```',
      '',
      '## Log',
      '',
    ].join('\n'),

    [`Plans/Yearly/${year}.md`]: [
      `# ${year}`,
      '',
      '## Goals',
      '',
      '- [ ] Teach practical AI workflows through workshops and talks [[Public Speaking]] ^speaking',
      '- [ ] Build a daily second-brain learning and planning habit [[Learning]] ^second-brain',
      '',
      '## Review',
      '',
    ].join('\n'),

    [`Plans/Quarterly/${quarter}.md`]: [
      `# ${quarter}`,
      '',
      '## Goals',
      '',
      `- [ ] Deliver [[AI-Workshop]] with a reusable starter vault ↑ [[${year}#^speaking]] ^workshop`,
      `- [ ] Launch [[Second Brain Launch]] and distil first book ↑ [[${year}#^second-brain]] ^launch`,
      '',
      '## Review',
      '',
    ].join('\n'),

    [`Plans/Monthly/${month}.md`]: [
      `# ${month}`,
      '',
      '## Goals',
      '',
      `- [ ] Finalise [[Slides]] and [[Live Demo]] for [[AI-Workshop]] ↑ [[${quarter}#^workshop]] ^demo-ready`,
      `- [ ] Distil chapters 1-3 in [[Reading Pipeline]] ↑ [[${quarter}#^launch]] ^distil-book`,
      '',
      '## Scheduled',
      '',
      '```tasks',
      'not done',
      `scheduled in ${month}`,
      'group by folder',
      '```',
      '',
      '## Ad-hoc',
      '',
      '## Review',
      '',
    ].join('\n'),

    [`Plans/Weekly/${week}.md`]: [
      `# ${week}`,
      '',
      '## Goals',
      '',
      `- [ ] Complete dry run of [[Live Demo]] ↑ [[${month}#^demo-ready]] ^dry-run`,
      `- [ ] Highlight chapter 2 in [[Reading Pipeline]] ↑ [[${month}#^distil-book]] ^ch2`,
      '',
      '## This week',
      '',
      '```tasks',
      'not done',
      `scheduled in ${week}`,
      'group by folder',
      '```',
      '',
      '## Ad-hoc',
      '',
      `- [x] Share pre-workshop install steps [[AI-Workshop]] #S ✅ ${yesterday}`,
      '',
      '## Done',
      '',
      '```tasks',
      `done in ${week}`,
      'group by folder',
      '```',
      '',
      '## Review',
      '',
    ].join('\n'),

    [`Plans/Daily/${year}/${monthDir}/${today}.md`]: [
      `# ${today}`,
      '',
      '## Today',
      '',
      '```tasks',
      'not done',
      `scheduled on or before ${today}`,
      'group by folder',
      '```',
      '',
      '## Habits',
      '',
      `- [x] Walk 30 minutes [[Health]] ✅ ${today}`,
      '- [ ] Drink 2L of water [[Health]]',
      '- [ ] Read 15 pages [[Learning]]',
      '',
      '## Ad-hoc',
      '',
      `- [ ] Double-check browser zoom level for [[Live Demo]] #S ⏳ ${today}`,
      '',
      '## Done',
      '',
      '```tasks',
      `done on ${today}`,
      '```',
      '',
      '## Log',
      '',
      'Generated the workshop starter vault and opened the graph view.',
      '',
    ].join('\n'),

    'Scratchpad.md': [
      '# Scratchpad',
      '',
      'An unfiled note at the vault root so you can see the "Out of place" category in the graph and try `coach file`.',
      '',
    ].join('\n'),
  };
}

function writeVault(targetDir, files, force) {
  if (existsSync(targetDir)) {
    const entries = readdirSync(targetDir);
    if (entries.length > 0 && !force) {
      throw new Error(
        `Target folder already exists and is not empty: ${targetDir}\nUse --force to reset it, or --dir <path> to choose another location.`,
      );
    }
    if (force) {
      rmSync(targetDir, { recursive: true, force: true });
    }
  }

  mkdirSync(targetDir, { recursive: true });
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(targetDir, ...relPath.split('/'));
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
  }
}

function writeConfigs(vaultDir, overwriteConfig) {
  const results = [];
  const configPath = join(REPO_ROOT, 'coach.config.json');
  if (!existsSync(configPath) || overwriteConfig) {
    const config = {
      vault: vaultDir,
      ollama: {
        model: 'gemma3:latest',
        host: 'http://127.0.0.1:11434',
        contextWindow: 16384,
      },
      judge: {
        model: 'gemini-4-argon',
        fallbackModel: 'gemini-3.8-flash',
        thinkingLevel: 'MEDIUM',
        includeAssertions: true,
      },
    };
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
    results.push(`wrote ${configPath}`);
  } else {
    results.push(
      `kept existing ${configPath} (pass --overwrite-config to replace)`,
    );
  }

  const mcpPath = join(REPO_ROOT, '.mcp.json');
  if (!existsSync(mcpPath) || overwriteConfig) {
    const serverBin = join(
      REPO_ROOT,
      'apps',
      'vault-server',
      'dist',
      'main.js',
    );
    const mcp = {
      mcpServers: {
        'life-vault': {
          command: 'node',
          args: [serverBin, 'serve', '--vault', vaultDir],
        },
      },
    };
    writeFileSync(mcpPath, `${JSON.stringify(mcp, null, 2)}\n`, 'utf-8');
    results.push(`wrote ${mcpPath}`);
  } else {
    results.push(
      `kept existing ${mcpPath} (pass --overwrite-config to replace)`,
    );
  }

  return results;
}

function printHelp() {
  console.log(
    [
      'Usage: npm run workshop:setup -- [options]',
      '',
      'Creates a ready-to-explore Obsidian starter vault with PARA folders,',
      'projects, workstreams, areas, habits, plans, a sample book, and concept notes.',
      '',
      'Options:',
      `  --dir <path>        Target folder (default: ${defaultVaultDir()})`,
      '  --force             Overwrite an existing non-empty target folder',
      '  --overwrite-config  Replace existing coach.config.json and .mcp.json',
      '  --no-config         Skip writing coach.config.json and .mcp.json',
      '  -h, --help          Show this help message',
    ].join('\n'),
  );
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      dir: { type: 'string' },
      force: { type: 'boolean', default: false },
      'overwrite-config': { type: 'boolean', default: false },
      'no-config': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  if (values.help) {
    printHelp();
    return;
  }

  const rawDir = values.dir ?? positionals[0];
  const targetDir = rawDir ? resolve(expandHome(rawDir)) : defaultVaultDir();
  const files = buildFiles(new Date());

  writeVault(targetDir, files, values.force);

  console.log(`Created workshop vault (${Object.keys(files).length} notes):`);
  console.log(`  ${targetDir}`);

  if (!values['no-config']) {
    const configNotes = writeConfigs(targetDir, values['overwrite-config']);
    console.log('');
    for (const line of configNotes) console.log(`  ${line}`);
  }

  const built = existsSync(
    join(REPO_ROOT, 'apps', 'vault-server', 'dist', 'main.js'),
  );
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Open "${targetDir}" as a vault in Obsidian`);
  if (!built) {
    console.log('  2. Build the workspace:  npx nx run-many -t build');
    console.log('  3. Start the vault view: npm run coach -- view');
    console.log('  4. Open http://127.0.0.1:4747 in your browser');
  } else {
    console.log('  2. Start the vault view: npm run coach -- view');
    console.log('  3. Open http://127.0.0.1:4747 in your browser');
  }
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
