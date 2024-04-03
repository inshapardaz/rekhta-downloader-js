import downloadBook from "../src";

const form = document.getElementById("download-form");
form.addEventListener("submit", onFormSubmit);

function onFormSubmit(e) {
    e.preventDefault();
    const url = document.getElementsByName('url')[0].value;
    downloadBook(url)
}