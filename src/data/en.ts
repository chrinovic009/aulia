// ENGLISH content of the portal (default language). Same structure as fr.ts.
import type { Content, Entity } from './types.ts';
import type { RouteKey } from '../i18n.ts';
import { CONTACT_ENDPOINT, CONTACT_EMAIL, SOCIALS } from './config.ts';

const statusLabel = {
  live: 'Available',
  pilot: 'Pilot',
  dev: 'In development',
  design: 'In design',
  explore: 'Exploration',
  target: 'Target architecture',
};

const site = {
  name: 'AULIA',
  signature: 'Building Intelligence. Transforming Systems.',
  tagline: 'Science, intelligence and engineering in service of essential systems.',
  description:
    'AULIA designs and builds specialised technology companies that put science, intelligence and innovation at the service of organisations and essential systems.',
  contactEndpoint: CONTACT_ENDPOINT,
  contactEmail: CONTACT_EMAIL,
  socials: SOCIALS,
};

const nav: { key: RouteKey; label: string }[] = [
  { key: 'about', label: 'About' },
  { key: 'vision', label: 'Our vision' },
  { key: 'ecosystem', label: 'Ecosystem' },
  { key: 'anima', label: 'ANIMA' },
  { key: 'research', label: 'Research & Innovation' },
  { key: 'partnerships', label: 'Partnerships' },
];

const doctrine = [
  {
    word: 'Understand',
    en: 'Comprendre',
    short: 'Study phenomena before claiming to master them.',
    long: 'Study systems, problems, environments and their mechanisms. Every AULIA project starts by observing the field, not with technology.',
  },
  {
    word: 'Anticipate',
    en: 'Anticiper',
    short: 'Identify the risks, needs and changes ahead.',
    long: 'Use data, knowledge and intelligence to foresee changes and risks, rather than merely recording events.',
  },
  {
    word: 'Create',
    en: 'Créer',
    short: 'Turn knowledge into concrete solutions.',
    long: 'Design solutions, technologies and organisations suited to real needs — ones we can build, deploy, maintain and improve.',
  },
  {
    word: 'Protect',
    en: 'Protéger',
    short: 'Preserve life, data, systems and legitimate interests.',
    long: 'Preserve people, data, infrastructure, resources and the continuity of systems. Security is an architectural requirement, not an option.',
  },
  {
    word: 'Transform',
    en: 'Transformer',
    short: 'Make innovation produce real change.',
    long: 'Convert knowledge and innovation into concrete, measurable and lasting change in the organisations that adopt them.',
  },
];

const purpose = {
  raison:
    'To design, build and grow companies capable of putting intelligence, science and technology at the service of people, organisations and essential systems.',
  mission:
    'To create, develop and support specialised companies that turn scientific and technological knowledge into intelligent, reliable and useful solutions, while sharing a coherent vision, technologies, resources and governance.',
  vision:
    'To become a leading technology group, recognised for its ability to design and coordinate specialised companies capable of understanding, anticipating, protecting and transforming complex systems.',
};

const name = [
  {
    letters: 'AU',
    latin: 'Aurum',
    title: 'Gold',
    text: 'What keeps its value and resists corruption. Nobility, permanence, incorruptibility.',
  },
  {
    letters: 'LI',
    latin: 'Lux',
    title: 'Light',
    text: 'Knowledge, truth, understanding and the ability to shed light on what remains obscure.',
  },
  {
    letters: 'A',
    latin: 'Anima quae agit',
    title: 'The soul that acts',
    text: 'Intention turned into movement, thought turned into work, vision turned into reality.',
  },
];

