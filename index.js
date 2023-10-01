const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const sentiment = require('sentiment');
const cors = require("cors");

const corsOptions = {
    origin: '*',
    credentials: true,            //access-control-allow-credentials:true
    optionSuccessStatus: 200,
}
const app = express();
app.use(express.json());
app.use(bodyParser.json());

app.use(cors(corsOptions))

app.post('/scrape', async (req, res) => {
    const { url, elements } = req.body;
    let sentimentResult = "null";
    let wordCount = 0;

    try {
        // Launch the browser and open a new blank page
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        // Navigate the page to a URL
        await page.goto(url, { waitUntil: 'networkidle2' });

        const scrapedData = {};

        console.log(elements);

        // parse the given html tags
        for (const element of elements) {
            let key = element;
            let tag = element;
            element = element.toLowerCase();

            let linksKey = ["a", "link", "links"]
            let imagesKey = ["img", "image", "images", "thumbnail", "thumbnails"];
            let paragraphsKey = ["p", "paragraph", "paragraphs", "description"];
            let headersKey = ["h3", "header", "headers", "titles", "title"];

            if (linksKey.includes(element)) {
                key = "links"
                tag = "a";
            } else if (imagesKey.includes(element)) {
                key = "images"
                tag = "img";
            } else if (paragraphsKey.includes(element)) {
                key = "paragraphs"
                tag = "p";
            } else if (headersKey.includes(element)) {
                key = "headers"
                tag = "h3";
            }

            scrapedData[key] = await page.evaluate((tag) => {
                const newElements = Array.from(document.querySelectorAll(tag));

                return newElements.map((el) => {
                    console.log(el);
                    if (tag == "img") {
                        return 'https://wsa-test.vercel.app' + el.getAttribute('src')
                    } else if (tag == 'a') {
                        let linkData = {
                            linkText: el.textContent ?? 'Link',
                            href: 'https://wsa-test.vercel.app' + el.getAttribute('href')
                        }
                        return linkData
                    } else {
                        return el.textContent
                    }
                });
            }, tag);
        }

        // Close the browser
        await browser.close();

        if (scrapedData['paragraphs']) {
            const text = scrapedData['paragraphs'].join(' ');
            sentimentResult = sentiment(text);

            // Word count
            wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        }


        res.json({
            data: scrapedData,
            sentiment: sentimentResult,
            wordCount: wordCount,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error scraping the website.' });
    }
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});