const opts = {
    method: 'GET',
    retry: 3,
    pause: 1000,
    callback: retry => { console.log(`Trying: ${retry}`) }
}

const bookDownload = async (url) => {
    console.log('Fetching book:', url, opts);

    const pageContents = await fetch(url);
    const parser = new DOMParser();
    const document = parser.parseFromString(pageContents, 'text/html');

    var bookName = document.querySelector('span.c-book-name').innerText.trim();
    var author = document.querySelector('span.faded').innerText.replace(/\r?\n/g, '').replace(/ +/g, ' ').replace('by ', '').trim();
    var fileName = `${bookName} by ${author}`.trim().replace(/ +/g, ' ').replace(/ /g, '-');

    var _bookId = FindTextBetween(pageContents, `var bookId = "`, `";`);
    var actualUrl = FindTextBetween(pageContents, "var actualUrl =", ";");
    var bookSlug = FindTextBetween(pageContents, "var bookslug ='", "';");

    var _pageCount = parseInt(FindTextBetween(pageContents, "var totalPageCount =", ";").trim());
    var pages = StringToStringArray(FindTextBetween(pageContents, "var pages = [", "];"));
    var pageIds = StringToStringArray(FindTextBetween(pageContents, "var pageIds = [", "];"));
    console.table({ bookName, author, fileName, bookSlug, _bookId, url });

    //Fetching parameters
    var scrambledImages = [];
    var keys = [];
    var scrambleMap = [];
    var pageImages = [];
    for (var i = 0; i < _pageCount; i++) {
        var imgUrl = `https://ebooksapi.rekhta.org/images/${_bookId}/${pages[i]}`;
        var key = `https://ebooksapi.rekhta.org/api_getebookpagebyid_websiteapp/?wref=from-site&&pgid=${pageIds[i]}`;
        scrambledImages.push(imgUrl);
        keys.push(key);
        scrambleMap.push({ imgUrl, key });
        pageImages.push(await dlImage(scrambleMap[i].key, scrambleMap[i].imgUrl, SUB_FOLDER, IMG_NAME));
    }
    var data = { bookName, author, _pageCount, _bookUrl, bookSlug, fileName, _bookId, actualUrl, pages, pageIds, scrambleMap };
    return data;
}

const unscrambleImage = async (key, input) => {
    try {
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
        const borderWidth = 16;
        const scaleFactor = 1; // Adjust if necessary

        // The logic for "tilesize * data.x, and y" for canvasWidth and height doesn't work, adds a whitish margin (used by rekhta idk why and how). So Just use original ones as per api key. 
        const canvasWidth = originalWidth;
        const canvasHeight = originalHeight;

        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const img = await loadImage(input); // Path to your original image
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

        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Error unscrambling image:', error);
    }
}

const dlImage = async (keyUrl, scrambledImageUrl) => {
    try {
        // Download the scrambled image
        const { data: scrambledImage } = await axios.get(scrambledImageUrl, {
            responseType: 'arraybuffer'
        });

        // Download the key JSON
        const { data: key } = await axios.get(keyUrl);

        // Unscramble and download the images
        unscrambleImage(key, scrambledImage);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

const downloadBook = async (url) => {
    return await bookDownload(url);
}

export default downloadBook;