const entities: Entity[] = [
  {
    slug: 'care',
    name: 'AULIA Care',
    short: 'CARE',
    sector: 'Health & medical information systems',
    status: 'pilot',
    tagline: 'Technology in service of medical intelligence.',
    summary:
      'Infrastructure that helps healthcare facilities organise, protect and make use of their medical and administrative information.',
    presentation: [
      'AULIA Care does not see itself as hospital management software. Its purpose is to turn medical information into knowledge that is organised, accessible, reliable and usable at the right moment.',
      'Medical information should follow the patient throughout their care journey, rather than remain trapped in departments, documents or isolated systems.',
    ],
    problems: [
      'Records kept on paper, hard to find and at risk of being lost.',
      'Medical history and test results that are not centralised.',
      'Information that flows poorly between departments.',
      'Clinicians who see a patient without access to their full history.',
    ],
    mission:
      'To give healthcare facilities the means to master their information, improve their organisation and raise the quality of care — never replacing the judgement of health professionals.',
    capabilities: [
      {
        title: 'AULIA Care Core',
        text: 'The operational foundation: patients, medical records, consultations, admissions, users, departments and administration. Priorities: reliability, security, traceability, data consistency.',
        status: 'pilot',
      },
      {
        title: 'Diagnostic Agent',
        text: 'A clinical assistance layer: extracting and structuring information, summaries, risk-factor detection, and justified lines of investigation submitted to the professional.',
        status: 'design',
      },
      {
        title: 'Connected Care',
        text: 'Secure interoperability: continuity of records between authorised facilities, controlled sharing, integration of compatible systems and equipment.',
        status: 'design',
      },
    ],
    architecture: [
      {
        title: 'The Core works on its own',
        text: 'A facility can run an operational infrastructure without having to use artificial intelligence. Intelligence enriches the foundation; connectivity extends it.',
      },
      {
        title: 'Data sovereignty',
        text: 'Deployment within the facility’s own infrastructure where appropriate, role-based access control, logging of sensitive operations, backup and recovery.',
      },
      {
        title: 'Prove before scaling',
        text: 'Consolidate the Core, earn trust in the field, then develop clinical intelligence with proper validation, and finally extend connectivity.',
      },
    ],
    demo: {
      label: 'Discover the AULIA Care platform',
      href: 'https://aulia-care.vercel.app',
      note: 'The subsidiary’s presentation website.',
    },
    ecosystem:
      'AULIA Care is the priority subsidiary of the group’s first phase: it must demonstrate AULIA’s ability to build a useful solution, win over facilities and establish credibility.',
    animaLink:
      'In time, ANIMA could help structure observations dictated by a professional — including in Swahili — and highlight the points to be validated. This integration belongs to the target architecture.',
  },
  {
    slug: 'vigil',
    name: 'AULIA Vigil',
    short: 'VIGIL',
    sector: 'Industry, monitoring & operational intelligence',
    status: 'design',
    tagline: 'See, understand and anticipate what affects your installations.',
    summary: 'Monitoring industrial equipment and installations, detecting anomalies and anticipating failures.',
    presentation: [
      'AULIA Vigil is designed to monitor, understand and anticipate the events that can affect equipment, infrastructure and industrial environments.',
      'In sectors such as mining, a single breakdown can mean considerable losses. Sensors, data analysis and artificial intelligence can change that reality.',
    ],
    problems: [
      'Failures discovered too late, after production has stopped.',
      'Machine data that is produced but rarely used.',
      'Large installations that are hard to monitor continuously.',
      'Numerous alerts with little context.',
    ],
    mission:
      'To support the continuity of industrial operations by giving teams a reliable view of the condition of their equipment and installations.',
    capabilities: [
      { title: 'Industrial data acquisition', text: 'Connecting to machines, PLCs and sensors.', status: 'design' },
      { title: 'Anomaly detection', text: 'Analysing unusual equipment behaviour.', status: 'design' },
      { title: 'Predictive maintenance', text: 'Anticipating failures from historical data.', status: 'design' },
      { title: 'Event analysis', text: 'Using events from cameras and sensors, with explicit confidence levels.', status: 'design' },
    ],
    architecture: [
      { title: 'From sensor to decision', text: 'Acquisition, normalisation, detection, contextualisation, then a qualified alert to the teams.' },
      { title: 'Field robustness', text: 'Designed for sites where connectivity may be limited.' },
      { title: 'Careful interpretation', text: 'A detection is never presented as certain proof; it comes with its context and its confidence level.' },
    ],
    ecosystem: 'AULIA Vigil will have to prove its industrial value in the field before extending its scope.',
    animaLink:
      'ANIMA could cross-reference a detected event with authorised logistics data to reduce misinterpretation. A target-architecture possibility.',
  },
  {
    slug: 'flow',
    name: 'AULIA Flow',
    short: 'FLOW',
    sector: 'Organisational & operational intelligence',
    status: 'design',
    tagline: 'Master the flow of information, resources and operations.',
    summary:
      'Helping organisations master their operations, resources, finances, production and information flows.',
    presentation: [
      'AULIA Flow aims to improve how information, resources and operations move within organisations.',
      'It should make it possible to understand how resources and information circulate, where they get stuck and what needs to be anticipated.',
    ],
    problems: [
      'Information scattered across tools, files and departments.',
      'Stock-outs and delays discovered too late.',
      'Limited visibility over operations and performance.',
      'Difficult coordination between teams and sites.',
    ],
    mission: 'To give organisations a clear, up-to-date view of their flows so they can decide earlier and coordinate better.',
    capabilities: [
      { title: 'Resources & procurement', text: 'Tracking stock, logistics and supply.', status: 'design' },
      { title: 'Operations & production', text: 'Tracking operations and coordinating activities.', status: 'design' },
      { title: 'Finance & performance', text: 'Financial tracking and performance indicators.', status: 'design' },
      { title: 'Operational forecasting', text: 'Analysing flows and anticipating pressure points.', status: 'design' },
    ],
    architecture: [
      { title: 'A unified view', text: 'Connecting operational data that today lives in separate systems.' },
      { title: 'Visible flows', text: 'Visualising processes to spot bottlenecks.' },
      { title: 'Prepared decisions', text: 'Proposing actions, always subject to validation.' },
    ],
    ecosystem: 'AULIA Flow carries the organisational dimension of the ecosystem.',
    animaLink:
      'ANIMA could detect a stock-out risk, explain its causes and prepare a redistribution subject to validation. A target-architecture possibility.',
  },
  {
    slug: 'vr',
    name: 'AULIA VR',
    short: 'VR',
    sector: 'Virtual reality, simulation & immersive environments',
    status: 'explore',
    tagline: 'Exploring what immersion makes it possible to learn, simulate and understand.',
    summary:
      'Exploring virtual reality for simulation, training, learning and interactive experiences.',
    presentation: [
      'AULIA VR is an exploratory branch dedicated to immersive technologies.',
      'Its first work aims to identify the uses where immersion brings real value: training without risk, simulating before acting, making complex systems visible.',
    ],
    problems: [
      'Hands-on training that is costly or risky in real conditions.',
      'Complex systems that are hard to picture.',
      'Limited access to interactive learning environments.',
    ],
    mission: 'To design immersive environments that are useful for learning, simulating and understanding.',
    capabilities: [
      { title: 'Immersive training', text: 'Learning gestures and procedures in a virtual environment.', status: 'explore' },
      { title: 'Simulation', text: 'Recreating situations to practise and decide.', status: 'explore' },
      { title: 'Systems visualisation', text: 'Spatial representation of complex systems.', status: 'explore' },
      { title: 'Interactive experiences', text: 'Educational and entertainment applications.', status: 'explore' },
    ],
    architecture: [
      { title: 'Start from use cases', text: 'Validate the value of immersion before investing in production.' },
      { title: 'Depth and interaction', text: 'Spatial environments designed for action.' },
    ],
    ecosystem: 'AULIA VR is presented as a branch in development: no product is commercially available today.',
    animaLink: 'The links between AULIA VR and ANIMA remain to be defined.',
  },
];

