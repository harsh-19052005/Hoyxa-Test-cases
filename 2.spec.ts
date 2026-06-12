import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const DATA_FILE = path.resolve(__dirname, 'test-data.json');

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

function loadLatestTutors(): TutorCredential[] {
  if (!fs.existsSync(DATA_FILE)) throw new Error('❌ test-data.json not found. Run tutor-signup.spec.ts first.');
  const store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as DataStore;
  if (!store.tutors?.length)
    throw new Error('❌ No tutor credentials found. Run tutor-signup.spec.ts first.');
  const timestamps = store.tutors.map(c => new Date(c.timestamp).getTime());
  const maxTs      = Math.max(...timestamps);
  const batch      = store.tutors.filter(c => maxTs - new Date(c.timestamp).getTime() <= 5 * 60 * 1000);
  console.log(`\n📂 Loaded ${batch.length} tutors from latest batch`);
  batch.forEach((c, i) => console.log(`   [${i+1}] ${c.email}`));
  return batch;
}

const ri = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const rc = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const BUILDINGS = ['Sanjana Heights','Lotus Apartments','Shree Ganesh Complex','Tulsi Tower','Krishna Niwas','Saraswati Heights'];
const BANKS     = ['State Bank of India','HDFC Bank','ICICI Bank','Axis Bank','Punjab National Bank','Canara Bank','Union Bank of India','Bank of India'];
const BANK_CODES= ['SBIN','HDFC','ICIC','AXIS','PUNB','CNRB','UBIN','BKID'];

function randomMailingAddress(): string {
  return `Flat ${ri(1,20)}, ${rc(BUILDINGS)}`;
}

function randomBankName():    string { return rc(BANKS); }
function randomBankAccount(): string { return Array.from({length: ri(10,16)}, () => ri(0,9)).join(''); }
function randomIFSC():        string { return `${rc(BANK_CODES)}0${String(ri(1000,99999)).padStart(6,'0')}`; }

