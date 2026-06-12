import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TUTOR_COUNT = 15;
const DATA_FILE   = path.resolve(__dirname, 'test-data.json');
const LOCK_FILE   = path.resolve(__dirname, 'test-data.lock');

interface TutorCredential {
  type:        'tutor';
  runId:       string;
  timestamp:   string;
  workerIndex: number;
  firstName:   string;
  middleName:  string;
  lastName:    string;
  email:       string;
  password:    string;
  phone:       string;
  dob:         string;
  pincode:     string;
  address:     string;
}

interface DataStore {
  lastBatchRun: string | null;
  tutors:       TutorCredential[];
  students:     any[];
}

function acquireLock(timeoutMs = 10_000): void {
  const start = Date.now();
  while (fs.existsSync(LOCK_FILE)) {
    if (Date.now() - start > timeoutMs) { fs.rmSync(LOCK_FILE, { force: true }); break; }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid));
}

function releaseLock(): void { fs.rmSync(LOCK_FILE, { force: true }); }

function loadStore(): DataStore {
  if (!fs.existsSync(DATA_FILE)) return { lastBatchRun: null, tutors: [], students: [] };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as DataStore; }
  catch { return { lastBatchRun: null, tutors: [], students: [] }; }
}

function appendTutor(cred: TutorCredential): void {
  acquireLock();
  try {
    const store = loadStore();
    if (!store.tutors)   store.tutors   = [];
    if (!store.students) store.students = [];
    store.tutors.push(cred);
    store.lastBatchRun = cred.timestamp;
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } finally { releaseLock(); }
}

const ri  = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const rc  = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const FIRST_NAMES  = ['Shraddha','Priya','Anjali','Neha','Pooja','Kavya','Meera','Divya','Sneha','Ritu','Sunita','Anita','Rekha','Geeta','Sonal','Deepika','Priyanka','Ruchika','Manisha','Swati'];
const MIDDLE_NAMES = ['Akansha','Kumari','Devi','Rani','Lata','Mala','Prabha','Sudha','Vimla','Shanti'];
const LAST_NAMES   = ['Tiwari','Sharma','Verma','Gupta','Joshi','Patil','Desai','Nair','Iyer','Mehta','Singh','Rao','Kulkarni','Mishra','Pandey','Chaudhary','Dubey','Tripathi','Shukla','Yadav'];
const BUILDINGS    = ['Lal Bahadur Dubey Building','Shree Ram Complex','Ganesh Niwas','Sai Krupa Apartments','Lotus Heights','Tulsi Tower','Krishna Niwas','Saraswati Heights','Sanjana Heights'];
const AREAS        = ['Meghwadi Jogeshwari (E)','Andheri West','Borivali East','Kandivali West','Malad East','Goregaon West','Ghatkopar East','Vikhroli West'];
const KA_PINS      = ['560','562','563','570','572','576','580','585','590','591'];

function randomPhone(): string {
  return rc(['6','7','8','9']) + Array.from({length:9}, () => ri(0,9)).join('');
}

function randomPassword(): string {
  const U='ABCDEFGHJKLMNPQRSTUVWXYZ', L='abcdefghjkmnpqrstuvwxyz', D='23456789', S='@#$!%*?&';
  const pick = (s:string,n:number) => Array.from({length:n},()=>s[ri(0,s.length-1)]).join('');
  return (pick(U,2)+pick(L,4)+pick(D,2)+pick(S,2)).split('').sort(()=>Math.random()-0.5).join('');
}

function buildEmail(first:string, last:string, worker:number): string {
  return `${first.toLowerCase()}${rc(['.','_',''])}${last.toLowerCase()}${ri(100,999)}w${worker}@gmail.com`;
}

function randomDOB(): string {
  return `${ri(1984,2004)}-${String(ri(1,12)).padStart(2,'0')}-${String(ri(1,28)).padStart(2,'0')}`;
}

function randomAddress(): string {
  return `Flat ${ri(1,20)}${rc(['A','B','C','D'])}, ${rc(BUILDINGS)}, ${rc(AREAS)}`;
}

