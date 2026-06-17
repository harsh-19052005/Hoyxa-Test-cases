import { test } from '@playwright/test';

const users = [
  {
    email: 'parent01@gmail.com',
    parentFirstName: 'Yash',
    parentLastName: 'Shinde',
    password: 'Harsh@11066',
    childFirstName: 'Rahul',
    childLastName: 'Shinde',
    childAge: '15'
  },
  {
    email: 'parent02@gmail.com',
    parentFirstName: 'Amit',
    parentLastName: 'Patil',
    password: 'Harsh@11066',
    childFirstName: 'Rohan',
    childLastName: 'Patil',
    childAge: '14'
  },
  {
    email: 'parent03@gmail.com',
    parentFirstName: 'Sneha',
    parentLastName: 'Joshi',
    password: 'Harsh@11066',
    childFirstName: 'Anaya',
    childLastName: 'Joshi',
    childAge: '13'
  },
  {
    email: 'parent04@gmail.com',
    parentFirstName: 'Pooja',
    parentLastName: 'Kulkarni',
    password: 'Harsh@11066',
    childFirstName: 'Aryan',
    childLastName: 'Kulkarni',
    childAge: '16'
  },
  {
    email: 'parent05@gmail.com',
    parentFirstName: 'Vikas',
    parentLastName: 'More',
    password: 'Harsh@11066',
    childFirstName: 'Neha',
    childLastName: 'More',
    childAge: '12'
  }
];

for (const user of users) {
  test(`Parent Registration - ${user.email}`, async ({ page }) => {

    await page.goto('https://pl.meghdo.com/login');

    const acceptBtn = page.getByRole('button', { name: /Accept All/i });
    if (await acceptBtn.isVisible().catch(() => false)) {
      await acceptBtn.click();
    }

    await page.getByRole('button', { name: 'Sign Up' }).click();
    await page.getByText("Manage a child's learning").click();

    await page.getByRole('combobox').nth(1).selectOption('Odisha');
    await page.getByRole('textbox', { name: /e\.g\./i }).fill('450084');
    await page.getByPlaceholder('Enter your age').fill('31');

    await page.getByRole('checkbox', {
      name: /I confirm that/i
    }).check();

    await page.getByRole('button', { name: /Continue/i }).click();

    await page.getByRole('textbox', {
      name: /you@example\.com/i
    }).fill(user.email);

    await page.getByRole('button', {
      name: /Send Verification Code/i
    }).click();

    await page.getByRole('textbox', { name: /000000/i })
      .fill(process.env.OTP || '123456');

    await page.getByRole('button', {
      name: /Verify Code/i
    }).click();

    await page.getByRole('textbox', { name: 'Jane' })
      .fill(user.parentFirstName);

    await page.getByRole('textbox', { name: 'Doe' })
      .fill(user.parentLastName);

    await page.getByRole('textbox', { name: '••••••••' })
      .first()
      .fill(user.password);

    await page.getByRole('textbox', { name: '••••••••' })
      .nth(1)
      .fill(user.password);

    await page.getByRole('button', {
      name: /Create Account/i
    }).click();

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check().catch(() => {});
    }

    await page.getByRole('button', {
      name: /Continue & Create Account/i
    }).click();

    await page.getByRole('textbox', { name: /First name/i })
      .fill(user.childFirstName);

    await page.getByRole('textbox', { name: /Last name/i })
      .fill(user.childLastName);

    await page.getByPlaceholder('e.g. 10')
      .fill(user.childAge);

    await page.getByRole('button', { name: '+ English' }).click();
    await page.getByRole('button', { name: '+ Music' }).click();

    await page.getByRole('button', {
      name: /Save & Continue/i
    }).click();

    console.log(`Completed: ${user.email}`);
  });
}
