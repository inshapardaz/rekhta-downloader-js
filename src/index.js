import axios from "axios";

const bookDownload = async (url) => {
    console.log('Fetching book:', url);

    const { data: pageContents } = await axios.get(url);
    const parser = new DOMParser();
    const document = parser.parseFromString(pageContents, 'text/html');
    var bookName = document.querySelector('span.c-book-name')?.innerText?.trim();
    var author = document.querySelector('span.faded').innerText.replace(/\r?\n/g, '').replace(/ +/g, ' ').replace('by ', '').trim();
    var fileName = `${bookName} by ${author}`.trim().replace(/ +/g, ' ').replace(/ /g, '-');

    var bookId = findTextBetween(pageContents, `var bookId = "`, `";`);
    var actualUrl = findTextBetween(pageContents, "var actualUrl =", ";");
    var bookSlug = findTextBetween(pageContents, "var bookslug ='", "';");

    var _pageCount = parseInt(findTextBetween(pageContents, "var totalPageCount =", ";").trim());
    var pages = stringToStringArray(findTextBetween(pageContents, "var pages = [", "];"));
    var pageIds = stringToStringArray(findTextBetween(pageContents, "var pageIds = [", "];"));
    console.table({ bookName, author, fileName, bookSlug, bookId, url });

    //Fetching parameters
    var scrambledImages = [];
    var keys = [];
    var scrambleMap = [];
    var pageImages = [];
    for (var i = 0; i < _pageCount; i++) {
        var imgUrl = `https://ebooksapi.rekhta.org/images/${bookId}/${pages[i]}`;
        var key = `https://ebooksapi.rekhta.org/api_getebookpagebyid_websiteapp/?wref=from-site&&pgid=${pageIds[i]}`;
        scrambledImages.push(imgUrl);
        keys.push(key);
        scrambleMap.push({ imgUrl, key });
        var img = await downloadImage(scrambleMap[i].key, scrambleMap[i].imgUrl)
        pageImages.push(img);
    }
    var data = { bookName, author, _pageCount, url, bookSlug, fileName, bookId, actualUrl, pages, pageIds, scrambleMap };
    return data;
}

const findTextBetween = (source, start, end) => {
    return source.split(start)[1].split(end)[0].trim();
}

const stringToStringArray = (input) => {
    return input.split(",").map(item => item.replace(/"/g, "").trim());
}

const unscrambleImage = async (key, scrambledImageUrl) => {
    return new Promise((resolve, reject) => {
        console.log(key)
        const pageId = key.PageId;
        let originalHeight = key.PageHeight;
        let originalWidth = key.PageWidth;

        // Default values if original height/width are not provided
        if (originalHeight <= 0) {
            originalHeight = 1100;
        }
        if (originalWidth <= 0) {
            originalWidth = 1000;
        }

        const tileSize = 50;

        // The logic for "tilesize * data.x, and y" for canvasWidth and height doesn't work, adds a whitish margin (used by rekhta idk why and how). So Just use original ones as per api key. 
        const canvasWidth = originalWidth;
        const canvasHeight = originalHeight;

        var canvas = document.createElement('canvas');

        canvas.id = `canvas-${pageId}`;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.zIndex = 8;
        canvas.style.position = "absolute";
        var body = document.getElementsByTagName("body")[0];
        body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
            var img = new Image;
            img.crossOrigin = "";
            img.onload = function () {
                for (const sub of key.Sub) {
                    ctx.drawImage(
                        img,
                        sub.X1 * (tileSize + 16),
                        sub.Y1 * (tileSize + 16),
                        tileSize,
                        tileSize,
                        (sub.X2 * tileSize),
                        (sub.Y2 * tileSize),
                        tileSize,
                        tileSize
                    );
                }
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = scrambledImageUrl;
        } catch (error) {
            console.error('Error unscrambling image:', error);
            reject(error);
        }
        finally {
            body.removeChild(canvas);
        }
    });
}

const downloadImage = async (keyUrl, scrambledImageUrl) => {
    try {
        console.log('getting keyUrl :>> ', keyUrl);
        const { data: key } = await axios.get(keyUrl, {
            headers: { 'Accept': 'application/json' }
        });

        unscrambleImage(key, scrambledImageUrl);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

const downloadBook = async (url) => {
    return await bookDownload(url);
}

export default downloadBook;