for (const tutorNumber of Array.from({length: TUTOR_COUNT}, (_, i) => i + 1)) {
  test(`Signup tutor ${tutorNumber} of ${TUTOR_COUNT}`, async ({ page, context }, testInfo) => {
    test.setTimeout(120000);
    const workerIndex = testInfo.workerIndex;
    
    const firstName  = rc(FIRST_NAMES);
    const middleName = rc(MIDDLE_NAMES);
    const lastName   = rc(LAST_NAMES);
    const email      = buildEmail(firstName, lastName, workerIndex);
    const password   = randomPassword();
    const phone      = randomPhone();
    const dob        = randomDOB();
    const pincode    = rc(KA_PINS) + String(ri(0,999)).padStart(3,'0');
    const age        = String(ri(21,40));
    const address    = randomAddress();
    const gender     = rc(['male','female']);
    const runId      = `tutor_${tutorNumber}_w${workerIndex}_${Date.now()}`;

    console.log(`\n[Worker ${workerIndex}] 🚀 Tutor ${tutorNumber}: ${email}`);

    await page.goto('https://pl.meghdo.com/login');
    await page.getByRole('button', { name: 'Customize' }).click();
    await page.getByRole('checkbox', { name: 'Analytics Cookies Help us' }).check();
    await page.getByRole('checkbox', { name: 'Functional Cookies Remember' }).check();
    await page.getByRole('checkbox', { name: 'Marketing Cookies' }).check();
    await page.getByRole('button', { name: 'Save Preferences' }).click();

    await page.getByRole('button', { name: 'Sign Up' }).click();
    await page.locator('label').filter({ hasText: 'Teach (Tutor)' }).click();

    await page.getByRole('combobox').nth(0).selectOption('India').catch(() => {});
    await page.getByRole('combobox').nth(1).selectOption('Karnataka');
    await page.getByRole('textbox', { name: 'e.g.' }).fill(pincode);
    await page.getByPlaceholder('Enter your age').fill(age);
    await page.locator('label').filter({ hasText: 'I confirm that the' }).click();
    await page.getByRole('button', { name: 'Continue →' }).click();

    await page.getByRole('textbox', { name: 'you@example.com' }).fill(email);
    await page.getByRole('button', { name: 'Send Verification Code' }).click();
    await page.getByRole('textbox', { name: '000000' }).fill('123456');
    await page.getByRole('button', { name: 'Verify Code' }).click();

    await page.getByRole('textbox', { name: 'Jane' }).fill(firstName);
    await page.getByRole('textbox', { name: 'Doe' }).fill(lastName);
    await page.getByRole('textbox', { name: 'e.g. +' }).fill(phone);
    await page.getByRole('textbox', { name: '••••••••' }).first().fill(password);
    await page.getByRole('textbox', { name: '••••••••' }).nth(1).fill(password);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.getByRole('textbox', { name: 'Middle Name' }).fill(middleName);
    await page.locator('input[type="date"]').fill(dob);
    await page.getByRole('combobox').first().selectOption(gender);
    await page.getByRole('textbox', { name: 'Phone Number' }).fill(phone);
    await page.getByRole('textbox', { name: 'Main St, Apt 4B' }).fill(address);
    await page.locator('.react-select__input-container').click();
    await page.locator('#react-select-2-input').fill('mum');
    await page.getByRole('option', { name: 'Mumbai, Maharashtra' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.locator('select').selectOption('undergraduate');
    await page.getByRole('textbox', { name: 'e.g. B.Sc, B.Ed, M.Tech' }).fill('B.Ed');
    await page.locator('div').filter({ hasText: /^Search city\.\.\.$/ }).nth(4).click();
    await page.locator('#react-select-5-input').fill('mumbai');
    await page.getByRole('option', { name: 'Mumbai, Maharashtra' }).click();
    await page.locator('div').filter({ hasText: /^Search institute\.\.\.$/ }).nth(1).click();
    await page.locator('#react-select-8-input').fill('mumbai');
    await page.getByRole('option', { name: 'University of Mumbai (Mumbai)' }).click();
    await page.getByRole('button', { name: 'Yes, I am' }).click();

    await page.getByRole('textbox', { name: 'List other relevant' }).fill('Microsoft Verified Educator');
    await page.getByRole('button', { name: 'Add Experience' }).click();
    await page.getByRole('textbox', { name: 'e.g. DPS International or' }).fill("BYJU'S Tutor");
    await page.getByRole('spinbutton').fill('02');
    await page.getByRole('textbox', { name: 'Briefly describe your overall' }).fill('I started my career from undergraduate degree with a passion for teaching.');
    await page.locator('.css-18foq54-control > .css-hlgwow > .css-19bb58m').click();
    await page.locator('#react-select-4-input').fill('eng');
    await page.getByRole('option', { name: 'English' }).click();
    await page.getByRole('button', { name: 'Continue to Subjects →' }).click();

    await page.getByRole('combobox').filter({ hasText: 'Select Category' }).click();
    await page.getByRole('option', { name: 'Wellness & Counselling' }).click();
    
    const subjects = [
      { name: 'Pranic Healing',           level: 'Professional (3-5 years)', checkboxes: ['Beginner','All Levels'] },
      { name: 'Yoga Therapy',             level: 'Professional (3-5 years)', checkboxes: ['All Levels'] },
      { name: 'Life Coaching',            level: '',                          checkboxes: ['All Levels'] },
      { name: 'Career Counselling',       level: '',                          checkboxes: ['Intermediate'] },
      { name: 'Relationship Counselling', level: '',                          checkboxes: ['Advanced'] },
    ];
    
    for (const subj of subjects) {
      await page.getByRole('button', { name: subj.name }).click();
      if (subj.level) {
        await page.getByRole('combobox').click();
        await page.getByRole('option', { name: subj.level }).click();
      }
      for (const cb of subj.checkboxes) await page.getByRole('checkbox', { name: cb }).click();
      await page.getByRole('button', { name: 'Save Subject Setup' }).click();
    }
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByRole('button', { name: 'Middle School (6-8)' }).click();
    await page.getByRole('button', { name: 'Helping students succeed' }).click();
    await page.getByRole('button', { name: 'Seeing student progress' }).click();
    await page.getByRole('button', { name: 'Making a difference' }).click();

    // Start tracing the specific section
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    await page.getByRole('textbox', { name: 'e.g. Certified Math Tutor' }).click();
    await page.getByRole('textbox', { name: 'e.g. Certified Math Tutor' }).fill('Ready to Master Immunology? Learn Complex Science Made Simple with Priya');
    await page.getByRole('textbox', { name: 'Tell students about yourself' }).fill('Ready to Master Immunology? Learn Complex Science Made Simple with Priya ||| Welcome! I am Priya, and I am thrilled to help you navigate the fascinating world of immunology. Having recently completed my bachelor\'s degree, my knowledge of cellular defense, pathogens, and immune responses is fresh, current, and deeply detailed. While I am launching my formal tutoring career, my passion for education and science drives me to create an engaging, supportive learning environment for every student.My teaching style centers on breaking down complex biological systems into clear, relatable concepts. I believe science should be exciting, not overwhelming. Whether you are tackling antibody structures or preparing for exams, we will work at your pace to build your confidence and critical thinking skills. As a unique bonus, I also speak Avestan, reflecting my deep love for languages and cultural heritage. Let\'s work together to unlock your potential and make immunology your favorite subject!');

    await page.getByRole('button', { name: 'Continue to Persona' }).click();

    // Stop tracing and save it to a zip file
    await context.tracing.stop({ path: `trace-tutor-${tutorNumber}-w${workerIndex}.zip` });

    await page.getByRole('checkbox', { name: 'I have read and agree to the' }).click();
    await page.locator('.mt-0\\.5').first().click();
    for (const n of [3,4,5,6,7,8]) {
      await page.locator(`div:nth-child(${n}) > .px-5 > .mt-0\\.5`).click();
    }
    await page.getByRole('checkbox', { name: 'I would like to receive' }).click();
    await page.getByRole('checkbox', { name: 'I give permission to feature' }).click();
    await page.getByRole('button', { name: 'Sign & Complete Registration' }).click();
    await page.getByRole('button', { name: 'Start Subject Assessments' }).click();

    appendTutor({ type:'tutor', runId, timestamp: new Date().toISOString(), workerIndex, firstName, middleName, lastName, email, password, phone, dob, pincode, address });
    console.log(`[Worker ${workerIndex}] ✅ Tutor ${tutorNumber} saved: ${email}`);
  });
}