function futureDateStr(n: number): string {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

const allTutors = loadLatestTutors();
for (let idx = 0; idx < allTutors.length; idx++) {
  const cred = allTutors[idx];
  test(`Profile setup – tutor ${idx + 1}: ${cred.email}`, async ({ page }) => {
    test.setTimeout(240000);
    const fullName       = `${cred.firstName} ${cred.middleName} ${cred.lastName}`;
    const mailingAddress = randomMailingAddress();
    const bankName       = randomBankName();
    const bankAccount    = randomBankAccount();
    const ifscCode       = randomIFSC();
    const batchStartDate = futureDateStr(ri(1, 7));

    console.log(`\n[Tutor ${idx+1}] 🔑 Logging in: ${cred.email}`);

    await page.goto('https://pl.meghdo.com/login');
    await page.getByRole('button', { name: 'Customize' }).click();
    await page.locator('label').filter({ hasText: 'Analytics CookiesHelp us' }).click();
    await page.getByRole('checkbox', { name: 'Functional Cookies Remember' }).check();
    await page.getByRole('checkbox', { name: 'Marketing Cookies' }).check();
    await page.getByRole('button', { name: 'Save Preferences' }).click();

    await page.getByRole('textbox', { name: 'Email' }).fill(cred.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(cred.password);
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill(cred.email);
    await page.getByRole('button', { name: 'Send OTP' }).click();
    await page.getByRole('textbox', { name: 'OTP Code' }).fill('123456');
    await page.getByRole('button', { name: 'Verify OTP' }).click();
    await page.waitForURL('**/dashboard', { timeout: 120000 });
    await page.getByRole('button', { name: `Profile menu for ${cred.firstName}` }).click();
    await page.getByRole('menuitem', { name: 'Profile' }).click();
    await page.getByRole('button', { name: 'Manage Subjects' }).click();
    await page.getByRole('button', { name: 'Go to Dashboard' }).click();
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    await page.getByRole('button', { name: /^(Add Bank Details|View Settings)$/ }).click();    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Female' }).click();
    await page.getByRole('textbox', { name: 'Mailing Address (if different)' }).fill(mailingAddress);
    await page.getByText('French').click();
    await page.getByText('German').click();
    await page.getByRole('button', { name: 'Save Profile Changes' }).click();

    await page.getByRole('tab', { name: 'Professional' }).click();
    await page.getByRole('spinbutton', { name: 'Advance Booking Window (hours)' }).fill('');
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Asia/Kolkata (IST)' }).click();
    await page.getByRole('switch', { name: 'Teacher Certified' }).click();
    await page.getByRole('switch', { name: 'Offer Free Trial Session' }).click();
    await page.getByRole('switch', { name: 'Allow Group Tuition' }).click();
    await page.getByRole('switch', { name: 'Enable Instant Booking' }).click();
    await page.getByRole('switch', { name: 'Ready to Teach Online' }).click();
    await page.getByRole('button', { name: 'Save Profile Changes' }).click();

    await page.getByRole('tab', { name: 'Education' }).click();
    await page.getByRole('button', { name: 'Save Profile Changes' }).click();

    await page.getByRole('tab', { name: 'Billing' }).click();
    await page.getByRole('combobox', { name: 'Country *' }).click();
    await page.getByRole('option', { name: '🇮🇳 India' }).click();
    await page.getByRole('textbox', { name: 'Account Holder Name *' }).fill(fullName);
    await page.getByRole('textbox', { name: 'Account Number *' }).fill(bankAccount);
    await page.getByRole('textbox', { name: 'Bank Name *' }).fill(bankName);
    await page.getByRole('textbox', { name: 'IFSC Code *' }).fill(ifscCode);
    await page.getByRole('combobox', { name: 'Account Type' }).click();
    await page.getByText('Current').click();
    await page.getByRole('button', { name: 'Save Bank Account' }).click();
    await page.getByRole('button', { name: 'Save Profile Changes' }).click();

    await page.getByRole('tab', { name: 'Security' }).click();

    await page.getByRole('button', { name: `Profile menu for ${cred.firstName}` }).click();
    await page.getByRole('menuitem', { name: 'Profile' }).click();
    await page.getByRole('button', { name: 'Set Up Now' }).click();
    await page.getByRole('button', { name: 'Add Date' }).click();
    await page.getByRole('button', { name: 'Save One-time Availability' }).click();
    await page.getByRole('button', { name: 'Tue' }).click();
    await page.getByText('MonTueWedThuFriSatSun').first().click(); 
    await page.getByRole('button', { name: 'Add Time Slot' }).click();
    await page.locator('label').filter({ hasText: 'Sat' }).click();
    await page.locator('label').filter({ hasText: 'Fri' }).click();
    await page.getByRole('button', { name: 'Save & Publish Availability' }).click();
    const firstDateToBlock = page.getByRole('button', { name: '11' }).nth(2);
    await firstDateToBlock.waitFor({ state: 'visible', timeout: 30000 });
    const isAlreadyBlocked = await firstDateToBlock.isDisabled();
    if (isAlreadyBlocked) {
      console.log(`[Tutor ${idx+1}] Days already blocked, moving to Services...`);
    } else {
      await firstDateToBlock.click();
      await page.getByRole('button', { name: '18', description: 'Toggle leave', exact: true }).click();
      await page.getByRole('button', { name: '20', description: 'Toggle leave', exact: true }).click();
      await page.getByRole('textbox', { name: 'e.g. Vacation, Medical,' }).fill('FEVER');
      const blockBtn = page.getByRole('button', { name: 'Block 3 Days' });
      await blockBtn.click();
      await blockBtn.waitFor({ state: 'hidden', timeout: 10000 });
    }
    await page.getByRole('button', { name: 'Services' }).click();
    await page.getByRole('button', { name: 'New Batch' }).click();
    await page.getByRole('combobox').first().selectOption('Wellness & Counselling');
    await page.getByRole('combobox').nth(1).selectOption('Intermediate');
    await page.getByRole('combobox').nth(2).selectOption('Career Counselling');
    await page.getByRole('button', { name: 'Full syllabus learning' }).click();
    await page.locator('label').filter({ hasText: 'Small Group Live (2–5)' }).click();
    await page.getByRole('textbox').fill(batchStartDate);
    await page.getByPlaceholder('e.g. 10').fill('14');
    await page.getByPlaceholder('e.g. 5').fill('5');
    await page.getByRole('button', { name: 'Fri' }).click();
    await page.getByRole('button', { name: 'Fri' }).click();
    await page.getByRole('button', { name: 'Sun' }).click();
    await page.getByRole('combobox').nth(4).selectOption('09:00-10:00');
    await page.getByRole('button', { name: 'Save as Draft & Next →' }).click();

    await page.getByRole('button', { name: 'New Service' }).click();
    await page.getByRole('combobox').selectOption('Pranic Healing');
    await page.getByRole('button', { name: 'Exam preparation' }).click();
    await page.getByRole('button', { name: 'Create Service' }).click();

    const topics = ['TOPIC SELECTION','TOPIC SELECTION','REVIEW','REVIEW 2','EXAM','RESULTS','SMALL PRE TESTS','PREPARATIONS AGAIN','EVALUATION','FUNCTIONALITY','END','END CREDITS','RESPONSE','THANKS'];

    await page.getByRole('button', { name: 'Syllabus', exact: true }).first().click();
    await page.waitForTimeout(500); // Let the panel slide out
    
    for (let i = 1; i <= topics.length; i++) {
      // The panel is at the bottom of the DOM, so we use .last()
      const sessionHeader = page.locator('div').filter({ hasText: new RegExp(`^${i}$`) }).last();
      await sessionHeader.scrollIntoViewIfNeeded();
      await sessionHeader.click({ force: true }); 
      await page.waitForTimeout(300); // Wait for accordion animation
      await page.getByRole('textbox', { name: `Session ${i} topic…` }).last().fill(topics[i - 1]);
    }
    const tealBtns = page.locator('.text-teal-500:visible');
    const tealCount = await tealBtns.count();
    for (let i = 0; i < tealCount; i++) {
      await tealBtns.last().click({ force: true }); 
    }
    await page.getByRole('button', { name: 'Save Syllabus' }).last().click();
    await page.getByRole('button', { name: 'Pricing', exact: true }).last().click();
    await page.waitForTimeout(500); // Brief wait for the tab to switch
    
    await page.getByPlaceholder('500').last().fill('500');
    await page.getByPlaceholder('30').last().fill('30');
    await page.getByPlaceholder('25').last().fill('25');
    await page.getByPlaceholder('28').last().fill('28');
    await page.getByPlaceholder('35').last().fill('35');
    await page.getByPlaceholder('32').last().fill('32');
    
    await page.getByRole('button', { name: 'Save Pricing' }).last().click();
    await page.waitForTimeout(2000); 
    
    await page.getByRole('button', { name: 'Close panel' }).last().click();
    await page.waitForTimeout(500);
    
    await page.getByRole('button', { name: 'Publish', exact: true }).first().click();
    await page.getByRole('button', { name: 'Yes, Publish' }).last().click();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: 'Syllabus', exact: true }).nth(1).click();
    await page.waitForTimeout(500);
    
    await page.locator('.flex.flex-wrap:visible').first().click({ force: true });
    await page.getByRole('textbox', { name: 'Session 1 topic…' }).last().fill('TEACHING');
    
    await page.getByRole('button', { name: 'Save Syllabus' }).last().click();
    await page.getByRole('button', { name: 'Pricing', exact: true }).last().click();
    await page.waitForTimeout(500); // Brief wait for the tab to switch
    
    for (const [ph, val] of [['500','200'],['30','15'],['25','15'],['28','15'],['35','15'],['32','15']]) {
      await page.getByPlaceholder(ph).last().fill(val);
      await page.getByPlaceholder(ph).last().press('Tab');
    }
    
    await page.getByRole('button', { name: 'Save Pricing' }).last().click();
    await page.waitForTimeout(2000);
    
    await page.getByRole('button', { name: 'Close panel' }).last().click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Availability', exact: true }).first().click();
    await page.waitForTimeout(500);
    
    await page.getByRole('button', { name: 'Map', description: 'Map to this service', exact: true }).last().click();
    await page.getByRole('button', { name: 'Close panel' }).last().click();
    await page.waitForTimeout(500);
    
    await page.getByRole('button', { name: 'Publish', exact: true }).nth(1).click();
    await page.getByRole('button', { name: 'Yes, Publish' }).last().click();
    await page.waitForTimeout(2000);
    
    await page.getByRole('button', { name: 'Dashboard' }).click();
    console.log(`[Tutor ${idx+1}] ✅ Profile setup complete: ${cred.email}`);
  });
}