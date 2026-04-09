const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Login if necessary or bypass... wait, we need to login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="text"]', 'pedro');
  await page.fill('input[type="password"]', 'senha123'); // Assume this is a local dev password
  await page.click('button[type="submit"]');
  
  // Wait for login redirection
  await page.waitForTimeout(2000);
  
  // Go to compras
  await page.goto('http://localhost:3000/compras');
  await page.waitForTimeout(2000);
  
  // Find first taxPercent input
  const inputs = await page.$$('text="Imposto (%)" >> xpath=..//input');
  if (inputs.length > 0) {
      const input = inputs[0];
      await input.fill('15,5');
      await input.blur(); // Triggers auto-save!
      console.log("Filled taxPercent and blurred.");
      
      // Wait for fetch to complete
      await page.waitForTimeout(1000);
      
      // Reload page to test loadDashboard / DB persistence
      await page.reload();
      await page.waitForTimeout(2000);
      
      const newInputs = await page.$$('text="Imposto (%)" >> xpath=..//input');
      const val = await newInputs[0].inputValue();
      console.log("Value after reload: ", val);
  } else {
      console.log("No Imposto inputs found.");
  }
  
  await browser.close();
})();