const anima = {
  status: 'target' as const,
  motto: ['Perceive', 'Understand', 'Anticipate', 'Coordinate', 'Act'],
  mottoEn: ['Percevoir', 'Comprendre', 'Anticiper', 'Coordonner', 'Agir'],
  capabilities: [
    { name: 'Perception', text: 'Receiving information from text, conversations, images, video and sensors.' },
    { name: 'Understanding', text: 'Interpreting information in light of its context and defined objectives.' },
    { name: 'Memory', text: 'Drawing on authorised, structured and controlled knowledge and history.' },
    { name: 'Reasoning', text: 'Analysing situations, establishing relationships, comparing hypotheses and building plans.' },
    { name: 'Anticipation', text: 'Identifying trends, estimating risks and forecasting changes from available data.' },
    { name: 'Coordination', text: 'Orchestrating interactions between specialised systems.' },
    { name: 'Action', text: 'Executing authorised operations, in line with permissions, validations and security rules.' },
  ],
  modules: [
    { id: 'core', name: 'ANIMA Core', role: 'Coordination kernel' },
    { id: 'perception', name: 'Perception', role: 'Receiving and interpreting information' },
    { id: 'memory', name: 'Memory', role: 'Knowledge and memory' },
    { id: 'reasoning', name: 'Reasoning', role: 'Analysis, reasoning, planning' },
    { id: 'orchestrator', name: 'Orchestrator', role: 'Coordinating systems and agents' },
    { id: 'action', name: 'Action Engine', role: 'Controlled execution of operations' },
    { id: 'governance', name: 'Governance', role: 'Security, permissions, traceability' },
  ],
  scenarios: [
    {
      id: 'A',
      title: 'Structuring a clinical observation',
      systems: ['CARE'],
      context: 'A health professional dictates an observation in Swahili.',
      steps: [
        'Language recognition',
        'Information extraction',
        'Data structuring',
        'Highlighting signs that need attention',
        'Presentation to the professional for validation',
      ],
      guard: 'ANIMA is not a doctor: every element remains subject to the judgement and responsibility of the professional.',
    },
    {
      id: 'B',
      title: 'Putting a detected event in context',
      systems: ['VIGIL', 'FLOW'],
      context: 'A camera detects movement in a warehouse at an unusual hour.',
      steps: [
        'Event received',
        'Search for authorised context',
        'A delivery is scheduled at that time',
        'Revised interpretation and confidence level',
        'Team informed',
      ],
      guard: 'A detection is never presented as proof of a person’s identity or intent.',
    },
    {
      id: 'C',
      title: 'Anticipating a stock-out',
      systems: ['FLOW'],
      context: 'Consumption is rising at some sites.',
      steps: [
        'Risk identified',
        'Causes explained',
        'Available stock compared',
        'Redistribution proposed',
        'Operation prepared, awaiting validation',
      ],
      guard: 'Actually executing a transfer depends on the applicable permissions and rules.',
    },
  ],
  sovereignty: [
    { title: 'Data ownership', text: 'Data remains under the control of its legitimate holders.' },
    { title: 'Local deployment', text: 'An architecture designed to run close to the field when needed.' },
    { title: 'Offline, where possible', text: 'Aiming for offline operation for compatible functions.' },
    { title: 'Local languages', text: 'Working on understanding Swahili, Lingala and field languages.' },
    { title: 'Access control', text: 'Explicit permissions; human validation for significant actions.' },
    { title: 'Traceability', text: 'Logging of operations and governance of models and knowledge.' },
  ],
};

const research = [
  { title: 'Artificial intelligence', text: 'Understanding models rather than just using them: mathematics, linear algebra, probability and statistics.' },
  { title: 'Cognitive systems', text: 'Neuroscience and cognitive mechanisms as inspiration for perception, memory and reasoning.' },
  { title: 'Automation', text: 'Controlled execution of operations, with explicit permissions and validations.' },
  { title: 'Industrial computing', text: 'Acquiring and using data from machines, PLCs and sensors.' },
  { title: 'Data & distributed systems', text: 'Autonomous, distributed architectures able to run with limited connectivity.' },
  { title: 'Immersive technologies', text: 'Simulation, training and visualisation of complex systems.' },
  { title: 'Infrastructure interconnection', text: 'Secure interoperability between systems and facilities.' },
  { title: 'Human-machine interaction', text: 'Interfaces that make intelligence understandable and controllable.' },
];

export const en: Content = { statusLabel, site, nav, doctrine, purpose, name, entities, anima, research };
