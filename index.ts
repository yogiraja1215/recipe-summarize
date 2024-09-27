import 'dotenv/config';
import puppeteer, { Browser, Page } from 'puppeteer';
import { AirtopClient, AirtopError } from '@airtop/sdk';
import chalk from 'chalk';

const AIRTOP_API_KEY = process.env.AIRTOP_API_KEY;
const TARGET_URL = 'https://en.wikipedia.org/wiki/A.I._Artificial_Intelligence'; // URL to scrape or summarize

async function run() {
  try {
    const client = new AirtopClient({
      apiKey: AIRTOP_API_KEY,
    });
    const createSessionResponse = await client.sessions.create({
      configuration: {
        timeoutMinutes: 5,
      },
    });

    const sessionId = createSessionResponse.data.id;
    console.log('Created airtop session', sessionId);

    if (!createSessionResponse.data.cdpWsUrl) {
      throw new Error('Unable to get cdp url');
    }

    // Connect to the browser
    const cdpUrl = createSessionResponse.data.cdpWsUrl;
    const browser: Browser = await puppeteer.connect({
      browserWSEndpoint: cdpUrl,
      headers: {
        Authorization: `Bearer ${AIRTOP_API_KEY}` || '',
      },
    });
    console.log('Connected to browser');

    // Open a new page
    const page: Page = await browser.newPage();
    
    // Navigate to the URL
    console.log('Navigating to URL', TARGET_URL);
    await page.goto(TARGET_URL);
    const windowInfo = await client.windows.getWindowInfoForPuppeteerPage(sessionId, page, {
      disableResize: true, // Prevents the browser window from being resized when loading a live view, which might impact the agent's ability to scrape or summarize content
    }); 
    
    console.log('See a live view of the browser window at', chalk.blueBright(windowInfo.data.liveViewUrl));
    const windowId = windowInfo.data.windowId;

    console.log('Summarizing content...');
    const contentSummary = await client.windows.summarizeContent(sessionId, windowId, { prompt: 'Summarize the content of the page in 1 paragraph' }); // Note that scrapeContent is also available to do a clean scrape of the page content
    console.log('Content summary:\n\n', chalk.green(contentSummary.data.modelResponse));

    // Clean up
    await browser.close();
    await client.sessions.terminate(sessionId);
    console.log(chalk.red('\nSession terminated'));
    process.exit(0);
  } catch (err) {
    if (err instanceof AirtopError) {
      console.log(err.statusCode);
      console.log(err.message);
      console.log(err.body);
    } else {
      console.log(err);
    }
    throw err;
  }
}

run().catch((err) => {
  process.exit(1);
});